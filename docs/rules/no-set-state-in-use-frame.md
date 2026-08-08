# no-set-state-in-use-frame

Reports direct calls to a React `useState` setter or `useReducer` dispatch inside a React Three Fiber `useFrame` callback. `useFrame` runs on every rendered frame, so each state update schedules React reconciliation from the frame loop and can re-render the component at frame rate. Mutate a ref or the Three.js object directly instead, and let React render only when a user-visible state boundary actually changes.

Message IDs: `stateSetterInUseFrame` ("Calling React state setter {{name}} inside useFrame schedules React work from the frame loop; mutate a ref or Three.js object instead.") and `reducerDispatchInUseFrame` ("Calling React reducer dispatch {{name}} inside useFrame schedules React work from the frame loop; mutate a ref or Three.js object instead.").

## Why this exists

React state updates inside `useFrame()` couple per-frame simulation to React reconciliation. That
turns a render-loop tick into a component update and can schedule work at display refresh frequency;
refs and direct Three.js mutation keep high-frequency state on the imperative side.

## Detection

A report fires only when every link below is provable from syntax:

- `useFrame` resolves to a runtime import from `@react-three/fiber`: a named import
  (`import { useFrame }` or renamed, e.g. `useFrame as onFrame`), or exactly one immutable
  `const` alias hop. A callback is never recognized by its name alone.
- The callback is the inline function or arrow passed as the first argument, or one immutable
  local function binding passed by reference (`const step = () => { ... }; useFrame(step)`).
- The reported call's nearest enclosing function is that callback's own body. Calls inside a
  nested closure are never attributed to `useFrame`.
- The callee is a bare identifier that resolves to the SECOND element (index 1) of an array
  pattern destructured from a call to `useState` or `useReducer`, where the hook resolves to a
  runtime named or namespace import from `react` (`useState(...)`, `React.useState(...)`).
  Array-pattern holes keep their slot, so `const [, setCount] = useState(0)` still resolves
  `setCount` at index 1.
- One additional immutable alias of the setter binding is followed
  (`const update = setCount;` then `update(1)`).

`useState` reports `stateSetterInUseFrame`; `useReducer` reports `reducerDispatchInUseFrame`.

## Not reported

- Mutating a `useRef` value inside the callback (`ref.current += 1`) — the recommended pattern.
- Calling the setter anywhere outside the `useFrame` callback body.
- Updaters returned by custom hooks (`const [, setCount] = useCounter(0)`): only React's own
  `useState`/`useReducer` tuple updaters are provable.
- Updaters received through props or any other unresolvable binding.
- External stores such as Zustand (`store.setCount(1)`): the callee is a member expression,
  not a bare identifier.
- Class-component `this.setState(...)`.
- A setter that is passed somewhere but never called (`schedule(setCount)`).
- A setter invoked through a transitive helper (`const bump = () => setCount(1); bump()`).
- Calls inside a nested callback within the `useFrame` callback
  (`useFrame(() => { queue(() => setCount(1)); })`).
- A locally shadowed or unresolved `useFrame`, or `useFrame` imported from any other module.
- The first tuple element (`const [update] = useState(...)`), even when it holds a function.
- `useState`/`useReducer` imported from another module (e.g. `preact/hooks`).

## Static limits

This plugin performs no runtime analysis: it does not estimate callback frequency, FPS, GPU time, draw calls, asset encoding, resource ownership, iteration count, or scene suitability.

For this rule specifically:

- It cannot tell how often `useFrame` actually fires, or whether a given state update is cheap
  enough to be harmless in practice. It reports the pattern, not a measured cost.
- It cannot follow state setters across function boundaries; only direct calls in the callback's
  own body are seen.
- It cannot prove that functions from other state libraries behave like React updaters, so they
  are never reported.

## Examples

### Incorrect

```jsx
import { useFrame } from "@react-three/fiber";
import { useState } from "react";

function Spinner() {
  const [count, setCount] = useState(0);
  useFrame(() => {
    setCount(count + 1);
  });
}
```

### Correct

```jsx
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";

function Spinner() {
  const ref = useRef(0);
  useFrame(() => {
    ref.current += 1;
  });
}
```

The recommended alternative is to mutate a `useRef` value or the Three.js object directly in the
frame callback — for example, writing `mesh.rotation.y += delta` on a ref-held object — and to
call a React state setter only when a user-visible state boundary actually changes, so React
re-renders on that boundary instead of every frame.

## Options

This rule has no options. Its schema is `[]`, and it ignores any configuration passed to it.

## Suggestions

This rule provides no editor suggestions and is never autofixable.

## Parsers and imports

The rule is parser-neutral and works under Espree and `@typescript-eslint/parser`, including
JSX/TSX components. TypeScript wrappers (`as`, `satisfies`, `!`, angle-bracket assertions) and
optional chaining are transparent to resolution. Type-only imports and `require()` are not
runtime imports, so `import type` bindings never resolve. The plugin never loads Three.js,
React, `@react-three/fiber`, or any other framework package; it inspects import syntax only.

## Presets

Enabled by `three/recommended` and `three/all`.

## References

- [React Three Fiber — Performance pitfalls](https://r3f.docs.pmnd.rs/advanced/pitfalls)
- [React Three Fiber — Hooks API (`useFrame`)](https://r3f.docs.pmnd.rs/api/hooks)
