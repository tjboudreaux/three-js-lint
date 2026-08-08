import type { Rule } from "eslint";

import {
  childNode,
  getSpreadFreeArguments,
  getStaticPropertyName,
  getStaticStringValue,
  isFunctionNode,
  isWithin,
  toReportNode,
  unwrapExpression,
  type AstNode,
} from "../utils/ast.js";
import {
  getConstructionDetails,
  getDeclarationNode,
  getImmutableFunction,
  isImmutableBinding,
  resolveImportedValue,
  resolveVariable,
} from "../utils/bindings.js";
import { createRule } from "../utils/create-rule.js";
import { collectHotCallbacks, getDirectHotCallback } from "../utils/hot-contexts.js";
import { isDisposeEventHost } from "../utils/three-api.js";

/**
 * True when the value at `node` is a function that the enclosing callback
 * recreates on every invocation.
 *
 * Two shapes qualify: an inline function or arrow, and an immutable local binding
 * that permanently holds a function *and* is declared inside `callback`. A stable
 * outer callback, a parameter, a call result, a member access, and a two-hop
 * function alias all fail, because none of them is a fresh function per
 * invocation.
 */
function isEphemeralListener(
  sourceCode: Rule.RuleContext["sourceCode"],
  node: unknown,
  callback: AstNode,
): boolean {
  const target = unwrapExpression(node);
  if (target === null) {
    return false;
  }
  if (isFunctionNode(target)) {
    return true;
  }
  if (target.type !== "Identifier") {
    return false;
  }

  const variable = resolveVariable(sourceCode, target);
  if (variable === null) {
    return false;
  }
  const declaration = getDeclarationNode(variable);
  if (getImmutableFunction(variable) === null || declaration === null) {
    return false;
  }
  return isWithin(declaration, callback);
}

export default createRule({
  name: "no-ephemeral-dispose-listener-in-render-loop",
  type: "suggestion",
  description: "Disallow ephemeral Three.js dispose listeners in verified render-loop callbacks.",
  recommended: true,
  messages: {
    ephemeralDisposeListenerInLoop:
      "This dispose listener is recreated on every verified render-loop callback invocation; register one stable callback outside the repeated path.",
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
        const callback = getDirectHotCallback(call, hotCallbacks);
        if (callback === null) {
          return;
        }

        const callee = unwrapExpression(childNode(call, "callee"));
        if (
          callee === null ||
          callee.type !== "MemberExpression" ||
          getStaticPropertyName(callee) !== "addEventListener"
        ) {
          return;
        }

        // `removeEventListener` is the cure, not the fault, and a dynamic event
        // name leaves the dispose channel unproven.
        const args = getSpreadFreeArguments(call);
        if (args === null || args.length !== 2) {
          return;
        }
        const [eventName, listener] = args;
        if (
          eventName === undefined ||
          listener === undefined ||
          getStaticStringValue(unwrapExpression(eventName)) !== "dispose"
        ) {
          return;
        }

        const receiver = unwrapExpression(childNode(callee, "object"));
        if (receiver === null || receiver.type !== "Identifier") {
          return;
        }
        const variable = resolveVariable(sourceCode, receiver);
        if (variable === null || !isImmutableBinding(variable)) {
          return;
        }

        // The host must be constructed *outside* the callback. A resource created
        // inside it is discarded on each iteration, so its listener set never
        // grows and claiming accumulation would be wrong. `constructionVariable`
        // is the binding that holds the construction, never a later receiver
        // alias, so an outer host reached through one callback-local alias still
        // resolves to its outer construction site.
        const construction = getConstructionDetails(sourceCode, receiver);
        if (
          construction === null ||
          construction.constructionVariable === null ||
          isWithin(construction.newExpression, callback)
        ) {
          return;
        }
        const host = resolveImportedValue(
          sourceCode,
          childNode(construction.newExpression, "callee"),
        );
        if (host === null || !isDisposeEventHost(host.source, host.name)) {
          return;
        }

        if (!isEphemeralListener(sourceCode, listener, callback)) {
          return;
        }

        context.report({
          node: toReportNode(listener),
          messageId: "ephemeralDisposeListenerInLoop",
        });
      },
    };
  },
});
