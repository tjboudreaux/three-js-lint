import type { Rule } from "eslint";

import {
  childNode,
  childNodes,
  getStaticPropertyName,
  nodeField,
  toReportNode,
  unwrapExpression,
  type AstNode,
} from "../utils/ast.js";
import {
  getImmutableInitializer,
  resolveConstructorImport,
  resolveGlobalReference,
  resolveVariable,
} from "../utils/bindings.js";
import { createRule } from "../utils/create-rule.js";
import { RENDERER_CONSTRUCTORS } from "../utils/three-api.js";

/** Logical operators that only supply a fallback and never bound a value. */
const FALLBACK_OPERATORS: Record<string, true> = {
  "||": true,
  "??": true,
};

/**
 * Resolves the `devicePixelRatio` access an expression forwards, if any.
 *
 * Sees through one immutable `const` binding and through `||`/`??` fallbacks,
 * because neither changes the upper bound of the value. Any capping,
 * arithmetic, conditional, or unresolved expression returns `null`: the plugin
 * cannot prove what such an expression evaluates to, and guessing would report
 * code that is already bounded.
 */
function resolveDevicePixelRatioAccess(
  sourceCode: Rule.RuleContext["sourceCode"],
  node: unknown,
  allowAliasHop = true,
): string | null {
  const target = unwrapExpression(node);
  const global = target === null ? null : resolveGlobalReference(sourceCode, target);
  if (global !== null && global.name === "devicePixelRatio") {
    return global.text;
  }

  if (target?.type === "LogicalExpression") {
    const operator = nodeField(target, "operator");
    if (typeof operator !== "string" || FALLBACK_OPERATORS[operator] !== true) {
      return null;
    }
    return (
      resolveDevicePixelRatioAccess(sourceCode, childNode(target, "left"), allowAliasHop) ??
      resolveDevicePixelRatioAccess(sourceCode, childNode(target, "right"), allowAliasHop)
    );
  }

  if (!allowAliasHop || target?.type !== "Identifier") {
    return null;
  }
  const variable = resolveVariable(sourceCode, target);
  const initializer = variable === null ? null : getImmutableInitializer(variable);
  if (initializer === null) {
    return null;
  }
  return resolveDevicePixelRatioAccess(sourceCode, initializer, false);
}

export default createRule({
  name: "no-direct-device-pixel-ratio",
  type: "suggestion",
  description: "Disallow forwarding devicePixelRatio directly to a Three.js renderer.",
  recommended: true,
  messages: {
    directDevicePixelRatio:
      "Pass a bounded pixel ratio to {{renderer}}.setPixelRatio() instead of forwarding {{source}} directly.",
  },
  create(context) {
    const { sourceCode } = context;

    return {
      CallExpression(node) {
        const call: AstNode = node;
        const callee = unwrapExpression(childNode(call, "callee"));
        if (
          callee === null ||
          callee.type !== "MemberExpression" ||
          getStaticPropertyName(callee) !== "setPixelRatio"
        ) {
          return;
        }

        const receiver = unwrapExpression(childNode(callee, "object"));
        const renderer = receiver === null ? null : resolveConstructorImport(sourceCode, receiver);
        if (
          receiver === null ||
          renderer === null ||
          RENDERER_CONSTRUCTORS[renderer.source] !== renderer.name
        ) {
          return;
        }

        const argument = childNodes(call, "arguments")[0];
        if (argument === undefined) {
          return;
        }
        const source = resolveDevicePixelRatioAccess(sourceCode, argument);
        if (source === null) {
          return;
        }

        context.report({
          node: toReportNode(call),
          messageId: "directDevicePixelRatio",
          data: { renderer: sourceCode.getText(toReportNode(receiver)), source },
        });
      },
    };
  },
});
