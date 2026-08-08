# prefer-bvh-first-hit-only

Reports a three-mesh-bvh-accelerated raycast whose result array is provably used only for the
first hit or for an emptiness test. Setting `raycaster.firstHitOnly = true` lets the BVH raycast
stop at the first intersection instead of gathering and sorting every hit along the ray, which
changes an `intersectObject`/`intersectObjects` call from "find all hits" work to "find the
nearest hit" work. The rule fires only when activation, the cast shape, the raycaster binding,
every result read, and the current flag state are all statically provable; anything less stays
silent.

The report uses message ID `preferFirstHitOnly`:

> This BVH raycast result is used only for the first hit or emptiness; set {{raycaster}}.firstHitOnly = true before the cast.

`{{raycaster}}` is the source text of the cast receiver, and the report points at the cast call
expression.

## Why this exists

When a raycast consumer needs only the nearest hit, collecting every intersection makes the BVH do
more traversal and result work than the application can use. `firstHitOnly` aligns the accelerator's
work with that consumer contract and avoids materializing irrelevant hits.

## Detection

A cast is reported only when all five preconditions hold.

1. **The file activates BVH raycasting.** There is a runtime import from `three-mesh-bvh`, and
   somewhere in the same file an assignment installs that module's `acceleratedRaycast` export
   onto `Mesh.prototype.raycast` or `BatchedMesh.prototype.raycast`, where `Mesh`/`BatchedMesh`
   resolve to named or namespace imports from `three` or `three/webgpu`. Without this activation
   `firstHitOnly` has no effect — Three.js's own raycast ignores it — so the rule stays silent
   for the whole file. The standard setup, taken from the test fixtures:

   ```js
   import { Mesh, Raycaster } from "three";
   import { acceleratedRaycast } from "three-mesh-bvh";
   Mesh.prototype.raycast = acceleratedRaycast;
   ```

   The namespace form `THREE.Mesh.prototype.raycast = bvh.acceleratedRaycast` is equally
   recognized. Assigning a different function, assigning to a different prototype property such
   as `raycastFirst`, skipping `.prototype` (`Mesh.raycast = ...`), or activating a class that
   does not resolve to `Mesh`/`BatchedMesh` from `three`/`three/webgpu` (for example `Line`, or a
   `Mesh` imported from another package) does not count. As everywhere in this plugin, import
   resolution accepts a direct named import, a namespace member access, and exactly one immutable
   `const` alias hop; two hops are unresolved.

2. **The cast is a plain `const` declarator with an identifier binding.** The initializer is a
   call of `intersectObject(...)` or `intersectObjects(...)` — no other `Raycaster` method — on a
   receiver that is a single identifier:

   ```js
   const hits = raycaster.intersectObject(mesh);
   ```

   A `let`/`var` declaration, a destructuring pattern (`const [first] = ...` already takes the
   first hit and needs no change), a callee that is not a member expression, or a receiver that
   is anything but an identifier (such as `makeRaycaster().intersectObject(mesh)`) is not
   analyzed.

3. **The raycaster binding is fully constrained.** The receiver identifier resolves to a named
   binding that is:

   - immutable — declared once and never reassigned;
   - non-escaping — every read is only ever the object of a member access, so the raycaster is
     never passed, returned, stored, spread, destructured, or compared;
   - scope-local — every read happens inside the raycaster's own function scope, never from a
     nested or sibling function;
   - constructed from `Raycaster` imported from `three` or `three/webgpu`.

   These three binding properties are what make source-order reasoning about `firstHitOnly`
   writes sound: no code outside this file's view can touch the flag.

4. **Every read of the result needs at most the first hit.** The result binding is immutable and
   scope-local, has at least one resolved read (an unused result is not reported), and every read
   is exactly one of:

   - `hits[0]` — a computed member whose index has static numeric value `0`;
   - `hits.at(0)` — a call with exactly one argument whose static numeric value is `0`;
   - an emptiness test on `hits.length`, defined precisely as: `!hits.length`; `hits.length` in
     the test position of an `if`, ternary, `while`, or `do-while`; or a comparison of
     `hits.length` against zero using `===`, `!==`, `==`, `!=`, `>`, `<`, `>=`, or `<=`.

   Static numeric values are literal numbers seen through unary `-`/`+`, so `hits.length !== -0`
   still counts as an emptiness test, while `hits[+"0"]` (a string under unary plus) and
   `hits[~0]` (an unsupported operator) do not resolve and count as other uses. Several proven
   reads of the same result are fine — for example `if (!hits.length) return null;` followed by
   `return hits[0];` — as long as each one individually qualifies. Any other read (iteration,
   another index, another method, a numeric length use, passing the array along) disqualifies the
   whole cast.

