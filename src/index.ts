import { readFileSync } from "node:fs";

import type { Linter, Rule } from "eslint";

import { createConfigs, NAMESPACE } from "./configs.js";
import { rules, type RuleName } from "./rules/index.js";

export type { RecommendedRuleName, RuleName } from "./rules/index.js";

/**
 * The shape of this plugin's default export.
 *
 * Declared explicitly rather than inferred so the package's public surface is
 * checked against a contract, and so the object can be handed to ESLint 9.22's
 * older `plugins` type without casting through `unknown`.
 */
export interface ThreePlugin {
  readonly meta: {
    readonly name: string;
    readonly version: string;
    readonly namespace: "three";
  };
  readonly rules: Record<RuleName, Rule.RuleModule>;
  readonly configs: {
    readonly recommended: readonly [Linter.Config];
    readonly all: readonly [Linter.Config];
  };
}

/** Reads `name` and `version` from the published manifest. */
function readManifest(): { name: string; version: string } {
  const raw: unknown = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  );
  if (
    typeof raw !== "object" ||
    raw === null ||
    !("name" in raw) ||
    !("version" in raw) ||
    typeof raw.name !== "string" ||
    typeof raw.version !== "string"
  ) {
    throw new TypeError(
      "eslint-plugin-threejslint: package.json must contain string name and version",
    );
  }
  return { name: raw.name, version: raw.version };
}

const manifest = readManifest();

/**
 * The plugin object, with self-registering flat configs.
 *
 * The presets reference this same object, so `plugins: { three }` and
 * `extends: ["three/recommended"]` resolve to one plugin instance rather than
 * two copies of the rule registry.
 */
const plugin: ThreePlugin = {
  meta: { name: manifest.name, version: manifest.version, namespace: NAMESPACE },
  rules,
  configs: { recommended: [{}], all: [{}] },
};

Object.assign(plugin, { configs: createConfigs(plugin) });

export default plugin;
