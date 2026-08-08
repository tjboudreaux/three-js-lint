import {
  childNode,
  getSpreadFreeArguments,
  getStaticPropertyName,
  toReportNode,
  unwrapExpression,
  type AstNode,
} from "../utils/ast.js";
import {
  getConstructionDetails,
  isImmutableBinding,
  resolveConstructorImport,
  resolveImportedValue,
  resolveVariable,
} from "../utils/bindings.js";
import { createRule } from "../utils/create-rule.js";
import { collectHotCallbacks, getDirectHotCallback } from "../utils/hot-contexts.js";
import {
  getPmremGenerationMethod,
  PMREM_GENERATOR_CONSTRUCTOR,
  RENDERER_CONSTRUCTORS,
} from "../utils/three-api.js";

export default createRule({
  name: "no-pmrem-generation-in-render-loop",
  type: "suggestion",
  description: "Disallow PMREM generation in verified render-loop callbacks.",
  recommended: true,
  messages: {
    pmremGenerationInLoop:
      "Calling {{generator}}.{{method}}() inside this verified render-loop callback regenerates an environment-map prefilter; cache the result outside the repeated path.",
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
        const receiver = unwrapExpression(childNode(callee, "object"));
        if (method === null || receiver === null || receiver.type !== "Identifier") {
          return;
        }
        const variable = resolveVariable(sourceCode, receiver);
        if (variable === null || !isImmutableBinding(variable)) {
          return;
        }

        const construction = getConstructionDetails(sourceCode, receiver);
        if (construction === null) {
          return;
        }
        const generator = resolveImportedValue(
          sourceCode,
          childNode(construction.newExpression, "callee"),
        );
        if (generator === null || generator.name !== PMREM_GENERATOR_CONSTRUCTOR) {
          return;
        }

        // The generator's first argument decides which renderer backend runs the
        // prefilter chain, and it must come from the generator's own module: a
        // `three` generator driven by a `three/webgpu` renderer is not a shape
        // either module defines, so nothing is proven.
        const constructorArgs = getSpreadFreeArguments(construction.newExpression);
        const rendererArgument = constructorArgs?.[0];
        const renderer =
          rendererArgument === undefined
            ? null
            : resolveConstructorImport(sourceCode, rendererArgument);
        if (
          renderer === null ||
          renderer.source !== generator.source ||
          RENDERER_CONSTRUCTORS[renderer.source] !== renderer.name
        ) {
          return;
        }

        // `compileCubemapShader`, `compileEquirectangularShader`, and `dispose`
        // are not generation calls, and the deprecated `...Async` names exist only
        // on the WebGPU generator.
        const arity = getPmremGenerationMethod(generator.source, method);
        const args = getSpreadFreeArguments(call);
        if (
          arity === null ||
          args === null ||
          args.length < arity.minArgs ||
          args.length > arity.maxArgs
        ) {
          return;
        }

        context.report({
          node: toReportNode(call),
          messageId: "pmremGenerationInLoop",
          data: { generator: sourceCode.getText(toReportNode(receiver)), method },
        });
      },
    };
  },
});
