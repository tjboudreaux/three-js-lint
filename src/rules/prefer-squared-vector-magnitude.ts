import type { Rule } from "eslint";

import {
  childNode,
  getSpreadFreeArguments,
  getStaticNumberValue,
  getStaticPropertyName,
  nodeField,
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
  getSquaredMagnitudeMethod,
  getVectorLayout,
  isThreeSource,
  MAGNITUDE_METHOD_ARGS,
} from "../utils/three-api.js";

/** Comparison operators whose result is unchanged by squaring both sides at zero. */
const ZERO_COMPARISON_OPERATORS: Record<string, true> = {
  "<": true,
  "<=": true,
  ">": true,
  ">=": true,
  "==": true,
  "!=": true,
  "===": true,
  "!==": true,
};

/** A cataloged magnitude call and the squared method that replaces it. */
interface MagnitudeCall {
  /** The call expression to report. */
  readonly call: AstNode;
  /** Exactly `lengthSq` or `distanceToSquared`. */
  readonly squaredMethod: string;
}

/** Resolves the Three.js vector class an immutable binding was constructed from. */
function resolveVectorClass(
  sourceCode: Rule.RuleContext["sourceCode"],
  receiver: AstNode,
): string | null {
  if (receiver.type !== "Identifier") {
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
  return getVectorLayout(constructed.name) === null ? null : constructed.name;
}

/**
 * Resolves a cataloged magnitude call, or `null` when the expression is anything
 * else.
 *
 * `distanceTo` additionally requires its single argument to be proven the same
 * vector class, because `distanceToSquared` is only defined for a matching
 * operand.
 */
function resolveMagnitudeCall(
  sourceCode: Rule.RuleContext["sourceCode"],
  node: unknown,
): MagnitudeCall | null {
  const call = unwrapExpression(node);
  if (call === null || call.type !== "CallExpression") {
    return null;
  }
  const callee = unwrapExpression(childNode(call, "callee"));
  if (callee === null || callee.type !== "MemberExpression") {
    return null;
  }
  const method = getStaticPropertyName(callee);
  const receiver = unwrapExpression(childNode(callee, "object"));
  if (method === null || receiver === null) {
    return null;
  }
  const className = resolveVectorClass(sourceCode, receiver);
  if (className === null) {
    return null;
  }
  const squaredMethod = getSquaredMagnitudeMethod(className, method);
  const expectedArgs = MAGNITUDE_METHOD_ARGS[method];
  const args = getSpreadFreeArguments(call);
  if (
    squaredMethod === null ||
    expectedArgs === undefined ||
    args === null ||
    args.length !== expectedArgs
  ) {
    return null;
  }

  const other = args[0];
  if (other !== undefined) {
    const otherTarget = unwrapExpression(other);
    if (otherTarget === null || resolveVectorClass(sourceCode, otherTarget) !== className) {
      return null;
    }
  }
  return { call, squaredMethod };
}

/** True when an expression is a statically zero number, including `+0` and `-0`. */
function isZeroThreshold(node: unknown): boolean {
  const target = unwrapExpression(node);
  if (target === null) {
    return false;
  }
  return getStaticNumberValue(target) === 0;
}

export default createRule({
  name: "prefer-squared-vector-magnitude",
  type: "suggestion",
  description: "Prefer squared Three.js vector magnitudes in zero comparisons.",
  recommended: false,
  messages: {
    preferSquaredZeroComparison:
      "Compare {{expression}} with zero via {{squaredMethod}}() to avoid a square root.",
  },
  create(context) {
    const { sourceCode } = context;

    return {
      BinaryExpression(node) {
        const comparison: AstNode = node;
        const operator = nodeField(comparison, "operator");
        if (typeof operator !== "string" || ZERO_COMPARISON_OPERATORS[operator] !== true) {
          return;
        }

        const left = childNode(comparison, "left");
        const right = childNode(comparison, "right");
        if (left === null || right === null) {
          return;
        }

        // Exactly one side must be the magnitude and the other a literal zero.
        // Comparing two magnitudes, or a magnitude against any nonzero, dynamic,
        // bigint, NaN, or Infinity threshold, is not an equivalent rewrite:
        // squaring changes overflow, underflow, and rounding away from zero.
        const magnitude = isZeroThreshold(left)
          ? resolveMagnitudeCall(sourceCode, right)
          : isZeroThreshold(right)
            ? resolveMagnitudeCall(sourceCode, left)
            : null;
        if (magnitude === null) {
          return;
        }

        context.report({
          node: toReportNode(magnitude.call),
          messageId: "preferSquaredZeroComparison",
          data: {
            expression: sourceCode.getText(toReportNode(magnitude.call)),
            squaredMethod: magnitude.squaredMethod,
          },
        });
      },
    };
  },
});
