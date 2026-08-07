import rule from "../../src/rules/no-three-allocation-in-render-loop.js";
import { createRuleTester, jsLanguageOptions, tsLanguageOptions } from "../helpers/rule-tester.js";

const ruleTester = createRuleTester();

/** Language options declaring A-Frame's global registry, as A-Frame projects do. */
const aframeLanguageOptions = {
  ...jsLanguageOptions,
  globals: { AFRAME: "readonly" as const },
};

ruleTester.run("no-three-allocation-in-render-loop", rule, {
  valid: [
    {
      name: "allocation outside any loop",
      code: `import { Vector3 } from "three";
const scratch = new Vector3();`,
    },
    {
      name: "reused scratch vector inside the loop",
      code: `import { Vector3 } from "three";
const scratch = new Vector3();
requestAnimationFrame(() => {
  scratch.set(1, 2, 3);
});`,
    },
    {
      name: "non-Three construction inside the loop",
      code: `import { Vector3 } from "three";
class Tracker {}
requestAnimationFrame(() => {
  new Tracker();
});`,
    },
    {
      name: "deep Three import is unrecognized",
      code: `import { Vector3 } from "three/src/math/Vector3.js";
requestAnimationFrame(() => {
  new Vector3();
});`,
    },
    {
      name: "shadowed requestAnimationFrame",
      code: `import { Vector3 } from "three";
function schedule(requestAnimationFrame) {
  requestAnimationFrame(() => {
    new Vector3();
  });
}`,
    },
    {
      name: "nested function inside the loop is not attributed to it",
      code: `import { Vector3 } from "three";
requestAnimationFrame(() => {
  const build = () => new Vector3();
  register(build);
});`,
    },
    {
      name: "helper called from the loop is not followed",
      code: `import { Vector3 } from "three";
function build() {
  return new Vector3();
}
requestAnimationFrame(() => {
  build();
});`,
    },
    {
      name: "React Three Fiber useFrame is owned by the pmndrs plugin",
      code: `import { useFrame } from "@react-three/fiber";
import { Vector3 } from "three";
useFrame(() => {
  new Vector3();
});`,
    },
    {
      name: "legacy Tres useRenderLoop is not a verified loop",
      code: `import { useRenderLoop } from "@tresjs/core";
import { Vector3 } from "three";
const { onLoop } = useRenderLoop();
onLoop(() => {
  new Vector3();
});`,
    },
    {
      name: "setAnimationLoop on an untracked receiver",
      code: `import { Vector3 } from "three";
import { renderer } from "./renderer.js";
renderer.setAnimationLoop(() => {
  new Vector3();
});`,
    },
    {
      name: "clone of an unresolved receiver",
      code: `import { Vector3 } from "three";
function animate(source) {
  requestAnimationFrame(animate);
  source.clone();
}
animate();`,
    },
    {
      name: "clone of a mutable binding",
      code: `import { Vector3 } from "three";
let base = new Vector3();
base = other;
requestAnimationFrame(() => {
  base.clone();
});`,
    },
    {
      name: "clone of a non-Three construction",
      code: `class Pose {}
const pose = new Pose();
requestAnimationFrame(() => {
  pose.clone();
});`,
    },
    {
      name: "type-only Three import",
      code: `import type { Vector3 } from "three";
declare const make: () => Vector3;
requestAnimationFrame(() => {
  make();
});`,
      languageOptions: tsLanguageOptions,
    },
    {
      name: "unconfigured AFRAME global is unrecognized",
      code: `import { Vector3 } from "three";
AFRAME.registerComponent("mover", {
  tick() {
    new Vector3();
  },
});`,
    },
    {
      name: "A-Frame non-frame lifecycle method",
      code: `import { Vector3 } from "three";
AFRAME.registerComponent("mover", {
  init() {
    new Vector3();
  },
});`,
      languageOptions: aframeLanguageOptions,
    },
  ],
  invalid: [
    {
      name: "construction in a requestAnimationFrame arrow",
      code: `import { Vector3 } from "three";
requestAnimationFrame(() => {
  new Vector3();
});`,
      output: null,
      errors: [
        {
          messageId: "newThreeObjectInLoop",
          data: { constructor: "Vector3" },
          line: 3,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "construction in a self-scheduling named function",
      code: `import { Vector3 } from "three";
function animate() {
  requestAnimationFrame(animate);
  const offset = new Vector3();
}
animate();`,
      output: null,
      errors: [
        {
          messageId: "newThreeObjectInLoop",
          data: { constructor: "Vector3" },
          line: 4,
          column: 18,
          suggestions: [],
        },
      ],
    },
    {
      name: "window.requestAnimationFrame",
      code: `import { Vector3 } from "three";
window.requestAnimationFrame(() => {
  new Vector3();
});`,
      output: null,
      errors: [
        {
          messageId: "newThreeObjectInLoop",
          data: { constructor: "Vector3" },
          line: 3,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "namespace import construction",
      code: `import * as THREE from "three";
requestAnimationFrame(() => {
  new THREE.Quaternion();
});`,
      output: null,
      errors: [
        {
          messageId: "newThreeObjectInLoop",
          data: { constructor: "Quaternion" },
          line: 3,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "one immutable alias of a Three constructor",
      code: `import { Vector3 } from "three";
const Vec = Vector3;
requestAnimationFrame(() => {
  new Vec();
});`,
      output: null,
      errors: [
        {
          messageId: "newThreeObjectInLoop",
          data: { constructor: "Vector3" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "destructured namespace alias",
      code: `import * as THREE from "three";
const { Euler } = THREE;
requestAnimationFrame(() => {
  new Euler();
});`,
      output: null,
      errors: [
        {
          messageId: "newThreeObjectInLoop",
          data: { constructor: "Euler" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "tracked WebGLRenderer setAnimationLoop",
      code: `import { Vector3, WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
renderer.setAnimationLoop(() => {
  new Vector3();
});`,
      output: null,
      errors: [
        {
          messageId: "newThreeObjectInLoop",
          data: { constructor: "Vector3" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "tracked WebGPURenderer setAnimationLoop",
      code: `import { Vector3, WebGPURenderer } from "three/webgpu";
const renderer = new WebGPURenderer();
renderer.setAnimationLoop(() => {
  new Vector3();
});`,
      output: null,
      errors: [
        {
          messageId: "newThreeObjectInLoop",
          data: { constructor: "Vector3" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "A-Frame tick with a configured AFRAME global",
      code: `import { Vector3 } from "three";
AFRAME.registerComponent("mover", {
  tick() {
    new Vector3();
  },
});`,
      output: null,
      languageOptions: aframeLanguageOptions,
      errors: [
        {
          messageId: "newThreeObjectInLoop",
          data: { constructor: "Vector3" },
          line: 4,
          column: 5,
          suggestions: [],
        },
      ],
    },
    {
      name: "A-Frame tock through an aframe namespace import",
      code: `import * as aframe from "aframe";
import { Vector3 } from "three";
aframe.registerComponent("mover", {
  tock: function () {
    new Vector3();
  },
});`,
      output: null,
      errors: [
        {
          messageId: "newThreeObjectInLoop",
          data: { constructor: "Vector3" },
          line: 5,
          column: 5,
          suggestions: [],
        },
      ],
    },
    {
      name: "current Tres onBeforeRender callback",
      code: `import { useLoop } from "@tresjs/core";
import { Vector3 } from "three";
const { onBeforeRender } = useLoop();
onBeforeRender(() => {
  new Vector3();
});`,
      output: null,
      errors: [
        {
          messageId: "newThreeObjectInLoop",
          data: { constructor: "Vector3" },
          line: 5,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "current Tres onRender callback",
      code: `import { useLoop } from "@tresjs/core";
import { Vector3 } from "three";
const { onRender } = useLoop();
onRender(() => {
  new Vector3();
});`,
      output: null,
      errors: [
        {
          messageId: "newThreeObjectInLoop",
          data: { constructor: "Vector3" },
          line: 5,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "clone of a tracked construction",
      code: `import { Vector3 } from "three";
const base = new Vector3();
requestAnimationFrame(() => {
  base.clone();
});`,
      output: null,
      errors: [
        {
          messageId: "cloneThreeObjectInLoop",
          data: { constructor: "Vector3" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "inline construction and clone report the construction once",
      code: `import { Vector3 } from "three";
requestAnimationFrame(() => {
  new Vector3().clone();
});`,
      output: null,
      errors: [
        {
          messageId: "newThreeObjectInLoop",
          data: { constructor: "Vector3" },
          line: 3,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "immutable local function callback",
      code: `import { Vector3 } from "three";
const step = () => {
  new Vector3();
};
requestAnimationFrame(step);`,
      output: null,
      errors: [
        {
          messageId: "newThreeObjectInLoop",
          data: { constructor: "Vector3" },
          line: 3,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "TypeScript satisfies wrapper is transparent",
      code: `import { Vector3 } from "three";
const base = new Vector3() satisfies Vector3;
requestAnimationFrame(() => {
  base.clone();
});`,
      output: null,
      languageOptions: tsLanguageOptions,
      errors: [
        {
          messageId: "cloneThreeObjectInLoop",
          data: { constructor: "Vector3" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
  ],
});
