import rule from "../../src/rules/no-bounds-recompute-in-render-loop.js";
import { createRuleTester, tsLanguageOptions } from "../helpers/rule-tester.js";

const ruleTester = createRuleTester();

/*
 * Every method and receiver family is covered, together with a positive and a
 * refusal case for each construction-argument requirement, each spread, and each
 * statically nullish required slot.
 */
ruleTester.run("no-bounds-recompute-in-render-loop", rule, {
  valid: [
    {
      name: "bounds scan outside the loop",
      code: `import { Box3 } from "three";
const box = new Box3();
box.setFromObject(scene);`,
    },
    {
      name: "expandByPoint touches one point",
      code: `import { Box3 } from "three";
const box = new Box3();
requestAnimationFrame(() => {
  box.expandByPoint(point);
});`,
    },
    {
      name: "union of two boxes is not a scan",
      code: `import { Box3 } from "three";
const box = new Box3();
requestAnimationFrame(() => {
  box.union(other);
});`,
    },
    {
      name: "getCenter writes into a required target",
      code: `import { Box3 } from "three";
const box = new Box3();
requestAnimationFrame(() => {
  box.getCenter(center);
});`,
    },
    {
      name: "getSize writes into a required target",
      code: `import { Box3 } from "three";
const box = new Box3();
requestAnimationFrame(() => {
  box.getSize(size);
});`,
    },
    {
      name: "Sphere expandByPoint touches one point",
      code: `import { Sphere } from "three";
const sphere = new Sphere();
requestAnimationFrame(() => {
  sphere.expandByPoint(point);
});`,
    },
    {
      name: "setFromBufferAttribute with two arguments is not the documented call",
      code: `import { Box3 } from "three";
const box = new Box3();
requestAnimationFrame(() => {
  box.setFromBufferAttribute(attribute, true);
});`,
    },
    {
      name: "setFromObject with three arguments is not the documented call",
      code: `import { Box3 } from "three";
const box = new Box3();
requestAnimationFrame(() => {
  box.setFromObject(scene, true, extra);
});`,
    },
    {
      name: "spread hides the argument count",
      code: `import { Box3 } from "three";
const box = new Box3();
const parts = [scene];
requestAnimationFrame(() => {
  box.setFromObject(...parts);
});`,
    },
    {
      name: "BoxHelper.update without a constructed object",
      code: `import { BoxHelper } from "three";
const helper = new BoxHelper();
requestAnimationFrame(() => {
  helper.update();
});`,
    },
    {
      name: "BoxHelper.update with a statically null object",
      code: `import { BoxHelper } from "three";
const helper = new BoxHelper(null);
requestAnimationFrame(() => {
  helper.update();
});`,
    },
    {
      name: "BoxHelper.update with an explicitly undefined object",
      code: `import { BoxHelper } from "three";
const helper = new BoxHelper(undefined);
requestAnimationFrame(() => {
  helper.update();
});`,
    },
    {
      name: "BoxHelper.update with a void object",
      code: `import { BoxHelper } from "three";
const helper = new BoxHelper(void 0);
requestAnimationFrame(() => {
  helper.update();
});`,
    },
    {
      name: "BoxHelper.update with three construction arguments",
      code: `import { BoxHelper } from "three";
const helper = new BoxHelper(mesh, 0xffff00, extra);
requestAnimationFrame(() => {
  helper.update();
});`,
    },
    {
      name: "BoxHelper.update with a spread construction",
      code: `import { BoxHelper } from "three";
const parts = [mesh];
const helper = new BoxHelper(...parts);
requestAnimationFrame(() => {
  helper.update();
});`,
    },
    {
      name: "BoxHelper.update with an argument",
      code: `import { BoxHelper } from "three";
const helper = new BoxHelper(mesh);
requestAnimationFrame(() => {
  helper.update(true);
});`,
    },
    {
      name: "InstancedMesh constructed with two arguments",
      code: `import { InstancedMesh } from "three";
const mesh = new InstancedMesh(geometry, material);
requestAnimationFrame(() => {
  mesh.computeBoundingBox();
});`,
    },
    {
      name: "InstancedMesh constructed with a null geometry",
      code: `import { InstancedMesh } from "three";
const mesh = new InstancedMesh(null, material, 10);
requestAnimationFrame(() => {
  mesh.computeBoundingBox();
});`,
    },
    {
      name: "InstancedMesh constructed with an undefined count",
      code: `import { InstancedMesh } from "three";
const mesh = new InstancedMesh(geometry, material, undefined);
requestAnimationFrame(() => {
  mesh.computeBoundingSphere();
});`,
    },
    {
      name: "InstancedMesh constructed with a spread",
      code: `import { InstancedMesh } from "three";
const parts = [geometry, material, 10];
const mesh = new InstancedMesh(...parts);
requestAnimationFrame(() => {
  mesh.computeBoundingBox();
});`,
    },
    {
      name: "SkinnedMesh constructed with no arguments",
      code: `import { SkinnedMesh } from "three";
const mesh = new SkinnedMesh();
requestAnimationFrame(() => {
  mesh.computeBoundingBox();
});`,
    },
    {
      name: "SkinnedMesh constructed with a null geometry",
      code: `import { SkinnedMesh } from "three";
const mesh = new SkinnedMesh(null, material);
requestAnimationFrame(() => {
  mesh.computeBoundingSphere();
});`,
    },
    {
      name: "SkinnedMesh constructed with three arguments",
      code: `import { SkinnedMesh } from "three";
const mesh = new SkinnedMesh(geometry, material, extra);
requestAnimationFrame(() => {
  mesh.computeBoundingBox();
});`,
    },
    {
      name: "BatchedMesh constructed with one argument",
      code: `import { BatchedMesh } from "three";
const mesh = new BatchedMesh(64);
requestAnimationFrame(() => {
  mesh.computeBoundingBox();
});`,
    },
    {
      name: "BatchedMesh constructed with a null vertex count",
      code: `import { BatchedMesh } from "three";
const mesh = new BatchedMesh(64, null);
requestAnimationFrame(() => {
  mesh.computeBoundingSphere();
});`,
    },
    {
      name: "BatchedMesh constructed with five arguments",
      code: `import { BatchedMesh } from "three";
const mesh = new BatchedMesh(64, 1024, 2048, material, extra);
requestAnimationFrame(() => {
  mesh.computeBoundingBox();
});`,
    },
    {
      name: "Mesh has no cataloged bounds method",
      code: `import { Mesh } from "three";
const mesh = new Mesh(geometry, material);
requestAnimationFrame(() => {
  mesh.computeBoundingBox();
});`,
    },
    {
      name: "user class with a matching method name",
      code: `class Bounds {}
const box = new Bounds();
requestAnimationFrame(() => {
  box.setFromObject(scene);
});`,
    },
    {
      name: "mutable receiver binding",
      code: `import { Box3 } from "three";
let box = new Box3();
box = other;
requestAnimationFrame(() => {
  box.setFromObject(scene);
});`,
    },
    {
      name: "receiver reached through two alias hops",
      code: `import { Box3 } from "three";
const created = new Box3();
const middle = created;
const box = middle;
requestAnimationFrame(() => {
  box.setFromObject(scene);
});`,
    },
    {
      name: "scan in a nested callback",
      code: `import { Box3 } from "three";
const box = new Box3();
requestAnimationFrame(() => {
  queue(() => {
    box.setFromObject(scene);
  });
});`,
    },
    {
      name: "same-named class from an unrelated module",
      code: `import { Box3 } from "my-math";
const box = new Box3();
requestAnimationFrame(() => {
  box.setFromObject(scene);
});`,
    },
  ],
  invalid: [
    {
      name: "Box3.setFromObject",
      code: `import { Box3 } from "three";
const box = new Box3();
requestAnimationFrame(() => {
  box.setFromObject(scene);
});`,
      output: null,
      errors: [
        {
          messageId: "boundsRecomputeInLoop",
          data: { receiver: "box", method: "setFromObject" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "Box3.setFromObject with a precise flag",
      code: `import { Box3 } from "three";
const box = new Box3();
requestAnimationFrame(() => {
  box.setFromObject(scene, true);
});`,
      output: null,
      errors: [
        {
          messageId: "boundsRecomputeInLoop",
          data: { receiver: "box", method: "setFromObject" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "Box3.expandByObject",
      code: `import { Box3 } from "three/webgpu";
const box = new Box3();
requestAnimationFrame(() => {
  box.expandByObject(scene);
});`,
      output: null,
      errors: [
        {
          messageId: "boundsRecomputeInLoop",
          data: { receiver: "box", method: "expandByObject" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "Box3.setFromBufferAttribute",
      code: `import { Box3 } from "three";
const box = new Box3();
requestAnimationFrame(() => {
  box.setFromBufferAttribute(attribute);
});`,
      output: null,
      errors: [
        {
          messageId: "boundsRecomputeInLoop",
          data: { receiver: "box", method: "setFromBufferAttribute" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "Box3.setFromArray",
      code: `import { Box3 } from "three";
const box = new Box3();
requestAnimationFrame(() => {
  box.setFromArray(values);
});`,
      output: null,
      errors: [
        {
          messageId: "boundsRecomputeInLoop",
          data: { receiver: "box", method: "setFromArray" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "Box3.setFromPoints",
      code: `import { Box3 } from "three";
const box = new Box3();
requestAnimationFrame(() => {
  box.setFromPoints(points);
});`,
      output: null,
      errors: [
        {
          messageId: "boundsRecomputeInLoop",
          data: { receiver: "box", method: "setFromPoints" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "Sphere.setFromPoints",
      code: `import { Sphere } from "three";
const sphere = new Sphere();
requestAnimationFrame(() => {
  sphere.setFromPoints(points);
});`,
      output: null,
      errors: [
        {
          messageId: "boundsRecomputeInLoop",
          data: { receiver: "sphere", method: "setFromPoints" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "Sphere.setFromPoints with an optional centre",
      code: `import { Sphere } from "three";
const sphere = new Sphere();
requestAnimationFrame(() => {
  sphere.setFromPoints(points, center);
});`,
      output: null,
      errors: [
        {
          messageId: "boundsRecomputeInLoop",
          data: { receiver: "sphere", method: "setFromPoints" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "BoxHelper.setFromObject",
      code: `import { BoxHelper } from "three";
const helper = new BoxHelper(mesh);
requestAnimationFrame(() => {
  helper.setFromObject(other);
});`,
      output: null,
      errors: [
        {
          messageId: "boundsRecomputeInLoop",
          data: { receiver: "helper", method: "setFromObject" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "BoxHelper.update with a proven object",
      code: `import { BoxHelper } from "three";
const helper = new BoxHelper(mesh);
requestAnimationFrame(() => {
  helper.update();
});`,
      output: null,
      errors: [
        {
          messageId: "boundsRecomputeInLoop",
          data: { receiver: "helper", method: "update" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "BoxHelper.update with an explicit colour",
      code: `import { BoxHelper } from "three";
const helper = new BoxHelper(mesh, 0xff0000);
requestAnimationFrame(() => {
  helper.update();
});`,
      output: null,
      errors: [
        {
          messageId: "boundsRecomputeInLoop",
          data: { receiver: "helper", method: "update" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "InstancedMesh.computeBoundingBox",
      code: `import { InstancedMesh } from "three";
const mesh = new InstancedMesh(geometry, material, 10);
requestAnimationFrame(() => {
  mesh.computeBoundingBox();
});`,
      output: null,
      errors: [
        {
          messageId: "boundsRecomputeInLoop",
          data: { receiver: "mesh", method: "computeBoundingBox" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "InstancedMesh.computeBoundingSphere with an undefined material",
      code: `import { InstancedMesh } from "three";
const mesh = new InstancedMesh(geometry, undefined, 10);
requestAnimationFrame(() => {
  mesh.computeBoundingSphere();
});`,
      output: null,
      errors: [
        {
          messageId: "boundsRecomputeInLoop",
          data: { receiver: "mesh", method: "computeBoundingSphere" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "SkinnedMesh.computeBoundingBox with one construction argument",
      code: `import { SkinnedMesh } from "three";
const mesh = new SkinnedMesh(geometry);
requestAnimationFrame(() => {
  mesh.computeBoundingBox();
});`,
      output: null,
      errors: [
        {
          messageId: "boundsRecomputeInLoop",
          data: { receiver: "mesh", method: "computeBoundingBox" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "SkinnedMesh.computeBoundingSphere with two construction arguments",
      code: `import { SkinnedMesh } from "three";
const mesh = new SkinnedMesh(geometry, material);
requestAnimationFrame(() => {
  mesh.computeBoundingSphere();
});`,
      output: null,
      errors: [
        {
          messageId: "boundsRecomputeInLoop",
          data: { receiver: "mesh", method: "computeBoundingSphere" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "BatchedMesh.computeBoundingBox with two construction arguments",
      code: `import { BatchedMesh } from "three";
const mesh = new BatchedMesh(64, 1024);
requestAnimationFrame(() => {
  mesh.computeBoundingBox();
});`,
      output: null,
      errors: [
        {
          messageId: "boundsRecomputeInLoop",
          data: { receiver: "mesh", method: "computeBoundingBox" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "BatchedMesh.computeBoundingSphere with four construction arguments",
      code: `import { BatchedMesh } from "three/webgpu";
const mesh = new BatchedMesh(64, 1024, 2048, material);
requestAnimationFrame(() => {
  mesh.computeBoundingSphere();
});`,
      output: null,
      errors: [
        {
          messageId: "boundsRecomputeInLoop",
          data: { receiver: "mesh", method: "computeBoundingSphere" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "namespace-imported Box3 in a tracked animation loop",
      code: `import * as THREE from "three";
const box = new THREE.Box3();
const renderer = new THREE.WebGLRenderer();
renderer.setAnimationLoop(() => {
  box.setFromObject(scene);
});`,
      output: null,
      errors: [
        {
          messageId: "boundsRecomputeInLoop",
          data: { receiver: "box", method: "setFromObject" },
          line: 5,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "receiver reached through one immutable alias hop",
      code: `import { Box3 } from "three";
const created = new Box3();
const box = created;
requestAnimationFrame(() => {
  box.setFromObject(scene);
});`,
      output: null,
      errors: [
        {
          messageId: "boundsRecomputeInLoop",
          data: { receiver: "box", method: "setFromObject" },
          line: 5,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "TypeScript non-null receiver stays transparent",
      code: `import { Box3 } from "three";
const box = new Box3();
requestAnimationFrame(() => {
  box!.setFromObject(scene);
});`,
      output: null,
      languageOptions: tsLanguageOptions,
      errors: [
        {
          messageId: "boundsRecomputeInLoop",
          data: { receiver: "box", method: "setFromObject" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "bounds scan in a cross-renderer object hook",
      code: `import { Box3, Mesh } from "three";
const box = new Box3();
const mesh = new Mesh();
mesh.onBeforeRender = () => {
  box.setFromObject(scene);
};`,
      output: null,
      errors: [
        {
          messageId: "boundsRecomputeInLoop",
          data: { receiver: "box", method: "setFromObject" },
          line: 5,
          column: 3,
          suggestions: [],
        },
      ],
    },
  ],
});
