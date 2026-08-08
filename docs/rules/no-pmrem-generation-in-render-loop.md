# no-pmrem-generation-in-render-loop

Reports a `PMREMGenerator` generation call inside a verified render-loop callback. Generation runs a
chain of prefilter render passes over a cube target — measured above 70 ms in the audited issues — so
calling it per frame turns a one-time environment-map bake into a recurring stall. The message ID is
`pmremGenerationInLoop`:

> Calling {{generator}}.{{method}}() inside this verified render-loop callback regenerates an
> environment-map prefilter; cache the result outside the repeated path.

## Why this exists

PMREM generation performs multiple prefiltering render passes to build an environment map. Triggering
that work from a frame callback can stall the main thread and GPU; generation belongs at a loading or
scene-transition boundary, not on the steady-state render path.

## Detection

A report requires all of the following to be statically provable:

- The reported node's nearest enclosing function is a verified render-loop callback. The recognized
  dispatch mechanisms are exactly: an unshadowed
  `requestAnimationFrame` / `window.requestAnimationFrame` / `globalThis.requestAnimationFrame`
  call; `setAnimationLoop` on a binding proven to be `new WebGLRenderer` imported from `three` or
  `new WebGPURenderer` imported from `three/webgpu`; a one-argument `setOpaqueSort` or
  `setTransparentSort` comparator installed on that same proven renderer; `onBeforeRender` or
  `onAfterRender` installed on an immutable instance of a cataloged renderable class, or declared as
  a non-static method or field on a direct subclass of one; `tick`/`tock` methods of the object
  literal passed directly to `AFRAME.registerComponent` (with `AFRAME` a namespace import of
  `aframe` or a configured global); `onBeforeRender`/`onRender` destructured from the current
  `@tresjs/core` `useLoop()`; and a React Three Fiber `useFrame` callback imported from
  `@react-three/fiber`. A callback is never recognized by its own name, and the legacy
  `useRenderLoop().onLoop` API is not recognized.
- The receiver is a plain identifier bound to an immutable (`const`) binding whose construction —
  directly or through one immutable receiver-alias hop — is `new PMREMGenerator(...)` imported from
  `three` or `three/webgpu`.
- That construction's first argument resolves, through the same one-hop constructor rules, to the
  renderer the generator's **own** module exports: a `three` generator must be driven by a `three`
  `WebGLRenderer`, and a `three/webgpu` generator by a `three/webgpu` `WebGPURenderer`.
- The method is a generation method of that same module, called with a non-spread argument count in
  range:
  - `three`: `fromScene` with one to five arguments; `fromEquirectangular` and `fromCubemap` with one
    or two.
  - `three/webgpu`: the same three, plus the deprecated `fromSceneAsync` with one to five and
    `fromEquirectangularAsync` / `fromCubemapAsync` with one or two.

The `method` value in the message is the canonical catalog key, so a computed `generator["fromScene"]`
reports `fromScene`.

## Not reported

- `fromSceneAsync`, `fromEquirectangularAsync`, and `fromCubemapAsync` on a `three` generator: the
  classic generator does not define them.
- `compileCubemapShader`, `compileEquirectangularShader`, and `dispose`. None runs the prefilter
  chain.
- A cross-module renderer, such as a `three` generator constructed from a `WebGPURenderer`, and an
  unknown or unresolved renderer argument.
- A generator constructed with no arguments or with a spread.
- An invalid arity, such as `fromScene()` or a six-argument `fromScene`.
- A user class named `PMREMGenerator`, and a same-named generator from any other module.
- An unproven instance, such as `cache.generator.fromScene(scene)`.
- A mutable or two-hop receiver.
- Generation inside a helper or a nested closure.

## Static limits

This plugin performs no runtime analysis: it does not estimate callback frequency, FPS, GPU time,
draw calls, asset encoding, resource ownership, iteration count, or scene suitability.

Specific to this rule: it cannot know the target's resolution, how many mip levels the chain will
produce, or whether the environment actually changed since the previous frame. A scene whose lighting
genuinely changes every frame may have no cheaper option; this rule reports the repeated call and
leaves that judgement to you.

## Examples

### Incorrect

```js
import { PMREMGenerator, WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const generator = new PMREMGenerator(renderer);
requestAnimationFrame(() => {
  scene.environment = generator.fromScene(scene).texture;
});
```

```js
import { PMREMGenerator, WebGPURenderer } from "three/webgpu";
const renderer = new WebGPURenderer();
const generator = new PMREMGenerator(renderer);
requestAnimationFrame(() => {
  generator.fromEquirectangularAsync(texture);
});
```

### Correct

```js
import { PMREMGenerator, WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const generator = new PMREMGenerator(renderer);
const environment = generator.fromScene(scene);
requestAnimationFrame(() => {
  scene.environment = environment.texture;
});
```

```js
import { PMREMGenerator, WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const generator = new PMREMGenerator(renderer);
requestAnimationFrame(() => {
  generator.dispose();
});
```

## Options

This rule has no options. Its schema is `[]`, so ESLint rejects any configured options.

## Suggestions

This rule provides no editor suggestions and is never autofixable.

## Parsers and imports

The rule is parser-neutral and works under Espree and `@typescript-eslint/parser`. TypeScript
wrappers (`as`, `satisfies`, `!`, angle-bracket assertions) and optional chaining are transparent to
resolution. Recognized module specifiers are exactly `three` and `three/webgpu`; a deep path such as
`three/src/math/Vector3.js`, a re-export barrel, or an addon module is not recognized by this rule. Type-only imports, default imports, and `require()` are never runtime imports and
never establish provenance. Resolution follows a direct named import, a namespace member access, or
exactly one immutable `const` alias hop; a second hop, a mutable binding, or a dynamic member name
stays unresolved. The plugin never loads Three.js or any framework package — it inspects import
syntax only.

## Presets

Enabled by `three/recommended` and `three/all`.

## References

- [Three.js `PMREMGenerator.js` source (`three`)](https://github.com/mrdoob/three.js/blob/r185/src/extras/PMREMGenerator.js)
  — `fromScene`, `fromEquirectangular`, and `fromCubemap` signatures and the prefilter chain.
- [Three.js `PMREMGenerator.js` source (`three/webgpu`)](https://github.com/mrdoob/three.js/blob/r185/src/renderers/common/extras/PMREMGenerator.js)
  — the three additional `...Async` names, deprecated in r181 in favour of `await renderer.init()`.
- [Three.js `WebGLRenderer.js` source](https://github.com/mrdoob/three.js/blob/r185/src/renderers/WebGLRenderer.js)
  — the renderer a `three` generator requires.
- [Three.js common `Renderer.js` source](https://github.com/mrdoob/three.js/blob/r185/src/renderers/common/Renderer.js)
  — the renderer a `three/webgpu` generator requires.
- Audit cause `RTP-07` in [the repository's Three.js performance audit](../../THREEJS-PERFORMANCE-AUDIT.md).
