# no-three-allocating-call-in-render-loop

Reports a Three.js method call inside a verified render-loop callback that allocates a result object
on every invocation. Many Three.js math and query methods accept an optional reusable output — a
scratch vector, a scratch array, a result list — and allocate a fresh one when it is omitted; a few
allocate unconditionally. Per-frame allocation is the audited cause of GC sawtooth in frame loops. The
rule has two message IDs.

`missingReusableTargetInLoop`:

> Calling {{receiver}}.{{method}}() without a reusable output argument allocates on every verified
> render-loop callback invocation; pass a scratch target created outside the loop.

`alwaysAllocatingCallInLoop`:

> Calling {{receiver}}.{{method}}() allocates result objects on every verified render-loop callback
> invocation; move the call or reuse its result outside the loop.

## Why this exists

Many Three.js methods can write into a caller-provided target, but their no-target form allocates a
new result on every call. In a hot loop, that creates avoidable garbage and makes the reusable-target
overload an important part of the performance contract.

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
  `useRenderLoop().onLoop` API is not recognized. This rule includes `useFrame`, because
  `@react-three/eslint-plugin` covers `new` and `clone` there but has no method-call equivalent.
- The receiver is a plain identifier bound to an immutable (`const`) binding whose construction
  resolves — directly or through one immutable receiver-alias hop — to a class imported from `three`
  or `three/webgpu`.
- The class and method are a cataloged pair, and the call's non-spread argument count is in range:
  - **Optional-target point methods**, on the ten concrete point-producing curves (`ArcCurve`,
    `EllipseCurve`, `LineCurve`, `LineCurve3`, `CubicBezierCurve`, `CubicBezierCurve3`,
    `QuadraticBezierCurve`, `QuadraticBezierCurve3`, `SplineCurve`, `CatmullRomCurve3`):
    `getPoint(t, target?)` and `getPointAt(u, target?)`, target at index 1.
  - **Optional-target tangents**, on `LineCurve` and `LineCurve3` only: `getTangent(t, target?)` and
    `getTangentAt(u, target?)`.
  - **Always-allocating tangents**, on the other eight concrete curves: the inherited
    `Curve#getTangent` calls `getPoint` twice without a target, so two intermediate points are
    allocated even when a target is supplied.
  - **Always-allocating containers**, on those ten curves plus `CurvePath`, `Path`, and `Shape`:
    `getPoints(divisions?)`, `getSpacedPoints(divisions?)`, and `computeFrenetFrames(segments, closed?)`.
  - **Optional-array `toArray`**, on exactly `Vector2`, `Vector3`, `Vector4`, `Quaternion`, `Euler`,
    `Color`, `Matrix3`, and `Matrix4`: `toArray(array?, offset?)`, array at index 0.
  - **Optional result lists**: `Raycaster.intersectObject` and `intersectObjects` with one to three
    arguments and the result at index 2, and `Object3D.getObjectsByProperty(name, value, result?)`
    across the closed `Object3D` receiver set, result at index 2.
- For an optional-target entry, the target slot is omitted, statically `undefined` or `void`, or —
  for an array target — an inline array literal, which is a fresh array on every invocation.
- For an always-allocating entry, every valid non-spread call reports.

The `method` value in the message is the canonical catalog key, so a computed `value["toArray"]()`
reports `toArray`.

## Not reported

- A stable expression in the target slot, including an outer `const` scratch, a typed array, and a
  member access such as `state.scratch`. That is exactly the fix.
- A `null` target: the catalog's optional parameters use default values, which `null` does not
  trigger, so such a call is a different shape rather than a missing target.
- Point and tangent calls on `CurvePath`, `Path`, and `Shape`. `CurvePath#getPoint` returns `null` for
  an empty path, so a point on those classes cannot be shown to be produced at all.
- `getLengths`, whose result depends on an arc-length cache, and `Matrix2.toArray`, which does not
  exist.
- Required-target getters such as `Box3#getCenter`, which never allocate.
- An uncataloged method on a cataloged receiver, and an uncataloged receiver class.
- An out-of-range arity or an invalid required-argument shape, such as `getPoint()` or a
  three-argument `toArray`.
- A spread argument, which hides every argument position.
- A dynamic method name, a mutable receiver, and a two-hop receiver alias.
- Calls inside a helper or a nested closure.
- Same-named classes from any other module.

## Static limits

This plugin performs no runtime analysis: it does not estimate callback frequency, FPS, GPU time,
draw calls, asset encoding, resource ownership, iteration count, or scene suitability.

Specific to this rule: it cannot know how large the allocation is, whether the engine escape-analyses
it away, or how often the callback runs. It also cannot tell whether the "stable" expression you pass
is genuinely long-lived — a member access that returns a fresh array each read stays silent.

## Examples

### Incorrect

```js
import { Vector3 } from "three";
const position = new Vector3();
requestAnimationFrame(() => {
  send(position.toArray());
});
```

```js
import { CatmullRomCurve3 } from "three";
const curve = new CatmullRomCurve3(points);
requestAnimationFrame(() => {
  const samples = curve.getPoints(64);
  draw(samples);
});
```

### Correct

```js
import { Vector3 } from "three";
const position = new Vector3();
const scratch = [];
requestAnimationFrame(() => {
  send(position.toArray(scratch));
});
```

```js
import { CatmullRomCurve3 } from "three";
const curve = new CatmullRomCurve3(points);
const samples = curve.getPoints(64);
requestAnimationFrame(() => {
  draw(samples);
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

- [Three.js `Curve.js` source](https://github.com/mrdoob/three.js/blob/r185/src/extras/core/Curve.js)
  — the inherited `getTangent` that allocates two intermediate points regardless of its target, and
  the `getPoints`/`getSpacedPoints`/`computeFrenetFrames` containers.
- [Three.js `CurvePath.js` source](https://github.com/mrdoob/three.js/blob/r185/src/extras/core/CurvePath.js)
  — `getPoint` returning `null` for an empty path.
- [Three.js `Curves.js` source](https://github.com/mrdoob/three.js/blob/r185/src/extras/curves/Curves.js)
  — the exact set of ten concrete curves.
- [Three.js `LineCurve.js` source](https://github.com/mrdoob/three.js/blob/r185/src/extras/curves/LineCurve.js)
  — the tangent override that honours the optional target.
- [Three.js `Vector3.js` source](https://github.com/mrdoob/three.js/blob/r185/src/math/Vector3.js)
  — `toArray( array = [], offset = 0 )`.
- [Three.js `Raycaster.js` source](https://github.com/mrdoob/three.js/blob/r185/src/core/Raycaster.js)
  — `intersectObject( object, recursive = true, intersects = [] )`.
- [Three.js `Object3D.js` source](https://github.com/mrdoob/three.js/blob/r185/src/core/Object3D.js)
  — `getObjectsByProperty( name, value, result = [] )`.
- Audit cause `PFAG-01` in [the repository's Three.js performance audit](../../THREEJS-PERFORMANCE-AUDIT.md).
