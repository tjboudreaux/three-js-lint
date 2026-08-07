# no-transform-set-attribute-in-tick

Reports `this.el.setAttribute("position" | "rotation" | "scale" | "visible", ...)` calls inside the
`tick`/`tock` methods of an A-Frame component. `tick` and `tock` run on the frame loop, and routing a
transform update through `setAttribute` sends it back through A-Frame's component parsing and update
machinery on every frame, where A-Frame's own best practices recommend writing to
`this.el.object3D` directly when the units and semantics are equivalent.

Report messages:

- `Calling this.el.setAttribute("{{attribute}}", ...) in tick/tock routes a transform update through A-Frame on a frame path; update object3D directly when units and semantics are equivalent.`
- `Calling this.el.setAttribute("visible", ...) in tick/tock routes visibility through A-Frame on a frame path; update object3D.visible directly when semantics are equivalent.`

## Detection

A report requires all of the following to be provable from syntax:

- The call sits in the direct body of a `tick` or `tock` method of an object literal passed directly
  as an argument to an exact `AFRAME.registerComponent(...)` call. A definition object reached
  through a variable, a spread, or a helper is not inspected, and a call inside a nested callback or
  helper function within `tick` is never attributed to the frame path.
- `AFRAME` is either a namespace import of the `aframe` module (`import * as aframe from "aframe"`,
  under any local name) or a global named `AFRAME` that the ESLint configuration actually declares.
  An undeclared `AFRAME` is not recognized, so a same-named local or an unrelated project global can
  never be mistaken for A-Frame. A-Frame projects that rely on the global should declare it:

  ```js
  // eslint.config.js
  export default [
    {
      languageOptions: {
        globals: { AFRAME: "readonly" },
      },
    },
  ];
  ```

- The callee is a member expression whose method name statically resolves to `setAttribute` — dot
  access (`this.el.setAttribute(...)`) or a computed string literal
  (`this.el["setAttribute"](...)`).
- The receiver is literally `this.el`. Element aliases and other entities are not proven to share
  the same update path.
- The first argument statically resolves to the string `position`, `rotation`, `scale`, or
  `visible`. Static resolution covers plain string literals and substitution-free template literals
  (`` `position` ``). `visible` reports with the dedicated visibility message; the other three
  report as transform updates.

## Not reported

- Direct `object3D` updates in `tick`: `this.el.object3D.position.set(0, 1, 0)`.
- `setAttribute` in `init` or any other non-frame lifecycle method.
- Geometry, material, or custom attributes (`"geometry"`, `"material"`, `"data-state"`).
- Dynamic attribute names (`this.el.setAttribute(attributeName, value)`), template literals with
  substitutions (`` `position${suffix}` ``), and non-string literal names (`null`).
- Element aliases: `const el = this.el; el.setAttribute("position", ...)`.
- Another entity's `setAttribute`: `this.target.setAttribute("position", ...)`.
- Calls inside a nested callback within `tick` (`queue(() => { this.el.setAttribute(...) })`).
- `AFRAME.registerSystem` — only `registerComponent` definitions are inspected.
- An undeclared or locally shadowed `AFRAME` (for example an `AFRAME` function parameter).
- A component definition object passed through a variable rather than written inline.
- `setAttribute()` called with no arguments.
- Computed dynamic method or property access (`this.el[methodName](...)`, `this[elementKey].setAttribute(...)`).
- Private-field receivers (`this.#el.setAttribute(...)`).

## Static limits

This plugin performs no runtime analysis: it does not estimate callback frequency, FPS, GPU time,
draw calls, asset encoding, resource ownership, iteration count, or scene suitability.

This rule additionally cannot know:

- How often `tick` actually fires for a given component or scene, or whether a given
  `setAttribute` call is on a hot path in practice.
- Whether the value being written uses the same units and semantics as the equivalent `object3D`
  write: A-Frame's `rotation` component uses degrees while `Object3D.rotation` uses radians, and
  A-Frame supports partial component updates that a direct mutation does not replicate.
- Anything about a component whose definition is assembled dynamically rather than written as an
  object literal at the `registerComponent` call site.

These framework-specific semantics are why the rule is opt-in: whether a `setAttribute` transform
update is safely replaceable depends on A-Frame version behavior a default-on rule should not
assume.

## Examples

### Incorrect

```js
AFRAME.registerComponent("mover", {
  tick() {
    this.el.setAttribute("position", { x: 0, y: 1, z: 0 });
  },
});
```

### Correct

```js
AFRAME.registerComponent("mover", {
  tick() {
    this.el.object3D.position.set(0, 1, 0);
  },
});
```

## Options

This rule has no options. Its schema is `[]`, and it ignores any configuration passed to it.

## Suggestions

This rule provides no editor suggestions and is never autofixable. A-Frame's `rotation` component
uses degrees while `Object3D.rotation` uses radians, and A-Frame supports partial component updates,
so a mechanical rewrite to a direct `object3D` mutation is not safe to offer.

## Parsers and imports

The rule is parser-neutral and works under Espree and `@typescript-eslint/parser`; the A-Frame
component pattern is plain JavaScript, and no JSX/TSX handling is involved. TypeScript wrappers
(`as`, `satisfies`, `!`, angle-bracket assertions) and optional chaining are transparent to
resolution. Type-only imports and `require()` are not runtime imports: only a real namespace import
of `aframe` (or the declared `AFRAME` global) enables detection. The plugin never loads Three.js,
A-Frame, or any framework package; it inspects import syntax only.

## Presets

Enabled by `three/all` only. It is not part of `three/recommended`.

## References

- [A-Frame: Best practices](https://github.com/aframevr/aframe/blob/master/docs/introduction/best-practices.md)
