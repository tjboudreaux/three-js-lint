#!/usr/bin/env node
/**
 * Packs the plugin and proves the tarball users actually install.
 *
 * Steps:
 *   1. `npm pack` and assert the exact published file list and manifest fields.
 *   2. Install the tarball into a throwaway consumer with a chosen ESLint.
 *   3. Import it as ESM, typecheck a TypeScript consumer, and lint three
 *      fixtures through the real ESLint CLI.
 *
 * Usage: pack-smoke.mjs [--eslint <version>]
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DEFAULT_ESLINT = "10.8.0";

/** Expected published files, other than the nine rule docs. */
const EXPECTED_ROOT_FILES = ["package.json", "README.md", "LICENSE"];

/** Every rule that must ship a documentation page. */
const RULE_NAMES = [
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

/** Expected `dist` entries: one JS, one map, one declaration, one declaration map per module. */
const DIST_MODULES = [
  "index",
  "configs",
  "rules/index",
  "utils/ast",
  "utils/bindings",
  "utils/create-rule",
  "utils/hot-contexts",
  "utils/three-api",
  ...RULE_NAMES.map((name) => `rules/${name}`),
];

/**
 * Exits with a message on stderr and the conventional failure code.
 *
 * @param {string} message
 * @returns {never}
 */
function fail(message) {
  process.stderr.write(`pack-smoke: ${message}\n`);
  process.exit(1);
}

/**
 * Parses argv, rejecting anything unrecognized.
 *
 * A bare `--` is skipped: `pnpm pack:smoke -- --eslint 9.22.0` forwards the
 * separator itself to the script.
 *
 * @param {readonly string[]} argv
 * @returns {{ eslintVersion: string }}
 */
function parseArgs(argv) {
  const args = argv.slice(2);
  let eslintVersion = DEFAULT_ESLINT;
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--") {
      continue;
    }
    if (args[index] === "--eslint") {
      const value = args[index + 1];
      if (value === undefined) {
        process.stderr.write("usage: pack-smoke.mjs [--eslint <version>]\n");
        process.exit(2);
      }
      eslintVersion = value;
      index += 1;
      continue;
    }
    process.stderr.write(`pack-smoke: unknown argument ${String(args[index])}\n`);
    process.exit(2);
  }
  return { eslintVersion };
}

/**
 * Runs a command, surfacing the full command line and stderr on failure.
 *
 * Returns the result when `allowFailure` is set, so callers can assert a
 * non-zero lint exit code.
 *
 * @param {string} command
 * @param {readonly string[]} args
 * @param {{ cwd?: string; allowFailure?: boolean }} [options]
 * @returns {import("node:child_process").SpawnSyncReturns<string>}
 */
function run(command, args, options = {}) {
  const { allowFailure = false, cwd } = options;
  const result = spawnSync(command, [...args], {
    encoding: "utf8",
    shell: false,
    ...(cwd === undefined ? {} : { cwd }),
  });
  if (result.error) {
    fail(`failed to spawn \`${command} ${args.join(" ")}\`: ${result.error.message}`);
  }
  if (!allowFailure && result.status !== 0) {
    fail(
      `\`${command} ${args.join(" ")}\` exited ${String(result.status)}\n--- stdout ---\n${
        result.stdout ?? ""
      }\n--- stderr ---\n${result.stderr ?? ""}`,
    );
  }
  return result;
}

/**
 * Asserts a condition, failing with a diagnostic message.
 *
 * @param {boolean} condition
 * @param {string} message
 * @returns {void}
 */
function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

/**
 * Asserts two file lists match, reporting the difference in both directions.
 *
 * @param {readonly string[]} actual
 * @param {readonly string[]} expected
 * @returns {void}
 */
function assertSameFiles(actual, expected) {
  const actualSorted = [...actual].sort();
  const expectedSorted = [...expected].sort();
  const missing = expectedSorted.filter((entry) => !actualSorted.includes(entry));
  const extra = actualSorted.filter((entry) => !expectedSorted.includes(entry));
  if (missing.length > 0 || extra.length > 0) {
    fail(
      `packed file list mismatch\n  missing: ${missing.join(", ") || "(none)"}\n  unexpected: ${
        extra.join(", ") || "(none)"
      }`,
    );
  }
}

/**
 * Packs the package into `destination` and returns npm's own filename and file list.
 *
 * @param {string} destination
 * @returns {{ filename: string; files: string[] }}
 */
function packTarball(destination) {
  const result = run(
    "npm",
    ["pack", "--json", "--ignore-scripts", "--pack-destination", destination],
    { cwd: ROOT },
  );

  /** @type {unknown} */
  let parsed;
  try {
    parsed = JSON.parse(result.stdout);
  } catch (error) {
    fail(`could not parse \`npm pack --json\` output: ${String(error)}\n${result.stdout}`);
  }
  const entry = Array.isArray(parsed) ? parsed[0] : parsed;
  const filename = entry?.filename;
  const files = entry?.files;
  assert(
    typeof filename === "string" && Array.isArray(files),
    "`npm pack --json` did not report a filename and file list",
  );
  return {
    filename: String(filename),
    files: files.map((/** @type {{ path: string }} */ file) => file.path),
  };
}

