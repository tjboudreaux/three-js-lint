# Three.js Lint

Conservative, syntax-proven ESLint rules for Three.js performance and rendering.

Three.js performance problems are usually not exotic. They are a `devicePixelRatio` forwarded
straight into `setPixelRatio`, a `new Vector3()` inside a frame callback, a `needsUpdate = true` that
asks for a shader program every frame, or a transform object replaced instead of mutated in place.
Those are syntax-visible, and this plugin reports them — and nothing else.

Every rule here is deliberately narrow. A report requires a resolved binding identity and an exact
AST shape, never a naming convention or a guess. If the plugin cannot prove the receiver, the import
provenance, or the dispatch mechanism, it stays silent. That trade is intentional: a linter you
cannot trust gets disabled.

## Installation

```sh
npm install --save-dev eslint-plugin-threejslint
```

Requirements:

- **ESLint** `^9.22.0 || ^10.0.0`, flat config only.
- **Node** `^20.19.0 || ^22.13.0 || >=24`. CI proves 20.19, 22.13, and 24.
- **ESM only.** The package ships a single ESM entry point and has no CommonJS build, so
  `eslint.config.mjs` or an ESM `eslint.config.js` is required.

The plugin has **no runtime dependencies**. It never imports Three.js, React, React Three Fiber, Vue,
TresJS, A-Frame, or three-mesh-bvh — it reads your import statements instead. You do not need any of
those packages installed for the rules to work, and having them installed changes nothing.

## Usage

The preferred form uses `defineConfig` with a string `extends`:

```js
// eslint.config.mjs
import { defineConfig } from "eslint/config";
import threeLint from "eslint-plugin-threejslint";

export default defineConfig({
  plugins: { three: threeLint },
  extends: ["three/recommended"],
});
```

The presets are also plain flat-config arrays, so you can spread them directly:

```js
// eslint.config.mjs
import threeLint from "eslint-plugin-threejslint";

export default [...threeLint.configs.recommended];
```

Both forms register the same plugin object, so rule IDs resolve identically.

### Presets

<!-- BEGIN GENERATED CONFIGS -->

| Preset              | Rules enabled | Severity |
| ------------------- | ------------- | -------- |
| `three/all`         | 18            | `error`  |
| `three/recommended` | 12            | `error`  |

<!-- END GENERATED CONFIGS -->

`three/recommended` enables the twelve rules whose evidence is strong enough to be on by default.
`three/all` additionally enables six opt-in rules, for three distinct reasons:

- **Framework and ecosystem integration** — `no-new-in-jsx-props`,
  `no-transform-set-attribute-in-tick`, and `prefer-bvh-first-hit-only` depend on project-specific
  integration and framework-version semantics you should confirm for your project.
- **Full-scan recomputation** — `no-bounds-recompute-in-render-loop` and
  `no-geometry-recompute-in-render-loop` report work that is genuinely necessary on small or
  continuously changing data.
- **Readability trade** — `prefer-squared-vector-magnitude` trades a little readability for one
  saved square root, which only matters on a hot path.

`three/all` will grow automatically as new rules ship, so pin a version if you need a stable rule
set.

Each preset is a single named config object containing nothing but `plugins` and `rules`. There is no
parser, no `globals`, no `files`, no `languageOptions`, and no framework plugin. You keep full control
over how your files are parsed.

### TypeScript and JSX

The rules are parser-neutral: they read the AST structurally and treat `as`, `satisfies`, `!`,
angle-bracket assertions, and optional chaining as transparent. Because the presets never set a
parser, compose them with whatever parser your project already uses:

```js
// eslint.config.mjs
import { defineConfig } from "eslint/config";
import threeLint from "eslint-plugin-threejslint";
import tseslint from "typescript-eslint";

export default defineConfig(
  { plugins: { three: threeLint }, extends: ["three/recommended"] },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: { parser: tseslint.parser },
  },
  {
    files: ["**/*.jsx"],
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
  },
);
```

Type-only imports are ignored, because they are erased at runtime and cannot construct anything.

### A-Frame projects

Two rules recognize `AFRAME.registerComponent` only when `AFRAME` is a namespace import of `aframe`
or a global your configuration actually declares. Declaring it prevents an unrelated project global
named `AFRAME` from being mistaken for A-Frame:

