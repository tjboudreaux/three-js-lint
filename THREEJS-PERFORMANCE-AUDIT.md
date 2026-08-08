# three.js performance audit

As of `2026-08-07 UTC`, every issue matching [`repo:mrdoob/three.js is:issue performance`](https://github.com/mrdoob/three.js/issues?q=performance) — **1232 issues, all read in full and dispositioned**.

**63.1% name a performance mechanism; 32.1% establish one.** The two figures are different claims and must not be collapsed: 778 issues (396 `cause_established` + 382 `cause_asserted_unverified`) name a specific mechanism, while only the 396 `cause_established` issues back one with a measurement, a bisect, a maintainer statement, or an upstream bug.

Per-issue register: [`THREEJS-PERFORMANCE-AUDIT-register.csv`](THREEJS-PERFORMANCE-AUDIT-register.csv) — one row per issue: verdict, cause IDs, ruled-out findings, evidence quotes.

## Method

| Step                    | Result                                                                            |
| ----------------------- | --------------------------------------------------------------------------------- |
| Issues enumerated       | **1232** — equals GitHub's own `total_count`, so the corpus is provably complete  |
| Comments fetched        | **16,148** — equals the sum of every issue's `totalCount`; zero truncation        |
| Corpus                  | 9,719,291 characters                                                              |
| Classification          | 3 independent passes; all 290 disagreements adjudicated per-issue                 |
| Provenance              | every cited quote matched verbatim against its thread (1410/1413)                 |
| Semantic review         | all causes re-read in context; **102 rejected** as unsupported                    |
| Negative-finding filter | **114** "causes" were threads concluding something is _not_ slow — reclassified   |
| Deduplication           | **78** repeated (issue, cause) pairs collapsed                                    |
| Result                  | **1116** verified observations → **302** distinct root causes                     |
| Accuracy                | 89% verdict agreement vs. independent re-read; 1 invented mechanism in 90 audited |

### Disposition of all 1232 issues

| Verdict                     |    Count |    Share | Meaning                                                                                    |
| --------------------------- | -------: | -------: | ------------------------------------------------------------------------------------------ |
| `cause_established`         |      396 |    32.1% | A concrete mechanism, backed by a measurement, a bisect, a maintainer, or an upstream bug  |
| `cause_asserted_unverified` |      382 |    31.0% | A specific mechanism named, but only asserted or speculated                                |
| `incidental`                |      207 |    16.8% | The word appears with no performance content (pasted `performance.now()`, a URL, an aside) |
| `no_mechanism`              |      139 |    11.3% | Performance genuinely discussed, but no mechanism ever identified                          |
| `ruled_out_or_no_cause`     |       55 |     4.5% | The only findings were negative — the thread concluded the suspected cost is not real      |
| `duplicate`                 |       53 |     4.3% | Closed as a duplicate                                                                      |
| **Total**                   | **1232** | **100%** |                                                                                            |

### Where the causes live, and how they could be caught

| Owner             | Root causes |     | Detectability        | Root causes | Observed-cost only |
| ----------------- | ----------: | --- | -------------------- | ----------: | -----------------: |
| three_core        |         214 |     | static_lint          |          96 |                 75 |
| app_developer     |          48 |     | design_review        |          80 |                 42 |
| browser_or_driver |          32 |     | runtime_profile_only |          55 |                 40 |
| asset_pipeline    |           7 |     | upstream_only        |          41 |                 36 |
| addon             |           1 |     | static_asset_check   |          30 |                 23 |

### ESLint disposition of the 96 static-lint causes

`static_lint` in the table above means the _mechanism_ is visible in application source, not that a
conservative linter can prove the _precondition_. Of the 96 causes labelled `static_lint`, **19 have a
sound syntax slice in `eslint-plugin-threejslint`** and **77 are deliberately rejected**, because the missing
precondition is runtime-, asset-, ownership-, interprocedural-, or upstream-only.

The 77 rejections are grouped by the precondition a syntax-only rule cannot establish:

| Rejection reason                      | Causes | Why syntax cannot decide it                                                                                  |
| ------------------------------------- | -----: | ------------------------------------------------------------------------------------------------------------ |
| `core/upstream implementation`        |     28 | The cost lives in three.js itself, a browser, or a driver; no application-source edit removes it             |
| `runtime or scene-scale precondition` |     21 | Whether the pattern is slow depends on object count, frequency, or frame budget, which is a runtime property |
| `asset or numeric suitability`        |     12 | The decision needs texture encoding, precision, or data-size facts a linter cannot read                      |
| `ownership/lifetime/dataflow`         |     12 | Correctness depends on who owns and later releases a resource, which crosses function and module boundaries  |
| `generic/interprocedural JavaScript`  |      4 | The advice is general JS engine behaviour, not Three.js-specific, and needs whole-program analysis           |
| **Total**                             | **77** |                                                                                                              |

This ledger is the complete disposition. Rule pages and the README summarize the boundary and link
here rather than duplicating these rows.

| Cause                                                                                                       | Disposition         | Rule or rejection reason                                                                                                                          |
| ----------------------------------------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`AAM-01`](#aam-01-recreate-resources-per-objectframe-instead-of-sharing)                                   | enforceable         | `three/no-three-allocation-in-render-loop`                                                                                                        |
| [`AAM-02`](#aam-02-render-continuously-instead-of-on-demand-_open_)                                         | not safely lintable | runtime or scene-scale precondition                                                                                                               |
| [`AAM-03`](#aam-03-duplicate-webgl-contexts-renderers-or-render-loops-_open_)                               | not safely lintable | runtime or scene-scale precondition                                                                                                               |
| [`AAM-04`](#aam-04-misuse-of-updateinvalidation-api-semantics)                                              | not safely lintable | ownership/lifetime/dataflow                                                                                                                       |
| [`AAM-05`](#aam-05-enable-features-the-shader-or-app-never-uses-_open_)                                     | not safely lintable | runtime or scene-scale precondition                                                                                                               |
| [`AAM-06`](#aam-06-redundant-cpu-recomputation-of-derivable-data)                                           | not safely lintable | runtime or scene-scale precondition                                                                                                               |
| [`AAM-08`](#aam-08-per-frame-work-on-idle-or-hidden-state)                                                  | not safely lintable | runtime or scene-scale precondition                                                                                                               |
| [`AAM-09`](#aam-09-js-engine-deoptimization-from-app-code-or-build-config)                                  | enforceable         | `three/no-non-numeric-vector-components`                                                                                                          |
| [`AAM-10`](#aam-10-excess-geometry-from-wrong-parameters-or-stray-objects)                                  | not safely lintable | asset or numeric suitability                                                                                                                      |
| [`AAM-11`](#aam-11-attribute-0-disabled-triggering-browser-emulation)                                       | not safely lintable | asset or numeric suitability                                                                                                                      |
| [`AAM-13`](#aam-13-oversized-drawing-buffer-from-bad-sizingdpr-handling-_open_)                             | enforceable         | `three/no-direct-device-pixel-ratio`                                                                                                              |
| [`AAM-15`](#aam-15-controls-bound-to-document-rather-than-canvas-_proposed-optimization_)                   | not safely lintable | ownership/lifetime/dataflow                                                                                                                       |
| [`AS-08`](#as-08-redundant-load-time-track-validation-and-allocation-_proposed-optimization_)               | not safely lintable | core/upstream implementation                                                                                                                      |
| [`BSLT-01`](#bslt-01-module-scope-side-effects-defeat-tree-shaking)                                         | not safely lintable | core/upstream implementation                                                                                                                      |
| [`BSLT-04`](#bslt-04-non-es6-prototype-based-classes-are-opaque-to-bundlers)                                | not safely lintable | core/upstream implementation                                                                                                                      |
| [`CAH-03`](#cah-03-on2-brute-force-scans-lacking-spatialhash-indexing)                                      | not safely lintable | runtime or scene-scale precondition                                                                                                               |
| [`CAH-06`](#cah-06-function-call-and-iteration-wrapper-overhead-in-inner-loops)                             | not safely lintable | runtime or scene-scale precondition                                                                                                               |
| [`CAH-09`](#cah-09-slow-prototypeclass-construction-patterns)                                               | not safely lintable | generic/interprocedural JavaScript                                                                                                                |
| [`CAH-12`](#cah-12-for-in-iteration-over-objects-blocks-jit-optimization)                                   | not safely lintable | generic/interprocedural JavaScript                                                                                                                |
| [`CAH-17`](#cah-17-expensive-scalar-ops-divides-sqrt-trig-in-loops-_proposed-optimization_)                 | enforceable         | `three/prefer-squared-vector-magnitude`                                                                                                           |
| [`CAH-20`](#cah-20-full-recomputation-of-boundsnormals-over-all-vertices)                                   | enforceable         | `three/no-bounds-recompute-in-render-loop`, `three/no-geometry-recompute-in-render-loop`                                                          |
| [`CAH-27`](#cah-27-idle-animation-loop-keeps-re-requesting-frames-_hypothetical_)                           | not safely lintable | core/upstream implementation                                                                                                                      |
| [`CASI-06`](#casi-06-culling-silently-disabled-by-app-or-missing-data)                                      | not safely lintable | ownership/lifetime/dataflow                                                                                                                       |
| [`CASI-10`](#casi-10-brute-force-rayintersection-queries-without-spatial-index-_proposed-optimization_)     | not safely lintable | runtime or scene-scale precondition                                                                                                               |
| [`CGSS-01`](#cgss-01-synchronous-readpixels-readback-blocks-main-thread)                                    | enforceable         | `three/no-synchronous-gpu-operation-in-render-loop`                                                                                               |
| [`CGSS-03`](#cgss-03-explicit-glfinish-blocks-until-gpu-idle)                                               | enforceable         | `three/no-synchronous-gpu-operation-in-render-loop`                                                                                               |
| [`DBD-13`](#dbd-13-alphafalse-forces-emulated-rgb-framebuffer-_proposed-optimization_)                      | not safely lintable | core/upstream implementation                                                                                                                      |
| [`DCO-01`](#dco-01-one-draw-call-per-mesh-object-no-batching-_open_)                                        | not safely lintable | runtime or scene-scale precondition                                                                                                               |
| [`DCO-04`](#dco-04-per-element-objects-instead-of-batched-particlesprite-systems)                           | not safely lintable | runtime or scene-scale precondition                                                                                                               |
| [`DCO-07`](#dco-07-software-renderers-emit-one-primitive-per-face)                                          | not safely lintable | core/upstream implementation                                                                                                                      |
| [`DCO-12`](#dco-12-immediate-mode-per-face-submission-of-static-meshes)                                     | not safely lintable | core/upstream implementation                                                                                                                      |
| [`DCO-14`](#dco-14-multi-material-helpers-create-one-mesh-per-material-_hypothetical_)                      | not safely lintable | runtime or scene-scale precondition                                                                                                               |
| [`FOR-02`](#for-02-doubleside-disables-backface-culling-doubling-fragments)                                 | not safely lintable | asset or numeric suitability                                                                                                                      |
| [`GBU-01`](#gbu-01-rebuildingreallocating-geometry-buffers-every-frame)                                     | enforceable         | `three/no-three-allocation-in-render-loop`                                                                                                        |
| [`GBU-02`](#gbu-02-legacy-geometry-object-based-storage-and-conversion-overhead)                            | not safely lintable | core/upstream implementation                                                                                                                      |
| [`GBU-03`](#gbu-03-re-upload-whole-buffer-instead-of-sub-range-updates)                                     | not safely lintable | asset or numeric suitability                                                                                                                      |
| [`GBU-06`](#gbu-06-cpu-side-per-vertex-recomputation-each-frame)                                            | enforceable         | `three/no-bounds-recompute-in-render-loop`, `three/no-geometry-recompute-in-render-loop`                                                          |
| [`GBU-09`](#gbu-09-dynamic-vbo-usage-inherently-slower-and-keeps-cpu-arrays)                                | not safely lintable | asset or numeric suitability                                                                                                                      |
| [`GBU-10`](#gbu-10-merging-geometries-duplicates-and-reallocates-attribute-buffers)                         | not safely lintable | ownership/lifetime/dataflow                                                                                                                       |
| [`GBU-17`](#gbu-17-non-buffergeometry-path-has-larger-memory-footprint-_hypothetical_)                      | not safely lintable | core/upstream implementation                                                                                                                      |
| [`LPC-01`](#lpc-01-synchronous-parsing-blocks-the-main-thread)                                              | enforceable         | `three/no-three-loader-parse-in-render-loop`                                                                                                      |
| [`LPC-03`](#lpc-03-inefficient-parser-inner-loops-and-data-conversions)                                     | not safely lintable | core/upstream implementation                                                                                                                      |
| [`LPC-05`](#lpc-05-redundant-fetching-and-missing-caching-_open-proposed-optimization_)                     | not safely lintable | runtime or scene-scale precondition                                                                                                               |
| [`LUU-11`](#luu-11-expensive-math-in-shader-instead-of-precomputed-uniform-_proposed-optimization_)         | not safely lintable | asset or numeric suitability                                                                                                                      |
| [`LUU-13`](#luu-13-jit-deoptimization-in-uniform-upload-path-_hypothetical_)                                | not safely lintable | core/upstream implementation                                                                                                                      |
| [`MLD-01`](#mld-01-app-never-calls-dispose-on-removed-geometriesmaterialstextures)                          | not safely lintable | ownership/lifetime/dataflow                                                                                                                       |
| [`MLD-02`](#mld-02-replacing-geometry-attributes-orphans-old-gpu-buffers)                                   | not safely lintable | ownership/lifetime/dataflow                                                                                                                       |
| [`MLD-03`](#mld-03-dispose-event-listeners-accumulate-unboundedly)                                          | enforceable         | `three/no-ephemeral-dispose-listener-in-render-loop`                                                                                              |
| [`MLD-08`](#mld-08-helpers-and-workerwasm-loaders-lack-real-dispose-paths-_open_)                           | not safely lintable | core/upstream implementation                                                                                                                      |
| [`MLD-10`](#mld-10-retained-references-via-domconsole-keep-objects-alive)                                   | not safely lintable | ownership/lifetime/dataflow                                                                                                                       |
| [`MLD-12`](#mld-12-duplicating-shared-data-when-cloning-materialsgeometry-_hypothetical_)                   | enforceable         | `three/no-three-allocation-in-render-loop`                                                                                                        |
| [`MLD-13`](#mld-13-object-per-vertex-geometry-representation-inflates-heap-_proposed-optimization_)         | not safely lintable | core/upstream implementation                                                                                                                      |
| [`MWU-02`](#mwu-02-matrixautoupdate-recomposes-static-local-matrices)                                       | not safely lintable | ownership/lifetime/dataflow                                                                                                                       |
| [`MWU-04`](#mwu-04-redundant-repeated-updatematrixworld-calls-per-frame-_open_)                             | not safely lintable | runtime or scene-scale precondition                                                                                                               |
| [`MWU-05`](#mwu-05-ancestor-chain-updates-from-accessors-and-raycasts-_hypothetical_)                       | not safely lintable | core/upstream implementation                                                                                                                      |
| [`MWU-06`](#mwu-06-unconditional-per-frame-updates-in-helper-subclasses-_proposed-optimization_)            | not safely lintable | core/upstream implementation                                                                                                                      |
| [`O-01`](#o-01-allocation-and-memory-layout-of-per-frame-data)                                              | not safely lintable | runtime or scene-scale precondition                                                                                                               |
| [`O-02`](#o-02-accessorindirection-overhead-in-js-property-access-_proposed-optimization_)                  | not safely lintable | generic/interprocedural JavaScript                                                                                                                |
| [`O-04`](#o-04-domsvgcanvas-compositing-and-repaint-cost)                                                   | not safely lintable | runtime or scene-scale precondition                                                                                                               |
| [`O-05`](#o-05-js-engine-deopt-from-language-constructs-and-transpilation-_proposed-optimization_)          | not safely lintable | generic/interprocedural JavaScript                                                                                                                |
| [`O-11`](#o-11-excessive-distinct-materialobject-instances)                                                 | not safely lintable | runtime or scene-scale precondition                                                                                                               |
| [`PFAG-01`](#pfag-01-math-methods-allocate-temporary-vectorsmatrices-per-call-_open-proposed-optimization_) | enforceable         | `three/no-three-allocation-in-render-loop`, `three/no-three-allocating-call-in-render-loop`                                                       |
| [`PFAG-04`](#pfag-04-objectkeysarray-copies-in-hot-renderer-paths)                                          | not safely lintable | core/upstream implementation                                                                                                                      |
| [`PFAG-05`](#pfag-05-per-vertexper-element-js-wrapper-objects-in-geometry)                                  | not safely lintable | core/upstream implementation                                                                                                                      |
| [`PFAG-06`](#pfag-06-typed-array-and-buffer-reallocation-on-updates)                                        | not safely lintable | core/upstream implementation                                                                                                                      |
| [`PFAG-07`](#pfag-07-per-object-materialgeometry-cloning-at-construction)                                   | not safely lintable | ownership/lifetime/dataflow                                                                                                                       |
| [`PFAG-09`](#pfag-09-per-instance-closures-instead-of-prototype-methods)                                    | not safely lintable | core/upstream implementation                                                                                                                      |
| [`RP-01`](#rp-01-no-spatial-index-per-triangle-linear-raycast-_open_)                                       | enforceable         | `three/prefer-bvh-first-hit-only`                                                                                                                 |
| [`RTP-01`](#rtp-01-render-targets-sized-at-full-resolutiondpr-multiply-fragment-cost)                       | not safely lintable | asset or numeric suitability                                                                                                                      |
| [`RTP-02`](#rtp-02-separate-output-color-spacetone-mapping-pass-costs-fill-rate-_open_)                     | not safely lintable | runtime or scene-scale precondition                                                                                                               |
| [`RTP-03`](#rtp-03-extra-full-scene-re-render-for-reflectiontransmissiondepth-buffers)                      | not safely lintable | runtime or scene-scale precondition                                                                                                               |
| [`RTP-04`](#rtp-04-high-precisionfloat-render-target-memory-and-bandwidth)                                  | not safely lintable | asset or numeric suitability                                                                                                                      |
| [`RTP-07`](#rtp-07-environment-map-prefiltering-pmrem-regenerated-per-frame)                                | enforceable         | `three/no-pmrem-generation-in-render-loop`                                                                                                        |
| [`RTP-08`](#rtp-08-each-effect-requires-an-extra-full-screen-render-pass-_open-proposed-optimization_)      | not safely lintable | runtime or scene-scale precondition                                                                                                               |
| [`RTP-11`](#rtp-11-render-target-feedback-loops-and-missing-double-buffering)                               | not safely lintable | ownership/lifetime/dataflow                                                                                                                       |
| [`RTP-14`](#rtp-14-passes-do-no-early-exit-or-visibility-culling-_proposed-optimization_)                   | not safely lintable | runtime or scene-scale precondition                                                                                                               |
| [`SGS-04`](#sgs-04-linear-child-search-makes-addremove-quadratic)                                           | not safely lintable | core/upstream implementation                                                                                                                      |
| [`SGS-06`](#sgs-06-object-based-geometry-slower-and-heavier-than-buffergeometry-_proposed-optimization_)    | not safely lintable | core/upstream implementation                                                                                                                      |
| [`SM-03`](#sm-03-oversized-or-untight-shadow-frusta-and-map-sizes)                                          | not safely lintable | asset or numeric suitability                                                                                                                      |
| [`SM-08`](#sm-08-scissor-state-leaks-into-shadow-depth-pass)                                                | not safely lintable | core/upstream implementation                                                                                                                      |
| [`SPC-04`](#spc-04-nodetsl-graph-rebuilt-per-material-instance-_open_)                                      | not safely lintable | core/upstream implementation                                                                                                                      |
| [`SPC-07`](#spc-07-rebuild-triggered-by-geometry-or-node-mutation)                                          | not safely lintable | runtime or scene-scale precondition                                                                                                               |
| [`SPC-09`](#spc-09-cache-key-too-coarse-wrong-program-shared)                                               | enforceable         | `three/no-shader-recompile-in-render-loop` (existing material `needsUpdate` branch)                                                               |
| [`SPC-11`](#spc-11-precompilation-incomplete-or-too-costly-to-use)                                          | enforceable         | `three/no-shader-recompile-in-render-loop` (new renderer `compile`/`compileAsync` branch)                                                         |
| [`SPC-12`](#spc-12-precision-qualifier-defaults-hurt-mobile)                                                | not safely lintable | asset or numeric suitability                                                                                                                      |
| [`TS-02`](#ts-02-per-particleper-vertex-cpu-depth-sorting)                                                  | not safely lintable | core/upstream implementation                                                                                                                      |
| [`TS-07`](#ts-07-expensive-user-comparator-recomputing-bounds-per-comparison)                               | enforceable         | `three/no-bounds-recompute-in-render-loop`, `three/no-three-allocation-in-render-loop` (renderer sort comparators are now verified hot callbacks) |
| [`TUD-01`](#tud-01-main-thread-synchronous-image-decode-and-upload-blocks-frames)                           | not safely lintable | core/upstream implementation                                                                                                                      |
| [`TUD-02`](#tud-02-per-texture-upload-keying-duplicates-identical-images-on-gpu)                            | not safely lintable | core/upstream implementation                                                                                                                      |
| [`TUD-05`](#tud-05-redundant-per-frame-video-texture-uploads)                                               | not safely lintable | core/upstream implementation                                                                                                                      |
| [`TUD-09`](#tud-09-full-re-upload-when-only-a-sub-region-changed)                                           | not safely lintable | asset or numeric suitability                                                                                                                      |
| [`TUD-10`](#tud-10-intermediate-2d-canvas-copy-of-video-frames-per-frame)                                   | not safely lintable | asset or numeric suitability                                                                                                                      |
| [`WBO-05`](#wbo-05-per-camera-render-context-creation-repeated-on-cloned-cameras)                           | enforceable         | `three/no-three-allocation-in-render-loop`                                                                                                        |
| [`WO-01`](#wo-01-serializecopy-geometry-across-worker-boundary)                                             | not safely lintable | ownership/lifetime/dataflow                                                                                                                       |
| [`WO-02`](#wo-02-worker-startup-and-decoder-duplication-cost-_open_)                                        | not safely lintable | core/upstream implementation                                                                                                                      |
| [`WO-03`](#wo-03-in-worker-fetching-serializes-download-with-parsing)                                       | not safely lintable | ownership/lifetime/dataflow                                                                                                                       |

---

## Top 30 root causes

| ID        | Root cause                                                               |   n | Evidence             | Owner             | Detect               | Issues                                                                                                                                                                                                                                                                                                                                                                  |
| --------- | ------------------------------------------------------------------------ | --: | -------------------- | ----------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DCO-01`  | One draw call per Mesh object; no batching **(open)**                    |  13 | measured             | app_developer     | static_lint          | [#108](https://github.com/mrdoob/three.js/issues/108) [#720](https://github.com/mrdoob/three.js/issues/720) [#1370](https://github.com/mrdoob/three.js/issues/1370) [#2598](https://github.com/mrdoob/three.js/issues/2598) [#2800](https://github.com/mrdoob/three.js/issues/2800) [#3082](https://github.com/mrdoob/three.js/issues/3082) _(+7 more)_                 |
| `RP-01`   | No spatial index; per-triangle linear raycast **(open)**                 |  11 | measured             | three_core        | static_lint          | [#966](https://github.com/mrdoob/three.js/issues/966) [#1711](https://github.com/mrdoob/three.js/issues/1711) [#2148](https://github.com/mrdoob/three.js/issues/2148) [#5366](https://github.com/mrdoob/three.js/issues/5366) [#6978](https://github.com/mrdoob/three.js/issues/6978) [#12767](https://github.com/mrdoob/three.js/issues/12767) _(+5 more)_             |
| `SPC-01`  | State baked into shader forces recompile on change **(open)**            |  14 | maintainer_confirmed | three_core        | design_review        | [#25](https://github.com/mrdoob/three.js/issues/25) [#509](https://github.com/mrdoob/three.js/issues/509) [#598](https://github.com/mrdoob/three.js/issues/598) [#1055](https://github.com/mrdoob/three.js/issues/1055) [#1534](https://github.com/mrdoob/three.js/issues/1534) [#1945](https://github.com/mrdoob/three.js/issues/1945) _(+8 more)_                     |
| `DBD-01`  | Browser WebGL/ANGLE backend regressions slow rendering **(open)**        |  13 | upstream_bug         | browser_or_driver | upstream_only        | [#507](https://github.com/mrdoob/three.js/issues/507) [#1959](https://github.com/mrdoob/three.js/issues/1959) [#2069](https://github.com/mrdoob/three.js/issues/2069) [#5233](https://github.com/mrdoob/three.js/issues/5233) [#11610](https://github.com/mrdoob/three.js/issues/11610) [#16684](https://github.com/mrdoob/three.js/issues/16684) _(+7 more)_           |
| `DCO-02`  | Many materials split a mesh into many groups                             |   9 | measured             | app_developer     | static_asset_check   | [#285](https://github.com/mrdoob/three.js/issues/285) [#420](https://github.com/mrdoob/three.js/issues/420) [#465](https://github.com/mrdoob/three.js/issues/465) [#1121](https://github.com/mrdoob/three.js/issues/1121) [#2083](https://github.com/mrdoob/three.js/issues/2083) [#2638](https://github.com/mrdoob/three.js/issues/2638) _(+3 more)_                   |
| `PFAG-01` | Math methods allocate temporary vectors/matrices per call **(open)**     |  18 | maintainer_confirmed | three_core        | static_lint          | [#36](https://github.com/mrdoob/three.js/issues/36) [#323](https://github.com/mrdoob/three.js/issues/323) [#2435](https://github.com/mrdoob/three.js/issues/2435) [#2543](https://github.com/mrdoob/three.js/issues/2543) [#2752](https://github.com/mrdoob/three.js/issues/2752) [#2936](https://github.com/mrdoob/three.js/issues/2936) _(+12 more)_                  |
| `MWU-01`  | No dirty flags: full scene traversal each frame **(open)**               |   9 | measured             | three_core        | design_review        | [#2638](https://github.com/mrdoob/three.js/issues/2638) [#13909](https://github.com/mrdoob/three.js/issues/13909) [#14360](https://github.com/mrdoob/three.js/issues/14360) [#20220](https://github.com/mrdoob/three.js/issues/20220) [#21387](https://github.com/mrdoob/three.js/issues/21387) [#22530](https://github.com/mrdoob/three.js/issues/22530) _(+3 more)_   |
| `CAH-01`  | Property accessors and defineProperty deoptimize math objects            |   9 | measured             | three_core        | design_review        | [#4599](https://github.com/mrdoob/three.js/issues/4599) [#4870](https://github.com/mrdoob/three.js/issues/4870) [#5241](https://github.com/mrdoob/three.js/issues/5241) [#9536](https://github.com/mrdoob/three.js/issues/9536) [#10915](https://github.com/mrdoob/three.js/issues/10915) [#18090](https://github.com/mrdoob/three.js/issues/18090) _(+3 more)_         |
| `CAH-05`  | Per-object per-frame renderer bookkeeping and cache lookups              |   9 | measured             | three_core        | design_review        | [#285](https://github.com/mrdoob/three.js/issues/285) [#8552](https://github.com/mrdoob/three.js/issues/8552) [#14576](https://github.com/mrdoob/three.js/issues/14576) [#14898](https://github.com/mrdoob/three.js/issues/14898) [#20072](https://github.com/mrdoob/three.js/issues/20072) [#20457](https://github.com/mrdoob/three.js/issues/20457) _(+3 more)_       |
| `CAH-06`  | Function-call and iteration wrapper overhead in inner loops              |   9 | measured             | three_core        | static_lint          | [#2813](https://github.com/mrdoob/three.js/issues/2813) [#2860](https://github.com/mrdoob/three.js/issues/2860) [#7522](https://github.com/mrdoob/three.js/issues/7522) [#9088](https://github.com/mrdoob/three.js/issues/9088) [#9375](https://github.com/mrdoob/three.js/issues/9375) [#9662](https://github.com/mrdoob/three.js/issues/9662) _(+3 more)_             |
| `GBU-01`  | Rebuilding/reallocating geometry buffers every frame                     |  12 | maintainer_confirmed | app_developer     | static_lint          | [#79](https://github.com/mrdoob/three.js/issues/79) [#108](https://github.com/mrdoob/three.js/issues/108) [#1091](https://github.com/mrdoob/three.js/issues/1091) [#2875](https://github.com/mrdoob/three.js/issues/2875) [#4324](https://github.com/mrdoob/three.js/issues/4324) [#7179](https://github.com/mrdoob/three.js/issues/7179) _(+6 more)_                   |
| `RTP-03`  | Extra full-scene re-render for reflection/transmission/depth buffers     |  11 | maintainer_confirmed | three_core        | static_lint          | [#43](https://github.com/mrdoob/three.js/issues/43) [#3856](https://github.com/mrdoob/three.js/issues/3856) [#12098](https://github.com/mrdoob/three.js/issues/12098) [#12115](https://github.com/mrdoob/three.js/issues/12115) [#12857](https://github.com/mrdoob/three.js/issues/12857) [#13807](https://github.com/mrdoob/three.js/issues/13807) _(+5 more)_         |
| `DBD-02`  | Mobile/integrated GPU capability limits                                  |   8 | measured             | browser_or_driver | upstream_only        | [#325](https://github.com/mrdoob/three.js/issues/325) [#4074](https://github.com/mrdoob/three.js/issues/4074) [#7972](https://github.com/mrdoob/three.js/issues/7972) [#8110](https://github.com/mrdoob/three.js/issues/8110) [#12201](https://github.com/mrdoob/three.js/issues/12201) [#14570](https://github.com/mrdoob/three.js/issues/14570) _(+2 more)_           |
| `CAH-02`  | Per-call validation and asserts in hot math methods                      |   8 | measured             | three_core        | design_review        | [#5160](https://github.com/mrdoob/three.js/issues/5160) [#5511](https://github.com/mrdoob/three.js/issues/5511) [#11241](https://github.com/mrdoob/three.js/issues/11241) [#12574](https://github.com/mrdoob/three.js/issues/12574) [#12578](https://github.com/mrdoob/three.js/issues/12578) [#13383](https://github.com/mrdoob/three.js/issues/13383) _(+2 more)_     |
| `LUU-02`  | No dirty-checking of unchanged uniform uploads **(open)**                |   8 | measured             | three_core        | design_review        | [#8431](https://github.com/mrdoob/three.js/issues/8431) [#9662](https://github.com/mrdoob/three.js/issues/9662) [#9741](https://github.com/mrdoob/three.js/issues/9741) [#14004](https://github.com/mrdoob/three.js/issues/14004) [#16355](https://github.com/mrdoob/three.js/issues/16355) [#16922](https://github.com/mrdoob/three.js/issues/16922) _(+2 more)_       |
| `LPC-01`  | Synchronous parsing blocks the main thread                               |   8 | measured             | three_core        | static_lint          | [#387](https://github.com/mrdoob/three.js/issues/387) [#906](https://github.com/mrdoob/three.js/issues/906) [#1778](https://github.com/mrdoob/three.js/issues/1778) [#9756](https://github.com/mrdoob/three.js/issues/9756) [#10580](https://github.com/mrdoob/three.js/issues/10580) [#11301](https://github.com/mrdoob/three.js/issues/11301) _(+2 more)_             |
| `LPC-03`  | Inefficient parser inner loops and data conversions                      |   8 | measured             | three_core        | static_lint          | [#2986](https://github.com/mrdoob/three.js/issues/2986) [#3335](https://github.com/mrdoob/three.js/issues/3335) [#6682](https://github.com/mrdoob/three.js/issues/6682) [#9756](https://github.com/mrdoob/three.js/issues/9756) [#11287](https://github.com/mrdoob/three.js/issues/11287) [#11398](https://github.com/mrdoob/three.js/issues/11398) _(+2 more)_         |
| `CAH-04`  | Expensive per-fragment PBR/shader ALU work **(open)**                    |   7 | measured             | three_core        | runtime_profile_only | [#1324](https://github.com/mrdoob/three.js/issues/1324) [#8718](https://github.com/mrdoob/three.js/issues/8718) [#18265](https://github.com/mrdoob/three.js/issues/18265) [#19498](https://github.com/mrdoob/three.js/issues/19498) [#21129](https://github.com/mrdoob/three.js/issues/21129) [#21578](https://github.com/mrdoob/three.js/issues/21578) _(+1 more)_     |
| `RTP-02`  | Separate output color-space/tone-mapping pass costs fill rate **(open)** |   7 | measured             | three_core        | static_lint          | [#22009](https://github.com/mrdoob/three.js/issues/22009) [#23019](https://github.com/mrdoob/three.js/issues/23019) [#23614](https://github.com/mrdoob/three.js/issues/23614) [#28831](https://github.com/mrdoob/three.js/issues/28831) [#29429](https://github.com/mrdoob/three.js/issues/29429) [#32273](https://github.com/mrdoob/three.js/issues/32273) _(+1 more)_ |
| `RTP-05`  | Render target allocation, retention and copy overhead **(open)**         |   7 | measured             | three_core        | runtime_profile_only | [#10981](https://github.com/mrdoob/three.js/issues/10981) [#26484](https://github.com/mrdoob/three.js/issues/26484) [#29898](https://github.com/mrdoob/three.js/issues/29898) [#32642](https://github.com/mrdoob/three.js/issues/32642) [#32689](https://github.com/mrdoob/three.js/issues/32689) [#33062](https://github.com/mrdoob/three.js/issues/33062) _(+1 more)_ |
| `RTP-01`  | Render targets sized at full resolution/DPR multiply fragment cost       |   7 | measured             | three_core        | static_lint          | [#323](https://github.com/mrdoob/three.js/issues/323) [#8139](https://github.com/mrdoob/three.js/issues/8139) [#12188](https://github.com/mrdoob/three.js/issues/12188) [#12489](https://github.com/mrdoob/three.js/issues/12489) [#21913](https://github.com/mrdoob/three.js/issues/21913) [#30017](https://github.com/mrdoob/three.js/issues/30017) _(+1 more)_       |
| `CAH-03`  | O(n^2) brute-force scans lacking spatial/hash indexing                   |   7 | measured             | three_core        | static_lint          | [#323](https://github.com/mrdoob/three.js/issues/323) [#509](https://github.com/mrdoob/three.js/issues/509) [#733](https://github.com/mrdoob/three.js/issues/733) [#3840](https://github.com/mrdoob/three.js/issues/3840) [#6031](https://github.com/mrdoob/three.js/issues/6031) [#10517](https://github.com/mrdoob/three.js/issues/10517) _(+1 more)_                 |
| `SPC-02`  | Program cache key too specific, causing per-frame recompiles             |   9 | maintainer_confirmed | three_core        | runtime_profile_only | [#5180](https://github.com/mrdoob/three.js/issues/5180) [#9325](https://github.com/mrdoob/three.js/issues/9325) [#18675](https://github.com/mrdoob/three.js/issues/18675) [#18699](https://github.com/mrdoob/three.js/issues/18699) [#18893](https://github.com/mrdoob/three.js/issues/18893) [#19056](https://github.com/mrdoob/three.js/issues/19056) _(+3 more)_     |
| `DCO-04`  | Per-element objects instead of batched particle/sprite systems           |   9 | maintainer_confirmed | app_developer     | static_lint          | [#161](https://github.com/mrdoob/three.js/issues/161) [#167](https://github.com/mrdoob/three.js/issues/167) [#244](https://github.com/mrdoob/three.js/issues/244) [#323](https://github.com/mrdoob/three.js/issues/323) [#349](https://github.com/mrdoob/three.js/issues/349) [#897](https://github.com/mrdoob/three.js/issues/897) _(+3 more)_                         |
| `AAM-01`  | Recreate resources per object/frame instead of sharing                   |   9 | maintainer_confirmed | app_developer     | static_lint          | [#2916](https://github.com/mrdoob/three.js/issues/2916) [#5821](https://github.com/mrdoob/three.js/issues/5821) [#5876](https://github.com/mrdoob/three.js/issues/5876) [#9754](https://github.com/mrdoob/three.js/issues/9754) [#9824](https://github.com/mrdoob/three.js/issues/9824) [#10490](https://github.com/mrdoob/three.js/issues/10490) _(+3 more)_           |
| `DCO-05`  | Asset pipeline/loader fragments meshes unnecessarily **(open)**          |   9 | maintainer_confirmed | asset_pipeline    | static_asset_check   | [#1807](https://github.com/mrdoob/three.js/issues/1807) [#2244](https://github.com/mrdoob/three.js/issues/2244) [#2476](https://github.com/mrdoob/three.js/issues/2476) [#5524](https://github.com/mrdoob/three.js/issues/5524) [#6682](https://github.com/mrdoob/three.js/issues/6682) [#15293](https://github.com/mrdoob/three.js/issues/15293) _(+3 more)_           |
| `DCO-03`  | Redundant per-draw GL state and attribute rebinding **(open)**           |   6 | measured             | three_core        | design_review        | [#679](https://github.com/mrdoob/three.js/issues/679) [#2633](https://github.com/mrdoob/three.js/issues/2633) [#2916](https://github.com/mrdoob/three.js/issues/2916) [#5186](https://github.com/mrdoob/three.js/issues/5186) [#30560](https://github.com/mrdoob/three.js/issues/30560) [#33821](https://github.com/mrdoob/three.js/issues/33821)                       |
| `CGSS-01` | Synchronous readPixels readback blocks main thread                       |   6 | measured             | three_core        | static_lint          | [#966](https://github.com/mrdoob/three.js/issues/966) [#20530](https://github.com/mrdoob/three.js/issues/20530) [#22779](https://github.com/mrdoob/three.js/issues/22779) [#27171](https://github.com/mrdoob/three.js/issues/27171) [#27339](https://github.com/mrdoob/three.js/issues/27339) [#28389](https://github.com/mrdoob/three.js/issues/28389)                 |
| `PFAG-03` | Per-frame render-list and light-state rebuilding                         |   6 | measured             | three_core        | runtime_profile_only | [#643](https://github.com/mrdoob/three.js/issues/643) [#1524](https://github.com/mrdoob/three.js/issues/1524) [#8220](https://github.com/mrdoob/three.js/issues/8220) [#9525](https://github.com/mrdoob/three.js/issues/9525) [#14576](https://github.com/mrdoob/three.js/issues/14576) [#22530](https://github.com/mrdoob/three.js/issues/22530)                       |
| `LUU-01`  | Per-object UBO binding and upload overhead **(open)**                    |   6 | measured             | three_core        | design_review        | [#8552](https://github.com/mrdoob/three.js/issues/8552) [#26673](https://github.com/mrdoob/three.js/issues/26673) [#28968](https://github.com/mrdoob/three.js/issues/28968) [#30560](https://github.com/mrdoob/three.js/issues/30560) [#32916](https://github.com/mrdoob/three.js/issues/32916) [#33428](https://github.com/mrdoob/three.js/issues/33428)               |

---

## Full catalogue

All 302 root causes, with every contributing issue attached.

### Core algorithmic hot paths

_102 observations → 27 distinct causes_

#### `CAH-01` Property accessors and defineProperty deoptimize math objects

Getter/setter accessors for x/y/z and per-instance Object.defineProperty descriptors are not JIT-optimized, adding per-access and per-instantiation overhead in transform hot paths. Plain data properties on the prototype are far faster.

`measured` · owner: three_core · detect: design_review · 9 issues

[#4599](https://github.com/mrdoob/three.js/issues/4599) [#4870](https://github.com/mrdoob/three.js/issues/4870) [#5241](https://github.com/mrdoob/three.js/issues/5241) [#9536](https://github.com/mrdoob/three.js/issues/9536) [#10915](https://github.com/mrdoob/three.js/issues/10915) [#18090](https://github.com/mrdoob/three.js/issues/18090) [#21209](https://github.com/mrdoob/three.js/issues/21209) [#21284](https://github.com/mrdoob/three.js/issues/21284) [#24093](https://github.com/mrdoob/three.js/issues/24093)

#### `CAH-05` Per-object per-frame renderer bookkeeping and cache lookups

WebGPU/WebGL render loops do chained type checks, material-property comparisons (~25–55 props), nested WeakMap ChainMap traversals, string cache-key hashing and per-object update scans every frame, scaling CPU cost with object count.

`measured` · owner: three_core · detect: design_review · 9 issues

[#285](https://github.com/mrdoob/three.js/issues/285) [#8552](https://github.com/mrdoob/three.js/issues/8552) [#14576](https://github.com/mrdoob/three.js/issues/14576) [#14898](https://github.com/mrdoob/three.js/issues/14898) [#20072](https://github.com/mrdoob/three.js/issues/20072) [#20457](https://github.com/mrdoob/three.js/issues/20457) [#32675](https://github.com/mrdoob/three.js/issues/32675) [#32916](https://github.com/mrdoob/three.js/issues/32916) [#32959](https://github.com/mrdoob/three.js/issues/32959)

#### `CAH-06` Function-call and iteration wrapper overhead in inner loops

Per-element accessor wrappers, callback-based iteration, bind/call, recursion, and extra temporaries add a call per element versus direct indexed for-loops, measured ~4x for typed-array access and ~15% for traverse.

`measured` · owner: three_core · detect: static_lint · 9 issues

[#2813](https://github.com/mrdoob/three.js/issues/2813) [#2860](https://github.com/mrdoob/three.js/issues/2860) [#7522](https://github.com/mrdoob/three.js/issues/7522) [#9088](https://github.com/mrdoob/three.js/issues/9088) [#9375](https://github.com/mrdoob/three.js/issues/9375) [#9662](https://github.com/mrdoob/three.js/issues/9662) [#20457](https://github.com/mrdoob/three.js/issues/20457) [#27223](https://github.com/mrdoob/three.js/issues/27223) [#27639](https://github.com/mrdoob/three.js/issues/27639)

#### `CAH-02` Per-call validation and asserts in hot math methods

Argument/NaN/isFinite checks and console.assert inside constructors, setters and vector/matrix methods run on every call, adding branch and call overhead that shows up at the top of profiles. three.js deliberately omits such checks for this reason.

`measured` · owner: three_core · detect: design_review · 8 issues

[#5160](https://github.com/mrdoob/three.js/issues/5160) [#5511](https://github.com/mrdoob/three.js/issues/5511) [#11241](https://github.com/mrdoob/three.js/issues/11241) [#12574](https://github.com/mrdoob/three.js/issues/12574) [#12578](https://github.com/mrdoob/three.js/issues/12578) [#13383](https://github.com/mrdoob/three.js/issues/13383) [#21189](https://github.com/mrdoob/three.js/issues/21189) [#21982](https://github.com/mrdoob/three.js/issues/21982)

#### `CAH-04` Expensive per-fragment PBR/shader ALU work _(open)_

MeshStandardMaterial/physical shading, LTC area lights, textureCubeUV manual mip blending, capsule line tests and split BRDF lobes all add substantial per-fragment ALU or extra texture fetches; scenes are fragment-bound so this dominates GPU time.

`measured` · owner: three_core · detect: runtime_profile_only · 7 issues

[#1324](https://github.com/mrdoob/three.js/issues/1324) [#8718](https://github.com/mrdoob/three.js/issues/8718) [#18265](https://github.com/mrdoob/three.js/issues/18265) [#19498](https://github.com/mrdoob/three.js/issues/19498) [#21129](https://github.com/mrdoob/three.js/issues/21129) [#21578](https://github.com/mrdoob/three.js/issues/21578) [#31350](https://github.com/mrdoob/three.js/issues/31350)

#### `CAH-03` O(n^2) brute-force scans lacking spatial/hash indexing

Linear membership tests, nested face/vertex/edge comparisons and duplicate-search loops make geometry merging, export, scene add, and CSG quadratic in element count. Hash maps, BVH/kd-trees or edge indexing collapse the cost.

`measured` · owner: three_core · detect: static_lint · 7 issues

[#323](https://github.com/mrdoob/three.js/issues/323) [#509](https://github.com/mrdoob/three.js/issues/509) [#733](https://github.com/mrdoob/three.js/issues/733) [#3840](https://github.com/mrdoob/three.js/issues/3840) [#6031](https://github.com/mrdoob/three.js/issues/6031) [#10517](https://github.com/mrdoob/three.js/issues/10517) [#16099](https://github.com/mrdoob/three.js/issues/16099)

#### `CAH-10` Typed-array vs plain-array storage for math data

Float32Array/Float64Array element access requires float<->double conversion and allocation overhead per Vector3/Matrix construction, making typed-array-backed math slower than plain arrays in JS engines.

`measured` · owner: three_core · detect: runtime_profile_only · 5 issues

[#36](https://github.com/mrdoob/three.js/issues/36) [#1898](https://github.com/mrdoob/three.js/issues/1898) [#4386](https://github.com/mrdoob/three.js/issues/4386) [#8661](https://github.com/mrdoob/three.js/issues/8661) [#10915](https://github.com/mrdoob/three.js/issues/10915)

#### `CAH-07` Shape triangulation/hole handling scales superlinearly

Shape.Utils.triangulateShape and removeHoles use nested loops searching intersection-free hole connections, running n^2–n^3 rather than n log n, taking seconds to minutes for many-hole shapes. Alternative CDT libraries are slower still.

`measured` · owner: three_core · detect: runtime_profile_only · 5 issues

[#4590](https://github.com/mrdoob/three.js/issues/4590) [#4594](https://github.com/mrdoob/three.js/issues/4594) [#4920](https://github.com/mrdoob/three.js/issues/4920) [#5959](https://github.com/mrdoob/three.js/issues/5959) [#16950](https://github.com/mrdoob/three.js/issues/16950)

#### `CAH-17` Expensive scalar ops: divides, sqrt, trig in loops _(proposed optimization)_

Divisions inside loops rather than precomputed reciprocals, distanceTo's square root for proximity checks, and per-pixel divides in GLSL cost more than the multiply-based equivalents.

`reporter_asserted` · owner: three_core · detect: static_lint · 4 issues

[#2689](https://github.com/mrdoob/three.js/issues/2689) [#7094](https://github.com/mrdoob/three.js/issues/7094) [#7346](https://github.com/mrdoob/three.js/issues/7346) [#11475](https://github.com/mrdoob/three.js/issues/11475)

#### `CAH-24` Polymorphic call sites deoptimize shared library functions

Divergent hidden classes and accepting mixed argument types make shared math/renderer functions megamorphic, so V8 permanently deoptimizes them; state persists until page reload.

`observed_cost` · owner: three_core · detect: runtime_profile_only · 4 issues

[#6987](https://github.com/mrdoob/three.js/issues/6987) [#14217](https://github.com/mrdoob/three.js/issues/14217) [#18404](https://github.com/mrdoob/three.js/issues/18404) [#25124](https://github.com/mrdoob/three.js/issues/25124)

#### `CAH-08` UUID/string generation per created object

generateUUID string building (and later crypto.randomUUID) runs eagerly for every object, material and geometry during parsing, dominating scene-build time; string flattening and join-vs-concat choices further double CPU cost.

`measured` · owner: three_core · detect: runtime_profile_only · 3 issues

[#12432](https://github.com/mrdoob/three.js/issues/12432) [#13069](https://github.com/mrdoob/three.js/issues/13069) [#22803](https://github.com/mrdoob/three.js/issues/22803)

#### `CAH-11` CPU-side simulation/geometry work that belongs on GPU _(open)_

Particle positions, AO volumes and decal geodesic distances are computed in JS on the main thread each frame or at startup because WebGL lacks geometry/compute stages; moving to shaders raised framerate substantially.

`measured` · owner: app_developer · detect: design_review · 3 issues

[#323](https://github.com/mrdoob/three.js/issues/323) [#1183](https://github.com/mrdoob/three.js/issues/1183) [#21187](https://github.com/mrdoob/three.js/issues/21187)

#### `CAH-14` TSL node graph compile and codegen inefficiency _(open)_

VarNode.assign performs recursive traverse over the node subgraph at compile time, nodes created outside loops get inlined and recomputed per iteration, and Proxy-based node dispatch is slower than prototype dispatch.

`maintainer_confirmed` · owner: three_core · detect: upstream_only · 3 issues

[#26820](https://github.com/mrdoob/three.js/issues/26820) [#30849](https://github.com/mrdoob/three.js/issues/30849) [#31636](https://github.com/mrdoob/three.js/issues/31636)

#### `CAH-23` GLSL lacks dynamic indexing and hardware filtering workarounds

WebGL1 GLSL cannot dynamically index arrays, forcing iteration over every element, and buffer-texture index fetches or manual interpolation replace hardware texture units, multiplying per-fragment/vertex work.

`reporter_asserted` · owner: browser_or_driver · detect: upstream_only · 3 issues

[#9965](https://github.com/mrdoob/three.js/issues/9965) [#11898](https://github.com/mrdoob/three.js/issues/11898) [#19498](https://github.com/mrdoob/three.js/issues/19498)

#### `CAH-18` Per-frame work that could be precomputed once at load _(proposed optimization)_

Flipping UVs in the shader every frame, sorting faces by material index, draw-range sort/overlap resolution and shader-source hashing all pay recurring cost for work that could be done once or avoided.

`reporter_asserted` · owner: three_core · detect: design_review · 3 issues

[#9754](https://github.com/mrdoob/three.js/issues/9754) [#11510](https://github.com/mrdoob/three.js/issues/11510) [#14358](https://github.com/mrdoob/three.js/issues/14358)

#### `CAH-20` Full recomputation of bounds/normals over all vertices

Box3.setFromObject and bounding-box helpers walk every vertex of every descendant each frame instead of unioning cached child boxes; angle-weighted normal smoothing sorts adjacent faces per vertex (~30ms/geometry).

`observed_cost` · owner: three_core · detect: static_lint · 3 issues

[#3670](https://github.com/mrdoob/three.js/issues/3670) [#8432](https://github.com/mrdoob/three.js/issues/8432) [#14201](https://github.com/mrdoob/three.js/issues/14201)

#### `CAH-09` Slow prototype/class construction patterns

Prototype-chain subclassing with constructor.apply or Object.create makes construction and method lookup 3-4x slower and triggers base-constructor side effects; legacy Geometry-based generators are slower than direct BufferGeometry.

`measured` · owner: three_core · detect: static_lint · 2 issues

[#1703](https://github.com/mrdoob/three.js/issues/1703) [#2080](https://github.com/mrdoob/three.js/issues/2080)

#### `CAH-12` for-in iteration over objects blocks JIT optimization

for-in over associative objects (programAttributes, etc.) is not JIT-optimized by V8 and lacks ordering; caching Object.keys or using plain indexed arrays measurably halved time.

`measured` · owner: three_core · detect: static_lint · 2 issues

[#2745](https://github.com/mrdoob/three.js/issues/2745) [#5186](https://github.com/mrdoob/three.js/issues/5186)

#### `CAH-15` Serialization converting typed arrays to plain arrays

Object3D.toJSON and ObjectLoader.parse convert BufferAttribute TypedArrays to/from plain JS Arrays, and byte-by-byte parser dispatch with buffer reinitialization dominates the parse hot path.

`measured` · owner: three_core · detect: runtime_profile_only · 2 issues

[#9756](https://github.com/mrdoob/three.js/issues/9756) [#11746](https://github.com/mrdoob/three.js/issues/11746)

#### `CAH-16` Whole-scene redraw in CanvasRenderer

CanvasRenderer redraws the entire scene every render() call and builds a canvas path (moveTo/lineTo/closePath) per triangle, which is slow especially on mobile; partial redraw is impossible due to overlapping primitives.

`maintainer_confirmed` · owner: three_core · detect: design_review · 2 issues

[#368](https://github.com/mrdoob/three.js/issues/368) [#4936](https://github.com/mrdoob/three.js/issues/4936)

#### `CAH-26` Vertex merging strategy tradeoff

Exact-tolerance or octree/spatial vertex merging is measured ~6x slower than hash-bin coordinate truncation, so the faster but approximate approach is retained.

`reporter_asserted` · owner: three_core · detect: design_review · 2 issues

[#2832](https://github.com/mrdoob/three.js/issues/2832) [#24621](https://github.com/mrdoob/three.js/issues/24621)

#### `CAH-25` Ray-AABB and frustum tests use branch-heavy formulations _(proposed optimization)_

Ray.js uses an older branch-heavy ray-box intersection rather than the branchless min/max slab test; frustum culling uses the cheaper imprecise plane test because SAT corner tests require computing frustum corner points.

`reporter_asserted` · owner: three_core · detect: design_review · 2 issues

[#26937](https://github.com/mrdoob/three.js/issues/26937) [#27756](https://github.com/mrdoob/three.js/issues/27756)

#### `CAH-13` Matrix multiply is the dominant per-frame CPU math cost

Matrix4.multiplyMatrices is the most-called method in complex scenes; SIMD rewrites only win above ~10k ops and are 3x slower for small counts due to load/store overhead. Quaternion writes also trigger Euler conversion via atan2/asin.

`measured` · owner: three_core · detect: runtime_profile_only · 1 issues

[#6419](https://github.com/mrdoob/three.js/issues/6419)

#### `CAH-21` Mesh simplification cost per collapsed vertex

SimplifyModifier computes edge-collapse cost per vertex (~2-3ms each) with object-based Vertex/Triangle classes on a single thread; typed arrays plus workers cut 225k-vertex simplification from 120s to 14s.

`measured` · owner: three_core · detect: runtime_profile_only · 1 issues

[#5806](https://github.com/mrdoob/three.js/issues/5806)

#### `CAH-22` Native browser APIs slower than in-house equivalents

Native EventTarget/CustomEvent dispatch benchmarks 10-20x slower per dispatch than three.js's EventDispatcher, and crypto.randomUUID is far slower than a lookup-table generator.

`measured` · owner: browser_or_driver · detect: upstream_only · 1 issues

[#24082](https://github.com/mrdoob/three.js/issues/24082)

#### `CAH-19` Method chaining and return-value micro-costs are negligible _(proposed optimization)_

Returning `this` from Vector3 methods and the perspective divide in applyMatrix4 were feared costly but measure at or below noise (~0.01% of execution), so the micro-optimizations are not worth their complexity.

`measured` · owner: three_core · detect: runtime_profile_only · 1 issues

[#6039](https://github.com/mrdoob/three.js/issues/6039)

#### `CAH-27` Idle animation loop keeps re-requesting frames _(hypothetical)_

onAnimationFrame does not check isAnimating, so the rAF loop keeps issuing requests after setAnimationLoop(null), keeping the CPU awake with no rendering work.

`reporter_asserted` · owner: three_core · detect: static_lint · 1 issues

[#29855](https://github.com/mrdoob/three.js/issues/29855)

### Render targets and post-processing

_84 observations → 16 distinct causes_

#### `RTP-03` Extra full-scene re-render for reflection/transmission/depth buffers

Mirrors, transmission, GPU picking, selection masks and depth/normal buffers each re-render the whole scene into a render target every frame, duplicating vertex and rasterization work; recursion and multiple mirrors multiply it further.

`maintainer_confirmed` · owner: three_core · detect: static_lint · 11 issues

[#43](https://github.com/mrdoob/three.js/issues/43) [#3856](https://github.com/mrdoob/three.js/issues/3856) [#12098](https://github.com/mrdoob/three.js/issues/12098) [#12115](https://github.com/mrdoob/three.js/issues/12115) [#12857](https://github.com/mrdoob/three.js/issues/12857) [#13807](https://github.com/mrdoob/three.js/issues/13807) [#15704](https://github.com/mrdoob/three.js/issues/15704) [#26239](https://github.com/mrdoob/three.js/issues/26239) [#28831](https://github.com/mrdoob/three.js/issues/28831) [#29052](https://github.com/mrdoob/three.js/issues/29052) [#30185](https://github.com/mrdoob/three.js/issues/30185)

#### `RTP-08` Each effect requires an extra full-screen render pass _(open, proposed optimization)_

EffectComposer/post chains render to intermediate textures, so every pass is an additional screen-sized rasterization plus texture read/write. Cost scales linearly with pass count instead of being fused into one shader, and extra buffer swaps/copies add more fill work.

`maintainer_confirmed` · owner: three_core · detect: static_lint · 9 issues

[#225](https://github.com/mrdoob/three.js/issues/225) [#6013](https://github.com/mrdoob/three.js/issues/6013) [#8400](https://github.com/mrdoob/three.js/issues/8400) [#10486](https://github.com/mrdoob/three.js/issues/10486) [#13230](https://github.com/mrdoob/three.js/issues/13230) [#18634](https://github.com/mrdoob/three.js/issues/18634) [#23251](https://github.com/mrdoob/three.js/issues/23251) [#28754](https://github.com/mrdoob/three.js/issues/28754) [#29429](https://github.com/mrdoob/three.js/issues/29429)

#### `RTP-06` Per-pixel sampling/step count in screen-space shaders

SSAO/SAO/DOF/AA/ray-marching shaders cost scales with samples, rings and march steps per pixel, and emulating missing hardware features (textureGather, 3D texture interpolation) multiplies fetches further.

`maintainer_confirmed` · owner: three_core · detect: runtime_profile_only · 8 issues

[#568](https://github.com/mrdoob/three.js/issues/568) [#3182](https://github.com/mrdoob/three.js/issues/3182) [#4955](https://github.com/mrdoob/three.js/issues/4955) [#8248](https://github.com/mrdoob/three.js/issues/8248) [#15553](https://github.com/mrdoob/three.js/issues/15553) [#19457](https://github.com/mrdoob/three.js/issues/19457) [#29668](https://github.com/mrdoob/three.js/issues/29668) [#33914](https://github.com/mrdoob/three.js/issues/33914)

#### `RTP-02` Separate output color-space/tone-mapping pass costs fill rate _(open)_

Applying tone mapping and color-space transfer in a dedicated full-screen pass (instead of inline in the material shader) adds a whole-image pass and often a float render target. Measured 60->47 FPS and ~900ms vs ~500ms per 10000 renders.

`measured` · owner: three_core · detect: static_lint · 7 issues

[#22009](https://github.com/mrdoob/three.js/issues/22009) [#23019](https://github.com/mrdoob/three.js/issues/23019) [#23614](https://github.com/mrdoob/three.js/issues/23614) [#28831](https://github.com/mrdoob/three.js/issues/28831) [#29429](https://github.com/mrdoob/three.js/issues/29429) [#32273](https://github.com/mrdoob/three.js/issues/32273) [#33821](https://github.com/mrdoob/three.js/issues/33821)

#### `RTP-05` Render target allocation, retention and copy overhead _(open)_

Intermediate targets are allocated per pass and retained even when unused, so peak GPU memory scales with pass count; lazy first-use allocation stalls mid-frame, and per-frame texture destroy/recreate or slow copyTextureToTexture fallbacks add per-frame cost.

`measured` · owner: three_core · detect: runtime_profile_only · 7 issues

[#10981](https://github.com/mrdoob/three.js/issues/10981) [#26484](https://github.com/mrdoob/three.js/issues/26484) [#29898](https://github.com/mrdoob/three.js/issues/29898) [#32642](https://github.com/mrdoob/three.js/issues/32642) [#32689](https://github.com/mrdoob/three.js/issues/32689) [#33062](https://github.com/mrdoob/three.js/issues/33062) [#33161](https://github.com/mrdoob/three.js/issues/33161)

#### `RTP-01` Render targets sized at full resolution/DPR multiply fragment cost

Post-processing and effect render targets allocated at drawing-buffer size times devicePixelRatio multiply pixel count per pass, and fragment-bound shaders (SSR, SSAO, sky, transmission) dominate. Downscaling the target restores framerate.

`measured` · owner: three_core · detect: static_lint · 7 issues

[#323](https://github.com/mrdoob/three.js/issues/323) [#8139](https://github.com/mrdoob/three.js/issues/8139) [#12188](https://github.com/mrdoob/three.js/issues/12188) [#12489](https://github.com/mrdoob/three.js/issues/12489) [#21913](https://github.com/mrdoob/three.js/issues/21913) [#30017](https://github.com/mrdoob/three.js/issues/30017) [#31624](https://github.com/mrdoob/three.js/issues/31624)

#### `RTP-07` Environment map prefiltering (PMREM) regenerated per frame

PMREMGenerator runs a chain of prefilter render passes over the cube target, taking >70ms; regenerating it whenever the cube camera or XR light estimate updates makes it a per-frame cost. Non-separated filtering or dropping mip reduction would multiply sample counts.

`maintainer_confirmed` · owner: three_core · detect: static_lint · 7 issues

[#1621](https://github.com/mrdoob/three.js/issues/1621) [#7397](https://github.com/mrdoob/three.js/issues/7397) [#7402](https://github.com/mrdoob/three.js/issues/7402) [#9827](https://github.com/mrdoob/three.js/issues/9827) [#22236](https://github.com/mrdoob/three.js/issues/22236) [#24220](https://github.com/mrdoob/three.js/issues/24220) [#26796](https://github.com/mrdoob/three.js/issues/26796)

#### `RTP-13` Missing MRT forces repeated passes for extra buffers _(open, proposed optimization)_

Without multiple render targets (WebGL1 or legacy composer), each g-buffer/normal/velocity/OIT layer requires its own full-scene pass over the same geometry, duplicating rasterization and consuming fill rate.

`reporter_asserted` · owner: three_core · detect: design_review · 6 issues

[#5942](https://github.com/mrdoob/three.js/issues/5942) [#6013](https://github.com/mrdoob/three.js/issues/6013) [#9965](https://github.com/mrdoob/three.js/issues/9965) [#9977](https://github.com/mrdoob/three.js/issues/9977) [#28749](https://github.com/mrdoob/three.js/issues/28749) [#29668](https://github.com/mrdoob/three.js/issues/29668)

#### `RTP-10` XR stereo rendering multiplies render target fill

Eye buffers are fixed at HMD-recommended resolution with no scaling knob, transmission targets take the full side-by-side width, and non-multiview intermediate targets add a pass per eye.

`maintainer_confirmed` · owner: three_core · detect: design_review · 5 issues

[#12225](https://github.com/mrdoob/three.js/issues/12225) [#12997](https://github.com/mrdoob/three.js/issues/12997) [#21911](https://github.com/mrdoob/three.js/issues/21911) [#28073](https://github.com/mrdoob/three.js/issues/28073) [#28968](https://github.com/mrdoob/three.js/issues/28968)

#### `RTP-04` High-precision/float render target memory and bandwidth

FP16/FP32 and RGBA intermediate buffers cost 2-4x memory and bandwidth versus 8-bit/RGB, slowing rendering and exhausting memory on older mobile devices; omitting alpha or dropping precision measurably helps but causes banding/quantization.

`measured` · owner: three_core · detect: static_lint · 4 issues

[#2624](https://github.com/mrdoob/three.js/issues/2624) [#23019](https://github.com/mrdoob/three.js/issues/23019) [#23251](https://github.com/mrdoob/three.js/issues/23251) [#28749](https://github.com/mrdoob/three.js/issues/28749)

#### `RTP-14` Passes do no early-exit or visibility culling _(proposed optimization)_

Post-processing and reflection passes run their full chain unconditionally, e.g. outline nodes executing with no selected objects, mirrors facing away still rendering, and per-frame scene traversals scaling with hierarchy size.

`maintainer_confirmed` · owner: three_core · detect: static_lint · 3 issues

[#12098](https://github.com/mrdoob/three.js/issues/12098) [#20401](https://github.com/mrdoob/three.js/issues/20401) [#33355](https://github.com/mrdoob/three.js/issues/33355)

#### `RTP-16` Per-frame GPGPU/ping-pong simulation update cost _(proposed optimization)_

GPGPU simulations and depth-peeled transparency update render targets each frame at render-loop rate, with peeling requiring the model rendered many times plus extra targets and copies; apps may need to decouple update rate.

`reporter_asserted` · owner: app_developer · detect: runtime_profile_only · 3 issues

[#4069](https://github.com/mrdoob/three.js/issues/4069) [#16977](https://github.com/mrdoob/three.js/issues/16977) [#22009](https://github.com/mrdoob/three.js/issues/22009)

#### `RTP-09` Render-to-texture defeats hardware antialiasing

Once content is rendered to an author-created framebuffer or offscreen texture, the browser's default MSAA no longer applies, forcing an extra FXAA/SMAA pass or a supersampled higher-resolution target, both of which multiply fill cost.

`maintainer_confirmed` · owner: three_core · detect: design_review · 2 issues

[#6383](https://github.com/mrdoob/three.js/issues/6383) [#10688](https://github.com/mrdoob/three.js/issues/10688)

#### `RTP-11` Render target feedback loops and missing double buffering

Sampling a texture that is simultaneously bound as a color attachment causes undefined results, driver error flooding and heavy per-frame degradation; ping-pong/double buffering or forced multisampling is used to avoid it, adding resolve cost.

`maintainer_confirmed` · owner: three_core · detect: static_lint · 2 issues

[#27108](https://github.com/mrdoob/three.js/issues/27108) [#33060](https://github.com/mrdoob/three.js/issues/33060)

#### `RTP-12` Overdraw and redundant fragment invocations in fullscreen geometry

Deferred light proxy volumes overlap with blending and no z-rejection, re-shading pixels repeatedly; fullscreen quads made of two triangles waste fragment quad invocations along the diagonal versus one oversized triangle.

`maintainer_confirmed` · owner: three_core · detect: design_review · 2 issues

[#2624](https://github.com/mrdoob/three.js/issues/2624) [#28635](https://github.com/mrdoob/three.js/issues/28635)

#### `RTP-17` Regression in post-processing node shader cost

A change to the Gaussian blur node increased per-frame post-processing shader work, dropping framerate from 120 to 30 fps in the WebGPU node pipeline.

`maintainer_confirmed` · owner: three_core · detect: runtime_profile_only · 1 issues

[#31565](https://github.com/mrdoob/three.js/issues/31565)

### Draw calls and state changes

_81 observations → 16 distinct causes_

#### `DCO-01` One draw call per Mesh object; no batching _(open)_

Each Mesh/Line/Points/Sprite object is submitted individually, incurring a drawElements call plus matrix uniform upload and state setup per object. Thousands of small objects saturate CPU-side submission before the GPU is loaded. Merging geometries, InstancedMesh or BatchedMesh collapses them into one call.

`measured` · owner: app_developer · detect: static_lint · 13 issues

[#108](https://github.com/mrdoob/three.js/issues/108) [#720](https://github.com/mrdoob/three.js/issues/720) [#1370](https://github.com/mrdoob/three.js/issues/1370) [#2598](https://github.com/mrdoob/three.js/issues/2598) [#2800](https://github.com/mrdoob/three.js/issues/2800) [#3082](https://github.com/mrdoob/three.js/issues/3082) [#3090](https://github.com/mrdoob/three.js/issues/3090) [#3638](https://github.com/mrdoob/three.js/issues/3638) [#4221](https://github.com/mrdoob/three.js/issues/4221) [#18380](https://github.com/mrdoob/three.js/issues/18380) [#22376](https://github.com/mrdoob/three.js/issues/22376) [#26673](https://github.com/mrdoob/three.js/issues/26673) [#29740](https://github.com/mrdoob/three.js/issues/29740)

#### `DCO-02` Many materials split a mesh into many groups

Assigning distinct materials/materialIndex per face or section forces the renderer to emit one geometry group and thus one draw call plus material/texture state change per group. Models exported with thousands of materials multiply draw calls for a single object.

`measured` · owner: app_developer · detect: static_asset_check · 9 issues

[#285](https://github.com/mrdoob/three.js/issues/285) [#420](https://github.com/mrdoob/three.js/issues/420) [#465](https://github.com/mrdoob/three.js/issues/465) [#1121](https://github.com/mrdoob/three.js/issues/1121) [#2083](https://github.com/mrdoob/three.js/issues/2083) [#2638](https://github.com/mrdoob/three.js/issues/2638) [#8203](https://github.com/mrdoob/three.js/issues/8203) [#16328](https://github.com/mrdoob/three.js/issues/16328) [#19498](https://github.com/mrdoob/three.js/issues/19498)

#### `DCO-04` Per-element objects instead of batched particle/sprite systems

Creating one ParticleSystem/Sprite/Line per particle, point or glyph string produces thousands of draw calls with expensive per-object state setting, where a single batched buffer with custom per-element attributes or a glyph atlas would be one draw call.

`maintainer_confirmed` · owner: app_developer · detect: static_lint · 9 issues

[#161](https://github.com/mrdoob/three.js/issues/161) [#167](https://github.com/mrdoob/three.js/issues/167) [#244](https://github.com/mrdoob/three.js/issues/244) [#323](https://github.com/mrdoob/three.js/issues/323) [#349](https://github.com/mrdoob/three.js/issues/349) [#897](https://github.com/mrdoob/three.js/issues/897) [#968](https://github.com/mrdoob/three.js/issues/968) [#7371](https://github.com/mrdoob/three.js/issues/7371) [#13233](https://github.com/mrdoob/three.js/issues/13233)

#### `DCO-05` Asset pipeline/loader fragments meshes unnecessarily _(open)_

Exporters and loaders split assets into many sub-meshes, chunks, or per-'usemtl' objects, and flatten InstancedMesh into individual meshes, so faces sharing a material are never grouped. The resulting object count directly becomes draw-call count.

`maintainer_confirmed` · owner: asset_pipeline · detect: static_asset_check · 9 issues

[#1807](https://github.com/mrdoob/three.js/issues/1807) [#2244](https://github.com/mrdoob/three.js/issues/2244) [#2476](https://github.com/mrdoob/three.js/issues/2476) [#5524](https://github.com/mrdoob/three.js/issues/5524) [#6682](https://github.com/mrdoob/three.js/issues/6682) [#15293](https://github.com/mrdoob/three.js/issues/15293) [#26469](https://github.com/mrdoob/three.js/issues/26469) [#27926](https://github.com/mrdoob/three.js/issues/27926) [#32370](https://github.com/mrdoob/three.js/issues/32370)

#### `DCO-03` Redundant per-draw GL state and attribute rebinding _(open)_

setupVertexAttributes rebinds buffers and calls vertexAttribPointer/enableVertexAttribArray for every attribute on every draw, and uniforms/pipeline/bind groups are re-validated per object even when unchanged. This CPU-side API and validation overhead dominates with many small geometries.

`measured` · owner: three_core · detect: design_review · 6 issues

[#679](https://github.com/mrdoob/three.js/issues/679) [#2633](https://github.com/mrdoob/three.js/issues/2633) [#2916](https://github.com/mrdoob/three.js/issues/2916) [#5186](https://github.com/mrdoob/three.js/issues/5186) [#30560](https://github.com/mrdoob/three.js/issues/30560) [#33821](https://github.com/mrdoob/three.js/issues/33821)

#### `DCO-08` Multi-view/stereo rendering duplicates draw submission _(proposed optimization)_

Each render item is submitted once per eye/view, doubling draw calls and shader program/state changes on the CPU. Multiview extensions or ArrayCamera viewport alternation would process each item once.

`maintainer_confirmed` · owner: three_core · detect: design_review · 6 issues

[#10927](https://github.com/mrdoob/three.js/issues/10927) [#11301](https://github.com/mrdoob/three.js/issues/11301) [#17942](https://github.com/mrdoob/three.js/issues/17942) [#19071](https://github.com/mrdoob/three.js/issues/19071) [#20368](https://github.com/mrdoob/three.js/issues/20368) [#28968](https://github.com/mrdoob/three.js/issues/28968)

#### `DCO-07` Software renderers emit one primitive per face

CanvasRenderer draws one path per face and SVGRenderer creates one DOM primitive per face, so triangle count translates directly into per-primitive JS/browser calls with no batching. Higher tessellation or Face3 vs Face4 multiplies this cost.

`maintainer_confirmed` · owner: three_core · detect: static_lint · 5 issues

[#429](https://github.com/mrdoob/three.js/issues/429) [#1160](https://github.com/mrdoob/three.js/issues/1160) [#2035](https://github.com/mrdoob/three.js/issues/2035) [#4074](https://github.com/mrdoob/three.js/issues/4074) [#11356](https://github.com/mrdoob/three.js/issues/11356)

#### `DCO-10` Missing multi-draw/indirect batching primitives _(open, proposed optimization)_

Without WEBGL_multi_draw or render bundles, each geometry group or object requires its own drawArrays/drawElements even when sparse ranges share the same pipeline; multidraw collapses them into one call.

`maintainer_confirmed` · owner: three_core · detect: design_review · 5 issues

[#14358](https://github.com/mrdoob/three.js/issues/14358) [#17139](https://github.com/mrdoob/three.js/issues/17139) [#26876](https://github.com/mrdoob/three.js/issues/26876) [#29018](https://github.com/mrdoob/three.js/issues/29018) [#29036](https://github.com/mrdoob/three.js/issues/29036)

#### `DCO-06` Unsorted face materialIndex fragments groups

computeGroups only merges contiguous materialIndex ranges, so interleaved face materials produce huge numbers of tiny groups with repeated materials, each a separate draw call. sortFacesByMaterialIndex collapses them (1900 calls → 36).

`measured` · owner: three_core · detect: static_asset_check · 4 issues

[#7211](https://github.com/mrdoob/three.js/issues/7211) [#10784](https://github.com/mrdoob/three.js/issues/10784) [#11510](https://github.com/mrdoob/three.js/issues/11510) [#14724](https://github.com/mrdoob/three.js/issues/14724)

#### `DCO-09` No sorting/batching by material or program _(proposed optimization)_

The renderer does not group render items by material/texture/program out of the box, so alternating geometries and materials in the scene cause redundant GL state changes between draws even when the program is shared.

`maintainer_confirmed` · owner: three_core · detect: runtime_profile_only · 4 issues

[#817](https://github.com/mrdoob/three.js/issues/817) [#953](https://github.com/mrdoob/three.js/issues/953) [#5469](https://github.com/mrdoob/three.js/issues/5469) [#14223](https://github.com/mrdoob/three.js/issues/14223)

#### `DCO-11` Multi-pass rendering repeats whole-scene submission

Double-sided two-pass rendering doubles WebGL calls per object, and CubeCamera issues six full render() calls repeating matrix updates, shadow maps and render-state setup per face.

`measured` · owner: three_core · detect: design_review · 2 issues

[#1324](https://github.com/mrdoob/three.js/issues/1324) [#14121](https://github.com/mrdoob/three.js/issues/14121)

#### `DCO-15` Driver emulation and unsupported primitive modes

When vertex attribute 0 is not enabled, browsers emulate it by constructing and binding a full-length buffer on every draw. Similarly, lack of triangle-strip support forces more vertices/draw calls than a single strip draw.

`reporter_asserted` · owner: browser_or_driver · detect: upstream_only · 2 issues

[#3896](https://github.com/mrdoob/three.js/issues/3896) [#9869](https://github.com/mrdoob/three.js/issues/9869)

#### `DCO-13` No VAO caching of attribute binding state _(proposed optimization)_

Without vertex array objects, the full attribute and index binding state must be re-established per draw call, multiplying WebGL API/validation calls. API flexibility (direct attribute mutation) blocks cheap dirty detection needed to cache VAOs.

`reporter_asserted` · owner: three_core · detect: design_review · 2 issues

[#8705](https://github.com/mrdoob/three.js/issues/8705) [#16132](https://github.com/mrdoob/three.js/issues/16132)

#### `DCO-16` No culling of occluded/invisible objects _(proposed optimization)_

All meshes are submitted each frame including fully occluded ones, spending draw calls on geometry that contributes nothing to the frame.

`reporter_asserted` · owner: app_developer · detect: runtime_profile_only · 2 issues

[#4617](https://github.com/mrdoob/three.js/issues/4617) [#10117](https://github.com/mrdoob/three.js/issues/10117)

#### `DCO-14` Multi-material helpers create one mesh per material _(hypothetical)_

createMultiMaterialObject and similar patterns instantiate a separate Mesh per material over the same geometry, adding a full object transform and draw call per material rather than using groups.

`maintainer_confirmed` · owner: app_developer · detect: static_lint · 2 issues

[#751](https://github.com/mrdoob/three.js/issues/751) [#1051](https://github.com/mrdoob/three.js/issues/1051)

#### `DCO-12` Immediate-mode per-face submission of static meshes

Every face/vertex is resubmitted per frame instead of compiling static meshes into retained buffers/display lists, generating thousands of draw calls per frame for a large mesh.

`maintainer_confirmed` · owner: three_core · detect: static_lint · 1 issues

[#4936](https://github.com/mrdoob/three.js/issues/4936)

### Shader and program compilation

_77 observations → 17 distinct causes_

#### `SPC-01` State baked into shader forces recompile on change _(open)_

Fog, lights count, shadows, encoding, envMap, flipY, defines and loop counts are baked as #defines/literals into generated shader source, so any change invalidates programs across all materials and forces a mass rebuild that blocks the main thread.

`maintainer_confirmed` · owner: three_core · detect: design_review · 14 issues

[#25](https://github.com/mrdoob/three.js/issues/25) [#509](https://github.com/mrdoob/three.js/issues/509) [#598](https://github.com/mrdoob/three.js/issues/598) [#1055](https://github.com/mrdoob/three.js/issues/1055) [#1534](https://github.com/mrdoob/three.js/issues/1534) [#1945](https://github.com/mrdoob/three.js/issues/1945) [#9108](https://github.com/mrdoob/three.js/issues/9108) [#9132](https://github.com/mrdoob/three.js/issues/9132) [#15548](https://github.com/mrdoob/three.js/issues/15548) [#19056](https://github.com/mrdoob/three.js/issues/19056) [#24128](https://github.com/mrdoob/three.js/issues/24128) [#28020](https://github.com/mrdoob/three.js/issues/28020) [#31750](https://github.com/mrdoob/three.js/issues/31750) [#32779](https://github.com/mrdoob/three.js/issues/32779)

#### `SPC-02` Program cache key too specific, causing per-frame recompiles

Program/pipeline cache keys incorporate state that changes per object or per frame (per-object light sets, encoding mismatches, object UUID, node.id-derived names, unreset clipping counts), so the cached program misses and the material is re-initialized and recompiled every frame. Recompilation dominates frame time.

`maintainer_confirmed` · owner: three_core · detect: runtime_profile_only · 9 issues

[#5180](https://github.com/mrdoob/three.js/issues/5180) [#9325](https://github.com/mrdoob/three.js/issues/9325) [#18675](https://github.com/mrdoob/three.js/issues/18675) [#18699](https://github.com/mrdoob/three.js/issues/18699) [#18893](https://github.com/mrdoob/three.js/issues/18893) [#19056](https://github.com/mrdoob/three.js/issues/19056) [#26266](https://github.com/mrdoob/three.js/issues/26266) [#32524](https://github.com/mrdoob/three.js/issues/32524) [#33673](https://github.com/mrdoob/three.js/issues/33673)

#### `SPC-04` Node/TSL graph rebuilt per material instance _(open)_

NodeBuilder cache misses mean identical node graphs are rebuilt for each material instance (unique uniform()/colorNode nodes, non-precomputed Fn, missing function layouts), so N meshes trigger N full shader graph builds and compiles instead of sharing one program.

`maintainer_confirmed` · owner: three_core · detect: static_lint · 8 issues

[#7522](https://github.com/mrdoob/three.js/issues/7522) [#18511](https://github.com/mrdoob/three.js/issues/18511) [#26469](https://github.com/mrdoob/three.js/issues/26469) [#31173](https://github.com/mrdoob/three.js/issues/31173) [#33342](https://github.com/mrdoob/three.js/issues/33342) [#33685](https://github.com/mrdoob/three.js/issues/33685) [#33821](https://github.com/mrdoob/three.js/issues/33821) [#33838](https://github.com/mrdoob/three.js/issues/33838)

#### `SPC-05` Cache-key construction and lookup CPU overhead _(open)_

getProgramCacheKey builds and joins throwaway string arrays per object per frame, and WebGLShaderCache keys a Map on full GLSL source with has()+get() double lookups, so long strings are compared repeatedly. This dominates profiled CPU time and generates heavy string garbage.

`maintainer_confirmed` · owner: three_core · detect: runtime_profile_only · 8 issues

[#13019](https://github.com/mrdoob/three.js/issues/13019) [#14121](https://github.com/mrdoob/three.js/issues/14121) [#15047](https://github.com/mrdoob/three.js/issues/15047) [#21786](https://github.com/mrdoob/three.js/issues/21786) [#22011](https://github.com/mrdoob/three.js/issues/22011) [#22530](https://github.com/mrdoob/three.js/issues/22530) [#24039](https://github.com/mrdoob/three.js/issues/24039) [#24451](https://github.com/mrdoob/three.js/issues/24451)

#### `SPC-03` Synchronous shader compile/link blocks main thread _(open)_

compileShader/linkProgram (and the GLSL->HLSL/WGSL translation and validation preceding them) are synchronous, and error-checking calls like getShaderParameter force the browser to wait for otherwise-async driver compiles. Large shader sets therefore serialize into multi-second stalls or frame spikes on first render.

`upstream_bug` · owner: three_core · detect: runtime_profile_only · 7 issues

[#11746](https://github.com/mrdoob/three.js/issues/11746) [#15631](https://github.com/mrdoob/three.js/issues/15631) [#15743](https://github.com/mrdoob/three.js/issues/15743) [#16261](https://github.com/mrdoob/three.js/issues/16261) [#16321](https://github.com/mrdoob/three.js/issues/16321) [#27701](https://github.com/mrdoob/three.js/issues/27701) [#31674](https://github.com/mrdoob/three.js/issues/31674)

#### `SPC-11` Precompilation incomplete or too costly to use

compileAsync()/compile() don't cover the actual render set (stale frustum/projection matrix) so pipelines still build mid-render; and compile() itself is too expensive to call inside a 60fps loop.

`maintainer_confirmed` · owner: three_core · detect: static_lint · 5 issues

[#11475](https://github.com/mrdoob/three.js/issues/11475) [#13233](https://github.com/mrdoob/three.js/issues/13233) [#14476](https://github.com/mrdoob/three.js/issues/14476) [#31338](https://github.com/mrdoob/three.js/issues/31338) [#33665](https://github.com/mrdoob/three.js/issues/33665)

#### `SPC-08` Branching and divergence in generated shaders

Dynamic loops bounded by uniforms, if/else lowering of select(), and gradient ops under divergent control flow are poorly optimized by drivers; hence loops are unrolled at build time, trading GPU cost for recompiles.

`reporter_asserted` · owner: three_core · detect: upstream_only · 5 issues

[#25](https://github.com/mrdoob/three.js/issues/25) [#1509](https://github.com/mrdoob/three.js/issues/1509) [#3182](https://github.com/mrdoob/three.js/issues/3182) [#5753](https://github.com/mrdoob/three.js/issues/5753) [#33547](https://github.com/mrdoob/three.js/issues/33547)

#### `SPC-06` Extra per-fragment/per-vertex math in shader code _(open)_

Added ALU such as normalize(normalMatrix*normal) per vertex, inverse trig per vertex, or an extra texture fetch per fragment for alphaTest impose permanent shader runtime cost; measurements showed some are negligible.

`measured` · owner: three_core · detect: runtime_profile_only · 4 issues

[#4069](https://github.com/mrdoob/three.js/issues/4069) [#9754](https://github.com/mrdoob/three.js/issues/9754) [#15631](https://github.com/mrdoob/three.js/issues/15631) [#20522](https://github.com/mrdoob/three.js/issues/20522)

#### `SPC-07` Rebuild triggered by geometry or node mutation

Swapping a geometry or mutating nodes on a NodeMaterial each frame triggers full material re-setup and shader recompile; a regression caused rebuilds whenever map plus shadow map were used.

`maintainer_confirmed` · owner: three_core · detect: static_lint · 3 issues

[#29795](https://github.com/mrdoob/three.js/issues/29795) [#30234](https://github.com/mrdoob/three.js/issues/30234) [#31872](https://github.com/mrdoob/three.js/issues/31872)

#### `SPC-13` Duplicate materials compile redundant programs _(proposed optimization)_

Loaders and app code create many equivalent material instances; without hashing/de-duplication each yields a redundant program compile. De-duplication halved compiled material count.

`maintainer_confirmed` · owner: app_developer · detect: runtime_profile_only · 3 issues

[#8248](https://github.com/mrdoob/three.js/issues/8248) [#16440](https://github.com/mrdoob/three.js/issues/16440) [#16798](https://github.com/mrdoob/three.js/issues/16798)

#### `SPC-15` Program switching cost and unsorted render lists _(open, proposed optimization)_

Binding a different shader program is the most expensive GL state change; render lists not sorted by program cause excess binds, and shadow depth material libraries add extra program creation/switching.

`speculative` · owner: three_core · detect: design_review · 3 issues

[#5469](https://github.com/mrdoob/three.js/issues/5469) [#8849](https://github.com/mrdoob/three.js/issues/8849) [#14018](https://github.com/mrdoob/three.js/issues/14018)

#### `SPC-12` Precision qualifier defaults hurt mobile

WebGLCapabilities always picks highp, making mobile shaders slower and raising memory; missing explicit precision on an int uniform even caused link failure from vertex/fragment mismatch.

`maintainer_confirmed` · owner: three_core · detect: static_lint · 2 issues

[#14137](https://github.com/mrdoob/three.js/issues/14137) [#20297](https://github.com/mrdoob/three.js/issues/20297)

#### `SPC-16` Driver attribute-index-0 emulation path

The shader compiler assigns an unused attribute (e.g. morphTarget7) to index 0, which three.js then disables, forcing the driver into an expensive vertex attribute emulation path.

`speculative` · owner: browser_or_driver · detect: upstream_only · 2 issues

[#3030](https://github.com/mrdoob/three.js/issues/3030) [#4364](https://github.com/mrdoob/three.js/issues/4364)

#### `SPC-09` Cache key too coarse, wrong program shared

A material caches a single program or hashes onBeforeCompile source, so objects needing different defines (skinning, instancing, receiveShadow) reuse the wrong program; users then force needsUpdate every frame, recompiling constantly.

`maintainer_confirmed` · owner: three_core · detect: static_lint · 1 issues

[#11400](https://github.com/mrdoob/three.js/issues/11400)

#### `SPC-10` Per-fragment vs per-vertex lighting shader cost

Phong/Standard evaluate lighting per fragment while Lambert evaluates per vertex, so the generated fragment shader does substantially more ALU work, especially on mobile fill-rate-limited GPUs.

`maintainer_confirmed` · owner: three_core · detect: design_review · 1 issues

[#7130](https://github.com/mrdoob/three.js/issues/7130)

#### `SPC-14` Bundled shader source and init-time string work

ShaderChunk/ShaderLib are single object literals resolved by `#include` string lookup, so all shader source ships regardless of materials used; chunk arrays joined at library load add init cost.

`reporter_asserted` · owner: asset_pipeline · detect: static_asset_check · 1 issues

[#24199](https://github.com/mrdoob/three.js/issues/24199)

#### `SPC-17` Duplicate compute pipelines from id-based keys _(open, proposed optimization)_

_getComputeCacheKey uses computeNode.id and stageCompute.id rather than WGSL/binding layout, so identical compute shaders yield duplicate GPUComputePipeline objects and redundant compilation.

`maintainer_confirmed` · owner: three_core · detect: upstream_only · 1 issues

[#32735](https://github.com/mrdoob/three.js/issues/32735)

### Texture upload and decode

_75 observations → 17 distinct causes_

#### `TUD-02` Per-Texture upload keying duplicates identical images on GPU

WebGLRenderer keys upload state per Texture instance (properties WeakMap / texture.version), so cloned or re-loaded Textures sharing one image each get their own WebGLTexture. The same pixels are decoded and uploaded once per instance, duplicating VRAM and stalling initialization.

`maintainer_confirmed` · owner: three_core · detect: static_lint · 8 issues

[#403](https://github.com/mrdoob/three.js/issues/403) [#5821](https://github.com/mrdoob/three.js/issues/5821) [#5876](https://github.com/mrdoob/three.js/issues/5876) [#7956](https://github.com/mrdoob/three.js/issues/7956) [#14391](https://github.com/mrdoob/three.js/issues/14391) [#15952](https://github.com/mrdoob/three.js/issues/15952) [#16798](https://github.com/mrdoob/three.js/issues/16798) [#21819](https://github.com/mrdoob/three.js/issues/21819)

#### `TUD-07` Uncompressed textures inflate VRAM, bandwidth and decode _(open, proposed optimization)_

Shipping PNG/JPEG rather than GPU-compressed (KTX2/BC/ASTC) formats means the browser must decode to raw RGBA, upload a much larger buffer, and the GPU samples uncompressed data. Compressed formats cut upload time (8s to 2s measured) and VRAM.

`maintainer_confirmed` · owner: asset_pipeline · detect: static_asset_check · 7 issues

[#1419](https://github.com/mrdoob/three.js/issues/1419) [#11301](https://github.com/mrdoob/three.js/issues/11301) [#13807](https://github.com/mrdoob/three.js/issues/13807) [#13911](https://github.com/mrdoob/three.js/issues/13911) [#20522](https://github.com/mrdoob/three.js/issues/20522) [#27171](https://github.com/mrdoob/three.js/issues/27171) [#33080](https://github.com/mrdoob/three.js/issues/33080)

#### `TUD-01` Main-thread synchronous image decode and upload blocks frames

gl.texImage2D with an HTMLImageElement forces synchronous JPEG/PNG/WebP decode plus upload on the main thread, and large (8k/16k) textures block for hundreds of ms to seconds. ImageBitmapLoader or GPU-compressed formats move/avoid the decode.

`measured` · owner: three_core · detect: static_lint · 6 issues

[#4165](https://github.com/mrdoob/three.js/issues/4165) [#11746](https://github.com/mrdoob/three.js/issues/11746) [#16261](https://github.com/mrdoob/three.js/issues/16261) [#19511](https://github.com/mrdoob/three.js/issues/19511) [#27171](https://github.com/mrdoob/three.js/issues/27171) [#28101](https://github.com/mrdoob/three.js/issues/28101)

#### `TUD-03` NPOT textures force canvas resize and lose mipmaps

Non-power-of-two images cannot be mipmapped in WebGL1, so full-resolution texels are sampled for tiny screen coverage; three.js also allocates a fresh intermediate 2D canvas per image in makePowerOfTwo/clampToMaxSize and rounds dimensions up, inflating memory and upload cost.

`maintainer_confirmed` · owner: three_core · detect: static_asset_check · 6 issues

[#789](https://github.com/mrdoob/three.js/issues/789) [#817](https://github.com/mrdoob/three.js/issues/817) [#1266](https://github.com/mrdoob/three.js/issues/1266) [#11378](https://github.com/mrdoob/three.js/issues/11378) [#11471](https://github.com/mrdoob/three.js/issues/11471) [#12201](https://github.com/mrdoob/three.js/issues/12201)

#### `TUD-06` sRGB internal format triggers slow driver upload path

Using SRGB8_ALPHA8 as the internal format for UNSIGNED_BYTE textures hits a slow CPU conversion path in Chromium/ANGLE (OpenGL backend) on Windows, costing far more than RGBA8 per upload and causing multi-second stalls; cost scales with texture size and upload frequency.

`upstream_bug` · owner: browser_or_driver · detect: upstream_only · 6 issues

[#22758](https://github.com/mrdoob/three.js/issues/22758) [#22892](https://github.com/mrdoob/three.js/issues/22892) [#23803](https://github.com/mrdoob/three.js/issues/23803) [#26183](https://github.com/mrdoob/three.js/issues/26183) [#26266](https://github.com/mrdoob/three.js/issues/26266) [#26516](https://github.com/mrdoob/three.js/issues/26516)

#### `TUD-09` Full re-upload when only a sub-region changed

Setting needsUpdate re-uploads the entire texture via texImage2D even when a single texel, sprite-sheet cell, or small rectangle changed. For large canvas/data textures (4096x2048, 6000x6000) this blocks the UI thread each frame instead of a cheap texSubImage2D.

`reporter_asserted` · owner: three_core · detect: static_lint · 6 issues

[#4155](https://github.com/mrdoob/three.js/issues/4155) [#11746](https://github.com/mrdoob/three.js/issues/11746) [#25133](https://github.com/mrdoob/three.js/issues/25133) [#26190](https://github.com/mrdoob/three.js/issues/26190) [#28980](https://github.com/mrdoob/three.js/issues/28980) [#30184](https://github.com/mrdoob/three.js/issues/30184)

#### `TUD-05` Redundant per-frame video texture uploads

VideoTexture marks needsUpdate every animation frame (even when paused or when the video decodes fewer frames than the display refresh), so a full frame of pixels is re-uploaded 60-90 times per second. At 2k-4K resolutions this exceeds the frame budget.

`maintainer_confirmed` · owner: three_core · detect: static_lint · 5 issues

[#9421](https://github.com/mrdoob/three.js/issues/9421) [#13379](https://github.com/mrdoob/three.js/issues/13379) [#16946](https://github.com/mrdoob/three.js/issues/16946) [#19343](https://github.com/mrdoob/three.js/issues/19343) [#31019](https://github.com/mrdoob/three.js/issues/31019)

#### `TUD-11` Browser texture upload regressions and platform bugs

Driver/browser-level defects make uploads pathologically slow or leaky: a Chrome 77 macOS texImage2D regression, and iOS ImageBitmap decoding retaining graphics memory that GC never frees, exhausting VRAM around 120-250MB.

`upstream_bug` · owner: browser_or_driver · detect: upstream_only · 5 issues

[#6915](https://github.com/mrdoob/three.js/issues/6915) [#17619](https://github.com/mrdoob/three.js/issues/17619) [#22652](https://github.com/mrdoob/three.js/issues/22652) [#28868](https://github.com/mrdoob/three.js/issues/28868) [#31093](https://github.com/mrdoob/three.js/issues/31093)

#### `TUD-04` Env map / PMREM cubemap generation cost and resolution

Generating PMREM/CubeUV mips and converting equirectangular backgrounds into cube render targets consumes generation time and VRAM; face size choices trade undersampling against 4x memory, and RGBE format blocks the cheaper mipmap-based path.

`measured` · owner: three_core · detect: runtime_profile_only · 4 issues

[#10940](https://github.com/mrdoob/three.js/issues/10940) [#22236](https://github.com/mrdoob/three.js/issues/22236) [#26796](https://github.com/mrdoob/three.js/issues/26796) [#27501](https://github.com/mrdoob/three.js/issues/27501)

#### `TUD-08` Lazy first-use upload causes render hitches

Textures are decoded and uploaded to the GPU only when an object is first rendered, so scrolling or revealing new objects stalls; compile() precompiles shaders but performs no texture upload, and deferred upload can also let a reused canvas source be overwritten first.

`maintainer_confirmed` · owner: three_core · detect: runtime_profile_only · 4 issues

[#3574](https://github.com/mrdoob/three.js/issues/3574) [#17822](https://github.com/mrdoob/three.js/issues/17822) [#22696](https://github.com/mrdoob/three.js/issues/22696) [#29898](https://github.com/mrdoob/three.js/issues/29898)

#### `TUD-10` Intermediate 2D canvas copy of video frames per frame

Routing decoded video/VideoFrame data through drawImage onto a 2D canvas before texture upload adds a full CPU rasterization/memcopy of every frame, costing several ms and multiplying across streams, instead of binding the video element directly.

`reporter_asserted` · owner: app_developer · detect: static_lint · 4 issues

[#1522](https://github.com/mrdoob/three.js/issues/1522) [#8110](https://github.com/mrdoob/three.js/issues/8110) [#9754](https://github.com/mrdoob/three.js/issues/9754) [#27783](https://github.com/mrdoob/three.js/issues/27783)

#### `TUD-15` Data-texture encoding workarounds cost bandwidth _(hypothetical)_

Emulating features through textures adds fetch latency and packing overhead: fp32 packed as RGBA8 in shader, light data in data textures, and 16-bit data emulated via integer textures or float32 without EXT_texture_norm16.

`maintainer_confirmed` · owner: three_core · detect: design_review · 4 issues

[#7037](https://github.com/mrdoob/three.js/issues/7037) [#8718](https://github.com/mrdoob/three.js/issues/8718) [#9566](https://github.com/mrdoob/three.js/issues/9566) [#33193](https://github.com/mrdoob/three.js/issues/33193)

#### `TUD-13` Pixel format mismatch and FLIP_Y force CPU conversion

When the source image internal format (e.g. BGRX8) differs from the requested texture format, or UNPACK_FLIP_Y_WEBGL is set, the browser performs a CPU-side per-texel conversion during texImage2D instead of a fast blit. Source type (ImageData vs canvas vs image) similarly changes upload cost.

`reporter_asserted` · owner: browser_or_driver · detect: runtime_profile_only · 3 issues

[#375](https://github.com/mrdoob/three.js/issues/375) [#4316](https://github.com/mrdoob/three.js/issues/4316) [#9109](https://github.com/mrdoob/three.js/issues/9109)

#### `TUD-14` Many small textures instead of an atlas

Allocating one texture per label/sprite creates hundreds of separate uploads and large RAM usage; sharing an atlas with per-instance uv offsets would avoid per-object texture copies.

`reporter_asserted` · owner: app_developer · detect: static_asset_check · 3 issues

[#5876](https://github.com/mrdoob/three.js/issues/5876) [#13233](https://github.com/mrdoob/three.js/issues/13233) [#16334](https://github.com/mrdoob/three.js/issues/16334)

#### `TUD-12` CanvasRenderer texture drawing and pattern recreation

In the software CanvasRenderer, texture-filled triangles require context.createPattern to be re-created whenever the texture updates, which dominates frame time; drawing textures is far costlier than lines, and per-frame drawImage compositing is repeated instead of cached.

`maintainer_confirmed` · owner: three_core · detect: design_review · 2 issues

[#92](https://github.com/mrdoob/three.js/issues/92) [#1601](https://github.com/mrdoob/three.js/issues/1601)

#### `TUD-16` CPU-side sRGB conversion and mipmap generation at load

The WebGL1 fallback converts texture data sRGB->linear per pixel on the CPU at load time, and because EXT_sRGB forbids generateMipmaps, sRGB-correct mipmaps must also be built on the CPU, adding per-texture cost and precision loss.

`reporter_asserted` · owner: three_core · detect: runtime_profile_only · 1 issues

[#23803](https://github.com/mrdoob/three.js/issues/23803)

#### `TUD-18` Lossy legacy re-encode paths degrade or cost on serialization _(proposed optimization)_

ImageUtils.getDataURL hardcodes JPEG conversion for images over 2048px because PNG serialization of large canvases was deemed too expensive, and toDataURL workarounds add encode cost; reduced color-depth PNG decode in IE/Edge similarly degrades quality.

`speculative` · owner: three_core · detect: upstream_only · 1 issues

[#30326](https://github.com/mrdoob/three.js/issues/30326)

### Geometry and buffer updates

_74 observations → 18 distinct causes_

#### `GBU-01` Rebuilding/reallocating geometry buffers every frame

Apps (or helpers) recreate Geometry/Mesh/TextGeometry, re-merge scenes, or delete internal GL buffers each frame, forcing full CPU rebuild plus new GPU buffer allocation and upload rather than in-place attribute updates.

`maintainer_confirmed` · owner: app_developer · detect: static_lint · 12 issues

[#79](https://github.com/mrdoob/three.js/issues/79) [#108](https://github.com/mrdoob/three.js/issues/108) [#1091](https://github.com/mrdoob/three.js/issues/1091) [#2875](https://github.com/mrdoob/three.js/issues/2875) [#4324](https://github.com/mrdoob/three.js/issues/4324) [#7179](https://github.com/mrdoob/three.js/issues/7179) [#8021](https://github.com/mrdoob/three.js/issues/8021) [#11746](https://github.com/mrdoob/three.js/issues/11746) [#12407](https://github.com/mrdoob/three.js/issues/12407) [#29740](https://github.com/mrdoob/three.js/issues/29740) [#31056](https://github.com/mrdoob/three.js/issues/31056) [#33673](https://github.com/mrdoob/three.js/issues/33673)

#### `GBU-03` Re-upload whole buffer instead of sub-range updates

Setting needsUpdate triggers a full bufferData re-upload of the entire attribute buffer even when only a few vertices/instances changed, instead of bufferSubData over an update range. Single/absent updateRange support also forces oversized spans for sparse edits.

`maintainer_confirmed` · owner: three_core · detect: static_lint · 8 issues

[#642](https://github.com/mrdoob/three.js/issues/642) [#2079](https://github.com/mrdoob/three.js/issues/2079) [#3610](https://github.com/mrdoob/three.js/issues/3610) [#5948](https://github.com/mrdoob/three.js/issues/5948) [#9353](https://github.com/mrdoob/three.js/issues/9353) [#26562](https://github.com/mrdoob/three.js/issues/26562) [#27980](https://github.com/mrdoob/three.js/issues/27980) [#31338](https://github.com/mrdoob/three.js/issues/31338)

#### `GBU-04` Fixed-size buffers force reallocation when geometry grows

WebGL buffers are fixed size, so adding faces, instances, or increasing InstancedMesh.count requires allocating new VBOs and re-uploading all data; dirty flags only cover fixed-size updates. Renderers pin max counts or over-allocate to avoid this.

`maintainer_confirmed` · owner: three_core · detect: design_review · 7 issues

[#167](https://github.com/mrdoob/three.js/issues/167) [#342](https://github.com/mrdoob/three.js/issues/342) [#13995](https://github.com/mrdoob/three.js/issues/13995) [#17714](https://github.com/mrdoob/three.js/issues/17714) [#21982](https://github.com/mrdoob/three.js/issues/21982) [#26363](https://github.com/mrdoob/three.js/issues/26363) [#32903](https://github.com/mrdoob/three.js/issues/32903)

#### `GBU-05` De-indexing duplicates vertices, inflating buffers

Geometry's per-face normals/colors/uvs, flat shading, and Geometry->BufferGeometry conversion require non-indexed triangle soup, duplicating shared vertices (e.g. 507 -> 8712 positions), which inflates memory and vertex shader invocations. Loaders that emit non-indexed data have the same cost.

`maintainer_confirmed` · owner: three_core · detect: static_asset_check · 7 issues

[#2697](https://github.com/mrdoob/three.js/issues/2697) [#6926](https://github.com/mrdoob/three.js/issues/6926) [#7130](https://github.com/mrdoob/three.js/issues/7130) [#8591](https://github.com/mrdoob/three.js/issues/8591) [#11898](https://github.com/mrdoob/three.js/issues/11898) [#13259](https://github.com/mrdoob/three.js/issues/13259) [#16099](https://github.com/mrdoob/three.js/issues/16099)

#### `GBU-06` CPU-side per-vertex recomputation each frame

Recomputing vertex/face normals, running modifier stacks, baking transforms in setMatrixAt, or copying morph data element-by-element in JS re-touches every vertex per frame before re-upload, halving throughput or worse.

`measured` · owner: app_developer · detect: static_lint · 6 issues

[#79](https://github.com/mrdoob/three.js/issues/79) [#706](https://github.com/mrdoob/three.js/issues/706) [#4584](https://github.com/mrdoob/three.js/issues/4584) [#9574](https://github.com/mrdoob/three.js/issues/9574) [#22376](https://github.com/mrdoob/three.js/issues/22376) [#26692](https://github.com/mrdoob/three.js/issues/26692)

#### `GBU-02` Legacy Geometry object-based storage and conversion overhead

THREE.Geometry stores per-vertex/per-face JS objects rather than typed arrays, so translating into typed arrays in the renderer dominates dynamic update cost; caches like __directGeometry being deleted or elementsNeedUpdate never cleared force full re-conversion every update.

`maintainer_confirmed` · owner: three_core · detect: static_lint · 6 issues

[#79](https://github.com/mrdoob/three.js/issues/79) [#3850](https://github.com/mrdoob/three.js/issues/3850) [#4386](https://github.com/mrdoob/three.js/issues/4386) [#7288](https://github.com/mrdoob/three.js/issues/7288) [#8338](https://github.com/mrdoob/three.js/issues/8338) [#14187](https://github.com/mrdoob/three.js/issues/14187)

#### `GBU-08` Redundant duplicate GPU copies of the same data

three.js cannot share a WebGL buffer across geometries or across accessors on the same bufferView, so cloned geometries and multiple accessors each allocate and upload their own copy of identical data.

`maintainer_confirmed` · owner: three_core · detect: static_asset_check · 5 issues

[#189](https://github.com/mrdoob/three.js/issues/189) [#2244](https://github.com/mrdoob/three.js/issues/2244) [#6877](https://github.com/mrdoob/three.js/issues/6877) [#16802](https://github.com/mrdoob/three.js/issues/16802) [#27926](https://github.com/mrdoob/three.js/issues/27926)

#### `GBU-10` Merging geometries duplicates and reallocates attribute buffers

mergeBufferGeometries clones and applyMatrix4s each child, allocating duplicate attribute buffers and recreating GPU buffers; mergeVertices adds further latency and memory (22mb -> 85mb, 200ms spikes).

`reporter_asserted` · owner: three_core · detect: static_lint · 4 issues

[#323](https://github.com/mrdoob/three.js/issues/323) [#1278](https://github.com/mrdoob/three.js/issues/1278) [#3090](https://github.com/mrdoob/three.js/issues/3090) [#18918](https://github.com/mrdoob/three.js/issues/18918)

#### `GBU-11` Allocating unnecessary or oversized attribute buffers _(open, proposed optimization)_

Geometries allocate normal/uv attributes even when unused, wireframe rendering builds a second index buffer set, and multiDraw starts/counts arrays (~1.6MB) are uploaded every frame — all wasted memory and bandwidth.

`maintainer_confirmed` · owner: three_core · detect: static_asset_check · 4 issues

[#4627](https://github.com/mrdoob/three.js/issues/4627) [#26595](https://github.com/mrdoob/three.js/issues/26595) [#28776](https://github.com/mrdoob/three.js/issues/28776) [#30168](https://github.com/mrdoob/three.js/issues/30168)

#### `GBU-14` Non-interleaved attributes hurt fetch locality and update cost _(proposed optimization)_

Separate per-attribute buffers require multiple binds and multiple partial writes instead of one interleaved buffer, hurting vertex-fetch locality (notably on mobile) and increasing per-update work.

`reporter_asserted` · owner: three_core · detect: static_asset_check · 3 issues

[#1987](https://github.com/mrdoob/three.js/issues/1987) [#6877](https://github.com/mrdoob/three.js/issues/6877) [#28948](https://github.com/mrdoob/three.js/issues/28948)

#### `GBU-09` Dynamic VBO usage inherently slower and keeps CPU arrays

DYNAMIC_DRAW buffers are ~10x slower than static ones, and geometry.dynamic keeps CPU-side arrays alive raising memory; if not set before first render the renderer discards buffers and updates silently fail.

`measured` · owner: three_core · detect: static_lint · 2 issues

[#79](https://github.com/mrdoob/three.js/issues/79) [#2712](https://github.com/mrdoob/three.js/issues/2712)

#### `GBU-07` Per-draw attribute binding and state setup overhead

Without VAO caching the renderer rebinds attribute buffers per draw; morph-target paths enable all maxMorphTargets attributes and leave attribute 0 disabled, triggering driver slow paths. Dynamic attribute replacement adds per-render-object checks.

`maintainer_confirmed` · owner: three_core · detect: runtime_profile_only · 2 issues

[#1804](https://github.com/mrdoob/three.js/issues/1804) [#5251](https://github.com/mrdoob/three.js/issues/5251)

#### `GBU-12` Excess vertex count from geometry generation choices

Tessellating text glyphs, splitting quads into two triangles, or using quads instead of gl.POINTS multiplies vertex and face counts, increasing buffer size and per-face renderer processing.

`reporter_asserted` · owner: three_core · detect: static_asset_check · 2 issues

[#3663](https://github.com/mrdoob/three.js/issues/3663) [#33215](https://github.com/mrdoob/three.js/issues/33215)

#### `GBU-17` Non-BufferGeometry path has larger memory footprint _(hypothetical)_

The legacy renderer path/buffer layout has a larger footprint that may exceed cache/GPU memory, causing swapping and lower framerate; shared static geometry also cannot bind across contexts.

`speculative` · owner: three_core · detect: static_lint · 2 issues

[#1562](https://github.com/mrdoob/three.js/issues/1562) [#5871](https://github.com/mrdoob/three.js/issues/5871)

#### `GBU-13` Index/attribute format limits force splitting or conversion

16-bit ELEMENT_ARRAY_BUFFER limits without OES_element_index_uint force slow geometry chunk-splitting; WebGPU's 32-bit-only integer attributes mishandle quantized uint8/uint16 meshopt data.

`maintainer_confirmed` · owner: three_core · detect: upstream_only · 1 issues

[#4386](https://github.com/mrdoob/three.js/issues/4386)

#### `GBU-15` Poor triangle ordering causes vertex cache misses _(proposed optimization)_

Random triangle ordering defeats the post-transform vertex cache, so shared vertices are re-processed by the vertex shader multiple times.

`reporter_asserted` · owner: asset_pipeline · detect: static_asset_check · 1 issues

[#8731](https://github.com/mrdoob/three.js/issues/8731)

#### `GBU-16` Instance sorting duplicates per-instance attribute data _(open, hypothetical)_

CPU sorting of instances requires rearranging every per-instance attribute (matrices, colors) and double-storing the arrays before re-upload.

`reporter_asserted` · owner: three_core · detect: design_review · 1 issues

[#27170](https://github.com/mrdoob/three.js/issues/27170)

#### `GBU-18` Precomputed CPU tangents add per-vertex upfront cost _(hypothetical)_

MikkTSpace tangent generation on the CPU costs per-vertex work and an extra attribute buffer for every model, versus near-free per-fragment derivation in the shader.

`speculative` · owner: asset_pipeline · detect: design_review · 1 issues

[#17804](https://github.com/mrdoob/three.js/issues/17804)

### Browser, driver and device

_73 observations → 18 distinct causes_

#### `DBD-01` Browser WebGL/ANGLE backend regressions slow rendering _(open)_

Browser compositor/WebGL translation layers (Chromium+ANGLE, Firefox, Safari) regress or take slow paths for common GL operations, so identical three.js content runs far slower on specific browser builds/backends. Examples: ANGLE Metal index-buffer rewriting for flat varyings, slow VAO handling, UBO layout translation, multiDrawArrays, buffer creation after many polygons.

`upstream_bug` · owner: browser_or_driver · detect: upstream_only · 13 issues

[#507](https://github.com/mrdoob/three.js/issues/507) [#1959](https://github.com/mrdoob/three.js/issues/1959) [#2069](https://github.com/mrdoob/three.js/issues/2069) [#5233](https://github.com/mrdoob/three.js/issues/5233) [#11610](https://github.com/mrdoob/three.js/issues/11610) [#16684](https://github.com/mrdoob/three.js/issues/16684) [#21503](https://github.com/mrdoob/three.js/issues/21503) [#21979](https://github.com/mrdoob/three.js/issues/21979) [#23821](https://github.com/mrdoob/three.js/issues/23821) [#26143](https://github.com/mrdoob/three.js/issues/26143) [#27170](https://github.com/mrdoob/three.js/issues/27170) [#30560](https://github.com/mrdoob/three.js/issues/30560) [#31935](https://github.com/mrdoob/three.js/issues/31935)

#### `DBD-02` Mobile/integrated GPU capability limits

Weak mobile/integrated GPUs and drivers cap fill rate, texture size (>2048), point size, and precision; highp fragment precision is slow or unsupported, MSAA costs GPU time, and large geometry or per-pixel shading exceeds device budgets.

`measured` · owner: browser_or_driver · detect: upstream_only · 8 issues

[#325](https://github.com/mrdoob/three.js/issues/325) [#4074](https://github.com/mrdoob/three.js/issues/4074) [#7972](https://github.com/mrdoob/three.js/issues/7972) [#8110](https://github.com/mrdoob/three.js/issues/8110) [#12201](https://github.com/mrdoob/three.js/issues/12201) [#14570](https://github.com/mrdoob/three.js/issues/14570) [#15553](https://github.com/mrdoob/three.js/issues/15553) [#22376](https://github.com/mrdoob/three.js/issues/22376)

#### `DBD-03` Generic cross-browser/driver throughput disparity

The same scene renders at very different framerates across browsers, GPUs and driver versions (Edge vs Chrome, Safari 6, Firefox on Windows/Linux, old ATI drivers, Chrome/macOS CPU spikes) without any three.js-side cause.

`upstream_bug` · owner: browser_or_driver · detect: upstream_only · 6 issues

[#25](https://github.com/mrdoob/three.js/issues/25) [#884](https://github.com/mrdoob/three.js/issues/884) [#2762](https://github.com/mrdoob/three.js/issues/2762) [#3256](https://github.com/mrdoob/three.js/issues/3256) [#6915](https://github.com/mrdoob/three.js/issues/6915) [#22490](https://github.com/mrdoob/three.js/issues/22490)

#### `DBD-06` requestAnimationFrame scheduling and compositor throttling

Browsers schedule/throttle rAF inconsistently: WebKit throttles or stalls rAF (notably with video playback), Firefox keeps firing for hidden tabs/offscreen iframes, and compositor queues add latency or dropped frames independent of three.js.

`upstream_bug` · owner: browser_or_driver · detect: upstream_only · 5 issues

[#2212](https://github.com/mrdoob/three.js/issues/2212) [#19322](https://github.com/mrdoob/three.js/issues/19322) [#19422](https://github.com/mrdoob/three.js/issues/19422) [#20131](https://github.com/mrdoob/three.js/issues/20131) [#27626](https://github.com/mrdoob/three.js/issues/27626)

#### `DBD-11` Inconsistent canvas sizing and device pixel ratio _(open)_

Rendering at full native DPR multiplies fragment work, while devicePixelContentBox is Chromium-only and iOS Safari ignores CSS sizing of WebGL canvases, breaking pixel-ratio downscaling mitigations and producing wrong buffer sizes under zoom.

`maintainer_confirmed` · owner: browser_or_driver · detect: upstream_only · 5 issues

[#3225](https://github.com/mrdoob/three.js/issues/3225) [#4903](https://github.com/mrdoob/three.js/issues/4903) [#9500](https://github.com/mrdoob/three.js/issues/9500) [#13170](https://github.com/mrdoob/three.js/issues/13170) [#24618](https://github.com/mrdoob/three.js/issues/24618)

#### `DBD-04` JS engine differences and JIT deoptimization

Per-frame math runs at very different speeds across JS engines (JavaScriptCore vs V8), and engine-specific GC/heap regressions, hidden-class polymorphism, JIT warm-up, throw statements and devtools profiling distort or inflate hot-path cost.

`measured` · owner: browser_or_driver · detect: upstream_only · 4 issues

[#5160](https://github.com/mrdoob/three.js/issues/5160) [#12957](https://github.com/mrdoob/three.js/issues/12957) [#14201](https://github.com/mrdoob/three.js/issues/14201) [#17234](https://github.com/mrdoob/three.js/issues/17234)

#### `DBD-07` XR runtime/browser controls presentation pipeline

WebXR browsers own the frame loop, eye-buffer resolution, per-frame pixel copies and VSync deadlines; missed deadlines halve framerate, and browser-side optimizations can break GL state or force lower resolution than requested.

`upstream_bug` · owner: browser_or_driver · detect: upstream_only · 4 issues

[#9788](https://github.com/mrdoob/three.js/issues/9788) [#12225](https://github.com/mrdoob/three.js/issues/12225) [#19275](https://github.com/mrdoob/three.js/issues/19275) [#28835](https://github.com/mrdoob/three.js/issues/28835)

#### `DBD-08` CanvasRenderer software rasterization on non-WebGL platforms

Where WebGL is absent (early iOS Safari) three.js falls back to CPU 2D-canvas rasterization; per-pixel software fill, clip() antialiasing and GPU-accelerated-canvas changes make it orders of magnitude slower and can exhaust device memory.

`maintainer_confirmed` · owner: browser_or_driver · detect: upstream_only · 4 issues

[#549](https://github.com/mrdoob/three.js/issues/549) [#711](https://github.com/mrdoob/three.js/issues/711) [#865](https://github.com/mrdoob/three.js/issues/865) [#1376](https://github.com/mrdoob/three.js/issues/1376)

#### `DBD-09` Vertex attribute layout hits driver emulation path

When attribute location 0 is disabled or a non-Float32Array attribute type is used, drivers fall into an expensive emulation/slow path; also TRIANGLE_FAN and de-indexing behavior vary by driver.

`maintainer_confirmed` · owner: three_core · detect: upstream_only · 4 issues

[#4364](https://github.com/mrdoob/three.js/issues/4364) [#9869](https://github.com/mrdoob/three.js/issues/9869) [#9955](https://github.com/mrdoob/three.js/issues/9955) [#33840](https://github.com/mrdoob/three.js/issues/33840)

#### `DBD-13` alpha:false forces emulated RGB framebuffer _(proposed optimization)_

Requesting a context (or XRWebGLLayer) with alpha:false makes browsers/drivers emulate an RGB backbuffer over a native RGBA one, adding per-frame copy/compositing cost; especially severe on QCOM XR chipsets. Switching to alpha:true restored full framerate.

`measured` · owner: three_core · detect: static_lint · 4 issues

[#13170](https://github.com/mrdoob/three.js/issues/13170) [#18338](https://github.com/mrdoob/three.js/issues/18338) [#22418](https://github.com/mrdoob/three.js/issues/22418) [#23408](https://github.com/mrdoob/three.js/issues/23408)

#### `DBD-14` Missing/falsely advertised WebGL extensions force slow fallbacks

Extensions (EXT_shader_texture_lod, OES_texture_float, EXT_frag_depth, WEBGL_draw_buffers) are absent or advertised but non-conformant, so three.js must take lower-quality or multi-pass fallback paths that cost extra passes or pre-filtering.

`reporter_asserted` · owner: browser_or_driver · detect: upstream_only · 4 issues

[#2624](https://github.com/mrdoob/three.js/issues/2624) [#12851](https://github.com/mrdoob/three.js/issues/12851) [#14051](https://github.com/mrdoob/three.js/issues/14051) [#18819](https://github.com/mrdoob/three.js/issues/18819)

#### `DBD-10` Video-to-texture upload paths are browser-dependent

Video decode/upload pipelines return out-of-order or black frames when throttled, mishandle media pipelines on Chrome Android, and lack requestVideoFrameCallback, forcing per-frame uploads of even paused video at high CPU cost.

`upstream_bug` · owner: browser_or_driver · detect: upstream_only · 2 issues

[#7972](https://github.com/mrdoob/three.js/issues/7972) [#16946](https://github.com/mrdoob/three.js/issues/16946)

#### `DBD-15` Asset loading and decode APIs differ across browsers

createImageBitmap options dictionary is missing in Firefox (blocking off-thread decode) with an upload perf regression, WebKit preload reuse is broken, and a Chromium Fetch/blob caching bug loses large local image data.

`upstream_bug` · owner: browser_or_driver · detect: upstream_only · 2 issues

[#11746](https://github.com/mrdoob/three.js/issues/11746) [#19336](https://github.com/mrdoob/three.js/issues/19336)

#### `DBD-16` macOS Chromium degrades instanced rendering

A Chromium macOS-specific bug makes instanced draws slower than naive per-mesh draws, inverting the expected optimization; a related driver/backend dependency shows AMD Vulkan/RADV unaffected while ANGLE OpenGL is penalized.

`upstream_bug` · owner: browser_or_driver · detect: upstream_only · 2 issues

[#23195](https://github.com/mrdoob/three.js/issues/23195) [#28980](https://github.com/mrdoob/three.js/issues/28980)

#### `DBD-18` Web Audio AudioParam scheduling degrades in Chrome

Per-frame linearRampToValueAtTime/panner param events queued against a suspended or non-processing AudioContext accumulate, making each subsequent call progressively slower.

`upstream_bug` · owner: browser_or_driver · detect: upstream_only · 2 issues

[#15422](https://github.com/mrdoob/three.js/issues/15422) [#17705](https://github.com/mrdoob/three.js/issues/17705)

#### `DBD-17` Immature WebGPU implementations _(open)_

Browser WebGPU backends show catastrophic throughput, unstable mapped-range write cost, spurious device loss, and vendor-specific black-screen bugs, none reproducible in three.js code.

`reporter_asserted` · owner: browser_or_driver · detect: upstream_only · 2 issues

[#25295](https://github.com/mrdoob/three.js/issues/25295) [#29580](https://github.com/mrdoob/three.js/issues/29580)

#### `DBD-12` Browser-imposed memory/context limits and losses

No API exposes available GPU memory, so overruns crash the tab; browsers deliberately lose contexts under memory pressure or too many contexts, and GPU-process baseline memory dominates measurements. Safari also regressed max uniform vectors to 256.

`upstream_bug` · owner: browser_or_driver · detect: upstream_only · 1 issues

[#19275](https://github.com/mrdoob/three.js/issues/19275)

#### `DBD-19` Touch/input event handling stalls the render loop

Chrome mobile's default touch-action lets the browser handle pinch gestures, delaying and throttling event delivery so rendering stalls during zoom; setting touchAction='none' removes it.

`upstream_bug` · owner: app_developer · detect: upstream_only · 1 issues

[#14013](https://github.com/mrdoob/three.js/issues/14013)

### Other

_57 observations → 12 distinct causes_

#### `O-03` Expensive fragment/vertex shader work per pixel _(open, proposed optimization)_

Shaders perform redundant per-fragment ALU, texture reads, or emulated filtering (PMREM textureCubeUV, outline multi-tap, log-depth gl_FragDepthEXT defeating early-Z, TBN before alphatest discard) so cost scales with pixel count.

`maintainer_confirmed` · owner: three_core · detect: runtime_profile_only · 9 issues

[#3856](https://github.com/mrdoob/three.js/issues/3856) [#7130](https://github.com/mrdoob/three.js/issues/7130) [#14698](https://github.com/mrdoob/three.js/issues/14698) [#16029](https://github.com/mrdoob/three.js/issues/16029) [#16328](https://github.com/mrdoob/three.js/issues/16328) [#17384](https://github.com/mrdoob/three.js/issues/17384) [#18497](https://github.com/mrdoob/three.js/issues/18497) [#21578](https://github.com/mrdoob/three.js/issues/21578) [#25166](https://github.com/mrdoob/three.js/issues/25166)

#### `O-09` Redundant per-frame renderer bookkeeping and state churn _(proposed optimization)_

Renderables aren't sorted by program so redundant shader/state switches occur; dynamic uniforms called per-uniform per-object; extra camera passes, unconditional rAF loops, dirty-flag propagation and duplicate change-event renders all add per-frame CPU work.

`reporter_asserted` · owner: three_core · detect: runtime_profile_only · 8 issues

[#4221](https://github.com/mrdoob/three.js/issues/4221) [#4795](https://github.com/mrdoob/three.js/issues/4795) [#9505](https://github.com/mrdoob/three.js/issues/9505) [#9870](https://github.com/mrdoob/three.js/issues/9870) [#18131](https://github.com/mrdoob/three.js/issues/18131) [#20131](https://github.com/mrdoob/three.js/issues/20131) [#20549](https://github.com/mrdoob/three.js/issues/20549) [#29712](https://github.com/mrdoob/three.js/issues/29712)

#### `O-04` DOM/SVG/canvas compositing and repaint cost

Building SVG through DOM element creation instead of string emission, repainting an SVG graph every frame, and large HTML overlays over the canvas all force expensive main-thread browser layout/compositing work.

`reporter_asserted` · owner: app_developer · detect: static_lint · 6 issues

[#1](https://github.com/mrdoob/three.js/issues/1) [#225](https://github.com/mrdoob/three.js/issues/225) [#814](https://github.com/mrdoob/three.js/issues/814) [#4074](https://github.com/mrdoob/three.js/issues/4074) [#11356](https://github.com/mrdoob/three.js/issues/11356) [#33678](https://github.com/mrdoob/three.js/issues/33678)

#### `O-01` Allocation and memory layout of per-frame data

Constructing TypedArrays or nested objects per vector/keyframe is expensive relative to flat numeric arrays; V8 cons-strings for UUIDs waste ~600 bytes each; large grids and heap thresholds cause GC cliffs.

`measured` · owner: three_core · detect: static_lint · 5 issues

[#807](https://github.com/mrdoob/three.js/issues/807) [#1703](https://github.com/mrdoob/three.js/issues/1703) [#2730](https://github.com/mrdoob/three.js/issues/2730) [#5073](https://github.com/mrdoob/three.js/issues/5073) [#13069](https://github.com/mrdoob/three.js/issues/13069)

#### `O-08` Platform/runtime environment limits

WebGL contexts cannot share GPU objects so resources duplicate per canvas; webvr-polyfill halves buffer resolution by default; Ejecta lacks JIT making TypedArray lookups a bottleneck; client-side Basis encoding is impractically slow.

`maintainer_confirmed` · owner: browser_or_driver · detect: upstream_only · 5 issues

[#189](https://github.com/mrdoob/three.js/issues/189) [#2712](https://github.com/mrdoob/three.js/issues/2712) [#2769](https://github.com/mrdoob/three.js/issues/2769) [#9749](https://github.com/mrdoob/three.js/issues/9749) [#13911](https://github.com/mrdoob/three.js/issues/13911)

#### `O-05` JS engine deopt from language constructs and transpilation _(proposed optimization)_

ES6 constructs (generators, for-of, let, default parameters) hit deoptimization paths, transpiled ES5 output adds polyfill weight, and `delete` pushes objects into dictionary mode. Class-definition patterns also affect parse-time cost.

`upstream_bug` · owner: three_core · detect: static_lint · 5 issues

[#4776](https://github.com/mrdoob/three.js/issues/4776) [#6419](https://github.com/mrdoob/three.js/issues/6419) [#6987](https://github.com/mrdoob/three.js/issues/6987) [#11552](https://github.com/mrdoob/three.js/issues/11552) [#12231](https://github.com/mrdoob/three.js/issues/12231)

#### `O-02` Accessor/indirection overhead in JS property access _(proposed optimization)_

Getters/setters defined via **defineGetter** or Object.defineProperty, plus namespace/global lookups, add a function-call indirection on every read/write instead of a plain inline property load. Benchmarks show ~30% of raw property throughput and ~15% synthetic penalty for namespace lookups.

`measured` · owner: three_core · detect: static_lint · 4 issues

[#642](https://github.com/mrdoob/three.js/issues/642) [#2148](https://github.com/mrdoob/three.js/issues/2148) [#2425](https://github.com/mrdoob/three.js/issues/2425) [#2860](https://github.com/mrdoob/three.js/issues/2860)

#### `O-10` Inherently expensive global illumination / sampling algorithms _(proposed optimization)_

Path tracing and real-time GI need many accumulated samples to converge; ray marching continues for zero-intensity pixels; SDF recomputation per frame for animated meshes saturates CPU/GPU.

`maintainer_confirmed` · owner: three_core · detect: design_review · 4 issues

[#5554](https://github.com/mrdoob/three.js/issues/5554) [#6575](https://github.com/mrdoob/three.js/issues/6575) [#8248](https://github.com/mrdoob/three.js/issues/8248) [#14051](https://github.com/mrdoob/three.js/issues/14051)

#### `O-11` Excessive distinct material/object instances

Apps creating hundreds of distinct materials multiply per-frame material re-initialization and CPU-side bookkeeping; unconditional materialIndex/group creation forces MultiMaterial paths even when unneeded.

`reporter_asserted` · owner: app_developer · detect: static_lint · 4 issues

[#5876](https://github.com/mrdoob/three.js/issues/5876) [#8203](https://github.com/mrdoob/three.js/issues/8203) [#9123](https://github.com/mrdoob/three.js/issues/9123) [#13656](https://github.com/mrdoob/three.js/issues/13656)

#### `O-06` JS↔WASM interop call and copy overhead

Crossing the JS/WASM boundary requires context switching and copying data out of the wasm sandbox; for small math functions this dominates the actual computation, making WASM slower than plain JS unless the whole core is ported.

`measured` · owner: three_core · detect: runtime_profile_only · 3 issues

[#11301](https://github.com/mrdoob/three.js/issues/11301) [#15545](https://github.com/mrdoob/three.js/issues/15545) [#19339](https://github.com/mrdoob/three.js/issues/19339)

#### `O-07` Geometry algorithm pathologies producing excess work _(open)_

Poorly chosen tolerances or expansion strategies blow up primitive counts: too-small EPSILON in ThreeCSG causes excessive BSP splits (45-60s vs 3s), and LineSegments2 skinny triangles wreck rasterizer quad utilization under MSAA.

`measured` · owner: three_core · detect: runtime_profile_only · 2 issues

[#5806](https://github.com/mrdoob/three.js/issues/5806) [#29018](https://github.com/mrdoob/three.js/issues/29018)

#### `O-12` Module-scope side effects blocking tree shaking

Eager instantiation of lookup tables, **THREE_DEVTOOLS** dispatch and multi-instance checks at module scope, and the Materials.js side-effect pattern mark modules impure, cascading inclusion of unused code and raising load time and memory.

`reporter_asserted` · owner: three_core · detect: static_asset_check · 2 issues

[#24199](https://github.com/mrdoob/three.js/issues/24199) [#25124](https://github.com/mrdoob/three.js/issues/25124)

### Loading and parsing

_53 observations → 10 distinct causes_

#### `LPC-01` Synchronous parsing blocks the main thread

Loaders (OBJ, glTF, Collada, JSON) parse assets synchronously on the main JS thread, so long parses stall interaction, frame submission and VR presentation. Offloading to workers cut ~200ms stalls to ~5ms, but worker use is limited by DOMParser unavailability and worker startup/pool costs.

`measured` · owner: three_core · detect: static_lint · 8 issues

[#387](https://github.com/mrdoob/three.js/issues/387) [#906](https://github.com/mrdoob/three.js/issues/906) [#1778](https://github.com/mrdoob/three.js/issues/1778) [#9756](https://github.com/mrdoob/three.js/issues/9756) [#10580](https://github.com/mrdoob/three.js/issues/10580) [#11301](https://github.com/mrdoob/three.js/issues/11301) [#11746](https://github.com/mrdoob/three.js/issues/11746) [#19453](https://github.com/mrdoob/three.js/issues/19453)

#### `LPC-03` Inefficient parser inner loops and data conversions

Loader hot paths use algorithmically poor code: FBX bone parsing, GLTFLoader's O(n^2) linear primitive-cache scan, per-byte String.fromCharCode ArrayBuffer decoding instead of TextDecoder, extra regex passes over OBJ text, and redundant arraybuffer re-decodes. These dominate parse time independent of format.

`measured` · owner: three_core · detect: static_lint · 8 issues

[#2986](https://github.com/mrdoob/three.js/issues/2986) [#3335](https://github.com/mrdoob/three.js/issues/3335) [#6682](https://github.com/mrdoob/three.js/issues/6682) [#9756](https://github.com/mrdoob/three.js/issues/9756) [#11287](https://github.com/mrdoob/three.js/issues/11287) [#11398](https://github.com/mrdoob/three.js/issues/11398) [#12535](https://github.com/mrdoob/three.js/issues/12535) [#15321](https://github.com/mrdoob/three.js/issues/15321)

#### `LPC-09` Bundle and payload bloat lengthens download/parse _(open)_

Large shipped code and inlined data inflate download and JS parse time: WASM IfcOpenShell builds, webpack data-URL inlined textures held twice in memory, xml2js, and eager registration of all node classes at module load.

`reporter_asserted` · owner: app_developer · detect: static_asset_check · 7 issues

[#5524](https://github.com/mrdoob/three.js/issues/5524) [#8086](https://github.com/mrdoob/three.js/issues/8086) [#8851](https://github.com/mrdoob/three.js/issues/8851) [#11500](https://github.com/mrdoob/three.js/issues/11500) [#15428](https://github.com/mrdoob/three.js/issues/15428) [#19336](https://github.com/mrdoob/three.js/issues/19336) [#25947](https://github.com/mrdoob/three.js/issues/25947)

#### `LPC-02` Exporter algorithms scale badly with mesh size

Blender/three exporters perform unoptimized UV index deduplication, per-object triangulation and normal recomputation, keyframe sampling, and dict-based JSON serialization, so export cost blows up with face/object count and hangs the DCC tool. Rewritten logic gave order-of-magnitude improvements.

`measured` · owner: asset_pipeline · detect: static_asset_check · 6 issues

[#4683](https://github.com/mrdoob/three.js/issues/4683) [#5582](https://github.com/mrdoob/three.js/issues/5582) [#5887](https://github.com/mrdoob/three.js/issues/5887) [#6556](https://github.com/mrdoob/three.js/issues/6556) [#11256](https://github.com/mrdoob/three.js/issues/11256) [#23951](https://github.com/mrdoob/three.js/issues/23951)

#### `LPC-04` Text asset formats cost parse time and bandwidth _(proposed optimization)_

Verbose text formats (COLLADA XML, OBJ, JSON, ASCII STL, MaterialX XML) require string->float conversion and large third-party parsers at runtime, dominating load time and inflating download size versus binary/typed-array formats. Benchmarks show ~30% loading improvement with binary blobs cast directly into TypedArrays.

`measured` · owner: three_core · detect: static_asset_check · 6 issues

[#2954](https://github.com/mrdoob/three.js/issues/2954) [#3349](https://github.com/mrdoob/three.js/issues/3349) [#3850](https://github.com/mrdoob/three.js/issues/3850) [#8086](https://github.com/mrdoob/three.js/issues/8086) [#8851](https://github.com/mrdoob/three.js/issues/8851) [#20541](https://github.com/mrdoob/three.js/issues/20541)

#### `LPC-05` Redundant fetching and missing caching _(open, proposed optimization)_

THREE.Cache defaults to disabled so repeated URL loads re-download and re-parse; glTF bottom-up dependency resolution fetches accessors/buffers and unused material-variant textures; asset requests serialize behind the three.js script load. App-level IndexedDB caching proved slower than HTTP cache + parse.

`maintainer_confirmed` · owner: three_core · detect: static_lint · 5 issues

[#5878](https://github.com/mrdoob/three.js/issues/5878) [#8693](https://github.com/mrdoob/three.js/issues/8693) [#9824](https://github.com/mrdoob/three.js/issues/9824) [#11924](https://github.com/mrdoob/three.js/issues/11924) [#29768](https://github.com/mrdoob/three.js/issues/29768)

#### `LPC-06` Post-load geometry rewriting duplicates buffers _(proposed optimization)_

After parsing, three.js copies or rewrites vertex data: Draco alignment padding fixes, morph-target delta-to-absolute conversion, toTrianglesDrawMode geometry.clone(), and index rebuilding via Geometry+mergeVertices. Each is a full-vertex CPU pass plus duplicated memory.

`maintainer_confirmed` · owner: three_core · detect: runtime_profile_only · 4 issues

[#11898](https://github.com/mrdoob/three.js/issues/11898) [#17608](https://github.com/mrdoob/three.js/issues/17608) [#27926](https://github.com/mrdoob/three.js/issues/27926) [#31959](https://github.com/mrdoob/three.js/issues/31959)

#### `LPC-07` Load-time derived-data computation on CPU

Attributes and geometry not present in the asset are generated at load: morph normals, tangents, font shape triangulation per TextGeometry instance, and VRML crease-angle edge duplication. Cost is proportional to vertex/glyph count and repeats per instance.

`reporter_asserted` · owner: three_core · detect: runtime_profile_only · 4 issues

[#1825](https://github.com/mrdoob/three.js/issues/1825) [#1828](https://github.com/mrdoob/three.js/issues/1828) [#3670](https://github.com/mrdoob/three.js/issues/3670) [#15428](https://github.com/mrdoob/three.js/issues/15428)

#### `LPC-08` Slow JS decompression and texture transcoding

Compressed payloads must be decoded in JS: JSZip's sync inflate (80kB, slower than fflate), OpenCTM/UTF8 decompression, pure-JS PNG parsing for RGBM/LogLuv HDR, and Basis/UASTC transcoding of 4k KTX2 per frame. These CPU decode passes can exceed the savings from smaller downloads.

`reporter_asserted` · owner: three_core · detect: runtime_profile_only · 4 issues

[#1778](https://github.com/mrdoob/three.js/issues/1778) [#20941](https://github.com/mrdoob/three.js/issues/20941) [#26569](https://github.com/mrdoob/three.js/issues/26569) [#27171](https://github.com/mrdoob/three.js/issues/27171)

#### `LPC-10` Offline environment map prefiltering is slow

AMD CubeMapGen radiance prefiltering of environment maps is prohibitively slow, forcing an offline preprocessing pipeline rather than runtime generation.

`reporter_asserted` · owner: asset_pipeline · detect: design_review · 1 issues

[#7402](https://github.com/mrdoob/three.js/issues/7402)

### Per-frame allocation and GC

_51 observations → 11 distinct causes_

#### `PFAG-01` Math methods allocate temporary vectors/matrices per call _(open, proposed optimization)_

Vector3/Matrix4/Quaternion/Color methods (and .clone(), getPoint(), swizzles, unproject) return or construct fresh objects each invocation. Called inside per-frame render, raycast, control, or tessellation loops this produces large volumes of short-lived garbage and GC pauses. Fix is scratch/module-scope reusable instances or target-argument APIs.

`maintainer_confirmed` · owner: three_core · detect: static_lint · 18 issues

[#36](https://github.com/mrdoob/three.js/issues/36) [#323](https://github.com/mrdoob/three.js/issues/323) [#2435](https://github.com/mrdoob/three.js/issues/2435) [#2543](https://github.com/mrdoob/three.js/issues/2543) [#2752](https://github.com/mrdoob/three.js/issues/2752) [#2936](https://github.com/mrdoob/three.js/issues/2936) [#8661](https://github.com/mrdoob/three.js/issues/8661) [#10981](https://github.com/mrdoob/three.js/issues/10981) [#11552](https://github.com/mrdoob/three.js/issues/11552) [#12231](https://github.com/mrdoob/three.js/issues/12231) [#17955](https://github.com/mrdoob/three.js/issues/17955) [#18404](https://github.com/mrdoob/three.js/issues/18404) [#20572](https://github.com/mrdoob/three.js/issues/20572) [#21284](https://github.com/mrdoob/three.js/issues/21284) [#22823](https://github.com/mrdoob/three.js/issues/22823) [#22849](https://github.com/mrdoob/three.js/issues/22849) [#28668](https://github.com/mrdoob/three.js/issues/28668) [#32383](https://github.com/mrdoob/three.js/issues/32383)

#### `PFAG-03` Per-frame render-list and light-state rebuilding

Building visible-object/render lists, sorting them, and concatenating light state hash strings allocates arrays, inner structures and strings every frame. Array.prototype.sort and string concat were measured to trigger minor/incremental GC in Firefox; caches exist specifically to avoid re-allocating entries.

`measured` · owner: three_core · detect: runtime_profile_only · 6 issues

[#643](https://github.com/mrdoob/three.js/issues/643) [#1524](https://github.com/mrdoob/three.js/issues/1524) [#8220](https://github.com/mrdoob/three.js/issues/8220) [#9525](https://github.com/mrdoob/three.js/issues/9525) [#14576](https://github.com/mrdoob/three.js/issues/14576) [#22530](https://github.com/mrdoob/three.js/issues/22530)

#### `PFAG-04` Object.keys()/array copies in hot renderer paths

Calls like Object.keys(), EventDispatcher listener-array cloning, expand(), and range-array replacement allocate a throwaway array on every invocation. In per-frame needsUpdate/dispatch/draw paths this is ~1kb/frame and a measurable share of GC overhead.

`maintainer_confirmed` · owner: three_core · detect: static_lint · 6 issues

[#5186](https://github.com/mrdoob/three.js/issues/5186) [#16408](https://github.com/mrdoob/three.js/issues/16408) [#20637](https://github.com/mrdoob/three.js/issues/20637) [#26562](https://github.com/mrdoob/three.js/issues/26562) [#27465](https://github.com/mrdoob/three.js/issues/27465) [#30261](https://github.com/mrdoob/three.js/issues/30261)

#### `PFAG-02` GC pauses dominate frames regardless of app allocation

Once many objects exist, engine GC cycles themselves dominate frame cost and cause hitches; some sawtooth heap profiles come from the browser's own JIT/bookkeeping memory rather than three.js. Firefox in particular shows frame-rate instability at equal average fps.

`measured` · owner: browser_or_driver · detect: upstream_only · 5 issues

[#642](https://github.com/mrdoob/three.js/issues/642) [#720](https://github.com/mrdoob/three.js/issues/720) [#884](https://github.com/mrdoob/three.js/issues/884) [#8220](https://github.com/mrdoob/three.js/issues/8220) [#15339](https://github.com/mrdoob/three.js/issues/15339)

#### `PFAG-05` Per-vertex/per-element JS wrapper objects in geometry

Wrapping each vertex in Vector3/Vertex objects, defineProperty accessors, ArrayBufferView proxies, or lazily materialized vertices/faces allocates one or more objects per element. This slows construction, doubles pointer memory, and creates enormous GC workloads for large meshes.

`measured` · owner: three_core · detect: static_lint · 4 issues

[#1703](https://github.com/mrdoob/three.js/issues/1703) [#4386](https://github.com/mrdoob/three.js/issues/4386) [#19749](https://github.com/mrdoob/three.js/issues/19749) [#32340](https://github.com/mrdoob/three.js/issues/32340)

#### `PFAG-06` Typed-array and buffer reallocation on updates

Uniform upload casting into a new Float32Array, subarray() per updateBuffer call, and lack of numItems forcing new Float32Array allocation on dynamic vertex updates all allocate typed-array objects per update instead of reusing preallocated buffers.

`measured` · owner: three_core · detect: static_lint · 3 issues

[#1898](https://github.com/mrdoob/three.js/issues/1898) [#4488](https://github.com/mrdoob/three.js/issues/4488) [#18387](https://github.com/mrdoob/three.js/issues/18387)

#### `PFAG-09` Per-instance closures instead of prototype methods

Defining methods or callbacks as closures per instance/per draw allocates a distinct function object each time. This explodes memory for many instances and creates per-frame garbage in the WebGPU draw path and triangulateShape.

`reporter_asserted` · owner: three_core · detect: static_lint · 3 issues

[#2745](https://github.com/mrdoob/three.js/issues/2745) [#12940](https://github.com/mrdoob/three.js/issues/12940) [#33107](https://github.com/mrdoob/three.js/issues/33107)

#### `PFAG-07` Per-object material/geometry cloning at construction

Creating one material per instance deep-clones the uniforms object via UniformsUtils.clone, dominating scene construction; default constructor args make wrappers allocate throwaway BufferGeometry/Material per Mesh. Both produce avoidable object churn.

`measured` · owner: three_core · detect: static_lint · 2 issues

[#6010](https://github.com/mrdoob/three.js/issues/6010) [#21982](https://github.com/mrdoob/three.js/issues/21982)

#### `PFAG-08` Peak-heap inflation from intermediate parse structures

Loaders retain intermediate object/data structures for the whole parse instead of streaming, inflating peak heap (~1300MB vs ~800MB streaming). Non-transferable Geometry also forces structured cloning plus GC when passing from a worker.

`measured` · owner: three_core · detect: runtime_profile_only · 2 issues

[#6926](https://github.com/mrdoob/three.js/issues/6926) [#9756](https://github.com/mrdoob/three.js/issues/9756)

#### `PFAG-10` Boxed numbers from plain-Array matrix elements

Matrix4.elements switched from Float32Array to a plain JS Array, so multiplyMatrices writes boxed Number values, raising heap allocation rate ~50x and causing frequent GC in scenes with many SkinnedMeshes.

`measured` · owner: three_core · detect: runtime_profile_only · 1 issues

[#11258](https://github.com/mrdoob/three.js/issues/11258)

#### `PFAG-11` Browser API allocating per call in VR loop

VRDisplay.getFrameData() allocates on every call, producing per-frame GC pressure inside the VR render loop; the allocation originates in the browser's WebVR implementation, not three.js.

`reporter_asserted` · owner: browser_or_driver · detect: upstream_only · 1 issues

[#13381](https://github.com/mrdoob/three.js/issues/13381)

### Application API misuse

_45 observations → 14 distinct causes_

#### `AAM-01` Recreate resources per object/frame instead of sharing

Applications allocate new geometries, materials, textures, canvas textures or meshes per object or every frame instead of reusing shared instances, multiplying GPU buffer/program creation, uploads and GC pressure. Per-object texture offsets and per-sprite atlas usage force cloning Texture/Material per sprite.

`maintainer_confirmed` · owner: app_developer · detect: static_lint · 9 issues

[#2916](https://github.com/mrdoob/three.js/issues/2916) [#5821](https://github.com/mrdoob/three.js/issues/5821) [#5876](https://github.com/mrdoob/three.js/issues/5876) [#9754](https://github.com/mrdoob/three.js/issues/9754) [#9824](https://github.com/mrdoob/three.js/issues/9824) [#10490](https://github.com/mrdoob/three.js/issues/10490) [#11400](https://github.com/mrdoob/three.js/issues/11400) [#11471](https://github.com/mrdoob/three.js/issues/11471) [#32020](https://github.com/mrdoob/three.js/issues/32020)

#### `AAM-02` Render continuously instead of on demand _(open)_

Apps run an unconditional requestAnimationFrame loop that re-renders an unchanged scene every frame, paying full CPU/GPU render cost at idle. Gating rendering on input/control 'change' events drops CPU from two saturated cores to near zero. Missing change events (TrackballControls wheel) force apps back to continuous loops.

`reporter_asserted` · owner: app_developer · detect: static_lint · 6 issues

[#642](https://github.com/mrdoob/three.js/issues/642) [#4857](https://github.com/mrdoob/three.js/issues/4857) [#7670](https://github.com/mrdoob/three.js/issues/7670) [#9500](https://github.com/mrdoob/three.js/issues/9500) [#20131](https://github.com/mrdoob/three.js/issues/20131) [#30931](https://github.com/mrdoob/three.js/issues/30931)

#### `AAM-05` Enable features the shader or app never uses _(open)_

Flags such as morphNormals on an unlit material, antialias in VR, hand-tracking XR feature, shader error checking, or an occluded environment background make the renderer/runtime do work whose result is discarded, costing fill rate, shader compile checks or CPU.

`reporter_asserted` · owner: app_developer · detect: static_lint · 5 issues

[#1878](https://github.com/mrdoob/three.js/issues/1878) [#9749](https://github.com/mrdoob/three.js/issues/9749) [#21084](https://github.com/mrdoob/three.js/issues/21084) [#21578](https://github.com/mrdoob/three.js/issues/21578) [#27701](https://github.com/mrdoob/three.js/issues/27701)

#### `AAM-04` Misuse of update/invalidation API semantics

Partial-update and cache-invalidation APIs are used incorrectly: addUpdateRange units ignoring itemSize, direct attribute assignment not bumping BufferGeometry.version, CurvePath arc-length caches not refreshed, shadowMap.enabled toggled instead of autoUpdate/needsUpdate. Result is wrong uploads, stale VAOs or full recomputation every frame.

`maintainer_confirmed` · owner: app_developer · detect: static_lint · 4 issues

[#22736](https://github.com/mrdoob/three.js/issues/22736) [#27555](https://github.com/mrdoob/three.js/issues/27555) [#27980](https://github.com/mrdoob/three.js/issues/27980) [#28804](https://github.com/mrdoob/three.js/issues/28804)

#### `AAM-03` Duplicate WebGL contexts, renderers or render loops _(open)_

Creating one renderer/context per figure, or calling main() repeatedly without cancelling the previous rAF loop, duplicates GPU context resources and stacks concurrent render loops so memory and frame cost accumulate. Context sharing gaps force copying data between two contexts each frame.

`maintainer_confirmed` · owner: app_developer · detect: static_lint · 4 issues

[#280](https://github.com/mrdoob/three.js/issues/280) [#17424](https://github.com/mrdoob/three.js/issues/17424) [#20549](https://github.com/mrdoob/three.js/issues/20549) [#26673](https://github.com/mrdoob/three.js/issues/26673)

#### `AAM-07` Using an API outside its intended workload _(open)_

Features are applied to workloads they were not designed for: morph targets carrying frequently changing per-frame vertex data through the DataTexture path, many BatchedMeshes (one per material) on a static scene paying per-mesh culling/sorting/binding, and per-object onBeforeRender uniform changes forcing needsUpdate and extra state changes.

`maintainer_confirmed` · owner: app_developer · detect: design_review · 3 issues

[#26692](https://github.com/mrdoob/three.js/issues/26692) [#28776](https://github.com/mrdoob/three.js/issues/28776) [#29740](https://github.com/mrdoob/three.js/issues/29740)

#### `AAM-06` Redundant CPU recomputation of derivable data

Apps recompute values every frame that are already available or cheaper elsewhere: camera direction/right via cross products instead of reading the matrix, CPU-side cube face rotation (~10ms per 1024² texture), replacing all vertex attributes for LOD swaps when only index/draw range changes, duplicate texture-derivative normals from split fragment functions.

`reporter_asserted` · owner: app_developer · detect: static_lint · 3 issues

[#291](https://github.com/mrdoob/three.js/issues/291) [#16328](https://github.com/mrdoob/three.js/issues/16328) [#31610](https://github.com/mrdoob/three.js/issues/31610)

#### `AAM-08` Per-frame work on idle or hidden state

AudioListener.updateMatrixWorld schedules Web Audio linearRamp calls every frame even with no sound playing, dominating frame time; Timer.update computes elapsed time regardless of document.hidden so throttled tabs yield huge deltas; off-DOM canvas resized from video dimensions each frame forces reallocation.

`maintainer_confirmed` · owner: three_core · detect: static_lint · 2 issues

[#17705](https://github.com/mrdoob/three.js/issues/17705) [#27626](https://github.com/mrdoob/three.js/issues/27626)

#### `AAM-10` Excess geometry from wrong parameters or stray objects

curveSegments was not forwarded after the Shapes refactor so text used default segmentation 12 instead of 2, generating far more geometry than needed; an added Mesh with empty geometry and MeshFaceMaterial imposed per-frame renderer overhead until removed.

`maintainer_confirmed` · owner: three_core · detect: static_lint · 2 issues

[#323](https://github.com/mrdoob/three.js/issues/323) [#789](https://github.com/mrdoob/three.js/issues/789)

#### `AAM-09` JS engine deoptimization from app code or build config

Assigning a string to a Vector3 component creates a new V8 hidden class, making Vector3 call sites polymorphic and causing constant ~1MB minor GCs (45->15 fps). Babel transpiling three.js ES6 classes to ES5 defeats V8 optimization of updateMatrixWorld/projectObject. Throwing validation forces try/catch in hot loops.

`reporter_asserted` · owner: app_developer · detect: static_lint · 2 issues

[#12957](https://github.com/mrdoob/three.js/issues/12957) [#22659](https://github.com/mrdoob/three.js/issues/22659)

#### `AAM-11` Attribute 0 disabled triggering browser emulation

index0AttributeName is defaulted to 'position' only for ShaderMaterial, so built-in materials (notably with morph targets) can leave vertex attribute 0 disabled, forcing slow browser-side attribute emulation unless the user sets it manually.

`reporter_asserted` · owner: three_core · detect: static_lint · 2 issues

[#3030](https://github.com/mrdoob/three.js/issues/3030) [#3896](https://github.com/mrdoob/three.js/issues/3896)

#### `AAM-13` Oversized drawing buffer from bad sizing/DPR handling _(open)_

devicePixelRatio captured once plus setSize(window.innerWidth/Height) yields a drawing buffer far larger than the screen (13944x7869 with 4x MSAA), exploding fragment cost; three.js also assumes the requested size was honored rather than reading gl.drawingBufferWidth/Height.

`reporter_asserted` · owner: app_developer · detect: static_lint · 1 issues

[#4903](https://github.com/mrdoob/three.js/issues/4903)

#### `AAM-14` Main-thread blocking work that cannot move off-thread _(proposed optimization)_

Heavy geometry construction from large datasets runs on the main thread and blocks interaction; it cannot be relocated to a Web Worker because three.js touches window (rAF polyfill, Clock's window.performance.now, devicePixelRatio, AudioContext).

`reporter_asserted` · owner: three_core · detect: design_review · 1 issues

[#478](https://github.com/mrdoob/three.js/issues/478)

#### `AAM-15` Controls bound to document rather than canvas _(proposed optimization)_

Attaching controls to `document` instead of renderer.domElement makes page-level gesture handling apply to the whole document, causing unintended event handling scope.

`speculative` · owner: app_developer · detect: static_lint · 1 issues

[#14013](https://github.com/mrdoob/three.js/issues/14013)

### Lights, uniforms and UBOs

_44 observations → 12 distinct causes_

#### `LUU-02` No dirty-checking of unchanged uniform uploads _(open)_

Uniform values are re-uploaded (or compared element-wise at upload time) every frame regardless of change, since WebGLUniforms performs no cheap value caching and dynamic uniform callbacks run per uniform per object. Redundant gl.uniform*/bufferSubData calls and array copies become render-loop hot spots.

`measured` · owner: three_core · detect: design_review · 8 issues

[#8431](https://github.com/mrdoob/three.js/issues/8431) [#9662](https://github.com/mrdoob/three.js/issues/9662) [#9741](https://github.com/mrdoob/three.js/issues/9741) [#14004](https://github.com/mrdoob/three.js/issues/14004) [#16355](https://github.com/mrdoob/three.js/issues/16355) [#16922](https://github.com/mrdoob/three.js/issues/16922) [#26673](https://github.com/mrdoob/three.js/issues/26673) [#33685](https://github.com/mrdoob/three.js/issues/33685)

#### `LUU-03` Uniform/varying slot limits exhausted by extra uniforms

WebGL1 guarantees only ~16 fragment vec4 uniforms and ANGLE caps ~200 vec4; float arrays are padded to vec4 arrays by many drivers. Adding per-map offset/repeat, extra matrices, light arrays or clipping planes overflows the limit and causes shader link failure or forces data into textures.

`upstream_bug` · owner: three_core · detect: static_asset_check · 7 issues

[#1531](https://github.com/mrdoob/three.js/issues/1531) [#5876](https://github.com/mrdoob/three.js/issues/5876) [#5974](https://github.com/mrdoob/three.js/issues/5974) [#7037](https://github.com/mrdoob/three.js/issues/7037) [#9457](https://github.com/mrdoob/three.js/issues/9457) [#17771](https://github.com/mrdoob/three.js/issues/17771) [#22376](https://github.com/mrdoob/three.js/issues/22376)

#### `LUU-04` Per-fragment shading cost scales with light count

Forward rendering evaluates every light in the uniform-bounded loop for every fragment, so cost grows linearly with light count and with light type complexity. Older hardware without real branching pays the full loop cost.

`maintainer_confirmed` · owner: three_core · detect: design_review · 7 issues

[#167](https://github.com/mrdoob/three.js/issues/167) [#598](https://github.com/mrdoob/three.js/issues/598) [#643](https://github.com/mrdoob/three.js/issues/643) [#9076](https://github.com/mrdoob/three.js/issues/9076) [#9500](https://github.com/mrdoob/three.js/issues/9500) [#11301](https://github.com/mrdoob/three.js/issues/11301) [#15232](https://github.com/mrdoob/three.js/issues/15232)

#### `LUU-01` Per-object UBO binding and upload overhead _(open)_

Each render object owns its own uniform buffer, so every frame all per-object UBOs are bound and re-uploaded via bindBufferBase/bufferData instead of one large buffer with bindBufferRange offsets. This dominates CPU time per draw, measured at 12 vs 60 FPS.

`measured` · owner: three_core · detect: design_review · 6 issues

[#8552](https://github.com/mrdoob/three.js/issues/8552) [#26673](https://github.com/mrdoob/three.js/issues/26673) [#28968](https://github.com/mrdoob/three.js/issues/28968) [#30560](https://github.com/mrdoob/three.js/issues/30560) [#32916](https://github.com/mrdoob/three.js/issues/32916) [#33428](https://github.com/mrdoob/three.js/issues/33428)

#### `LUU-05` Lights hash keyed by render state forces re-init

WebGLLights.hash embeds the per-instance render-state id, so with two cameras/render targets the material's cached lightsHash never matches, triggering initMaterial() and a full uniform-list rebuild every frame for every lit material.

`maintainer_confirmed` · owner: three_core · detect: runtime_profile_only · 4 issues

[#13656](https://github.com/mrdoob/three.js/issues/13656) [#13851](https://github.com/mrdoob/three.js/issues/13851) [#14121](https://github.com/mrdoob/three.js/issues/14121) [#18355](https://github.com/mrdoob/three.js/issues/18355)

#### `LUU-07` UBO path slower than direct glUniform calls _(open)_

Benchmarks showed UBO-based updates underperforming traditional glUniform calls, with a single packed glUniform4fv array being fastest; update cost inside UBOs blocked deeper UBO integration in WebGLRenderer.

`maintainer_confirmed` · owner: three_core · detect: runtime_profile_only · 4 issues

[#13700](https://github.com/mrdoob/three.js/issues/13700) [#30185](https://github.com/mrdoob/three.js/issues/30185) [#31086](https://github.com/mrdoob/three.js/issues/31086) [#33821](https://github.com/mrdoob/three.js/issues/33821)

#### `LUU-06` UBO block-size and binding-count device limits _(open)_

InstanceNode assumes a 64KB uniform block while devices may expose only 16KB MAX_UNIFORM_BLOCK_SIZE, silently dropping instances past 507; separately each wgslFn uniform consumes its own binding rather than being packed into a struct. Both hit hardware descriptor limits.

`maintainer_confirmed` · owner: three_core · detect: runtime_profile_only · 2 issues

[#22376](https://github.com/mrdoob/three.js/issues/22376) [#29781](https://github.com/mrdoob/three.js/issues/29781)

#### `LUU-08` Per-material recomputation of shared render-state data _(proposed optimization)_

Defines derived from the render state are recomputed for each material rather than computed once and shared, and CPU-side per-object matrix computation prevents static bindings and RenderBundle reuse. Work scales with material/object count instead of being amortized.

`maintainer_confirmed` · owner: three_core · detect: design_review · 2 issues

[#8552](https://github.com/mrdoob/three.js/issues/8552) [#30955](https://github.com/mrdoob/three.js/issues/30955)

#### `LUU-09` Unconditional light-probe SH evaluation in fragment shader _(proposed optimization)_

getLightProbeIrradiance() runs in lights_fragment_begin even when the scene has no probes, and spherical-harmonic irradiance is arithmetically far costlier than the hemisphere-light path. Every fragment pays for unused probe math.

`maintainer_confirmed` · owner: three_core · detect: upstream_only · 1 issues

[#26668](https://github.com/mrdoob/three.js/issues/26668)

#### `LUU-11` Expensive math in shader instead of precomputed uniform _(proposed optimization)_

Computing a 4x4 matrix inverse in GLSL per vertex/fragment costs far more than uploading the precomputed value once as a uniform, especially on older hardware.

`reporter_asserted` · owner: three_core · detect: static_lint · 1 issues

[#11162](https://github.com/mrdoob/three.js/issues/11162)

#### `LUU-12` Shadow-casting lights limited by texture units _(proposed optimization)_

All light data is uploaded per object and each shadow-casting light consumes a texture unit, capping the number of shadowed lights independently of uniform limits.

`reporter_asserted` · owner: three_core · detect: design_review · 1 issues

[#9325](https://github.com/mrdoob/three.js/issues/9325)

#### `LUU-13` JIT deoptimization in uniform upload path _(hypothetical)_

Heterogeneous JS arrays used as structured uniform values prevent the engine from generating monomorphic code in the hot uniform-upload loop, deoptimizing a performance-critical path.

`speculative` · owner: three_core · detect: static_lint · 1 issues

[#10759](https://github.com/mrdoob/three.js/issues/10759)

### Culling and spatial indexing

_34 observations → 11 distinct causes_

#### `CASI-04` Linear scene traversal for culling, no spatial index _(open, proposed optimization)_

projectObject() walks the entire scene graph every frame and frustum-tests each renderable, so CPU cull/sort cost scales O(n) with total object count even when everything is off-screen. Groups carry no hierarchical bounding volumes, so subtrees cannot be rejected wholesale; apps wanting visibility info must duplicate the traversal. A BVH/octree would make queries O(log n).

`reporter_asserted` · owner: three_core · detect: design_review · 8 issues

[#3095](https://github.com/mrdoob/three.js/issues/3095) [#5571](https://github.com/mrdoob/three.js/issues/5571) [#13909](https://github.com/mrdoob/three.js/issues/13909) [#15339](https://github.com/mrdoob/three.js/issues/15339) [#16153](https://github.com/mrdoob/three.js/issues/16153) [#23670](https://github.com/mrdoob/three.js/issues/23670) [#26811](https://github.com/mrdoob/three.js/issues/26811) [#27702](https://github.com/mrdoob/three.js/issues/27702)

#### `CASI-01` Loose bounding volumes cause false-positive visibility

Culling uses conservative bounding spheres and plane-only frustum/AABB tests, so elongated terrain, tiled meshes, large boxes crossing several planes, and instanced volumes are reported visible when off-screen, producing extra draw calls. Tighter best-fit or world AABB volumes are more expensive to compute/refit per frame, so three.js keeps the loose defaults.

`measured` · owner: three_core · detect: design_review · 5 issues

[#3901](https://github.com/mrdoob/three.js/issues/3901) [#11291](https://github.com/mrdoob/three.js/issues/11291) [#13995](https://github.com/mrdoob/three.js/issues/13995) [#25610](https://github.com/mrdoob/three.js/issues/25610) [#27756](https://github.com/mrdoob/three.js/issues/27756)

#### `CASI-03` No per-instance culling in batched/instanced meshes _(open)_

InstancedMesh and merged geometry lose per-object culling, so all instances/off-screen geometry are submitted. Where BatchedMesh does cull, onBeforeRender loops over every instance and rewrites the _indirectTexture each frame, and the culled set computed for the render camera is wrongly reused by the shadow pass.

`maintainer_confirmed` · owner: three_core · detect: design_review · 5 issues

[#14921](https://github.com/mrdoob/three.js/issues/14921) [#22376](https://github.com/mrdoob/three.js/issues/22376) [#28102](https://github.com/mrdoob/three.js/issues/28102) [#28389](https://github.com/mrdoob/three.js/issues/28389) [#28776](https://github.com/mrdoob/three.js/issues/28776)

#### `CASI-02` Expensive or unbalanced acceleration-structure construction

Building quality SAH BVHs is near O(n^3) (37s for 100k boxes) and incremental one-at-a-time insertion yields deeply unbalanced trees whose refit cost grows with depth; z-curve sorting cut build to ~368ms. Octree builds that subdivide to <=8 triangles per leaf duplicate large triangles across leaves, exploding memory and build time, and full rebuilds re-insert the whole scene rather than updating one object.

`measured` · owner: app_developer · detect: design_review · 4 issues

[#5571](https://github.com/mrdoob/three.js/issues/5571) [#13995](https://github.com/mrdoob/three.js/issues/13995) [#21355](https://github.com/mrdoob/three.js/issues/21355) [#25264](https://github.com/mrdoob/three.js/issues/25264)

#### `CASI-07` Redundant culling work per camera/eye _(proposed optimization)_

Stereo/VR and ArrayCamera setups traverse the scene and frustum-cull once per eye camera instead of sharing one render list built from a combined frustum, doubling traversal and render-item duplication. Correctness also suffers if only one camera is tested.

`reporter_asserted` · owner: three_core · detect: design_review · 3 issues

[#8849](https://github.com/mrdoob/three.js/issues/8849) [#10927](https://github.com/mrdoob/three.js/issues/10927) [#11301](https://github.com/mrdoob/three.js/issues/11301)

#### `CASI-05` No occlusion or sub-object face culling

Only frustum culling exists, so geometry fully occluded behind other objects is still drawn and rasterized; likewise hidden block faces must be pre-culled manually by the app. Vertex-shader-based meshlet culling still runs the vertex shader over all invisible vertices, giving little gain versus skipping geometry entirely.

`maintainer_confirmed` · owner: three_core · detect: design_review · 2 issues

[#90](https://github.com/mrdoob/three.js/issues/90) [#32305](https://github.com/mrdoob/three.js/issues/32305)

#### `CASI-06` Culling silently disabled by app or missing data

Setting frustumCulled=false, or discarding attribute arrays in onUploadCallback so bounding volumes cannot be computed, causes every mesh to be submitted each frame and raycasting to fall back to brute force.

`maintainer_confirmed` · owner: app_developer · detect: static_lint · 2 issues

[#12925](https://github.com/mrdoob/three.js/issues/12925) [#25960](https://github.com/mrdoob/three.js/issues/25960)

#### `CASI-10` Brute-force ray/intersection queries without spatial index _(proposed optimization)_

Picking among millions of particles, frustum selection of triangles, and CSG polygon-polygon intersection all test every primitive because no BVH/octree prunes candidates.

`speculative` · owner: app_developer · detect: static_lint · 2 issues

[#16099](https://github.com/mrdoob/three.js/issues/16099) [#20530](https://github.com/mrdoob/three.js/issues/20530)

#### `CASI-08` Per-object recomputation of frustum/matrix state

matrixWorldInverse, the view-projection matrix and Frustum.setFromMatrix were recomputed once per object rather than once per batch during frustum testing, multiplying matrix math by object count.

`measured` · owner: three_core · detect: design_review · 1 issues

[#9029](https://github.com/mrdoob/three.js/issues/9029)

#### `CASI-09` No frustum culling for sprites

WebGLRenderer skipped frustum culling for Sprite objects entirely, so off-screen sprites were always rendered.

`maintainer_confirmed` · owner: three_core · detect: upstream_only · 1 issues

[#7371](https://github.com/mrdoob/three.js/issues/7371)

#### `CASI-11` Clipping planes ignored by frustum culling _(hypothetical)_

Local per-material clipping planes are not factored into the cull test, so objects entirely clipped away are still submitted for drawing.

`maintainer_confirmed` · owner: three_core · detect: design_review · 1 issues

[#8497](https://github.com/mrdoob/three.js/issues/8497)

### Matrix and scene-graph updates

_33 observations → 7 distinct causes_

#### `MWU-01` No dirty flags: full scene traversal each frame _(open)_

WebGLRenderer.render() unconditionally calls scene.updateMatrixWorld(), which walks the entire scene graph and recomposes world matrices for every node regardless of whether anything moved. Without caching/dirty-flag invalidation, unchanged subtrees (including invisible ones) are recomputed each frame, dominating CPU time in large graphs.

`measured` · owner: three_core · detect: design_review · 9 issues

[#2638](https://github.com/mrdoob/three.js/issues/2638) [#13909](https://github.com/mrdoob/three.js/issues/13909) [#14360](https://github.com/mrdoob/three.js/issues/14360) [#20220](https://github.com/mrdoob/three.js/issues/20220) [#21387](https://github.com/mrdoob/three.js/issues/21387) [#22530](https://github.com/mrdoob/three.js/issues/22530) [#24521](https://github.com/mrdoob/three.js/issues/24521) [#24736](https://github.com/mrdoob/three.js/issues/24736) [#32916](https://github.com/mrdoob/three.js/issues/32916)

#### `MWU-02` matrixAutoUpdate recomposes static local matrices

With matrixAutoUpdate on, each Object3D recomposes its local matrix from position/quaternion/scale every frame even when static. With tens of thousands of nodes this per-object compose cost dominates; the standard mitigation is matrixAutoUpdate=false with manual updates.

`maintainer_confirmed` · owner: three_core · detect: static_lint · 7 issues

[#167](https://github.com/mrdoob/three.js/issues/167) [#1825](https://github.com/mrdoob/three.js/issues/1825) [#2459](https://github.com/mrdoob/three.js/issues/2459) [#2952](https://github.com/mrdoob/three.js/issues/2952) [#5704](https://github.com/mrdoob/three.js/issues/5704) [#9532](https://github.com/mrdoob/three.js/issues/9532) [#29949](https://github.com/mrdoob/three.js/issues/29949)

#### `MWU-04` Redundant repeated updateMatrixWorld calls per frame _(open)_

Application or library code invokes scene.updateMatrixWorld()/render() multiple times per frame (e.g. once per glTF shader, per extra renderer pass, or pre-render calls), duplicating the whole-graph traversal. Disabling scene.autoUpdate is the usual workaround.

`reporter_asserted` · owner: app_developer · detect: static_lint · 5 issues

[#4599](https://github.com/mrdoob/three.js/issues/4599) [#8431](https://github.com/mrdoob/three.js/issues/8431) [#14577](https://github.com/mrdoob/three.js/issues/14577) [#16328](https://github.com/mrdoob/three.js/issues/16328) [#25154](https://github.com/mrdoob/three.js/issues/25154)

#### `MWU-05` Ancestor-chain updates from accessors and raycasts _(hypothetical)_

APIs like localToWorld, lookAt and raycast call updateWorldMatrix(true,false), forcing a bottom-up traversal of every ancestor on each call. Since these are called many times per frame, unconditional ancestor recomputation of already-current matrices is prohibitive.

`maintainer_confirmed` · owner: three_core · detect: static_lint · 4 issues

[#14496](https://github.com/mrdoob/three.js/issues/14496) [#20220](https://github.com/mrdoob/three.js/issues/20220) [#24727](https://github.com/mrdoob/three.js/issues/24727) [#24736](https://github.com/mrdoob/three.js/issues/24736)

#### `MWU-03` Per-object CPU modelView/normal matrix math

The renderer computes modelViewMatrix and normalMatrix per object in JS each frame, plus historic extras like matrixRotation needed only by CanvasRenderer; callbacks such as onBeforeRender duplicate the modelView inverse. Moving modelViewMatrix to the GPU traded precision for speed.

`maintainer_confirmed` · owner: three_core · detect: design_review · 3 issues

[#36](https://github.com/mrdoob/three.js/issues/36) [#643](https://github.com/mrdoob/three.js/issues/643) [#11162](https://github.com/mrdoob/three.js/issues/11162)

#### `MWU-07` Extra per-object work injected into the matrix hot path _(hypothetical)_

Proposals to add work inside updateMatrix/updateMatrixWorld — pivot matrix multiplication, bounding-sphere center transforms, CSS transform decomposition — multiply cost by object count on the render hot path, and runtime pivot changes force recomputing the whole hierarchy.

`speculative` · owner: three_core · detect: design_review · 3 issues

[#1459](https://github.com/mrdoob/three.js/issues/1459) [#3225](https://github.com/mrdoob/three.js/issues/3225) [#15965](https://github.com/mrdoob/three.js/issues/15965)

#### `MWU-06` Unconditional per-frame updates in helper subclasses _(proposed optimization)_

Subclasses override updateMatrixWorld with extra work that runs unconditionally, e.g. PositionalAudio decomposing its matrix and updating the panner every frame even when not playing, or shadow camera projection matrices recomputed each frame instead of only when fov/far change.

`maintainer_confirmed` · owner: three_core · detect: static_lint · 2 issues

[#7690](https://github.com/mrdoob/three.js/issues/7690) [#15422](https://github.com/mrdoob/three.js/issues/15422)

### Animation and skinning

_29 observations → 10 distinct causes_

#### `AS-03` Inefficient keyframe interpolation hot path _(open, proposed optimization)_

Interpolation runs per-track/per-component through many small objects and references rather than cache-friendly batched vector math, with redundant multiplies in the cubic-spline basis and (historically) slow mixing. Any added indirection or abstraction in KeyframeTrack array access compounds this per-sample cost.

`maintainer_confirmed` · owner: three_core · detect: upstream_only · 5 issues

[#8552](https://github.com/mrdoob/three.js/issues/8552) [#13910](https://github.com/mrdoob/three.js/issues/13910) [#15258](https://github.com/mrdoob/three.js/issues/15258) [#16658](https://github.com/mrdoob/three.js/issues/16658) [#25518](https://github.com/mrdoob/three.js/issues/25518)

#### `AS-01` Update animations/skeletons for off-screen objects _(open)_

AnimationMixer and skeleton.update()/bone-texture upload run every frame for every animated object regardless of frustum culling, since SkinnedMesh is handled before the frustum check in projectObject(). With dozens of animated NPCs this dominates CPU frame time; skipping out-of-frustum updates cut 5-7ms to 0-1ms. Fixing it naively also broke shadow rendering, which needs skeletons updated even when off camera.

`measured` · owner: three_core · detect: design_review · 4 issues

[#5704](https://github.com/mrdoob/three.js/issues/5704) [#13807](https://github.com/mrdoob/three.js/issues/13807) [#13910](https://github.com/mrdoob/three.js/issues/13910) [#25914](https://github.com/mrdoob/three.js/issues/25914)

#### `AS-02` Morph target evaluation cost on CPU and GPU _(open)_

Morph normals must be interpolated per frame rather than reused statically, and per-morph normal attributes consume scarce vertex attribute slots (~16), limiting morph counts. Morph-aware raycasting adds per-vertex blending during intersection tests, and the WebGPU morph path is far costlier than WebGL, dominating GPU frame time.

`measured` · owner: three_core · detect: static_asset_check · 4 issues

[#1157](https://github.com/mrdoob/three.js/issues/1157) [#1878](https://github.com/mrdoob/three.js/issues/1878) [#16153](https://github.com/mrdoob/three.js/issues/16153) [#29980](https://github.com/mrdoob/three.js/issues/29980)

#### `AS-05` Per-skeleton CPU cost scales badly with bone count _(open)_

Bone matrix computation and animation evaluation are per-instance and per-bone on the CPU; ~500 animated bones saturate a core, and instancing draw calls gives little benefit because skeleton updates still dominate. Cost multiplies further when a character is split into several meshes sharing one skeleton.

`reporter_asserted` · owner: three_core · detect: runtime_profile_only · 4 issues

[#2329](https://github.com/mrdoob/three.js/issues/2329) [#13807](https://github.com/mrdoob/three.js/issues/13807) [#16060](https://github.com/mrdoob/three.js/issues/16060) [#25078](https://github.com/mrdoob/three.js/issues/25078)

#### `AS-07` Per-vertex GPU skinning blend work scales with influences _(open, proposed optimization)_

The vertex shader does four mat4*vec4 multiplies per vertex plus a separate skin-normal chunk that cannot reuse skinMatrix, and each additional bone influence adds a matrix fetch and weighted transform. Raising the weight limit from 4 to 8 doubles this work; texelFetch-based index/weight storage may be slower than attribute reads.

`speculative` · owner: three_core · detect: design_review · 4 issues

[#12127](https://github.com/mrdoob/three.js/issues/12127) [#15259](https://github.com/mrdoob/three.js/issues/15259) [#22376](https://github.com/mrdoob/three.js/issues/22376) [#26137](https://github.com/mrdoob/three.js/issues/26137)

#### `AS-04` Bone count exceeds vertex uniform limits

Each bone occupies four vec4 vertex-shader uniforms, so a few hundred bones exceed device MAX_VERTEX_UNIFORM_VECTORS (e.g. 254), causing shader link failure or forcing the slower bone-texture path. Without float texture support there is no fallback, so skinning simply fails on high-bone models.

`maintainer_confirmed` · owner: three_core · detect: static_asset_check · 2 issues

[#2106](https://github.com/mrdoob/three.js/issues/2106) [#13288](https://github.com/mrdoob/three.js/issues/13288)

#### `AS-08` Redundant load-time track validation and allocation _(proposed optimization)_

KeyframeTrack's constructor runs validate() and optimize() on every track, redundantly repeated by AnimationClip, burning CPU during scene load. Similarly, generating morphed/skinned static geometry allocates fresh objects and buffers per run instead of updating in place.

`reporter_asserted` · owner: three_core · detect: static_lint · 2 issues

[#14336](https://github.com/mrdoob/three.js/issues/14336) [#23951](https://github.com/mrdoob/three.js/issues/23951)

#### `AS-10` Speculative per-bone masking or per-bone mixers _(hypothetical)_

Proposed features such as restricting an animation to a subset of bones/vertices, or attaching a separate AnimationMixer to every bone, would add per-frame evaluation overhead in the skinning/weights path proportional to bone count. These are hypothetical designs rejected or cautioned against on cost grounds.

`speculative` · owner: three_core · detect: design_review · 2 issues

[#19871](https://github.com/mrdoob/three.js/issues/19871) [#21512](https://github.com/mrdoob/three.js/issues/21512)

#### `AS-06` World-space bone matrices lose float precision

Bone matrices are computed and uploaded in world space, so large world translations exhaust float precision in the bone texture and distort skinning. Fixing it in the shader by folding bindMatrixInverse into each bone matrix costs three extra matrix multiplies per vertex unless merged JS-side, and storing extra local matrices would multiply the per-frame bone texture upload.

`maintainer_confirmed` · owner: three_core · detect: design_review · 1 issues

[#13288](https://github.com/mrdoob/three.js/issues/13288)

#### `AS-09` Buggy JITCompile matrix cache disabled _(proposed optimization)_

THREE.Animation's JITCompile cached per-frame matrices to avoid re-interpolating quaternions, but it was buggy and had to be disabled, forfeiting that optimization and restoring full per-frame interpolation cost.

`maintainer_confirmed` · owner: three_core · detect: upstream_only · 1 issues

[#2106](https://github.com/mrdoob/three.js/issues/2106)

### Memory growth and disposal

_29 observations → 13 distinct causes_

#### `MLD-01` App never calls dispose() on removed geometries/materials/textures

three.js keeps strong references to geometries/materials in engine-internal maps (WeakMap is unusable since it isn't iterable), so GPU buffers and textures are only freed by explicit dispose(). Apps that create and discard objects each frame leak GPU memory indefinitely.

`maintainer_confirmed` · owner: app_developer · detect: static_lint · 4 issues

[#4324](https://github.com/mrdoob/three.js/issues/4324) [#16950](https://github.com/mrdoob/three.js/issues/16950) [#21568](https://github.com/mrdoob/three.js/issues/21568) [#27882](https://github.com/mrdoob/three.js/issues/27882)

#### `MLD-02` Replacing geometry attributes orphans old GPU buffers

setAttribute() overwriting an existing BufferAttribute leaves the previously uploaded WebGL buffer allocated with no disposal path, since dispose() only operates at geometry granularity. Repeated attribute swaps exhaust GPU memory.

`maintainer_confirmed` · owner: three_core · detect: static_lint · 3 issues

[#14730](https://github.com/mrdoob/three.js/issues/14730) [#29795](https://github.com/mrdoob/three.js/issues/29795) [#32903](https://github.com/mrdoob/three.js/issues/32903)

#### `MLD-03` Dispose event listeners accumulate unboundedly

Listeners for the 'dispose' event are re-created or re-attached per call/frame so removeEventListener never matches the stored function reference. The listener arrays grow without bound, costing time on every dispatch and degrading frame rate.

`maintainer_confirmed` · owner: three_core · detect: static_lint · 3 issues

[#26484](https://github.com/mrdoob/three.js/issues/26484) [#31866](https://github.com/mrdoob/three.js/issues/31866) [#32123](https://github.com/mrdoob/three.js/issues/32123)

#### `MLD-04` Renderer-internal caches retain removed objects

WebGLRenderLists reuse arrays across frames via a write index rather than resetting length, and Scene's __objectsAdded/__objectsRemoved queues are only drained by WebGLRenderer. Stale strong references to removed objects survive until overwritten, blocking GC.

`maintainer_confirmed` · owner: three_core · detect: runtime_profile_only · 3 issues

[#2266](https://github.com/mrdoob/three.js/issues/2266) [#7391](https://github.com/mrdoob/three.js/issues/7391) [#11471](https://github.com/mrdoob/three.js/issues/11471)

#### `MLD-08` Helpers and worker/WASM loaders lack real dispose paths _(open)_

TransformControls.dispose() only unbinds listeners and never disposes gizmo geometries/materials; DRACOLoader/Basis/OBJLoader2Parallel leave Web Workers running; MikkTSpace's global WASM instance grows its linear memory each call with no reinstantiate path. Resources persist for the lifetime of the page.

`reporter_asserted` · owner: three_core · detect: static_lint · 3 issues

[#15743](https://github.com/mrdoob/three.js/issues/15743) [#20958](https://github.com/mrdoob/three.js/issues/20958) [#33500](https://github.com/mrdoob/three.js/issues/33500)

#### `MLD-06` Global caches and registries retain assets with no eviction

THREE.Cache keys every loaded asset by URL with no eviction policy, and legacy global geometry/object/material library registries retain temporary geometries created for merging. These strong references prevent GC regardless of app-level disposal.

`measured` · owner: three_core · detect: design_review · 2 issues

[#2712](https://github.com/mrdoob/three.js/issues/2712) [#16798](https://github.com/mrdoob/three.js/issues/16798)

#### `MLD-05` Browser/host resources not reclaimed by GC

GL contexts are not released between page reloads in Chrome, and ImageBitmap instances require explicit .close() because GC alone does not free the backing resource on iOS. Memory grows across reloads or per-texture loads outside JS heap accounting.

`maintainer_confirmed` · owner: browser_or_driver · detect: upstream_only · 2 issues

[#1631](https://github.com/mrdoob/three.js/issues/1631) [#22652](https://github.com/mrdoob/three.js/issues/22652)

#### `MLD-10` Retained references via DOM/console keep objects alive

Event handlers on renderer.domElement keep the renderer alive unless the canvas is removed from the DOM, and console.warn called with an image object each frame retains it in the console buffer. Both grow memory outside of any dispose path.

`reporter_asserted` · owner: app_developer · detect: static_lint · 2 issues

[#7391](https://github.com/mrdoob/three.js/issues/7391) [#11378](https://github.com/mrdoob/three.js/issues/11378)

#### `MLD-11` CPU-side copies of attribute data retained after GPU upload _(proposed optimization)_

BufferAttribute arrays and .dynamic=true attributes stay resident in JS heap after being uploaded to the GPU, doubling memory for large models (hundreds of MB). Nulling the array after upload would free it.

`reporter_asserted` · owner: three_core · detect: runtime_profile_only · 2 issues

[#2354](https://github.com/mrdoob/three.js/issues/2354) [#25960](https://github.com/mrdoob/three.js/issues/25960)

#### `MLD-12` Duplicating shared data when cloning materials/geometry _(hypothetical)_

Cloning a material per mesh to obtain per-object uniforms also clones its textures, multiplying texture memory by clone count; deep-copying skinning arrays on geometry clone would similarly duplicate large buffers.

`reporter_asserted` · owner: app_developer · detect: static_lint · 2 issues

[#5878](https://github.com/mrdoob/three.js/issues/5878) [#14921](https://github.com/mrdoob/three.js/issues/14921)

#### `MLD-09` DevTools extension holds strong references to disposed renderers

The three-devtools Chrome extension instruments renderers/scenes into a strong-reference cache, so disposed WebGLRenderers can never be collected. A/B measurement showed heap growth to ~36.9MB over 1800 disposals with the extension vs ~9.3MB without.

`measured` · owner: addon · detect: upstream_only · 1 issues

[#18759](https://github.com/mrdoob/three.js/issues/18759)

#### `MLD-07` Renderer-owned internal resources outlive scene cleanup

WebGLBackground's skybox plane mesh/material and WebGLCubeUVMaps' PMREMGenerator (with its ping-pong render target) are cached on the renderer and only freed by renderer.dispose(). They persist across scene clean/repopulate cycles, accumulating one texture per cycle and inflating renderer.info.

`maintainer_confirmed` · owner: three_core · detect: design_review · 1 issues

[#30516](https://github.com/mrdoob/three.js/issues/30516)

#### `MLD-13` Object-per-vertex Geometry representation inflates heap _(proposed optimization)_

THREE.Geometry's JS object-per-vertex/face representation costs far more memory than typed-array BufferGeometry, exhausting device memory on iOS for large models.

`speculative` · owner: three_core · detect: static_lint · 1 issues

[#10340](https://github.com/mrdoob/three.js/issues/10340)

### Raycasting and picking

_26 observations → 7 distinct causes_

#### `RP-01` No spatial index; per-triangle linear raycast _(open)_

Mesh.raycast loops Ray/triangle math over every face of a geometry after only a bounding sphere/box early-out, so cost is O(triangles) per ray. Without a BVH/octree the same work repeats each frame and for each simultaneous cast, dominating CPU time on high-poly meshes.

`measured` · owner: three_core · detect: static_lint · 11 issues

[#966](https://github.com/mrdoob/three.js/issues/966) [#1711](https://github.com/mrdoob/three.js/issues/1711) [#2148](https://github.com/mrdoob/three.js/issues/2148) [#5366](https://github.com/mrdoob/three.js/issues/5366) [#6978](https://github.com/mrdoob/three.js/issues/6978) [#12767](https://github.com/mrdoob/three.js/issues/12767) [#12857](https://github.com/mrdoob/three.js/issues/12857) [#13807](https://github.com/mrdoob/three.js/issues/13807) [#13909](https://github.com/mrdoob/three.js/issues/13909) [#16153](https://github.com/mrdoob/three.js/issues/16153) [#21578](https://github.com/mrdoob/three.js/issues/21578)

#### `RP-02` Scene-graph traversal cost with no subtree pruning

Raycaster.intersectObjects recursively visits every descendant unconditionally, invoking per-object raycast/visibility and ancestor checks even when a parent bounding volume could cull the whole subtree. With thousands of children this costs >1ms per raycast before any geometry work.

`measured` · owner: three_core · detect: design_review · 6 issues

[#2155](https://github.com/mrdoob/three.js/issues/2155) [#4480](https://github.com/mrdoob/three.js/issues/4480) [#14700](https://github.com/mrdoob/three.js/issues/14700) [#18853](https://github.com/mrdoob/three.js/issues/18853) [#27702](https://github.com/mrdoob/three.js/issues/27702) [#28958](https://github.com/mrdoob/three.js/issues/28958)

#### `RP-03` Weak or missing bounding-volume early-out _(proposed optimization)_

Broad-phase rejection relies only on a bounding sphere; there is no ray/AABB test, no near/far interval rejection, and box tests use six plane checks. Distant or clearly-missed meshes therefore still undergo full per-triangle intersection.

`maintainer_confirmed` · owner: three_core · detect: design_review · 3 issues

[#2735](https://github.com/mrdoob/three.js/issues/2735) [#22102](https://github.com/mrdoob/three.js/issues/22102) [#25480](https://github.com/mrdoob/three.js/issues/25480)

#### `RP-05` One object per data point instead of batching

Because point/particle systems lacked raycast support, apps create a proxy Mesh per particle, so picking scales linearly with particle count with no spatial partitioning and per-object overhead dominates past ~20k objects.

`reporter_asserted` · owner: app_developer · detect: design_review · 2 issues

[#911](https://github.com/mrdoob/three.js/issues/911) [#3492](https://github.com/mrdoob/three.js/issues/3492)

#### `RP-06` Dense CPU raycasting instead of GPU picking

Doing per-pixel or per-frame CPU raycasts over the whole scene (e.g. 500x500 rays) multiplies the linear intersection cost by the ray count, taking hundreds of seconds; an off-screen id-color render pass on demand avoids it.

`reporter_asserted` · owner: app_developer · detect: design_review · 2 issues

[#244](https://github.com/mrdoob/three.js/issues/244) [#1531](https://github.com/mrdoob/three.js/issues/1531)

#### `RP-04` Per-frame bounding-volume recomputation for moving geometry

Keeping AABBs/spheres valid for animated or transformed objects requires computeBoundingBox/computeBoundingSphere, which is O(vertices) per object per frame; degenerate bounds (e.g. instances translated to Infinity) further destroy pruning effectiveness.

`maintainer_confirmed` · owner: app_developer · detect: runtime_profile_only · 1 issues

[#8432](https://github.com/mrdoob/three.js/issues/8432)

#### `RP-07` Building the acceleration structure is itself expensive

Constructing an octree/BVH over a large geometry costs significant CPU at load time, forcing offloading to a web worker; the build cost can outweigh the query savings for short-lived or frequently-rebuilt geometry.

`reporter_asserted` · owner: app_developer · detect: runtime_profile_only · 1 issues

[#12857](https://github.com/mrdoob/three.js/issues/12857)

### Shadow maps

_24 observations → 10 distinct causes_

#### `SM-01` Per-fragment PCF/PCSS sampling cost scales with taps _(open)_

Soft shadow filtering is done manually in the fragment shader with many texture fetches per fragment (3x3/16-tap PCF, PCSS blocker search), plus manual bilinear interpolation in the lerp variants. This makes the fragment shader very expensive, especially on mobile/VR GPUs.

`maintainer_confirmed` · owner: three_core · detect: runtime_profile_only · 7 issues

[#1509](https://github.com/mrdoob/three.js/issues/1509) [#1927](https://github.com/mrdoob/three.js/issues/1927) [#8127](https://github.com/mrdoob/three.js/issues/8127) [#14048](https://github.com/mrdoob/three.js/issues/14048) [#14161](https://github.com/mrdoob/three.js/issues/14161) [#15577](https://github.com/mrdoob/three.js/issues/15577) [#32779](https://github.com/mrdoob/three.js/issues/32779)

#### `SM-02` Re-render full casting scene per light every frame

Each shadow-casting light triggers a full depth pass over all casting geometry every frame, even when nothing moved. Cost scales with light count and caster count, and dominates frame time on mobile.

`maintainer_confirmed` · owner: three_core · detect: design_review · 5 issues

[#1055](https://github.com/mrdoob/three.js/issues/1055) [#5180](https://github.com/mrdoob/three.js/issues/5180) [#5536](https://github.com/mrdoob/three.js/issues/5536) [#6814](https://github.com/mrdoob/three.js/issues/6814) [#9500](https://github.com/mrdoob/three.js/issues/9500)

#### `SM-03` Oversized or untight shadow frusta and map sizes

Shadow map size is not adequately clamped (500000x500000 targets, multiplied by 4 for PointLight) and shadow camera far/frustum defaults are far larger than needed, so resolution is spread over wasted area and huge render targets are allocated.

`maintainer_confirmed` · owner: three_core · detect: static_lint · 3 issues

[#7690](https://github.com/mrdoob/three.js/issues/7690) [#14341](https://github.com/mrdoob/three.js/issues/14341) [#14414](https://github.com/mrdoob/three.js/issues/14414)

#### `SM-04` RGBA-packed depth blocks hardware filtering and blur

Shadow depth is stored RGBA-encoded rather than as a float/depth texture, so it cannot be hardware-interpolated or blurred directly, forcing manual shader filtering and extra render passes. Float shadow targets are rejected as too bandwidth-heavy.

`maintainer_confirmed` · owner: three_core · detect: design_review · 2 issues

[#1927](https://github.com/mrdoob/three.js/issues/1927) [#2159](https://github.com/mrdoob/three.js/issues/2159)

#### `SM-05` Per-light shadow samplers exhaust texture units and varyings

Every shadow-casting light binds its own sampler, and sampler/varying arrays are sized by total light count rather than lights with castShadow, exhausting MAX_TEXTURE_IMAGE_UNITS and varying registers. Shaders fail to compile/link beyond ~12 lights.

`reporter_asserted` · owner: three_core · detect: static_asset_check · 2 issues

[#8463](https://github.com/mrdoob/three.js/issues/8463) [#11035](https://github.com/mrdoob/three.js/issues/11035)

#### `SM-06` Regression from shadow/material handling PR

Changes in PR #23559 to shadow and material handling introduced a measurable performance regression; reverting restored prior behavior.

`maintainer_confirmed` · owner: three_core · detect: runtime_profile_only · 1 issues

[#23649](https://github.com/mrdoob/three.js/issues/23649)

#### `SM-07` Per-object state checks during shadow pass

renderShadow evaluates renderObject.needsUpdate (material/cache-key comparisons) for every object every frame in the shadow pass, adding CPU overhead proportional to object count.

`reporter_asserted` · owner: three_core · detect: upstream_only · 1 issues

[#30065](https://github.com/mrdoob/three.js/issues/30065)

#### `SM-08` Scissor state leaks into shadow depth pass

The scissor test remains enabled during the shadow depth pass, corrupting the shadow map; the workaround requires an entire extra discarded full-scene render each frame.

`reporter_asserted` · owner: three_core · detect: static_lint · 1 issues

[#3532](https://github.com/mrdoob/three.js/issues/3532)

#### `SM-09` Safari/Cg shader compiler chokes on shadow shader

Safari's Cg compiler fails on the shadow-map shader ('marking a sampler that is not a scalar'), crashing or collapsing to ~1 FPS with shadowMapSoft while other browsers are fine.

`reporter_asserted` · owner: browser_or_driver · detect: upstream_only · 1 issues

[#2023](https://github.com/mrdoob/three.js/issues/2023)

#### `SM-10` Translucent shadows need extra per-light buffers and passes _(open, hypothetical)_

True translucent/colored shadow maps would require additional color and translucency buffers plus extra passes per light, asserted too costly; dithered discard in the depth shader is proposed as a cheap approximation.

`speculative` · owner: three_core · detect: design_review · 1 issues

[#10600](https://github.com/mrdoob/three.js/issues/10600)

### Scene-graph scale

_22 observations → 7 distinct causes_

#### `SGS-02` Per-frame full scene-graph traversal scales with object count _(open)_

Rendering, culling, and effect passes recursively walk every node each frame (projectObject, render-list building, material overrides, LOD flag resets), so CPU cost grows linearly with node count even when the visible set is small or a subtree's layer doesn't match. Multiple traversals per frame multiply this cost.

`reporter_asserted` · owner: three_core · detect: runtime_profile_only · 7 issues

[#507](https://github.com/mrdoob/three.js/issues/507) [#14476](https://github.com/mrdoob/three.js/issues/14476) [#14577](https://github.com/mrdoob/three.js/issues/14577) [#14664](https://github.com/mrdoob/three.js/issues/14664) [#18937](https://github.com/mrdoob/three.js/issues/18937) [#21387](https://github.com/mrdoob/three.js/issues/21387) [#26738](https://github.com/mrdoob/three.js/issues/26738)

#### `SGS-01` Excessive triangle/draw-call counts from generated geometry

High-segment or heavily tessellated geometry (1000x1000 planes, per-glyph shape triangulation) produces millions of triangles, exhausting the JS heap during construction and exceeding GPU budget. Thousands of individually drawn primitives also exceed renderer throughput.

`maintainer_confirmed` · owner: app_developer · detect: static_asset_check · 5 issues

[#325](https://github.com/mrdoob/three.js/issues/325) [#368](https://github.com/mrdoob/three.js/issues/368) [#1807](https://github.com/mrdoob/three.js/issues/1807) [#4590](https://github.com/mrdoob/three.js/issues/4590) [#4746](https://github.com/mrdoob/three.js/issues/4746)

#### `SGS-03` One Object3D per instance inflates memory and update cost _(proposed optimization)_

Wrapping every instance/batch member/pivot in a full Object3D node costs per-object memory plus matrix and matrixWorld updates and traversal, which is prohibitive at ~100k instances. Preallocated optional properties on every instance further inflate object size and pollute cache when polled each frame.

`maintainer_confirmed` · owner: three_core · detect: design_review · 4 issues

[#5171](https://github.com/mrdoob/three.js/issues/5171) [#6987](https://github.com/mrdoob/three.js/issues/6987) [#15965](https://github.com/mrdoob/three.js/issues/15965) [#22376](https://github.com/mrdoob/three.js/issues/22376)

#### `SGS-04` Linear child search makes add/remove quadratic

Object3D.remove() does an indexOf scan plus Array.splice per child, so removing or replacing all children is O(n^2). A replaceAt/index-based path would avoid both the scan and the splice shift.

`reporter_asserted` · owner: three_core · detect: static_lint · 2 issues

[#8325](https://github.com/mrdoob/three.js/issues/8325) [#20414](https://github.com/mrdoob/three.js/issues/20414)

#### `SGS-06` Object-based Geometry slower and heavier than BufferGeometry _(proposed optimization)_

THREE.Geometry stores vertices/faces as JS objects rather than typed arrays, costing far more memory and per-frame conversion work with many objects or large meshes.

`reporter_asserted` · owner: three_core · detect: static_lint · 2 issues

[#5268](https://github.com/mrdoob/three.js/issues/5268) [#7094](https://github.com/mrdoob/three.js/issues/7094)

#### `SGS-05` Unaccelerated raycasting scans every mesh

A single raycast walks all scene objects and their triangles with no spatial acceleration structure, so thousands of loaded tiles push one pick to ~25-35ms.

`measured` · owner: three_core · detect: design_review · 1 issues

[#27702](https://github.com/mrdoob/three.js/issues/27702)

#### `SGS-07` UUID generation per object multiplies allocation overhead

Every Object3D, Geometry, Material and BufferAttribute eagerly generates a uuid string at construction, so creation cost and memory scale with the total count of all such entities.

`reporter_asserted` · owner: three_core · detect: design_review · 1 issues

[#13069](https://github.com/mrdoob/three.js/issues/13069)

### Instancing and batching limits

_22 observations → 9 distinct causes_

#### `IBL-03` Unmerged unique objects cause per-object draw calls _(proposed optimization)_

Each distinct mesh with unique geometry/material issues its own draw call and state change, so scenes with thousands of objects become CPU/driver-bound. Merging or instancing reduces calls but loses per-object identity and requires manual CPU-side packing/culling.

`reporter_asserted` · owner: app_developer · detect: design_review · 6 issues

[#1820](https://github.com/mrdoob/three.js/issues/1820) [#10927](https://github.com/mrdoob/three.js/issues/10927) [#11256](https://github.com/mrdoob/three.js/issues/11256) [#13995](https://github.com/mrdoob/three.js/issues/13995) [#15936](https://github.com/mrdoob/three.js/issues/15936) [#22376](https://github.com/mrdoob/three.js/issues/22376)

#### `IBL-04` No per-instance culling or sorting causes overdraw _(open, proposed optimization)_

InstancedMesh always submits every instance to the vertex shader with no frustum culling and no front-to-back or back-to-front ordering. This wastes vertex work, produces fragment-bound overdraw for opaque instances, and sorts transparency incorrectly; only shrinking count truly narrows the draw range.

`maintainer_confirmed` · owner: three_core · detect: design_review · 3 issues

[#22102](https://github.com/mrdoob/three.js/issues/22102) [#27170](https://github.com/mrdoob/three.js/issues/27170) [#30352](https://github.com/mrdoob/three.js/issues/30352)

#### `IBL-02` Instancing implementation slower than native paths _(open)_

BatchedMesh emulates instancing by repeating multiDraw parameters rather than calling multiDraw*Instanced, measured ~1.5-2x slower; InstancedBufferGeometry shows no gain over drawRange/groups for point clouds, and LineSegments2 instancing is slower than native gl.LINES for 1px lines.

`measured` · owner: three_core · detect: runtime_profile_only · 2 issues

[#29018](https://github.com/mrdoob/three.js/issues/29018) [#31935](https://github.com/mrdoob/three.js/issues/31935)

#### `IBL-01` Multi-material meshes split geometry per material

MeshFaceMaterial / per-face material indices force the engine to split faces into one geometry group per material, turning a single mesh into several geometries and draw calls. Instanced/batched paths likewise require one shared shader program, so per-instance materials are impossible without breaking draw-call reduction.

`maintainer_confirmed` · owner: three_core · detect: static_asset_check · 2 issues

[#4386](https://github.com/mrdoob/three.js/issues/4386) [#5268](https://github.com/mrdoob/three.js/issues/5268)

#### `IBL-05` BatchedMesh buffers cannot be resized or freed _(proposed optimization)_

BatchedMesh lacks geometry deletion and buffer growth APIs, so dynamic add/remove fragments or exhausts the attribute buffers. The workaround rebuilds the whole batch, retaining all source geometry and transforms in memory and re-uploading every matrix/color texture, instead of an internal block copy.

`reporter_asserted` · owner: three_core · detect: design_review · 2 issues

[#29463](https://github.com/mrdoob/three.js/issues/29463) [#29464](https://github.com/mrdoob/three.js/issues/29464)

#### `IBL-06` Instancing limited to Mesh and excluded from bundles _(open, proposed optimization)_

InstancedMesh extends Mesh, so SkinnedMesh, Line and Points cannot use GPU instancing and fall back to separate draw calls. InstancedMesh is also unsupported inside BundleGroup, so per-frame draw command encoding is not amortized.

`reporter_asserted` · owner: three_core · detect: design_review · 2 issues

[#25078](https://github.com/mrdoob/three.js/issues/25078) [#31815](https://github.com/mrdoob/three.js/issues/31815)

#### `IBL-08` Vertex attribute slots limit per-instance properties _(hypothetical)_

Each per-instance property consumes one of the ~16 guaranteed vertex attribute slots, already largely used by instance transform, morph targets and mesh attributes. This caps how much per-instance variation is expressible.

`maintainer_confirmed` · owner: browser_or_driver · detect: design_review · 2 issues

[#20481](https://github.com/mrdoob/three.js/issues/20481) [#33367](https://github.com/mrdoob/three.js/issues/33367)

#### `IBL-07` Instance data texture indirection costs VRAM and shader time _(open, proposed optimization)_

Per-instance matrices are stored in a texture that is allocated and sampled even when all matrices are identity, wasting VRAM and adding texelFetch cost per vertex. BatchedMesh adds a further indirection texture indexed by gl_DrawID when instancing is enabled.

`speculative` · owner: three_core · detect: design_review · 2 issues

[#28776](https://github.com/mrdoob/three.js/issues/28776) [#29036](https://github.com/mrdoob/three.js/issues/29036)

#### `IBL-09` Per-instance CPU update cost per frame _(hypothetical)_

Animating via InstancedMesh requires lerping and uploading one matrix and one color per instance every frame (e.g. 1000 each), versus a handful of attribute swaps with morph targets. The CPU-side transform work and buffer upload dominate.

`reporter_asserted` · owner: app_developer · detect: design_review · 1 issues

[#20057](https://github.com/mrdoob/three.js/issues/20057)

### Transparency and sorting

_21 observations → 8 distinct causes_

#### `TS-01` Per-frame CPU sorting of render lists

Every frame the renderer runs Array.prototype.sort over the opaque/transparent render lists with a JS comparator, ignoring that the order is nearly sorted between frames. The comparator work plus array allocation shows up as measurable CPU self time and scales badly with object count.

`measured` · owner: three_core · detect: design_review · 5 issues

[#953](https://github.com/mrdoob/three.js/issues/953) [#4670](https://github.com/mrdoob/three.js/issues/4670) [#9525](https://github.com/mrdoob/three.js/issues/9525) [#32837](https://github.com/mrdoob/three.js/issues/32837) [#32916](https://github.com/mrdoob/three.js/issues/32916)

#### `TS-02` Per-particle/per-vertex CPU depth sorting

sortParticles / PointCloud vertex sorting depth-sorts every particle on the CPU each frame and re-uploads the vertex buffers, which dominates frame time at large particle counts and is incompatible with BufferGeometry. It was eventually removed, at the cost of incorrect sprite ordering.

`maintainer_confirmed` · owner: three_core · detect: static_lint · 5 issues

[#203](https://github.com/mrdoob/three.js/issues/203) [#375](https://github.com/mrdoob/three.js/issues/375) [#2730](https://github.com/mrdoob/three.js/issues/2730) [#5668](https://github.com/mrdoob/three.js/issues/5668) [#6461](https://github.com/mrdoob/three.js/issues/6461)

#### `TS-03` Sorted draw order defeats batching and doubles passes _(proposed optimization)_

Transparent objects must be kept in a separately z-sorted list, so they cannot be grouped by shader/material, and double-sided transparent materials are split into back-face then front-face passes, doubling draw calls.

`maintainer_confirmed` · owner: three_core · detect: design_review · 3 issues

[#4221](https://github.com/mrdoob/three.js/issues/4221) [#23408](https://github.com/mrdoob/three.js/issues/23408) [#24711](https://github.com/mrdoob/three.js/issues/24711)

#### `TS-05` Per-triangle sorting too costly, so only per-object sorting _(hypothetical)_

Correct transparency needs per-triangle depth sorting (and even splitting/intersection tests for painter's algorithm), which would have to run in JS and rewrite WebGL index buffers every frame. three.js therefore sorts only per object, producing self-transparency and cross-object ordering artifacts.

`maintainer_confirmed` · owner: three_core · detect: design_review · 3 issues

[#154](https://github.com/mrdoob/three.js/issues/154) [#299](https://github.com/mrdoob/three.js/issues/299) [#2476](https://github.com/mrdoob/three.js/issues/2476)

#### `TS-06` Order-independent transparency costs bandwidth and fill _(open, proposed optimization)_

Weighted-blended OIT removes the need to sort but requires floating-point accumulation/revealage buffers and extra passes, making it slow and needing per-scene parameter tuning.

`reporter_asserted` · owner: three_core · detect: design_review · 2 issues

[#9977](https://github.com/mrdoob/three.js/issues/9977) [#14051](https://github.com/mrdoob/three.js/issues/14051)

#### `TS-04` Unstable engine sort causes per-frame reordering flicker

V8's Array.prototype.sort is unstable for arrays longer than 10, so objects at identical depths swap order between frames and flicker; adding object.id as a tie-breaker fixes it with negligible measured cost.

`upstream_bug` · owner: browser_or_driver · detect: upstream_only · 1 issues

[#2568](https://github.com/mrdoob/three.js/issues/2568)

#### `TS-07` Expensive user comparator recomputing bounds per comparison

A custom sort callback that calls Box3.setFromObject and allocates a new Vector3 per comparison performs O(n log n) bounding-box recomputation and garbage per frame, dropping frames.

`reporter_asserted` · owner: app_developer · detect: static_lint · 1 issues

[#13889](https://github.com/mrdoob/three.js/issues/13889)

#### `TS-08` sortObjects triggers indirect-texture re-upload each frame _(open)_

With sortObjects enabled the reordered draw list forces texSubImage2D updates of the indirect draw texture every frame, and that upload dominates frame time (30fps to 9fps).

`reporter_asserted` · owner: three_core · detect: runtime_profile_only · 1 issues

[#28776](https://github.com/mrdoob/three.js/issues/28776)

### Bundle size and load time

_20 observations → 9 distinct causes_

#### `BSLT-02` Barrel/flat build has no module boundaries

Importing from the src/Three.js export catalog or the flat prebuilt bundle exposes every module to the bundler, so `sideEffects: false` cannot skip files and any import drags in everything. Direct per-module imports measured ~36Kb vs ~687Kb for the catalog import.

`maintainer_confirmed` · owner: three_core · detect: static_asset_check · 3 issues

[#9562](https://github.com/mrdoob/three.js/issues/9562) [#9584](https://github.com/mrdoob/three.js/issues/9584) [#24199](https://github.com/mrdoob/three.js/issues/24199)

#### `BSLT-03` instanceof and lookup tables create static class references

`instanceof Geometry` / `instanceof PointsMaterial` checks in WebGLRenderer, plus registry objects like ObjectLoader's `Geometries` map and `Material.fromType`, statically reference every concrete class. The bundler must therefore include all geometries/materials even if unused. Replaced in core by `.isFoo` boolean duck-typing flags.

`maintainer_confirmed` · owner: three_core · detect: static_asset_check · 3 issues

[#4776](https://github.com/mrdoob/three.js/issues/4776) [#19986](https://github.com/mrdoob/three.js/issues/19986) [#24199](https://github.com/mrdoob/three.js/issues/24199)

#### `BSLT-04` Non-ES6 prototype-based classes are opaque to bundlers

Classes still written as prototype-based constructors or wrapped in IIFEs (Curve, Raycaster, InterleavedBuffer) and self-executing factory functions instantiating temporaries cannot be statically analyzed, so bundlers keep them whole. Class methods likewise cannot be dropped or renamed because JS permits dynamic member access.

`reporter_asserted` · owner: three_core · detect: static_lint · 3 issues

[#9584](https://github.com/mrdoob/three.js/issues/9584) [#11552](https://github.com/mrdoob/three.js/issues/11552) [#19986](https://github.com/mrdoob/three.js/issues/19986)

#### `BSLT-07` Global THREE namespace blocks minification and inlining _(proposed optimization)_

Property references on the global THREE namespace (and CommonJS wrappers that leave property names intact) cannot be renamed by Closure Compiler, inflating delivered bytes. Unrenamed namespaced lookups and non-inlined calls also cost runtime versus Closure advanced-mode renaming, constant folding and inlining.

`reporter_asserted` · owner: three_core · detect: static_asset_check · 3 issues

[#341](https://github.com/mrdoob/three.js/issues/341) [#4776](https://github.com/mrdoob/three.js/issues/4776) [#19986](https://github.com/mrdoob/three.js/issues/19986)

#### `BSLT-01` Module-scope side effects defeat tree-shaking

Top-level statements such as `const _v = new Vector3()`, ShaderLib/UniformsLib object literals, MathUtils `_lut` loops, DataUtils tables, prototype assignments, static class properties defined outside the class body, and Object.defineProperty deprecation shims in Three.Legacy.js are treated as potentially impure by Rollup/webpack. Impure module scope forces the bundler to retain the module and its whole dependency graph. Fixing requires `/*@__PURE__*/` annotations or moving initialization inside functions/class bodies.

`measured` · owner: three_core · detect: static_lint · 2 issues

[#19986](https://github.com/mrdoob/three.js/issues/19986) [#24199](https://github.com/mrdoob/three.js/issues/24199)

#### `BSLT-05` Hard-wired subsystem instantiation in WebGLRenderer

WebGLRenderer directly constructs WebXRManager, WebGLState and WebGLAnimation, and webpack cannot tree-shake its static class properties. These dependencies are therefore always retained even for apps that never use XR or the renderer path in question.

`maintainer_confirmed` · owner: three_core · detect: static_asset_check · 2 issues

[#19986](https://github.com/mrdoob/three.js/issues/19986) [#24199](https://github.com/mrdoob/three.js/issues/24199)

#### `BSLT-06` Shipping all examples and shader source in one build

Bundling every example loader (including DRACO/WASM dependencies) and large inlined GLSL shader strings into a single artifact inflates page weight. The extra bytes cost download plus JS parse and CPU time at boot, notably on mobile.

`reporter_asserted` · owner: three_core · detect: static_asset_check · 2 issues

[#9562](https://github.com/mrdoob/three.js/issues/9562) [#16440](https://github.com/mrdoob/three.js/issues/16440)

#### `BSLT-08` Bundler re-parses the monolithic build every rebuild

Browserify parses the entire large three.js file on each change, adding seconds to every incremental rebuild; marking it with `--noparse=three` roughly halves the time. The cost is proportional to the single-file size of the distribution.

`reporter_asserted` · owner: app_developer · detect: static_asset_check · 1 issues

[#4776](https://github.com/mrdoob/three.js/issues/4776)

#### `BSLT-09` Many native ES module files add request latency _(hypothetical)_

Serving three.js as hundreds of unbundled ES2015 modules incurs per-file request and latency overhead at load compared to a single bundled file, even over HTTP/2. Raised as a hypothetical tradeoff against tree-shaking benefits.

`speculative` · owner: app_developer · detect: static_asset_check · 1 issues

[#9562](https://github.com/mrdoob/three.js/issues/9562)

### CPU/GPU synchronisation stalls

_14 observations → 6 distinct causes_

#### `CGSS-01` Synchronous readPixels readback blocks main thread

readRenderTargetPixels/gl.readPixels forces the CPU to wait until the GPU has finished rendering the target, serializing the pipeline. Cost scales with region size and pixel density, and can block for tens of milliseconds per call. Common in GPU picking, texture export and cubemap decoding paths.

`measured` · owner: three_core · detect: static_lint · 6 issues

[#966](https://github.com/mrdoob/three.js/issues/966) [#20530](https://github.com/mrdoob/three.js/issues/20530) [#22779](https://github.com/mrdoob/three.js/issues/22779) [#27171](https://github.com/mrdoob/three.js/issues/27171) [#27339](https://github.com/mrdoob/three.js/issues/27339) [#28389](https://github.com/mrdoob/three.js/issues/28389)

#### `CGSS-02` Driver/ANGLE fallbacks force hidden CPU readback

On D3D11/ANGLE some operations are not hardware accelerated: stencil blit, texSubImage2D from a PBO when fast buffer-to-texture copy is unsupported, compressedTexSubImage2D, and transform feedback/PBO paths. These fall back to software copies that implicitly synchronize CPU and GPU.

`upstream_bug` · owner: browser_or_driver · detect: upstream_only · 3 issues

[#26143](https://github.com/mrdoob/three.js/issues/26143) [#30184](https://github.com/mrdoob/three.js/issues/30184) [#30185](https://github.com/mrdoob/three.js/issues/30185)

#### `CGSS-04` Resource uploads interleaved with draws stall pipeline _(proposed optimization)_

Textures and dynamic buffers are created/uploaded in the same frame they are drawn, with no upload scheduler, so the driver must synchronize before the dependent draw. Deferring uploads or staging via PBOs would make transfers asynchronous.

`reporter_asserted` · owner: three_core · detect: runtime_profile_only · 2 issues

[#5948](https://github.com/mrdoob/three.js/issues/5948) [#30184](https://github.com/mrdoob/three.js/issues/30184)

#### `CGSS-03` Explicit gl.finish blocks until GPU idle

Calling gl.finish() every frame forces the CPU to wait for all queued GPU work to complete, destroying CPU/GPU overlap. Removing the call restored framerates.

`measured` · owner: three_core · detect: static_lint · 1 issues

[#228](https://github.com/mrdoob/three.js/issues/228)

#### `CGSS-05` Per-pass queue submits instead of batched encoder _(open, proposed optimization)_

Each renderer.compute() call issues its own queue submit rather than encoding all passes into a single command encoder submission, adding per-submit synchronization and driver overhead.

`reporter_asserted` · owner: three_core · detect: design_review · 1 issues

[#32735](https://github.com/mrdoob/three.js/issues/32735)

#### `CGSS-07` Cross-API framebuffer copy to bridge WebGL and WebGPU _(hypothetical)_

Running WebGL and WebGPU contexts on one page to bridge XR would require copying the full framebuffer between contexts each frame, an inherently synchronizing transfer.

`speculative` · owner: browser_or_driver · detect: design_review · 1 issues

[#28968](https://github.com/mrdoob/three.js/issues/28968)

### WebGPU backend overhead

_13 observations → 8 distinct causes_

#### `WBO-02` Pipeline/bind group caches invalidated or missed, forcing recreation _(open, proposed optimization)_

Pipeline and bind group caches are cleared each frame or keyed incorrectly (bindingsReference receiving a BindGroup instead of a Bindings array), so GPU pipelines, bind group layouts and bind groups are recreated every frame instead of reused. Each createBindGroupLayout/createBindGroup is an expensive driver call; fixing the key drops ~120 calls to ~11 and commenting out the clear drops CPU to 1-2%.

`reporter_asserted` · owner: three_core · detect: runtime_profile_only · 3 issues

[#25947](https://github.com/mrdoob/three.js/issues/25947) [#26266](https://github.com/mrdoob/three.js/issues/26266) [#31674](https://github.com/mrdoob/three.js/issues/31674)

#### `WBO-01` Per-frame node/material cache key recomputation _(open, proposed optimization)_

getCacheKey is regenerated every frame for nodes/materials even when nothing versioned changed, and NodeBuilder caches keyed on Material/Geometry instances rather than shader-relevant state. This dominates per-frame CPU and causes duplicate shader compilation for materials differing only by a uniform such as color.

`measured` · owner: three_core · detect: runtime_profile_only · 2 issues

[#26673](https://github.com/mrdoob/three.js/issues/26673) [#27895](https://github.com/mrdoob/three.js/issues/27895)

#### `WBO-03` No draw/upload coalescing: per-object buffers and draws _(open, proposed optimization)_

The backend allocates one render bundle, bind group and GPU buffer per object and issues thousands of writeBuffer calls per frame instead of a single coalesced upload with dynamic offsets. Lack of multiDraw support additionally splits batched geometry into many individual draw calls, multiplying per-draw CPU validation overhead.

`maintainer_confirmed` · owner: three_core · detect: design_review · 2 issues

[#29075](https://github.com/mrdoob/three.js/issues/29075) [#29580](https://github.com/mrdoob/three.js/issues/29580)

#### `WBO-07` WebGL2 fallback emulation of WebGPU-only features _(hypothetical)_

The WebGPU renderer's WebGL2 backend emulates storage buffers and compute shading using double array buffers and PBOs. This emulation adds indirection and readback stalls that run substantially slower than the native WebGPU storage/compute path.

`reporter_asserted` · owner: three_core · detect: design_review · 2 issues

[#28247](https://github.com/mrdoob/three.js/issues/28247) [#29899](https://github.com/mrdoob/three.js/issues/29899)

#### `WBO-04` One queue submit and command encoder per render call _(open)_

Every renderer.render() creates a command encoder, begins a render pass, finishes and calls device.queue.submit(). The submit itself dominates ~70% of execution time, so multi-pass/multi-view applications pay repeated fixed submission costs that could be batched into a single submit.

`measured` · owner: three_core · detect: design_review · 1 issues

[#33821](https://github.com/mrdoob/three.js/issues/33821)

#### `WBO-05` Per-camera render context creation repeated on cloned cameras

Each camera instance owns a render context holding view-space uniforms and lighting state, so a new camera triggers one-time creation of internal GPU-side entities. Cloning the camera every frame makes that one-time cost recur per frame.

`maintainer_confirmed` · owner: app_developer · detect: static_lint · 1 issues

[#32020](https://github.com/mrdoob/three.js/issues/32020)

#### `WBO-06` Full typed-array copy into mapped buffer range on creation

GPU buffer creation copies the entire attribute typed array into buffer.getMappedRange() via .set(), an O(n) CPU memcpy that dominates WebGPURenderer.compute() time for large buffers.

`reporter_asserted` · owner: three_core · detect: design_review · 1 issues

[#25295](https://github.com/mrdoob/three.js/issues/25295)

#### `WBO-08` WebGL driver indirection versus native WebGPU API _(hypothetical)_

WebGL's indirect driver API is claimed to impose extra validation and translation cost on program loading, texture/geometry uploads and draw calls relative to an explicit WebGPU backend. This is a motivating hypothesis rather than a measured cost.

`speculative` · owner: browser_or_driver · detect: runtime_profile_only · 1 issues

[#15936](https://github.com/mrdoob/three.js/issues/15936)

### Fill rate, overdraw and resolution

_6 observations → 4 distinct causes_

#### `FOR-01` Overdraw from many overlapping transparent/expanded primitives

Large numbers of overlapping particle sprites or hugely widened line quads cover the same pixels many times, so each pixel is shaded repeatedly. Rendering becomes fragment-shader/fill-rate bound, worsening at shallow camera angles or large widths.

`maintainer_confirmed` · owner: app_developer · detect: runtime_profile_only · 2 issues

[#30344](https://github.com/mrdoob/three.js/issues/30344) [#32001](https://github.com/mrdoob/three.js/issues/32001)

#### `FOR-02` DoubleSide disables backface culling, doubling fragments

Setting side = DoubleSide (or object-level doubleSided on a whole model) stops backface culling, so hidden back faces are rasterized and shaded too. Per-material sidedness avoids this but introduces extra GL state changes and shader program permutations.

`maintainer_confirmed` · owner: app_developer · detect: static_lint · 2 issues

[#2280](https://github.com/mrdoob/three.js/issues/2280) [#24635](https://github.com/mrdoob/three.js/issues/24635)

#### `FOR-03` Render at reduced resolution and upscale _(proposed optimization)_

Full-resolution rasterization costs proportional per-pixel work, which dominates on mobile/weak GPUs. Rendering to a smaller canvas or fixed-size render target and CSS/hardware-upscaling cuts fragment count substantially.

`reporter_asserted` · owner: app_developer · detect: design_review · 1 issues

[#516](https://github.com/mrdoob/three.js/issues/516)

#### `FOR-04` Expensive per-fragment shader work on mobile GPUs _(proposed optimization)_

alphaTest, in-shader matrix math for camera-facing sprites, and function calls add per-fragment ALU cost that mobile GPUs handle poorly. This multiplies with every covered pixel, compounding fill-rate limits.

`speculative` · owner: three_core · detect: runtime_profile_only · 1 issues

[#1419](https://github.com/mrdoob/three.js/issues/1419)

### Worker offloading

_5 observations → 3 distinct causes_

#### `WO-01` Serialize/copy geometry across worker boundary

Data sent between worker and main thread is structured-cloned rather than transferred, causing a deep copy of large typed arrays. Cloning also strips prototypes/methods, so geometry objects must be reconstructed on the main thread, erasing the offloading benefit.

`reporter_asserted` · owner: three_core · detect: static_lint · 2 issues

[#906](https://github.com/mrdoob/three.js/issues/906) [#9756](https://github.com/mrdoob/three.js/issues/9756)

#### `WO-02` Worker startup and decoder duplication cost _(open)_

Spawning a worker and loading three.js/decoder code into it costs hundreds of milliseconds, dominating total time for small models. Multiple loader instances each allocate their own WorkerPool instead of sharing one, multiplying this startup cost.

`reporter_asserted` · owner: three_core · detect: static_lint · 2 issues

[#9756](https://github.com/mrdoob/three.js/issues/9756) [#20958](https://github.com/mrdoob/three.js/issues/20958)

#### `WO-03` In-worker fetching serializes download with parsing

Performing resource fetches inside the worker thread couples network I/O to the worker's parse loop, so downloads no longer pipeline with main-thread work or with each other, increasing wall-clock load time.

`reporter_asserted` · owner: app_developer · detect: static_lint · 1 issues

[#11746](https://github.com/mrdoob/three.js/issues/11746)

### CPU rasteriser backends

_2 observations → 2 distinct causes_

#### `CRB-01` ParticleCanvasMaterial per-particle canvas draw overhead

ParticleCanvasMaterial invokes a per-particle JS draw callback with canvas 2D path/state changes instead of blitting a cached sprite image, so each particle costs a full context setup and fill. This is measurably slower than the previous particle material path.

`maintainer_confirmed` · owner: three_core · detect: design_review · 1 issues

[#711](https://github.com/mrdoob/three.js/issues/711)

#### `CRB-02` CPU rasterization cost scales with primitive count _(hypothetical)_

CanvasRenderer rasterizes every triangle/particle on the CPU via 2D canvas draw calls, so cost grows linearly with primitive count. Subdivision multiplies triangle count and per-triangle canvas state/path work, collapsing frame rate.

`speculative` · owner: three_core · detect: runtime_profile_only · 1 issues

[#894](https://github.com/mrdoob/three.js/issues/894)
