import {
  childNode,
  nodeField,
  parentOf,
  toReportNode,
  unwrapExpression,
  type AstNode,
} from "../utils/ast.js";
import { hasRuntimeImport, resolveImportedValue } from "../utils/bindings.js";
import { createRule } from "../utils/create-rule.js";
import { isThreeSource, R3F_HOST_TAGS, R3F_TRANSFORM_PROPS } from "../utils/three-api.js";

/**
 * Reads a plain JSX name.
 *
 * `JSXMemberExpression` (`Scene.Mesh`) and `JSXNamespacedName` (`svg:rect`) are
 * deliberately unresolved: neither is an R3F intrinsic host.
 */
function getJsxName(node: AstNode | null): string | null {
  if (node === null || node.type !== "JSXIdentifier") {
    return null;
  }
  const name = nodeField(node, "name");
  return typeof name === "string" ? name : null;
}

export default createRule({
  name: "no-new-in-jsx-props",
  type: "suggestion",
  description: "Disallow new Three.js transform objects in React Three Fiber JSX props.",
  recommended: false,
  messages: {
    newThreeObjectInJsxProp:
      "Creating {{constructor}} inline for the {{property}} prop gives this R3F host a new object on each React render; pass a stable value.",
  },
  create(context) {
    const { sourceCode } = context;
    // Without an R3F import in the file, a lowercase `mesh` element is just an
    // unknown host tag and carries none of R3F's reconciler semantics.
    if (!hasRuntimeImport(sourceCode, "@react-three/fiber")) {
      return {};
    }

    return {
      JSXAttribute(node: AstNode) {
        const property = getJsxName(childNode(node, "name"));
        if (property === null) {
          return;
        }
        const expectedClass = R3F_TRANSFORM_PROPS[property];
        if (expectedClass === undefined) {
          return;
        }

        // The whole prop value must be the construction. A nested expression such
        // as `position={cond ? a : new Vector3()}` is not reported, because the
        // per-render cost depends on the branch taken.
        const container = childNode(node, "value");
        if (container === null || container.type !== "JSXExpressionContainer") {
          return;
        }
        const expression = unwrapExpression(childNode(container, "expression"));
        if (expression === null || expression.type !== "NewExpression") {
          return;
        }
        const constructed = resolveImportedValue(sourceCode, childNode(expression, "callee"));
        if (
          constructed === null ||
          !isThreeSource(constructed.source) ||
          constructed.name !== expectedClass
        ) {
          return;
        }

        // Only a lowercase intrinsic tag from the known host list is an R3F host.
        // Custom components, member tags, namespaced tags, DOM elements, and
        // `primitive` own their own prop semantics.
        const opening = parentOf(node);
        const tag = opening === null ? null : getJsxName(childNode(opening, "name"));
        if (tag === null || R3F_HOST_TAGS[tag] !== true) {
          return;
        }

        context.report({
          node: toReportNode(node),
          messageId: "newThreeObjectInJsxProp",
          data: { constructor: constructed.name, property },
        });
      },
    };
  },
});
