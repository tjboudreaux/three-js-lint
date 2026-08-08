import type { Scope, SourceCode } from "eslint";

import {
  childNode,
  childNodes,
  getIdentifierName,
  isAstNode,
  getStaticPropertyName,
  getStaticStringValue,
  isFunctionNode,
  nodeField,
  parentOf,
  toReportNode,
  unwrapExpression,
  type AstNode,
} from "./ast.js";

/**
 * Module specifiers this plugin recognizes.
 *
 * Recognition is exact-string only. Deep paths such as `three/src/math/Vector3`
 * and re-export barrels are intentionally unrecognized, because their export
 * identity cannot be proven from syntax.
 */
export type KnownSource =
  | "three"
  | "three/webgpu"
  | "react"
  | "vue"
  | "@react-three/fiber"
  | "@tresjs/core"
  | "three-mesh-bvh"
  | "aframe";

const KNOWN_SOURCES: Record<string, true> = {
  three: true,
  "three/webgpu": true,
  react: true,
  vue: true,
  "@react-three/fiber": true,
  "@tresjs/core": true,
  "three-mesh-bvh": true,
  aframe: true,
};

/** Global object names through which a global value may be addressed. */
const GLOBAL_OBJECT_NAMES: Record<string, true> = {
  window: true,
  globalThis: true,
};

/** A value proven to be a named export of a recognized module. */
export interface ImportedValue {
  /** Exact module specifier the value came from. */
  readonly source: KnownSource;
  /** Export name as declared by the module, not the local alias. */
  readonly name: string;
}

/**
 * A value proven to be a named export of some module, without any judgement
 * about whether this plugin recognizes that module.
 *
 * Used by the one rule that must accept a finite set of source-coupled official
 * loader modules. {@link KnownSource} deliberately stays closed, so the caller
 * supplies the exact source/name policy instead of widening it.
 */
export interface ScopedImportedValue {
  /** Exact module specifier the value came from, verbatim. */
  readonly source: string;
  /** Export name as declared by the module, not the local alias. */
  readonly name: string;
}

/**
 * Decides whether an exact module specifier and exported name pair is accepted.
 *
 * Both arguments are exact strings: no prefix, suffix, or pattern matching is
 * performed on the caller's behalf.
 */
export type ImportPredicate = (source: string, importedName: string) => boolean;

/** A reference to a global value, together with how it was addressed. */
export interface GlobalReference {
  /** Global property name, e.g. `devicePixelRatio`. */
  readonly name: string;
  /** True when the name resolves to a binding declared through `languageOptions.globals`. */
  readonly configured: boolean;
  /** Source-like text of the access, e.g. `window.devicePixelRatio`. */
  readonly text: string;
}

/** Guards a module specifier as one this plugin recognizes. */
export function isKnownSource(value: string): value is KnownSource {
  return KNOWN_SOURCES[value] === true;
}

/**
 * Resolves the scope variable an identifier node refers to.
 *
 * Walks the scope chain by name from the identifier's own scope, so a local
 * declaration always shadows an outer or global binding of the same name.
 */
export function resolveVariable(
  sourceCode: SourceCode,
  identifier: AstNode,
): Scope.Variable | null {
  // A node with no identifier name can never match a binding, and the empty
  // string is not a valid one, so the scope walk simply finds nothing.
  const name = getIdentifierName(identifier) ?? "";

  let scope: Scope.Scope | null = sourceCode.getScope(toReportNode(identifier));
  while (scope !== null) {
    const variable = scope.set.get(name);
    if (variable !== undefined) {
      return variable;
    }
    scope = scope.upper;
  }
  return null;
}

/**
 * True when a binding can never be rebound after its declaration.
 *
 * Imports, function declarations, and `const` declarators qualify; `let`, `var`,
 * parameters, catch clauses, redeclarations, and any binding with a later write
 * do not.
 */
export function isImmutableBinding(variable: Scope.Variable): boolean {
  const def = variable.defs[0];
  if (variable.defs.length !== 1 || def === undefined) {
    return false;
  }

  const writeCount = variable.references.filter((reference) => reference.isWrite()).length;

  if (def.type === "ImportBinding" || def.type === "FunctionName") {
    return writeCount === 0;
  }
  if (def.type !== "Variable" || def.parent.kind !== "const") {
    return false;
  }
  // A `const` declarator's initializer is the single permitted write.
  return writeCount <= 1;
}

