import type { Rule, Scope } from "eslint";

import {
  childNode,
  childNodes,
  getStaticNumberValue,
  getStaticPropertyName,
  isWithin,
  nodeField,
  parentOf,
  toReportNode,
  unwrapExpression,
  walkAll,
  type AstNode,
} from "../utils/ast.js";
import {
  hasRuntimeImport,
  isImmutableBinding,
  isNonEscapingBinding,
  isScopeLocalBinding,
  resolveConstructorImport,
  resolveImportedValue,
  resolveVariable,
} from "../utils/bindings.js";
import { createRule } from "../utils/create-rule.js";
import { isThreeSource } from "../utils/three-api.js";

/** Classes whose `raycast` three-mesh-bvh replaces to enable BVH acceleration. */
const BVH_PROTOTYPE_TARGETS: Record<string, true> = {
  Mesh: true,
  BatchedMesh: true,
};

/** Raycaster methods that return an array of intersections. */
const INTERSECT_METHODS: Record<string, true> = {
  intersectObject: true,
  intersectObjects: true,
};

/** Comparison operators that can express an emptiness test against zero. */
const ZERO_COMPARISON_OPERATORS: Record<string, true> = {
  "===": true,
  "!==": true,
  "==": true,
  "!=": true,
  ">": true,
  "<": true,
  ">=": true,
  "<=": true,
};

/** Statement containers whose direct children run in unconditional source order. */
const STRAIGHT_LINE_BLOCKS: Record<string, true> = {
  Program: true,
  BlockStatement: true,
  StaticBlock: true,
};

/**
 * True when the file installs three-mesh-bvh's accelerated raycast on `Mesh` or
 * `BatchedMesh`.
 *
 * Without this activation, `intersectObject` runs Three.js's own raycast and
 * `firstHitOnly` has no effect, so the rule must stay silent.
 */
function hasAcceleratedRaycastActivation(sourceCode: Rule.RuleContext["sourceCode"]): boolean {
  if (!hasRuntimeImport(sourceCode, "three-mesh-bvh")) {
    return false;
  }

  const program: AstNode = sourceCode.ast;
  let activated = false;

  walkAll(program, (node) => {
    if (activated || node.type !== "AssignmentExpression" || nodeField(node, "operator") !== "=") {
      return;
    }
    const value = resolveImportedValue(sourceCode, childNode(node, "right"));
    if (
      value === null ||
      value.source !== "three-mesh-bvh" ||
      value.name !== "acceleratedRaycast"
    ) {
      return;
    }

    const target = unwrapExpression(childNode(node, "left"));
    if (
      target === null ||
      target.type !== "MemberExpression" ||
      getStaticPropertyName(target) !== "raycast"
    ) {
      return;
    }
    const prototype = unwrapExpression(childNode(target, "object"));
    if (
      prototype === null ||
      prototype.type !== "MemberExpression" ||
      getStaticPropertyName(prototype) !== "prototype"
    ) {
      return;
    }
    const owner = resolveImportedValue(sourceCode, childNode(prototype, "object"));
    if (
      owner === null ||
      !isThreeSource(owner.source) ||
      BVH_PROTOTYPE_TARGETS[owner.name] !== true
    ) {
      return;
    }
    activated = true;
  });

  return activated;
}

/**
 * True when `node` is `<length>` used purely as an emptiness test.
 *
 * Accepts `!hits.length`, `hits.length` in a boolean test position, and a
 * comparison against the numeric literal zero. A comparison against any other
 * number reads the count rather than testing emptiness, so it is rejected.
 */
function isEmptinessTest(lengthAccess: AstNode): boolean {
  const parent = parentOf(lengthAccess);
  if (parent === null) {
    return false;
  }

  if (parent.type === "UnaryExpression") {
    return nodeField(parent, "operator") === "!";
  }

  if (
    parent.type === "IfStatement" ||
    parent.type === "ConditionalExpression" ||
    parent.type === "WhileStatement" ||
    parent.type === "DoWhileStatement"
  ) {
    return childNode(parent, "test") === lengthAccess;
  }

  if (parent.type === "BinaryExpression") {
    const operator = nodeField(parent, "operator");
    if (typeof operator !== "string" || ZERO_COMPARISON_OPERATORS[operator] !== true) {
      return false;
    }
    const other =
      childNode(parent, "left") === lengthAccess
        ? childNode(parent, "right")
        : childNode(parent, "left");
    return getStaticNumberValue(other) === 0;
  }

  return false;
}

