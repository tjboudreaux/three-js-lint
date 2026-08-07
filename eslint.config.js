import js from "@eslint/js";
import eslintPlugin from "eslint-plugin-eslint-plugin";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist/**", "coverage/**", "node_modules/**", "*.tgz", ".pack-smoke/**"],
  },
  js.configs.recommended,
  {
    files: ["**/*.ts"],
    extends: [tseslint.configs.strictTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ["src/rules/**/*.ts"],
    extends: [eslintPlugin.configs.recommended],
    rules: {
      /*
       * Every rule in this package is built by `createRule`, which supplies
       * `meta.type`, `meta.docs.url`, `meta.schema`, `meta.messages`, and
       * `meta.hasSuggestions`. This plugin only reads metadata from a literal
       * rule object, so it cannot see through the factory. The same invariants
       * are asserted behaviorally in `test/plugin.test.ts`, which checks the
       * built modules rather than their source shape.
       */
      "eslint-plugin/prefer-message-ids": "off",
      "eslint-plugin/require-meta-docs-url": "off",
      "eslint-plugin/require-meta-has-suggestions": "off",
      "eslint-plugin/require-meta-schema": "off",
      "eslint-plugin/require-meta-type": "off",
    },
  },
  {
    files: ["scripts/**/*.mjs", "eslint.config.js"],
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
        URL: "readonly",
        TextDecoder: "readonly",
      },
    },
  },
);
