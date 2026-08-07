import {
  childNode,
  getStaticPropertyName,
  toReportNode,
  unwrapExpression,
  type AstNode,
} from "../utils/ast.js";
import {
  isImmutableBinding,
  resolveConstructorImport,
  resolveImportedValue,
  resolveVariable,
} from "../utils/bindings.js";
import { createRule } from "../utils/create-rule.js";
import { collectHotCallbacks, getDirectHotCallback } from "../utils/hot-contexts.js";
import { isThreeSource } from "../utils/three-api.js";

export default createRule({
  name: "no-three-allocation-in-render-loop",
  type: "suggestion",
  description: "Disallow allocating Three.js objects in verified render-loop callbacks.",
  recommended: true,
  messages: {
    newThreeObjectInLoop:
      "Constructing {{constructor}} inside this verified render-loop callback can allocate per frame; reuse a stable instance.",
    cloneThreeObjectInLoop:
      "Cloning this {{constructor}} inside this verified render-loop callback can allocate per frame; reuse a stable instance.",
  },
  create(context) {
    const { sourceCode } = context;
    // React Three Fiber `useFrame` is excluded: `@react-three/eslint-plugin`
    // already reports allocation there, and duplicate diagnostics are worse
    // than a single owner.
    const hotCallbacks = collectHotCallbacks(sourceCode, { includeUseFrame: false });
    if (hotCallbacks.size === 0) {
      return {};
    }

    return {
      NewExpression(node) {
        const expression: AstNode = node;
        if (getDirectHotCallback(expression, hotCallbacks) === null) {
          return;
        }
        const constructed = resolveImportedValue(sourceCode, childNode(expression, "callee"));
        if (constructed === null || !isThreeSource(constructed.source)) {
          return;
        }
        context.report({
          node: toReportNode(expression),
          messageId: "newThreeObjectInLoop",
          data: { constructor: constructed.name },
        });
      },

      CallExpression(node) {
        const call: AstNode = node;
        if (getDirectHotCallback(call, hotCallbacks) === null) {
          return;
        }
        const callee = unwrapExpression(childNode(call, "callee"));
        if (
          callee === null ||
          callee.type !== "MemberExpression" ||
          getStaticPropertyName(callee) !== "clone"
        ) {
          return;
        }

        // Only a named binding is inspected. `new Vector3().clone()` therefore
        // yields exactly one report, for the construction, and an unresolved
        // receiver such as a parameter or property yields none.
        const receiver = unwrapExpression(childNode(callee, "object"));
        if (receiver === null || receiver.type !== "Identifier") {
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
        context.report({
          node: toReportNode(call),
          messageId: "cloneThreeObjectInLoop",
          data: { constructor: constructed.name },
        });
      },
    };
  },
});
