import type { Rule } from "eslint";

import {
  childNode,
  getSpreadFreeArguments,
  getStaticNumberValue,
  getStaticPropertyName,
  isFunctionNode,
  nodeField,
  toReportNode,
  unwrapExpression,
  type AstNode,
} from "../utils/ast.js";
import {
  isImmutableBinding,
  resolveConstructorImport,
  resolveGlobalReference,
  resolveImportedValue,
  resolveVariable,
} from "../utils/bindings.js";
import { createRule } from "../utils/create-rule.js";
import {
  getVectorLayout,
  isThreeSource,
  VECTOR_COMPONENT_SETTERS,
  type VectorLayout,
} from "../utils/three-api.js";

/** Unary operators whose result is a boolean regardless of their operand. */
const BOOLEAN_UNARY_OPERATORS: Record<string, true> = {
  "!": true,
  delete: true,
};

/** Unary operators that preserve a bigint operand's type. */
const BIGINT_PRESERVING_OPERATORS: Record<string, true> = {
  "-": true,
  "~": true,
};

/** True when a `Literal` node is a bigint literal such as `1n`. */
function isBigIntLiteral(node: AstNode): boolean {
  return node.type === "Literal" && nodeField(node, "bigint") !== undefined;
}

/**
 * Names the kind of a statically non-numeric value, or returns `null` when the
 * value is numeric or cannot be read from syntax.
 *
 * Numbers, numeric unary expressions, `NaN`, `Infinity`, identifiers, calls, and
 * member accesses all return `null`: Three.js stores whatever it is handed, and a
 * value this plugin cannot read is not evidence of a fault.
 */
function describeNonNumericValue(
  sourceCode: Rule.RuleContext["sourceCode"],
  node: unknown,
): string | null {
  const target = unwrapExpression(node);
  if (target === null) {
    return null;
  }

  switch (target.type) {
    case "TemplateLiteral":
      return "a string";
    case "ArrayExpression":
      return "an array";
    case "ObjectExpression":
    case "NewExpression":
      return "an object";
    case "ClassExpression":
      return "a class";
    case "Literal": {
      if (nodeField(target, "regex") !== undefined) {
        return "a regular expression";
      }
      if (isBigIntLiteral(target)) {
        return "a bigint";
      }
      const value = nodeField(target, "value");
      if (typeof value === "string") {
        return "a string";
      }
      if (typeof value === "boolean") {
        return "a boolean";
      }
      return value === null ? "null" : null;
    }
    case "UnaryExpression": {
      const operator = nodeField(target, "operator");
      if (typeof operator !== "string") {
        return null;
      }
      if (BOOLEAN_UNARY_OPERATORS[operator] === true) {
        return "a boolean";
      }
      if (operator === "typeof") {
        return "a string";
      }
      if (operator === "void") {
        return "undefined";
      }
      // A leading `+` on a bigint throws before any assignment happens, so the
      // component is never written and there is nothing to report.
      if (BIGINT_PRESERVING_OPERATORS[operator] !== true) {
        return null;
      }
      const inner = unwrapExpression(childNode(target, "argument"));
      return inner !== null && isBigIntLiteral(inner) ? "a bigint" : null;
    }
    case "Identifier": {
      const global = resolveGlobalReference(sourceCode, target);
      return global !== null && global.name === "undefined" ? "undefined" : null;
    }
    default:
      return isFunctionNode(target) ? "a function" : null;
  }
}

/** Names one vector component for a report, e.g. `component z`. */
function componentLabel(component: string): string {
  return `component ${component}`;
}

/** Names an aliased vector component, e.g. `component z (width)`. */
function aliasLabel(component: string, alias: string): string {
  return `component ${component} (${alias})`;
}

/**
 * Resolves the Three.js vector class an immutable binding was constructed from.
 *
 * A mutable binding, a second alias hop, a parameter, a call result, and a
 * same-named import from any other module all stay unresolved.
 */
function resolveVectorReceiver(
  sourceCode: Rule.RuleContext["sourceCode"],
  receiver: AstNode,
): { readonly className: string; readonly layout: VectorLayout } | null {
  if (receiver.type !== "Identifier") {
    return null;
  }
  const variable = resolveVariable(sourceCode, receiver);
  if (variable === null || !isImmutableBinding(variable)) {
    return null;
  }
  const constructed = resolveConstructorImport(sourceCode, receiver);
  if (constructed === null || !isThreeSource(constructed.source)) {
    return null;
  }
  const layout = getVectorLayout(constructed.name);
  return layout === null ? null : { className: constructed.name, layout };
}

