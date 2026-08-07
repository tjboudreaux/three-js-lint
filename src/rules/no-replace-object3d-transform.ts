import type { Rule } from "eslint";

import {
  childNode,
  childNodes,
  getStaticPropertyName,
  nodeField,
  parentOf,
  toReportNode,
  unwrapExpression,
  type AstNode,
} from "../utils/ast.js";
import {
  isImmutableBinding,
  resolveConstructorImport,
  resolveVariable,
} from "../utils/bindings.js";
import { createRule } from "../utils/create-rule.js";
import {
  isThreeSource,
  OBJECT3D_CONSTRUCTORS,
  OBJECT3D_TRANSFORM_PROPERTIES,
} from "../utils/three-api.js";

/**
 * Argument counts each transform class's `set()` accepts.
 *
 * `Euler.set()` takes an optional fourth `order` argument; `Vector3.set()` and
 * `Quaternion.set()` are fixed. A construction with any other argument count is
 * reported without a suggestion, because the rewrite would change behavior.
 */
const SET_ARITY: Record<string, readonly number[]> = {
  Vector3: [3],
  Euler: [3, 4],
  Quaternion: [4],
};

/** The replacement a report can safely offer, if any. */
interface TransformSuggestion {
  readonly messageId: "preserveWithSet" | "preserveWithCopy";
  readonly replacement: string;
}

/** A resolved right-hand side of a transform assignment. */
interface TransformValue {
  /** Three.js class the value is an instance of. */
  readonly className: string;
  /** For the `source.clone()` form, the tracked receiver `.copy()` would take. */
  readonly cloneSource: AstNode | null;
}

/**
 * Resolves the Three.js class a value is an instance of, for the two accepted
 * value forms: a direct construction and `.clone()` of a tracked construction.
 */
function resolveTransformValue(
  sourceCode: Rule.RuleContext["sourceCode"],
  value: AstNode | null,
): TransformValue | null {
  if (value?.type === "NewExpression") {
    const constructed = resolveConstructorImport(sourceCode, value);
    if (constructed === null || !isThreeSource(constructed.source)) {
      return null;
    }
    return { className: constructed.name, cloneSource: null };
  }

  if (value?.type !== "CallExpression") {
    return null;
  }
  const callee = unwrapExpression(childNode(value, "callee"));
  if (
    callee === null ||
    callee.type !== "MemberExpression" ||
    getStaticPropertyName(callee) !== "clone"
  ) {
    return null;
  }
  const receiver = unwrapExpression(childNode(callee, "object"));
  if (receiver === null || receiver.type !== "Identifier") {
    return null;
  }
  const variable = resolveVariable(sourceCode, receiver);
  if (variable === null || !isImmutableBinding(variable)) {
    return null;
  }
  const constructed = resolveConstructorImport(sourceCode, receiver);
  if (constructed === null || !isThreeSource(constructed.source)) {
    return null;
  }
  return { className: constructed.name, cloneSource: receiver };
}

/**
 * Builds the in-place rewrite for a transform replacement, when one is provably
 * equivalent.
 *
 * Only statement-position assignments qualify: `object.position = value`
 * evaluates to `value`, while `object.position.set(...)` evaluates to
 * `object.position`, so rewriting a used value would change the program.
 */
function buildSuggestion(
  sourceCode: Rule.RuleContext["sourceCode"],
  assignment: AstNode,
  ownerText: string,
  property: string,
  value: TransformValue,
  construction: AstNode,
): TransformSuggestion | null {
  const parent = parentOf(assignment);
  if (parent === null || parent.type !== "ExpressionStatement") {
    return null;
  }
  const target = `${ownerText}.${property}`;

  if (value.cloneSource !== null) {
    return {
      messageId: "preserveWithCopy",
      replacement: `${target}.copy(${sourceCode.getText(toReportNode(value.cloneSource))})`,
    };
  }

  const args = childNodes(construction, "arguments");
  const allowed = SET_ARITY[value.className];
  // A spread makes the effective argument count unknown at lint time.
  if (
    allowed === undefined ||
    !allowed.includes(args.length) ||
    args.some((argument) => argument.type === "SpreadElement")
  ) {
    return null;
  }
  const argumentText = args.map((argument) => sourceCode.getText(toReportNode(argument)));
  return {
    messageId: "preserveWithSet",
    replacement: `${target}.set(${argumentText.join(", ")})`,
  };
}

export default createRule({
  name: "no-replace-object3d-transform",
  type: "problem",
  description: "Disallow replacing Object3D transform objects.",
  recommended: true,
  hasSuggestions: true,
  messages: {
    replaceObject3DTransform:
      "Do not replace {{owner}}.{{property}}; preserve the Three.js transform object's identity with .set() or .copy().",
    preserveWithSet: "Preserve {{property}} identity with .set().",
    preserveWithCopy: "Preserve {{property}} identity with .copy().",
  },
  create(context) {
    const { sourceCode } = context;

    return {
      AssignmentExpression(node) {
        const assignment: AstNode = node;
        if (nodeField(assignment, "operator") !== "=") {
          return;
        }

        const target = unwrapExpression(childNode(assignment, "left"));
        if (target === null || target.type !== "MemberExpression") {
          return;
        }
        const property = getStaticPropertyName(target);
        if (property === null) {
          return;
        }
        const expectedClass = OBJECT3D_TRANSFORM_PROPERTIES[property];
        if (expectedClass === undefined) {
          return;
        }

        const owner = unwrapExpression(childNode(target, "object"));
        if (owner === null || owner.type !== "Identifier") {
          return;
        }
        const ownerVariable = resolveVariable(sourceCode, owner);
        if (ownerVariable === null || !isImmutableBinding(ownerVariable)) {
          return;
        }
        const ownerClass = resolveConstructorImport(sourceCode, owner);
        if (
          ownerClass === null ||
          !isThreeSource(ownerClass.source) ||
          OBJECT3D_CONSTRUCTORS[ownerClass.name] !== true
        ) {
          return;
        }

        const construction = unwrapExpression(childNode(assignment, "right"));
        const value = resolveTransformValue(sourceCode, construction);
        // The replacement class must match the property, so `position = new Euler()`
        // stays unreported: that is a type error, not a transform-identity fault.
        if (construction === null || value === null || value.className !== expectedClass) {
          return;
        }

        const ownerText = sourceCode.getText(toReportNode(owner));
        const suggestion = buildSuggestion(
          sourceCode,
          assignment,
          ownerText,
          property,
          value,
          construction,
        );

        context.report({
          node: toReportNode(assignment),
          messageId: "replaceObject3DTransform",
          data: { owner: ownerText, property },
          suggest:
            suggestion === null
              ? []
              : [
                  {
                    messageId: suggestion.messageId,
                    data: { property },
                    fix: (fixer) =>
                      fixer.replaceText(toReportNode(assignment), suggestion.replacement),
                  },
                ],
        });
      },
    };
  },
});
