import rule from "../../src/rules/prefer-bvh-first-hit-only.js";
import { createRuleTester, tsLanguageOptions } from "../helpers/rule-tester.js";

const ruleTester = createRuleTester();

/** Prelude that installs three-mesh-bvh's accelerated raycast on `Mesh`. */
const setup = `import { Mesh, Raycaster } from "three";
import { acceleratedRaycast } from "three-mesh-bvh";
Mesh.prototype.raycast = acceleratedRaycast;
`;

ruleTester.run("prefer-bvh-first-hit-only", rule, {
  valid: [
    {
      name: "firstHitOnly already set before the cast",
      code: `${setup}function pick(mesh) {
  const raycaster = new Raycaster();
  raycaster.firstHitOnly = true;
  const hits = raycaster.intersectObject(mesh);
  return hits[0];
}`,
    },
    {
      name: "firstHitOnly set at an outer straight-line level",
      code: `${setup}const raycaster = new Raycaster();
raycaster.firstHitOnly = true;
const hits = raycaster.intersectObject(scene);
export const first = hits[0];`,
    },
    {
      name: "unknown firstHitOnly value",
      code: `${setup}function pick(mesh, wantFirst) {
  const raycaster = new Raycaster();
  raycaster.firstHitOnly = wantFirst;
  const hits = raycaster.intersectObject(mesh);
  return hits[0];
}`,
    },
    {
      name: "result is iterated",
      code: `${setup}function pick(mesh) {
  const raycaster = new Raycaster();
  const hits = raycaster.intersectObject(mesh);
  for (const hit of hits) {
    use(hit);
  }
}`,
    },
    {
      name: "result is returned",
      code: `${setup}function pick(mesh) {
  const raycaster = new Raycaster();
  const hits = raycaster.intersectObject(mesh);
  return hits;
}`,
    },
    {
      name: "result is passed as an argument",
      code: `${setup}function pick(mesh) {
  const raycaster = new Raycaster();
  const hits = raycaster.intersectObject(mesh);
  render(hits);
}`,
    },
    {
      name: "result is spread",
      code: `${setup}function pick(mesh) {
  const raycaster = new Raycaster();
  const hits = raycaster.intersectObject(mesh);
  return [...hits];
}`,
    },
    {
      name: "result is unused",
      code: `${setup}function pick(mesh) {
  const raycaster = new Raycaster();
  const hits = raycaster.intersectObject(mesh);
}`,
    },
    {
      name: "another index is read",
      code: `${setup}function pick(mesh) {
  const raycaster = new Raycaster();
  const hits = raycaster.intersectObject(mesh);
  return hits[1];
}`,
    },
    {
      name: "at with a non-zero index",
      code: `${setup}function pick(mesh) {
  const raycaster = new Raycaster();
  const hits = raycaster.intersectObject(mesh);
  return hits.at(1);
}`,
    },
    {
      name: "another array method",
      code: `${setup}function pick(mesh) {
  const raycaster = new Raycaster();
  const hits = raycaster.intersectObject(mesh);
  return hits.find(isVisible);
}`,
    },
    {
      name: "numeric length comparison other than zero",
      code: `${setup}function pick(mesh) {
  const raycaster = new Raycaster();
  const hits = raycaster.intersectObject(mesh);
  return hits.length > 1;
}`,
    },
    {
      name: "length used as a count",
      code: `${setup}function pick(mesh) {
  const raycaster = new Raycaster();
  const hits = raycaster.intersectObject(mesh);
  report(hits.length);
}`,
    },
    {
      name: "result captured by a nested function",
      code: `${setup}function pick(mesh) {
  const raycaster = new Raycaster();
  const hits = raycaster.intersectObject(mesh);
  return () => hits[0];
}`,
    },
    {
      name: "destructured result already takes the first hit",
      code: `${setup}function pick(mesh) {
  const raycaster = new Raycaster();
  const [first] = raycaster.intersectObject(mesh);
  return first;
}`,
    },
    {
      name: "mutable result binding",
      code: `${setup}function pick(mesh) {
  const raycaster = new Raycaster();
  let hits = raycaster.intersectObject(mesh);
  hits = [];
  return hits[0];
}`,
    },
    {
      name: "raycaster read from a nested function is not local",
      code: `${setup}const raycaster = new Raycaster();
export function pick(mesh) {
  const hits = raycaster.intersectObject(mesh);
  return hits[0];
}`,
    },
    {
      name: "raycaster passed to other code",
      code: `${setup}function pick(mesh) {
  const raycaster = new Raycaster();
  configure(raycaster);
  const hits = raycaster.intersectObject(mesh);
  return hits[0];
}`,
    },
    {
      name: "mutable raycaster binding",
      code: `${setup}function pick(mesh) {
  let raycaster = new Raycaster();
  raycaster = shared;
  const hits = raycaster.intersectObject(mesh);
  return hits[0];
}`,
    },
    {
      name: "raycaster from an unrelated module",
      code: `${setup}import { Raycaster as CustomRaycaster } from "custom-picking";
function pick(mesh) {
  const raycaster = new CustomRaycaster();
  const hits = raycaster.intersectObject(mesh);
  return hits[0];
}`,
    },
    {
      name: "no prototype activation",
      code: `import { Mesh, Raycaster } from "three";
import { acceleratedRaycast } from "three-mesh-bvh";
function pick(mesh) {
  const raycaster = new Raycaster();
  const hits = raycaster.intersectObject(mesh);
  return hits[0];
}`,
    },
    {
      name: "prototype activation with an unrelated function",
      code: `import { Mesh, Raycaster } from "three";
import { acceleratedRaycast } from "three-mesh-bvh";
Mesh.prototype.raycast = customRaycast;
function pick(mesh) {
  const raycaster = new Raycaster();
  const hits = raycaster.intersectObject(mesh);
  return hits[0];
}`,
    },
    {
      name: "prototype activation on a non-Three class",
      code: `import { Raycaster } from "three";
import { acceleratedRaycast } from "three-mesh-bvh";
import { Mesh } from "custom-three";
Mesh.prototype.raycast = acceleratedRaycast;
function pick(mesh) {
  const raycaster = new Raycaster();
  const hits = raycaster.intersectObject(mesh);
  return hits[0];
}`,
    },
    {
      name: "prototype activation on an unsupported class",
      code: `import { Line, Raycaster } from "three";
import { acceleratedRaycast } from "three-mesh-bvh";
Line.prototype.raycast = acceleratedRaycast;
function pick(mesh) {
  const raycaster = new Raycaster();
  const hits = raycaster.intersectObject(mesh);
  return hits[0];
}`,
    },
    {
      name: "type-only three-mesh-bvh import",
      code: `import type { MeshBVH } from "three-mesh-bvh";
import { Raycaster } from "three";
declare const bvh: MeshBVH;
function pick(mesh) {
  const raycaster = new Raycaster();
  const hits = raycaster.intersectObject(mesh);
  return hits[0];
}`,
      languageOptions: tsLanguageOptions,
    },
    {
      name: "a different raycaster method",
      code: `${setup}function pick(camera) {
  const raycaster = new Raycaster();
  const ray = raycaster.setFromCamera(camera);
  return ray[0];
}`,
    },
  ],
  invalid: [
    {
      name: "first hit by index",
      code: `${setup}function pick(mesh) {
  const raycaster = new Raycaster();
  const hits = raycaster.intersectObject(mesh);
  return hits[0];
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
      name: "first hit by at(0)",
      code: `${setup}function pick(mesh) {
  const raycaster = new Raycaster();
  const hits = raycaster.intersectObject(mesh);
  return hits.at(0);
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
      name: "emptiness by negation",
      code: `${setup}function pick(mesh) {
  const raycaster = new Raycaster();
  const hits = raycaster.intersectObject(mesh);
  return !hits.length;
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
      name: "emptiness by comparison with zero",
      code: `${setup}function pick(mesh) {
  const raycaster = new Raycaster();
  const hits = raycaster.intersectObject(mesh);
  return hits.length === 0;
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
      name: "emptiness in an if test",
      code: `${setup}function pick(mesh) {
  const raycaster = new Raycaster();
  const hits = raycaster.intersectObject(mesh);
  if (hits.length) {
    use(hits[0]);
  }
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
      name: "emptiness by greater-than-zero comparison",
      code: `${setup}function pick(mesh) {
  const raycaster = new Raycaster();
  const hits = raycaster.intersectObject(mesh);
  return hits.length > 0;
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
      name: "intersectObjects with many targets",
      code: `${setup}function pick(meshes) {
  const raycaster = new Raycaster();
  const hits = raycaster.intersectObjects(meshes, true);
  return hits[0];
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
      name: "BatchedMesh prototype activation",
      code: `import { BatchedMesh, Raycaster } from "three";
import { acceleratedRaycast } from "three-mesh-bvh";
BatchedMesh.prototype.raycast = acceleratedRaycast;
function pick(mesh) {
  const raycaster = new Raycaster();
  const hits = raycaster.intersectObject(mesh);
  return hits[0];
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
      name: "namespace-imported activation and raycaster",
      code: `import * as THREE from "three";
import * as bvh from "three-mesh-bvh";
THREE.Mesh.prototype.raycast = bvh.acceleratedRaycast;
function pick(mesh) {
  const raycaster = new THREE.Raycaster();
  const hits = raycaster.intersectObject(mesh);
  return hits[0];
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
      name: "a later false write cancels an earlier true write",
      code: `${setup}function pick(mesh) {
  const raycaster = new Raycaster();
  raycaster.firstHitOnly = true;
  raycaster.firstHitOnly = false;
  const hits = raycaster.intersectObject(mesh);
  return hits[0];
}`,
      output: null,
      errors: [
        {
          messageId: "preferFirstHitOnly",
          data: { raycaster: "raycaster" },
          line: 8,
          column: 16,
          suggestions: [],
        },
      ],
    },
    {
      name: "a conditional write does not dominate the cast",
      code: `${setup}function pick(mesh, fast) {
  const raycaster = new Raycaster();
  if (fast) {
    raycaster.firstHitOnly = true;
  }
  const hits = raycaster.intersectObject(mesh);
  return hits[0];
}`,
      output: null,
      errors: [
        {
          messageId: "preferFirstHitOnly",
          data: { raycaster: "raycaster" },
          line: 9,
          column: 16,
          suggestions: [],
        },
      ],
    },
    {
      name: "a write after the cast cannot affect it",
      code: `${setup}function pick(mesh) {
  const raycaster = new Raycaster();
  const hits = raycaster.intersectObject(mesh);
  raycaster.firstHitOnly = true;
  return hits[0];
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
      name: "module-level cast next to a module-level raycaster",
      code: `${setup}const raycaster = new Raycaster();
const hits = raycaster.intersectObject(scene);
export const first = hits[0];`,
      output: null,
      errors: [
        {
          messageId: "preferFirstHitOnly",
          data: { raycaster: "raycaster" },
          line: 5,
          column: 14,
          suggestions: [],
        },
      ],
    },
    {
      name: "two proven uses of the same result",
      code: `${setup}function pick(mesh) {
  const raycaster = new Raycaster();
  const hits = raycaster.intersectObject(mesh);
  if (!hits.length) {
    return null;
  }
  return hits[0];
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
  ],
});
