import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import plugin from "../src/index.js";
import { rules, type RuleName } from "../src/rules/index.js";

/** Rule IDs in the exact order the registry must expose them. */
const EXPECTED_RULE_NAMES: readonly RuleName[] = [
  "no-deep-reactive-three-object",
  "no-direct-device-pixel-ratio",
  "no-new-in-jsx-props",
  "no-replace-object3d-transform",
  "no-set-state-in-use-frame",
  "no-shader-recompile-in-render-loop",
  "no-three-allocation-in-render-loop",
  "no-transform-set-attribute-in-tick",
  "prefer-bvh-first-hit-only",
];

/** Rules that genuinely offer editor suggestions. */
const RULES_WITH_SUGGESTIONS: readonly RuleName[] = [
  "no-deep-reactive-three-object",
  "no-replace-object3d-transform",
];

const manifest: unknown = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);

describe("plugin metadata", () => {
  it("exposes exactly the nine documented rules, sorted", () => {
    expect(Object.keys(rules)).toStrictEqual([...EXPECTED_RULE_NAMES]);
    expect(Object.keys(plugin.rules)).toStrictEqual([...EXPECTED_RULE_NAMES]);
  });

  it("reports the package name, version, and namespace", () => {
    expect(manifest).toMatchObject({ name: plugin.meta.name, version: plugin.meta.version });
    expect(plugin.meta.name).toBe("eslint-plugin-three");
    expect(plugin.meta.namespace).toBe("three");
  });

  it("exposes only meta, rules, and configs", () => {
    expect(Object.keys(plugin).sort()).toStrictEqual(["configs", "meta", "rules"]);
  });
});

describe("rule metadata", () => {
  it.each(EXPECTED_RULE_NAMES)("%s declares a docs url matching its file name", (name) => {
    expect(rules[name].meta?.docs?.url).toBe(
      `https://github.com/tjboudreaux/eslint-plugin-three/blob/main/docs/rules/${name}.md`,
    );
  });

  it.each(EXPECTED_RULE_NAMES)("%s is optionless and never autofixable", (name) => {
    const meta = rules[name].meta;
    expect(meta?.schema).toStrictEqual([]);
    expect(meta?.fixable).toBeUndefined();
  });

  it.each(EXPECTED_RULE_NAMES)("%s declares a non-empty description", (name) => {
    const description = rules[name].meta?.docs?.description;
    expect(typeof description).toBe("string");
    expect(description).toMatch(/\.$/);
  });

  it.each(EXPECTED_RULE_NAMES)("%s declares at least one message", (name) => {
    const messages = rules[name].meta?.messages ?? {};
    expect(Object.keys(messages).length).toBeGreaterThan(0);
    for (const message of Object.values(messages)) {
      expect(typeof message).toBe("string");
      expect(message.length).toBeGreaterThan(0);
    }
  });

  it.each(EXPECTED_RULE_NAMES)("%s declares hasSuggestions only when it suggests", (name) => {
    const expected = RULES_WITH_SUGGESTIONS.includes(name) ? true : undefined;
    expect(rules[name].meta?.hasSuggestions).toBe(expected);
  });

  it.each(EXPECTED_RULE_NAMES)("%s uses a supported rule type", (name) => {
    const type = rules[name].meta?.type;
    expect(type === "problem" || type === "suggestion").toBe(true);
  });

  it("marks only the transform-identity rule as a correctness problem", () => {
    const problems = EXPECTED_RULE_NAMES.filter((name) => rules[name].meta?.type === "problem");
    expect(problems).toStrictEqual(["no-replace-object3d-transform"]);
  });
});
