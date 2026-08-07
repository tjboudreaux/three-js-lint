import rule from "../../src/rules/no-direct-device-pixel-ratio.js";
import { createRuleTester, tsLanguageOptions } from "../helpers/rule-tester.js";

const ruleTester = createRuleTester();

ruleTester.run("no-direct-device-pixel-ratio", rule, {
  valid: [
    {
      name: "capped ratio",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));`,
    },
    {
      name: "arithmetic on the ratio",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
renderer.setPixelRatio(window.devicePixelRatio * 0.5);`,
    },
    {
      name: "conditional ratio",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
renderer.setPixelRatio(isMobile ? 1 : window.devicePixelRatio);`,
    },
    {
      name: "ratio behind an && guard",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
renderer.setPixelRatio(allowHiDpi && window.devicePixelRatio);`,
    },
    {
      name: "helper call result",
      code: `import { WebGLRenderer } from "three";
import { pickRatio } from "./ratio.js";
const renderer = new WebGLRenderer();
renderer.setPixelRatio(pickRatio());`,
    },
    {
      name: "locally shadowed devicePixelRatio",
      code: `import { WebGLRenderer } from "three";
function setup(devicePixelRatio) {
  const renderer = new WebGLRenderer();
  renderer.setPixelRatio(devicePixelRatio);
}`,
    },
    {
      name: "shadowed window binding",
      code: `import { WebGLRenderer } from "three";
function setup(window) {
  const renderer = new WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
}`,
    },
    {
      name: "mutable local holding the ratio",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
let ratio = window.devicePixelRatio;
ratio = 1;
renderer.setPixelRatio(ratio);`,
    },
    {
      name: "two alias hops exceed the resolution budget",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const first = window.devicePixelRatio;
const second = first;
renderer.setPixelRatio(second);`,
    },
    {
      name: "dynamic member name",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
renderer.setPixelRatio(window[ratioKey]);`,
    },
    {
      name: "unrelated receiver",
      code: `import { config } from "./config.js";
config.setPixelRatio(window.devicePixelRatio);`,
    },
    {
      name: "renderer from an untracked module",
      code: `import { WebGLRenderer } from "custom-renderer";
const renderer = new WebGLRenderer();
renderer.setPixelRatio(window.devicePixelRatio);`,
    },
    {
      name: "WebGPURenderer imported from the wrong module",
      code: `import { WebGPURenderer } from "three";
const renderer = new WebGPURenderer();
renderer.setPixelRatio(window.devicePixelRatio);`,
    },
    {
      name: "type-only renderer import",
      code: `import type { WebGLRenderer } from "three";
declare const renderer: WebGLRenderer;
renderer.setPixelRatio(window.devicePixelRatio);`,
      languageOptions: tsLanguageOptions,
    },
    {
      name: "mutable renderer binding",
      code: `import { WebGLRenderer } from "three";
let renderer = new WebGLRenderer();
renderer = other;
renderer.setPixelRatio(window.devicePixelRatio);`,
    },
    {
      name: "setPixelRatio with no argument",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
renderer.setPixelRatio();`,
    },
    {
      name: "different renderer method",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
renderer.setSize(window.devicePixelRatio, 1);`,
    },
  ],
  invalid: [
    {
      name: "window.devicePixelRatio forwarded directly",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
renderer.setPixelRatio(window.devicePixelRatio);`,
      output: null,
      errors: [
        {
          messageId: "directDevicePixelRatio",
          data: { renderer: "renderer", source: "window.devicePixelRatio" },
          line: 3,
          column: 1,
          suggestions: [],
        },
      ],
    },
    {
      name: "bare unshadowed devicePixelRatio",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
renderer.setPixelRatio(devicePixelRatio);`,
      output: null,
      errors: [
        {
          messageId: "directDevicePixelRatio",
          data: { renderer: "renderer", source: "devicePixelRatio" },
          line: 3,
          column: 1,
          suggestions: [],
        },
      ],
    },
    {
      name: "globalThis.devicePixelRatio",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
renderer.setPixelRatio(globalThis.devicePixelRatio);`,
      output: null,
      errors: [
        {
          messageId: "directDevicePixelRatio",
          data: { renderer: "renderer", source: "globalThis.devicePixelRatio" },
          line: 3,
          column: 1,
          suggestions: [],
        },
      ],
    },
    {
      name: "fallback with || keeps the ratio unbounded",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
renderer.setPixelRatio(window.devicePixelRatio || 1);`,
      output: null,
      errors: [
        {
          messageId: "directDevicePixelRatio",
          data: { renderer: "renderer", source: "window.devicePixelRatio" },
          line: 3,
          column: 1,
          suggestions: [],
        },
      ],
    },
    {
      name: "fallback with ?? keeps the ratio unbounded",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
renderer.setPixelRatio(window.devicePixelRatio ?? 1);`,
      output: null,
      errors: [
        {
          messageId: "directDevicePixelRatio",
          data: { renderer: "renderer", source: "window.devicePixelRatio" },
          line: 3,
          column: 1,
          suggestions: [],
        },
      ],
    },
    {
      name: "one immutable const hop",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const ratio = window.devicePixelRatio;
renderer.setPixelRatio(ratio);`,
      output: null,
      errors: [
        {
          messageId: "directDevicePixelRatio",
          data: { renderer: "renderer", source: "window.devicePixelRatio" },
          line: 4,
          column: 1,
          suggestions: [],
        },
      ],
    },
    {
      name: "namespace import renderer",
      code: `import * as THREE from "three";
const renderer = new THREE.WebGLRenderer();
renderer.setPixelRatio(window.devicePixelRatio);`,
      output: null,
      errors: [
        {
          messageId: "directDevicePixelRatio",
          data: { renderer: "renderer", source: "window.devicePixelRatio" },
          line: 3,
          column: 1,
          suggestions: [],
        },
      ],
    },
    {
      name: "renderer reached through one immutable alias",
      code: `import { WebGLRenderer } from "three";
const created = new WebGLRenderer();
const renderer = created;
renderer.setPixelRatio(window.devicePixelRatio);`,
      output: null,
      errors: [
        {
          messageId: "directDevicePixelRatio",
          data: { renderer: "renderer", source: "window.devicePixelRatio" },
          line: 4,
          column: 1,
          suggestions: [],
        },
      ],
    },
    {
      name: "WebGPURenderer from three/webgpu",
      code: `import { WebGPURenderer } from "three/webgpu";
const renderer = new WebGPURenderer();
renderer.setPixelRatio(window.devicePixelRatio);`,
      output: null,
      errors: [
        {
          messageId: "directDevicePixelRatio",
          data: { renderer: "renderer", source: "window.devicePixelRatio" },
          line: 3,
          column: 1,
          suggestions: [],
        },
      ],
    },
    {
      name: "inline construction as the receiver",
      code: `import { WebGLRenderer } from "three";
new WebGLRenderer().setPixelRatio(window.devicePixelRatio);`,
      output: null,
      errors: [
        {
          messageId: "directDevicePixelRatio",
          data: { renderer: "new WebGLRenderer()", source: "window.devicePixelRatio" },
          line: 2,
          column: 1,
          suggestions: [],
        },
      ],
    },
    {
      name: "TypeScript non-null and as assertions are transparent",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
renderer!.setPixelRatio((window.devicePixelRatio as number));`,
      output: null,
      languageOptions: tsLanguageOptions,
      errors: [
        {
          messageId: "directDevicePixelRatio",
          data: { renderer: "renderer", source: "window.devicePixelRatio" },
          line: 3,
          column: 1,
          suggestions: [],
        },
      ],
    },
    {
      name: "computed access with a static string key",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
renderer.setPixelRatio(window["devicePixelRatio"]);`,
      output: null,
      errors: [
        {
          messageId: "directDevicePixelRatio",
          data: { renderer: "renderer", source: "window.devicePixelRatio" },
          line: 3,
          column: 1,
          suggestions: [],
        },
      ],
    },
  ],
});
