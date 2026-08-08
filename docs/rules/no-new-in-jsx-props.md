# no-new-in-jsx-props

Reports `new Vector3` / `new Euler` / `new Quaternion` written directly inside a transform prop of a
React Three Fiber host element, such as `<mesh position={new Vector3(0, 1, 0)} />`. Because the
expression is evaluated on every React render of the component, the host receives a brand-new Three.js
object each render, forcing the reconciler to discard the previous instance and re-attach the new one.
Hoisting the value (or using R3F's array form) keeps the prop stable across renders.

Report message: `Creating {{constructor}} inline for the {{property}} prop gives this R3F host a new object on each React render; pass a stable value.`

## Why this exists

Constructing a Three.js transform directly in JSX gives React Three Fiber a fresh object during
rendering. That creates identity churn and makes the reconciler process a value that could instead be
represented by a stable object or the framework's array shorthand.

## Detection

A report requires all of the following to be provable from syntax:

- The file contains a runtime import from `@react-three/fiber`. Without it, a lowercase `mesh`
  element is just an unknown host tag carrying none of R3F's reconciler semantics, and the rule is
  inert for the whole file. A type-only import (`import type { ... } from "@react-three/fiber"`)
  does not count.
- The element tag is a plain lowercase JSX identifier from this exact list of R3F host tags:
  `object3D`, `group`, `scene`, `mesh`, `skinnedMesh`, `instancedMesh`, `batchedMesh`, `line`,
  `lineLoop`, `lineSegments`, `points`, `sprite`, `lod`, `perspectiveCamera`, `orthographicCamera`,
  `arrayCamera`, `cubeCamera`.
- The attribute name and the constructed class match exactly: `position`, `scale`, and `up` require
  `new Vector3`; `rotation` requires `new Euler`; `quaternion` requires `new Quaternion`. `up` is
  included here even though it is writable on `Object3D` (and therefore excluded from
  `no-replace-object3d-transform`), because in JSX the concern is a new object per React render, not
  transform identity.
- The entire prop value is a single JSX expression container whose whole expression is the
  `NewExpression`. A construction nested inside a larger expression is not reported.
- The constructor resolves to a runtime named import or namespace member from `three` or
  `three/webgpu` (`new Vector3(...)`, `new THREE.Vector3(...)`), including one immutable `const`
  alias hop. Constructors from any other module do not match.

## Not reported

- Array-literal props, the idiomatic R3F form: `<mesh position={[0, 1, 0]} />`.
- Stable identifiers: `<mesh position={offset} />` where `offset` was constructed once outside.
- Files with no runtime `@react-three/fiber` import, or only a type-only R3F import.
- Custom component tags (`<Marker position={new Vector3()} />`).
- Member-expression tags (`<Scene.Mesh ... />`) and namespaced tags: neither is an R3F intrinsic.
- DOM tags (`<div position={new Vector3()} />`).
- `<primitive>`, which owns its own prop semantics.
- Spread attributes (`<mesh {...props} />`).
- Constructions nested in a larger expression, such as `position={flag ? base : new Vector3()}`:
  the per-render cost depends on the branch taken.
- A construction whose class does not match the prop, such as `position={new Euler(0, 1, 0)}`.
- String-literal props and other non-expression-container values, and valueless attributes.
- Non-transform props such as `args`, `material`, geometry, or object props, even when they contain
  a `new` expression.
- Constructors imported from unrecognized modules (`import { Vector3 } from "custom-math"`).

## Static limits

This plugin performs no runtime analysis: it does not estimate callback frequency, FPS, GPU time,
draw calls, asset encoding, resource ownership, iteration count, or scene suitability.

This rule additionally cannot know:

- How often the enclosing React component actually re-renders. The rule assumes a new object per
  render is wasteful; it cannot measure whether this element re-renders once or every frame.
- Whether R3F's prop coercion would have applied the same value from an array anyway, or which R3F
  version's diffing semantics apply.
- Whether a construction reached through any expression more complex than the bare `new` (a
  conditional, a call, a memo hook) allocates per render.

These version-sensitive semantics are why the rule is opt-in: R3F's coercion and default-value
behavior have changed across releases, and a default-on rule should not assume one version's
semantics for every project.

## Examples

### Incorrect

```jsx
import { Canvas } from "@react-three/fiber";
import { Vector3 } from "three";
const view = <mesh position={new Vector3(0, 1, 0)} />;
```

### Correct

```jsx
import { Canvas } from "@react-three/fiber";
const view = <mesh position={[0, 1, 0]} />;
```

## Options

This rule has no options. Its schema is `[]`, so ESLint rejects any configured options.

## Suggestions

This rule provides no editor suggestions and is never autofixable. R3F's prop coercion and default
semantics are version-sensitive, so rewriting the expression to an array literal or a hoisted
constant is not provably equivalent, and no automatic rewrite is offered.

## Parsers and imports

The rule is parser-neutral and works under Espree and `@typescript-eslint/parser`. Under Espree, JSX
requires `parserOptions.ecmaFeatures.jsx` (the standard flat-config
`languageOptions.parserOptions.ecmaFeatures: { jsx: true }`); TSX works through
`@typescript-eslint/parser` with no plugin-specific setup. TypeScript wrappers (`as`, `satisfies`,
`!`, angle-bracket assertions) and optional chaining are transparent to resolution. Type-only
imports and `require()` are not runtime imports and never enable the rule or satisfy its constructor
check. The plugin never loads Three.js, React, or React Three Fiber; it inspects import syntax only.

## Presets

Enabled by `three/all` only. It is not part of `three/recommended`.

## References

- [R3F: Performance pitfalls](https://r3f.docs.pmnd.rs/advanced/pitfalls)
- [R3F: Scaling performance](https://r3f.docs.pmnd.rs/advanced/scaling-performance)
