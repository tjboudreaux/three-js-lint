# no-deep-reactive-three-object

Reports passing a newly constructed Three.js object directly to Vue's `ref()` or `reactive()`.
Both factories wrap their argument in deep reactivity: Vue recursively proxies the whole object
graph. A Three.js instance carries large nested structures — matrices, geometry, materials,
children — and proxying that graph adds observable overhead on a frame path and can interfere
with Three.js internals. Use `shallowRef()`, `shallowReactive()`, or `markRaw()` so the Three.js
instance stays raw.

Message IDs: `preferShallowRefForThreeInstance` ("Passing new {{constructor}} to Vue ref()
creates deep reactivity; use shallowRef() or markRaw() when the Three.js instance should remain
raw.") and `avoidReactiveThreeInstance` ("Passing new {{constructor}} to Vue reactive() creates
deep reactivity; use shallowReactive() or markRaw() when the Three.js instance should remain
raw.").

## Why this exists

Vue's deep `ref()` and `reactive()` wrappers recursively proxy Three.js objects and their mutable
graphs. That adds proxy overhead and can interfere with Three.js identity-sensitive state; shallow
containers preserve the object while keeping Vue's reactivity boundary explicit.

## Detection

A report fires only when every link below is provable from syntax:

- The callee resolves to a runtime import of `ref` or `reactive` from `vue`: a named import
  (`import { ref }`, including renamed aliases), or a namespace member access
  (`Vue.ref(...)` where `Vue` is `import * as Vue from "vue"`).
- The first argument, after unwrapping transparent TypeScript wrappers, is directly a `new`
  expression — not an identifier, not nested inside another object.
- The constructed class resolves to a runtime import from `three` or `three/webgpu`: a named
  import (`new Mesh()`), a namespace member (`new THREE.Mesh()`), or exactly one immutable
  `const` alias hop. Any exported constructor qualifies; there is no class allowlist.

`ref(...)` reports `preferShallowRefForThreeInstance`; `reactive(...)` reports
`avoidReactiveThreeInstance`.

## Not reported

- `shallowRef(new Mesh())` and `shallowReactive(new Mesh())` — already shallow, the recommended
  patterns.
- `ref(markRaw(new Mesh()))` — the instance is explicitly opted out of reactivity.
- An identifier argument (`const created = new Mesh(); ref(created)`): the wrapped value's
  identity is not proven from a direct construction.
- A nested object graph (`ref({ mesh: new Mesh() })`): the `new` expression is not the direct
  first argument.
- Loader or helper call results (`ref(loadMesh())`).
- `computed(() => new Mesh())`: `computed` is not a deep reactivity factory.
- Constructions of non-Three classes (`ref(new Pose())`).
- `ref`/`reactive` imported from any module other than `vue`.
- Type-only `vue` imports (`import type { Ref } from "vue"`), which are not runtime imports.
- `ref()` with no argument.

## Static limits

This plugin performs no runtime analysis: it does not estimate callback frequency, FPS, GPU time, draw calls, asset encoding, resource ownership, iteration count, or scene suitability.

For this rule specifically:

- It cannot measure the actual cost of proxying a given instance, or tell whether the reactive
  wrapper is ever read on a frame path. It reports the deep-reactive wrapping pattern, not a
  measured slowdown.
- It cannot track an instance once it flows through a variable, function return, or nested
  object; only a direct first-argument construction is proven.

## Examples

### Incorrect

```js
import { ref } from "vue";
import { Mesh } from "three";

const mesh = ref(new Mesh());
```

### Correct

```js
import { shallowRef } from "vue";
import { Mesh } from "three";

const mesh = shallowRef(new Mesh());
```

## Options

This rule has no options. Its schema is `[]`, and it ignores any configuration passed to it.

## Suggestions

This rule declares `hasSuggestions: true` and offers at most one editor suggestion, with the
description `Use the existing shallowRef binding.` Suggestions are editor-only: they are never
applied by `--fix`, and the rule itself is never autofixable.

- For a `ref(...)` report, the suggestion is offered ONLY when there is an existing binding to
  reuse:
  - The file already has a runtime `shallowRef` import from `vue`, under any local alias. The
    suggestion replaces the callee with that exact local name, so
    `import { shallowRef as rawRef }` turns `ref(new Scene())` into `rawRef(new Scene())`.
  - Or the callee is a namespace access (`Vue.ref(...)`), in which case the suggestion replaces
    it with the same namespace's `<ns>.shallowRef(...)` (`Vue.shallowRef(new Mesh())`).
  - The suggestion NEVER inserts an import. If no `shallowRef` binding exists and the callee is
    a plain identifier, the report has no suggestion.
- For a `reactive(...)` report, no suggestion is ever offered, even when a `shallowRef` binding
  exists: switching to `shallowRef` would add `.value` semantics the rule cannot safely
  introduce.

## Parsers and imports

The rule is parser-neutral and works under Espree and `@typescript-eslint/parser`. TypeScript
wrappers (`as`, `satisfies`, `!`, angle-bracket assertions) and optional chaining are
transparent, so `ref(new Mesh() as Mesh)` is still reported. Type-only imports and `require()`
are not runtime imports, so `import type { Ref } from "vue"` never resolves. JSX/TSX parsing is
supported, though this rule applies to plain call expressions. The plugin never loads Three.js,
Vue, or any framework package; it inspects import syntax only.

## Presets

Enabled by `three/recommended` and `three/all`.

## References

- [TresJS — Advanced performance guide](https://docs.tresjs.org/api/advanced/performance)
