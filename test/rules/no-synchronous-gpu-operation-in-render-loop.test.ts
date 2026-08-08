import rule from "../../src/rules/no-synchronous-gpu-operation-in-render-loop.js";
import { createRuleTester, tsLanguageOptions } from "../helpers/rule-tester.js";

const ruleTester = createRuleTester();

/*
 * All nine accepted client-memory view constructors appear, together with their
 * constructor-arity, nullish, and spread boundaries and explicit refusals for
 * `Float16Array`, `Float64Array`, the bigint views, a numeric PBO offset, an
 * `ArrayBuffer`, an unknown target, a shadowed global, an untracked context, an
 * invalid call arity, the asynchronous WebGL path, and WebGPU.
 */
ruleTester.run("no-synchronous-gpu-operation-in-render-loop", rule, {
  valid: [
    {
      name: "readback outside the loop",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const pixels = new Uint8Array(4);
renderer.readRenderTargetPixels(target, 0, 0, 1, 1, pixels);`,
    },
    {
      name: "asynchronous WebGL readback",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const pixels = new Uint8Array(4);
requestAnimationFrame(() => {
  renderer.readRenderTargetPixelsAsync(target, 0, 0, 1, 1, pixels);
});`,
    },
    {
      name: "WebGPU renderer readback is asynchronous",
      code: `import { WebGPURenderer } from "three/webgpu";
const renderer = new WebGPURenderer();
const pixels = new Uint8Array(4);
requestAnimationFrame(() => {
  renderer.readRenderTargetPixels(target, 0, 0, 1, 1, pixels);
});`,
    },
    {
      name: "WebGPU renderer context is not tracked",
      code: `import { WebGPURenderer } from "three/webgpu";
const renderer = new WebGPURenderer();
const gl = renderer.getContext();
requestAnimationFrame(() => {
  gl.finish();
});`,
    },
    {
      name: "numeric PBO offset addresses a buffer object",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const gl = renderer.getContext();
requestAnimationFrame(() => {
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, 0);
});`,
    },
    {
      name: "ArrayBuffer is not a view",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const gl = renderer.getContext();
const pixels = new ArrayBuffer(4);
requestAnimationFrame(() => {
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
});`,
    },
    {
      name: "Float16Array is not a readPixels destination type",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const gl = renderer.getContext();
const pixels = new Float16Array(4);
requestAnimationFrame(() => {
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.HALF_FLOAT, pixels);
});`,
    },
    {
      name: "Float64Array is not a readPixels destination type",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const gl = renderer.getContext();
const pixels = new Float64Array(4);
requestAnimationFrame(() => {
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.FLOAT, pixels);
});`,
    },
    {
      name: "BigInt64Array is not a readPixels destination type",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const gl = renderer.getContext();
const pixels = new BigInt64Array(4);
requestAnimationFrame(() => {
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
});`,
    },
    {
      name: "BigUint64Array is not a readPixels destination type",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const gl = renderer.getContext();
const pixels = new BigUint64Array(4);
requestAnimationFrame(() => {
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
});`,
    },
    {
      name: "an unresolved destination",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const gl = renderer.getContext();
requestAnimationFrame(() => {
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
});`,
    },
    {
      name: "a member-derived destination",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const gl = renderer.getContext();
requestAnimationFrame(() => {
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, state.pixels);
});`,
    },
    {
      name: "a shadowed view constructor",
      code: `import { WebGLRenderer } from "three";
class Uint8Array {}
const renderer = new WebGLRenderer();
const gl = renderer.getContext();
const pixels = new Uint8Array(4);
requestAnimationFrame(() => {
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
});`,
    },
    {
      name: "a DataView over a statically null buffer",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const gl = renderer.getContext();
const pixels = new DataView(null);
requestAnimationFrame(() => {
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
});`,
    },
    {
      name: "a DataView over an explicitly undefined buffer",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const gl = renderer.getContext();
const pixels = new DataView(undefined);
requestAnimationFrame(() => {
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
});`,
    },
    {
      name: "a DataView with no arguments",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const gl = renderer.getContext();
const pixels = new DataView();
requestAnimationFrame(() => {
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
});`,
    },
    {
      name: "a typed array with four constructor arguments",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const gl = renderer.getContext();
const pixels = new Uint8Array(buffer, 0, 4, extra);
requestAnimationFrame(() => {
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
});`,
    },
    {
      name: "a typed array constructed with a spread",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const gl = renderer.getContext();
const parts = [4];
const pixels = new Uint8Array(...parts);
requestAnimationFrame(() => {
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
});`,
    },
    {
      name: "a canvas-obtained context",
      code: `const gl = canvas.getContext("webgl2");
requestAnimationFrame(() => {
  gl.finish();
});`,
    },
    {
      name: "getContext with an argument is not the renderer accessor",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const gl = renderer.getContext("webgl2");
requestAnimationFrame(() => {
  gl.finish();
});`,
    },
    {
      name: "a context reached through two hops",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const created = renderer.getContext();
const gl = created;
requestAnimationFrame(() => {
  gl.finish();
});`,
    },
    {
      name: "a mutable context binding",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
let gl = renderer.getContext();
gl = other;
requestAnimationFrame(() => {
  gl.finish();
});`,
    },
    {
      name: "an unrelated object with a finish method",
      code: `requestAnimationFrame(() => {
  task.finish();
});`,
    },
    {
      name: "finish with an argument is not the WebGL call",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const gl = renderer.getContext();
requestAnimationFrame(() => {
  gl.finish(true);
});`,
    },
    {
      name: "readPixels with six arguments is an invalid call",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const gl = renderer.getContext();
const pixels = new Uint8Array(4);
requestAnimationFrame(() => {
  gl.readPixels(0, 0, 1, 1, gl.RGBA, pixels);
});`,
    },
    {
      name: "readPixels with nine arguments is an invalid call",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const gl = renderer.getContext();
const pixels = new Uint8Array(4);
requestAnimationFrame(() => {
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels, 0, extra);
});`,
    },
    {
      name: "readRenderTargetPixels with five arguments is an invalid call",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const pixels = new Uint8Array(4);
requestAnimationFrame(() => {
  renderer.readRenderTargetPixels(target, 0, 0, 1, pixels);
});`,
    },
    {
      name: "readRenderTargetPixels with nine arguments is an invalid call",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const pixels = new Uint8Array(4);
requestAnimationFrame(() => {
  renderer.readRenderTargetPixels(target, 0, 0, 1, 1, pixels, 0, 0, extra);
});`,
    },
    {
      name: "readRenderTargetPixels with a spread",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const pixels = new Uint8Array(4);
const parts = [target, 0, 0, 1, 1, pixels];
requestAnimationFrame(() => {
  renderer.readRenderTargetPixels(...parts);
});`,
    },
    {
      name: "readback outside a verified callback",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const gl = renderer.getContext();
gl.finish();`,
    },
    {
      name: "readback in a nested helper",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const gl = renderer.getContext();
requestAnimationFrame(() => {
  queue(() => {
    gl.finish();
  });
});`,
    },
    {
      name: "dynamic method name",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const gl = renderer.getContext();
requestAnimationFrame(() => {
  gl[methodName]();
});`,
    },
    {
      name: "same-named renderer from an unrelated module",
      code: `import { WebGLRenderer } from "my-renderer";
const renderer = new WebGLRenderer();
const gl = renderer.getContext();
requestAnimationFrame(() => {
  gl.finish();
});`,
    },
  ],
  invalid: [
    {
      name: "readPixels into a Int8Array",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const gl = renderer.getContext();
const pixels = new Int8Array(16);
requestAnimationFrame(() => {
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
});`,
      output: null,
      errors: [
        {
          messageId: "synchronousGpuOperationInLoop",
          data: { operation: "gl.readPixels" },
          line: 6,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "readPixels into a Uint8Array",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const gl = renderer.getContext();
const pixels = new Uint8Array(16);
requestAnimationFrame(() => {
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
});`,
      output: null,
      errors: [
        {
          messageId: "synchronousGpuOperationInLoop",
          data: { operation: "gl.readPixels" },
          line: 6,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "readPixels into a Uint8ClampedArray",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const gl = renderer.getContext();
const pixels = new Uint8ClampedArray(16);
requestAnimationFrame(() => {
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
});`,
      output: null,
      errors: [
        {
          messageId: "synchronousGpuOperationInLoop",
          data: { operation: "gl.readPixels" },
          line: 6,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "readPixels into a Int16Array",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const gl = renderer.getContext();
const pixels = new Int16Array(16);
requestAnimationFrame(() => {
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
});`,
      output: null,
      errors: [
        {
          messageId: "synchronousGpuOperationInLoop",
          data: { operation: "gl.readPixels" },
          line: 6,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "readPixels into a Uint16Array",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const gl = renderer.getContext();
const pixels = new Uint16Array(16);
requestAnimationFrame(() => {
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
});`,
      output: null,
      errors: [
        {
          messageId: "synchronousGpuOperationInLoop",
          data: { operation: "gl.readPixels" },
          line: 6,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "readPixels into a Int32Array",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const gl = renderer.getContext();
const pixels = new Int32Array(16);
requestAnimationFrame(() => {
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
});`,
      output: null,
      errors: [
        {
          messageId: "synchronousGpuOperationInLoop",
          data: { operation: "gl.readPixels" },
          line: 6,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "readPixels into a Uint32Array",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const gl = renderer.getContext();
const pixels = new Uint32Array(16);
requestAnimationFrame(() => {
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
});`,
      output: null,
      errors: [
        {
          messageId: "synchronousGpuOperationInLoop",
          data: { operation: "gl.readPixels" },
          line: 6,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "readPixels into a Float32Array",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const gl = renderer.getContext();
const pixels = new Float32Array(16);
requestAnimationFrame(() => {
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
});`,
      output: null,
      errors: [
        {
          messageId: "synchronousGpuOperationInLoop",
          data: { operation: "gl.readPixels" },
          line: 6,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "readPixels into a DataView",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const gl = renderer.getContext();
const pixels = new DataView(buffer);
requestAnimationFrame(() => {
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
});`,
      output: null,
      errors: [
        {
          messageId: "synchronousGpuOperationInLoop",
          data: { operation: "gl.readPixels" },
          line: 6,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "readRenderTargetPixels with six arguments",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const pixels = new Uint8Array(4);
requestAnimationFrame(() => {
  renderer.readRenderTargetPixels(target, 0, 0, 1, 1, pixels);
});`,
      output: null,
      errors: [
        {
          messageId: "synchronousGpuOperationInLoop",
          data: { operation: "renderer.readRenderTargetPixels" },
          line: 5,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "readRenderTargetPixels with a cube face index",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const pixels = new Uint8Array(4);
requestAnimationFrame(() => {
  renderer.readRenderTargetPixels(target, 0, 0, 1, 1, pixels, 0);
});`,
      output: null,
      errors: [
        {
          messageId: "synchronousGpuOperationInLoop",
          data: { operation: "renderer.readRenderTargetPixels" },
          line: 5,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "readRenderTargetPixels with a texture index",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const pixels = new Uint8Array(4);
requestAnimationFrame(() => {
  renderer.readRenderTargetPixels(target, 0, 0, 1, 1, pixels, 0, 0);
});`,
      output: null,
      errors: [
        {
          messageId: "synchronousGpuOperationInLoop",
          data: { operation: "renderer.readRenderTargetPixels" },
          line: 5,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "gl.finish through an immutable context binding",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const gl = renderer.getContext();
requestAnimationFrame(() => {
  gl.finish();
});`,
      output: null,
      errors: [
        {
          messageId: "synchronousGpuOperationInLoop",
          data: { operation: "gl.finish" },
          line: 5,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "gl.finish on a direct getContext call",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
requestAnimationFrame(() => {
  renderer.getContext().finish();
});`,
      output: null,
      errors: [
        {
          messageId: "synchronousGpuOperationInLoop",
          data: { operation: "renderer.getContext().finish" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "readPixels with a destination offset",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const gl = renderer.getContext();
const pixels = new Uint8Array(4);
requestAnimationFrame(() => {
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels, 0);
});`,
      output: null,
      errors: [
        {
          messageId: "synchronousGpuOperationInLoop",
          data: { operation: "gl.readPixels" },
          line: 6,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "destination reached through one receiver alias hop",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const gl = renderer.getContext();
const created = new Uint8Array(4);
const pixels = created;
requestAnimationFrame(() => {
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
});`,
      output: null,
      errors: [
        {
          messageId: "synchronousGpuOperationInLoop",
          data: { operation: "gl.readPixels" },
          line: 7,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "an inline destination construction",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const gl = renderer.getContext();
requestAnimationFrame(() => {
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
});`,
      output: null,
      errors: [
        {
          messageId: "synchronousGpuOperationInLoop",
          data: { operation: "gl.readPixels" },
          line: 5,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "a typed array with no constructor arguments",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const gl = renderer.getContext();
const pixels = new Uint8Array();
requestAnimationFrame(() => {
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
});`,
      output: null,
      errors: [
        {
          messageId: "synchronousGpuOperationInLoop",
          data: { operation: "gl.readPixels" },
          line: 6,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "a typed array over a buffer range",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const gl = renderer.getContext();
const pixels = new Uint8Array(buffer, 0, 4);
requestAnimationFrame(() => {
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
});`,
      output: null,
      errors: [
        {
          messageId: "synchronousGpuOperationInLoop",
          data: { operation: "gl.readPixels" },
          line: 6,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "a DataView over a buffer range",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const gl = renderer.getContext();
const pixels = new DataView(buffer, 0, 4);
requestAnimationFrame(() => {
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
});`,
      output: null,
      errors: [
        {
          messageId: "synchronousGpuOperationInLoop",
          data: { operation: "gl.readPixels" },
          line: 6,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "TypeScript non-null context stays transparent",
      code: `import { WebGLRenderer } from "three";
const renderer = new WebGLRenderer();
const gl = renderer.getContext();
requestAnimationFrame(() => {
  gl!.finish();
});`,
      output: null,
      languageOptions: tsLanguageOptions,
      errors: [
        {
          messageId: "synchronousGpuOperationInLoop",
          data: { operation: "gl!.finish" },
          line: 5,
          column: 3,
          suggestions: [],
        },
      ],
    },
  ],
});