/** How a read of the intersection array uses it. */
type HitsUse = "firstHit" | "emptiness" | "other";

/**
 * Classifies one read of the intersection array.
 *
 * Only `hits[0]`, `hits.at(0)`, and an emptiness test on `hits.length` prove the
 * code needs at most the first hit. Everything else — iteration, another index,
 * a different method, a numeric length use, passing the array on — means the
 * full result is (or may be) needed.
 */
function classifyHitsUse(reference: Scope.Reference): HitsUse {
  const identifier: AstNode = reference.identifier;
  const parent = parentOf(identifier);
  if (parent === null || parent.type !== "MemberExpression") {
    return "other";
  }
  if (childNode(parent, "object") !== identifier) {
    return "other";
  }

  if (nodeField(parent, "computed") === true) {
    return getStaticNumberValue(childNode(parent, "property")) === 0 ? "firstHit" : "other";
  }

  const property = getStaticPropertyName(parent);
  if (property === "length") {
    return isEmptinessTest(parent) ? "emptiness" : "other";
  }
  if (property !== "at") {
    return "other";
  }

  const call = parentOf(parent);
  if (call === null || call.type !== "CallExpression" || childNode(call, "callee") !== parent) {
    return "other";
  }
  const args = childNodes(call, "arguments");
  if (args.length !== 1) {
    return "other";
  }
  return getStaticNumberValue(args[0] ?? null) === 0 ? "firstHit" : "other";
}

/** The statement of a straight-line block that contains `node`, if any. */
function findDominatingStatement(node: AstNode): AstNode | null {
  for (let current = node; ;) {
    const parent = parentOf(current);
    if (parent === null) {
      return null;
    }
    if (STRAIGHT_LINE_BLOCKS[parent.type] === true) {
      return current;
    }
    current = parent;
  }
}

/** A resolved write to `<raycaster>.firstHitOnly`. */
interface FirstHitOnlyWrite {
  readonly node: AstNode;
  /** `null` when the assigned value is not a boolean literal. */
  readonly value: boolean | null;
}

/**
 * Collects every write on the raycaster that can change `firstHitOnly`.
 *
 * Reads of the raycaster are already restricted to member access by the
 * non-escaping check, so this sees every place the flag can change. A write
 * through a dynamic key is recorded with an unknown value, because it may target
 * `firstHitOnly` without saying so.
 */
function collectFirstHitOnlyWrites(variable: Scope.Variable): FirstHitOnlyWrite[] {
  const writes: FirstHitOnlyWrite[] = [];

  for (const reference of variable.references) {
    if (!reference.isRead()) {
      continue;
    }
    const identifier: AstNode = reference.identifier;
    const member = parentOf(identifier);
    if (
      member === null ||
      member.type !== "MemberExpression" ||
      childNode(member, "object") !== identifier
    ) {
      continue;
    }
    const property = getStaticPropertyName(member);
    if (property !== null && property !== "firstHitOnly") {
      continue;
    }
    const assignment = parentOf(member);
    if (
      assignment === null ||
      assignment.type !== "AssignmentExpression" ||
      childNode(assignment, "left") !== member
    ) {
      continue;
    }

    const value = property === null ? null : unwrapExpression(childNode(assignment, "right"));
    const literal =
      value !== null && value.type === "Literal" && typeof nodeField(value, "value") === "boolean"
        ? nodeField(value, "value") === true
        : null;
    writes.push({ node: assignment, value: literal });
  }

  return writes;
}

/** Source-order start offset of a node, or `null` when the parser omits ranges. */
function startOffset(node: AstNode): number | null {
  const range = nodeField(node, "range");
  if (Array.isArray(range) && typeof range[0] === "number") {
    return range[0];
  }
  const start = nodeField(node, "start");
  return typeof start === "number" ? start : null;
}

/**
 * Decides whether `firstHitOnly` is already provably enabled at the cast.
 *
 * Returns `true`, silencing the rule, in exactly two situations:
 *
 * - Some write assigns a value this rule cannot evaluate, so the flag's state at
 *   the cast is unknown.
 * - The last write that *dominates* the cast assigns literal `true`. A write
 *   dominates only when it is a statement of a straight-line block enclosing the
 *   cast and precedes it, so it runs on every path that reaches the cast; a later
 *   dominating `false` therefore cancels an earlier `true`.
 *
 * A boolean write that does not dominate cannot affect this cast. The raycaster
 * is required to be immutable, non-escaping, and read only within its own
 * function scope, so a write inside a branch runs on some paths only, and a write
 * after the cast runs after it — neither leaves the flag set here.
 */
