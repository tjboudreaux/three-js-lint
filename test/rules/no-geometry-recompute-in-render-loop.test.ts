import rule from "../../src/rules/no-geometry-recompute-in-render-loop.js";
import { createRuleTester } from "../helpers/rule-tester.js";

const ruleTester = createRuleTester();

/*
 * All 23 concrete receiver classes appear at least once, and all four cataloged
 * methods appear on `BufferGeometry`.
 */
ruleTester.run("no-geometry-recompute-in-render-loop", rule, {
  valid: [
    {
      name: "recompute outside the loop",
      code: `import { BufferGeometry } from "three";
const geometry = new BufferGeometry();
geometry.computeVertexNormals();`,
    },
    {
      name: "user class whose name ends in Geometry",
      code: `class TerrainGeometry {}
const geometry = new TerrainGeometry();
requestAnimationFrame(() => {
  geometry.computeVertexNormals();
});`,
    },
    {
      name: "local subclass of a Three.js geometry",
      code: `import { BufferGeometry } from "three";
class TerrainGeometry extends BufferGeometry {}
const geometry = new TerrainGeometry();
requestAnimationFrame(() => {
  geometry.computeVertexNormals();
});`,
    },
    {
      name: "geometry inferred from a loader result",
      code: `import { BufferGeometry } from "three";
requestAnimationFrame(() => {
  loaded.geometry.computeVertexNormals();
});`,
    },
    {
      name: "geometry reached through a member expression",
      code: `import { Mesh } from "three";
const mesh = new Mesh();
requestAnimationFrame(() => {
  mesh.geometry.computeVertexNormals();
});`,
    },
    {
      name: "normalizeNormals is not a full rescan entry",
      code: `import { BufferGeometry } from "three";
const geometry = new BufferGeometry();
requestAnimationFrame(() => {
  geometry.normalizeNormals();
});`,
    },
    {
      name: "toNonIndexed returns a new geometry",
      code: `import { BufferGeometry } from "three";
const geometry = new BufferGeometry();
requestAnimationFrame(() => {
  geometry.toNonIndexed();
});`,
    },
    {
      name: "attribute mutation is not a recompute call",
      code: `import { BufferGeometry } from "three";
const geometry = new BufferGeometry();
requestAnimationFrame(() => {
  geometry.attributes.position.needsUpdate = true;
});`,
    },
    {
      name: "recompute with an argument is not the documented call",
      code: `import { BufferGeometry } from "three";
const geometry = new BufferGeometry();
requestAnimationFrame(() => {
  geometry.computeBoundingBox(true);
});`,
    },
    {
      name: "spread argument hides the argument count",
      code: `import { BufferGeometry } from "three";
const geometry = new BufferGeometry();
const parts = [];
requestAnimationFrame(() => {
  geometry.computeBoundingBox(...parts);
});`,
    },
    {
      name: "dynamic method name",
      code: `import { BufferGeometry } from "three";
const geometry = new BufferGeometry();
requestAnimationFrame(() => {
  geometry[methodName]();
});`,
    },
    {
      name: "mutable geometry binding",
      code: `import { BufferGeometry } from "three";
let geometry = new BufferGeometry();
geometry = other;
requestAnimationFrame(() => {
  geometry.computeVertexNormals();
});`,
    },
    {
      name: "geometry reached through two alias hops",
      code: `import { BufferGeometry } from "three";
const created = new BufferGeometry();
const middle = created;
const geometry = middle;
requestAnimationFrame(() => {
  geometry.computeVertexNormals();
});`,
    },
    {
      name: "recompute in a nested callback",
      code: `import { BufferGeometry } from "three";
const geometry = new BufferGeometry();
requestAnimationFrame(() => {
  queue(() => {
    geometry.computeVertexNormals();
  });
});`,
    },
    {
      name: "same-named geometry from an unrelated module",
      code: `import { BoxGeometry } from "my-geometries";
const geometry = new BoxGeometry();
requestAnimationFrame(() => {
  geometry.computeVertexNormals();
});`,
    },
  ],
  invalid: [
    {
      name: "BoxGeometry rescan",
      code: `import { BoxGeometry } from "three";
const geometry = new BoxGeometry();
requestAnimationFrame(() => {
  geometry.computeVertexNormals();
});`,
      output: null,
      errors: [
        {
          messageId: "geometryRecomputeInLoop",
          data: { geometry: "geometry", method: "computeVertexNormals" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "BufferGeometry rescan",
      code: `import { BufferGeometry } from "three";
const geometry = new BufferGeometry();
requestAnimationFrame(() => {
  geometry.computeVertexNormals();
});`,
      output: null,
      errors: [
        {
          messageId: "geometryRecomputeInLoop",
          data: { geometry: "geometry", method: "computeVertexNormals" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "CapsuleGeometry rescan",
      code: `import { CapsuleGeometry } from "three";
const geometry = new CapsuleGeometry();
requestAnimationFrame(() => {
  geometry.computeVertexNormals();
});`,
      output: null,
      errors: [
        {
          messageId: "geometryRecomputeInLoop",
          data: { geometry: "geometry", method: "computeVertexNormals" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "CircleGeometry rescan",
      code: `import { CircleGeometry } from "three";
const geometry = new CircleGeometry();
requestAnimationFrame(() => {
  geometry.computeVertexNormals();
});`,
      output: null,
      errors: [
        {
          messageId: "geometryRecomputeInLoop",
          data: { geometry: "geometry", method: "computeVertexNormals" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "ConeGeometry rescan",
      code: `import { ConeGeometry } from "three";
const geometry = new ConeGeometry();
requestAnimationFrame(() => {
  geometry.computeVertexNormals();
});`,
      output: null,
      errors: [
        {
          messageId: "geometryRecomputeInLoop",
          data: { geometry: "geometry", method: "computeVertexNormals" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "CylinderGeometry rescan",
      code: `import { CylinderGeometry } from "three";
const geometry = new CylinderGeometry();
requestAnimationFrame(() => {
  geometry.computeVertexNormals();
});`,
      output: null,
      errors: [
        {
          messageId: "geometryRecomputeInLoop",
          data: { geometry: "geometry", method: "computeVertexNormals" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "DodecahedronGeometry rescan",
      code: `import { DodecahedronGeometry } from "three";
const geometry = new DodecahedronGeometry();
requestAnimationFrame(() => {
  geometry.computeVertexNormals();
});`,
      output: null,
      errors: [
        {
          messageId: "geometryRecomputeInLoop",
          data: { geometry: "geometry", method: "computeVertexNormals" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "EdgesGeometry rescan",
      code: `import { EdgesGeometry } from "three";
const geometry = new EdgesGeometry();
requestAnimationFrame(() => {
  geometry.computeVertexNormals();
});`,
      output: null,
      errors: [
        {
          messageId: "geometryRecomputeInLoop",
          data: { geometry: "geometry", method: "computeVertexNormals" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "ExtrudeGeometry rescan",
      code: `import { ExtrudeGeometry } from "three";
const geometry = new ExtrudeGeometry();
requestAnimationFrame(() => {
  geometry.computeVertexNormals();
});`,
      output: null,
      errors: [
        {
          messageId: "geometryRecomputeInLoop",
          data: { geometry: "geometry", method: "computeVertexNormals" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "IcosahedronGeometry rescan",
      code: `import { IcosahedronGeometry } from "three";
const geometry = new IcosahedronGeometry();
requestAnimationFrame(() => {
  geometry.computeVertexNormals();
});`,
      output: null,
      errors: [
        {
          messageId: "geometryRecomputeInLoop",
          data: { geometry: "geometry", method: "computeVertexNormals" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "InstancedBufferGeometry rescan",
      code: `import { InstancedBufferGeometry } from "three";
const geometry = new InstancedBufferGeometry();
requestAnimationFrame(() => {
  geometry.computeVertexNormals();
});`,
      output: null,
      errors: [
        {
          messageId: "geometryRecomputeInLoop",
          data: { geometry: "geometry", method: "computeVertexNormals" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "LatheGeometry rescan",
      code: `import { LatheGeometry } from "three";
const geometry = new LatheGeometry();
requestAnimationFrame(() => {
  geometry.computeVertexNormals();
});`,
      output: null,
      errors: [
        {
          messageId: "geometryRecomputeInLoop",
          data: { geometry: "geometry", method: "computeVertexNormals" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "OctahedronGeometry rescan",
      code: `import { OctahedronGeometry } from "three";
const geometry = new OctahedronGeometry();
requestAnimationFrame(() => {
  geometry.computeVertexNormals();
});`,
      output: null,
      errors: [
        {
          messageId: "geometryRecomputeInLoop",
          data: { geometry: "geometry", method: "computeVertexNormals" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "PlaneGeometry rescan",
      code: `import { PlaneGeometry } from "three";
const geometry = new PlaneGeometry();
requestAnimationFrame(() => {
  geometry.computeVertexNormals();
});`,
      output: null,
      errors: [
        {
          messageId: "geometryRecomputeInLoop",
          data: { geometry: "geometry", method: "computeVertexNormals" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "PolyhedronGeometry rescan",
      code: `import { PolyhedronGeometry } from "three";
const geometry = new PolyhedronGeometry();
requestAnimationFrame(() => {
  geometry.computeVertexNormals();
});`,
      output: null,
      errors: [
        {
          messageId: "geometryRecomputeInLoop",
          data: { geometry: "geometry", method: "computeVertexNormals" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "RingGeometry rescan",
      code: `import { RingGeometry } from "three";
const geometry = new RingGeometry();
requestAnimationFrame(() => {
  geometry.computeVertexNormals();
});`,
      output: null,
      errors: [
        {
          messageId: "geometryRecomputeInLoop",
          data: { geometry: "geometry", method: "computeVertexNormals" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "ShapeGeometry rescan",
      code: `import { ShapeGeometry } from "three";
const geometry = new ShapeGeometry();
requestAnimationFrame(() => {
  geometry.computeVertexNormals();
});`,
      output: null,
      errors: [
        {
          messageId: "geometryRecomputeInLoop",
          data: { geometry: "geometry", method: "computeVertexNormals" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "SphereGeometry rescan",
      code: `import { SphereGeometry } from "three";
const geometry = new SphereGeometry();
requestAnimationFrame(() => {
  geometry.computeVertexNormals();
});`,
      output: null,
      errors: [
        {
          messageId: "geometryRecomputeInLoop",
          data: { geometry: "geometry", method: "computeVertexNormals" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "TetrahedronGeometry rescan",
      code: `import { TetrahedronGeometry } from "three";
const geometry = new TetrahedronGeometry();
requestAnimationFrame(() => {
  geometry.computeVertexNormals();
});`,
      output: null,
      errors: [
        {
          messageId: "geometryRecomputeInLoop",
          data: { geometry: "geometry", method: "computeVertexNormals" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "TorusGeometry rescan",
      code: `import { TorusGeometry } from "three";
const geometry = new TorusGeometry();
requestAnimationFrame(() => {
  geometry.computeVertexNormals();
});`,
      output: null,
      errors: [
        {
          messageId: "geometryRecomputeInLoop",
          data: { geometry: "geometry", method: "computeVertexNormals" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "TorusKnotGeometry rescan",
      code: `import { TorusKnotGeometry } from "three";
const geometry = new TorusKnotGeometry();
requestAnimationFrame(() => {
  geometry.computeVertexNormals();
});`,
      output: null,
      errors: [
        {
          messageId: "geometryRecomputeInLoop",
          data: { geometry: "geometry", method: "computeVertexNormals" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "TubeGeometry rescan",
      code: `import { TubeGeometry } from "three";
const geometry = new TubeGeometry();
requestAnimationFrame(() => {
  geometry.computeVertexNormals();
});`,
      output: null,
      errors: [
        {
          messageId: "geometryRecomputeInLoop",
          data: { geometry: "geometry", method: "computeVertexNormals" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "WireframeGeometry rescan",
      code: `import { WireframeGeometry } from "three";
const geometry = new WireframeGeometry();
requestAnimationFrame(() => {
  geometry.computeVertexNormals();
});`,
      output: null,
      errors: [
        {
          messageId: "geometryRecomputeInLoop",
          data: { geometry: "geometry", method: "computeVertexNormals" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "BufferGeometry computeBoundingBox",
      code: `import { BufferGeometry } from "three/webgpu";
const geometry = new BufferGeometry();
requestAnimationFrame(() => {
  geometry.computeBoundingBox();
});`,
      output: null,
      errors: [
        {
          messageId: "geometryRecomputeInLoop",
          data: { geometry: "geometry", method: "computeBoundingBox" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "BufferGeometry computeBoundingSphere",
      code: `import { BufferGeometry } from "three/webgpu";
const geometry = new BufferGeometry();
requestAnimationFrame(() => {
  geometry.computeBoundingSphere();
});`,
      output: null,
      errors: [
        {
          messageId: "geometryRecomputeInLoop",
          data: { geometry: "geometry", method: "computeBoundingSphere" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "BufferGeometry computeTangents",
      code: `import { BufferGeometry } from "three/webgpu";
const geometry = new BufferGeometry();
requestAnimationFrame(() => {
  geometry.computeTangents();
});`,
      output: null,
      errors: [
        {
          messageId: "geometryRecomputeInLoop",
          data: { geometry: "geometry", method: "computeTangents" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "BufferGeometry computeVertexNormals",
      code: `import { BufferGeometry } from "three/webgpu";
const geometry = new BufferGeometry();
requestAnimationFrame(() => {
  geometry.computeVertexNormals();
});`,
      output: null,
      errors: [
        {
          messageId: "geometryRecomputeInLoop",
          data: { geometry: "geometry", method: "computeVertexNormals" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "namespace-imported geometry",
      code: `import * as THREE from "three";
const geometry = new THREE.SphereGeometry();
requestAnimationFrame(() => {
  geometry.computeBoundingBox();
});`,
      output: null,
      errors: [
        {
          messageId: "geometryRecomputeInLoop",
          data: { geometry: "geometry", method: "computeBoundingBox" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "geometry reached through one immutable alias hop",
      code: `import { BoxGeometry } from "three";
const created = new BoxGeometry();
const geometry = created;
requestAnimationFrame(() => {
  geometry.computeVertexNormals();
});`,
      output: null,
      errors: [
        {
          messageId: "geometryRecomputeInLoop",
          data: { geometry: "geometry", method: "computeVertexNormals" },
          line: 5,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "computed method name resolved from a string literal",
      code: `import { BoxGeometry } from "three";
const geometry = new BoxGeometry();
requestAnimationFrame(() => {
  geometry["computeTangents"]();
});`,
      output: null,
      errors: [
        {
          messageId: "geometryRecomputeInLoop",
          data: { geometry: "geometry", method: "computeTangents" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "recompute in a renderer sort comparator",
      code: `import { BoxGeometry, WebGLRenderer } from "three";
const geometry = new BoxGeometry();
const renderer = new WebGLRenderer();
renderer.setTransparentSort((a, b) => {
  geometry.computeBoundingSphere();
  return a.z - b.z;
});`,
      output: null,
      errors: [
        {
          messageId: "geometryRecomputeInLoop",
          data: { geometry: "geometry", method: "computeBoundingSphere" },
          line: 5,
          column: 3,
          suggestions: [],
        },
      ],
    },
  ],
});
