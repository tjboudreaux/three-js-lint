import allocationRule from "../src/rules/no-three-allocation-in-render-loop.js";
import bvhRule from "../src/rules/prefer-bvh-first-hit-only.js";
import dprRule from "../src/rules/no-direct-device-pixel-ratio.js";
import jsxRule from "../src/rules/no-new-in-jsx-props.js";
import setAttributeRule from "../src/rules/no-transform-set-attribute-in-tick.js";
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