```js
// eslint.config.mjs
import { defineConfig } from "eslint/config";
import threeLint from "eslint-plugin-threejslint";

export default defineConfig({
  plugins: { three: threeLint },
  extends: ["three/all"],
  languageOptions: { globals: { AFRAME: "readonly" } },
});
```

### Using this alongside @react-three/eslint-plugin

`@react-three/eslint-plugin` already owns allocation diagnostics inside React Three Fiber's
`useFrame`. To avoid duplicate reports, `three/no-three-allocation-in-render-loop` is the **only**
rule in this package that excludes `useFrame`; every other loop rule includes it. Enable the two
upstream rules directly so R3F allocation is still covered:

```js
// eslint.config.mjs
import { defineConfig } from "eslint/config";
import * as reactThree from "@react-three/eslint-plugin";
import threeLint from "eslint-plugin-threejslint";

export default defineConfig({
  plugins: { three: threeLint, "@react-three": reactThree },
  extends: ["three/recommended"],
  rules: {
    "@react-three/no-new-in-loop": "error",
    "@react-three/no-clone-in-loop": "error",
  },
});
```

Enable those two rules individually rather than spreading `@react-three/eslint-plugin`'s legacy
preset, which is not a flat config.

## Rules

<!-- BEGIN GENERATED RULES -->

| Rule                                                                                                               | Description                                                                            | `recommended` | `all` | Suggestions |
| ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- | ------------- | ----- | ----------- |
| [`three/no-bounds-recompute-in-render-loop`](docs/rules/no-bounds-recompute-in-render-loop.md)                     | Disallow full-scan Three.js bounds recomputation in verified render-loop callbacks.    |               | yes   |             |
| [`three/no-deep-reactive-three-object`](docs/rules/no-deep-reactive-three-object.md)                               | Disallow wrapping newly constructed Three.js objects in deep Vue reactivity.           | yes           | yes   | yes         |
| [`three/no-direct-device-pixel-ratio`](docs/rules/no-direct-device-pixel-ratio.md)                                 | Disallow forwarding devicePixelRatio directly to a Three.js renderer.                  | yes           | yes   |             |
| [`three/no-ephemeral-dispose-listener-in-render-loop`](docs/rules/no-ephemeral-dispose-listener-in-render-loop.md) | Disallow ephemeral Three.js dispose listeners in verified render-loop callbacks.       | yes           | yes   |             |
| [`three/no-geometry-recompute-in-render-loop`](docs/rules/no-geometry-recompute-in-render-loop.md)                 | Disallow full-scan Three.js geometry recomputation in verified render-loop callbacks.  |               | yes   |             |
| [`three/no-new-in-jsx-props`](docs/rules/no-new-in-jsx-props.md)                                                   | Disallow new Three.js transform objects in React Three Fiber JSX props.                |               | yes   |             |
| [`three/no-non-numeric-vector-components`](docs/rules/no-non-numeric-vector-components.md)                         | Disallow statically non-numeric values in Three.js vector components.                  | yes           | yes   |             |
| [`three/no-pmrem-generation-in-render-loop`](docs/rules/no-pmrem-generation-in-render-loop.md)                     | Disallow PMREM generation in verified render-loop callbacks.                           | yes           | yes   |             |
| [`three/no-replace-object3d-transform`](docs/rules/no-replace-object3d-transform.md)                               | Disallow replacing Object3D transform objects.                                         | yes           | yes   | yes         |
| [`three/no-set-state-in-use-frame`](docs/rules/no-set-state-in-use-frame.md)                                       | Disallow React state updates in React Three Fiber useFrame callbacks.                  | yes           | yes   |             |
| [`three/no-shader-recompile-in-render-loop`](docs/rules/no-shader-recompile-in-render-loop.md)                     | Disallow shader or pipeline compilation work in verified render-loop callbacks.        | yes           | yes   |             |
| [`three/no-synchronous-gpu-operation-in-render-loop`](docs/rules/no-synchronous-gpu-operation-in-render-loop.md)   | Disallow synchronous GPU operations in verified render-loop callbacks.                 | yes           | yes   |             |
| [`three/no-three-allocating-call-in-render-loop`](docs/rules/no-three-allocating-call-in-render-loop.md)           | Disallow allocation-returning Three.js method calls in verified render-loop callbacks. | yes           | yes   |             |
| [`three/no-three-allocation-in-render-loop`](docs/rules/no-three-allocation-in-render-loop.md)                     | Disallow allocating Three.js objects in verified render-loop callbacks.                | yes           | yes   |             |
| [`three/no-three-loader-parse-in-render-loop`](docs/rules/no-three-loader-parse-in-render-loop.md)                 | Disallow synchronous Three.js loader parsing in verified render-loop callbacks.        | yes           | yes   |             |
| [`three/no-transform-set-attribute-in-tick`](docs/rules/no-transform-set-attribute-in-tick.md)                     | Disallow setAttribute transform updates in A-Frame tick callbacks.                     |               | yes   |             |
| [`three/prefer-bvh-first-hit-only`](docs/rules/prefer-bvh-first-hit-only.md)                                       | Prefer three-mesh-bvh firstHitOnly when only the first raycast hit is used.            |               | yes   |             |
| [`three/prefer-squared-vector-magnitude`](docs/rules/prefer-squared-vector-magnitude.md)                           | Prefer squared Three.js vector magnitudes in zero comparisons.                         |               | yes   |             |