/**
 * Asserts the published manifest fields consumers depend on.
 *
 * @returns {string} the version being packed
 */
function assertManifest() {
  /** @type {any} */
  const manifest = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));

  assert(manifest.name === "eslint-plugin-three", "package name changed");
  assert(manifest.type === "module", "package must be ESM (`type: module`)");
  assert(manifest.sideEffects === false, "package must declare `sideEffects: false`");
  assert(
    manifest.dependencies === undefined || Object.keys(manifest.dependencies).length === 0,
    "package must ship no runtime dependencies",
  );
  assert(
    manifest.peerDependencies?.eslint === "^9.22.0 || ^10.0.0",
    `unexpected eslint peer range: ${String(manifest.peerDependencies?.eslint)}`,
  );
  assert(
    manifest.engines?.node === "^20.19.0 || ^22.13.0 || >=24",
    `unexpected node engine range: ${String(manifest.engines?.node)}`,
  );

  const exported = manifest.exports?.["."];
  assert(exported !== undefined, "package must export `.`");
  assert(Object.keys(manifest.exports).length === 1, "package must export only `.`");
  assert(exported.types === "./dist/index.d.ts", "unexpected `types` export condition");
  assert(exported.import === "./dist/index.js", "unexpected `import` export condition");
  assert(exported.default === "./dist/index.js", "unexpected `default` export condition");

  return String(manifest.version);
}

/**
 * Writes the consumer project that installs and exercises the tarball.
 *
 * @param {string} consumerDir
 * @param {string} tarballPath
 * @param {string} eslintVersion
 * @param {string} version
 * @returns {void}
 */
function writeConsumer(consumerDir, tarballPath, eslintVersion, version) {
  mkdirSync(consumerDir, { recursive: true });

  writeFileSync(
    join(consumerDir, "package.json"),
    `${JSON.stringify(
      {
        name: "three-plugin-consumer",
        private: true,
        version: "0.0.0",
        type: "module",
        dependencies: {
          "@react-three/eslint-plugin": "0.1.2",
          eslint: eslintVersion,
          "eslint-plugin-three": `file:${tarballPath}`,
          typescript: "6.0.3",
        },
      },
      null,
      2,
    )}\n`,
  );

  // Proves the ESM default export and the packed manifest version agree. The
  // manifest is read from disk rather than imported, because the package
  // deliberately exports only `.` and no `./package.json` subpath.
  writeFileSync(
    join(consumerDir, "check-runtime.mjs"),
    `import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import plugin from "eslint-plugin-three";

const manifest = JSON.parse(
  readFileSync("node_modules/eslint-plugin-three/package.json", "utf8"),
);
assert.equal(manifest.version, ${JSON.stringify(version)});
assert.equal(manifest.dependencies, undefined);
assert.equal(plugin.meta.name, "eslint-plugin-three");
assert.equal(plugin.meta.version, ${JSON.stringify(version)});
assert.equal(plugin.meta.namespace, "three");
assert.equal(Object.keys(plugin.rules).length, ${RULE_NAMES.length});
assert.equal(plugin.configs.recommended.length, 1);
assert.equal(plugin.configs.all.length, 1);
assert.equal(plugin.configs.recommended[0].plugins.three, plugin);
assert.equal(plugin.configs.all[0].plugins.three, plugin);

// The subpath export surface must stay closed.
await assert.rejects(() => import("eslint-plugin-three/rules/index.js"));
console.log("runtime import ok");
`,
  );

  // Proves the published declarations resolve and describe the real shape.
  writeFileSync(
    join(consumerDir, "check-types.ts"),
    `import three from "eslint-plugin-three";
import type { RecommendedRuleName, RuleName } from "eslint-plugin-three";

const name: RuleName = "no-three-allocation-in-render-loop";
const recommended: RecommendedRuleName = "no-direct-device-pixel-ratio";
const namespace: "three" = three.meta.namespace;

export const check = [name, recommended, namespace, three.configs.all[0].name] as const;
`,
  );
  writeFileSync(
    join(consumerDir, "tsconfig.json"),
    `${JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          module: "NodeNext",
          moduleResolution: "NodeNext",
          strict: true,
          noEmit: true,
          skipLibCheck: false,
        },
        include: ["check-types.ts"],
      },
      null,
      2,
    )}\n`,
  );

  // Loads the plugin the way a consumer does: by string `extends`.
  writeFileSync(
    join(consumerDir, "eslint.config.mjs"),
    `import { defineConfig } from "eslint/config";
import * as reactThree from "@react-three/eslint-plugin";
import three from "eslint-plugin-three";

export default defineConfig(
  {
    files: ["src/**/*.js"],
    plugins: { three },
    extends: ["three/recommended"],
    languageOptions: { ecmaVersion: "latest", sourceType: "module" },
  },
  {
    files: ["src/r3f.js"],
    plugins: { "@react-three": reactThree },
    rules: {
      "@react-three/no-new-in-loop": "error",
      "@react-three/no-clone-in-loop": "error",
    },
  },
);
`,
  );

  mkdirSync(join(consumerDir, "src"), { recursive: true });

  writeFileSync(
    join(consumerDir, "src", "valid.js"),
    `import { Vector3, WebGLRenderer } from "three";

const renderer = new WebGLRenderer();
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scratch = new Vector3();
renderer.setAnimationLoop(() => {
  scratch.set(1, 2, 3);
});
`,
  );

  writeFileSync(
    join(consumerDir, "src", "loop.js"),
    `import { Vector3, WebGLRenderer } from "three";

const renderer = new WebGLRenderer();
renderer.setAnimationLoop(() => new Vector3());
`,
  );

  writeFileSync(
    join(consumerDir, "src", "r3f.js"),
    `import { useFrame } from "@react-three/fiber";
import { Vector3 } from "three";

export function Spinner() {
  useFrame(() => new Vector3());
  return null;
}
`,
  );
}

