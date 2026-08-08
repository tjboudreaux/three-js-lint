import rule from "../../src/rules/no-ephemeral-dispose-listener-in-render-loop.js";
import { createRuleTester, tsLanguageOptions } from "../helpers/rule-tester.js";

const ruleTester = createRuleTester();

/*
 * Every shared and source-specific host family is enumerated: all 23 geometries,
 * all 11 buffer attributes, all 16 textures, the render-target bases, all 18
 * classic materials, all 17 WebGPU node materials, and the eight WebGPU-only
 * storage and canvas hosts, plus both directions of the `WebGLCubeRenderTarget`
 * source coupling and both directions of the outer-construction boundary.
 */
ruleTester.run("no-ephemeral-dispose-listener-in-render-loop", rule, {
  valid: [
    {
      name: "registration outside the loop",
      code: `import { BufferGeometry } from "three";
const host = new BufferGeometry();
host.addEventListener("dispose", () => {
  cleanup();
});`,
    },
    {
      name: "stable outer callback identifier",
      code: `import { BufferGeometry } from "three";
const host = new BufferGeometry();
const onDispose = () => {
  cleanup();
};
requestAnimationFrame(() => {
  host.addEventListener("dispose", onDispose);
});`,
    },
    {
      name: "stable outer function declaration",
      code: `import { BufferGeometry } from "three";
const host = new BufferGeometry();
function onDispose() {
  cleanup();
}
requestAnimationFrame(() => {
  host.addEventListener("dispose", onDispose);
});`,
    },
    {
      name: "host constructed inside the callback",
      code: `import { BufferGeometry } from "three";
requestAnimationFrame(() => {
  const host = new BufferGeometry();
  host.addEventListener("dispose", () => {
    cleanup();
  });
});`,
    },
    {
      name: "host constructed inside the callback and aliased outside a nested block",
      code: `import { BufferGeometry } from "three";
requestAnimationFrame(() => {
  const created = new BufferGeometry();
  const host = created;
  host.addEventListener("dispose", () => {
    cleanup();
  });
});`,
    },
    {
      name: "hoisting a nested-block construction to the callback top level needs a mutable binding",
      code: `import { Texture } from "three";
requestAnimationFrame(() => {
  let created;
  {
    created = new Texture();
  }
  const host = created;
  host.addEventListener("dispose", () => {
    cleanup();
  });
});`,
    },
    {
      name: "construction inside a nested block is still inside the callback",
      code: `import { Texture } from "three";
requestAnimationFrame(() => {
  {
    const created = new Texture();
    const host = created;
    host.addEventListener("dispose", () => {
      cleanup();
    });
  }
});`,
    },
    {
      name: "listener is a callback parameter",
      code: `import { BufferGeometry } from "three";
const host = new BufferGeometry();
requestAnimationFrame((listener) => {
  host.addEventListener("dispose", listener);
});`,
    },
    {
      name: "listener is a call result",
      code: `import { BufferGeometry } from "three";
const host = new BufferGeometry();
requestAnimationFrame(() => {
  host.addEventListener("dispose", makeListener());
});`,
    },
    {
      name: "listener is a member expression",
      code: `import { BufferGeometry } from "three";
const host = new BufferGeometry();
requestAnimationFrame(() => {
  host.addEventListener("dispose", handlers.onDispose);
});`,
    },
    {
      name: "listener reached through a two-hop function alias",
      code: `import { BufferGeometry } from "three";
const host = new BufferGeometry();
function onDispose() {
  cleanup();
}
requestAnimationFrame(() => {
  const listener = onDispose;
  host.addEventListener("dispose", listener);
});`,
    },
    {
      name: "listener binding is mutable",
      code: `import { BufferGeometry } from "three";
const host = new BufferGeometry();
requestAnimationFrame(() => {
  let listener = () => {
    cleanup();
  };
  listener = other;
  host.addEventListener("dispose", listener);
});`,
    },
    {
      name: "a different event name",
      code: `import { BufferGeometry } from "three";
const host = new BufferGeometry();
requestAnimationFrame(() => {
  host.addEventListener("update", () => {
    cleanup();
  });
});`,
    },
    {
      name: "a dynamic event name",
      code: `import { BufferGeometry } from "three";
const host = new BufferGeometry();
requestAnimationFrame(() => {
  host.addEventListener(eventName, () => {
    cleanup();
  });
});`,
    },
    {
      name: "removeEventListener is the cure, not the fault",
      code: `import { BufferGeometry } from "three";
const host = new BufferGeometry();
requestAnimationFrame(() => {
  host.removeEventListener("dispose", () => {
    cleanup();
  });
});`,
    },
    {
      name: "a renderer does not dispatch a dispose event",
      code: `import { WebGLRenderer } from "three";
const host = new WebGLRenderer();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => {
    cleanup();
  });
});`,
    },
    {
      name: "an Object3D subclass is outside the host catalog",
      code: `import { InstancedMesh } from "three";
const host = new InstancedMesh(geometry, material, 10);
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => {
    cleanup();
  });
});`,
    },
    {
      name: "Skeleton is outside the host catalog",
      code: `import { Skeleton } from "three";
const host = new Skeleton();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => {
    cleanup();
  });
});`,
    },
    {
      name: "Source is outside the host catalog",
      code: `import { Source } from "three";
const host = new Source();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => {
    cleanup();
  });
});`,
    },
    {
      name: "InterleavedBuffer is outside the host catalog",
      code: `import { InterleavedBuffer } from "three";
const host = new InterleavedBuffer();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => {
    cleanup();
  });
});`,
    },
    {
      name: "a node material imported from three is not a three export",
      code: `import { MeshBasicNodeMaterial } from "three";
const host = new MeshBasicNodeMaterial();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => {
    cleanup();
  });
});`,
    },
    {
      name: "WebGLCubeRenderTarget is not exported by three/webgpu",
      code: `import { WebGLCubeRenderTarget } from "three/webgpu";
const host = new WebGLCubeRenderTarget();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => {
    cleanup();
  });
});`,
    },
    {
      name: "CanvasTarget is not exported by three",
      code: `import { CanvasTarget } from "three";
const host = new CanvasTarget();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => {
    cleanup();
  });
});`,
    },
    {
      name: "spread hides the argument count",
      code: `import { BufferGeometry } from "three";
const host = new BufferGeometry();
const parts = ["dispose"];
requestAnimationFrame(() => {
  host.addEventListener(...parts, () => {
    cleanup();
  });
});`,
    },
    {
      name: "three arguments is not the documented call",
      code: `import { BufferGeometry } from "three";
const host = new BufferGeometry();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => {
    cleanup();
  }, options);
});`,
    },
    {
      name: "computed addEventListener with a dynamic key",
      code: `import { BufferGeometry } from "three";
const host = new BufferGeometry();
requestAnimationFrame(() => {
  host[methodName]("dispose", () => {
    cleanup();
  });
});`,
    },
    {
      name: "mutable host binding",
      code: `import { BufferGeometry } from "three";
let host = new BufferGeometry();
host = other;
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => {
    cleanup();
  });
});`,
    },
    {
      name: "host reached through two alias hops",
      code: `import { BufferGeometry } from "three";
const created = new BufferGeometry();
const middle = created;
const host = middle;
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => {
    cleanup();
  });
});`,
    },
    {
      name: "host is a direct construction",
      code: `import { BufferGeometry } from "three";
requestAnimationFrame(() => {
  new BufferGeometry().addEventListener("dispose", () => {
    cleanup();
  });
});`,
    },
    {
      name: "registration inside a nested helper",
      code: `import { BufferGeometry } from "three";
const host = new BufferGeometry();
requestAnimationFrame(() => {
  queue(() => {
    host.addEventListener("dispose", () => {
      cleanup();
    });
  });
});`,
    },
    {
      name: "same-named host from an unrelated module",
      code: `import { BufferGeometry } from "my-three";
const host = new BufferGeometry();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => {
    cleanup();
  });
});`,
    },
  ],
  invalid: [
    {
      name: "BoxGeometry dispatches dispose",
      code: `import { BoxGeometry } from "three";
const host = new BoxGeometry();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "BufferGeometry dispatches dispose",
      code: `import { BufferGeometry } from "three";
const host = new BufferGeometry();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "CapsuleGeometry dispatches dispose",
      code: `import { CapsuleGeometry } from "three";
const host = new CapsuleGeometry();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "CircleGeometry dispatches dispose",
      code: `import { CircleGeometry } from "three";
const host = new CircleGeometry();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "ConeGeometry dispatches dispose",
      code: `import { ConeGeometry } from "three";
const host = new ConeGeometry();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "CylinderGeometry dispatches dispose",
      code: `import { CylinderGeometry } from "three";
const host = new CylinderGeometry();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "DodecahedronGeometry dispatches dispose",
      code: `import { DodecahedronGeometry } from "three";
const host = new DodecahedronGeometry();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "EdgesGeometry dispatches dispose",
      code: `import { EdgesGeometry } from "three";
const host = new EdgesGeometry();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "ExtrudeGeometry dispatches dispose",
      code: `import { ExtrudeGeometry } from "three";
const host = new ExtrudeGeometry();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "IcosahedronGeometry dispatches dispose",
      code: `import { IcosahedronGeometry } from "three";
const host = new IcosahedronGeometry();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "InstancedBufferGeometry dispatches dispose",
      code: `import { InstancedBufferGeometry } from "three";
const host = new InstancedBufferGeometry();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "LatheGeometry dispatches dispose",
      code: `import { LatheGeometry } from "three";
const host = new LatheGeometry();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "OctahedronGeometry dispatches dispose",
      code: `import { OctahedronGeometry } from "three";
const host = new OctahedronGeometry();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "PlaneGeometry dispatches dispose",
      code: `import { PlaneGeometry } from "three";
const host = new PlaneGeometry();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "PolyhedronGeometry dispatches dispose",
      code: `import { PolyhedronGeometry } from "three";
const host = new PolyhedronGeometry();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "RingGeometry dispatches dispose",
      code: `import { RingGeometry } from "three";
const host = new RingGeometry();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "ShapeGeometry dispatches dispose",
      code: `import { ShapeGeometry } from "three";
const host = new ShapeGeometry();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "SphereGeometry dispatches dispose",
      code: `import { SphereGeometry } from "three";
const host = new SphereGeometry();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "TetrahedronGeometry dispatches dispose",
      code: `import { TetrahedronGeometry } from "three";
const host = new TetrahedronGeometry();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "TorusGeometry dispatches dispose",
      code: `import { TorusGeometry } from "three";
const host = new TorusGeometry();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "TorusKnotGeometry dispatches dispose",
      code: `import { TorusKnotGeometry } from "three";
const host = new TorusKnotGeometry();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "TubeGeometry dispatches dispose",
      code: `import { TubeGeometry } from "three";
const host = new TubeGeometry();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "WireframeGeometry dispatches dispose",
      code: `import { WireframeGeometry } from "three";
const host = new WireframeGeometry();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "BufferAttribute dispatches dispose",
      code: `import { BufferAttribute } from "three/webgpu";
const host = new BufferAttribute();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "Float16BufferAttribute dispatches dispose",
      code: `import { Float16BufferAttribute } from "three/webgpu";
const host = new Float16BufferAttribute();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "Float32BufferAttribute dispatches dispose",
      code: `import { Float32BufferAttribute } from "three/webgpu";
const host = new Float32BufferAttribute();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "InstancedBufferAttribute dispatches dispose",
      code: `import { InstancedBufferAttribute } from "three/webgpu";
const host = new InstancedBufferAttribute();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "Int16BufferAttribute dispatches dispose",
      code: `import { Int16BufferAttribute } from "three/webgpu";
const host = new Int16BufferAttribute();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "Int32BufferAttribute dispatches dispose",
      code: `import { Int32BufferAttribute } from "three/webgpu";
const host = new Int32BufferAttribute();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "Int8BufferAttribute dispatches dispose",
      code: `import { Int8BufferAttribute } from "three/webgpu";
const host = new Int8BufferAttribute();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "Uint16BufferAttribute dispatches dispose",
      code: `import { Uint16BufferAttribute } from "three/webgpu";
const host = new Uint16BufferAttribute();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "Uint32BufferAttribute dispatches dispose",
      code: `import { Uint32BufferAttribute } from "three/webgpu";
const host = new Uint32BufferAttribute();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "Uint8BufferAttribute dispatches dispose",
      code: `import { Uint8BufferAttribute } from "three/webgpu";
const host = new Uint8BufferAttribute();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "Uint8ClampedBufferAttribute dispatches dispose",
      code: `import { Uint8ClampedBufferAttribute } from "three/webgpu";
const host = new Uint8ClampedBufferAttribute();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "CanvasTexture dispatches dispose",
      code: `import { CanvasTexture } from "three";
const host = new CanvasTexture();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "CompressedArrayTexture dispatches dispose",
      code: `import { CompressedArrayTexture } from "three";
const host = new CompressedArrayTexture();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "CompressedCubeTexture dispatches dispose",
      code: `import { CompressedCubeTexture } from "three";
const host = new CompressedCubeTexture();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "CompressedTexture dispatches dispose",
      code: `import { CompressedTexture } from "three";
const host = new CompressedTexture();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "CubeDepthTexture dispatches dispose",
      code: `import { CubeDepthTexture } from "three";
const host = new CubeDepthTexture();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "CubeTexture dispatches dispose",
      code: `import { CubeTexture } from "three";
const host = new CubeTexture();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "Data3DTexture dispatches dispose",
      code: `import { Data3DTexture } from "three";
const host = new Data3DTexture();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "DataArrayTexture dispatches dispose",
      code: `import { DataArrayTexture } from "three";
const host = new DataArrayTexture();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "DataTexture dispatches dispose",
      code: `import { DataTexture } from "three";
const host = new DataTexture();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "DepthTexture dispatches dispose",
      code: `import { DepthTexture } from "three";
const host = new DepthTexture();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "ExternalTexture dispatches dispose",
      code: `import { ExternalTexture } from "three";
const host = new ExternalTexture();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "FramebufferTexture dispatches dispose",
      code: `import { FramebufferTexture } from "three";
const host = new FramebufferTexture();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "HTMLTexture dispatches dispose",
      code: `import { HTMLTexture } from "three";
const host = new HTMLTexture();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "Texture dispatches dispose",
      code: `import { Texture } from "three";
const host = new Texture();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "VideoFrameTexture dispatches dispose",
      code: `import { VideoFrameTexture } from "three";
const host = new VideoFrameTexture();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "VideoTexture dispatches dispose",
      code: `import { VideoTexture } from "three";
const host = new VideoTexture();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "RenderTarget dispatches dispose",
      code: `import { RenderTarget } from "three/webgpu";
const host = new RenderTarget();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "RenderTarget3D dispatches dispose",
      code: `import { RenderTarget3D } from "three/webgpu";
const host = new RenderTarget3D();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "Material dispatches dispose",
      code: `import { Material } from "three";
const host = new Material();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "ShadowMaterial dispatches dispose",
      code: `import { ShadowMaterial } from "three";
const host = new ShadowMaterial();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "SpriteMaterial dispatches dispose",
      code: `import { SpriteMaterial } from "three";
const host = new SpriteMaterial();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "RawShaderMaterial dispatches dispose",
      code: `import { RawShaderMaterial } from "three";
const host = new RawShaderMaterial();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "ShaderMaterial dispatches dispose",
      code: `import { ShaderMaterial } from "three";
const host = new ShaderMaterial();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "PointsMaterial dispatches dispose",
      code: `import { PointsMaterial } from "three";
const host = new PointsMaterial();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "MeshStandardMaterial dispatches dispose",
      code: `import { MeshStandardMaterial } from "three";
const host = new MeshStandardMaterial();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "MeshPhysicalMaterial dispatches dispose",
      code: `import { MeshPhysicalMaterial } from "three";
const host = new MeshPhysicalMaterial();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "MeshPhongMaterial dispatches dispose",
      code: `import { MeshPhongMaterial } from "three";
const host = new MeshPhongMaterial();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "MeshToonMaterial dispatches dispose",
      code: `import { MeshToonMaterial } from "three";
const host = new MeshToonMaterial();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "MeshNormalMaterial dispatches dispose",
      code: `import { MeshNormalMaterial } from "three";
const host = new MeshNormalMaterial();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "MeshLambertMaterial dispatches dispose",
      code: `import { MeshLambertMaterial } from "three";
const host = new MeshLambertMaterial();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "MeshMatcapMaterial dispatches dispose",
      code: `import { MeshMatcapMaterial } from "three";
const host = new MeshMatcapMaterial();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "MeshBasicMaterial dispatches dispose",
      code: `import { MeshBasicMaterial } from "three";
const host = new MeshBasicMaterial();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "MeshDepthMaterial dispatches dispose",
      code: `import { MeshDepthMaterial } from "three";
const host = new MeshDepthMaterial();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "MeshDistanceMaterial dispatches dispose",
      code: `import { MeshDistanceMaterial } from "three";
const host = new MeshDistanceMaterial();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "LineBasicMaterial dispatches dispose",
      code: `import { LineBasicMaterial } from "three";
const host = new LineBasicMaterial();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "LineDashedMaterial dispatches dispose",
      code: `import { LineDashedMaterial } from "three";
const host = new LineDashedMaterial();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "Line2NodeMaterial dispatches dispose",
      code: `import { Line2NodeMaterial } from "three/webgpu";
const host = new Line2NodeMaterial();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "LineBasicNodeMaterial dispatches dispose",
      code: `import { LineBasicNodeMaterial } from "three/webgpu";
const host = new LineBasicNodeMaterial();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "LineDashedNodeMaterial dispatches dispose",
      code: `import { LineDashedNodeMaterial } from "three/webgpu";
const host = new LineDashedNodeMaterial();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "MeshBasicNodeMaterial dispatches dispose",
      code: `import { MeshBasicNodeMaterial } from "three/webgpu";
const host = new MeshBasicNodeMaterial();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "MeshLambertNodeMaterial dispatches dispose",
      code: `import { MeshLambertNodeMaterial } from "three/webgpu";
const host = new MeshLambertNodeMaterial();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "MeshMatcapNodeMaterial dispatches dispose",
      code: `import { MeshMatcapNodeMaterial } from "three/webgpu";
const host = new MeshMatcapNodeMaterial();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "MeshNormalNodeMaterial dispatches dispose",
      code: `import { MeshNormalNodeMaterial } from "three/webgpu";
const host = new MeshNormalNodeMaterial();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "MeshPhongNodeMaterial dispatches dispose",
      code: `import { MeshPhongNodeMaterial } from "three/webgpu";
const host = new MeshPhongNodeMaterial();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "MeshPhysicalNodeMaterial dispatches dispose",
      code: `import { MeshPhysicalNodeMaterial } from "three/webgpu";
const host = new MeshPhysicalNodeMaterial();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "MeshSSSNodeMaterial dispatches dispose",
      code: `import { MeshSSSNodeMaterial } from "three/webgpu";
const host = new MeshSSSNodeMaterial();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "MeshStandardNodeMaterial dispatches dispose",
      code: `import { MeshStandardNodeMaterial } from "three/webgpu";
const host = new MeshStandardNodeMaterial();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "MeshToonNodeMaterial dispatches dispose",
      code: `import { MeshToonNodeMaterial } from "three/webgpu";
const host = new MeshToonNodeMaterial();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "NodeMaterial dispatches dispose",
      code: `import { NodeMaterial } from "three/webgpu";
const host = new NodeMaterial();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "PointsNodeMaterial dispatches dispose",
      code: `import { PointsNodeMaterial } from "three/webgpu";
const host = new PointsNodeMaterial();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "ShadowNodeMaterial dispatches dispose",
      code: `import { ShadowNodeMaterial } from "three/webgpu";
const host = new ShadowNodeMaterial();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "SpriteNodeMaterial dispatches dispose",
      code: `import { SpriteNodeMaterial } from "three/webgpu";
const host = new SpriteNodeMaterial();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "VolumeNodeMaterial dispatches dispose",
      code: `import { VolumeNodeMaterial } from "three/webgpu";
const host = new VolumeNodeMaterial();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "CanvasTarget dispatches dispose",
      code: `import { CanvasTarget } from "three/webgpu";
const host = new CanvasTarget();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "CubeRenderTarget dispatches dispose",
      code: `import { CubeRenderTarget } from "three/webgpu";
const host = new CubeRenderTarget();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "IndirectStorageBufferAttribute dispatches dispose",
      code: `import { IndirectStorageBufferAttribute } from "three/webgpu";
const host = new IndirectStorageBufferAttribute();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "Storage3DTexture dispatches dispose",
      code: `import { Storage3DTexture } from "three/webgpu";
const host = new Storage3DTexture();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "StorageArrayTexture dispatches dispose",
      code: `import { StorageArrayTexture } from "three/webgpu";
const host = new StorageArrayTexture();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "StorageBufferAttribute dispatches dispose",
      code: `import { StorageBufferAttribute } from "three/webgpu";
const host = new StorageBufferAttribute();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "StorageInstancedBufferAttribute dispatches dispose",
      code: `import { StorageInstancedBufferAttribute } from "three/webgpu";
const host = new StorageInstancedBufferAttribute();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "StorageTexture dispatches dispose",
      code: `import { StorageTexture } from "three/webgpu";
const host = new StorageTexture();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "WebGLCubeRenderTarget is exported only by three",
      code: `import { WebGLCubeRenderTarget } from "three";
const host = new WebGLCubeRenderTarget();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => { cleanup(); });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "inline function expression listener",
      code: `import { Texture } from "three";
const host = new Texture();
requestAnimationFrame(() => {
  host.addEventListener("dispose", function () {
    cleanup();
  });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "callback-local function declaration",
      code: `import { Texture } from "three";
const host = new Texture();
requestAnimationFrame(() => {
  function onDispose() {
    cleanup();
  }
  host.addEventListener("dispose", onDispose);
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 7,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "callback-local arrow binding",
      code: `import { Texture } from "three";
const host = new Texture();
requestAnimationFrame(() => {
  const onDispose = () => {
    cleanup();
  };
  host.addEventListener("dispose", onDispose);
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 7,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "callback-local function expression binding",
      code: `import { Texture } from "three";
const host = new Texture();
requestAnimationFrame(() => {
  const onDispose = function () {
    cleanup();
  };
  host.addEventListener("dispose", onDispose);
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 7,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "outer host reached through one callback-local alias",
      code: `import { Texture } from "three";
const host = new Texture();
requestAnimationFrame(() => {
  const target = host;
  target.addEventListener("dispose", () => {
    cleanup();
  });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 5,
          column: 38,
          suggestions: [],
        },
      ],
    },
    {
      name: "namespace-imported host",
      code: `import * as THREE from "three";
const host = new THREE.DataTexture();
requestAnimationFrame(() => {
  host.addEventListener("dispose", () => {
    cleanup();
  });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 36,
          suggestions: [],
        },
      ],
    },
    {
      name: "computed event name resolved from a string literal",
      code: `import { Texture } from "three";
const host = new Texture();
requestAnimationFrame(() => {
  host["addEventListener"]("dispose", () => {
    cleanup();
  });
});`,
      output: null,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 39,
          suggestions: [],
        },
      ],
    },
    {
      name: "TypeScript non-null host stays transparent",
      code: `import { Texture } from "three";
const host = new Texture();
requestAnimationFrame(() => {
  host!.addEventListener("dispose", () => {
    cleanup();
  });
});`,
      output: null,
      languageOptions: tsLanguageOptions,
      errors: [
        {
          messageId: "ephemeralDisposeListenerInLoop",
          line: 4,
          column: 37,
          suggestions: [],
        },
      ],
    },
  ],
});