export default createRule({
  name: "no-non-numeric-vector-components",
  type: "problem",
  description: "Disallow statically non-numeric values in Three.js vector components.",
  recommended: true,
  messages: {
    nonNumericVectorComponent:
      "{{className}} receives {{valueType}} for {{component}}; Three.js vector components must be numbers and are stored without validation.",
  },
  create(context) {
    const { sourceCode } = context;

    /** Reports one offending value against a named component slot. */
    const reportValue = (value: AstNode, className: string, component: string): void => {
      const valueType = describeNonNumericValue(sourceCode, value);
      if (valueType === null) {
        return;
      }
      context.report({
        node: toReportNode(value),
        messageId: "nonNumericVectorComponent",
        data: { className, valueType, component },
      });
    };

    return {
      NewExpression(node) {
        const expression: AstNode = node;
        const constructed = resolveImportedValue(sourceCode, childNode(expression, "callee"));
        if (constructed === null || !isThreeSource(constructed.source)) {
          return;
        }
        const layout = getVectorLayout(constructed.name);
        if (layout === null) {
          return;
        }

        // Extra arguments are ignored by the constructor, so only the declared
        // component slots are inspected.
        const args = getSpreadFreeArguments(expression);
        if (args === null) {
          return;
        }
        layout.components.forEach((component, index) => {
          const value = args[index];
          if (value !== undefined) {
            reportValue(value, constructed.name, componentLabel(component));
          }
        });
      },

      CallExpression(node) {
        const call: AstNode = node;
        const callee = unwrapExpression(childNode(call, "callee"));
        if (callee === null || callee.type !== "MemberExpression") {
          return;
        }
        const method = getStaticPropertyName(callee);
        const receiver = unwrapExpression(childNode(callee, "object"));
        if (method === null || receiver === null) {
          return;
        }
        const resolved = resolveVectorReceiver(sourceCode, receiver);
        const args = getSpreadFreeArguments(call);
        if (resolved === null || args === null) {
          return;
        }
        const { className, layout } = resolved;

        if (method === "set") {
          if (args.length !== layout.components.length) {
            return;
          }
          layout.components.forEach((component, index) => {
            const value = args[index];
            if (value !== undefined) {
              reportValue(value, className, componentLabel(component));
            }
          });
          return;
        }

        if (method === "setScalar") {
          const value = args.length === 1 ? args[0] : undefined;
          if (value !== undefined) {
            reportValue(value, className, "all components");
          }
          return;
        }

        const setterComponent = VECTOR_COMPONENT_SETTERS[method];
        if (setterComponent !== undefined) {
          // `setZ` does not exist on `Vector2`, and `setW` only on `Vector4`.
          if (args.length !== 1 || !layout.components.includes(setterComponent)) {
            return;
          }
          const value = args[0];
          if (value !== undefined) {
            reportValue(value, className, componentLabel(setterComponent));
          }
          return;
        }

        if (method !== "setComponent" || args.length !== 2) {
          return;
        }
        const [index, value] = args;
        if (index === undefined || value === undefined) {
          return;
        }
        const position = getStaticNumberValue(index);
        const component = position === null ? undefined : layout.components[position];
        if (component !== undefined) {
          reportValue(value, className, componentLabel(component));
        }
      },

      AssignmentExpression(node) {
        const assignment: AstNode = node;
        // A compound or update assignment reads the stored number first, so its
        // result is arithmetic rather than a raw non-numeric write.
        if (nodeField(assignment, "operator") !== "=") {
          return;
        }
        const target = unwrapExpression(childNode(assignment, "left"));
        if (target === null || target.type !== "MemberExpression") {
          return;
        }
        const property = getStaticPropertyName(target);
        const receiver = unwrapExpression(childNode(target, "object"));
        if (property === null || receiver === null) {
          return;
        }
        const resolved = resolveVectorReceiver(sourceCode, receiver);
        const value = childNode(assignment, "right");
        if (resolved === null || value === null) {
          return;
        }

        const { className, layout } = resolved;
        if (layout.components.includes(property)) {
          reportValue(value, className, componentLabel(property));
          return;
        }
        const aliased = layout.aliases[property];
        if (aliased !== undefined) {
          reportValue(value, className, aliasLabel(aliased, property));
        }
      },
    };
  },
});
