# no-direct-device-pixel-ratio

Disallow forwarding `devicePixelRatio` directly to a Three.js renderer. On high-density mobile
displays the raw device ratio is commonly 3 or more, so passing it straight to `setPixelRatio()`
multiplies every pixel the GPU shades by that factor in each dimension and is one of the most
common causes of poor WebGL frame rates. Bounding the ratio — for example with
`Math.min(window.devicePixelRatio, 2)` — keeps rendering crisp without paying for pixels users
cannot perceive. This rule reports `setPixelRatio(value)` calls where the receiver is provably a
Three.js renderer and `value` provably forwards the unbounded device ratio.

## Detection

A report requires all of the following to be provable from syntax:

- The call's callee is a member expression with the static property name `setPixelRatio`,
  including a computed string key such as `["setPixelRatio"]`.
- The receiver resolves to a value constructed by `new WebGLRenderer(...)` where `WebGLRenderer`
  is a runtime named or namespace import of `three`, or `new WebGPURenderer(...)` where
  `WebGPURenderer` is a runtime named or namespace import of `three/webgpu`. The pairing is
  checked per class: `WebGPURenderer` imported from `three` does not match, because provenance is
  verified per module, not inferred from the class name. The receiver may be an inline
  `new WebGLRenderer().setPixelRatio(...)` expression or a binding reached through exactly one
  immutable `const` alias hop.
- The first argument resolves to an unshadowed `devicePixelRatio` access: the bare global
  identifier, `window.devicePixelRatio`, or `globalThis.devicePixelRatio` (also through a
  computed string key such as `window["devicePixelRatio"]`). The access may appear directly,
  behind exactly one immutable `const` hop (`const ratio = window.devicePixelRatio`), or as
  either operand of a `||` or `??` expression. A fallback supplies a default when the ratio is
  missing; it never lowers the upper bound, so `window.devicePixelRatio || 1` is still an
  unbounded forward and is reported.

Only the first argument is examined, and only these forms count. Any other expression — capped,
scaled, conditional, or simply unresolvable — is treated as unknown rather than guessed.

## Not reported

- Capped ratios such as `Math.min(window.devicePixelRatio, 2)`.
- Arithmetic on the ratio, such as `window.devicePixelRatio * 0.5`.
- Conditional ratios such as `isMobile ? 1 : window.devicePixelRatio`.
- Ratios behind an `&&` guard, such as `allowHiDpi && window.devicePixelRatio`.
- Results of helper or configuration calls, such as `pickRatio()`.
- A locally shadowed `devicePixelRatio` parameter or variable.
- `window.devicePixelRatio` where `window` itself is shadowed by a local binding.
- A mutable (`let`) local that holds the ratio, even if initialized from `devicePixelRatio`.
- A value reached through two alias hops (`const first = window.devicePixelRatio;
const second = first;`), which exceeds the one-hop resolution budget.
- Dynamic member names such as `window[ratioKey]` or `renderer[methodName](...)`.
- Deeper or unrecognized global paths such as `window.visualViewport.devicePixelRatio` or
  `screen.devicePixelRatio`.
- Receivers that are not tracked renderer constructions: unrelated objects
  (`config.setPixelRatio(...)`), call results (`makeRenderer().setPixelRatio(...)`), undeclared
  identifiers, or mutable renderer bindings.
- Renderers imported from unrecognized modules, and `WebGPURenderer` imported from `three`
  (the wrong module for that class).
- Type-only renderer imports (`import type { WebGLRenderer } from "three"`), which are erased at
  runtime.
- Calls with no argument, and other renderer methods such as `setSize`.

## Static limits

This plugin performs no runtime analysis: it does not estimate callback frequency, FPS, GPU time, draw calls, asset encoding, resource ownership, iteration count, or scene suitability.

The rule cannot evaluate expressions, so it treats anything beyond the direct forward, the one
`const` hop, and the `||`/`??` fallback as unknowable — including forms that are already safe. It
also cannot know whether the call site runs once at startup or on every resize, whether the target
device's ratio is actually high, or whether a given scene can afford the full ratio. Those are
runtime and product questions; the rule only flags the pattern that is unbounded by construction.

## Examples

### Incorrect

```js
import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
renderer.setPixelRatio(window.devicePixelRatio);
```

### Correct

```js
import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
```

## Options

This rule has no options. Its schema is `[]`, and it ignores any configuration passed to it.

## Suggestions

This rule provides no editor suggestions and is never autofixable. Choosing a bound — a flat cap
like `2` or `1.5`, a device-tier table, or a dynamic quality setting — is product policy that a
linter cannot pick for you, so no replacement text is offered.

## Parsers and imports

The rule is parser-neutral and works under Espree and `@typescript-eslint/parser`. TypeScript
wrappers (`as`, `satisfies`, `!`, angle-bracket assertions) and optional chaining are transparent:
`renderer!.setPixelRatio((window.devicePixelRatio as number))` and
`renderer?.setPixelRatio(window.devicePixelRatio)` are reported exactly like their plain forms.
Type-only imports and `require()` are not runtime imports, so neither creates a tracked renderer
binding. The rule is not JSX-specific, but calls inside JSX/TSX expressions are visited like any
other code. The plugin never loads Three.js or any framework package; it inspects import syntax
only.

## Presets

Enabled by `three/recommended` and `three/all`.

## References

- [Three.js manual: Responsive WebGL pages](https://threejs.org/manual/en/responsive.html)
- [React Three Fiber: Scaling performance](https://r3f.docs.pmnd.rs/advanced/scaling-performance)
