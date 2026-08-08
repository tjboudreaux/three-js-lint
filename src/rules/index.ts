import type { Rule } from "eslint";

import noBoundsRecomputeInRenderLoop from "./no-bounds-recompute-in-render-loop.js";
import noDeepReactiveThreeObject from "./no-deep-reactive-three-object.js";
import noDirectDevicePixelRatio from "./no-direct-device-pixel-ratio.js";
import noEphemeralDisposeListenerInRenderLoop from "./no-ephemeral-dispose-listener-in-render-loop.js";
import noGeometryRecomputeInRenderLoop from "./no-geometry-recompute-in-render-loop.js";
import noNewInJsxProps from "./no-new-in-jsx-props.js";
import noNonNumericVectorComponents from "./no-non-numeric-vector-components.js";
import noPmremGenerationInRenderLoop from "./no-pmrem-generation-in-render-loop.js";
import noReplaceObject3dTransform from "./no-replace-object3d-transform.js";
import noSetStateInUseFrame from "./no-set-state-in-use-frame.js";
import noShaderRecompileInRenderLoop from "./no-shader-recompile-in-render-loop.js";
import noSynchronousGpuOperationInRenderLoop from "./no-synchronous-gpu-operation-in-render-loop.js";
import noThreeAllocatingCallInRenderLoop from "./no-three-allocating-call-in-render-loop.js";
import noThreeAllocationInRenderLoop from "./no-three-allocation-in-render-loop.js";
import noThreeLoaderParseInRenderLoop from "./no-three-loader-parse-in-render-loop.js";
import noTransformSetAttributeInTick from "./no-transform-set-attribute-in-tick.js";
import preferBvhFirstHitOnly from "./prefer-bvh-first-hit-only.js";
import preferSquaredVectorMagnitude from "./prefer-squared-vector-magnitude.js";

/** Every rule this plugin exports, as a literal union of rule IDs. */
export type RuleName =
  | "no-bounds-recompute-in-render-loop"
  | "no-deep-reactive-three-object"
  | "no-direct-device-pixel-ratio"
  | "no-ephemeral-dispose-listener-in-render-loop"
  | "no-geometry-recompute-in-render-loop"
  | "no-new-in-jsx-props"
  | "no-non-numeric-vector-components"
  | "no-pmrem-generation-in-render-loop"
  | "no-replace-object3d-transform"
  | "no-set-state-in-use-frame"
  | "no-shader-recompile-in-render-loop"
  | "no-synchronous-gpu-operation-in-render-loop"
  | "no-three-allocating-call-in-render-loop"
  | "no-three-allocation-in-render-loop"
  | "no-three-loader-parse-in-render-loop"
  | "no-transform-set-attribute-in-tick"
  | "prefer-bvh-first-hit-only"
  | "prefer-squared-vector-magnitude";

/** The rules enabled by `three/recommended`, as a literal union of rule IDs. */
export type RecommendedRuleName =
  | "no-deep-reactive-three-object"
  | "no-direct-device-pixel-ratio"
  | "no-ephemeral-dispose-listener-in-render-loop"
  | "no-non-numeric-vector-components"
  | "no-pmrem-generation-in-render-loop"
  | "no-replace-object3d-transform"
  | "no-set-state-in-use-frame"
  | "no-shader-recompile-in-render-loop"
  | "no-synchronous-gpu-operation-in-render-loop"
  | "no-three-allocating-call-in-render-loop"
  | "no-three-allocation-in-render-loop"
  | "no-three-loader-parse-in-render-loop";

/** The rule registry, exhaustive over {@link RuleName}. */
export const rules: Record<RuleName, Rule.RuleModule> = {
  "no-bounds-recompute-in-render-loop": noBoundsRecomputeInRenderLoop,
  "no-deep-reactive-three-object": noDeepReactiveThreeObject,
  "no-direct-device-pixel-ratio": noDirectDevicePixelRatio,
  "no-ephemeral-dispose-listener-in-render-loop": noEphemeralDisposeListenerInRenderLoop,
  "no-geometry-recompute-in-render-loop": noGeometryRecomputeInRenderLoop,
  "no-new-in-jsx-props": noNewInJsxProps,
  "no-non-numeric-vector-components": noNonNumericVectorComponents,
  "no-pmrem-generation-in-render-loop": noPmremGenerationInRenderLoop,
  "no-replace-object3d-transform": noReplaceObject3dTransform,
  "no-set-state-in-use-frame": noSetStateInUseFrame,
  "no-shader-recompile-in-render-loop": noShaderRecompileInRenderLoop,
  "no-synchronous-gpu-operation-in-render-loop": noSynchronousGpuOperationInRenderLoop,
  "no-three-allocating-call-in-render-loop": noThreeAllocatingCallInRenderLoop,
  "no-three-allocation-in-render-loop": noThreeAllocationInRenderLoop,
  "no-three-loader-parse-in-render-loop": noThreeLoaderParseInRenderLoop,
  "no-transform-set-attribute-in-tick": noTransformSetAttributeInTick,
  "prefer-bvh-first-hit-only": preferBvhFirstHitOnly,
  "prefer-squared-vector-magnitude": preferSquaredVectorMagnitude,
};
