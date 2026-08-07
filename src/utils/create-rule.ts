import type { Rule } from "eslint";

/** Base URL every rule's documentation link is built from. */
const DOCS_BASE_URL = "https://github.com/tjboudreaux/eslint-plugin-three/blob/main/docs/rules";

/** Everything a rule module must declare to be part of this plugin. */
export interface RuleSpec {
  /** File-stem rule name, used for both the rule ID and its docs URL. */
  readonly name: string;
  /**
   * `problem` for a correctness fault, `suggestion` for a performance or API
   * policy report.
   */
  readonly type: "problem" | "suggestion";
  /** One-sentence description, reused verbatim in the generated README table. */
  readonly description: string;
  /** Whether the rule is part of the `three/recommended` preset. */
  readonly recommended: boolean;
  /** Report messages, keyed by message ID. */
  readonly messages: Readonly<Record<string, string>>;
  /** True only for rules that actually offer editor suggestions. */
  readonly hasSuggestions?: boolean;
  /** Visitor factory, identical in shape to a plain ESLint rule's `create`. */
  readonly create: Rule.RuleModule["create"];
}

/**
 * Builds a rule module with this plugin's shared metadata contract.
 *
 * Every rule is optionless (`schema: []`) and non-autofixable: `fixable` is
 * never set, and `hasSuggestions` is set only where a rule genuinely reports
 * suggestions, so editors never advertise a fix that does not exist.
 */
export function createRule(spec: RuleSpec): Rule.RuleModule {
  const meta: Rule.RuleModule["meta"] = {
    type: spec.type,
    docs: {
      description: spec.description,
      url: `${DOCS_BASE_URL}/${spec.name}.md`,
      recommended: spec.recommended,
    },
    schema: [],
    messages: { ...spec.messages },
  };

  if (spec.hasSuggestions === true) {
    return { meta: { ...meta, hasSuggestions: true }, create: spec.create };
  }
  return { meta, create: spec.create };
}