/** Returns the `const` declarator initializer of an immutable binding. */
export function getImmutableInitializer(variable: Scope.Variable): AstNode | null {
  if (!isImmutableBinding(variable)) {
    return null;
  }
  const def = variable.defs[0];
  if (def === undefined || def.type !== "Variable") {
    return null;
  }
  return unwrapExpression(nodeField(def.node, "init"));
}

/** Returns the function node an immutable binding permanently holds. */
export function getImmutableFunction(variable: Scope.Variable): AstNode | null {
  if (!isImmutableBinding(variable)) {
    return null;
  }
  if (variable.defs[0]?.type === "FunctionName") {
    return variable.defs[0].node;
  }
  const initializer = getImmutableInitializer(variable);
  return initializer !== null && isFunctionNode(initializer) ? initializer : null;
}

/** True when an import declaration or specifier is erased at runtime. */
function isTypeOnly(node: AstNode): boolean {
  return nodeField(node, "importKind") === "type";
}

/** Reads the exact module specifier of an import declaration, verbatim. */
function getImportSource(declaration: AstNode): string | null {
  return getStaticStringValue(childNode(declaration, "source"));
}

/**
 * Resolves a binding declared by `import { name as local }` from any module.
 *
 * Default imports and namespace imports are not named values and return `null`.
 * Source policy is applied by callers, not here.
 */
function getScopedNamedImport(variable: Scope.Variable): ScopedImportedValue | null {
  const def = variable.defs[0];
  if (variable.defs.length !== 1 || def === undefined || def.type !== "ImportBinding") {
    return null;
  }
  if (def.node.type !== "ImportSpecifier") {
    return null;
  }
  if (isTypeOnly(def.parent) || isTypeOnly(def.node)) {
    return null;
  }

  const source = getImportSource(def.parent);
  const imported = childNode(def.node, "imported");
  const name =
    imported === null ? null : (getIdentifierName(imported) ?? getStaticStringValue(imported));
  if (source === null || name === null) {
    return null;
  }
  return { source, name };
}

/** Resolves a binding declared by `import * as ns` from any module. */
function getScopedNamespaceImport(variable: Scope.Variable): string | null {
  const def = variable.defs[0];
  if (variable.defs.length !== 1 || def === undefined || def.type !== "ImportBinding") {
    return null;
  }
  if (def.node.type !== "ImportNamespaceSpecifier" || isTypeOnly(def.parent)) {
    return null;
  }
  return getImportSource(def.parent);
}

/**
 * Resolves a binding declared by `import { name as local }` from a known module.
 *
 * Default imports and namespace imports are not named values and return `null`.
 */
export function getNamedImport(variable: Scope.Variable): ImportedValue | null {
  const named = getScopedNamedImport(variable);
  if (named === null || !isKnownSource(named.source)) {
    return null;
  }
  return { source: named.source, name: named.name };
}

/** Resolves a binding declared by `import * as ns` from a known module. */
export function getNamespaceImport(variable: Scope.Variable): KnownSource | null {
  const source = getScopedNamespaceImport(variable);
  return source !== null && isKnownSource(source) ? source : null;
}

/**
 * Resolves `ns.Name` where `ns` is a runtime namespace import of any module.
 *
 * `member` must already be a `MemberExpression`; callers check that before
 * deciding to resolve a namespace access.
 */
function resolveNamespaceMember(
  sourceCode: SourceCode,
  member: AstNode,
): ScopedImportedValue | null {
  const name = getStaticPropertyName(member);
  const object = unwrapExpression(childNode(member, "object"));
  if (name === null || object === null || object.type !== "Identifier") {
    return null;
  }
  const variable = resolveVariable(sourceCode, object);
  const source = variable === null ? null : getScopedNamespaceImport(variable);
  if (source === null) {
    return null;
  }
  return { source, name };
}

/** A binding introduced by exactly one level of object destructuring. */
export interface DestructuredBinding {
  /** Property name read from the initializer. */
  readonly property: string;
  /** Initializer expression the pattern destructures. */
  readonly initializer: AstNode;
}

/**
 * Resolves `const { Prop: local } = initializer` for an immutable binding.
 *
 * Only a single non-nested object pattern level is accepted, matching the
 * one-hop alias budget the whole plugin shares. Array patterns, nested
 * patterns, rest elements, defaults, and dynamic keys stay unresolved.
 */
