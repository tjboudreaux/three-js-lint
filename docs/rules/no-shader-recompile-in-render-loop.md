# no-shader-recompile-in-render-loop

Reports `material.needsUpdate = true` assignments inside verified render-loop callbacks, where
`material` is provably a Three.js `Material` instance. Setting `needsUpdate` bumps the material's
version counter, which makes `WebGLRenderer` re-run its program setup for that material. When the
flag is set on a frame path, shader program work is requested every frame; invalidation belongs in
the code that actually changed the material, outside the repeated path. The message ID is
`materialNeedsUpdateInLoop`:

> Setting {{material}}.needsUpdate to true inside this verified render-loop callback requests
> shader program work; move invalidation outside the repeated path.

## Detection

A report requires all of the following to be statically provable:

- The assignment's nearest enclosing function is a verified render-loop callback. The recognized
  dispatch mechanisms are exactly: an unshadowed
  `requestAnimationFrame` / `window.requestAnimationFrame` / `globalThis.requestAnimationFrame`
  call; `setAnimationLoop` called on a binding proven to be `new WebGLRenderer` imported from
  `three` or `new WebGPURenderer` imported from `three/webgpu`; `tick`/`tock` methods of the object
  literal passed directly to `AFRAME.registerComponent` (with `AFRAME` a namespace import of
  `aframe` or a configured global); `onBeforeRender`/`onRender` destructured from the current
  `@tresjs/core` `useLoop()`; and a React Three Fiber `useFrame` callback imported from
  `@react-three/fiber`. Unlike the allocation rule, this rule includes `useFrame`. A callback is
  never recognized by its name alone, and the legacy `useRenderLoop().onLoop` API is not
  recognized.
- The operator is exactly `=` (compound assignments such as `||=` are ignored).
- The left side is a static member access whose property name is exactly `needsUpdate`; the owner
  is a plain identifier (member owners such as `mesh.material.needsUpdate` are never resolved).
- The right side is the boolean literal `true` and nothing else.
- The owner identifier resolves to an immutable (`const`) binding initialized with a `new`
  expression whose constructor comes from `three` or `three/webgpu` — via a direct named import, a
  namespace member (`THREE.MeshStandardMaterial`), or exactly one immutable `const` alias hop — and
  whose exported name is one of the 18 enumerated material classes: `Material`, `ShadowMaterial`,
  `SpriteMaterial`, `RawShaderMaterial`, `ShaderMaterial`, `PointsMaterial`, `MeshStandardMaterial`,
  `MeshPhysicalMaterial`, `MeshPhongMaterial`, `MeshToonMaterial`, `MeshNormalMaterial`,
  `MeshLambertMaterial`, `MeshMatcapMaterial`, `MeshBasicMaterial`, `MeshDepthMaterial`,
  `MeshDistanceMaterial`, `LineBasicMaterial`, `LineDashedMaterial`.

The class list is enumerated rather than matched on a `Material` name suffix, so a user-defined
class named `FoamMaterial` is never mistaken for a Three.js material.

Only one report is emitted per `needsUpdate = true` write. An accompanying `defines` or
`onBeforeCompile` write in the same callback is represented by that single report and never
produces a second one.

## Not reported

- `material.needsUpdate = false` — clearing the flag requests no recompilation.
- A dynamic right-hand side, such as `material.needsUpdate = shouldRecompile`.
- Compound assignment, such as `material.needsUpdate ||= true`.
- Standalone `defines`, `onBeforeCompile`, shader-source (`fragmentShader`), `uniforms`, or
  `customProgramCacheKey` writes with no `needsUpdate = true` in the same callback.
- `needsUpdate` on textures and `BufferAttribute`s — those set a different upload path and are not
  material version bumps, so `DataTexture` and `BufferAttribute` instances are outside the class
  list.
- Unknown member owners such as `mesh.material.needsUpdate = true`.
- Materials held in mutable bindings (a `let` that is reassigned).
- Computed property names, such as `material[flagName] = true`.
- Writes inside a callback nested in the loop callback — only the direct body of the verified
  callback is inspected.
- Any write outside a verified render-loop callback, including invalidation in event handlers or
  setup code.
- User classes whose names merely end in `Material`.

## Static limits

This plugin performs no runtime analysis: it does not estimate callback frequency, FPS, GPU time,
draw calls, asset encoding, resource ownership, iteration count, or scene suitability.

Specific to this rule: it cannot know whether the reported material is actually rendered by the
loop it appears in, whether the shader program is already cached, or how expensive a given
recompilation is on the target GPU. It also cannot follow a material through a function call, a
member expression, or a mutable binding, so aliasing beyond one immutable `const` hop hides the
write.

## Examples

### Incorrect

```js
import { MeshStandardMaterial } from "three";
const material = new MeshStandardMaterial();
requestAnimationFrame(() => {
  material.needsUpdate = true;
});
```

```js
import { useFrame } from "@react-three/fiber";
import { ShaderMaterial } from "three";
const material = new ShaderMaterial();
useFrame(() => {
  material.needsUpdate = true;
});
```

### Correct

```js
import { MeshStandardMaterial } from "three";
const material = new MeshStandardMaterial();
material.needsUpdate = true;
```

```js
import { ShaderMaterial } from "three";
const material = new ShaderMaterial();
requestAnimationFrame(() => {
  material.uniforms.uTime.value = 1;
});
```

## Options

This rule has no options. Its schema is `[]`, and it ignores any configuration passed to it.

## Suggestions

This rule provides no editor suggestions and is never autofixable.

## Parsers and imports

The rule is parser-neutral and works under Espree and `@typescript-eslint/parser`. TypeScript
wrappers (`as`, `satisfies`, `!`, angle-bracket assertions) and optional chaining are transparent
to resolution, so `material!.needsUpdate = true` is still reported. Type-only imports and
`require()` are not runtime imports and never establish a constructor's provenance. There is no
JSX-specific handling; assignments in JSX/TSX files are analyzed like any other expression. The
plugin never loads Three.js or any framework package — it inspects import syntax only.

## Presets

Enabled by `three/recommended` and `three/all`.

## References

- [Three.js `Material.js` source](https://github.com/mrdoob/three.js/blob/master/src/materials/Material.js)
  — the `version` counter that `needsUpdate` increments.
- [Three.js `WebGLRenderer.js` source](https://github.com/mrdoob/three.js/blob/master/src/renderers/WebGLRenderer.js)
  — the version gate that triggers program work for an updated material.
- [Three.js manual: how to update things](https://threejs.org/manual/en/how-to-update-things.html)
  — which object changes require `needsUpdate`.
