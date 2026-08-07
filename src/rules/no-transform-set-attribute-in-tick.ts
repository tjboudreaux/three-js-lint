import {
  childNode,
  childNodes,
  getEnclosingFunction,
  getStaticPropertyName,
  getStaticStringValue,
  toReportNode,
  unwrapExpression,
  type AstNode,
} from "../utils/ast.js";
import { createRule } from "../utils/create-rule.js";
import { collectAframeFrameMethods } from "../utils/hot-contexts.js";

/** `setAttribute` targets that route an Object3D transform through A-Frame. */
const TRANSFORM_ATTRIBUTES: Record<string, true> = {
  position: true,
  rotation: true,
  scale: true,
};

export default createRule({
  name: "no-transform-set-attribute-in-tick",
  type: "suggestion",
  description: "Disallow setAttribute transform updates in A-Frame tick callbacks.",
  recommended: false,
  messages: {
    transformSetAttributeInTick:
      'Calling this.el.setAttribute("{{attribute}}", ...) in tick/tock routes a transform update through A-Frame on a frame path; update object3D directly when units and semantics are equivalent.',
    visibilitySetAttributeInTick:
      'Calling this.el.setAttribute("visible", ...) in tick/tock routes visibility through A-Frame on a frame path; update object3D.visible directly when semantics are equivalent.',
  },
  create(context) {
    const { sourceCode } = context;
    const frameMethods = collectAframeFrameMethods(sourceCode);
    if (frameMethods.size === 0) {
      return {};
    }

    return {
      CallExpression(node) {
        const call: AstNode = node;
        // The call must sit in the frame method's own body: a nested callback runs
        // on a schedule this rule cannot see.
        const enclosing = getEnclosingFunction(call);
        if (enclosing === null || !frameMethods.has(enclosing)) {
          return;
        }

        const callee = unwrapExpression(childNode(call, "callee"));
        if (
          callee === null ||
          callee.type !== "MemberExpression" ||
          getStaticPropertyName(callee) !== "setAttribute"
        ) {
          return;
        }

        // Only the literal `this.el` receiver is recognized. An element alias may
        // point at another entity whose update path this rule has not proven.
        const receiver = unwrapExpression(childNode(callee, "object"));
        if (
          receiver === null ||
          receiver.type !== "MemberExpression" ||
          getStaticPropertyName(receiver) !== "el"
        ) {
          return;
        }
        const base = unwrapExpression(childNode(receiver, "object"));
        if (base === null || base.type !== "ThisExpression") {
          return;
        }

        const attribute = getStaticStringValue(unwrapExpression(childNodes(call, "arguments")[0]));
        if (attribute === null) {
          return;
        }

        if (attribute === "visible") {
          context.report({
            node: toReportNode(call),
            messageId: "visibilitySetAttributeInTick",
          });
          return;
        }
        if (TRANSFORM_ATTRIBUTES[attribute] !== true) {
          return;
        }
        context.report({
          node: toReportNode(call),
          messageId: "transformSetAttributeInTick",
          data: { attribute },
        });
      },
    };
  },
});
