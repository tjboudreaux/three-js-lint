# no-ephemeral-dispose-listener-in-render-loop

Reports `host.addEventListener("dispose", listener)` inside a verified render-loop callback, where
`host` is provably an instance of a Three.js class whose `dispose()` dispatches a `dispose` event and
`listener` is a function the callback recreates on every invocation. `EventDispatcher` appends every
registration, so a fresh closure per frame makes the host's listener array grow without bound and
keeps every captured value alive. The message ID is `ephemeralDisposeListenerInLoop`:

> This dispose listener is recreated on every verified render-loop callback invocation; register one
> stable callback outside the repeated path.

## Why this exists

Adding a `dispose` listener during every frame appends another callback to the same event target.
The listeners remain registered after the frame, so one eventual disposal can retain and invoke a
large set of duplicate closures instead of using one stable listener.

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
- The callee is a static member access named exactly `addEventListener`, called with exactly two
  non-spread arguments.
- The first argument resolves to the static string `"dispose"`.
- The receiver is a plain identifier bound to an immutable (`const`) binding whose construction —
  directly or through one immutable receiver-alias hop — is a `new` expression whose constructor is
  imported from `three` or `three/webgpu` and is one of the enumerated dispose-event hosts:
  `BufferGeometry` and its 22 subclasses, `BufferAttribute` and its ten typed and instanced
  subclasses, `Material` and the 18 classic material subclasses, the 16 `Texture` classes, and the
  `RenderTarget` bases. `WebGLCubeRenderTarget` counts only from `three`; the 17 node materials and
  the eight storage, canvas, and cube-target classes count only from `three/webgpu`.
- That construction sits **outside** the callback. The binding this rule inspects is the one whose
  initializer is the `new` expression, never a later receiver alias, so an outer host reached through
  a callback-local alias still reports.
- The listener is provably recreated per invocation: an inline function or arrow, or an immutable
  binding that permanently holds a function _and_ is declared inside that same callback.

Each catalogued class is enumerated rather than matched on a name suffix or inferred from a `dispose`
method, so a user class with its own `dispose()` is never mistaken for a Three.js resource.

## Not reported

- A stable listener declared outside the callback, whether as a `const` arrow or a function
  declaration — that is exactly the fix.
- A host constructed _inside_ the callback. Such a resource is discarded on each iteration, so its
  listener set never grows and claiming accumulation would be wrong.
- A listener that is a callback parameter, a call result, a member access, a two-hop function alias,
  or a mutable binding: none of those is provably a fresh function.
- Any event other than `dispose`, and any dynamic event name.
- `removeEventListener`, which is the cure rather than the fault.
- Classes outside the host catalog: renderers, `Object3D` subclasses, `Skeleton`, `Source`,
  interleaved and GL attributes, non-material `Node` classes, and addons.
- A source/class mismatch, such as `WebGLCubeRenderTarget` from `three/webgpu` or a node material
  from `three`.
- A spread argument, a three-argument call, or a computed dynamic method name.
- A mutable or two-hop receiver, and a direct `new Geometry().addEventListener(...)`.
- Registration inside a helper or a nested closure — only the direct body of the verified callback is
  inspected.

## Static limits

This plugin performs no runtime analysis: it does not estimate callback frequency, FPS, GPU time,
draw calls, asset encoding, resource ownership, iteration count, or scene suitability.

Specific to this rule: it cannot know whether the listener is ever removed elsewhere, how many
invocations the callback actually gets, or whether the host is disposed immediately after
registration. It also cannot follow a host through a function call, a member expression, or a mutable
binding, so aliasing beyond one immutable `const` hop hides the registration.

## Examples

### Incorrect

```js
import { BufferGeometry } from "three";
const geometry = new BufferGeometry();
requestAnimationFrame(() => {
  geometry.addEventListener("dispose", () => {
    cleanup();
  });
});
```

```js
import { Texture } from "three";
const host = new Texture();
requestAnimationFrame(() => {
  const onDispose = () => {
    cleanup();
  };
  host.addEventListener("dispose", onDispose);
});
```

### Correct

```js
import { BufferGeometry } from "three";
const geometry = new BufferGeometry();
const onDispose = () => {
  cleanup();
};
requestAnimationFrame(() => {
  geometry.addEventListener("dispose", onDispose);
});
```

```js
import { BufferGeometry } from "three";
requestAnimationFrame(() => {
  const geometry = new BufferGeometry();
  geometry.addEventListener("dispose", () => {
    cleanup();
  });
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

Enabled by `three/recommended` and `three/all`.

## References

- [Three.js `EventDispatcher.js` source](https://github.com/mrdoob/three.js/blob/r185/src/core/EventDispatcher.js)
  — `addEventListener` appends to a per-type array with no de-duplication.
- [Three.js `BufferGeometry.js` source](https://github.com/mrdoob/three.js/blob/r185/src/core/BufferGeometry.js)
  — `dispose()` dispatching `{ type: "dispose" }`.
- [Three.js `Texture.js` source](https://github.com/mrdoob/three.js/blob/r185/src/textures/Texture.js)
  — the texture dispose channel.
- [Three.js `Material.js` source](https://github.com/mrdoob/three.js/blob/r185/src/materials/Material.js)
  — the material dispose channel.
- [Three.js `RenderTarget.js` source](https://github.com/mrdoob/three.js/blob/r185/src/core/RenderTarget.js)
  — the render-target dispose channel.
- [Three.js `NodeMaterials.js` source](https://github.com/mrdoob/three.js/blob/r185/src/materials/nodes/NodeMaterials.js)
  — the 17 node-material classes exported only by `three/webgpu`.
- Audit cause `MLD-03` in [the repository's Three.js performance audit](../../THREEJS-PERFORMANCE-AUDIT.md).
