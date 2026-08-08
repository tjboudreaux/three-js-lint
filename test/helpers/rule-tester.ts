import { createRequire } from "node:module";

import tsParser from "@typescript-eslint/parser";
import type { ESLint, Linter, RuleTester as RuleTesterClass } from "eslint";
import { describe, it } from "vitest";

const nodeRequire = createRequire(import.meta.url);

/**
 * ESLint package the suite runs against.
 *
 * `pnpm test:compat` sets this to each pinned alias (`eslint`,
 * `eslint-v9-latest`, `eslint-v10-min`, `eslint-v10-latest`) so the same
 * fixtures prove behavior across the whole supported peer range.
 */
export const eslintPackageName = process.env["ESLINT_PACKAGE"] ?? "eslint";

/** The subset of an ESLint package's CommonJS entry point this suite uses. */
interface EslintModule {
  readonly RuleTester: typeof RuleTesterClass;
  readonly ESLint: typeof ESLint;
}

/** The subset of an ESLint package's `config` entry point this suite uses. */
interface EslintConfigModule {
  readonly defineConfig: (...configs: readonly unknown[]) => Linter.Config[];
}

// The package name is only known at runtime, so its shape cannot be imported.
// Every pinned ESLint in the matrix exports these two classes from its CJS entry.
const eslintModule = nodeRequire(eslintPackageName) as EslintModule;

/** `RuleTester` from the ESLint package currently under test. */
export const RuleTester = eslintModule.RuleTester;

/** `ESLint` Node API class from the ESLint package currently under test. */
export const ESLintApi = eslintModule.ESLint;

// `defineConfig` lives on the `eslint/config` subpath rather than the main entry.
const eslintConfigModule = nodeRequire(`${eslintPackageName}/config`) as EslintConfigModule;

/**
 * `defineConfig` from the ESLint package currently under test.
 *
 * Needed to exercise a string `extends` the way the README documents it: a raw
 * flat-config array rejects `extends` outright.
 */
export const defineConfig = eslintConfigModule.defineConfig;

// RuleTester emits its cases through whichever test framework is registered.
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

/** Flat language options for plain ESM JavaScript fixtures. */
export const jsLanguageOptions: Linter.LanguageOptions = {
  ecmaVersion: "latest",
  sourceType: "module",
};

/** Flat language options for JSX fixtures parsed by Espree. */
export const jsxLanguageOptions: Linter.LanguageOptions = {
  ecmaVersion: "latest",
  sourceType: "module",
  parserOptions: { ecmaFeatures: { jsx: true } },
};

/** Flat language options for TypeScript fixtures. */
export const tsLanguageOptions: Linter.LanguageOptions = {
  ecmaVersion: "latest",
  sourceType: "module",
  parser: tsParser,
};

/** Flat language options for TSX fixtures. */
export const tsxLanguageOptions: Linter.LanguageOptions = {
  ecmaVersion: "latest",
  sourceType: "module",
  parser: tsParser,
  parserOptions: { ecmaFeatures: { jsx: true } },
};

/**
 * Builds a `RuleTester` whose default language options accept ESM JavaScript.
 *
 * Individual cases override `languageOptions` to add JSX or a TypeScript parser;
 * the presets shipped by this plugin never set a parser themselves.
 */
export function createRuleTester(): RuleTesterClass {
  return new RuleTester({ languageOptions: jsLanguageOptions });
}
