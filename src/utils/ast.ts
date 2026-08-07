import type * as ESTree from "estree";

/**
 * Structural view of a node produced by any ESTree-compatible parser.
 *
 * The rules in this plugin are deliberately parser-neutral: they read Espree,
 * `@typescript-eslint/parser`, and Babel trees through this interface instead of
 * depending on a parser package. Every field beyond `type` is read through
 * {@link nodeField} so parser-specific node shapes never break resolution.
 */
export interface AstNode {
  readonly type: string;
}

/** Node types that open a new function scope. */
const FUNCTION_TYPES: Record<string, true> = {
  FunctionDeclaration: true,
  FunctionExpression: true,
  ArrowFunctionExpression: true,
};

/**
 * Wrapper node types that are transparent for value identity, mapped to the key
 * holding the wrapped expression.
 *
 * These are feature-detected by node `type` rather than by parser, so a tree
 * that never produces them simply never matches.
 */
const TRANSPARENT_WRAPPERS: Record<string, string> = {
  // ESTree
  ChainExpression: "expression",
  ParenthesizedExpression: "expression",
  // typescript-eslint
  TSAsExpression: "expression",
  TSSatisfiesExpression: "expression",
  TSNonNullExpression: "expression",
  TSTypeAssertion: "expression",
  TSInstantiationExpression: "expression",
  // Babel
  TypeCastExpression: "expression",
};

/** Object keys that must never be traversed: they cycle or hold non-AST data. */
const NON_TRAVERSABLE_KEYS: Record<string, true> = {
  parent: true,
  loc: true,
  range: true,
  start: true,
  end: true,
  tokens: true,
  comments: true,
  leadingComments: true,
  trailingComments: true,
  innerComments: true,
};

/** Guards an unknown value as a structural AST node. */
export function isAstNode(value: unknown): value is AstNode {
  return (
    typeof value === "object" && value !== null && "type" in value && typeof value.type === "string"
  );
}

/**
 * Reads an arbitrary field from a node without assuming a parser-specific shape.
 *
 * Callers narrow the result themselves; this is the single place the plugin
 * views an AST node as a bag of keys.
 */
export function nodeField(node: AstNode, key: string): unknown {
  // AST nodes are plain in-process objects. A record view is the only way to
  // read parser-specific keys without depending on a parser's type package.
  const fields = node as unknown as Record<string, unknown>;
  return fields[key];
}

/** Reads a field expected to hold a single child node. */
export function childNode(node: AstNode, key: string): AstNode | null {
  const value = nodeField(node, key);
  return isAstNode(value) ? value : null;
}

/** Reads a field expected to hold a list of child nodes, skipping array holes. */
export function childNodes(node: AstNode, key: string): readonly AstNode[] {
  const value = nodeField(node, key);
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry: unknown): entry is AstNode => isAstNode(entry));
}

/** Reads the `parent` link ESLint assigns while traversing. */
export function parentOf(node: AstNode): AstNode | null {
  const value = nodeField(node, "parent");
  return isAstNode(value) ? value : null;
}

/** Reads the name of an `Identifier` node, or `null` for any other node. */
export function getIdentifierName(node: AstNode | null): string | null {
  if (node === null || node.type !== "Identifier") {
    return null;
  }
  const name = nodeField(node, "name");
  return typeof name === "string" ? name : null;
}

/** True when the node opens a function scope. */
export function isFunctionNode(node: AstNode): boolean {
  return FUNCTION_TYPES[node.type] === true;
}

/**
 * Strips wrapper nodes that do not change the value an expression denotes.
 *
 * Returns `null` when a wrapper is present but its inner expression is missing,
 * which callers treat as unresolved rather than as a match.
 */
export function unwrapExpression(node: unknown): AstNode | null {
  let current = isAstNode(node) ? node : null;

  // Bounded so a malformed self-referential tree cannot spin.
  for (let depth = 0; current !== null && depth < 32; depth += 1) {
    const key = TRANSPARENT_WRAPPERS[current.type];
    if (key === undefined) {
      return current;
    }
    current = childNode(current, key);
  }

  return current;
}

/**
 * Resolves the static string a node evaluates to, or `null` when unresolved.
 *
 * Only literals and substitution-free template literals resolve; concatenation,
 * identifiers, and calls are intentionally unresolved.
 */
