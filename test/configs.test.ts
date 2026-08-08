import { describe, expect, it } from "vitest";

import plugin from "../src/index.js";
import { rules, type RuleName } from "../src/rules/index.js";
import { defineConfig, ESLintApi } from "./helpers/rule-tester.js";

/** Rules `three/recommended` must enable, in registry order. */
const EXPECTED_RECOMMENDED: readonly string[] = [
  "three/no-deep-reactive-three-object",
  "three/no-direct-device-pixel-ratio",
  "three/no-ephemeral-dispose-listener-in-render-loop",
  "three/no-non-numeric-vector-components",
  "three/no-pmrem-generation-in-render-loop",
  "three/no-replace-object3d-transform",
  "three/no-set-state-in-use-frame",
  "three/no-shader-recompile-in-render-loop",
  "three/no-synchronous-gpu-operation-in-render-loop",
  "three/no-three-allocating-call-in-render-loop",
  "three/no-three-allocation-in-render-loop",
  "three/no-three-loader-parse-in-render-loop",
];

/** A file that violates a recommended rule. */
const INVALID_RECOMMENDED_SAMPLE = `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
renderer.setPixelRatio(window.devicePixelRatio);
`;

/** A file that bounds its pixel ratio and violates nothing. */
const VALID_SAMPLE = `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
`;

/** A file that only violates an `all`-only rule. */
const ALL_ONLY_SAMPLE = `AFRAME.registerComponent("mover", {
  tick() {
    this.el.setAttribute("position", { x: 0, y: 1, z: 0 });
  },
});
`;

/** Rule IDs `three/all` enables that `three/recommended` deliberately leaves off. */
const EXPECTED_ALL_ONLY: readonly string[] = [
  "three/no-bounds-recompute-in-render-loop",
  "three/no-geometry-recompute-in-render-loop",
  "three/no-new-in-jsx-props",
  "three/no-transform-set-attribute-in-tick",
  "three/prefer-bvh-first-hit-only",
  "three/prefer-squared-vector-magnitude",
];

/** A file that violates one of the newly recommended rules. */
const NEW_RECOMMENDED_SAMPLE = `import { Vector3 } from "three";
const scratch = new Vector3();
requestAnimationFrame(() => {
  scratch.toArray();
});
`;

/** A file that only violates one of the new `all`-only rules. */
const NEW_ALL_ONLY_SAMPLE = `import { Vector3 } from "three";
const scratch = new Vector3();
export const isZero = scratch.length() === 0;
`;

/**
 * Lints one in-memory file with an explicit flat config.
 *
 * `overrideConfigFile: true` keeps the workspace's own `eslint.config.js` out of
 * the result, so these assertions only exercise the preset under test.
 */
async function lint(
  preset: readonly unknown[],
  code: string,
  extra: Record<string, unknown> = {},
): Promise<readonly string[]> {
  const eslint = new ESLintApi({
    overrideConfigFile: true,
    overrideConfig: [
      ...(preset as never[]),
      { languageOptions: { ecmaVersion: "latest", sourceType: "module" }, ...extra },
    ],
  });
  const [result] = await eslint.lintText(code, { filePath: "sample.js" });
  return (result?.messages ?? []).map((message) => message.ruleId ?? "<fatal>");
}

