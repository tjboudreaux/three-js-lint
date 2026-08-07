#!/usr/bin/env node
/**
 * Generates the README rule and preset tables from the built plugin.
 *
 * Modes:
 *   --write   rewrite the generated regions in place
 *   --check   verify the regions are current; exits nonzero on drift
 *
 * The tables live between explicit markers so hand-written prose around them is
 * never touched. Every rule must have a docs page whose path matches its
 * `meta.docs.url`, and the presets must agree with each rule's `recommended`
 * metadata, so a rule can never ship undocumented or misfiled.
 *
 * Output is run through Prettier with the repository's own configuration, so
 * `docs:check` and `format:check` can never disagree about the same file.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { format, resolveConfig } from "prettier";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const README_PATH = join(ROOT, "README.md");
const DOCS_BASE_URL = "https://github.com/tjboudreaux/eslint-plugin-three/blob/main/docs/rules";

const RULES_BEGIN = "<!-- BEGIN GENERATED RULES -->";
const RULES_END = "<!-- END GENERATED RULES -->";
const CONFIGS_BEGIN = "<!-- BEGIN GENERATED CONFIGS -->";
const CONFIGS_END = "<!-- END GENERATED CONFIGS -->";

/**
 * Exits with a message on stderr and the conventional failure code.
 *
 * @param {string} message
 * @returns {never}
 */
function fail(message) {
  process.stderr.write(`generate-readme: ${message}\n`);
  process.exit(1);
}

/**
 * Parses argv into a single mode, rejecting anything unrecognized.
 *
 * @param {readonly string[]} argv
 * @returns {"--write" | "--check"}
 */
function parseMode(argv) {
  const args = argv.slice(2);
  const mode = args[0];
  if (args.length !== 1 || (mode !== "--write" && mode !== "--check")) {
    process.stderr.write("usage: generate-readme.mjs (--write | --check)\n");
    process.exit(2);
  }
  return mode;
}

/**
 * Reads the rule severities of one preset, requiring the shape this package ships.
 *
 * @param {import("eslint").ESLint.Plugin} plugin
 * @param {string} name
 * @returns {Record<string, unknown>}
 */
function presetRules(plugin, name) {
  const preset = (plugin.configs ?? {})[name];
  const config = Array.isArray(preset) && preset.length === 1 ? preset[0] : undefined;
  if (config === undefined) {
    fail(`preset three/${name} must be a one-element flat config array`);
  }
  if (config.name !== `three/${name}`) {
    fail(`preset three/${name} declares name ${String(config.name)}`);
  }
  return config.rules ?? {};
}

/**
 * Strips this plugin's namespace prefix from a set of rule IDs.
 *
 * @param {Record<string, unknown>} rules
 * @returns {Set<string>}
 */