function isFirstHitOnlyAlreadyHandled(
  writes: readonly FirstHitOnlyWrite[],
  cast: AstNode,
): boolean {
  const castStatement = findDominatingStatement(cast);
  const castOffset = startOffset(cast);
  const dominating: { offset: number; value: boolean }[] = [];

  for (const write of writes) {
    if (write.value === null) {
      return true;
    }

    const statement = findDominatingStatement(write.node);
    const offset = startOffset(write.node);
    if (
      statement === null ||
      castStatement === null ||
      offset === null ||
      castOffset === null ||
      offset >= castOffset ||
      !isWithin(cast, parentOf(statement) ?? statement)
    ) {
      continue;
    }
    dominating.push({ offset, value: write.value });
  }

  dominating.sort((left, right) => left.offset - right.offset);
  return dominating[dominating.length - 1]?.value === true;
}

export default createRule({
  name: "prefer-bvh-first-hit-only",
  type: "suggestion",
  description: "Prefer three-mesh-bvh firstHitOnly when only the first raycast hit is used.",
  recommended: false,
  messages: {
    preferFirstHitOnly:
      "This BVH raycast result is used only for the first hit or emptiness; set {{raycaster}}.firstHitOnly = true before the cast.",
  },
  create(context) {
    const { sourceCode } = context;
    if (!hasAcceleratedRaycastActivation(sourceCode)) {
      return {};
    }

    return {
      VariableDeclarator(node) {
        const declarator: AstNode = node;
        const declaration = parentOf(declarator);
        if (declaration === null || nodeField(declaration, "kind") !== "const") {
          return;
        }
        // Only `const hits = ...` is analyzed; a destructuring pattern already
        // takes the first hit and needs no change.
        const id = childNode(declarator, "id");
        if (id === null || id.type !== "Identifier") {
          return;
        }

        const cast = unwrapExpression(childNode(declarator, "init"));
        if (cast === null || cast.type !== "CallExpression") {
          return;
        }
        const callee = unwrapExpression(childNode(cast, "callee"));
        if (callee === null || callee.type !== "MemberExpression") {
          return;
        }
        const method = getStaticPropertyName(callee);
        if (method === null || INTERSECT_METHODS[method] !== true) {
          return;
        }

        const receiver = unwrapExpression(childNode(callee, "object"));
        if (receiver === null || receiver.type !== "Identifier") {
          return;
        }
        const raycaster = resolveVariable(sourceCode, receiver);
        // The raycaster must be immutable, must never be handed to other code,
        // and must only be read inside its own function scope. Without all
        // three, the `firstHitOnly` writes below cannot be ordered against this
        // cast by source position.
        if (
          raycaster === null ||
          !isImmutableBinding(raycaster) ||
          !isNonEscapingBinding(raycaster) ||
          !isScopeLocalBinding(raycaster)
        ) {
          return;
        }
        const constructed = resolveConstructorImport(sourceCode, receiver);
        if (
          constructed === null ||
          !isThreeSource(constructed.source) ||
          constructed.name !== "Raycaster"
        ) {
          return;
        }

        const hits = resolveVariable(sourceCode, id);
        // A capture in a nested function may run at any time, so the set of uses
        // observed here would no longer be the complete set.
        if (hits === null || !isImmutableBinding(hits) || !isScopeLocalBinding(hits)) {
          return;
        }

        let provenUses = 0;
        for (const reference of hits.references) {
          if (!reference.isRead()) {
            continue;
          }
          if (classifyHitsUse(reference) === "other") {
            return;
          }
          provenUses += 1;
        }
        if (provenUses === 0) {
          return;
        }

        if (isFirstHitOnlyAlreadyHandled(collectFirstHitOnlyWrites(raycaster), cast)) {
          return;
        }

        context.report({
          node: toReportNode(cast),
          messageId: "preferFirstHitOnly",
          data: { raycaster: sourceCode.getText(toReportNode(receiver)) },
        });
      },
    };
  },
});