5. **No dominating `firstHitOnly = true` already applies at the cast.** If the flag is provably
   set, suggesting it again would be noise; see the domination rule below.

### How `firstHitOnly` writes are ordered against the cast

The rule collects every assignment on the raycaster that can change `firstHitOnly` — a direct
`raycaster.firstHitOnly = ...` write, plus any write through a dynamic computed key such as
`raycaster[key] = ...`, which might target `firstHitOnly` without naming it. Reads of the flag
(`const flag = raycaster.firstHitOnly`) are not writes and never enable it. It then decides
whether the flag is already provably enabled at the cast:

- A write **dominates** the cast only when it is a statement of a straight-line block — the
  `Program`, a `BlockStatement`, or a class static block — that encloses the cast AND precedes
  it in source order. Such a write runs on every path that reaches the cast.
- Among the dominating writes, the **last** one before the cast wins. A later `false` therefore
  cancels an earlier `true`, and the rule reports:

  ```js
  function pick(mesh) {
    const raycaster = new Raycaster();
    raycaster.firstHitOnly = true;
    raycaster.firstHitOnly = false;
    const hits = raycaster.intersectObject(mesh);
    return hits[0];
  }
  ```

- A write that does **not** dominate cannot affect this cast, so the rule still reports. There
  are two cases. A write inside an `if` block runs on some paths only:

  ```js
  function pick(mesh, fast) {
    const raycaster = new Raycaster();
    if (fast) {
      raycaster.firstHitOnly = true;
    }
    const hits = raycaster.intersectObject(mesh);
    return hits[0];
  }
  ```

  And a write after the cast runs later:

  ```js
  function pick(mesh) {
    const raycaster = new Raycaster();
    const hits = raycaster.intersectObject(mesh);
    raycaster.firstHitOnly = true;
    return hits[0];
  }
  ```

  Ignoring these writes is sound precisely because precondition 3 requires the raycaster to be
  immutable, non-escaping, and scope-local: no code outside the straight-line statements this
  file spells out can have set the flag first.

- **Any write whose value the rule cannot evaluate silences the rule entirely**, regardless of
  where it appears. That covers a non-boolean-literal right-hand side
  (`raycaster.firstHitOnly = wantFirst`), a compound assignment such as
  `raycaster.firstHitOnly ||= true`, and a write through a dynamic computed key
  (`raycaster[key] = true`). In each case the flag's state at the cast is unknown, and the rule
  never guesses.

## Not reported

- An unused result — with zero resolved reads there is nothing to prove.
- A result that is returned, passed as an argument, spread (`[...hits]`), or used as a computed
  key (`table[hits]`).
- A destructuring cast such as `const [first] = raycaster.intersectObject(mesh)`, which already
  takes only the first hit.
- A `let` or `var` result binding, or a declarator whose initializer is not a cast at all.
- Iteration over the result (`for (const hit of hits)`).
- Any other index: `hits[1]`, `hits[-1]`, a dynamic index (`hits[index]`), or an index behind an
  unsupported expression such as `hits[~0]` or `hits[+"0"]`.
- `hits.at(1)`, `hits.at()` with no argument, or `hits.at` read without being called.
- Another array method such as `hits.find(isVisible)`.
- A numeric length use: `hits.length > 1`, `hits.length + 1`, passing `hits.length` to a
  function, or comparing length against a dynamic value (`hits.length === limit`).
- Comparing the result array itself (`hits === null`).
- A result captured by a nested function, which may run at any time, so the observed reads are
  no longer provably the complete set.