function bareRuleNames(rules) {
  return new Set(Object.keys(rules).map((id) => id.replace(/^three\//, "")));
}

/**
 * Locates one generated region, rejecting missing, duplicated, or swapped markers.
 *
 * @param {string} source
 * @param {string} begin
 * @param {string} end
 * @returns {{ start: number; stop: number }}
 */
function findRegion(source, begin, end) {
  const beginCount = source.split(begin).length - 1;
  const endCount = source.split(end).length - 1;
  if (beginCount !== 1 || endCount !== 1) {
    fail(
      `expected exactly one ${begin} and one ${end} in README.md, found ${beginCount} and ${endCount}`,
    );
  }
  const start = source.indexOf(begin);
  const stop = source.indexOf(end);
  if (stop < start) {
    fail(`${end} appears before ${begin} in README.md`);
  }
  return { start: start + begin.length, stop };
}

/**
 * Replaces a marked region's body with `body`.
 *
 * @param {string} source
 * @param {string} begin
 * @param {string} end
 * @param {string} body
 * @returns {string}
 */
function replaceRegion(source, begin, end, body) {
  const { start, stop } = findRegion(source, begin, end);
  return `${source.slice(0, start)}\n${body}\n${source.slice(stop)}`;
}

/**
 * Builds the rule table, validating each rule's docs page and metadata.
 *
 * @param {import("eslint").ESLint.Plugin} plugin
 * @returns {string}
 */
function buildRuleTable(plugin) {
  const rules = plugin.rules ?? {};
  const names = Object.keys(rules);
  if (names.join("\n") !== [...names].sort().join("\n")) {
    fail("plugin rules must be declared in sorted order");
  }

  const recommended = bareRuleNames(presetRules(plugin, "recommended"));
  const all = bareRuleNames(presetRules(plugin, "all"));

  const rows = [
    "| Rule | Description | `recommended` | `all` | Suggestions |",
    "| ---- | ----------- | ------------- | ----- | ----------- |",
  ];

  for (const name of names) {
    const meta = rules[name]?.meta ?? {};
    const docs = meta.docs ?? {};

    if (!existsSync(join(ROOT, "docs", "rules", `${name}.md`))) {
      fail(`missing documentation page docs/rules/${name}.md`);
    }
    const expectedUrl = `${DOCS_BASE_URL}/${name}.md`;
    if (docs.url !== expectedUrl) {
      fail(`${name} declares docs.url ${String(docs.url)}, expected ${expectedUrl}`);
    }
    const description = docs.description;
    if (typeof description !== "string" || description.length === 0) {
      fail(`${name} is missing meta.docs.description`);
    }
    if (!all.has(name)) {
      fail(`${name} is missing from the three/all preset`);
    }
    if (recommended.has(name) !== (docs.recommended === true)) {
      fail(`${name} preset membership disagrees with meta.docs.recommended`);
    }

    const cells = [
      `[\`three/${name}\`](docs/rules/${name}.md)`,
      // A pipe inside a description would otherwise split the row.
      String(description).replaceAll("|", "\\|"),
      recommended.has(name) ? "yes" : "",
      "yes",
      meta.hasSuggestions === true ? "yes" : "",
    ];
    rows.push(`| ${cells.join(" | ")} |`);
  }

  return rows.join("\n");
}

/**
 * Builds the preset table.
 *
 * @param {import("eslint").ESLint.Plugin} plugin
 * @returns {string}
 */
function buildConfigTable(plugin) {
  const rows = ["| Preset | Rules enabled | Severity |", "| ------ | ------------- | -------- |"];

  for (const name of Object.keys(plugin.configs ?? {}).sort()) {
    const rules = presetRules(plugin, name);
    const severities = new Set(Object.values(rules));
    if (severities.size !== 1) {
      fail(`preset three/${name} must use a single severity`);
    }
    const [severity] = severities;
    rows.push(`| \`three/${name}\` | ${Object.keys(rules).length} | \`${String(severity)}\` |`);
  }

  return rows.join("\n");
}

const mode = parseMode(process.argv);

const distEntry = join(ROOT, "dist", "index.js");
if (!existsSync(distEntry)) {
  fail("dist/index.js is missing; run `pnpm build` first");
}

/** @type {{ default: import("eslint").ESLint.Plugin }} */
const imported = await import(`file://${distEntry}`);
const plugin = imported.default;

const original = readFileSync(README_PATH, "utf8");
let updated = replaceRegion(original, RULES_BEGIN, RULES_END, buildRuleTable(plugin));
updated = replaceRegion(updated, CONFIGS_BEGIN, CONFIGS_END, buildConfigTable(plugin));

const prettierOptions = await resolveConfig(README_PATH);
updated = await format(updated, { ...prettierOptions, filepath: README_PATH });

if (mode === "--check") {
  if (updated !== original) {
    fail("README.md generated tables are out of date; run `pnpm docs:generate`");
  }
  process.stdout.write("generate-readme: README.md is up to date\n");
} else {
  writeFileSync(README_PATH, updated);
  process.stdout.write("generate-readme: wrote README.md\n");
}