export function getDestructuredBinding(variable: Scope.Variable): DestructuredBinding | null {
  const def = variable.defs[0];
  if (def === undefined || def.type !== "Variable") {
    return null;
  }
  const pattern = childNode(def.node, "id");
  if (pattern === null || pattern.type !== "ObjectPattern") {
    return null;
  }

  const local: AstNode = def.name;
  let property: string | null = null;
  for (const entry of childNodes(pattern, "properties")) {
    if (entry.type !== "Property" || childNode(entry, "value") !== local) {
      continue;
    }
    property = getStaticPropertyName(entry);
    break;
  }
  if (property === null) {
    return null;
  }

  const initializer = getImmutableInitializer(variable);
  if (initializer === null) {
    return null;
  }
  return { property, initializer };
}

/** A binding introduced by exactly one level of array destructuring. */
export interface ArrayDestructuredBinding {
  /** Zero-based position the binding occupies in the pattern. */
  readonly index: number;
  /** Initializer expression the pattern destructures. */
  readonly initializer: AstNode;
}

/**
 * Resolves `const [, local] = initializer` for an immutable binding.
 *
 * Only a flat array pattern is accepted; a nested pattern, a rest element in the
 * position of interest, or a default value stays unresolved.
 */
export function getArrayDestructuredBinding(
  variable: Scope.Variable,
): ArrayDestructuredBinding | null {
  const def = variable.defs[0];
  if (def === undefined || def.type !== "Variable") {
    return null;
  }
  const pattern = childNode(def.node, "id");
  if (pattern === null || pattern.type !== "ArrayPattern") {
    return null;
  }

  // Holes must keep their slot, so the raw array is indexed rather than a
  // node-filtered copy: `const [, setValue] = useState()` puts `setValue` at 1.
  const elements = nodeField(pattern, "elements");
  const local: AstNode = def.name;
  const index = Array.isArray(elements)
    ? elements.findIndex((entry: unknown) => entry === local)
    : -1;
  if (index < 0) {
    return null;
  }

  const initializer = getImmutableInitializer(variable);
  if (initializer === null) {
    return null;
  }
  return { index, initializer };
}

/**
 * Resolves `const { Name: local } = ns` where `ns` is a namespace import of any
 * module.
 */
function resolveDestructuredNamespace(
  sourceCode: SourceCode,
  variable: Scope.Variable,
): ScopedImportedValue | null {
  const destructured = getDestructuredBinding(variable);
  if (destructured === null || destructured.initializer.type !== "Identifier") {
    return null;
  }
  const namespaceVariable = resolveVariable(sourceCode, destructured.initializer);
  const source = namespaceVariable === null ? null : getScopedNamespaceImport(namespaceVariable);
  if (source === null) {
    return null;
  }
  return { source, name: destructured.property };
}

/**
 * Resolves the exact module and export name a value denotes, applying no source
 * policy at all.
 *
 * This is the single traversal every import-identity helper shares. It accepts a
 * direct named import, a namespace member access, and exactly one immutable
 * `const` hop (identifier alias, namespace member alias, or object
 * destructuring). Anything requiring a second hop, a mutable binding, a dynamic
 * member name, a type-only import, a default import, or `require()` stays
 * unresolved.
 */
function resolveScopedImport(
  sourceCode: SourceCode,
  node: unknown,
  allowAliasHop: boolean,
): ScopedImportedValue | null {
  const target = unwrapExpression(node);
  if (target?.type === "MemberExpression") {
    return resolveNamespaceMember(sourceCode, target);
  }
  if (target?.type !== "Identifier") {
    return null;
  }

  const variable = resolveVariable(sourceCode, target);
  if (variable === null) {
    return null;
  }

  const named = getScopedNamedImport(variable);
  if (named !== null) {
    return named;
  }
  if (!allowAliasHop || !isImmutableBinding(variable)) {
    return null;
  }

  const destructured = resolveDestructuredNamespace(sourceCode, variable);
  if (destructured !== null) {
    return destructured;
  }

  const initializer = getImmutableInitializer(variable);
  if (initializer === null) {
    return null;
  }
  return resolveScopedImport(sourceCode, initializer, false);
}

/**
 * Resolves the import identity of the value an expression denotes, restricted to
 * the modules this plugin recognizes.
 *
 * Accepts a direct named import, a namespace member access, and exactly one
 * immutable `const` hop (identifier alias, namespace member alias, or object
 * destructuring). Anything requiring a second hop, a mutable binding, a dynamic
 * member name, a type-only import, or `require()` stays unresolved. A specifier
 * outside {@link KnownSource} — including `three/addons`, a direct addon module,
 * a compatibility example path, and any deep `three/src/...` path — is never
 * recognized here.
 */
