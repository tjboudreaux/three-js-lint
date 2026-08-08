# Three.js Lint

Conservative, syntax-proven ESLint rules for Three.js performance and rendering.

Most Three.js performance bugs are visible in plain source: a raw `devicePixelRatio` handed to
`setPixelRatio`, a `new Vector3()` inside a frame callback, or a `needsUpdate = true` write that
requests a new GPU program on every frame. This plugin reports those patterns and nothing else.

Each rule is narrow on purpose: a report needs a resolved binding and an exact AST shape, and a
name match or a guess is never enough. When the plugin cannot prove the receiver, the import
source, or the dispatch path, it stays silent. The trade is deliberate: a linter you cannot trust
gets turned off.

Version `0.1.0` is the first release. As of `2026-08-07 UTC`, the `npm` registry returns 404 for
the package name, so it has yet to be published. Report bugs and ask questions on
[GitHub issues](https://github.com/tjboudreaux/three-js-lint/issues).

## Contents

- [Install](#install)
- [Usage](#usage)
- [Rules](#rules)
- [Scope and limits](#scope-and-limits)
- [Research basis](#research-basis)
- [Contributing](#contributing)

## Install

Three.js Lint needs:

- **ESLint** `^9.22.0 || ^10.0.0`, flat config only.
- **Node** `^20.19.0 || ^22.13.0 || >=24`. CI proves 20.19, 22.13, and 24.
- **ESM.** The package ships one ESM entry point and no CommonJS build. Use `eslint.config.mjs` or
  an ESM `eslint.config.js`.

Then install the package:

```sh
npm install --save-dev eslint-plugin-threejslint
```

The plugin has **no runtime dependencies**. It never imports Three.js, React, React Three Fiber,
Vue, TresJS, A-Frame, or three-mesh-bvh. It reads your import statements instead. You never need
those packages installed, and installing them changes nothing.

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

Both forms register the same plugin object, so rule IDs resolve the same way.

### Presets

<!-- BEGIN GENERATED CONFIGS -->

| Preset              | Rules enabled | Severity |
| ------------------- | ------------- | -------- |
| `three/all`         | 18            | `error`  |
| `three/recommended` | 12            | `error`  |

<!-- END GENERATED CONFIGS -->

`three/recommended` enables the twelve rules with evidence strong enough to be on by default.
`three/all` adds six opt-in rules, for three reasons:

- **Framework integration:** `no-new-in-jsx-props`, `no-transform-set-attribute-in-tick`, and
  `prefer-bvh-first-hit-only` depend on framework-version semantics you should confirm first
- **Full-scan recomputation:** `no-bounds-recompute-in-render-loop` and
  `no-geometry-recompute-in-render-loop` report work that small or always-changing data truly needs
- **Readability trade:** `prefer-squared-vector-magnitude` saves one square root on a hot path

`three/all` grows on its own as new rules ship. Pin a version if you need a stable rule set.

Each preset is one named config object that holds nothing but `plugins` and `rules`. There is
no parser, no `globals`, no `files`, no `languageOptions`, and no framework plugin. You keep full
control over how your files are parsed.

### TypeScript and JSX

The rules are parser-neutral. They read the AST shape and treat `as`, `satisfies`, `!`,
angle-bracket assertions, and optional chaining as transparent. The presets never set a parser, so
compose them with whatever parser your project already uses:

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

Type-only imports are ignored: they vanish at runtime and cannot construct anything.

### A-Frame projects

Two rules recognize `AFRAME.registerComponent` only when `AFRAME` comes from
`import * as AFRAME from "aframe"` or from a global your configuration declares. Declaring the
global stops a stray project global named `AFRAME` from being read as A-Frame:

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

### With @react-three/eslint-plugin

`@react-three/eslint-plugin` already owns allocation reports inside React Three Fiber's
`useFrame` callback. To avoid duplicates, `three/no-three-allocation-in-render-loop`
excludes `useFrame` while every other loop rule includes it. Enable the two upstream rules
directly, so React Three Fiber allocation stays covered:

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

Enable those two rules one by one. Spreading `@react-three/eslint-plugin`'s legacy preset fails
under flat config.

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

Every rule takes no options: each schema is `[]`, so ESLint rejects any options passed to a rule
during config validation. No rule edits your code, and `eslint --fix` never applies anything from
this plugin. Two rules offer editor suggestions, which your editor applies only on request.

Two rules report a correctness fault (`meta.type: "problem"`): `no-replace-object3d-transform` and
`no-non-numeric-vector-components`. The other sixteen report a performance or API policy
violation.

Each rule page explains why the rule exists, what it detects, what it never reports, and its
static limits. Read that page before filing a false positive. The boundary is usually
deliberate.

## Scope and limits

The rule surface is syntax-only by design. The plugin runs no runtime analysis. It does not
estimate callback rate, FPS, GPU time, draw calls, asset encoding, resource ownership, loop
counts, or scene fit.

Four boundaries define what a rule may claim.

### Import provenance

Recognized module specifiers are exactly `three`, `three/webgpu`, `react`, `vue`,
`@react-three/fiber`, `@tresjs/core`, `three-mesh-bvh`, and `aframe`. Deep paths such as
`three/src/math/Vector3.js`, re-export barrels, and `require()` are never recognized.

One rule carries a narrow exception: `three/no-three-loader-parse-in-render-loop` also recognizes
the finite `three/addons` barrel plus the official loader paths `three/addons/loaders/<File>.js`
and `three/examples/jsm/loaders/<File>.js`, where the file name must match the imported class.
Everything else stays unsupported everywhere: arbitrary `three/src` paths, other `three/addons`
directories, unlisted loader modules, user re-export barrels, default imports, and CommonJS.

### Alias resolution

A direct named import resolves. So does a `THREE.Vector3`-style member access, and a single
immutable `const` alias. Two hops never resolve.

### Callback attribution

A report fires only when the reported node's nearest enclosing function is the verified callback.
Code moved into a helper or a nested closure is never attributed to a loop.

### Dispatch proof

A render-loop callback is recognized from its registration site, never from its own name. The
proven sites are a `requestAnimationFrame` call, a `setAnimationLoop` or sort-comparator setter on
a proven renderer, and an `onBeforeRender` or `onAfterRender` hook on a proven instance of a
cataloged class or on a direct subclass of one.

Framework dispatch is proven the same way: the `tick` and `tock` methods of an
`AFRAME.registerComponent` definition, a current `@tresjs/core` `useLoop` callback, and a React
Three Fiber `useFrame` callback.

`LineLoop` render hooks and the renderer-specific shadow hooks are excluded. Both renderer classes
share the core object classes, so an object's import source cannot prove which renderer will
dispatch it.

Widening any of these bounds would change the false-positive contract. Each widening is a
separate, reviewed design choice rather than a patch.

### Rules considered and deferred

Four candidates were designed and then deferred, because syntax alone cannot establish the
precondition: texture color-space correctness, `BufferAttribute` upload batching,
projection-matrix update placement, and bounds refresh after geometry mutation. Each depends on
asset encoding or on resource ownership that a linter cannot see.

Two candidates were dropped outright: an instancing-suitability rule and a triangle-fan rule. Both
depend on scene scale and draw-call value, and those values exist only at runtime.

## Research basis

Each source below was reviewed for advice that a syntax-provable rule could enforce. Where it
could not, the reason is recorded instead. Perplexity was used only to find
candidate sources. No claim was accepted without a primary source.

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
| [r3f-perf](https://github.com/utsuboco/r3f-perf)                                                                                    | Program-compile counts and runtime measurements behind `no-shader-recompile-in-render-loop`. Its metrics are runtime-only, so no rule reads them.                                    |
| [Perplexity search](https://www.perplexity.ai/search/give-me-a-list-of-eslint-rules-emffLUbiQCKaP0eHqFPohw)                         | Discovery leads only. No claim accepted without independent verification.                                                                                                            |
| [Three.js performance audit (this repository)](https://github.com/tjboudreaux/three-js-lint/blob/main/THREEJS-PERFORMANCE-AUDIT.md) | 1,232 issues / 16,148 comments / 96 static-lint causes / 19 enforceable / 77 rejected. As of `2026-08-07 UTC`, 63.1% of issues name a performance mechanism and 32.1% establish one. |

The audit is the repository-local evidence base for the rule surface. It lists every root
cause labelled `static_lint` and records, one row per cause, whether a conservative syntax rule
can prove its precondition. Nineteen causes have a sound syntax slice and map to the rules above.

The other 77 are rejected with a stated reason, grouped by the missing precondition:
core/upstream, runtime or scene-scale, asset or numeric, ownership and lifetime, or generic
cross-function JavaScript. Neither the audit nor its per-issue register ships in the `npm`
package.

Rule semantics were read from `three@0.185.0` (r185). Manuals:

- [Responsive design manual](https://threejs.org/manual/en/responsive.html)
- [How to update things manual](https://threejs.org/manual/en/how-to-update-things.html)

Core and math sources:

- [`Object3D.js`](https://github.com/mrdoob/three.js/blob/r185/src/core/Object3D.js)
- [`Material.js`](https://github.com/mrdoob/three.js/blob/r185/src/materials/Material.js)
- [`BufferGeometry.js`](https://github.com/mrdoob/three.js/blob/r185/src/core/BufferGeometry.js)
- [`Curve.js`](https://github.com/mrdoob/three.js/blob/r185/src/extras/core/Curve.js)
- [`Raycaster.js`](https://github.com/mrdoob/three.js/blob/r185/src/core/Raycaster.js)

Renderer and add-on sources:

- [`WebGLRenderer.js`](https://github.com/mrdoob/three.js/blob/r185/src/renderers/WebGLRenderer.js)
- [common `Renderer.js`](https://github.com/mrdoob/three.js/blob/r185/src/renderers/common/Renderer.js)
- [`NodeMaterials.js`](https://github.com/mrdoob/three.js/blob/r185/src/materials/nodes/NodeMaterials.js)
- [`Addons.js`](https://github.com/mrdoob/three.js/blob/r185/examples/jsm/Addons.js)

## Contributing

```sh
pnpm install --frozen-lockfile
pnpm verify
```

`pnpm verify` runs these steps in order: format check, self-lint, strict type checking, NodeNext
build, the RuleTester suite against all four pinned ESLint versions, the coverage-gated suite, the
README and docs sync check, and a packed-tarball consumer smoke test.

To run the packed artifact against a specific ESLint release:

```sh
pnpm pack:smoke -- --eslint 9.22.0
```

New rules must ship with a docs page, RuleTester coverage for both the positive and the negative
side of every resolution boundary, and an entry in the research table above.

### Versioning and migration

The `npm` name `eslint-plugin-threejslint` is unused: as of `2026-08-07 UTC` the registry returns
404 for it, so this package has never been published. `0.1.0` is the first
release, and there are **no installed users to migrate**. The eighteen-rule surface documented
above is the initial surface.

If a version were already published, the preset expansion would be the breaking part:
`three/recommended` enables twelve rules, six more than a six-rule release did, so an upgrade
could surface new errors in code that passed before. The migration is to turn off single
rule IDs while you work through them:

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

Evidence strength decides the recommended split. A rule is never left out of
`three/recommended` merely to keep an upgrade quiet.

### Maintainer release

Do not run these steps as part of ordinary development.

`npm` cannot configure a Trusted Publisher for a package that does not exist yet
([npm/cli#8544](https://github.com/npm/cli/issues/8544)), so the very first publish needs a
one-time interactive bootstrap:

1. Confirm the name is still free on `npm`, then run `pnpm verify` on a clean checkout.
2. In a **disposable copy** of the tree, version, verify, and publish a functioning prerelease
   interactively:

   ```sh
   pnpm version 0.0.0-oidc-bootstrap --no-git-tag-version
   pnpm verify
   npm publish --access public --tag oidc-bootstrap
   ```

3. Discard the copy; the main tree stays at `0.1.0`.

With the bootstrap published, hand the release to CI:

1. Configure `npm` Trusted Publisher for repository `tjboudreaux/three-js-lint` and workflow
   `release.yml`, then create the `0.1.0` GitHub release, which `release.yml` publishes with
   provenance over OIDC.
2. Deprecate the bootstrap:

   ```sh
   npm deprecate eslint-plugin-threejslint@0.0.0-oidc-bootstrap "OIDC bootstrap only; use ^0.1.0."
   ```

The bootstrap prerelease is a real, working build, never a placeholder or no-op package. If
Trusted Publisher setup cannot be completed, the `0.1.0` release stops until it can. No long-lived
`npm` token and no workflow token fallback is permitted.

## License

[MIT](LICENSE) © 2026 tjboudreaux
