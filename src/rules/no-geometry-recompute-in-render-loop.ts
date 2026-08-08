import {
  childNode,
  getSpreadFreeArguments,
  getStaticPropertyName,
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
import { collectHotCallbacks, getDirectHotCallback } from "../utils/hot-contexts.js";
import {
  GEOMETRY_CONSTRUCTORS,
  GEOMETRY_RECOMPUTE_METHODS,
  isThreeSource,
} from "../utils/three-api.js";

export default createRule({
  name: "no-geometry-recompute-in-render-loop",
  type: "suggestion",
  description:
    "Disallow full-scan Three.js geometry recomputation in verified render-loop callbacks.",
  recommended: false,
  messages: {
    geometryRecomputeInLoop:
      "Calling {{geometry}}.{{method}}() inside this verified render-loop callback rescans geometry data; recompute only when the geometry changes.",
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
        if (method === null || GEOMETRY_RECOMPUTE_METHODS[method] !== true) {
          return;
        }

        // Every cataloged method takes no arguments, so any argument means the
        // call is not the one Three.js defines.
        const args = getSpreadFreeArguments(call);
        if (args === null || args.length !== 0) {
          return;
        }

        // Only an imported concrete geometry class counts. A loader result, a
        // helper's `.geometry`, a local subclass, and a user class whose name
        // merely ends in `Geometry` all stay unresolved.
        const receiver = unwrapExpression(childNode(callee, "object"));
        if (receiver === null || receiver.type !== "Identifier") {
          return;
        }
        const variable = resolveVariable(sourceCode, receiver);
        if (variable === null || !isImmutableBinding(variable)) {
          return;
        }
        const constructed = resolveConstructorImport(sourceCode, receiver);
        if (
          constructed === null ||
          !isThreeSource(constructed.source) ||
          GEOMETRY_CONSTRUCTORS[constructed.name] !== true
        ) {
          return;
        }

        context.report({
          node: toReportNode(call),
          messageId: "geometryRecomputeInLoop",
          data: { geometry: sourceCode.getText(toReportNode(receiver)), method },
        });
      },
    };
  },
});
