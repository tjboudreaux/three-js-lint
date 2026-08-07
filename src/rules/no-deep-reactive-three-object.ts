import type { Rule, Scope } from "eslint";

import {
  childNode,
  childNodes,
  toReportNode,
  unwrapExpression,
  type AstNode,
} from "../utils/ast.js";
import { getNamedImport, resolveImportedValue } from "../utils/bindings.js";
import { createRule } from "../utils/create-rule.js";
import { isThreeSource } from "../utils/three-api.js";

/** Vue reactivity factories that deep-proxy their argument, keyed by export name. */
const DEEP_REACTIVE_FACTORIES: Record<
  string,
  "preferShallowRefForThreeInstance" | "avoidReactiveThreeInstance"
> = {
  ref: "preferShallowRefForThreeInstance",
  reactive: "avoidReactiveThreeInstance",
};

/**
 * Finds a local binding that already imports Vue's `shallowRef`.
 *
 * The suggestion never inserts an import, so a rewrite is only offered when the
 * file has an existing runtime `shallowRef` binding to reuse.
 */
function findShallowRefBinding(
  sourceCode: Rule.RuleContext["sourceCode"],
  node: AstNode,
): string | null {
  let scope: Scope.Scope | null = sourceCode.getScope(toReportNode(node));
  while (scope !== null) {
    for (const variable of scope.variables) {
      const imported = getNamedImport(variable);
      if (imported !== null && imported.source === "vue" && imported.name === "shallowRef") {
        return variable.name;
      }
    }
    scope = scope.upper;
  }
  return null;
}

/**
 * Resolves the replacement callee text for a `ref(...)` report.
 *
 * `Vue.ref(...)` becomes `Vue.shallowRef(...)` through the same namespace — the
 * caller has already proven the object is a runtime `vue` namespace import. A
 * named `ref` import becomes whatever local name already binds `shallowRef`.
 */
function resolveShallowRefCallee(
  sourceCode: Rule.RuleContext["sourceCode"],
  callee: AstNode,
): string | null {
  if (callee.type !== "MemberExpression") {
    return findShallowRefBinding(sourceCode, callee);
  }
  const namespace = unwrapExpression(childNode(callee, "object"));
  return namespace === null ? null : `${sourceCode.getText(toReportNode(namespace))}.shallowRef`;
}

export default createRule({
  name: "no-deep-reactive-three-object",
  type: "suggestion",
  description: "Disallow wrapping newly constructed Three.js objects in deep Vue reactivity.",
  recommended: true,
  hasSuggestions: true,
  messages: {
    preferShallowRefForThreeInstance:
      "Passing new {{constructor}} to Vue ref() creates deep reactivity; use shallowRef() or markRaw() when the Three.js instance should remain raw.",
    avoidReactiveThreeInstance:
      "Passing new {{constructor}} to Vue reactive() creates deep reactivity; use shallowReactive() or markRaw() when the Three.js instance should remain raw.",
    useExistingShallowRef: "Use the existing shallowRef binding.",
  },
  create(context) {
    const { sourceCode } = context;

    return {
      CallExpression(node) {
        const call: AstNode = node;
        const callee = unwrapExpression(childNode(call, "callee"));
        const factory = callee === null ? null : resolveImportedValue(sourceCode, callee);
        if (callee === null || factory === null || factory.source !== "vue") {
          return;
        }
        const messageId = DEEP_REACTIVE_FACTORIES[factory.name];
        if (messageId === undefined) {
          return;
        }

        // Only a direct construction is reported. An identifier, a nested object
        // graph, a `markRaw(...)` wrapper, and a loader result all leave the
        // wrapped value's identity unproven.
        const argument = unwrapExpression(childNodes(call, "arguments")[0]);
        if (argument === null || argument.type !== "NewExpression") {
          return;
        }
        const constructed = resolveImportedValue(sourceCode, childNode(argument, "callee"));
        if (constructed === null || !isThreeSource(constructed.source)) {
          return;
        }

        const data = { constructor: constructed.name };
        if (messageId === "avoidReactiveThreeInstance") {
          // Switching `reactive()` to `shallowRef()` would add `.value`, so no
          // mechanical rewrite is offered.
          context.report({ node: toReportNode(call), messageId, data });
          return;
        }

        const replacement = resolveShallowRefCallee(sourceCode, callee);
        context.report({
          node: toReportNode(call),
          messageId,
          data,
          suggest:
            replacement === null
              ? []
              : [
                  {
                    messageId: "useExistingShallowRef",
                    fix: (fixer) => fixer.replaceText(toReportNode(callee), replacement),
                  },
                ],
        });
      },
    };
  },
});