describe("preset shape", () => {
  it("exposes exactly the two documented presets", () => {
    expect(Object.keys(plugin.configs).sort()).toStrictEqual(["all", "recommended"]);
  });

  it.each(["recommended", "all"] as const)("%s is a single named flat config", (name) => {
    const preset = plugin.configs[name];
    expect(preset).toHaveLength(1);
    const [config] = preset;
    expect(config.name).toBe(`three/${name}`);
    expect(Object.keys(config).sort()).toStrictEqual(["name", "plugins", "rules"]);
    expect(config.languageOptions).toBeUndefined();
    expect(config.files).toBeUndefined();
    expect(config.processor).toBeUndefined();
  });

  it("registers the same plugin object it exports", () => {
    for (const name of ["recommended", "all"] as const) {
      expect(plugin.configs[name][0].plugins?.["three"]).toBe(plugin);
    }
  });

  it("enables exactly the twelve recommended rules at error", () => {
    const configured = plugin.configs.recommended[0].rules ?? {};
    expect(Object.keys(configured)).toStrictEqual([...EXPECTED_RECOMMENDED]);
    expect(Object.values(configured)).toStrictEqual(EXPECTED_RECOMMENDED.map(() => "error"));
  });

  it("enables every rule at error in all", () => {
    const configured = plugin.configs.all[0].rules ?? {};
    expect(Object.keys(configured)).toStrictEqual(
      Object.keys(rules).map((name) => `three/${name}`),
    );
    expect(Object.values(configured)).toStrictEqual(Object.keys(rules).map(() => "error"));
  });

  it("enables exactly the six all-only rules beyond recommended", () => {
    const recommended = new Set(Object.keys(plugin.configs.recommended[0].rules ?? {}));
    const allOnly = Object.keys(plugin.configs.all[0].rules ?? {}).filter(
      (id) => !recommended.has(id),
    );
    expect(allOnly).toStrictEqual([...EXPECTED_ALL_ONLY]);
  });

  it("agrees with each rule's own recommended metadata", () => {
    const fromMetadata = (Object.keys(rules) as RuleName[])
      .filter((name) => rules[name].meta?.docs?.recommended === true)
      .map((name) => `three/${name}`);
    expect(fromMetadata).toStrictEqual([...EXPECTED_RECOMMENDED]);
  });
});

describe("preset behavior through the ESLint API", () => {
  it("reports a recommended violation", async () => {
    await expect(
      lint(plugin.configs.recommended, INVALID_RECOMMENDED_SAMPLE),
    ).resolves.toStrictEqual(["three/no-direct-device-pixel-ratio"]);
  });

  it("accepts a bounded pixel ratio", async () => {
    await expect(lint(plugin.configs.recommended, VALID_SAMPLE)).resolves.toStrictEqual([]);
  });

  it("leaves all-only rules disabled under recommended", async () => {
    await expect(
      lint(plugin.configs.recommended, ALL_ONLY_SAMPLE, {
        languageOptions: { globals: { AFRAME: "readonly" } },
      }),
    ).resolves.toStrictEqual([]);
  });

  it("reports all-only rules under all", async () => {
    await expect(
      lint(plugin.configs.all, ALL_ONLY_SAMPLE, {
        languageOptions: { globals: { AFRAME: "readonly" } },
      }),
    ).resolves.toStrictEqual(["three/no-transform-set-attribute-in-tick"]);
  });

  it("reports a newly recommended rule under recommended", async () => {
    await expect(lint(plugin.configs.recommended, NEW_RECOMMENDED_SAMPLE)).resolves.toStrictEqual([
      "three/no-three-allocating-call-in-render-loop",
    ]);
  });

  it("leaves the new all-only rule disabled under recommended", async () => {
    await expect(lint(plugin.configs.recommended, NEW_ALL_ONLY_SAMPLE)).resolves.toStrictEqual([]);
  });

  it("reports the new all-only rule under all", async () => {
    await expect(lint(plugin.configs.all, NEW_ALL_ONLY_SAMPLE)).resolves.toStrictEqual([
      "three/prefer-squared-vector-magnitude",
    ]);
  });

  it("lints identically through a direct spread and a string extends", async () => {
    const viaExtends = new ESLintApi({
      overrideConfigFile: true,
      overrideConfig: defineConfig(
        { plugins: { three: plugin }, extends: ["three/recommended"] },
        { languageOptions: { ecmaVersion: "latest", sourceType: "module" } },
      ) as never[],
    });
    const [result] = await viaExtends.lintText(NEW_RECOMMENDED_SAMPLE, { filePath: "sample.js" });
    const viaExtendsRules = (result?.messages ?? []).map((message) => message.ruleId);

    expect(viaExtendsRules).toStrictEqual(["three/no-three-allocating-call-in-render-loop"]);
    expect(viaExtendsRules).toStrictEqual(
      await lint(plugin.configs.recommended, NEW_RECOMMENDED_SAMPLE),
    );
  });
});