export function resolveImportedValue(
  sourceCode: SourceCode,
  node: unknown,
  allowAliasHop = true,
): ImportedValue | null {
  const resolved = resolveScopedImport(sourceCode, node, allowAliasHop);
  if (resolved === null || !isKnownSource(resolved.source)) {
    return null;
  }
  return { source: resolved.source, name: resolved.name };
}

/**
 * Resolves the import identity of a value against a caller-supplied source and
 * name policy.
 *
 * Structural resolution is identical to {@link resolveImportedValue}; only the
 * accepted `(source, importedName)` pairs differ. `predicate` receives exact
 * strings and is the only place a module outside {@link KnownSource} can be
 * admitted.
 */
export function resolveScopedImportedValue(
  sourceCode: SourceCode,
  node: unknown,
  predicate: ImportPredicate,
): ScopedImportedValue | null {
  const resolved = resolveScopedImport(sourceCode, node, true);
  if (resolved === null || !predicate(resolved.source, resolved.name)) {
    return null;
  }
  return resolved;
}

/** How a value was constructed, and which binding holds that construction. */
export interface ConstructionDetails {
  /** The `NewExpression` that produced the value; always an actual `new` call. */
  readonly newExpression: AstNode;
  /**
   * The immutable binding whose initializer is exactly {@link newExpression}, or
   * `null` for a direct `new` expression.
   *
   * Never a later receiver alias: for `const host = new Texture(); const ref =
   * host;` reached through `ref`, this is `host`. Rules that ask *where* a value
   * was constructed therefore see the construction site, not the alias site.
   */
  readonly constructionVariable: Scope.Variable | null;
}

/**
 * Resolves the construction behind a value, following a direct `new` expression
 * or an immutable binding initialized from one, plus one immutable receiver
 * alias hop.
 *
 * Purely structural: no module or class policy is applied. Callers resolve
 * `newExpression.callee` themselves, through {@link resolveImportedValue},
 * {@link resolveScopedImportedValue}, or {@link resolveGlobalReference}.
 */
export function getConstructionDetails(
  sourceCode: SourceCode,
  expression: unknown,
  allowAliasHop = true,
): ConstructionDetails | null {
  const target = unwrapExpression(expression);
  if (target?.type === "NewExpression") {
    return { newExpression: target, constructionVariable: null };
  }
  if (target?.type !== "Identifier") {
    return null;
  }

  const variable = resolveVariable(sourceCode, target);
  if (variable === null) {
    return null;
  }
  const initializer = getImmutableInitializer(variable);
  if (initializer === null) {
    return null;
  }
  if (initializer.type === "NewExpression") {
    return { newExpression: initializer, constructionVariable: variable };
  }
  if (!allowAliasHop) {
    return null;
  }
  return getConstructionDetails(sourceCode, initializer, false);
}

/**
 * Resolves the import identity of the constructor that produced a value.
 *
 * Matches a direct `new X()` expression and an immutable binding initialized
 * from one, plus one immutable alias hop between bindings.
 */
export function resolveConstructorImport(
  sourceCode: SourceCode,
  node: unknown,
  allowAliasHop = true,
): ImportedValue | null {
  const details = getConstructionDetails(sourceCode, node, allowAliasHop);
  if (details === null) {
    return null;
  }
  return resolveImportedValue(sourceCode, childNode(details.newExpression, "callee"));
}

/**
 * Resolves how a global value is addressed at `node`, or `null` when the name is
 * shadowed by a local binding or reached through an unrecognized object.
 */
export function resolveGlobalReference(
  sourceCode: SourceCode,
  node: unknown,
): GlobalReference | null {
  const target = unwrapExpression(node);

  if (target?.type === "Identifier") {
    const name = getIdentifierName(target);
    const variable = resolveVariable(sourceCode, target);
    if (name === null || (variable !== null && variable.defs.length > 0)) {
      return null;
    }
    return { name, configured: variable !== null, text: name };
  }

  if (target?.type !== "MemberExpression") {
    return null;
  }
  const name = getStaticPropertyName(target);
  if (name === null) {
    return null;
  }
  const base = resolveGlobalReference(sourceCode, childNode(target, "object"));
  if (base === null || GLOBAL_OBJECT_NAMES[base.name] !== true) {
    return null;
  }
  return { name, configured: base.configured, text: `${base.text}.${name}` };
}