export function getStaticStringValue(node: AstNode | null): string | null {
  if (node?.type === "Literal") {
    const value = nodeField(node, "value");
    if (typeof value === "string") {
      return value;
    }
    return typeof value === "number" ? String(value) : null;
  }

  if (node?.type !== "TemplateLiteral") {
    return null;
  }

  // A template with substitutions has no single static value, and a
  // substitution-free template always has exactly one quasi.
  const quasis = childNodes(node, "quasis");
  const only =
    childNodes(node, "expressions").length === 0 && quasis.length === 1 ? quasis[0] : undefined;
  if (only === undefined) {
    return null;
  }
  const value = nodeField(only, "value");
  const cooked =
    typeof value === "object" && value !== null && "cooked" in value ? value.cooked : null;
  return typeof cooked === "string" ? cooked : null;
}

/**
 * Resolves the static name a member expression or object property addresses.
 *
 * Computed access resolves only for string/number literals and for template
 * literals with no substitutions. Anything dynamic, and any private name,
 * returns `null` (unresolved).
 */
export function getStaticPropertyName(node: AstNode): string | null {
  const key = childNode(node, "property") ?? childNode(node, "key");
  if (key === null || key.type === "PrivateIdentifier") {
    return null;
  }
  if (nodeField(node, "computed") !== true && key.type === "Identifier") {
    return getIdentifierName(key);
  }
  return getStaticStringValue(key);
}

/** Resolves a numeric literal value, seeing through a single unary `-`/`+`. */
export function getStaticNumberValue(node: AstNode | null): number | null {
  const target = unwrapExpression(node);

  if (target?.type === "Literal") {
    const value = nodeField(target, "value");
    return typeof value === "number" ? value : null;
  }
  if (target?.type !== "UnaryExpression") {
    return null;
  }

  const operator = nodeField(target, "operator");
  if (operator !== "-" && operator !== "+") {
    return null;
  }
  const inner = getStaticNumberValue(childNode(target, "argument"));
  if (inner === null) {
    return null;
  }
  return operator === "-" ? -inner : inner;
}

/** Collects every direct child node of `node`, in declaration order per key. */
function directChildren(node: AstNode): AstNode[] {
  // Same record view as `nodeField`: enumerate keys to stay parser-neutral.
  const fields = node as unknown as Record<string, unknown>;
  const children: AstNode[] = [];

  for (const [key, value] of Object.entries(fields)) {
    if (NON_TRAVERSABLE_KEYS[key] === true) {
      continue;
    }
    if (isAstNode(value)) {
      children.push(value);
      continue;
    }
    if (!Array.isArray(value)) {
      continue;
    }
    for (const entry of value) {
      if (isAstNode(entry)) {
        children.push(entry);
      }
    }
  }

  return children;
}

/** Visits `root` and every descendant, in an unspecified order. */
export function walkAll(root: AstNode, visit: (node: AstNode) => void): void {
  const stack: AstNode[] = [root];

  for (let node = stack.pop(); node !== undefined; node = stack.pop()) {
    visit(node);
    stack.push(...directChildren(node));
  }
}

/**
 * Returns the nearest enclosing function of `node`, or `null` at module level.
 *
 * Relies on the `parent` links ESLint assigns before invoking a rule visitor,
 * so it is only valid for the node currently being visited and its ancestors.
 */
export function getEnclosingFunction(node: AstNode): AstNode | null {
  for (let current = parentOf(node); current !== null; current = parentOf(current)) {
    if (FUNCTION_TYPES[current.type] === true) {
      return current;
    }
  }
  return null;
}

/** True when `node` is `ancestor` or one of its descendants. */
export function isWithin(node: AstNode, ancestor: AstNode): boolean {
  for (let current: AstNode | null = node; current !== null; current = parentOf(current)) {
    if (current === ancestor) {
      return true;
    }
  }
  return false;
}

/**
 * Narrows a structural node back to the ESTree node type ESLint reporting expects.
 *
 * This is the plugin's single unchecked cast: ESLint hands rules real ESTree
 * nodes, and {@link AstNode} is a strictly narrower structural view of the same
 * objects, so widening back is sound but not expressible to the compiler.
 */
export function toReportNode(node: AstNode): ESTree.Node {
  return node as unknown as ESTree.Node;
}
