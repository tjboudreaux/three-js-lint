import rule from "../../src/rules/no-shader-recompile-in-render-loop.js";
import { createRuleTester, tsLanguageOptions } from "../helpers/rule-tester.js";

const ruleTester = createRuleTester();

ruleTester.run("no-shader-recompile-in-render-loop", rule, {
  valid: [
    {
      name: "invalidation outside the loop",
      code: `import { MeshStandardMaterial } from "three";
const material = new MeshStandardMaterial();
material.needsUpdate = true;`,
    },
    {
      name: "clearing the flag inside the loop",
      code: `import { MeshStandardMaterial } from "three";
const material = new MeshStandardMaterial();
requestAnimationFrame(() => {
  material.needsUpdate = false;
});`,
    },
    {
      name: "dynamic right-hand side",
      code: `import { MeshStandardMaterial } from "three";
const material = new MeshStandardMaterial();
requestAnimationFrame(() => {
  material.needsUpdate = shouldRecompile;
});`,
    },
    {
      name: "defines write without needsUpdate",
      code: `import { ShaderMaterial } from "three";
const material = new ShaderMaterial();
requestAnimationFrame(() => {
  material.defines.USE_FOG = 1;
});`,
    },
    {
      name: "onBeforeCompile assignment",
      code: `import { ShaderMaterial } from "three";
const material = new ShaderMaterial();
requestAnimationFrame(() => {
  material.onBeforeCompile = patch;
});`,
    },
    {
      name: "shader source write",
      code: `import { ShaderMaterial } from "three";
const material = new ShaderMaterial();
requestAnimationFrame(() => {
  material.fragmentShader = nextSource;
});`,
    },
    {
      name: "uniform value write",
      code: `import { ShaderMaterial } from "three";
const material = new ShaderMaterial();
requestAnimationFrame(() => {
  material.uniforms.uTime.value = 1;
});`,
    },
    {
      name: "customProgramCacheKey assignment",
      code: `import { ShaderMaterial } from "three";
const material = new ShaderMaterial();
requestAnimationFrame(() => {
  material.customProgramCacheKey = key;
});`,
    },
    {
      name: "texture needsUpdate is a different upload path",
      code: `import { DataTexture } from "three";
const texture = new DataTexture();
requestAnimationFrame(() => {
  texture.needsUpdate = true;
});`,
    },
    {
      name: "buffer attribute needsUpdate is a different upload path",
      code: `import { BufferAttribute } from "three";
const attribute = new BufferAttribute();
requestAnimationFrame(() => {
  attribute.needsUpdate = true;
});`,
    },
    {
      name: "unknown member owner",
      code: `requestAnimationFrame(() => {
  mesh.material.needsUpdate = true;
});`,
    },
    {
      name: "mutable material binding",
      code: `import { MeshStandardMaterial } from "three";
let material = new MeshStandardMaterial();
material = other;
requestAnimationFrame(() => {
  material.needsUpdate = true;
});`,
    },
    {
      name: "user class whose name ends in Material",
      code: `class FoamMaterial {}
const material = new FoamMaterial();
requestAnimationFrame(() => {
  material.needsUpdate = true;
});`,
    },
    {
      name: "computed needsUpdate access",
      code: `import { MeshStandardMaterial } from "three";
const material = new MeshStandardMaterial();
requestAnimationFrame(() => {
  material[flagName] = true;
});`,
    },
    {
      name: "compound assignment",
      code: `import { MeshStandardMaterial } from "three";
const material = new MeshStandardMaterial();
requestAnimationFrame(() => {
  material.needsUpdate ||= true;
});`,
    },
    {
      name: "nested callback inside the loop",
      code: `import { MeshStandardMaterial } from "three";
const material = new MeshStandardMaterial();
requestAnimationFrame(() => {
  queue(() => {
    material.needsUpdate = true;
  });
});`,
    },
  ],
  invalid: [
    {
      name: "needsUpdate in a requestAnimationFrame callback",
      code: `import { MeshStandardMaterial } from "three";
const material = new MeshStandardMaterial();
requestAnimationFrame(() => {
  material.needsUpdate = true;
});`,
      output: null,
      errors: [
        {
          messageId: "materialNeedsUpdateInLoop",
          data: { material: "material" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "needsUpdate in a React Three Fiber useFrame callback",
      code: `import { useFrame } from "@react-three/fiber";
import { ShaderMaterial } from "three";
const material = new ShaderMaterial();
useFrame(() => {
  material.needsUpdate = true;
});`,
      output: null,
      errors: [
        {
          messageId: "materialNeedsUpdateInLoop",
          data: { material: "material" },
          line: 5,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "namespace-imported material",
      code: `import * as THREE from "three";
const material = new THREE.RawShaderMaterial();
requestAnimationFrame(() => {
  material.needsUpdate = true;
});`,
      output: null,
      errors: [
        {
          messageId: "materialNeedsUpdateInLoop",
          data: { material: "material" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "base Material class",
      code: `import { Material } from "three";
const material = new Material();
requestAnimationFrame(() => {
  material.needsUpdate = true;
});`,
      output: null,
      errors: [
        {
          messageId: "materialNeedsUpdateInLoop",
          data: { material: "material" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "line material in a tracked setAnimationLoop",
      code: `import { LineDashedMaterial, WebGLRenderer } from "three";
const material = new LineDashedMaterial();
const renderer = new WebGLRenderer();
renderer.setAnimationLoop(() => {
  material.needsUpdate = true;
});`,
      output: null,
      errors: [
        {
          messageId: "materialNeedsUpdateInLoop",
          data: { material: "material" },
          line: 5,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "material from three/webgpu",
      code: `import { MeshBasicMaterial } from "three/webgpu";
const material = new MeshBasicMaterial();
requestAnimationFrame(() => {
  material.needsUpdate = true;
});`,
      output: null,
      errors: [
        {
          messageId: "materialNeedsUpdateInLoop",
          data: { material: "material" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "accompanying defines write yields a single report",
      code: `import { ShaderMaterial } from "three";
const material = new ShaderMaterial();
requestAnimationFrame(() => {
  material.defines.USE_FOG = 1;
  material.needsUpdate = true;
});`,
      output: null,
      errors: [
        {
          messageId: "materialNeedsUpdateInLoop",
          data: { material: "material" },
          line: 5,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "TypeScript non-null owner",
      code: `import { MeshPhysicalMaterial } from "three";
const material = new MeshPhysicalMaterial();
requestAnimationFrame(() => {
  material!.needsUpdate = true;
});`,
      output: null,
      languageOptions: tsLanguageOptions,
      errors: [
        {
          messageId: "materialNeedsUpdateInLoop",
          data: { material: "material" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
  ],
});
