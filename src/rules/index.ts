import type { Rule } from "eslint";

import noDeepReactiveThreeObject from "./no-deep-reactive-three-object.js";
import noDirectDevicePixelRatio from "./no-direct-device-pixel-ratio.js";
import noNewInJsxProps from "./no-new-in-jsx-props.js";
import noReplaceObject3dTransform from "./no-replace-object3d-transform.js";
import noSetStateInUseFrame from "./no-set-state-in-use-frame.js";
import noShaderRecompileInRenderLoop from "./no-shader-recompile-in-render-loop.js";
import noThreeAllocationInRenderLoop from "./no-three-allocation-in-render-loop.js";
import noTransformSetAttributeInTick from "./no-transform-set-attribute-in-tick.js";
import preferBvhFirstHitOnly from "./prefer-bvh-first-hit-only.js";

/** Every rule this plugin exports, as a literal union of rule IDs. */
export type RuleName =
  | "no-deep-reactive-three-object"
  | "no-direct-device-pixel-ratio"
  | "no-new-in-jsx-props"
  | "no-replace-object3d-transform"
  | "no-set-state-in-use-frame"
  | "no-shader-recompile-in-render-loop"
  | "no-three-allocation-in-render-loop"
  | "no-transform-set-attribute-in-tick"
  | "prefer-bvh-first-hit-only";

/** The rules enabled by `three/recommended`, as a literal union of rule IDs. */
export type RecommendedRuleName =
  | "no-deep-reactive-three-object"
  | "no-direct-device-pixel-ratio"
  | "no-replace-object3d-transform"
  | "no-set-state-in-use-frame"
  | "no-shader-recompile-in-render-loop"
  | "no-three-allocation-in-render-loop";

/** The rule registry, exhaustive over {@link RuleName}. */
export const rules: Record<RuleName, Rule.RuleModule> = {
  "no-deep-reactive-three-object": noDeepReactiveThreeObject,
  "no-direct-device-pixel-ratio": noDirectDevicePixelRatio,
  "no-new-in-jsx-props": noNewInJsxProps,
  "no-replace-object3d-transform": noReplaceObject3dTransform,
  "no-set-state-in-use-frame": noSetStateInUseFrame,
  "no-shader-recompile-in-render-loop": noShaderRecompileInRenderLoop,
  "no-three-allocation-in-render-loop": noThreeAllocationInRenderLoop,
  "no-transform-set-attribute-in-tick": noTransformSetAttributeInTick,
  "prefer-bvh-first-hit-only": preferBvhFirstHitOnly,
};
