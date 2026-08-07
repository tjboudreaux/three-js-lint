# no-replace-object3d-transform

Reports assignments that replace an `Object3D`'s `position`, `rotation`, `quaternion`, or `scale`
with a newly constructed `Vector3`, `Euler`, or `Quaternion`. Three.js defines these four
properties on `Object3D` as non-writable, and the internal change listeners that keep `quaternion`
and `rotation` synchronized are bound to the original instances. Replacing one of them silently
breaks that synchronization and drops any other reference held to the original object, so this is a
correctness fault — this is the only rule in the plugin with `meta.type: "problem"`. The message ID
is `replaceObject3DTransform`:

> Do not replace {{owner}}.{{property}}; preserve the Three.js transform object's identity with
> .set() or .copy().

## Detection

A report requires all of the following to be statically provable:

- The operator is exactly `=` (compound assignments such as `??=` are ignored).
- The left side is a static member access whose owner is a plain identifier and whose property is
  one of `position`, `rotation`, `quaternion`, or `scale`. `up` is deliberately excluded because
  Three.js declares it writable, so replacing it is supported.
- The owner identifier resolves to an immutable (`const`) binding initialized with a `new`
  expression whose constructor comes from `three` or `three/webgpu` — via a direct named import, a
  namespace member (`THREE.Mesh`), or exactly one immutable `const` alias hop — and whose exported
  name is one of the 19 enumerated `Object3D` classes: `Object3D`, `Group`, `Scene`, `Bone`,
  `Mesh`, `SkinnedMesh`, `InstancedMesh`, `BatchedMesh`, `Line`, `LineLoop`, `LineSegments`,
  `LOD`, `Points`, `Sprite`, `Camera`, `ArrayCamera`, `CubeCamera`, `OrthographicCamera`,
  `PerspectiveCamera`.
- The right side is one of two accepted value forms: a direct construction of the matching class
  (`new Vector3(...)`), or `.clone()` called on a named immutable binding itself constructed from
  the matching class (`mesh.position = target.clone()`).
- The property/class pairing is exact: `position` and `scale` require `Vector3`, `rotation`
  requires `Euler`, and `quaternion` requires `Quaternion`. A mismatch such as
  `mesh.position = new Euler()` is not reported — that is a type error, not a transform-identity
  fault.

Unlike the loop rules, this rule has no render-loop requirement: replacing a non-writable
transform object is wrong wherever it happens, so the assignment is reported in any scope.

## Not reported

- In-place updates such as `mesh.position.set(1, 2, 3)` or `mesh.position.copy(target)`.
- Component writes such as `mesh.position.x = 1`.
- `up` replacement — Three.js declares `up` writable.
- Material or other non-transform replacement, such as `mesh.material = new MeshBasicMaterial()`.
- Mismatched classes, such as `mesh.position = new Euler()`.
- Computed property writes, such as `mesh[transformKey] = new Vector3()`.
- Unknown owners (`node.position = ...`), owners that are not `Object3D` subclasses
  (`geometry.position = ...`), owners reached through a call (`makeMesh().position = ...`), and
  owners held in mutable bindings.
- Unknown values, such as `mesh.position = computeOffset()` or a bare identifier.
- `.clone()` of an untracked, mutable, or inline receiver — `source.clone()` where `source` was not
  provably constructed from the matching class, and `new Vector3().clone()`.
- Compound assignment, such as `mesh.position ??= new Vector3()`.
- Matching classes imported from unrecognized modules, such as `Vector3` from `custom-math`.
- Clone receivers reached through a computed member.

## Static limits

This plugin performs no runtime analysis: it does not estimate callback frequency, FPS, GPU time,
draw calls, asset encoding, resource ownership, iteration count, or scene suitability.

Specific to this rule: it cannot know which other references to the original transform object
exist at runtime, or whether a replacement is intentional monkey-patching of a non-standard
subclass. It also cannot follow an owner through function calls, member expressions, or mutable
bindings, so indirection beyond one immutable `const` alias hop hides the write.

## Examples

### Incorrect

```js
import { Mesh, Vector3 } from "three";
const mesh = new Mesh();
mesh.position = new Vector3(1, 2, 3);
```

```js
import { Mesh, Vector3 } from "three";
const mesh = new Mesh();
const target = new Vector3();
mesh.position = target.clone();
```

### Correct

```js
import { Mesh } from "three";
const mesh = new Mesh();
mesh.position.set(1, 2, 3);
```

```js
import { Mesh, Vector3 } from "three";
const mesh = new Mesh();
const target = new Vector3();
mesh.position.copy(target);
```

## Options

This rule has no options. Its schema is `[]`, and it ignores any configuration passed to it.

## Suggestions

This rule has `hasSuggestions: true` and emits editor suggestions; it is never autofixable, and
suggestions are never applied by `--fix`.

A suggestion is offered only when the assignment is in statement position. `obj.position = value`
evaluates to `value`, while `obj.position.set(...)` evaluates to `obj.position`, so rewriting an
assignment whose value is used would change the program and no suggestion is offered.

When a suggestion is offered, there is exactly one, with one of these exact descriptions:

- `Preserve {{property}} identity with .set().` — offered for a direct construction only when the
  argument list matches the class's `set()` arity: `Vector3` with exactly 3 arguments, `Euler`
  with exactly 3 or 4, `Quaternion` with exactly 4. A spread argument makes the effective arity
  unknown, so no `.set()` suggestion is ever offered when any argument is a spread. For example,
  `mesh.position = new Vector3(1, 2, 3);` suggests `mesh.position.set(1, 2, 3);`.
- `Preserve {{property}} identity with .copy().` — offered for the tracked `source.clone()` form,
  suggesting a copy from the clone receiver. For example, `mesh.position = target.clone();`
  suggests `mesh.position.copy(target);`.

Every other reported form — a zero-argument construction, a wrong argument count, a spread, or an
assignment whose value is used — is reported with zero suggestions.

## Parsers and imports

The rule is parser-neutral and works under Espree and `@typescript-eslint/parser`. TypeScript
wrappers (`as`, `satisfies`, `!`, angle-bracket assertions) and optional chaining are transparent
to resolution, so `const mesh = new Mesh() as Mesh;` is still tracked as a `Mesh`. Type-only
imports and `require()` are not runtime imports and never establish a constructor's provenance.
There is no JSX-specific handling; assignments in JSX/TSX files are analyzed like any other
expression. The plugin never loads Three.js or any framework package — it inspects import syntax
only.

## Presets

Enabled by `three/recommended` and `three/all`.

## References

- [Three.js `Object3D.js` source](https://github.com/mrdoob/three.js/blob/master/src/core/Object3D.js)
  — the non-writable `position`, `rotation`, `quaternion`, and `scale` definitions and the change
  listeners that synchronize `rotation` and `quaternion` on the original instances.
- [Theatre.js `editableFactoryConfigUtils.ts`](https://raw.githubusercontent.com/theatre-js/theatre/main/packages/r3f/src/main/editableFactoryConfigUtils.ts)
  — in-place transform integration that mutates the existing objects.
- [Theatre.js `defaultEditableFactoryConfig.ts`](https://raw.githubusercontent.com/theatre-js/theatre/main/packages/r3f/src/main/defaultEditableFactoryConfig.ts)
  — the editable-factory configuration built on that in-place pattern.
