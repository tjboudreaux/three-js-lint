# prefer-squared-vector-magnitude

Reports a Three.js vector magnitude compared against zero, where the squared equivalent gives the same
answer without a square root. `length()` and `distanceTo()` both call `Math.sqrt`; `lengthSq()` and
`distanceToSquared()` do not. Against zero the comparison is exactly equivalent, because squaring is
monotonic on non-negative values and both sides are already non-negative. The message ID is
`preferSquaredZeroComparison`:

> Compare {{expression}} with zero via {{squaredMethod}}() to avoid a square root.

## Why this exists

Comparing a vector magnitude with zero does not require the square root used by `length()` or
`distanceTo()`. The squared methods preserve that exact zero test while avoiding the unnecessary
math operation, which is useful in a frequently evaluated path.

## Detection

A report requires all of the following to be statically provable:

- The expression is a direct `BinaryExpression` whose operator is `<`, `<=`, `>`, `>=`, `==`, `!=`,
  `===`, or `!==`.
- Exactly one operand is a statically zero number literal, in either position. `0`, `0.0`, `+0`, and
  `-0` all count; `0n` does not.
- The other operand is a cataloged magnitude call on a plain identifier bound to an immutable (`const`)
  binding whose construction resolves — directly or through one immutable receiver-alias hop — to
  `Vector2`, `Vector3`, or `Vector4` imported from `three` or `three/webgpu`:
  - `length()` with exactly no arguments, on all three classes, replaced by `lengthSq()`.
  - `distanceTo(other)` with exactly one non-spread argument, on `Vector2` and `Vector3` only,
    replaced by `distanceToSquared()`. `Vector4` has `lengthSq` but no `distanceTo`.
- For `distanceTo`, the single argument must itself resolve, under the same rules, to the _same_
  vector class, because `distanceToSquared` is only defined for a matching operand.

The `squaredMethod` value is exactly `lengthSq` or `distanceToSquared`, and `expression` is the source
text of the reported magnitude call.

## Not reported

- Any nonzero threshold, including a fractional one. Squaring both sides of `length() < 0.5` changes
  IEEE-754 overflow, underflow, and square-root rounding, so the rewrite is not equivalent in general.
- A dynamic, bigint, `NaN`, or `Infinity` threshold.
- A comparison between two magnitude calls, where neither side is a literal zero.
- `Vector4.distanceTo`, which does not exist, and `manhattanLength`, which has no squared equivalent.
- `distanceTo` against a different vector class, an unresolved operand, no argument, or a spread
  argument.
- `length` called with an argument, which is not the documented call.
- Other Three.js classes such as `Quaternion`, and same-named classes from any other module.
- An unresolved receiver, a mutable receiver, and a two-hop receiver alias.
- A magnitude used arithmetically, assigned, passed as an argument, or reached through a helper — this
  rule matches only the direct zero comparison.
- A comparison against an intermediate binding, such as `const size = v.length(); size === 0`.
- A logical expression rather than a comparison, and a dynamic method name.

## Static limits

This plugin performs no runtime analysis: it does not estimate callback frequency, FPS, GPU time,
draw calls, asset encoding, resource ownership, iteration count, or scene suitability.

Specific to this rule: the saving is one `Math.sqrt` per call, which matters only on a genuinely hot
path. It trades a little readability for that saving, which is why the rule is opt-in rather than
recommended. Restricting it to zero is deliberate: a general threshold or magnitude-to-magnitude
rewrite is not numerically equivalent.

## Examples

### Incorrect

```js
import { Vector3 } from "three";
const velocity = new Vector3();
const stopped = velocity.length() === 0;
```

```js
import { Vector3 } from "three";
const a = new Vector3();
const b = new Vector3();
const coincident = 0 === a.distanceTo(b);
```

### Correct

```js
import { Vector3 } from "three";
const velocity = new Vector3();
const stopped = velocity.lengthSq() === 0;
```

```js
import { Vector3 } from "three";
const velocity = new Vector3();
const slow = velocity.length() < 0.5;
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

- [Three.js `Vector2.js` source](https://github.com/mrdoob/three.js/blob/r185/src/math/Vector2.js)
  — `length`, `lengthSq`, `distanceTo`, and `distanceToSquared`.
- [Three.js `Vector3.js` source](https://github.com/mrdoob/three.js/blob/r185/src/math/Vector3.js)
  — the same four methods in three dimensions.
- [Three.js `Vector4.js` source](https://github.com/mrdoob/three.js/blob/r185/src/math/Vector4.js)
  — `lengthSq` without a `distanceTo` counterpart.
- Audit cause `CAH-17` in [the repository's Three.js performance audit](../../THREEJS-PERFORMANCE-AUDIT.md).
