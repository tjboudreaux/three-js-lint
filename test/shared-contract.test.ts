import allocatingCallRule from "../src/rules/no-three-allocating-call-in-render-loop.js";
import allocationRule from "../src/rules/no-three-allocation-in-render-loop.js";
import bvhRule from "../src/rules/prefer-bvh-first-hit-only.js";
import dprRule from "../src/rules/no-direct-device-pixel-ratio.js";
import jsxRule from "../src/rules/no-new-in-jsx-props.js";
import setAttributeRule from "../src/rules/no-transform-set-attribute-in-tick.js";
import setStateRule from "../src/rules/no-set-state-in-use-frame.js";
import transformRule from "../src/rules/no-replace-object3d-transform.js";
import {
  createRuleTester,
  jsLanguageOptions,
  jsxLanguageOptions,
  tsLanguageOptions,
  tsxLanguageOptions,
} from "./helpers/rule-tester.js";

/**
 * Behavior fixtures for the binding and AST layer every rule shares.
 *
 * Each case asserts an observable rule result rather than inspecting internals,
 * so the resolution contract — alias hops, shadowing, provenance, parser
 * wrappers, and the boundaries where resolution gives up — is pinned by the
 * diagnostics users actually see.
 */
const ruleTester = createRuleTester();

const aframeLanguageOptions = {
  ...jsLanguageOptions,
  globals: { AFRAME: "readonly" as const },
};

const bvhSetup = `import { Mesh, Raycaster } from "three";
import { acceleratedRaycast } from "three-mesh-bvh";
Mesh.prototype.raycast = acceleratedRaycast;
`;

