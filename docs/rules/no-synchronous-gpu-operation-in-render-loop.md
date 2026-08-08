# no-synchronous-gpu-operation-in-render-loop

Reports a synchronous GPU readback or explicit pipeline flush inside a verified render-loop callback.
`readRenderTargetPixels`, `gl.readPixels` into client memory, and `gl.finish` all block the CPU until
queued GPU work completes, which serializes the frame and destroys pipelining. The message ID is
`synchronousGpuOperationInLoop`:

> Calling {{operation}}() inside this verified render-loop callback can block the CPU until queued GPU
> work completes; use asynchronous readback or move synchronization outside the repeated path.

## Why this exists

Synchronous readbacks and explicit GPU flushes force the CPU to wait for outstanding GPU work. In a
render loop that turns an otherwise pipelined frame into a blocking round trip and can create
visible hitches even when the readback itself is small.

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
- One of two shapes:
  - **Renderer readback.** `readRenderTargetPixels` called with six, seven, or eight non-spread
    arguments on a receiver proven to be `new WebGLRenderer` imported from `three`, where the buffer
    at index 5 is an accepted client-memory view construction.
  - **Raw context.** `finish()` with exactly no arguments, or `readPixels(...)` with seven or eight
    non-spread arguments whose destination at index 6 is an accepted client-memory view construction,
    on a receiver that is either a direct zero-argument `renderer.getContext()` call or one immutable
    binding initialized by exactly that call, with the same `three` `WebGLRenderer` provenance.
- An accepted client-memory view is a direct construction, or one immutable receiver-alias hop to a
  construction, of an unshadowed global `Int8Array`, `Uint8Array`, `Uint8ClampedArray`, `Int16Array`,
  `Uint16Array`, `Int32Array`, `Uint32Array`, `Float32Array`, or `DataView`. The numeric views take
  zero to three non-spread arguments; `DataView` takes one to three, and its first argument must not
  be statically `null`, unshadowed `undefined`, or `void`.

The `operation` value is the source text of the unwrapped static member callee, so a report names
`gl.readPixels` or `renderer.readRenderTargetPixels` exactly as written.

## Not reported

- Asynchronous WebGL readback such as `readRenderTargetPixelsAsync`, and every WebGPU readback path:
  a `three/webgpu` `WebGPURenderer` never matches, and neither does its context.
- A numeric `readPixels` offset, which addresses a pixel buffer object rather than client memory and
  does not stall.
- `ArrayBuffer`, which is not a view, and `Float16Array`, `Float64Array`, `BigInt64Array`, and
  `BigUint64Array`, none of which is a WebGL `readPixels` destination type.
- A null, unknown, or member-derived destination, and a shadowed view constructor such as a local
  `class Uint8Array {}`.
- A `DataView` over a statically nullish buffer, or with no arguments at all.
- A view constructed with four arguments or with a spread.
- A canvas-obtained context, a `getContext` call with an argument, a context reached through two hops,
  a mutable context binding, and any unrelated object that merely has a `finish`, `readPixels`, or
  `getContext` method.
- An invalid call arity, such as a six-argument `readPixels` or a five-argument
  `readRenderTargetPixels`.
- Calls outside the verified callback, or inside a helper or a nested closure.
- A dynamic method name, and a same-named renderer from any other module.

## Static limits

This plugin performs no runtime analysis: it does not estimate callback frequency, FPS, GPU time,
draw calls, asset encoding, resource ownership, iteration count, or scene suitability.

Specific to this rule: it cannot know how much work is actually queued when the call happens, how
large the read region is, or whether the driver would have stalled anyway. It also cannot see a
context obtained anywhere other than the two shapes above, so a context passed into a helper is
invisible.

## Examples

### Incorrect

```js
import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const pixels = new Uint8Array(4);
requestAnimationFrame(() => {
  renderer.readRenderTargetPixels(target, 0, 0, 1, 1, pixels);
});
```

```js
import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const gl = renderer.getContext();
requestAnimationFrame(() => {
  gl.finish();
});
```

### Correct

```js
import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const pixels = new Uint8Array(4);
requestAnimationFrame(() => {
  renderer.readRenderTargetPixelsAsync(target, 0, 0, 1, 1, pixels);
});
```

```js
import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const gl = renderer.getContext();
requestAnimationFrame(() => {
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, 0);
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
syntax only. The typed-array and `DataView` constructors are resolved as unshadowed
globals rather than as imports.

## Presets

Enabled by `three/recommended` and `three/all`.

## References

- [Three.js `WebGLRenderer.js` source](https://github.com/mrdoob/three.js/blob/r185/src/renderers/WebGLRenderer.js)
  — `readRenderTargetPixels( renderTarget, x, y, width, height, buffer, activeCubeFaceIndex, textureIndex )`
  and `getContext()`.
- [Three.js common `Renderer.js` source](https://github.com/mrdoob/three.js/blob/r185/src/renderers/common/Renderer.js)
  — the WebGPU renderer's asynchronous readback surface, which this rule never reports.
- [WebGL 2.0 specification](https://registry.khronos.org/webgl/specs/latest/2.0/) — `readPixels`
  overloads, including the pixel-buffer-object offset form.
- [MDN: `WebGLRenderingContext.finish()`](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/finish)
  — blocking until all queued commands complete.
- Audit causes `CGSS-01` and `CGSS-03` in [the repository's Three.js performance audit](../../THREEJS-PERFORMANCE-AUDIT.md).
