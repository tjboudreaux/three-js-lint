import rule from "../../src/rules/no-pmrem-generation-in-render-loop.js";
import { createRuleTester, tsLanguageOptions } from "../helpers/rule-tester.js";

const ruleTester = createRuleTester();

/** A `three` generator driven by a `three` `WebGLRenderer`. */
const webglSetup = `import { PMREMGenerator, WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const generator = new PMREMGenerator(renderer);
`;

/** A `three/webgpu` generator driven by a `three/webgpu` `WebGPURenderer`. */
const webgpuSetup = `import { PMREMGenerator, WebGPURenderer } from "three/webgpu";
const renderer = new WebGPURenderer();
const generator = new PMREMGenerator(renderer);
`;

ruleTester.run("no-pmrem-generation-in-render-loop", rule, {
  valid: [
    {
      name: "generation outside the loop",
      code: `${webglSetup}const environment = generator.fromScene(scene);`,
    },
    {
      name: "classic generator has no fromSceneAsync",
      code: `${webglSetup}requestAnimationFrame(() => {
  generator.fromSceneAsync(scene);
});`,
    },
    {
      name: "classic generator has no fromEquirectangularAsync",
      code: `${webglSetup}requestAnimationFrame(() => {
  generator.fromEquirectangularAsync(texture);
});`,
    },
    {
      name: "classic generator has no fromCubemapAsync",
      code: `${webglSetup}requestAnimationFrame(() => {
  generator.fromCubemapAsync(texture);
});`,
    },
    {
      name: "compileCubemapShader is not a generation call",
      code: `${webglSetup}requestAnimationFrame(() => {
  generator.compileCubemapShader();
});`,
    },
    {
      name: "compileEquirectangularShader is not a generation call",
      code: `${webglSetup}requestAnimationFrame(() => {
  generator.compileEquirectangularShader();
});`,
    },
    {
      name: "dispose is not a generation call",
      code: `${webglSetup}requestAnimationFrame(() => {
  generator.dispose();
});`,
    },
    {
      name: "fromScene with no argument is an invalid call",
      code: `${webglSetup}requestAnimationFrame(() => {
  generator.fromScene();
});`,
    },
    {
      name: "fromScene with six arguments is out of range",
      code: `${webglSetup}requestAnimationFrame(() => {
  generator.fromScene(scene, 0, 0.1, 100, {}, extra);
});`,
    },
    {
      name: "fromCubemap with three arguments is out of range",
      code: `${webglSetup}requestAnimationFrame(() => {
  generator.fromCubemap(texture, target, extra);
});`,
    },
    {
      name: "spread hides the argument count",
      code: `${webglSetup}const parts = [scene];
requestAnimationFrame(() => {
  generator.fromScene(...parts);
});`,
    },
    {
      name: "a WebGPU renderer driving a classic generator",
      code: `import { PMREMGenerator } from "three";
import { WebGPURenderer } from "three/webgpu";
const renderer = new WebGPURenderer();
const generator = new PMREMGenerator(renderer);
requestAnimationFrame(() => {
  generator.fromScene(scene);
});`,
    },
    {
      name: "a WebGL renderer driving a WebGPU generator",
      code: `import { WebGLRenderer } from "three";
import { PMREMGenerator } from "three/webgpu";
const renderer = new WebGLRenderer();
const generator = new PMREMGenerator(renderer);
requestAnimationFrame(() => {
  generator.fromScene(scene);
});`,
    },
    {
      name: "an unknown renderer argument",
      code: `import { PMREMGenerator } from "three";
const generator = new PMREMGenerator(renderer);
requestAnimationFrame(() => {
  generator.fromScene(scene);
});`,
    },
    {
      name: "a generator constructed with no renderer",
      code: `import { PMREMGenerator } from "three";
const generator = new PMREMGenerator();
requestAnimationFrame(() => {
  generator.fromScene(scene);
});`,
    },
    {
      name: "a generator constructed with a spread",
      code: `import { PMREMGenerator, WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const parts = [renderer];
const generator = new PMREMGenerator(...parts);
requestAnimationFrame(() => {
  generator.fromScene(scene);
});`,
    },
    {
      name: "a user class named PMREMGenerator",
      code: `class PMREMGenerator {}
const generator = new PMREMGenerator(renderer);
requestAnimationFrame(() => {
  generator.fromScene(scene);
});`,
    },
    {
      name: "a same-named generator from an unrelated module",
      code: `import { PMREMGenerator } from "my-three";
import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const generator = new PMREMGenerator(renderer);
requestAnimationFrame(() => {
  generator.fromScene(scene);
});`,
    },
    {
      name: "an unproven generator instance",
      code: `${webglSetup}requestAnimationFrame(() => {
  cache.generator.fromScene(scene);
});`,
    },
    {
      name: "mutable generator binding",
      code: `import { PMREMGenerator, WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
let generator = new PMREMGenerator(renderer);
generator = other;
requestAnimationFrame(() => {
  generator.fromScene(scene);
});`,
    },
    {
      name: "generator reached through two alias hops",
      code: `import { PMREMGenerator, WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const created = new PMREMGenerator(renderer);
const middle = created;
const generator = middle;
requestAnimationFrame(() => {
  generator.fromScene(scene);
});`,
    },
    {
      name: "generation in a nested helper",
      code: `${webglSetup}requestAnimationFrame(() => {
  queue(() => {
    generator.fromScene(scene);
  });
});`,
    },
    {
      name: "dynamic method name",
      code: `${webglSetup}requestAnimationFrame(() => {
  generator[methodName](scene);
});`,
    },
  ],
  invalid: [
    {
      name: "fromScene in a requestAnimationFrame callback",
      code: `${webglSetup}requestAnimationFrame(() => {
  generator.fromScene(scene);
});`,
      output: null,
      errors: [
        {
          messageId: "pmremGenerationInLoop",
          data: { generator: "generator", method: "fromScene" },
          line: 5,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "fromScene with every optional argument",
      code: `${webglSetup}requestAnimationFrame(() => {
  generator.fromScene(scene, 0, 0.1, 100, {});
});`,
      output: null,
      errors: [
        {
          messageId: "pmremGenerationInLoop",
          data: { generator: "generator", method: "fromScene" },
          line: 5,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "fromEquirectangular",
      code: `${webglSetup}requestAnimationFrame(() => {
  generator.fromEquirectangular(texture);
});`,
      output: null,
      errors: [
        {
          messageId: "pmremGenerationInLoop",
          data: { generator: "generator", method: "fromEquirectangular" },
          line: 5,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "fromCubemap with a render target",
      code: `${webglSetup}requestAnimationFrame(() => {
  generator.fromCubemap(texture, target);
});`,
      output: null,
      errors: [
        {
          messageId: "pmremGenerationInLoop",
          data: { generator: "generator", method: "fromCubemap" },
          line: 5,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "WebGPU generator fromScene",
      code: `${webgpuSetup}requestAnimationFrame(() => {
  generator.fromScene(scene);
});`,
      output: null,
      errors: [
        {
          messageId: "pmremGenerationInLoop",
          data: { generator: "generator", method: "fromScene" },
          line: 5,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "WebGPU generator deprecated fromSceneAsync",
      code: `${webgpuSetup}requestAnimationFrame(() => {
  generator.fromSceneAsync(scene);
});`,
      output: null,
      errors: [
        {
          messageId: "pmremGenerationInLoop",
          data: { generator: "generator", method: "fromSceneAsync" },
          line: 5,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "WebGPU generator deprecated fromEquirectangularAsync",
      code: `${webgpuSetup}requestAnimationFrame(() => {
  generator.fromEquirectangularAsync(texture);
});`,
      output: null,
      errors: [
        {
          messageId: "pmremGenerationInLoop",
          data: { generator: "generator", method: "fromEquirectangularAsync" },
          line: 5,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "WebGPU generator deprecated fromCubemapAsync",
      code: `${webgpuSetup}requestAnimationFrame(() => {
  generator.fromCubemapAsync(texture, target);
});`,
      output: null,
      errors: [
        {
          messageId: "pmremGenerationInLoop",
          data: { generator: "generator", method: "fromCubemapAsync" },
          line: 5,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "namespace-imported generator and renderer",
      code: `import * as THREE from "three";
const renderer = new THREE.WebGLRenderer();
const generator = new THREE.PMREMGenerator(renderer);
requestAnimationFrame(() => {
  generator.fromScene(scene);
});`,
      output: null,
      errors: [
        {
          messageId: "pmremGenerationInLoop",
          data: { generator: "generator", method: "fromScene" },
          line: 5,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "generator reached through one immutable alias hop",
      code: `${webglSetup}const cached = generator;
requestAnimationFrame(() => {
  cached.fromScene(scene);
});`,
      output: null,
      errors: [
        {
          messageId: "pmremGenerationInLoop",
          data: { generator: "cached", method: "fromScene" },
          line: 6,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "generation in a tracked animation loop",
      code: `${webglSetup}renderer.setAnimationLoop(() => {
  generator.fromScene(scene);
});`,
      output: null,
      errors: [
        {
          messageId: "pmremGenerationInLoop",
          data: { generator: "generator", method: "fromScene" },
          line: 5,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "computed method name resolved from a string literal",
      code: `${webglSetup}requestAnimationFrame(() => {
  generator["fromScene"](scene);
});`,
      output: null,
      errors: [
        {
          messageId: "pmremGenerationInLoop",
          data: { generator: "generator", method: "fromScene" },
          line: 5,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "TypeScript non-null receiver stays transparent",
      code: `${webglSetup}requestAnimationFrame(() => {
  generator!.fromScene(scene);
});`,
      output: null,
      languageOptions: tsLanguageOptions,
      errors: [
        {
          messageId: "pmremGenerationInLoop",
          data: { generator: "generator", method: "fromScene" },
          line: 5,
          column: 3,
          suggestions: [],
        },
      ],
    },
  ],
});
