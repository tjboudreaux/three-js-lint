import type { Rule } from "eslint";

import { childNode, toReportNode, unwrapExpression, type AstNode } from "../utils/ast.js";
import {
  getArrayDestructuredBinding,
  getImmutableInitializer,
  isImmutableBinding,
  resolveImportedValue,
  resolveVariable,
} from "../utils/bindings.js";
import { createRule } from "../utils/create-rule.js";
import { collectHotCallbacks, getDirectHotCallback } from "../utils/hot-contexts.js";

/** React hooks that return a `[value, updater]` tuple, keyed by hook name. */
const REACT_TUPLE_HOOKS: Record<string, "stateSetterInUseFrame" | "reducerDispatchInUseFrame"> = {
  useState: "stateSetterInUseFrame",
  useReducer: "reducerDispatchInUseFrame",
};

/**
 * Resolves the React updater a callee names, if any.
 *
 * Accepts the second element of an array pattern destructured from a runtime
 * React `useState` or `useReducer` call, plus one immutable alias of that
 * binding. Custom hooks, props, external stores, and class `setState` are
 * intentionally unresolved: only React's own tuple updaters are provable.
 */
function resolveReactUpdater(
  sourceCode: Rule.RuleContext["sourceCode"],
  node: AstNode,
  allowAliasHop = true,
): "stateSetterInUseFrame" | "reducerDispatchInUseFrame" | null {
  if (node.type !== "Identifier") {
    return null;
  }
  const variable = resolveVariable(sourceCode, node);
  if (variable === null || !isImmutableBinding(variable)) {
    return null;
  }

  const destructured = getArrayDestructuredBinding(variable);
  if (destructured !== null) {
    if (destructured.index !== 1 || destructured.initializer.type !== "CallExpression") {
      return null;
    }
    const hook = resolveImportedValue(sourceCode, childNode(destructured.initializer, "callee"));
    if (hook === null || hook.source !== "react") {
      return null;
    }
    return REACT_TUPLE_HOOKS[hook.name] ?? null;
  }

  if (!allowAliasHop) {
    return null;
  }
  const initializer = getImmutableInitializer(variable);
  if (initializer === null) {
    return null;
  }
  return resolveReactUpdater(sourceCode, initializer, false);
}

export default createRule({
  name: "no-set-state-in-use-frame",
  type: "suggestion",
  description: "Disallow React state updates in React Three Fiber useFrame callbacks.",
  recommended: true,
  messages: {
    stateSetterInUseFrame:
      "Calling React state setter {{name}} inside useFrame schedules React work from the frame loop; mutate a ref or Three.js object instead.",
    reducerDispatchInUseFrame:
      "Calling React reducer dispatch {{name}} inside useFrame schedules React work from the frame loop; mutate a ref or Three.js object instead.",
  },
  create(context) {
    const { sourceCode } = context;
    const useFrameCallbacks = new Map(
      [...collectHotCallbacks(sourceCode, { includeUseFrame: true })].filter(
        ([, kind]) => kind === "useFrame",
      ),
    );
    if (useFrameCallbacks.size === 0) {
      return {};
    }

    return {
      CallExpression(node) {
        const call: AstNode = node;
        if (getDirectHotCallback(call, useFrameCallbacks) === null) {
          return;
        }
        // Only a bare identifier call is inspected, so `this.setState(...)` and
        // `store.set(...)` never match, and a setter that is merely passed
        // somewhere is not a call at all.
        const callee = unwrapExpression(childNode(call, "callee"));
        if (callee === null) {
          return;
        }
        const messageId = resolveReactUpdater(sourceCode, callee);
        if (messageId === null) {
          return;
        }

        context.report({
          node: toReportNode(call),
          messageId,
          data: { name: sourceCode.getText(toReportNode(callee)) },
        });
      },
    };
  },
});
