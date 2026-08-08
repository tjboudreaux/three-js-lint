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
  resolveScopedImportedValue,
  resolveVariable,
} from "../utils/bindings.js";
import { createRule } from "../utils/create-rule.js";
import { collectHotCallbacks, getDirectHotCallback } from "../utils/hot-contexts.js";
import { getSyncParseLoaderMinArgs } from "../utils/three-api.js";

export default createRule({
  name: "no-three-loader-parse-in-render-loop",
  type: "suggestion",
  description: "Disallow synchronous Three.js loader parsing in verified render-loop callbacks.",
  recommended: true,
  messages: {
    loaderParseInLoop:
      "Calling {{loader}}.parse() inside this verified render-loop callback performs synchronous asset parsing; parse outside the repeated path.",
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

        // `parseAsync`, `load`, and `loadAsync` all hand their work to a callback
        // or a promise, so none of them blocks the frame the way `parse` does.
        const callee = unwrapExpression(childNode(call, "callee"));
        if (
          callee === null ||
          callee.type !== "MemberExpression" ||
          getStaticPropertyName(callee) !== "parse"
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
        const construction = getConstructionDetails(sourceCode, receiver);
        if (construction === null) {
          return;
        }

        // The predicate is the only place a specifier outside this plugin's closed
        // source list is admitted, and it stays exact: a core module, the
        // `three/addons` barrel, or one of the two official loader path prefixes
        // whose file stem matches the imported class.
        const loader = resolveScopedImportedValue(
          sourceCode,
          childNode(construction.newExpression, "callee"),
          (source, name) => getSyncParseLoaderMinArgs(source, name) !== null,
        );
        if (loader === null) {
          return;
        }
        const minArgs = getSyncParseLoaderMinArgs(loader.source, loader.name);
        const args = getSpreadFreeArguments(call);
        if (minArgs === null || args === null || args.length < minArgs) {
          return;
        }

        context.report({
          node: toReportNode(call),
          messageId: "loaderParseInLoop",
          data: { loader: sourceCode.getText(toReportNode(receiver)) },
        });
      },
    };
  },
});
