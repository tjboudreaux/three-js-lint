# no-three-allocation-in-render-loop

Disallow allocating Three.js objects in verified render-loop callbacks. A callback that runs every
frame and executes `new Vector3()`, `new Euler()`, or `someMatrix.clone()` creates garbage on every
frame; the resulting GC pressure shows up as frame-time spikes and hitches. The standard fix is to
construct scratch objects once, outside the loop, and mutate them in place with `.set()`, `.copy()`,
or similar methods. This rule reports `new` expressions whose constructor provably comes from
Three.js, and `.clone()` calls on provably Three-constructed bindings, when they appear directly in
a callback the plugin can prove runs on a render loop.

## Why this exists

Allocating Three.js objects or clones per frame creates garbage at the same rate as the render loop.
The resulting garbage-collection work is unpredictable and can show up as frame-time spikes, while
hoisted scratch objects provide the same mutable state without recurring allocation.

## Detection

A report requires a verified render-loop callback plus a provable Three.js allocation inside it.

A callback counts as a render-loop callback only through one of these dispatch mechanisms:

- An unshadowed `requestAnimationFrame`, `window.requestAnimationFrame`, or
  `globalThis.requestAnimationFrame` call.
- `setAnimationLoop` on a binding proven to be `new WebGLRenderer(...)` from `three` or
  `new WebGPURenderer(...)` from `three/webgpu` (including one immutable `const` alias hop).
- The `tick` or `tock` method of an object literal passed directly to `AFRAME.registerComponent`,
  where `AFRAME` is a namespace import of `aframe` or a global the ESLint configuration declares
  (for example `languageOptions: { globals: { AFRAME: "readonly" } }`).
- `onBeforeRender` or `onRender` destructured from a `useLoop()` call imported from
  `@tresjs/core`.
- A one-argument `setOpaqueSort` or `setTransparentSort` comparator installed on that same proven
  renderer. A render-list comparator runs once per comparison, so it is a strictly hotter path than
  the frame callback that triggers the sort.
- `onBeforeRender` or `onAfterRender` installed with a plain `=` on an immutable instance of a
  cataloged renderable class (`Scene`, `Mesh`, `SkinnedMesh`, `InstancedMesh`, `BatchedMesh`, `Line`,
  `LineSegments`, `Points`, `Sprite`, and the nine renderable helpers `AxesHelper`, `Box3Helper`,
  `BoxHelper`, `CameraHelper`, `GridHelper`, `PlaneHelper`, `PointLightHelper`, `PolarGridHelper`,
  `SkeletonHelper`), or declared as a non-static method or field on a direct subclass of one.
  `LineLoop` and the renderer-specific shadow hooks are excluded: both renderers share the core
  object classes, so an object's import source cannot prove which renderer will dispatch it.

The callback itself may be an inline function or arrow, or one immutable local binding that
permanently holds a function. A callback is never recognized by its name alone.

Inside such a callback, the rule reports:

- **Construction** (`newThreeObjectInLoop`): a `new` expression whose callee resolves to a runtime
  named or namespace import from `three` or `three/webgpu` — any exported class, reached directly,
  through a renamed import, a namespace member (`THREE.Vector3`), exactly one immutable `const`
  alias hop, or one level of namespace destructuring (`const { Euler } = THREE`).
- **Cloning** (`cloneThreeObjectInLoop`): a `.clone()` call whose receiver is an identifier bound
  immutably to a value originating from such a Three.js construction.

Reports only fire when the reported node's nearest enclosing function is the verified callback, and
only the callback's own body is inspected. Because `.clone()` requires a named receiver,
`new Vector3().clone()` yields exactly one report — for the construction — not two.

## Not reported

- Constructions outside any verified loop callback.
- A reused scratch instance mutated in place, such as `scratch.set(1, 2, 3)` inside the loop.
- Constructions of non-Three classes.
- Constructors imported through deep paths such as `three/src/math/Vector3.js`.
- Loops dispatched through a shadowed `requestAnimationFrame`.
- Constructions inside a nested function or closure defined in the loop body, and constructions
  inside helper functions the loop merely calls — neither is attributed to the loop.
