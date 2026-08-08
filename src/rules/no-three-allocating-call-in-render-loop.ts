import type { Rule } from "eslint";

import {
  childNode,
  getSpreadFreeArguments,
  getStaticPropertyName,
  nodeField,
  toReportNode,
  unwrapExpression,
  type AstNode,
} from "../utils/ast.js";
import {
  isImmutableBinding,
  resolveConstructorImport,
  resolveGlobalReference,
  resolveVariable,
} from "../utils/bindings.js";
import { createRule } from "../utils/create-rule.js";
import { collectHotCallbacks, getDirectHotCallback } from "../utils/hot-contexts.js";
import { getAllocatingMethod, isThreeSource } from "../utils/three-api.js";

/**
 * True when an explicit target argument is statically `undefined` or `void`, which
 * Three.js treats exactly like an omitted target.
 *
 * `null` is deliberately excluded: the catalog's optional-target parameters use
 * default values, which a `null` argument does not trigger, so such a call is a
 * different shape rather than a missing target.
 */
function isOmittedTarget(sourceCode: Rule.RuleContext["sourceCode"], target: AstNode): boolean {
  const unwrapped = unwrapExpression(target);
  if (unwrapped === null) {
    return false;
  }
  if (unwrapped.type === "UnaryExpression") {
    return nodeField(unwrapped, "operator") === "void";
  }
  if (unwrapped.type !== "Identifier") {
    return false;
  }
  const global = resolveGlobalReference(sourceCode, unwrapped);
  return global !== null && global.name === "undefined";
}

export default createRule({
  name: "no-three-allocating-call-in-render-loop",
  type: "suggestion",
  description:
    "Disallow allocation-returning Three.js method calls in verified render-loop callbacks.",
  recommended: true,
  messages: {
    missingReusableTargetInLoop:
      "Calling {{receiver}}.{{method}}() without a reusable output argument allocates on every verified render-loop callback invocation; pass a scratch target created outside the loop.",
    alwaysAllocatingCallInLoop:
      "Calling {{receiver}}.{{method}}() allocates result objects on every verified render-loop callback invocation; move the call or reuse its result outside the loop.",
  },
  create(context) {
    const { sourceCode } = context;
    // React Three Fiber `useFrame` is included here: `@react-three/eslint-plugin`
    // reports `new` and `clone` inside it, but has no method-call equivalent, so
    // there is no diagnostic to duplicate.
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
        const constructed = resolveConstructorImport(sourceCode, receiver);
        if (constructed === null || !isThreeSource(constructed.source)) {
          return;
        }

        const entry = getAllocatingMethod(constructed.name, method);
        const args = getSpreadFreeArguments(call);
        if (
          entry === null ||
          args === null ||
          args.length < entry.minArgs ||
          args.length > entry.maxArgs
        ) {
          return;
        }

        const data = { receiver: sourceCode.getText(toReportNode(receiver)), method };

        if (entry.targetIndex === null) {
          context.report({
            node: toReportNode(call),
            messageId: "alwaysAllocatingCallInLoop",
            data,
          });
          return;
        }

        // A stable expression in the target slot is exactly the fix this rule asks
        // for, so it stays silent. An inline array literal is not reuse: it is a
        // fresh array on every invocation.
        const target = args[entry.targetIndex];
        const reused =
          target !== undefined &&
          !isOmittedTarget(sourceCode, target) &&
          !(entry.arrayTarget && unwrapExpression(target)?.type === "ArrayExpression");
        if (reused) {
          return;
        }

        context.report({
          node: toReportNode(call),
          messageId: "missingReusableTargetInLoop",
          data,
        });
      },
    };
  },
});
