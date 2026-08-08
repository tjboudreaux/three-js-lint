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
    {
      name: "Line2NodeMaterial is not exported by three",
      code: `import { Line2NodeMaterial } from "three";
const material = new Line2NodeMaterial();
requestAnimationFrame(() => {
  material.needsUpdate = true;
});`,
    },
    {
      name: "LineBasicNodeMaterial is not exported by three",
      code: `import { LineBasicNodeMaterial } from "three";
const material = new LineBasicNodeMaterial();
requestAnimationFrame(() => {
  material.needsUpdate = true;
});`,
    },
    {
      name: "LineDashedNodeMaterial is not exported by three",
      code: `import { LineDashedNodeMaterial } from "three";
const material = new LineDashedNodeMaterial();
requestAnimationFrame(() => {
  material.needsUpdate = true;
});`,
    },
    {
      name: "MeshBasicNodeMaterial is not exported by three",
      code: `import { MeshBasicNodeMaterial } from "three";
const material = new MeshBasicNodeMaterial();
requestAnimationFrame(() => {
  material.needsUpdate = true;
});`,
    },
    {
      name: "MeshLambertNodeMaterial is not exported by three",
      code: `import { MeshLambertNodeMaterial } from "three";
const material = new MeshLambertNodeMaterial();
requestAnimationFrame(() => {
  material.needsUpdate = true;
});`,
    },
    {
      name: "MeshMatcapNodeMaterial is not exported by three",
      code: `import { MeshMatcapNodeMaterial } from "three";
const material = new MeshMatcapNodeMaterial();
requestAnimationFrame(() => {
  material.needsUpdate = true;
});`,
    },
    {
      name: "MeshNormalNodeMaterial is not exported by three",
      code: `import { MeshNormalNodeMaterial } from "three";
const material = new MeshNormalNodeMaterial();
requestAnimationFrame(() => {
  material.needsUpdate = true;
});`,
    },
    {
      name: "MeshPhongNodeMaterial is not exported by three",
      code: `import { MeshPhongNodeMaterial } from "three";
const material = new MeshPhongNodeMaterial();
requestAnimationFrame(() => {
  material.needsUpdate = true;
});`,
    },
    {
      name: "MeshPhysicalNodeMaterial is not exported by three",
      code: `import { MeshPhysicalNodeMaterial } from "three";
const material = new MeshPhysicalNodeMaterial();
requestAnimationFrame(() => {
  material.needsUpdate = true;
});`,
    },
    {
      name: "MeshSSSNodeMaterial is not exported by three",
      code: `import { MeshSSSNodeMaterial } from "three";
const material = new MeshSSSNodeMaterial();
requestAnimationFrame(() => {
  material.needsUpdate = true;
});`,
    },
    {
      name: "MeshStandardNodeMaterial is not exported by three",
      code: `import { MeshStandardNodeMaterial } from "three";
const material = new MeshStandardNodeMaterial();
requestAnimationFrame(() => {
  material.needsUpdate = true;
});`,
    },
    {
      name: "MeshToonNodeMaterial is not exported by three",
      code: `import { MeshToonNodeMaterial } from "three";
const material = new MeshToonNodeMaterial();
requestAnimationFrame(() => {
  material.needsUpdate = true;
});`,
    },
    {
      name: "NodeMaterial is not exported by three",
      code: `import { NodeMaterial } from "three";
const material = new NodeMaterial();
requestAnimationFrame(() => {
  material.needsUpdate = true;
});`,
    },
    {
      name: "PointsNodeMaterial is not exported by three",
      code: `import { PointsNodeMaterial } from "three";
const material = new PointsNodeMaterial();
requestAnimationFrame(() => {
  material.needsUpdate = true;
});`,
    },
    {
      name: "ShadowNodeMaterial is not exported by three",
      code: `import { ShadowNodeMaterial } from "three";
const material = new ShadowNodeMaterial();
requestAnimationFrame(() => {
  material.needsUpdate = true;
});`,
    },
    {
      name: "SpriteNodeMaterial is not exported by three",
      code: `import { SpriteNodeMaterial } from "three";
const material = new SpriteNodeMaterial();
requestAnimationFrame(() => {
  material.needsUpdate = true;
});`,
    },
    {
      name: "VolumeNodeMaterial is not exported by three",
      code: `import { VolumeNodeMaterial } from "three";
const material = new VolumeNodeMaterial();
requestAnimationFrame(() => {
  material.needsUpdate = true;
});`,
    },
    {
      name: "render is not a compilation call",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
requestAnimationFrame(() => {
  renderer.render(scene, camera);
});`,
    },
    {
      name: "compile with one argument is an invalid call",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
requestAnimationFrame(() => {
  renderer.compile(scene);
});`,
    },
    {
      name: "compile with four arguments is not a call either renderer defines",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
requestAnimationFrame(() => {
  renderer.compile(scene, camera, target, extra);
});`,
    },
    {
      name: "compileAsync with four arguments is not a call either renderer defines",
      code: `import { WebGPURenderer } from "three/webgpu";
const renderer = new WebGPURenderer();
requestAnimationFrame(() => {
  renderer.compileAsync(scene, camera, target, onProgress);
});`,
    },
    {
      name: "compile with a spread hides the argument count",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const parts = [scene, camera];
requestAnimationFrame(() => {
  renderer.compile(...parts);
});`,
    },
    {
      name: "compile outside a verified callback",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
renderer.compile(scene, camera);`,
    },
    {
      name: "compile in a nested helper",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
requestAnimationFrame(() => {
  queue(() => {
    renderer.compile(scene, camera);
  });
});`,
    },
    {
      name: "compile on an unknown renderer lookalike",
      code: `class WebGLRenderer {}
const renderer = new WebGLRenderer();
requestAnimationFrame(() => {
  renderer.compile(scene, camera);
});`,
    },
    {
      name: "a WebGPU renderer imported from three",
      code: `import { WebGPURenderer } from "three";
const renderer = new WebGPURenderer();
requestAnimationFrame(() => {
  renderer.compileAsync(scene, camera);
});`,
    },
    {
      name: "PMREM compile helpers are not renderer compilation",
      code: `import { PMREMGenerator, WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const generator = new PMREMGenerator(renderer);
requestAnimationFrame(() => {
  generator.compileCubemapShader();
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
    {
      name: "Line2NodeMaterial from three/webgpu",
      code: `import { Line2NodeMaterial } from "three/webgpu";
const material = new Line2NodeMaterial();
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
      name: "LineBasicNodeMaterial from three/webgpu",
      code: `import { LineBasicNodeMaterial } from "three/webgpu";
const material = new LineBasicNodeMaterial();
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
      name: "LineDashedNodeMaterial from three/webgpu",
      code: `import { LineDashedNodeMaterial } from "three/webgpu";
const material = new LineDashedNodeMaterial();
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
      name: "MeshBasicNodeMaterial from three/webgpu",
      code: `import { MeshBasicNodeMaterial } from "three/webgpu";
const material = new MeshBasicNodeMaterial();
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
      name: "MeshLambertNodeMaterial from three/webgpu",
      code: `import { MeshLambertNodeMaterial } from "three/webgpu";
const material = new MeshLambertNodeMaterial();
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
      name: "MeshMatcapNodeMaterial from three/webgpu",
      code: `import { MeshMatcapNodeMaterial } from "three/webgpu";
const material = new MeshMatcapNodeMaterial();
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
      name: "MeshNormalNodeMaterial from three/webgpu",
      code: `import { MeshNormalNodeMaterial } from "three/webgpu";
const material = new MeshNormalNodeMaterial();
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
      name: "MeshPhongNodeMaterial from three/webgpu",
      code: `import { MeshPhongNodeMaterial } from "three/webgpu";
const material = new MeshPhongNodeMaterial();
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
      name: "MeshPhysicalNodeMaterial from three/webgpu",
      code: `import { MeshPhysicalNodeMaterial } from "three/webgpu";
const material = new MeshPhysicalNodeMaterial();
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
      name: "MeshSSSNodeMaterial from three/webgpu",
      code: `import { MeshSSSNodeMaterial } from "three/webgpu";
const material = new MeshSSSNodeMaterial();
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
      name: "MeshStandardNodeMaterial from three/webgpu",
      code: `import { MeshStandardNodeMaterial } from "three/webgpu";
const material = new MeshStandardNodeMaterial();
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
      name: "MeshToonNodeMaterial from three/webgpu",
      code: `import { MeshToonNodeMaterial } from "three/webgpu";
const material = new MeshToonNodeMaterial();
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
      name: "NodeMaterial from three/webgpu",
      code: `import { NodeMaterial } from "three/webgpu";
const material = new NodeMaterial();
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
      name: "PointsNodeMaterial from three/webgpu",
      code: `import { PointsNodeMaterial } from "three/webgpu";
const material = new PointsNodeMaterial();
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
      name: "ShadowNodeMaterial from three/webgpu",
      code: `import { ShadowNodeMaterial } from "three/webgpu";
const material = new ShadowNodeMaterial();
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
      name: "SpriteNodeMaterial from three/webgpu",
      code: `import { SpriteNodeMaterial } from "three/webgpu";
const material = new SpriteNodeMaterial();
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
      name: "VolumeNodeMaterial from three/webgpu",
      code: `import { VolumeNodeMaterial } from "three/webgpu";
const material = new VolumeNodeMaterial();
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
      name: "WebGLRenderer.compile with two arguments",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
requestAnimationFrame(() => {
  renderer.compile(scene, camera);
});`,
      output: null,
      errors: [
        {
          messageId: "rendererCompileInLoop",
          data: { renderer: "renderer", method: "compile" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "WebGLRenderer.compile with a target scene",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
requestAnimationFrame(() => {
  renderer.compile(object, camera, scene);
});`,
      output: null,
      errors: [
        {
          messageId: "rendererCompileInLoop",
          data: { renderer: "renderer", method: "compile" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "WebGLRenderer.compileAsync with two arguments",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
requestAnimationFrame(() => {
  renderer.compileAsync(scene, camera);
});`,
      output: null,
      errors: [
        {
          messageId: "rendererCompileInLoop",
          data: { renderer: "renderer", method: "compileAsync" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "WebGPURenderer.compileAsync with two arguments",
      code: `import { WebGPURenderer } from "three/webgpu";
const renderer = new WebGPURenderer();
requestAnimationFrame(() => {
  renderer.compileAsync(scene, camera);
});`,
      output: null,
      errors: [
        {
          messageId: "rendererCompileInLoop",
          data: { renderer: "renderer", method: "compileAsync" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "WebGPURenderer.compile getter alias with a target scene",
      code: `import { WebGPURenderer } from "three/webgpu";
const renderer = new WebGPURenderer();
requestAnimationFrame(() => {
  renderer.compile(object, camera, scene);
});`,
      output: null,
      errors: [
        {
          messageId: "rendererCompileInLoop",
          data: { renderer: "renderer", method: "compile" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "compile inside the renderer's own animation loop",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
renderer.setAnimationLoop(() => {
  renderer.compile(scene, camera);
});`,
      output: null,
      errors: [
        {
          messageId: "rendererCompileInLoop",
          data: { renderer: "renderer", method: "compile" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "compile in a renderer sort comparator",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
renderer.setOpaqueSort((a, b) => {
  renderer.compile(scene, camera);
  return a.z - b.z;
});`,
      output: null,
      errors: [
        {
          messageId: "rendererCompileInLoop",
          data: { renderer: "renderer", method: "compile" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "an immutable classic material still reports after escaping to a helper",
      code: `import { MeshStandardMaterial } from "three";
const material = new MeshStandardMaterial();
register(material);
requestAnimationFrame(() => {
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
  ],
});
