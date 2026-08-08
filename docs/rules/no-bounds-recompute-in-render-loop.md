# no-bounds-recompute-in-render-loop

Reports a full-scan Three.js bounds recomputation inside a verified render-loop callback. `Box3`'s
object and buffer scans walk every descendant or every vertex, and the object-level
`computeBoundingBox`/`computeBoundingSphere` methods rescan the whole instance or skin buffer, so
calling them per frame re-derives data that usually did not change. The message ID is
`boundsRecomputeInLoop`:

> Calling {{receiver}}.{{method}}() inside this verified render-loop callback scans bounds data; cache
> or narrow repeated recomputation when scene semantics allow.

## Why this exists

Bounds queries such as `setFromObject()` and `computeBoundingSphere()` can scan an entire scene graph
or buffer on every invocation. Doing that in a render loop turns a one-time or change-triggered
calculation into recurring CPU work and can consume the frame budget even when the scene is unchanged.

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
  directly or through one immutable receiver-alias hop — is a `new` expression whose constructor is
  imported from `three` or `three/webgpu`.
- The class and method are a cataloged pair, with a non-spread argument count in range:
  - `Box3.setFromObject(object, precise?)` and `expandByObject(object, precise?)` — one or two.
  - `Box3.setFromBufferAttribute`, `setFromArray`, and `setFromPoints` — exactly one.
  - `Sphere.setFromPoints(points, optionalCenter?)` — one or two.
  - `BoxHelper.setFromObject(object)` — exactly one.
  - `BoxHelper.update()`, `InstancedMesh.computeBoundingBox`/`computeBoundingSphere`,
    `SkinnedMesh.computeBoundingBox`/`computeBoundingSphere`, and
    `BatchedMesh.computeBoundingBox`/`computeBoundingSphere` — exactly zero.
- For the zero-argument methods, the receiver's own construction must also carry the data the method
  scans, with no spread:
  - `BoxHelper` — one or two arguments, first not statically `null`, unshadowed `undefined`, or `void`.
  - `InstancedMesh` — exactly three arguments, with non-nullish geometry and count slots.
  - `SkinnedMesh` — one or two arguments, with a non-nullish geometry slot.
  - `BatchedMesh` — two to four arguments, with non-nullish maximum-instance and maximum-vertex slots.

  Optional material, index, and colour slots may be omitted or explicitly `undefined`.

## Not reported

- Cheap unions and single-point updates: `Box3#expandByPoint`, `Box3#expandByVector`,
  `Box3#expandByScalar`, `Box3#union`, and `Sphere#expandByPoint`. Each touches one datum, not a whole
  buffer or subtree.
- Required-target getters such as `Box3#getCenter` and `Box3#getSize`.
- `Mesh`, which has no cataloged bounds method of its own.
- `BoxHelper.update()` without a proven object: a helper built with no argument, or with a statically
  `null`, `undefined`, or `void` object, has nothing to rescan.
- An object-level compute method whose construction has the wrong arity, a spread, or a statically
  nullish required slot.
- An invalid call arity, such as a two-argument `setFromBufferAttribute` or a three-argument
  `setFromObject`.
- A user class with a matching method name, and a same-named class from any other module.
- A mutable receiver, a two-hop receiver alias, and a dynamic method name.
- Work outside the verified callback, or inside a helper or a nested closure.

## Static limits

This plugin performs no runtime analysis: it does not estimate callback frequency, FPS, GPU time,
draw calls, asset encoding, resource ownership, iteration count, or scene suitability.

Specific to this rule: it cannot know how many descendants or vertices the scan touches, whether the
data actually changed since the previous frame, or whether a cached bound would be stale. A small
mesh whose vertices change every frame genuinely needs a per-frame recompute — which is exactly why
this rule is opt-in rather than recommended.

## Examples

### Incorrect

```js
import { Box3 } from "three";
const bounds = new Box3();
requestAnimationFrame(() => {
  bounds.setFromObject(scene);
});
```

```js
import { InstancedMesh } from "three";
const mesh = new InstancedMesh(geometry, material, 1000);
requestAnimationFrame(() => {
  mesh.computeBoundingSphere();
});
```

### Correct

```js
import { Box3 } from "three";
const bounds = new Box3();
bounds.setFromObject(scene);
requestAnimationFrame(() => {
  follow(bounds);
});
```

```js
import { Box3 } from "three";
const bounds = new Box3();
requestAnimationFrame(() => {
  bounds.expandByPoint(head.position);
});
```

## Options

This rule has no options. Its schema is `[]`, and it ignores any configuration passed to it.

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

- [Three.js `Box3.js` source](https://github.com/mrdoob/three.js/blob/r185/src/math/Box3.js)
  — `setFromObject`, `expandByObject`, and the buffer and array scans.
- [Three.js `Sphere.js` source](https://github.com/mrdoob/three.js/blob/r185/src/math/Sphere.js)
  — `setFromPoints( points, optionalCenter )`.
- [Three.js `BoxHelper.js` source](https://github.com/mrdoob/three.js/blob/r185/src/helpers/BoxHelper.js)
  — `constructor( object, color )`, `update()`, and `setFromObject( object )`.
- [Three.js `InstancedMesh.js` source](https://github.com/mrdoob/three.js/blob/r185/src/objects/InstancedMesh.js)
  — `constructor( geometry, material, count )` and its bounds methods.
- [Three.js `SkinnedMesh.js` source](https://github.com/mrdoob/three.js/blob/r185/src/objects/SkinnedMesh.js)
  — `constructor( geometry, material )` and its bounds methods.
- [Three.js `BatchedMesh.js` source](https://github.com/mrdoob/three.js/blob/r185/src/objects/BatchedMesh.js)
  — `constructor( maxInstanceCount, maxVertexCount, maxIndexCount, material )`.
- Audit causes `CAH-20`, `GBU-06`, and `TS-07` in [the repository's Three.js performance audit](../../THREEJS-PERFORMANCE-AUDIT.md).