ruleTester.run("shared contract: import provenance", allocationRule, {
  valid: [
    {
      name: "default import is not a named export",
      code: `import Three from "three";
requestAnimationFrame(() => {
  new Three.Vector3();
});`,
    },
    {
      name: "inline type specifier is erased at runtime",
      code: `import { type Vector3, WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
renderer.setAnimationLoop(() => {
  new Vector3();
});`,
      languageOptions: tsLanguageOptions,
    },
    {
      name: "namespace member with a dynamic name",
      code: `import * as THREE from "three";
requestAnimationFrame(() => {
  new THREE[className]();
});`,
    },
    {
      name: "namespace member on an unresolved object",
      code: `requestAnimationFrame(() => {
  new Unknown.Vector3();
});`,
    },
    {
      name: "namespace member on a non-namespace binding",
      code: `import { Vector3 } from "three";
const holder = { Vector3 };
requestAnimationFrame(() => {
  new holder.Vector3();
});`,
    },
    {
      name: "CommonJS require is not an import",
      code: `const THREE = require("three");
requestAnimationFrame(() => {
  new THREE.Vector3();
});`,
      languageOptions: { ...jsLanguageOptions, sourceType: "commonjs" as const },
    },
    {
      name: "nested destructuring exceeds one pattern level",
      code: `import * as THREE from "three";
const { math: { Vector3 } } = THREE;
requestAnimationFrame(() => {
  new Vector3();
});`,
    },
    {
      name: "rest destructuring has no static property name",
      code: `import * as THREE from "three";
const { ...rest } = THREE;
requestAnimationFrame(() => {
  new rest.Vector3();
});`,
    },
    {
      name: "destructuring from a mutable binding",
      code: `import * as THREE from "three";
let namespace = THREE;
const { Vector3 } = namespace;
requestAnimationFrame(() => {
  new Vector3();
});`,
    },
    {
      name: "constructor alias reached through a mutable binding",
      code: `import { Vector3 } from "three";
let Alias = Vector3;
requestAnimationFrame(() => {
  new Alias();
});`,
    },
    {
      name: "side-effect-only three import declares no constructor",
      code: `import "three";
requestAnimationFrame(() => {
  new Vector3();
});`,
    },
  ],
  invalid: [
    {
      name: "string import name resolves to the exported name",
      code: `import { "Vector3" as Vec } from "three";
requestAnimationFrame(() => {
  new Vec();
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
      name: "renamed namespace destructuring keeps the exported name",
      code: `import * as THREE from "three";
const { Vector3: Vec } = THREE;
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
      name: "namespace member alias through one const hop",
      code: `import * as THREE from "three";
const Vec = THREE.Vector3;
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
  ],
});

ruleTester.run("shared contract: callback resolution", allocationRule, {
  valid: [
    {
      name: "callback reached through a member expression",
      code: `import { Vector3 } from "three";
const handlers = { step() { new Vector3(); } };
requestAnimationFrame(handlers.step);`,
    },
    {
      name: "callback reached through an unresolved identifier",
      code: `import { Vector3 } from "three";
requestAnimationFrame(externalStep);`,
    },
    {
      name: "callback binding does not hold a function",
      code: `import { Vector3 } from "three";
const step = 5;
requestAnimationFrame(step);`,
    },
    {
      name: "callback binding is mutable",
      code: `import { Vector3 } from "three";
let step = () => {
  new Vector3();
};
step = other;
requestAnimationFrame(step);`,
    },
    {
      name: "requestAnimationFrame with no arguments",
      code: `import { Vector3 } from "three";
requestAnimationFrame();`,
    },
    {
      name: "setAnimationLoop on a renderer reached through two alias hops",
      code: `import { Vector3, WebGLRenderer } from "three";
const created = new WebGLRenderer();
const middle = created;
const renderer = middle;
renderer.setAnimationLoop(() => {
  new Vector3();
});`,
    },
    {
      name: "setAnimationLoop on a call result",
      code: `import { Vector3 } from "three";
makeRenderer().setAnimationLoop(() => {
  new Vector3();
});`,
    },
    {
      name: "setAnimationLoop on an unresolved binding",
      code: `import { Vector3 } from "three";
unknownRenderer.setAnimationLoop(() => {
  new Vector3();
});`,
    },
    {
      name: "Tres callback destructured from a non-call initializer",
      code: `import { loopApi } from "@tresjs/core";
import { Vector3 } from "three";
const { onRender } = loopApi;
onRender(() => {
  new Vector3();
});`,
    },
    {
      name: "A-Frame definition with a spread property",
      code: `import { Vector3 } from "three";
AFRAME.registerComponent("mover", {
  ...base,
  tick: handler,
});`,
      languageOptions: aframeLanguageOptions,
    },
    {
      name: "A-Frame registry reached through a member expression",
      code: `import { Vector3 } from "three";
window.AFRAME.registerComponent("mover", {
  tick() {
    new Vector3();
  },
});`,
      languageOptions: aframeLanguageOptions,
    },
    {
      name: "A-Frame registerComponent with a non-object definition",
      code: `import { Vector3 } from "three";
AFRAME.registerComponent("mover");`,
      languageOptions: aframeLanguageOptions,
    },
  ],
  invalid: [
    {
      name: "function declaration callback resolved by binding",
      code: `import { Vector3 } from "three";
function step() {
  new Vector3();
}
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
  ],
});

ruleTester.run("shared contract: global resolution", dprRule, {
  valid: [
    {
      name: "an unrecognized global object prefix",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
renderer.setPixelRatio(screen.devicePixelRatio);`,
    },
    {
      name: "a deeper global path",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
renderer.setPixelRatio(window.visualViewport.devicePixelRatio);`,
    },
    {
      name: "a dynamic property on a global object",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
renderer.setPixelRatio(window[ratioKey]);`,
    },
    {
      name: "renderer reached through a call",
      code: `import { WebGLRenderer } from "three";
makeRenderer().setPixelRatio(window.devicePixelRatio);`,
    },
    {
      name: "renderer reached through two alias hops",
      code: `import { WebGLRenderer } from "three";
const created = new WebGLRenderer();
const middle = created;
const renderer = middle;
renderer.setPixelRatio(window.devicePixelRatio);`,
    },
    {
      name: "an undeclared receiver",
      code: `unknownRenderer.setPixelRatio(window.devicePixelRatio);`,
    },
    {
      name: "computed setPixelRatio with a dynamic key",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
renderer[methodName](window.devicePixelRatio);`,
    },
  ],
  invalid: [
    {
      name: "chained optional call on a tracked renderer",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
renderer?.setPixelRatio(window.devicePixelRatio);`,
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

ruleTester.run("shared contract: static names and literals", setAttributeRule, {
  valid: [
    {
      name: "setAttribute with no arguments",
      code: `AFRAME.registerComponent("mover", {
  tick() {
    this.el.setAttribute();
  },
});`,
      languageOptions: aframeLanguageOptions,
    },
    {
      name: "template literal with a substitution",
      code: `AFRAME.registerComponent("mover", {
  tick() {
    this.el.setAttribute(\`position\${suffix}\`, value);
  },
});`,
      languageOptions: aframeLanguageOptions,
    },
    {
      name: "non-string literal attribute name",
      code: `AFRAME.registerComponent("mover", {
  tick() {
    this.el.setAttribute(null, value);
  },
});`,
      languageOptions: aframeLanguageOptions,
    },
    {
      name: "private field receiver",
      code: `class Mover {
  #el = null;
  register() {
    AFRAME.registerComponent("mover", {
      tick: () => {
        this.#el.setAttribute("position", value);
      },
    });
  }
}`,
      languageOptions: aframeLanguageOptions,
    },
    {
      name: "computed setAttribute access with a dynamic key",
      code: `AFRAME.registerComponent("mover", {
  tick() {
    this.el[methodName]("position", value);
  },
});`,
      languageOptions: aframeLanguageOptions,
    },
    {
      name: "this.el reached through a dynamic key",
      code: `AFRAME.registerComponent("mover", {
  tick() {
    this[elementKey].setAttribute("position", value);
  },
});`,
      languageOptions: aframeLanguageOptions,
    },
  ],
  invalid: [
    {
      name: "computed string literal attribute name",
      code: `AFRAME.registerComponent("mover", {
  tick() {
    this.el["setAttribute"]("scale", value);
  },
});`,
      output: null,
      languageOptions: aframeLanguageOptions,
      errors: [
        {
          messageId: "transformSetAttributeInTick",
          data: { attribute: "scale" },
          line: 3,
          column: 5,
          suggestions: [],
        },
      ],
    },
  ],
});

ruleTester.run("shared contract: numeric literals and escape analysis", bvhRule, {
  valid: [
    {
      name: "negative index",
      code: `${bvhSetup}function pick(mesh) {
  const raycaster = new Raycaster();
  const hits = raycaster.intersectObject(mesh);
  return hits[-1];
}`,
    },
    {
      name: "dynamic index",
      code: `${bvhSetup}function pick(mesh, index) {
  const raycaster = new Raycaster();
  const hits = raycaster.intersectObject(mesh);
  return hits[index];
}`,
    },
    {
      name: "at with no argument",
      code: `${bvhSetup}function pick(mesh) {
  const raycaster = new Raycaster();
  const hits = raycaster.intersectObject(mesh);
  return hits.at();
}`,
    },
    {
      name: "at read without calling it",
      code: `${bvhSetup}function pick(mesh) {
  const raycaster = new Raycaster();
  const hits = raycaster.intersectObject(mesh);
  return hits.at;
}`,
    },
    {
      name: "length compared with a dynamic value",
      code: `${bvhSetup}function pick(mesh, limit) {
  const raycaster = new Raycaster();
  const hits = raycaster.intersectObject(mesh);
  return hits.length === limit;
}`,
    },
    {
      name: "result compared directly",
      code: `${bvhSetup}function pick(mesh) {
  const raycaster = new Raycaster();
  const hits = raycaster.intersectObject(mesh);
  return hits === null;
}`,
    },
    {
      name: "a write through a dynamic key may target firstHitOnly",
      code: `${bvhSetup}function pick(mesh, key) {
  const raycaster = new Raycaster();
  raycaster[key] = true;
  const hits = raycaster.intersectObject(mesh);
  return hits[0];
}`,
    },
    {
      name: "a compound assignment to firstHitOnly is not a boolean write",
      code: `${bvhSetup}function pick(mesh) {
  const raycaster = new Raycaster();
  raycaster.firstHitOnly ||= true;
  const hits = raycaster.intersectObject(mesh);
  return hits[0];
}`,
    },
    {
      name: "declaration is not const",
      code: `${bvhSetup}function pick(mesh) {
  const raycaster = new Raycaster();
  var hits = raycaster.intersectObject(mesh);
  return hits[0];
}`,
    },
    {
      name: "declarator without an initializer",
      code: `${bvhSetup}function pick(mesh) {
  const raycaster = new Raycaster();
  const hits = raycaster;
  return hits.firstHitOnly;
}`,
    },
  ],
  invalid: [
    {
      name: "negated zero comparison still tests emptiness",
      code: `${bvhSetup}function pick(mesh) {
  const raycaster = new Raycaster();
  const hits = raycaster.intersectObject(mesh);
  return hits.length !== -0;
}`,
      output: null,
      errors: [
        {
          messageId: "preferFirstHitOnly",
          data: { raycaster: "raycaster" },
          line: 6,
          column: 16,
          suggestions: [],
        },
      ],
    },
    {
      name: "reading firstHitOnly does not enable it",
      code: `${bvhSetup}function pick(mesh) {
  const raycaster = new Raycaster();
  const flag = raycaster.firstHitOnly;
  const hits = raycaster.intersectObject(mesh);
  return hits[0];
}`,
      output: null,
      errors: [
        {
          messageId: "preferFirstHitOnly",
          data: { raycaster: "raycaster" },
          line: 7,
          column: 16,
          suggestions: [],
        },
      ],
    },
    {
      name: "TypeScript non-null receiver is transparent",
      code: `${bvhSetup}function pick(mesh: unknown) {
  const raycaster = new Raycaster();
  const hits = raycaster!.intersectObject(mesh);
  return hits[0];
}`,
      output: null,
      languageOptions: tsLanguageOptions,
      errors: [
        {
          messageId: "preferFirstHitOnly",
          data: { raycaster: "raycaster" },
          line: 6,
          column: 16,
          suggestions: [],
        },
      ],
    },
  ],
});

ruleTester.run("shared contract: JSX identifiers", jsxRule, {
  valid: [
    {
      name: "namespaced JSX attribute name",
      code: `import { Canvas } from "@react-three/fiber";
import { Vector3 } from "three";
const view = <mesh xlink:position={new Vector3(0, 1, 0)} />;`,
      languageOptions: jsxLanguageOptions,
    },
    {
      name: "attribute value that is not an expression container",
      code: `import { Canvas } from "@react-three/fiber";
const view = <mesh position="0 1 0" />;`,
      languageOptions: jsxLanguageOptions,
    },
    {
      name: "attribute with no value",
      code: `import { Canvas } from "@react-three/fiber";
const view = <mesh position />;`,
      languageOptions: jsxLanguageOptions,
    },
  ],
  invalid: [
    {
      name: "Espree and typescript-eslint agree on host identifiers",
      code: `import { Canvas } from "@react-three/fiber";
import { Vector3 } from "three";
const view = <sprite position={new Vector3(0, 1, 0)} />;`,
      output: null,
      languageOptions: tsxLanguageOptions,
      errors: [
        {
          messageId: "newThreeObjectInJsxProp",
          data: { constructor: "Vector3", property: "position" },
          line: 3,
          column: 22,
          suggestions: [],
        },
      ],
    },
  ],
});

ruleTester.run("shared contract: BVH activation and cast shapes", bvhRule, {
  valid: [
    {
      name: "activation assigns a different prototype method",
      code: `import { Mesh, Raycaster } from "three";
import { acceleratedRaycast } from "three-mesh-bvh";
Mesh.prototype.raycastFirst = acceleratedRaycast;
function pick(mesh) {
  const raycaster = new Raycaster();
  const hits = raycaster.intersectObject(mesh);
  return hits[0];
}`,
    },
    {
      name: "activation skips the prototype object",
      code: `import { Mesh, Raycaster } from "three";
import { acceleratedRaycast } from "three-mesh-bvh";
Mesh.raycast = acceleratedRaycast;
function pick(mesh) {
  const raycaster = new Raycaster();
  const hits = raycaster.intersectObject(mesh);
  return hits[0];
}`,
    },
    {
      name: "cast callee is not a member expression",
      code: `${bvhSetup}function pick(mesh) {
  const raycaster = new Raycaster();
  const hits = castAgainst(mesh);
  return hits[0];
}`,
    },
    {
      name: "cast receiver is a call result",
      code: `${bvhSetup}function pick(mesh) {
  const raycaster = new Raycaster();
  const hits = makeRaycaster().intersectObject(mesh);
  return hits[0];
}`,
    },
    {
      name: "length combined arithmetically rather than compared",
      code: `${bvhSetup}function pick(mesh) {
  const raycaster = new Raycaster();
  const hits = raycaster.intersectObject(mesh);
  return hits.length + 1;
}`,
    },
    {
      name: "result used as a computed key rather than indexed",
      code: `${bvhSetup}function pick(mesh, table) {
  const raycaster = new Raycaster();
  const hits = raycaster.intersectObject(mesh);
  return table[hits];
}`,
    },
    {
      name: "index behind an unsupported unary operator",
      code: `${bvhSetup}function pick(mesh) {
  const raycaster = new Raycaster();
  const hits = raycaster.intersectObject(mesh);
  return hits[~0];
}`,
    },
    {
      name: "index behind a unary plus on a non-numeric literal",
      code: `${bvhSetup}function pick(mesh) {
  const raycaster = new Raycaster();
  const hits = raycaster.intersectObject(mesh);
  return hits[+"0"];
}`,
    },
  ],
  invalid: [],
});

ruleTester.run("shared contract: transform value forms", transformRule, {
  valid: [
    {
      name: "clone of a value that is not a construction",
      code: `import { Mesh } from "three";
const mesh = new Mesh();
const source = makeVector();
mesh.position = source.clone();`,
    },
    {
      name: "clone of a mutable binding",
      code: `import { Mesh, Vector3 } from "three";
const mesh = new Mesh();
let source = new Vector3();
source = other;
mesh.position = source.clone();`,
    },
    {
      name: "clone through a computed member",
      code: `import { Mesh, Vector3 } from "three";
const mesh = new Mesh();
const source = new Vector3();
mesh.position = source[cloneKey]();`,
    },
    {
      name: "clone with an inline receiver",
      code: `import { Mesh, Vector3 } from "three";
const mesh = new Mesh();
mesh.position = new Vector3().clone();`,
    },
    {
      name: "owner reached through a call",
      code: `import { Vector3 } from "three";
makeMesh().position = new Vector3(1, 2, 3);`,
    },
    {
      name: "value that is neither a construction nor a call",
      code: `import { Mesh } from "three";
const mesh = new Mesh();
mesh.position = offset;`,
    },
  ],
  invalid: [
    {
      name: "wrong Vector3 arity yields a report without a suggestion",
      code: `import { Mesh, Vector3 } from "three";
const mesh = new Mesh();
mesh.position = new Vector3(1, 2);`,
      output: null,
      errors: [
        {
          messageId: "replaceObject3DTransform",
          data: { owner: "mesh", property: "position" },
          line: 3,
          column: 1,
          suggestions: [],
        },
      ],
    },
    {
      name: "wrong Quaternion arity yields a report without a suggestion",
      code: `import { Mesh, Quaternion } from "three";
const mesh = new Mesh();
mesh.quaternion = new Quaternion(0, 0, 0);`,
      output: null,
      errors: [
        {
          messageId: "replaceObject3DTransform",
          data: { owner: "mesh", property: "quaternion" },
          line: 3,
          column: 1,
          suggestions: [],
        },
      ],
    },
    {
      name: "spread with a matching arity still has an unknown expansion",
      code: `import { Mesh, Vector3 } from "three";
const mesh = new Mesh();
const parts = [1, 2];
mesh.position = new Vector3(...parts, 3);`,
      output: null,
      errors: [
        {
          messageId: "replaceObject3DTransform",
          data: { owner: "mesh", property: "position" },
          line: 4,
          column: 1,
          suggestions: [],
        },
      ],
    },
  ],
});

/*
 * Renderer sort comparators and cross-renderer object render hooks are the two
 * dispatch families added alongside the expanded rule surface. Both are proven
 * from the registration site, never from a callback's own name, and both are
 * included in every rule's hot-callback set.
 */
ruleTester.run("shared contract: renderer sort callbacks", allocationRule, {
  valid: [
    {
      name: "sort setter with no argument",
      code: `import { Vector3, WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
renderer.setOpaqueSort();`,
    },
    {
      name: "sort setter cleared with null",
      code: `import { Vector3, WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
renderer.setOpaqueSort(null);`,
    },
    {
      name: "sort setter with two arguments",
      code: `import { Vector3, WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
renderer.setTransparentSort(() => {
  new Vector3();
}, extra);`,
    },
    {
      name: "sort setter with a spread argument",
      code: `import { Vector3, WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const parts = [compare];
renderer.setOpaqueSort(...parts);`,
    },
    {
      name: "sort setter on an unresolved receiver",
      code: `import { Vector3 } from "three";
unknownRenderer.setOpaqueSort(() => {
  new Vector3();
});`,
    },
    {
      name: "sort setter on a mismatched renderer source",
      code: `import { Vector3, WebGPURenderer } from "three";
const renderer = new WebGPURenderer();
renderer.setOpaqueSort(() => {
  new Vector3();
});`,
    },
    {
      name: "sort comparator assigned as a property",
      code: `import { Vector3, WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
renderer.setOpaqueSort = () => {
  new Vector3();
};`,
    },
    {
      name: "sort setter reached through a dynamic method name",
      code: `import { Vector3, WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
renderer[methodName](() => {
  new Vector3();
});`,
    },
    {
      name: "allocation nested inside a sort comparator",
      code: `import { Vector3, WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
renderer.setOpaqueSort((a, b) => {
  queue(() => {
    new Vector3();
  });
  return a.z - b.z;
});`,
    },
  ],
  invalid: [
    {
      name: "opaque sort comparator on a WebGL renderer",
      code: `import { Vector3, WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
renderer.setOpaqueSort((a, b) => {
  new Vector3();
  return a.z - b.z;
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
      name: "transparent sort comparator on a WebGPU renderer",
      code: `import { Vector3, WebGPURenderer } from "three/webgpu";
const renderer = new WebGPURenderer();
renderer.setTransparentSort((a, b) => {
  new Vector3();
  return a.z - b.z;
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
      name: "sort comparator resolved through an immutable callback alias",
      code: `import { Vector3, WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const compare = (a, b) => {
  new Vector3();
  return a.z - b.z;
};
renderer.setOpaqueSort(compare);`,
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
      name: "sort setter reached through a computed string literal",
      code: `import { Vector3, WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
renderer["setOpaqueSort"]((a, b) => {
  new Vector3();
  return a.z - b.z;
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
  ],
});

ruleTester.run("shared contract: object render hooks", allocationRule, {
  valid: [
    {
      name: "LineLoop is not a proven render-hook receiver",
      code: `import { LineLoop, Vector3 } from "three";
const object = new LineLoop();
object.onBeforeRender = () => {
  new Vector3();
};`,
    },
    {
      name: "onBeforeShadow is renderer-specific and not cataloged",
      code: `import { Mesh, Vector3 } from "three";
const object = new Mesh();
object.onBeforeShadow = () => {
  new Vector3();
};`,
    },
    {
      name: "onAfterShadow is renderer-specific and not cataloged",
      code: `import { Mesh, Vector3 } from "three";
const object = new Mesh();
object.onAfterShadow = () => {
  new Vector3();
};`,
    },
    {
      name: "plain Object3D is outside the render-hook catalog",
      code: `import { Object3D, Vector3 } from "three";
const object = new Object3D();
object.onBeforeRender = () => {
  new Vector3();
};`,
    },
    {
      name: "Group is outside the render-hook catalog",
      code: `import { Group, Vector3 } from "three";
const object = new Group();
object.onBeforeRender = () => {
  new Vector3();
};`,
    },
    {
      name: "a camera is outside the render-hook catalog",
      code: `import { PerspectiveCamera, Vector3 } from "three";
const object = new PerspectiveCamera();
object.onBeforeRender = () => {
  new Vector3();
};`,
    },
    {
      name: "a non-renderable helper is outside the render-hook catalog",
      code: `import { ArrowHelper, Vector3 } from "three";
const object = new ArrowHelper();
object.onBeforeRender = () => {
  new Vector3();
};`,
    },
    {
      name: "assignment on a direct construction",
      code: `import { Mesh, Vector3 } from "three";
new Mesh().onBeforeRender = () => {
  new Vector3();
};`,
    },
    {
      name: "assignment on a local subclass instance",
      code: `import { Mesh, Vector3 } from "three";
class CustomMesh extends Mesh {}
const object = new CustomMesh();
object.onBeforeRender = () => {
  new Vector3();
};`,
    },
    {
      name: "a subclass of a subclass is a second local layer",
      code: `import { Mesh, Vector3 } from "three";
class CustomMesh extends Mesh {}
class DeeperMesh extends CustomMesh {
  onBeforeRender() {
    new Vector3();
  }
}`,
    },
    {
      name: "a getter is not an installed callback",
      code: `import { Mesh, Vector3 } from "three";
class CustomMesh extends Mesh {
  get onBeforeRender() {
    new Vector3();
    return null;
  }
}`,
    },
    {
      name: "a setter is not an installed callback",
      code: `import { Mesh, Vector3 } from "three";
class CustomMesh extends Mesh {
  set onBeforeRender(value) {
    new Vector3();
  }
}`,
    },
    {
      name: "a static method is never dispatched per object",
      code: `import { Mesh, Vector3 } from "three";
class CustomMesh extends Mesh {
  static onBeforeRender() {
    new Vector3();
  }
}`,
    },
    {
      name: "a static field is never dispatched per object",
      code: `import { Mesh, Vector3 } from "three";
class CustomMesh extends Mesh {
  static onBeforeRender = () => {
    new Vector3();
  };
}`,
    },
    {
      name: "a dynamic class member key",
      code: `import { Mesh, Vector3 } from "three";
class CustomMesh extends Mesh {
  [hookName]() {
    new Vector3();
  }
}`,
    },
    {
      name: "a compound assignment is not a plain install",
      code: `import { Mesh, Vector3 } from "three";
const object = new Mesh();
object.onBeforeRender ||= () => {
  new Vector3();
};`,
    },
    {
      name: "a logical assignment is not a plain install",
      code: `import { Mesh, Vector3 } from "three";
const object = new Mesh();
object.onBeforeRender ??= () => {
  new Vector3();
};`,
    },
    {
      name: "a prototype rewrite is not a per-object install",
      code: `import { Mesh, Vector3 } from "three";
Mesh.prototype.onBeforeRender = () => {
  new Vector3();
};`,
    },
    {
      name: "a dynamic hook name",
      code: `import { Mesh, Vector3 } from "three";
const object = new Mesh();
object[hookName] = () => {
  new Vector3();
};`,
    },
    {
      name: "a mutable receiver binding",
      code: `import { Mesh, Vector3 } from "three";
let object = new Mesh();
object = other;
object.onBeforeRender = () => {
  new Vector3();
};`,
    },
    {
      name: "a receiver reached through two alias hops",
      code: `import { Mesh, Vector3 } from "three";
const created = new Mesh();
const middle = created;
const object = middle;
object.onBeforeRender = () => {
  new Vector3();
};`,
    },
    {
      name: "an unresolved right-hand side",
      code: `import { Mesh, Vector3 } from "three";
const object = new Mesh();
object.onBeforeRender = handlers.step;`,
    },
    {
      name: "allocation nested inside a render hook",
      code: `import { Mesh, Vector3 } from "three";
const object = new Mesh();
object.onBeforeRender = () => {
  queue(() => {
    new Vector3();
  });
};`,
    },
  ],
  invalid: [
    {
      name: "AxesHelper render hook assignment",
      code: `import { AxesHelper, Vector3 } from "three";
const helper = new AxesHelper();
helper.onBeforeRender = () => {
  new Vector3();
};`,
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
      name: "Box3Helper render hook assignment",
      code: `import { Box3Helper, Vector3 } from "three";
const helper = new Box3Helper();
helper.onBeforeRender = () => {
  new Vector3();
};`,
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
      name: "BoxHelper render hook assignment",
      code: `import { BoxHelper, Vector3 } from "three";
const helper = new BoxHelper();
helper.onBeforeRender = () => {
  new Vector3();
};`,
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
      name: "CameraHelper render hook assignment",
      code: `import { CameraHelper, Vector3 } from "three";
const helper = new CameraHelper();
helper.onBeforeRender = () => {
  new Vector3();
};`,
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
      name: "GridHelper render hook assignment",
      code: `import { GridHelper, Vector3 } from "three";
const helper = new GridHelper();
helper.onBeforeRender = () => {
  new Vector3();
};`,
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
      name: "PlaneHelper render hook assignment",
      code: `import { PlaneHelper, Vector3 } from "three";
const helper = new PlaneHelper();
helper.onBeforeRender = () => {
  new Vector3();
};`,
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
      name: "PointLightHelper render hook assignment",
      code: `import { PointLightHelper, Vector3 } from "three";
const helper = new PointLightHelper();
helper.onBeforeRender = () => {
  new Vector3();
};`,
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
      name: "PolarGridHelper render hook assignment",
      code: `import { PolarGridHelper, Vector3 } from "three";
const helper = new PolarGridHelper();
helper.onBeforeRender = () => {
  new Vector3();
};`,
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
      name: "SkeletonHelper render hook assignment",
      code: `import { SkeletonHelper, Vector3 } from "three";
const helper = new SkeletonHelper();
helper.onBeforeRender = () => {
  new Vector3();
};`,
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
      name: "BoxHelper direct subclass render hook method",
      code: `import { BoxHelper, Vector3 } from "three";
class CustomBoxHelper extends BoxHelper {
  onAfterRender() {
    new Vector3();
  }
}`,
      output: null,
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
      name: "PlaneHelper direct subclass render hook method",
      code: `import { PlaneHelper, Vector3 } from "three";
class CustomPlaneHelper extends PlaneHelper {
  onAfterRender() {
    new Vector3();
  }
}`,
      output: null,
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
      name: "PointLightHelper direct subclass render hook method",
      code: `import { PointLightHelper, Vector3 } from "three";
class CustomPointLightHelper extends PointLightHelper {
  onAfterRender() {
    new Vector3();
  }
}`,
      output: null,
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
      name: "BatchedMesh render hook assignment",
      code: `import { BatchedMesh, Vector3 } from "three/webgpu";
const object = new BatchedMesh();
object.onAfterRender = () => {
  new Vector3();
};`,
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
      name: "InstancedMesh render hook assignment",
      code: `import { InstancedMesh, Vector3 } from "three/webgpu";
const object = new InstancedMesh();
object.onAfterRender = () => {
  new Vector3();
};`,
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
      name: "Line render hook assignment",
      code: `import { Line, Vector3 } from "three/webgpu";
const object = new Line();
object.onAfterRender = () => {
  new Vector3();
};`,
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
      name: "LineSegments render hook assignment",
      code: `import { LineSegments, Vector3 } from "three/webgpu";
const object = new LineSegments();
object.onAfterRender = () => {
  new Vector3();
};`,
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
      name: "Mesh render hook assignment",
      code: `import { Mesh, Vector3 } from "three/webgpu";
const object = new Mesh();
object.onAfterRender = () => {
  new Vector3();
};`,
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
      name: "Points render hook assignment",
      code: `import { Points, Vector3 } from "three/webgpu";
const object = new Points();
object.onAfterRender = () => {
  new Vector3();
};`,
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
      name: "Scene render hook assignment",
      code: `import { Scene, Vector3 } from "three/webgpu";
const object = new Scene();
object.onAfterRender = () => {
  new Vector3();
};`,
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
      name: "SkinnedMesh render hook assignment",
      code: `import { SkinnedMesh, Vector3 } from "three/webgpu";
const object = new SkinnedMesh();
object.onAfterRender = () => {
  new Vector3();
};`,
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
      name: "Sprite render hook assignment",
      code: `import { Sprite, Vector3 } from "three/webgpu";
const object = new Sprite();
object.onAfterRender = () => {
  new Vector3();
};`,
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
      name: "render hook resolved through an immutable callback alias",
      code: `import { Mesh, Vector3 } from "three";
const object = new Mesh();
const step = () => {
  new Vector3();
};
object.onBeforeRender = step;`,
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
      name: "render hook installed through one receiver alias hop",
      code: `import { Mesh, Vector3 } from "three";
const created = new Mesh();
const object = created;
object.onBeforeRender = () => {
  new Vector3();
};`,
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
      name: "render hook name reached through a computed string literal",
      code: `import { Mesh, Vector3 } from "three";
const object = new Mesh();
object["onBeforeRender"] = () => {
  new Vector3();
};`,
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
      name: "render hook declared as a direct subclass method",
      code: `import { Mesh, Vector3 } from "three";
class CustomMesh extends Mesh {
  onBeforeRender() {
    new Vector3();
  }
}`,
      output: null,
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
      name: "render hook declared as a non-static class field",
      code: `import { Mesh, Vector3 } from "three";
class CustomMesh extends Mesh {
  onAfterRender = () => {
    new Vector3();
  };
}`,
      output: null,
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
      name: "render hook declared on an immutable class expression",
      code: `import { Mesh, Vector3 } from "three";
const CustomMesh = class extends Mesh {
  onBeforeRender() {
    new Vector3();
  }
};`,
      output: null,
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
      name: "TypeScript non-null receiver stays transparent",
      code: `import { Mesh, Vector3 } from "three";
const object = new Mesh();
object!.onBeforeRender = () => {
  new Vector3();
};`,
      output: null,
      languageOptions: tsLanguageOptions,
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
  ],
});

/*
 * One function can be reached by several dispatch mechanisms, so registrations
 * merge into a kind set rather than overwriting. These fixtures pin that the merge
 * is order-independent and that each rule still selects the kinds it cares about.
 */
ruleTester.run("shared contract: overlapping hot kinds keep useFrame", setStateRule, {
  valid: [],
  invalid: [
    {
      name: "a callback registered as both useFrame and a sort comparator",
      code: `import { useFrame } from "@react-three/fiber";
import { useState } from "react";
import { WebGLRenderer } from "three";
const [count, setCount] = useState(0);
const renderer = new WebGLRenderer();
const step = () => {
  setCount(1);
};
renderer.setOpaqueSort(step);
useFrame(step);`,
      output: null,
      errors: [
        {
          messageId: "stateSetterInUseFrame",
          data: { name: "setCount" },
          line: 7,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "a callback registered as both useFrame and an object render hook",
      code: `import { useFrame } from "@react-three/fiber";
import { useState } from "react";
import { Mesh } from "three";
const [count, setCount] = useState(0);
const mesh = new Mesh();
const step = () => {
  setCount(1);
};
mesh.onBeforeRender = step;
useFrame(step);`,
      output: null,
      errors: [
        {
          messageId: "stateSetterInUseFrame",
          data: { name: "setCount" },
          line: 7,
          column: 3,
          suggestions: [],
        },
      ],
    },
  ],
});

ruleTester.run("shared contract: overlapping hot kinds keep the other family", allocationRule, {
  valid: [
    {
      name: "a useFrame-only callback stays delegated to the upstream plugin",
      code: `import { useFrame } from "@react-three/fiber";
import { Vector3 } from "three";
useFrame(() => {
  new Vector3();
});`,
    },
  ],
  invalid: [
    {
      name: "sort registration survives a later useFrame registration",
      code: `import { useFrame } from "@react-three/fiber";
import { Vector3, WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const step = () => {
  new Vector3();
};
renderer.setOpaqueSort(step);
useFrame(step);`,
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
      name: "sort registration survives an earlier useFrame registration",
      code: `import { useFrame } from "@react-three/fiber";
import { Vector3, WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const step = () => {
  new Vector3();
};
useFrame(step);
renderer.setOpaqueSort(step);`,
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
      name: "render-hook registration survives a useFrame registration",
      code: `import { useFrame } from "@react-three/fiber";
import { Mesh, Vector3 } from "three";
const mesh = new Mesh();
const step = () => {
  new Vector3();
};
useFrame(step);
mesh.onAfterRender = step;`,
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
  ],
});

ruleTester.run("shared contract: method-call allocation includes useFrame", allocatingCallRule, {
  valid: [
    {
      name: "a stable scratch target in a useFrame callback",
      code: `import { useFrame } from "@react-three/fiber";
import { Vector3 } from "three";
const value = new Vector3();
const scratch = [];
useFrame(() => {
  value.toArray(scratch);
});`,
    },
  ],
  invalid: [
    {
      name: "a missing reusable target in a useFrame callback",
      code: `import { useFrame } from "@react-three/fiber";
import { Vector3 } from "three";
const value = new Vector3();
useFrame(() => {
  value.toArray();
});`,
      output: null,
      errors: [
        {
          messageId: "missingReusableTargetInLoop",
          data: { receiver: "value", method: "toArray" },
          line: 5,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "a missing reusable target in an object render hook",
      code: `import { Mesh, Vector3 } from "three";
const value = new Vector3();
const mesh = new Mesh();
mesh.onBeforeRender = () => {
  value.toArray();
};`,
      output: null,
      errors: [
        {
          messageId: "missingReusableTargetInLoop",
          data: { receiver: "value", method: "toArray" },
          line: 5,
          column: 3,
          suggestions: [],
        },
      ],
    },
  ],
});

/*
 * The ordinary resolver's source list stays closed even though one rule may accept
 * official loader modules through a caller-supplied predicate. The allocation rule
 * uses `resolveImportedValue`, so these fixtures pin that widening the loader rule
 * did not widen anything else.
 */
ruleTester.run("shared contract: ordinary resolver source boundary", allocationRule, {
  valid: [
    {
      name: "the addons barrel is not a recognized source",
      code: `import { Vector3 } from "three/addons";
requestAnimationFrame(() => {
  new Vector3();
});`,
    },
    {
      name: "a direct addon loader module is not a recognized source",
      code: `import { Vector3 } from "three/addons/loaders/OBJLoader.js";
requestAnimationFrame(() => {
  new Vector3();
});`,
    },
    {
      name: "a compatibility example path is not a recognized source",
      code: `import { Vector3 } from "three/examples/jsm/loaders/OBJLoader.js";
requestAnimationFrame(() => {
  new Vector3();
});`,
    },
    {
      name: "an arbitrary deep three path is not a recognized source",
      code: `import { Vector3 } from "three/src/math/Vector3.js";
requestAnimationFrame(() => {
  new Vector3();
});`,
    },
    {
      name: "the tsl subpath is not a recognized source",
      code: `import { Vector3 } from "three/tsl";
requestAnimationFrame(() => {
  new Vector3();
});`,
    },
  ],
  invalid: [],
});

/*
 * One traversal per file serves every rule lookup, and every hot callback in the
 * file is collected by it — including two different dispatch families side by side.
 */
ruleTester.run("shared contract: one traversal collects every callback", allocationRule, {
  valid: [],
  invalid: [
    {
      name: "two callbacks from different families in one file",
      code: `import { Mesh, Vector3, WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const mesh = new Mesh();
renderer.setOpaqueSort((a, b) => {
  new Vector3();
  return a.z - b.z;
});
mesh.onAfterRender = () => {
  new Vector3();
};
requestAnimationFrame(() => {
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
        {
          messageId: "newThreeObjectInLoop",
          data: { constructor: "Vector3" },
          line: 9,
          column: 3,
          suggestions: [],
        },
        {
          messageId: "newThreeObjectInLoop",
          data: { constructor: "Vector3" },
          line: 12,
          column: 3,
          suggestions: [],
        },
      ],
    },
  ],
});