<!-- END GENERATED RULES -->

Every rule is optionless (`schema: []`) and never autofixable. Two rules offer editor suggestions,
which your editor may apply on request but `eslint --fix` never applies automatically. Two rules —
`no-replace-object3d-transform` and `no-non-numeric-vector-components` — report a correctness fault
(`meta.type: "problem"`); the other sixteen report a performance or API policy violation.

Each rule's page documents its detection contract, its explicit non-reports, and its static limits.
Start there before filing a false positive — the boundary is usually deliberate.

## What this plugin does not do

The rule surface is syntax-only by design. This plugin performs no runtime analysis: it does not
estimate callback frequency, FPS, GPU time, draw calls, asset encoding, resource ownership, iteration
count, or scene suitability.

Concretely, the support boundary is:

- **ESM import provenance.** Recognized specifiers are exactly `three`, `three/webgpu`, `react`,
  `vue`, `@react-three/fiber`, `@tresjs/core`, `three-mesh-bvh`, and `aframe`. Deep paths such as
  `three/src/math/Vector3.js`, re-export barrels, and `require()` are not recognized. There is
  exactly one narrow exception: `three/no-three-loader-parse-in-render-loop` additionally recognizes
  the finite `three/addons` barrel plus its direct `three/addons/loaders/<File>.js` and
  compatibility `three/examples/jsm/loaders/<File>.js` pairs, where the file name must match the
  imported class. Arbitrary `three/src` paths, other addon directories, unlisted addon modules, user
  re-export barrels, default imports, and CommonJS remain unsupported everywhere.
- **One immutable alias hop.** A direct named import, a namespace member access, or a single
  immutable `const` alias resolves. Two hops does not.
- **Direct callback bodies.** A report fires only when the reported node's nearest enclosing function
  is the verified callback. Code moved into a helper or a nested closure is never attributed to a
  loop.
- **Proven dispatch.** A render-loop callback is recognized from the registration site, never from
  its own name: a `requestAnimationFrame` call, a `setAnimationLoop` or sort-comparator setter on a
  proven renderer, an `onBeforeRender`/`onAfterRender` installed on a proven renderable instance or
  declared on a direct subclass of one, an `AFRAME.registerComponent` `tick`/`tock`, a current
  `@tresjs/core` `useLoop` callback, or a React Three Fiber `useFrame`. `LineLoop` render hooks and
  the renderer-specific shadow hooks are excluded, because both renderers share the core object
  classes and an object's import source cannot prove which renderer will dispatch it.

Broadening any of these would change the false-positive contract, so it is a separate, reviewed
design decision rather than a patch.

### Rules considered and deferred

Four candidates were designed and deferred because syntax alone cannot establish the precondition:
texture color-space correctness, `BufferAttribute` upload batching, projection-matrix update
placement, and bounds refresh after geometry mutation. Each depends on asset encoding or on resource
ownership that a linter cannot see.

