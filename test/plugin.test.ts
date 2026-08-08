import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import plugin from "../src/index.js";
import { rules, type RuleName } from "../src/rules/index.js";

/** Rule IDs in the exact order the registry must expose them. */
const EXPECTED_RULE_NAMES: readonly RuleName[] = [
  "no-bounds-recompute-in-render-loop",
  "no-deep-reactive-three-object",
  "no-direct-device-pixel-ratio",
  "no-ephemeral-dispose-listener-in-render-loop",
  "no-geometry-recompute-in-render-loop",
  "no-new-in-jsx-props",
  "no-non-numeric-vector-components",
  "no-pmrem-generation-in-render-loop",
  "no-replace-object3d-transform",
  "no-set-state-in-use-frame",
  "no-shader-recompile-in-render-loop",
  "no-synchronous-gpu-operation-in-render-loop",
  "no-three-allocating-call-in-render-loop",
  "no-three-allocation-in-render-loop",
  "no-three-loader-parse-in-render-loop",
  "no-transform-set-attribute-in-tick",
  "prefer-bvh-first-hit-only",
  "prefer-squared-vector-magnitude",
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
  it("exposes exactly the eighteen documented rules, sorted", () => {
    expect(Object.keys(rules)).toStrictEqual([...EXPECTED_RULE_NAMES]);
    expect(Object.keys(plugin.rules)).toStrictEqual([...EXPECTED_RULE_NAMES]);
  });

  it("reports the package name, version, and namespace", () => {
    expect(manifest).toMatchObject({ name: plugin.meta.name, version: plugin.meta.version });
    expect(plugin.meta.name).toBe("eslint-plugin-threejslint");
    expect(plugin.meta.namespace).toBe("three");
  });

  it("exposes only meta, rules, and configs", () => {
    expect(Object.keys(plugin).sort()).toStrictEqual(["configs", "meta", "rules"]);
  });
});

describe("rule metadata", () => {
  it.each(EXPECTED_RULE_NAMES)("%s declares a docs url matching its file name", (name) => {
    expect(rules[name].meta?.docs?.url).toBe(
      `https://github.com/tjboudreaux/three-js-lint/blob/main/docs/rules/${name}.md`,
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

  it("marks exactly the two correctness problems", () => {
    const problems = EXPECTED_RULE_NAMES.filter((name) => rules[name].meta?.type === "problem");
    expect(problems).toStrictEqual([
      "no-non-numeric-vector-components",
      "no-replace-object3d-transform",
    ]);
  });

  it("marks exactly the two suggestion-capable rules", () => {
    const suggesting = EXPECTED_RULE_NAMES.filter(
      (name) => rules[name].meta?.hasSuggestions === true,
    );
    expect(suggesting).toStrictEqual([...RULES_WITH_SUGGESTIONS]);
  });

  it.each([
    [
      "no-shader-recompile-in-render-loop",
      "Disallow shader or pipeline compilation work in verified render-loop callbacks.",
    ],
    [
      "no-ephemeral-dispose-listener-in-render-loop",
      "Disallow ephemeral Three.js dispose listeners in verified render-loop callbacks.",
    ],
    [
      "no-non-numeric-vector-components",
      "Disallow statically non-numeric values in Three.js vector components.",
    ],
    [
      "no-pmrem-generation-in-render-loop",
      "Disallow PMREM generation in verified render-loop callbacks.",
    ],
    [
      "no-synchronous-gpu-operation-in-render-loop",
      "Disallow synchronous GPU operations in verified render-loop callbacks.",
    ],
    [
      "no-three-allocating-call-in-render-loop",
      "Disallow allocation-returning Three.js method calls in verified render-loop callbacks.",
    ],
    [
      "no-three-loader-parse-in-render-loop",
      "Disallow synchronous Three.js loader parsing in verified render-loop callbacks.",
    ],
    [
      "no-bounds-recompute-in-render-loop",
      "Disallow full-scan Three.js bounds recomputation in verified render-loop callbacks.",
    ],
    [
      "no-geometry-recompute-in-render-loop",
      "Disallow full-scan Three.js geometry recomputation in verified render-loop callbacks.",
    ],
    [
      "prefer-squared-vector-magnitude",
      "Prefer squared Three.js vector magnitudes in zero comparisons.",
    ],
  ] as const)("%s declares its exact description", (name, description) => {
    expect(rules[name].meta?.docs?.description).toBe(description);
  });
});
