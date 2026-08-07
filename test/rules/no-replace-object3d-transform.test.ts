import rule from "../../src/rules/no-replace-object3d-transform.js";
import { createRuleTester, tsLanguageOptions } from "../helpers/rule-tester.js";

const ruleTester = createRuleTester();

ruleTester.run("no-replace-object3d-transform", rule, {
  valid: [
    {
      name: "in-place set",
      code: `import { Mesh } from "three";
const mesh = new Mesh();
mesh.position.set(1, 2, 3);`,
    },
    {
      name: "in-place copy",
      code: `import { Mesh, Vector3 } from "three";
const mesh = new Mesh();
const target = new Vector3();
mesh.position.copy(target);`,
    },
    {
      name: "component write",
      code: `import { Mesh } from "three";
const mesh = new Mesh();
mesh.position.x = 1;`,
    },
    {
      name: "up is a writable Object3D property",
      code: `import { Mesh, Vector3 } from "three";
const mesh = new Mesh();
mesh.up = new Vector3(0, 0, 1);`,
    },
    {
      name: "material replacement is unrelated",
      code: `import { Mesh, MeshBasicMaterial } from "three";
const mesh = new Mesh();
mesh.material = new MeshBasicMaterial();`,
    },
    {
      name: "mismatched transform class",
      code: `import { Euler, Mesh } from "three";
const mesh = new Mesh();
mesh.position = new Euler();`,
    },
    {
      name: "computed property write",
      code: `import { Mesh, Vector3 } from "three";
const mesh = new Mesh();
mesh[transformKey] = new Vector3();`,
    },
    {
      name: "unknown owner",
      code: `import { Vector3 } from "three";
node.position = new Vector3();`,
    },
    {
      name: "owner is not an Object3D subclass",
      code: `import { Vector3, BufferGeometry } from "three";
const geometry = new BufferGeometry();
geometry.position = new Vector3();`,
    },
    {
      name: "mutable owner binding",
      code: `import { Mesh, Vector3 } from "three";
let mesh = new Mesh();
mesh = other;
mesh.position = new Vector3();`,
    },
    {
      name: "unknown value",
      code: `import { Mesh } from "three";
const mesh = new Mesh();
mesh.position = computeOffset();`,
    },
    {
      name: "clone of an untracked receiver",
      code: `import { Mesh } from "three";
const mesh = new Mesh();
mesh.position = source.clone();`,
    },
    {
      name: "compound assignment",
      code: `import { Mesh, Vector3 } from "three";
const mesh = new Mesh();
mesh.position ??= new Vector3();`,
    },
    {
      name: "Vector3 from an untracked module",
      code: `import { Mesh } from "three";
import { Vector3 } from "custom-math";
const mesh = new Mesh();
mesh.position = new Vector3();`,
    },
  ],
  invalid: [
    {
      name: "position replaced with a three-argument Vector3",
      code: `import { Mesh, Vector3 } from "three";
const mesh = new Mesh();
mesh.position = new Vector3(1, 2, 3);`,
      output: null,
      errors: [
        {
          messageId: "replaceObject3DTransform",
          data: { owner: "mesh", property: "position" },
          line: 3,
          column: 1,
          suggestions: [
            {
              messageId: "preserveWithSet",
              data: { property: "position" },
              output: `import { Mesh, Vector3 } from "three";
const mesh = new Mesh();
mesh.position.set(1, 2, 3);`,
            },
          ],
        },
      ],
    },
    {
      name: "scale replaced with a three-argument Vector3",
      code: `import { Group, Vector3 } from "three";
const group = new Group();
group.scale = new Vector3(2, 2, 2);`,
      output: null,
      errors: [
        {
          messageId: "replaceObject3DTransform",
          data: { owner: "group", property: "scale" },
          line: 3,
          column: 1,
          suggestions: [
            {
              messageId: "preserveWithSet",
              data: { property: "scale" },
              output: `import { Group, Vector3 } from "three";
const group = new Group();
group.scale.set(2, 2, 2);`,
            },
          ],
        },
      ],
    },
    {
      name: "rotation replaced with a three-argument Euler",
      code: `import { Euler, Mesh } from "three";
const mesh = new Mesh();
mesh.rotation = new Euler(0, 1, 0);`,
      output: null,
      errors: [
        {
          messageId: "replaceObject3DTransform",
          data: { owner: "mesh", property: "rotation" },
          line: 3,
          column: 1,
          suggestions: [
            {
              messageId: "preserveWithSet",
              data: { property: "rotation" },
              output: `import { Euler, Mesh } from "three";
const mesh = new Mesh();
mesh.rotation.set(0, 1, 0);`,
            },
          ],
        },
      ],
    },
    {
      name: "rotation replaced with a four-argument Euler",
      code: `import { Euler, Mesh } from "three";
const mesh = new Mesh();
mesh.rotation = new Euler(0, 1, 0, "YXZ");`,
      output: null,
      errors: [
        {
          messageId: "replaceObject3DTransform",
          data: { owner: "mesh", property: "rotation" },
          line: 3,
          column: 1,
          suggestions: [
            {
              messageId: "preserveWithSet",
              data: { property: "rotation" },
              output: `import { Euler, Mesh } from "three";
const mesh = new Mesh();
mesh.rotation.set(0, 1, 0, "YXZ");`,
            },
          ],
        },
      ],
    },
    {
      name: "quaternion replaced with a four-argument Quaternion",
      code: `import { Mesh, Quaternion } from "three";
const mesh = new Mesh();
mesh.quaternion = new Quaternion(0, 0, 0, 1);`,
      output: null,
      errors: [
        {
          messageId: "replaceObject3DTransform",
          data: { owner: "mesh", property: "quaternion" },
          line: 3,
          column: 1,
          suggestions: [
            {
              messageId: "preserveWithSet",
              data: { property: "quaternion" },
              output: `import { Mesh, Quaternion } from "three";
const mesh = new Mesh();
mesh.quaternion.set(0, 0, 0, 1);`,
            },
          ],
        },
      ],
    },
    {
      name: "clone of a tracked Vector3 suggests copy",
      code: `import { Mesh, Vector3 } from "three";
const mesh = new Mesh();
const target = new Vector3();
mesh.position = target.clone();`,
      output: null,
      errors: [
        {
          messageId: "replaceObject3DTransform",
          data: { owner: "mesh", property: "position" },
          line: 4,
          column: 1,
          suggestions: [
            {
              messageId: "preserveWithCopy",
              data: { property: "position" },
              output: `import { Mesh, Vector3 } from "three";
const mesh = new Mesh();
const target = new Vector3();
mesh.position.copy(target);`,
            },
          ],
        },
      ],
    },
    {
      name: "zero-argument construction has no safe rewrite",
      code: `import { Mesh, Vector3 } from "three";
const mesh = new Mesh();
mesh.position = new Vector3();`,
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
      name: "spread arguments have an unknown arity",
      code: `import { Mesh, Vector3 } from "three";
const mesh = new Mesh();
const parts = [1, 2, 3];
mesh.position = new Vector3(...parts);`,
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
    {
      name: "used assignment value has no safe rewrite",
      code: `import { Mesh, Vector3 } from "three";
const mesh = new Mesh();
const applied = (mesh.position = new Vector3(1, 2, 3));`,
      output: null,
      errors: [
        {
          messageId: "replaceObject3DTransform",
          data: { owner: "mesh", property: "position" },
          line: 3,
          column: 18,
          suggestions: [],
        },
      ],
    },
    {
      name: "namespace-imported classes",
      code: `import * as THREE from "three";
const camera = new THREE.PerspectiveCamera();
camera.position = new THREE.Vector3(0, 0, 5);`,
      output: null,
      errors: [
        {
          messageId: "replaceObject3DTransform",
          data: { owner: "camera", property: "position" },
          line: 3,
          column: 1,
          suggestions: [
            {
              messageId: "preserveWithSet",
              data: { property: "position" },
              output: `import * as THREE from "three";
const camera = new THREE.PerspectiveCamera();
camera.position.set(0, 0, 5);`,
            },
          ],
        },
      ],
    },
    {
      name: "InstancedMesh from three/webgpu",
      code: `import { InstancedMesh, Vector3 } from "three/webgpu";
const mesh = new InstancedMesh();
mesh.scale = new Vector3(1, 1, 1);`,
      output: null,
      errors: [
        {
          messageId: "replaceObject3DTransform",
          data: { owner: "mesh", property: "scale" },
          line: 3,
          column: 1,
          suggestions: [
            {
              messageId: "preserveWithSet",
              data: { property: "scale" },
              output: `import { InstancedMesh, Vector3 } from "three/webgpu";
const mesh = new InstancedMesh();
mesh.scale.set(1, 1, 1);`,
            },
          ],
        },
      ],
    },
    {
      name: "TypeScript as assertion is transparent",
      code: `import { Mesh, Vector3 } from "three";
const mesh = new Mesh() as Mesh;
mesh.position = new Vector3(1, 2, 3);`,
      output: null,
      languageOptions: tsLanguageOptions,
      errors: [
        {
          messageId: "replaceObject3DTransform",
          data: { owner: "mesh", property: "position" },
          line: 3,
          column: 1,
          suggestions: [
            {
              messageId: "preserveWithSet",
              data: { property: "position" },
              output: `import { Mesh, Vector3 } from "three";
const mesh = new Mesh() as Mesh;
mesh.position.set(1, 2, 3);`,
            },
          ],
        },
      ],
    },
  ],
});