Two candidates were dropped outright: an instancing-suitability rule and a triangle-fan rule. Both
require knowing scene scale and draw-call value, which is a runtime property of the scene, not of the
source.

## Research basis

Each source below was reviewed for advice that could be turned into a syntax-provable rule. Where it
could not, the reason is recorded rather than approximated. Perplexity was used only to find
candidate sources; no claim was accepted without verifying it against a primary source.

| Source                                                                                                                              | Outcome                                                                                                                                                                              |
| ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [react-three-fiber](https://github.com/pmndrs/react-three-fiber)                                                                    | `no-set-state-in-use-frame` and `no-new-in-jsx-props`. Allocation-in-loop evidence is delegated to `@react-three/eslint-plugin`, which already owns it.                              |
| [A-Frame](https://github.com/aframevr/aframe)                                                                                       | `no-three-allocation-in-render-loop` (tick/tock dispatch) and `no-transform-set-attribute-in-tick`.                                                                                  |
| [Theatre.js](https://github.com/theatre-js/theatre)                                                                                 | `no-replace-object3d-transform`; its r3f editable factory mutates transforms in place. Projection-matrix update rules deferred.                                                      |
| [img2threejs](https://github.com/img2threejs/img2threejs)                                                                           | `no-direct-device-pixel-ratio`. Its asset and color-space handling is data-dependent, so that work is deferred.                                                                      |
| [3d-force-graph](https://github.com/vasturiano/3d-force-graph)                                                                      | Corroborating evidence for allocation and resource sharing in frame loops. No package-specific rule: geometry and material reuse depends on ownership.                               |
| [TresJS](https://github.com/Tresjs/tres)                                                                                            | `no-deep-reactive-three-object`, the current `useLoop` callback surface, and pixel-ratio clamp evidence.                                                                             |
| [three-mesh-bvh](https://github.com/gkjohnson/three-mesh-bvh)                                                                       | `prefer-bvh-first-hit-only`.                                                                                                                                                         |
| [camera-controls](https://github.com/yomotsu/camera-controls)                                                                       | Corroborating evidence for module-scope scratch objects and allocation-free update loops. No package-specific rule.                                                                  |
| [detect-gpu](https://github.com/pmndrs/detect-gpu)                                                                                  | Evidence that pixel-ratio policy is device-dependent. No static tier thresholds: the plugin reports the unbounded forward and leaves the cap to you.                                 |
| [awesome-threejs](https://github.com/AxiomeCG/awesome-threejs)                                                                      | Source index used to find the projects above. No ESLint tooling of its own.                                                                                                          |
| [THREE.Terrain](https://github.com/IceCreamYou/THREE.Terrain)                                                                       | Motivated the deferred `BufferAttribute` upload and ownership analysis.                                                                                                              |
| [r3f-perf](https://github.com/utsuboco/r3f-perf)                                                                                    | Shader-program and runtime measurement evidence behind `no-shader-recompile-in-render-loop`. Its metrics are runtime-only, so no rule reads them.                                    |
| [Perplexity search](https://www.perplexity.ai/search/give-me-a-list-of-eslint-rules-emffLUbiQCKaP0eHqFPohw)                         | Discovery leads only. No claim accepted without independent verification.                                                                                                            |
| [Three.js performance audit (this repository)](https://github.com/tjboudreaux/three-js-lint/blob/main/THREEJS-PERFORMANCE-AUDIT.md) | 1,232 issues / 16,148 comments / 96 static-lint causes / 19 enforceable / 77 rejected. As of `2026-08-07 UTC`, 63.1% of issues name a performance mechanism and 32.1% establish one. |

The audit is the repository-local evidence base for the rule surface: it enumerates every root cause
labelled `static_lint` and records, one row per cause, whether a conservative syntax rule can prove
its precondition. Nineteen causes have a sound syntax slice and map to the rules above; the other 77
are rejected with an explicit reason, grouped by whether the missing precondition is core/upstream,
runtime or scene-scale, asset or numeric, ownership and lifetime, or generic interprocedural
JavaScript. Neither the audit nor its per-issue register ships in the npm package.

Primary Three.js sources used for rule semantics, read at `three@0.185.0` (r185):

- [Responsive design manual](https://threejs.org/manual/en/responsive.html)
- [How to update things manual](https://threejs.org/manual/en/how-to-update-things.html)
- [`Object3D.js`](https://github.com/mrdoob/three.js/blob/r185/src/core/Object3D.js)
- [`Material.js`](https://github.com/mrdoob/three.js/blob/r185/src/materials/Material.js)
- [`WebGLRenderer.js`](https://github.com/mrdoob/three.js/blob/r185/src/renderers/WebGLRenderer.js)
- [common `Renderer.js`](https://github.com/mrdoob/three.js/blob/r185/src/renderers/common/Renderer.js)
- [`BufferGeometry.js`](https://github.com/mrdoob/three.js/blob/r185/src/core/BufferGeometry.js)
- [`Curve.js`](https://github.com/mrdoob/three.js/blob/r185/src/extras/core/Curve.js)
- [`Raycaster.js`](https://github.com/mrdoob/three.js/blob/r185/src/core/Raycaster.js)
- [`NodeMaterials.js`](https://github.com/mrdoob/three.js/blob/r185/src/materials/nodes/NodeMaterials.js)
- [`Addons.js`](https://github.com/mrdoob/three.js/blob/r185/examples/jsm/Addons.js)

## Contributing

```sh
pnpm install --frozen-lockfile
pnpm verify
```

`pnpm verify` runs, in order: format check, self-lint, strict typecheck, NodeNext build, the
RuleTester suite against all four pinned ESLint versions, the coverage-gated suite, the README/docs
consistency check, and a packed-tarball consumer smoke test.

To run the packed artifact against a specific ESLint release:

```sh
pnpm pack:smoke -- --eslint 9.22.0
```

New rules must ship with a docs page, RuleTester coverage for both the positive and the negative
side of every resolution boundary, and an entry in the research table above.

### Versioning and migration

The npm name `eslint-plugin-threejslint` is unused: as of `2026-08-07 UTC` the registry returns 404 for it,
so no version of this package has ever been published. `0.1.0` is therefore the first release and
there are **no installed users to migrate** — the eighteen-rule surface documented above is the
initial surface, not an expansion of a shipped one.

Were a version already published, the preset expansion would be the breaking part: `three/recommended`
enables twelve rules, six more than a six-rule release did, so an upgrade could surface new errors in
code that previously passed. The migration is to disable individual rule IDs while you work through
them:

```js
// eslint.config.mjs
import { defineConfig } from "eslint/config";
import threeLint from "eslint-plugin-threejslint";

export default defineConfig({
  plugins: { three: threeLint },
  extends: ["three/recommended"],
  rules: { "three/no-three-allocating-call-in-render-loop": "off" },
});
```

The recommended partition is decided on evidence strength, not on avoiding a semver decision, so a
rule is never left out of `three/recommended` merely to keep an upgrade quiet.

### Maintainer release

Do not run these steps as part of ordinary development.

npm cannot configure a Trusted Publisher for a package that does not exist yet
([npm/cli#8544](https://github.com/npm/cli/issues/8544)), so the very first publish needs a one-time
interactive bootstrap:

1. Confirm the name is still available on npm, then run full verification on a clean checkout.
2. In a **disposable copy** of the tree, run `pnpm version 0.0.0-oidc-bootstrap --no-git-tag-version`
   and `pnpm verify` again, then publish that functioning prerelease interactively:
   `npm publish --access public --tag oidc-bootstrap`.
3. Discard the copy. The main tree stays at `0.1.0`.
4. Configure npm Trusted Publisher for repository `tjboudreaux/three-js-lint` and workflow
   `release.yml`.
5. Create the `0.1.0` GitHub release. `release.yml` publishes it with provenance over OIDC.
6. Deprecate the bootstrap:
   `npm deprecate eslint-plugin-threejslint@0.0.0-oidc-bootstrap "OIDC bootstrap only; use ^0.1.0."`

The bootstrap prerelease is a real, working build — never a placeholder or no-op package. If Trusted
Publisher setup cannot be completed, the `0.1.0` release stops until it can. No long-lived npm token
and no workflow token fallback is permitted.

## License

[MIT](LICENSE) © 2026 tjboudreaux