/**
 * Runs the consumer's ESLint CLI over one file and returns its reported rule IDs.
 *
 * @param {string} consumerDir
 * @param {string} file
 * @param {{ expectFailure: boolean }} expectation
 * @returns {string[]}
 */
function lintFixture(consumerDir, file, { expectFailure }) {
  const result = run("npx", ["--no-install", "eslint", "--format", "json", file], {
    cwd: consumerDir,
    allowFailure: true,
  });

  const expectedStatus = expectFailure ? 1 : 0;
  assert(
    result.status === expectedStatus,
    `expected \`eslint ${file}\` to exit ${String(expectedStatus)}, got ${String(
      result.status,
    )}\n${result.stdout}\n${result.stderr}`,
  );

  /** @type {{ messages: { ruleId: string | null }[] }[]} */
  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch (error) {
    fail(`could not parse ESLint JSON for ${file}: ${String(error)}\n${result.stdout}`);
  }
  assert(Array.isArray(report), `ESLint JSON for ${file} was not an array`);
  return report.flatMap((entry) => entry.messages.map((message) => message.ruleId ?? "<fatal>"));
}

const { eslintVersion } = parseArgs(process.argv);
const workDir = mkdtempSync(join(tmpdir(), "eslint-plugin-three-pack-"));

try {
  process.stdout.write(`pack-smoke: packing and testing against eslint@${eslintVersion}\n`);

  const version = assertManifest();
  const { filename, files } = packTarball(workDir);

  assertSameFiles(files, [
    ...EXPECTED_ROOT_FILES,
    ...RULE_NAMES.map((name) => `docs/rules/${name}.md`),
    ...DIST_MODULES.flatMap((module) => [
      `dist/${module}.js`,
      `dist/${module}.js.map`,
      `dist/${module}.d.ts`,
      `dist/${module}.d.ts.map`,
    ]),
  ]);
  process.stdout.write(
    `pack-smoke: ${filename} contains exactly the expected ${files.length} files\n`,
  );

  const consumerDir = join(workDir, "consumer");
  writeConsumer(consumerDir, join(workDir, filename), eslintVersion, version);

  run("npm", ["install", "--no-audit", "--no-fund", "--no-package-lock", "--ignore-scripts"], {
    cwd: consumerDir,
  });
  process.stdout.write("pack-smoke: consumer installed\n");

  run("node", ["check-runtime.mjs"], { cwd: consumerDir });
  run("npx", ["--no-install", "tsc", "--noEmit", "-p", "tsconfig.json"], { cwd: consumerDir });
  process.stdout.write("pack-smoke: runtime import and published types ok\n");

  const validRules = lintFixture(consumerDir, "src/valid.js", { expectFailure: false });
  assert(validRules.length === 0, `valid fixture reported ${validRules.join(", ")}`);

  const loopRules = lintFixture(consumerDir, "src/loop.js", { expectFailure: true });
  assert(
    loopRules.length === 1 && loopRules[0] === "three/no-three-allocation-in-render-loop",
    `loop fixture reported ${loopRules.join(", ") || "(nothing)"}, expected exactly three/no-three-allocation-in-render-loop`,
  );

  const r3fRules = lintFixture(consumerDir, "src/r3f.js", { expectFailure: true });
  assert(
    r3fRules.length === 1 && r3fRules[0] === "@react-three/no-new-in-loop",
    `r3f fixture reported ${r3fRules.join(", ") || "(nothing)"}, expected only @react-three/no-new-in-loop`,
  );
  process.stdout.write("pack-smoke: lint behavior and pmndrs non-overlap ok\n");

  process.stdout.write(`pack-smoke: passed against eslint@${eslintVersion}\n`);
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
