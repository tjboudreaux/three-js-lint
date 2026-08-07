import type { ESLint, Linter, Rule } from "eslint";

import type { RecommendedRuleName, RuleName } from "./rules/index.js";

/** ESLint namespace this plugin's rule IDs are prefixed with. */
export const NAMESPACE = "three";

/**
 * Rule severities for `three/recommended`, exhaustive over
 * {@link RecommendedRuleName}.
 *
 * Written out rather than derived from `meta.docs.recommended` so a metadata
 * edit can never silently change what a preset enables; `test/configs.test.ts`
 * asserts the two stay in agreement.
 */
const RECOMMENDED_RULES: Record<RecommendedRuleName, Linter.RuleSeverity> = {
  "no-deep-reactive-three-object": "error",
  "no-direct-device-pixel-ratio": "error",
  "no-replace-object3d-transform": "error",
  "no-set-state-in-use-frame": "error",
  "no-shader-recompile-in-render-loop": "error",
  "no-three-allocation-in-render-loop": "error",
};

/** Rule severities for `three/all`, exhaustive over {@link RuleName}. */
const ALL_RULES: Record<RuleName, Linter.RuleSeverity> = {
  "no-deep-reactive-three-object": "error",
  "no-direct-device-pixel-ratio": "error",
  "no-new-in-jsx-props": "error",
  "no-replace-object3d-transform": "error",
  "no-set-state-in-use-frame": "error",
  "no-shader-recompile-in-render-loop": "error",
  "no-three-allocation-in-render-loop": "error",
  "no-transform-set-attribute-in-tick": "error",
  "prefer-bvh-first-hit-only": "error",
};

/**
 * The parts of the plugin object a preset needs in order to self-register.
 *
 * Declared structurally here rather than imported from `./index.js` so the
 * presets stay free of a circular module dependency on the entry point.
 */
interface ThreePluginLike {
  readonly meta: {
    readonly name: string;
    readonly version: string;
    readonly namespace: string;
  };
  readonly rules: Readonly<Record<string, Rule.RuleModule>>;
}

/** Prefixes every rule ID in a preset with this plugin's namespace. */
function namespaceRules(
  severities: Readonly<Record<string, Linter.RuleSeverity>>,
): Linter.RulesRecord {
  const namespaced: Linter.RulesRecord = {};
  for (const [name, severity] of Object.entries(severities)) {
    namespaced[`${NAMESPACE}/${name}`] = severity;
  }
  return namespaced;
}

/**
 * Builds the two flat-config presets.
 *
 * Each preset is a one-element array holding a single named config object with
 * nothing but `plugins` and `rules`: no parser, no globals, no `files`, no
 * framework plugin, and no language options. Consumers keep full control over
 * how TypeScript, JSX, and Vue files are parsed.
 */
export function createConfigs(plugin: ThreePluginLike): {
  readonly recommended: readonly [Linter.Config];
  readonly all: readonly [Linter.Config];
} {
  // ESLint's `Plugin.configs` types each preset as a *mutable* `Config[]`, while
  // this package publishes readonly one-element tuples. The two differ only in
  // readonly-ness, so this is a direct widening rather than an escape through
  // `unknown`, and the registered object stays identical to the exported one.
  const hostPlugin = plugin as ESLint.Plugin;
  const plugins = { [NAMESPACE]: hostPlugin };
  return {
    recommended: [
      {
        name: `${NAMESPACE}/recommended`,
        plugins,
        rules: namespaceRules(RECOMMENDED_RULES),
      },
    ],
    all: [
      {
        name: `${NAMESPACE}/all`,
        plugins,
        rules: namespaceRules(ALL_RULES),
      },
    ],
  };
}
