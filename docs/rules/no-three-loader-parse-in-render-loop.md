# no-three-loader-parse-in-render-loop

Reports a synchronous Three.js loader `parse` call inside a verified render-loop callback. Every
loader in the catalog parses on the main thread and returns its result directly, so a `parse` on a
frame path converts an asset cost into a recurring stall — the audited issues measured ~200 ms blocks
collapsing to ~5 ms once parsing moved off the frame path. The message ID is `loaderParseInLoop`:

> Calling {{loader}}.parse() inside this verified render-loop callback performs synchronous asset
> parsing; parse outside the repeated path.

## Why this exists

Synchronous loader parsing performs CPU work and object construction on the main thread. Running it
from a render callback competes directly with rendering and risks a long frame; parsing should be
completed before the loop or moved behind an asynchronous loading boundary.

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
- The callee is a static member access named exactly `parse`.
- The receiver is a plain identifier bound to an immutable (`const`) binding whose construction —
  directly or through one immutable receiver-alias hop — is a `new` expression whose constructor
  resolves to an accepted source/class pair:
  - **Core**, from both `three` and `three/webgpu`: `AnimationLoader`, `BufferGeometryLoader`,
    `MaterialLoader`, and `ObjectLoader`. From `three/webgpu` only: `NodeLoader`,
    `NodeMaterialLoader`, and `NodeObjectLoader`.
  - **Direct addon modules**, exactly `three/addons/loaders/<File>.js` or the compatibility path
    `three/examples/jsm/loaders/<File>.js`, where `<File>` is one of 40 known loader files and the
    imported name is that file's exported class. Every name matches its file except `3MFLoader`,
    which exports `ThreeMFLoader`.
  - **The bare barrel** `three/addons`, which re-exports the same 40 classes except `USDZLoader` and
    `MaterialXLoader`.
- The call has at least the class's minimum argument count and no spread. The minimum is one, except
  `FBXLoader`, `LUTImageLoader`, `MTLLoader`, `TDSLoader`, and `VRMLLoader` (two) and `LWOLoader`
  (three).

This is the only rule that recognizes a module specifier outside `three` and `three/webgpu`, and the
widening is finite: the barrel, the two loader prefixes with a matching file stem, and nothing else.

`ObjectLoader`, `NodeObjectLoader`, and `USDLoader` return their object graph synchronously from
`parse` even though texture readiness may continue asynchronously afterwards, so they are reported
like every other synchronous parser.

## Not reported

- The six callback-reporting parsers — `GLTFLoader`, `DRACOLoader`, `KTX2Loader`, `LDrawLoader`,
  `Rhino3dmLoader`/`3DMLoader`, and `UltraHDRLoader` — whose `parse` hands its result to a callback
  rather than returning it.
- `USDZLoader` and `MaterialXLoader` imported from the bare `three/addons` barrel, which r185 does not
  re-export there. Both remain reportable through their direct module paths.
- `parseAsync`, `load`, and `loadAsync`, none of which blocks the frame the way `parse` does.
- Abstract `Loader`, `CompressedTextureLoader`, and `DataTextureLoader`, and every load-only loader.
- A wrong class name for a file (`MFLoader` from `3MFLoader.js`) or a wrong file for a class
  (`ThreeMFLoader` from `ThreeMFLoader.js`).
- A source/class mismatch, such as `OBJLoader` from `three` or `NodeLoader` from `three`.
- Arbitrary deep paths (`three/src/loaders/ObjectLoader.js`), addon paths outside the loaders
  directory, and paths without the `.js` extension.
- Type-only imports, default imports, and `require()`.
- A call below the class's minimum argument count, and any spread argument.
- A mutable receiver, a two-hop receiver alias, and a dynamic method name.
- `parse` outside the verified callback, or inside a helper or a nested closure.

## Static limits

This plugin performs no runtime analysis: it does not estimate callback frequency, FPS, GPU time,
draw calls, asset encoding, resource ownership, iteration count, or scene suitability.

Specific to this rule: it cannot know the asset's size, whether the result is cached, or how long a
given parse actually takes. It also cannot recognize a loader reached through a user re-export barrel,
a factory function, or a dynamic import, because none of those proves the class's identity from
syntax.

## Examples

### Incorrect

```js
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
const loader = new OBJLoader();
requestAnimationFrame(() => {
  scene.add(loader.parse(text));
});
```

```js
import { ObjectLoader } from "three";
const loader = new ObjectLoader();
requestAnimationFrame(() => {
  scene.add(loader.parse(json));
});
```

### Correct

```js
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
const loader = new OBJLoader();
const model = loader.parse(text);
requestAnimationFrame(() => {
  scene.add(model);
});
```

```js
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
const loader = new OBJLoader();
requestAnimationFrame(() => {
  loader.load(url, onLoad);
});
```

## Options

This rule has no options. Its schema is `[]`, so ESLint rejects any configured options.

## Suggestions

This rule provides no editor suggestions and is never autofixable.

## Parsers and imports

The rule is parser-neutral and works under Espree and `@typescript-eslint/parser`. TypeScript
wrappers (`as`, `satisfies`, `!`, angle-bracket assertions) and optional chaining are transparent to
resolution. Recognized module specifiers for this rule are `three`, `three/webgpu`, the bare `three/addons` barrel, and the exact prefixes `three/addons/loaders/` and `three/examples/jsm/loaders/` with a matching file name. No other addon directory, deep `three/src` path, or user barrel is accepted. Type-only imports, default imports, and `require()` are never runtime imports and
never establish provenance. Resolution follows a direct named import, a namespace member access, or
exactly one immutable `const` alias hop; a second hop, a mutable binding, or a dynamic member name
stays unresolved. The plugin never loads Three.js or any framework package — it inspects import
syntax only.

## Presets

Enabled by `three/recommended` and `three/all`.

## References

- [Three.js `Addons.js` source](https://github.com/mrdoob/three.js/blob/r185/examples/jsm/Addons.js)
  — exactly which loaders the bare `three/addons` barrel re-exports.
- [Three.js `ObjectLoader.js` source](https://github.com/mrdoob/three.js/blob/r185/src/loaders/ObjectLoader.js)
  — `parse( json, onLoad )` returning the object graph synchronously.
- [Three.js `OBJLoader.js` source](https://github.com/mrdoob/three.js/blob/r185/examples/jsm/loaders/OBJLoader.js)
  — a representative synchronous addon parser.
- [Three.js `3MFLoader.js` source](https://github.com/mrdoob/three.js/blob/r185/examples/jsm/loaders/3MFLoader.js)
  — the one file whose exported class name differs from its file name.
- [Three.js `GLTFLoader.js` source](https://github.com/mrdoob/three.js/blob/r185/examples/jsm/loaders/GLTFLoader.js)
  — a callback-reporting parser this rule deliberately excludes.
- [Three.js `NodeLoader.js` source](https://github.com/mrdoob/three.js/blob/r185/src/loaders/nodes/NodeLoader.js)
  — a node loader exported only by `three/webgpu`.
- Audit cause `LPC-01` in [the repository's Three.js performance audit](../../THREEJS-PERFORMANCE-AUDIT.md).
