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
  isImmutableBinding,
  resolveConstructorImport,
  resolveVariable,
} from "../utils/bindings.js";
import { createRule } from "../utils/create-rule.js";
import { collectHotCallbacks, getDirectHotCallback } from "../utils/hot-contexts.js";
import {
  isMaterialConstructor,
  RENDERER_COMPILE_MAX_ARGS,
  RENDERER_COMPILE_METHODS,
  RENDERER_COMPILE_MIN_ARGS,
  RENDERER_CONSTRUCTORS,
} from "../utils/three-api.js";

export default createRule({
  name: "no-shader-recompile-in-render-loop",
  type: "suggestion",
  description: "Disallow shader or pipeline compilation work in verified render-loop callbacks.",
  recommended: true,
  messages: {
    materialNeedsUpdateInLoop:
      "Setting {{material}}.needsUpdate to true inside this verified render-loop callback requests shader program work; move invalidation outside the repeated path.",
    rendererCompileInLoop:
      "Calling {{renderer}}.{{method}}() inside this verified render-loop callback traverses the scene and compiles shader or pipeline state; precompile outside the repeated path.",
  },
  create(context) {
    const { sourceCode } = context;
    const hotCallbacks = collectHotCallbacks(sourceCode, { includeUseFrame: true });
    if (hotCallbacks.size === 0) {
      return {};
    }

    return {
      AssignmentExpression(node) {
        const assignment: AstNode = node;
        if (nodeField(assignment, "operator") !== "=") {
          return;
        }
        if (getDirectHotCallback(assignment, hotCallbacks) === null) {
          return;
        }

        const target = unwrapExpression(childNode(assignment, "left"));
        if (
          target === null ||
          target.type !== "MemberExpression" ||
          getStaticPropertyName(target) !== "needsUpdate"
        ) {
          return;
        }

        // Only the literal `true` is reported. `false`, a variable, and any
        // computed value leave the recompilation request unproven.
        const value = unwrapExpression(childNode(assignment, "right"));
        if (value === null || value.type !== "Literal" || nodeField(value, "value") !== true) {
          return;
        }

        const owner = unwrapExpression(childNode(target, "object"));
        if (owner === null || owner.type !== "Identifier") {
          return;
        }
        const variable = resolveVariable(sourceCode, owner);
        if (variable === null || !isImmutableBinding(variable)) {
          return;
        }
        const constructed = resolveConstructorImport(sourceCode, owner);
        if (constructed === null || !isMaterialConstructor(constructed.source, constructed.name)) {
          return;
        }

        context.report({
          node: toReportNode(assignment),
          messageId: "materialNeedsUpdateInLoop",
          data: { material: sourceCode.getText(toReportNode(owner)) },
        });
      },

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
        if (method === null || RENDERER_COMPILE_METHODS[method] !== true) {
          return;
        }

        // `compile` and `compileAsync` take a scene, a camera, and an optional
        // target scene in both renderers. A four-argument call is not a call
        // either renderer defines, and a spread hides its own expansion.
        const args = childNodes(call, "arguments");
        if (
          args.length < RENDERER_COMPILE_MIN_ARGS ||
          args.length > RENDERER_COMPILE_MAX_ARGS ||
          args.some((argument) => argument.type === "SpreadElement")
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

        context.report({
          node: toReportNode(call),
          messageId: "rendererCompileInLoop",
          data: { renderer: sourceCode.getText(toReportNode(receiver)), method },
        });
      },
    };
  },
});
