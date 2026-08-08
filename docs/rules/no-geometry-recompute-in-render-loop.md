# no-geometry-recompute-in-render-loop

Reports a full-scan `BufferGeometry` recomputation inside a verified render-loop callback.
`computeBoundingBox`, `computeBoundingSphere`, `computeTangents`, and `computeVertexNormals` each walk
every vertex or index of the geometry, so calling one per frame rescans data that only changes when the
geometry does. The message ID is `geometryRecomputeInLoop`:

> Calling {{geometry}}.{{method}}() inside this verified render-loop callback rescans geometry data;
> recompute only when the geometry changes.

## Why this exists

Geometry recomputation methods rebuild derived data by scanning attributes or vertices. Running them
in a render loop repeats CPU work that should normally happen after a geometry change, and can make
otherwise cheap frames contend with full-buffer calculations.

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
- The callee is a static member access named exactly `computeBoundingBox`, `computeBoundingSphere`,
  `computeTangents`, or `computeVertexNormals`, called with no arguments and no spread.
- The receiver is a plain identifier bound to an immutable (`const`) binding whose construction —
  directly or through one immutable receiver-alias hop — is a `new` expression whose constructor is
  imported from `three` or `three/webgpu` and is one of the 23 concrete geometry classes:
  `BufferGeometry`, `InstancedBufferGeometry`, and the 21 generator geometries r185 exports
  (`BoxGeometry`, `CapsuleGeometry`, `CircleGeometry`, `ConeGeometry`, `CylinderGeometry`,
  `DodecahedronGeometry`, `EdgesGeometry`, `ExtrudeGeometry`, `IcosahedronGeometry`, `LatheGeometry`,
  `OctahedronGeometry`, `PlaneGeometry`, `PolyhedronGeometry`, `RingGeometry`, `ShapeGeometry`,
  `SphereGeometry`, `TetrahedronGeometry`, `TorusGeometry`, `TorusKnotGeometry`, `TubeGeometry`,
  `WireframeGeometry`).

The class list is enumerated rather than matched on a `Geometry` name suffix, so a user class named
`TerrainGeometry` is never mistaken for a Three.js geometry.

## Not reported

- A user class whose name merely ends in `Geometry`, and a local subclass of a Three.js geometry: the
  subclass may override the method entirely.
- A geometry inferred from a loader result, a helper, or a member access such as `mesh.geometry`. None
  of those proves the class from syntax.
- `normalizeNormals`, which is a per-normal pass with no scan-and-cache contract, and `toNonIndexed`,
  which returns a new geometry rather than refreshing a cache.
- Attribute mutations such as `geometry.attributes.position.needsUpdate = true`.
- A recompute call with any argument, or with a spread argument.
- A dynamic method name, a mutable receiver, and a two-hop receiver alias.
- Work outside the verified callback, or inside a helper or a nested closure.
- Same-named geometry classes from any other module.

## Static limits

This plugin performs no runtime analysis: it does not estimate callback frequency, FPS, GPU time,
draw calls, asset encoding, resource ownership, iteration count, or scene suitability.

Specific to this rule: it cannot know the vertex count, whether positions actually changed this frame,
or whether the cached bound is still valid. Geometry that genuinely deforms every frame must recompute
every frame — which is exactly why this rule is opt-in rather than recommended.

## Examples

### Incorrect

```js
import { BufferGeometry } from "three";
const geometry = new BufferGeometry();
requestAnimationFrame(() => {
  geometry.computeVertexNormals();
});
```

```js
import { SphereGeometry } from "three";
const geometry = new SphereGeometry();
requestAnimationFrame(() => {
  geometry.computeBoundingSphere();
});
```

### Correct

```js
import { BufferGeometry } from "three";
const geometry = new BufferGeometry();
geometry.computeVertexNormals();
requestAnimationFrame(() => {
  render();
});
```

```js
import { BufferGeometry } from "three";
const geometry = new BufferGeometry();
requestAnimationFrame(() => {
  geometry.attributes.position.needsUpdate = true;
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

Enabled by `three/all` only. It is not part of `three/recommended`.

## References

- [Three.js `BufferGeometry.js` source](https://github.com/mrdoob/three.js/blob/r185/src/core/BufferGeometry.js)
  — the four zero-argument recompute methods and the caches they refresh.
- [Three.js `Geometries.js` source](https://github.com/mrdoob/three.js/blob/r185/src/geometries/Geometries.js)
  — the exact set of 21 exported generator geometries.
- [Three.js `InstancedBufferGeometry.js` source](https://github.com/mrdoob/three.js/blob/r185/src/core/InstancedBufferGeometry.js)
  — the remaining concrete subclass.
- [Three.js manual: how to update things](https://threejs.org/manual/en/how-to-update-things.html)
  — which geometry changes require a recompute.
- Audit causes `CAH-20` and `GBU-06` in [the repository's Three.js performance audit](../../THREEJS-PERFORMANCE-AUDIT.md).
