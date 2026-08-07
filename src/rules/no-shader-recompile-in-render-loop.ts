import {
  childNode,
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
import { isThreeSource, MATERIAL_CONSTRUCTORS } from "../utils/three-api.js";

export default createRule({
  name: "no-shader-recompile-in-render-loop",
  type: "suggestion",
  description:
    "Disallow requesting material shader recompilation in verified render-loop callbacks.",
  recommended: true,
  messages: {
    materialNeedsUpdateInLoop:
      "Setting {{material}}.needsUpdate to true inside this verified render-loop callback requests shader program work; move invalidation outside the repeated path.",
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
        if (
          constructed === null ||
          !isThreeSource(constructed.source) ||
          MATERIAL_CONSTRUCTORS[constructed.name] !== true
        ) {
          return;
        }

        context.report({
          node: toReportNode(assignment),
          messageId: "materialNeedsUpdateInLoop",
          data: { material: sourceCode.getText(toReportNode(owner)) },
        });
      },
    };
  },
});