- A raycaster read from a nested function (not scope-local), a raycaster passed to other code
  (`configure(raycaster)`, an escape), or a mutable raycaster binding.
- A raycaster constructed from a class that does not resolve to `Raycaster` from `three` or
  `three/webgpu` — for example a `CustomRaycaster` from another picking library.
- A file with no prototype activation, or an activation that assigns a different function, a
  different prototype method (`Mesh.prototype.raycastFirst = ...`), skips `.prototype`
  (`Mesh.raycast = ...`), or targets a non-Three or unsupported class (`Line`, or a `Mesh` from
  an unrelated package).
- A type-only import from `three-mesh-bvh` (`import type { MeshBVH } ...`), which is not a
  runtime import.
- A cast callee that is not a member expression (`castAgainst(mesh)`), a cast receiver that is a
  call result (`makeRaycaster().intersectObject(mesh)`), or a different raycaster method such as
  `setFromCamera`.
- Any `firstHitOnly` write the rule cannot evaluate to a plain boolean literal, anywhere on the
  raycaster, and any dominating `firstHitOnly = true` that is not cancelled by a later
  dominating `false`.

## Static limits

This plugin performs no runtime analysis: it does not estimate callback frequency, FPS, GPU time, draw calls, asset encoding, resource ownership, iteration count, or scene suitability.

For this rule specifically:

- It reasons only about straight-line statement order within one function scope. It does not
  perform control-flow analysis (a write inside a branch is never ordered against the cast) and
  no interprocedural analysis (a raycaster or result that leaves its function scope is abandoned,
  not followed).
- It cannot tell whether a BVH has actually been computed for the geometry being cast against —
  only that `acceleratedRaycast` was installed on the prototype — nor whether first-hit behavior
  is acceptable for the surrounding logic.
- Whether enabling `firstHitOnly` is a win at all depends on the scene, the ray, and the BVH,
  none of which syntax can see; the rule only proves the result is never used beyond the first
  hit or an emptiness test.

## Examples

### Incorrect

```js
import { Mesh, Raycaster } from "three";
import { acceleratedRaycast } from "three-mesh-bvh";
Mesh.prototype.raycast = acceleratedRaycast;

function pick(mesh) {
  const raycaster = new Raycaster();
  const hits = raycaster.intersectObject(mesh);
  return hits[0];
}
```

### Correct

```js
import { Mesh, Raycaster } from "three";
import { acceleratedRaycast } from "three-mesh-bvh";
Mesh.prototype.raycast = acceleratedRaycast;

function pick(mesh) {
  const raycaster = new Raycaster();
  raycaster.firstHitOnly = true;
  const hits = raycaster.intersectObject(mesh);
  return hits[0];
}
```

## Options

This rule has no options. Its schema is `[]`, and it ignores any configuration passed to it.

## Suggestions

This rule provides no editor suggestions and is never autofixable. `firstHitOnly` is persistent
state on the raycaster, not a per-call option: inserting `raycaster.firstHitOnly = true` before
one cast would silently change every later cast made with the same raycaster. Where the flag
should be set and whether it should be reset afterwards are design decisions the plugin cannot
make safely, so it reports and leaves the edit to you.

## Parsers and imports

The rule is parser-neutral and works under Espree and `@typescript-eslint/parser`. TypeScript
wrappers (`as`, `satisfies`, `!`, angle-bracket assertions) and optional chaining are
transparent, so `raycaster!.intersectObject(mesh)` is analyzed exactly like the unwrapped call.
Type-only imports and `require()` are not runtime imports: a file that imports `three-mesh-bvh`
only through `import type` has no activation and is never reported. JSX/TSX plays no role in
this rule. The plugin never loads Three.js, three-mesh-bvh, or any framework package — all
matching is done on import syntax and scope bindings alone.

## Presets

Enabled by `three/all` only. It is not part of `three/recommended`.

## References

- [three-mesh-bvh README](https://github.com/gkjohnson/three-mesh-bvh/blob/master/README.md) —
  the `acceleratedRaycast` setup and the `firstHitOnly` raycaster flag this rule points at.
- Audit cause `RP-01` in [the repository's Three.js performance audit](../../THREEJS-PERFORMANCE-AUDIT.md).
