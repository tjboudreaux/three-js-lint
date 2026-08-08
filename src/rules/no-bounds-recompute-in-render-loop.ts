import type { Rule } from "eslint";

import {
  childNode,
  getSpreadFreeArguments,
  getStaticPropertyName,
  toReportNode,
  unwrapExpression,
  type AstNode,
} from "../utils/ast.js";
import {
  getConstructionDetails,
  isImmutableBinding,
  isStaticallyNullish,
  resolveImportedValue,
  resolveVariable,
} from "../utils/bindings.js";
import { createRule } from "../utils/create-rule.js";
import { collectHotCallbacks, getDirectHotCallback } from "../utils/hot-contexts.js";
import {
  getBoundsMethod,
  isThreeSource,
  type ConstructionRequirement,
} from "../utils/three-api.js";

/**
 * True when a construction has the shape a receiver-scoped bounds method needs.
 *
 * `BoxHelper#update` and the object-level compute methods scan data the
 * constructor supplied. A construction whose required slot is missing or
 * statically nullish never received that data, so the call cannot be shown to
 * scan anything. Optional material, index, and colour slots may be omitted or
 * explicitly `undefined`.
 */
function satisfiesConstruction(
  sourceCode: Rule.RuleContext["sourceCode"],
  newExpression: AstNode,
  requirement: ConstructionRequirement,
): boolean {
  const args = getSpreadFreeArguments(newExpression);
  if (args === null || args.length < requirement.minArgs || args.length > requirement.maxArgs) {
    return false;
  }
  return requirement.requiredSlots.every((slot) => {
    const argument = args[slot];
    return argument !== undefined && !isStaticallyNullish(sourceCode, argument);
  });
}

export default createRule({
  name: "no-bounds-recompute-in-render-loop",
  type: "suggestion",
  description:
    "Disallow full-scan Three.js bounds recomputation in verified render-loop callbacks.",
  recommended: false,
  messages: {
    boundsRecomputeInLoop:
      "Calling {{receiver}}.{{method}}() inside this verified render-loop callback scans bounds data; cache or narrow repeated recomputation when scene semantics allow.",
  },
  create(context) {
    const { sourceCode } = context;
    const hotCallbacks = collectHotCallbacks(sourceCode, { includeUseFrame: true });
    if (hotCallbacks.size === 0) {
      return {};
    }

    return {
      CallExpression(node) {
        const call: AstNode = node;
        if (getDirectHotCallback(call, hotCallbacks) === null) {
          return;
        }

        const callee = unwrapExpression(childNode(call, "callee"));
        if (callee === null || callee.type !== "MemberExpression") {
          return;
        }
        const method = getStaticPropertyName(callee);
        const receiver = unwrapExpression(childNode(callee, "object"));
        if (method === null || receiver === null || receiver.type !== "Identifier") {
          return;
        }
        const variable = resolveVariable(sourceCode, receiver);
        if (variable === null || !isImmutableBinding(variable)) {
          return;
        }

        const construction = getConstructionDetails(sourceCode, receiver);
        if (construction === null) {
          return;
        }
        const constructed = resolveImportedValue(
          sourceCode,
          childNode(construction.newExpression, "callee"),
        );
        if (constructed === null || !isThreeSource(constructed.source)) {
          return;
        }

        const entry = getBoundsMethod(constructed.name, method);
        const args = getSpreadFreeArguments(call);
        if (
          entry === null ||
          args === null ||
          args.length < entry.minArgs ||
          args.length > entry.maxArgs
        ) {
          return;
        }
        if (
          entry.construction !== null &&
          !satisfiesConstruction(sourceCode, construction.newExpression, entry.construction)
        ) {
          return;
        }

        context.report({
          node: toReportNode(call),
          messageId: "boundsRecomputeInLoop",
          data: { receiver: sourceCode.getText(toReportNode(receiver)), method },
        });
      },
    };
  },
});
