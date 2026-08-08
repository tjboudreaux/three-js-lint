# no-non-numeric-vector-components

Reports a statically non-numeric value written into a `Vector2`, `Vector3`, or `Vector4` component.
Three.js vector components are plain data properties assigned without validation, so a string, a
boolean, `null`, or an object is stored as-is and only surfaces later as `NaN` geometry, a silently
wrong matrix, or a shape change that deoptimizes every math method reading that vector. The message
ID is `nonNumericVectorComponent`:

> {{className}} receives {{valueType}} for {{component}}; Three.js vector components must be numbers and
> are stored without validation.

## Why this exists

Three.js vector fields are plain JavaScript properties and do not reject strings or other
non-numeric values at assignment time. Catching a statically invalid component prevents corrupted
math from propagating into transforms, geometry, camera state, and GPU-facing calculations.

## Detection

A report requires all of the following to be statically provable:

- The vector class is exactly `Vector2`, `Vector3`, or `Vector4`, imported from `three` or
  `three/webgpu`.
- The write is one of these shapes:
  - an explicit component slot of `new Vector2/3/4(...)`, up to the class's component count;
  - a `set(...)` call with exactly the class's component count;
  - a `setScalar(value)` call with exactly one argument, reported as `all components`;
  - a `setX`/`setY`/`setZ`/`setW` call with exactly one argument, where that setter exists on the
    class;
  - a `setComponent(index, value)` call with exactly two arguments and a static numeric `index` in
    range;
  - a plain `=` write to one of the class's component properties, or to `width`/`height`
    (`Vector2.width/height` address x/y, `Vector4.width/height` address z/w).
- For every shape other than the constructor, the receiver is a plain identifier bound to an
  immutable (`const`) binding whose construction resolves directly or through one immutable
  receiver-alias hop to the imported vector class.
- The value is one of these statically non-numeric kinds, reported as the pinned `valueType`: a
  string literal, template literal, or `typeof` expression (`a string`); a boolean literal, `!`, or
  `delete` (`a boolean`); the `null` literal (`null`); a bigint literal or a `-`/`~` bigint
  (`a bigint`); a regexp literal (`a regular expression`); an array literal (`an array`); an object
  literal or a `new` expression (`an object`); a function or arrow (`a function`); a class expression
  (`a class`); and an unshadowed `undefined` or a `void` expression (`undefined`).

The `component` value is pinned too: `component x`, `component y`, `component z`, or `component w` for
a direct slot; `all components` for `setScalar`; and `component x (width)`, `component y (height)`,
`component z (width)`, or `component w (height)` for the two alias families.

## Not reported

- Numbers, negative numbers, `~1`, `+1`, `NaN`, and `Infinity`. Three.js accepts every one of them,
  and this rule makes no claim about numeric suitability.
- A unary `+` on a bigint, which throws before the assignment happens, so nothing is ever stored.
- Identifiers, call results, and member accesses — the value cannot be read from syntax.
- A shadowed `undefined`, which is an ordinary local binding.
- Components a class does not have: `Vector2.z`, `Vector2.setZ`, `Vector3.setW`, `Vector3.width`.
- An out-of-range, negative, or dynamic `setComponent` index.
- Unlisted or dynamic property names.
- Compound (`+=`), logical (`||=`), and update (`++`) assignments: each reads the stored number first,
  so the result is arithmetic rather than a raw non-numeric write.
- Spread arguments, which hide every argument position.
- `set` or `setScalar` with the wrong arity, and extra constructor arguments Three.js ignores.
- Same-named classes from any other module, user classes named `Vector3`, and other Three.js classes
  such as `Quaternion`.
- A mutable receiver, a two-hop alias, or an unresolved receiver.

This rule does not claim Three.js throws. It stores the value and the fault appears later.

## Static limits

This plugin performs no runtime analysis: it does not estimate callback frequency, FPS, GPU time,
draw calls, asset encoding, resource ownership, iteration count, or scene suitability.

Specific to this rule: it reads only values spelled out at the write site. A non-number arriving
through a variable, a JSON payload, a DOM value, or an inferred TypeScript type is invisible to it,
and no type information is consulted even when a TypeScript parser is configured.

## Examples

### Incorrect

```js
import { Vector3 } from "three";
const position = new Vector3("1", 2, 3);
```

```js
import { Vector2 } from "three";
const size = new Vector2();
size.width = null;
```

### Correct

```js
import { Vector3 } from "three";
const position = new Vector3(1, 2, 3);
```

```js
import { Vector3 } from "three";
const position = new Vector3();
position.x = Number(input);
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

- [Three.js `Vector2.js` source](https://github.com/mrdoob/three.js/blob/r185/src/math/Vector2.js)
  — plain `x`/`y` fields, the `width`/`height` aliases, and `setComponent`'s index range.
- [Three.js `Vector3.js` source](https://github.com/mrdoob/three.js/blob/r185/src/math/Vector3.js)
  — the three-component layout and unvalidated setters.
- [Three.js `Vector4.js` source](https://github.com/mrdoob/three.js/blob/r185/src/math/Vector4.js)
  — the `width`/`height` aliases addressing z/w rather than x/y.
- Audit cause `AAM-09` in [the repository's Three.js performance audit](../../THREEJS-PERFORMANCE-AUDIT.md).