/** Per-source-code cache of runtime import specifiers. */
const runtimeImportCache = new WeakMap<SourceCode, ReadonlySet<string>>();

/** Collects every module specifier the file imports for its runtime value. */
function getRuntimeImports(sourceCode: SourceCode): ReadonlySet<string> {
  const cached = runtimeImportCache.get(sourceCode);
  if (cached !== undefined) {
    return cached;
  }

  const specifiers = new Set<string>();
  const program: AstNode = sourceCode.ast;
  for (const statement of childNodes(program, "body")) {
    if (statement.type !== "ImportDeclaration" || isTypeOnly(statement)) {
      continue;
    }
    const source = getStaticStringValue(childNode(statement, "source"));
    const specifierNodes = childNodes(statement, "specifiers");
    // A bare side-effect import still loads the module at runtime.
    const loadsAtRuntime =
      specifierNodes.length === 0 || specifierNodes.some((entry) => !isTypeOnly(entry));
    if (source !== null && loadsAtRuntime) {
      specifiers.add(source);
    }
  }

  runtimeImportCache.set(sourceCode, specifiers);
  return specifiers;
}

/** True when the file imports `source` for its runtime value. */
export function hasRuntimeImport(sourceCode: SourceCode, source: KnownSource): boolean {
  return getRuntimeImports(sourceCode).has(source);
}

/**
 * True when the value a binding holds is never handed to other code.
 *
 * Every read must appear as the object of a member access, so the object itself
 * is never passed, returned, stored, spread, destructured, or compared. Rules
 * that reason about the object's later state rely on this: the only way its
 * fields can change is through a member write this file spells out.
 *
 * Reads from nested functions are permitted, because a member-only read still
 * cannot leak the object; a rule that additionally needs straight-line ordering
 * checks reference scopes itself.
 */
export function isNonEscapingBinding(variable: Scope.Variable): boolean {
  for (const reference of variable.references) {
    if (!reference.isRead()) {
      continue;
    }

    let current: AstNode = reference.identifier;
    let parent = parentOf(current);
    // Transparent wrappers keep the same value, so look through them.
    while (parent !== null && unwrapExpression(parent) === current) {
      current = parent;
      parent = parentOf(parent);
    }
    if (
      parent === null ||
      parent.type !== "MemberExpression" ||
      childNode(parent, "object") !== current
    ) {
      return false;
    }
  }

  return true;
}

/**
 * True when every read of a binding happens inside the binding's own function
 * scope.
 *
 * Rules that order writes against a later use by source position require this:
 * once a nested function or a sibling function can read the binding, the runtime
 * order of those reads is not determined by lexical position, so straight-line
 * domination proves nothing.
 */
export function isScopeLocalBinding(variable: Scope.Variable): boolean {
  const ownerScope = variable.scope.variableScope;
  return variable.references.every(
    (reference) => !reference.isRead() || reference.from.variableScope === ownerScope,
  );
}

/**
 * True when an expression is statically `null` or `undefined`.
 *
 * Recognizes the `null` literal, a `void` expression, and an `undefined` that no
 * local binding shadows. An identifier, a call, or a member access is not
 * statically nullish, because its value cannot be read from syntax.
 */
export function isStaticallyNullish(sourceCode: SourceCode, node: unknown): boolean {
  const target = unwrapExpression(node);
  if (target === null) {
    return false;
  }
  if (target.type === "Literal") {
    return (
      nodeField(target, "value") === null &&
      nodeField(target, "regex") === undefined &&
      nodeField(target, "bigint") === undefined
    );
  }
  if (target.type === "UnaryExpression") {
    return nodeField(target, "operator") === "void";
  }
  if (target.type !== "Identifier") {
    return false;
  }
  const global = resolveGlobalReference(sourceCode, target);
  return global !== null && global.name === "undefined";
}

/**
 * Returns the AST node that declares a binding.
 *
 * Rules use this to ask *where* a binding was introduced, for example whether a
 * listener function is declared inside the callback that registers it. The node
 * is read through the same structural guard as every other parser-supplied value,
 * so an unexpected definition shape resolves to `null` rather than crashing.
 */
export function getDeclarationNode(variable: Scope.Variable): AstNode | null {
  const definition = variable.defs[0];
  if (definition === undefined) {
    return null;
  }
  const declaration: unknown = definition.node;
  return isAstNode(declaration) ? declaration : null;
}