- React Three Fiber `useFrame` callbacks (see the note in Static limits).
- The legacy Tres `useRenderLoop().onLoop` API, which is not a verified loop.
- `setAnimationLoop` on an untracked receiver, a call result, or a binding reached through two
  alias hops.
- `.clone()` on an unresolved receiver (a parameter, a property), a mutable binding, or a
  non-Three construction.
- Type-only Three imports, which are erased at runtime.
- A-Frame component definitions where `AFRAME` is not declared or imported, and non-frame
  lifecycle methods such as `init`.
- Callbacks that reach the scheduler through a member expression, a mutable binding, or an
  unresolved identifier.

## Static limits

This plugin performs no runtime analysis: it does not estimate callback frequency, FPS, GPU time, draw calls, asset encoding, resource ownership, iteration count, or scene suitability.

**React Three Fiber `useFrame` is deliberately excluded.** The pmndrs ecosystem already owns that
diagnostic: `@react-three/eslint-plugin` ships `no-new-in-loop` and `no-clone-in-loop`, which cover
allocation inside `useFrame`, and duplicate reports from two plugins are worse than a single owner.
If you use React Three Fiber, enable those two rules from `@react-three/eslint-plugin` alongside
this plugin.

Beyond that, the rule cannot follow code across function boundaries, so allocation hidden inside a
helper the loop calls is invisible to it. It cannot measure whether a given constructor actually
allocates GPU memory, how large the allocation is, or whether the garbage it creates matters for
your frame budget — it flags the per-frame allocation pattern, not its measured cost.

## Examples

### Incorrect

```js
import { Vector3 } from "three";
requestAnimationFrame(() => {
  new Vector3();
});
```

### Correct

```js
import { Vector3 } from "three";
const scratch = new Vector3();
requestAnimationFrame(() => {
  scratch.set(1, 2, 3);
});
```

## Options

This rule has no options. Its schema is `[]`, so ESLint rejects any configured options.

## Suggestions

This rule provides no editor suggestions and is never autofixable.

## Parsers and imports

The rule is parser-neutral and works under Espree and `@typescript-eslint/parser`. TypeScript
wrappers (`as`, `satisfies`, `!`, angle-bracket assertions) and optional chaining are transparent:
`const base = new Vector3() satisfies Vector3; ... base.clone()` is reported like the plain form.
Type-only imports and `require()` are not runtime imports, so `import type { Vector3 }` and
`const THREE = require("three")` never create a tracked constructor. JSX/TSX files are handled the
same way; loop callbacks appearing inside them are visited like any other code. The plugin never
loads Three.js or any framework package; it inspects import syntax only.

## Presets

Enabled by `three/recommended` and `three/all`.

## References

- [React Three Fiber: Performance pitfalls](https://r3f.docs.pmnd.rs/advanced/pitfalls)
- [A-Frame: Best practices](https://github.com/aframevr/aframe/blob/master/docs/introduction/best-practices.md)
- [Three.js manual: How to update things](https://threejs.org/manual/en/how-to-update-things.html)
- [Three.js `WebGLRenderer.js` source](https://github.com/mrdoob/three.js/blob/r185/src/renderers/WebGLRenderer.js)
  — the `setOpaqueSort`/`setTransparentSort` comparators and the per-object render-hook dispatch.
- [Three.js common `Renderer.js` source](https://github.com/mrdoob/three.js/blob/r185/src/renderers/common/Renderer.js)
  — the same two dispatch sites in the WebGPU renderer.
- [Three.js `Object3D.js` source](https://github.com/mrdoob/three.js/blob/r185/src/core/Object3D.js)
  — the `onBeforeRender`/`onAfterRender` hook declarations.
- Audit causes `AAM-01`, `GBU-01`, `MLD-12`, `PFAG-01`, `WBO-05`, and `TS-07` in
  [the repository's Three.js performance audit](../../THREEJS-PERFORMANCE-AUDIT.md).
