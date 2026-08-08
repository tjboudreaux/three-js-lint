import rule from "../../src/rules/no-three-loader-parse-in-render-loop.js";
import { createRuleTester, jsLanguageOptions, tsLanguageOptions } from "../helpers/rule-tester.js";

const ruleTester = createRuleTester();

/*
 * Every accepted source/class pair is enumerated rather than sampled: 11 core
 * pairs, all 40 addon classes under each of the two direct prefixes, and the 38
 * classes the bare `three/addons` barrel re-exports — 129 positives in total.
 */
ruleTester.run("no-three-loader-parse-in-render-loop", rule, {
  valid: [
    {
      name: "barrel does not re-export USDZLoader",
      code: `import { USDZLoader } from "three/addons";
const loader = new USDZLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
    },
    {
      name: "barrel does not re-export MaterialXLoader",
      code: `import { MaterialXLoader } from "three/addons";
const loader = new MaterialXLoader();
requestAnimationFrame(() => {
  loader.parse(text);
});`,
    },
    {
      name: "GLTFLoader reports through a callback",
      code: `import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
const loader = new GLTFLoader();
requestAnimationFrame(() => {
  loader.parse(data, "", onLoad);
});`,
    },
    {
      name: "DRACOLoader reports through a callback",
      code: `import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
const loader = new DRACOLoader();
requestAnimationFrame(() => {
  loader.parse(data, onLoad);
});`,
    },
    {
      name: "KTX2Loader reports through a callback",
      code: `import { KTX2Loader } from "three/addons/loaders/KTX2Loader.js";
const loader = new KTX2Loader();
requestAnimationFrame(() => {
  loader.parse(data, onLoad);
});`,
    },
    {
      name: "LDrawLoader reports through a callback",
      code: `import { LDrawLoader } from "three/addons/loaders/LDrawLoader.js";
const loader = new LDrawLoader();
requestAnimationFrame(() => {
  loader.parse(data, onLoad);
});`,
    },
    {
      name: "Rhino3dmLoader reports through a callback",
      code: `import { Rhino3dmLoader } from "three/addons/loaders/3DMLoader.js";
const loader = new Rhino3dmLoader();
requestAnimationFrame(() => {
  loader.parse(data, onLoad);
});`,
    },
    {
      name: "UltraHDRLoader reports through a callback",
      code: `import { UltraHDRLoader } from "three/addons/loaders/UltraHDRLoader.js";
const loader = new UltraHDRLoader();
requestAnimationFrame(() => {
  loader.parse(data, onLoad);
});`,
    },
    {
      name: "3MFLoader file exports ThreeMFLoader, not 3MFLoader",
      code: `import { MFLoader } from "three/addons/loaders/3MFLoader.js";
const loader = new MFLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
    },
    {
      name: "ThreeMFLoader from a mismatched file name",
      code: `import { ThreeMFLoader } from "three/addons/loaders/ThreeMFLoader.js";
const loader = new ThreeMFLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
    },
    {
      name: "addon loader class from a core module",
      code: `import { OBJLoader } from "three";
const loader = new OBJLoader();
requestAnimationFrame(() => {
  loader.parse(text);
});`,
    },
    {
      name: "node loader is not exported by three",
      code: `import { NodeLoader } from "three";
const loader = new NodeLoader();
requestAnimationFrame(() => {
  loader.parse(json);
});`,
    },
    {
      name: "loader class from an unrelated module",
      code: `import { OBJLoader } from "my-loaders";
const loader = new OBJLoader();
requestAnimationFrame(() => {
  loader.parse(text);
});`,
    },
    {
      name: "arbitrary deep three path",
      code: `import { ObjectLoader } from "three/src/loaders/ObjectLoader.js";
const loader = new ObjectLoader();
requestAnimationFrame(() => {
  loader.parse(json);
});`,
    },
    {
      name: "addon path outside the loaders directory",
      code: `import { OBJLoader } from "three/addons/OBJLoader.js";
const loader = new OBJLoader();
requestAnimationFrame(() => {
  loader.parse(text);
});`,
    },
    {
      name: "addon path without the .js extension",
      code: `import { OBJLoader } from "three/addons/loaders/OBJLoader";
const loader = new OBJLoader();
requestAnimationFrame(() => {
  loader.parse(text);
});`,
    },
    {
      name: "parseAsync hands its work to a promise",
      code: `import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
const loader = new OBJLoader();
requestAnimationFrame(() => {
  loader.parseAsync(text);
});`,
    },
    {
      name: "load fetches rather than parses",
      code: `import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
const loader = new OBJLoader();
requestAnimationFrame(() => {
  loader.load(url, onLoad);
});`,
    },
    {
      name: "loadAsync fetches rather than parses",
      code: `import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
const loader = new OBJLoader();
requestAnimationFrame(() => {
  loader.loadAsync(url);
});`,
    },
    {
      name: "FBXLoader parse needs a path argument",
      code: `import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
const loader = new FBXLoader();
requestAnimationFrame(() => {
  loader.parse(buffer);
});`,
    },
    {
      name: "LWOLoader parse needs three arguments",
      code: `import { LWOLoader } from "three/addons/loaders/LWOLoader.js";
const loader = new LWOLoader();
requestAnimationFrame(() => {
  loader.parse(buffer, path);
});`,
    },
    {
      name: "spread hides the argument count",
      code: `import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
const loader = new OBJLoader();
const parts = [text];
requestAnimationFrame(() => {
  loader.parse(...parts);
});`,
    },
    {
      name: "type-only import is erased at runtime",
      code: `import type { OBJLoader } from "three/addons/loaders/OBJLoader.js";
const loader = new OBJLoader();
requestAnimationFrame(() => {
  loader.parse(text);
});`,
      languageOptions: tsLanguageOptions,
    },
    {
      name: "default import is not a named export",
      code: `import OBJLoader from "three/addons/loaders/OBJLoader.js";
const loader = new OBJLoader();
requestAnimationFrame(() => {
  loader.parse(text);
});`,
    },
    {
      name: "CommonJS require is not an import",
      code: `const { OBJLoader } = require("three/addons/loaders/OBJLoader.js");
const loader = new OBJLoader();
requestAnimationFrame(() => {
  loader.parse(text);
});`,
      languageOptions: { ...jsLanguageOptions, sourceType: "commonjs" as const },
    },
    {
      name: "mutable loader binding",
      code: `import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
let loader = new OBJLoader();
loader = other;
requestAnimationFrame(() => {
  loader.parse(text);
});`,
    },
    {
      name: "loader reached through two alias hops",
      code: `import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
const created = new OBJLoader();
const middle = created;
const loader = middle;
requestAnimationFrame(() => {
  loader.parse(text);
});`,
    },
    {
      name: "parse outside a verified callback",
      code: `import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
const loader = new OBJLoader();
loader.parse(text);`,
    },
    {
      name: "parse in a callback nested inside the loop",
      code: `import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
const loader = new OBJLoader();
requestAnimationFrame(() => {
  queue(() => {
    loader.parse(text);
  });
});`,
    },
    {
      name: "computed parse access with a dynamic key",
      code: `import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
const loader = new OBJLoader();
requestAnimationFrame(() => {
  loader[methodName](text);
});`,
    },
  ],
  invalid: [
    {
      name: "AnimationLoader from three",
      code: `import { AnimationLoader } from "three";
const loader = new AnimationLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "BufferGeometryLoader from three",
      code: `import { BufferGeometryLoader } from "three";
const loader = new BufferGeometryLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "MaterialLoader from three",
      code: `import { MaterialLoader } from "three";
const loader = new MaterialLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "ObjectLoader from three",
      code: `import { ObjectLoader } from "three";
const loader = new ObjectLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "AnimationLoader from three/webgpu",
      code: `import { AnimationLoader } from "three/webgpu";
const loader = new AnimationLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "BufferGeometryLoader from three/webgpu",
      code: `import { BufferGeometryLoader } from "three/webgpu";
const loader = new BufferGeometryLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "MaterialLoader from three/webgpu",
      code: `import { MaterialLoader } from "three/webgpu";
const loader = new MaterialLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "NodeLoader from three/webgpu",
      code: `import { NodeLoader } from "three/webgpu";
const loader = new NodeLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "NodeMaterialLoader from three/webgpu",
      code: `import { NodeMaterialLoader } from "three/webgpu";
const loader = new NodeMaterialLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "NodeObjectLoader from three/webgpu",
      code: `import { NodeObjectLoader } from "three/webgpu";
const loader = new NodeObjectLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "ObjectLoader from three/webgpu",
      code: `import { ObjectLoader } from "three/webgpu";
const loader = new ObjectLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "ThreeMFLoader from three/addons/loaders/3MFLoader.js",
      code: `import { ThreeMFLoader } from "three/addons/loaders/3MFLoader.js";
const loader = new ThreeMFLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "ThreeMFLoader from three/examples/jsm/loaders/3MFLoader.js",
      code: `import { ThreeMFLoader } from "three/examples/jsm/loaders/3MFLoader.js";
const loader = new ThreeMFLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "AMFLoader from three/addons/loaders/AMFLoader.js",
      code: `import { AMFLoader } from "three/addons/loaders/AMFLoader.js";
const loader = new AMFLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "AMFLoader from three/examples/jsm/loaders/AMFLoader.js",
      code: `import { AMFLoader } from "three/examples/jsm/loaders/AMFLoader.js";
const loader = new AMFLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "BVHLoader from three/addons/loaders/BVHLoader.js",
      code: `import { BVHLoader } from "three/addons/loaders/BVHLoader.js";
const loader = new BVHLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "BVHLoader from three/examples/jsm/loaders/BVHLoader.js",
      code: `import { BVHLoader } from "three/examples/jsm/loaders/BVHLoader.js";
const loader = new BVHLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "ColladaLoader from three/addons/loaders/ColladaLoader.js",
      code: `import { ColladaLoader } from "three/addons/loaders/ColladaLoader.js";
const loader = new ColladaLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "ColladaLoader from three/examples/jsm/loaders/ColladaLoader.js",
      code: `import { ColladaLoader } from "three/examples/jsm/loaders/ColladaLoader.js";
const loader = new ColladaLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "DDSLoader from three/addons/loaders/DDSLoader.js",
      code: `import { DDSLoader } from "three/addons/loaders/DDSLoader.js";
const loader = new DDSLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "DDSLoader from three/examples/jsm/loaders/DDSLoader.js",
      code: `import { DDSLoader } from "three/examples/jsm/loaders/DDSLoader.js";
const loader = new DDSLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "EXRLoader from three/addons/loaders/EXRLoader.js",
      code: `import { EXRLoader } from "three/addons/loaders/EXRLoader.js";
const loader = new EXRLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "EXRLoader from three/examples/jsm/loaders/EXRLoader.js",
      code: `import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";
const loader = new EXRLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "FBXLoader from three/addons/loaders/FBXLoader.js",
      code: `import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
const loader = new FBXLoader();
requestAnimationFrame(() => {
  loader.parse(data, path);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "FBXLoader from three/examples/jsm/loaders/FBXLoader.js",
      code: `import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
const loader = new FBXLoader();
requestAnimationFrame(() => {
  loader.parse(data, path);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "FontLoader from three/addons/loaders/FontLoader.js",
      code: `import { FontLoader } from "three/addons/loaders/FontLoader.js";
const loader = new FontLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "FontLoader from three/examples/jsm/loaders/FontLoader.js",
      code: `import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
const loader = new FontLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "GCodeLoader from three/addons/loaders/GCodeLoader.js",
      code: `import { GCodeLoader } from "three/addons/loaders/GCodeLoader.js";
const loader = new GCodeLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "GCodeLoader from three/examples/jsm/loaders/GCodeLoader.js",
      code: `import { GCodeLoader } from "three/examples/jsm/loaders/GCodeLoader.js";
const loader = new GCodeLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "HDRLoader from three/addons/loaders/HDRLoader.js",
      code: `import { HDRLoader } from "three/addons/loaders/HDRLoader.js";
const loader = new HDRLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "HDRLoader from three/examples/jsm/loaders/HDRLoader.js",
      code: `import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
const loader = new HDRLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "IESLoader from three/addons/loaders/IESLoader.js",
      code: `import { IESLoader } from "three/addons/loaders/IESLoader.js";
const loader = new IESLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "IESLoader from three/examples/jsm/loaders/IESLoader.js",
      code: `import { IESLoader } from "three/examples/jsm/loaders/IESLoader.js";
const loader = new IESLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "KMZLoader from three/addons/loaders/KMZLoader.js",
      code: `import { KMZLoader } from "three/addons/loaders/KMZLoader.js";
const loader = new KMZLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "KMZLoader from three/examples/jsm/loaders/KMZLoader.js",
      code: `import { KMZLoader } from "three/examples/jsm/loaders/KMZLoader.js";
const loader = new KMZLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "KTXLoader from three/addons/loaders/KTXLoader.js",
      code: `import { KTXLoader } from "three/addons/loaders/KTXLoader.js";
const loader = new KTXLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "KTXLoader from three/examples/jsm/loaders/KTXLoader.js",
      code: `import { KTXLoader } from "three/examples/jsm/loaders/KTXLoader.js";
const loader = new KTXLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "LUT3dlLoader from three/addons/loaders/LUT3dlLoader.js",
      code: `import { LUT3dlLoader } from "three/addons/loaders/LUT3dlLoader.js";
const loader = new LUT3dlLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "LUT3dlLoader from three/examples/jsm/loaders/LUT3dlLoader.js",
      code: `import { LUT3dlLoader } from "three/examples/jsm/loaders/LUT3dlLoader.js";
const loader = new LUT3dlLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "LUTCubeLoader from three/addons/loaders/LUTCubeLoader.js",
      code: `import { LUTCubeLoader } from "three/addons/loaders/LUTCubeLoader.js";
const loader = new LUTCubeLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "LUTCubeLoader from three/examples/jsm/loaders/LUTCubeLoader.js",
      code: `import { LUTCubeLoader } from "three/examples/jsm/loaders/LUTCubeLoader.js";
const loader = new LUTCubeLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "LUTImageLoader from three/addons/loaders/LUTImageLoader.js",
      code: `import { LUTImageLoader } from "three/addons/loaders/LUTImageLoader.js";
const loader = new LUTImageLoader();
requestAnimationFrame(() => {
  loader.parse(data, path);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "LUTImageLoader from three/examples/jsm/loaders/LUTImageLoader.js",
      code: `import { LUTImageLoader } from "three/examples/jsm/loaders/LUTImageLoader.js";
const loader = new LUTImageLoader();
requestAnimationFrame(() => {
  loader.parse(data, path);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "LWOLoader from three/addons/loaders/LWOLoader.js",
      code: `import { LWOLoader } from "three/addons/loaders/LWOLoader.js";
const loader = new LWOLoader();
requestAnimationFrame(() => {
  loader.parse(data, path, modelName);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "LWOLoader from three/examples/jsm/loaders/LWOLoader.js",
      code: `import { LWOLoader } from "three/examples/jsm/loaders/LWOLoader.js";
const loader = new LWOLoader();
requestAnimationFrame(() => {
  loader.parse(data, path, modelName);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "MD2Loader from three/addons/loaders/MD2Loader.js",
      code: `import { MD2Loader } from "three/addons/loaders/MD2Loader.js";
const loader = new MD2Loader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "MD2Loader from three/examples/jsm/loaders/MD2Loader.js",
      code: `import { MD2Loader } from "three/examples/jsm/loaders/MD2Loader.js";
const loader = new MD2Loader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "MDDLoader from three/addons/loaders/MDDLoader.js",
      code: `import { MDDLoader } from "three/addons/loaders/MDDLoader.js";
const loader = new MDDLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "MDDLoader from three/examples/jsm/loaders/MDDLoader.js",
      code: `import { MDDLoader } from "three/examples/jsm/loaders/MDDLoader.js";
const loader = new MDDLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "MTLLoader from three/addons/loaders/MTLLoader.js",
      code: `import { MTLLoader } from "three/addons/loaders/MTLLoader.js";
const loader = new MTLLoader();
requestAnimationFrame(() => {
  loader.parse(data, path);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "MTLLoader from three/examples/jsm/loaders/MTLLoader.js",
      code: `import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";
const loader = new MTLLoader();
requestAnimationFrame(() => {
  loader.parse(data, path);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "MaterialXLoader from three/addons/loaders/MaterialXLoader.js",
      code: `import { MaterialXLoader } from "three/addons/loaders/MaterialXLoader.js";
const loader = new MaterialXLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "MaterialXLoader from three/examples/jsm/loaders/MaterialXLoader.js",
      code: `import { MaterialXLoader } from "three/examples/jsm/loaders/MaterialXLoader.js";
const loader = new MaterialXLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "NRRDLoader from three/addons/loaders/NRRDLoader.js",
      code: `import { NRRDLoader } from "three/addons/loaders/NRRDLoader.js";
const loader = new NRRDLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "NRRDLoader from three/examples/jsm/loaders/NRRDLoader.js",
      code: `import { NRRDLoader } from "three/examples/jsm/loaders/NRRDLoader.js";
const loader = new NRRDLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "OBJLoader from three/addons/loaders/OBJLoader.js",
      code: `import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
const loader = new OBJLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "OBJLoader from three/examples/jsm/loaders/OBJLoader.js",
      code: `import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
const loader = new OBJLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "PCDLoader from three/addons/loaders/PCDLoader.js",
      code: `import { PCDLoader } from "three/addons/loaders/PCDLoader.js";
const loader = new PCDLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "PCDLoader from three/examples/jsm/loaders/PCDLoader.js",
      code: `import { PCDLoader } from "three/examples/jsm/loaders/PCDLoader.js";
const loader = new PCDLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "PDBLoader from three/addons/loaders/PDBLoader.js",
      code: `import { PDBLoader } from "three/addons/loaders/PDBLoader.js";
const loader = new PDBLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "PDBLoader from three/examples/jsm/loaders/PDBLoader.js",
      code: `import { PDBLoader } from "three/examples/jsm/loaders/PDBLoader.js";
const loader = new PDBLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "PLYLoader from three/addons/loaders/PLYLoader.js",
      code: `import { PLYLoader } from "three/addons/loaders/PLYLoader.js";
const loader = new PLYLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "PLYLoader from three/examples/jsm/loaders/PLYLoader.js",
      code: `import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";
const loader = new PLYLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "PVRLoader from three/addons/loaders/PVRLoader.js",
      code: `import { PVRLoader } from "three/addons/loaders/PVRLoader.js";
const loader = new PVRLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "PVRLoader from three/examples/jsm/loaders/PVRLoader.js",
      code: `import { PVRLoader } from "three/examples/jsm/loaders/PVRLoader.js";
const loader = new PVRLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "RGBELoader from three/addons/loaders/RGBELoader.js",
      code: `import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
const loader = new RGBELoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "RGBELoader from three/examples/jsm/loaders/RGBELoader.js",
      code: `import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
const loader = new RGBELoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "STLLoader from three/addons/loaders/STLLoader.js",
      code: `import { STLLoader } from "three/addons/loaders/STLLoader.js";
const loader = new STLLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "STLLoader from three/examples/jsm/loaders/STLLoader.js",
      code: `import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
const loader = new STLLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "SVGLoader from three/addons/loaders/SVGLoader.js",
      code: `import { SVGLoader } from "three/addons/loaders/SVGLoader.js";
const loader = new SVGLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "SVGLoader from three/examples/jsm/loaders/SVGLoader.js",
      code: `import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
const loader = new SVGLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "TDSLoader from three/addons/loaders/TDSLoader.js",
      code: `import { TDSLoader } from "three/addons/loaders/TDSLoader.js";
const loader = new TDSLoader();
requestAnimationFrame(() => {
  loader.parse(data, path);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "TDSLoader from three/examples/jsm/loaders/TDSLoader.js",
      code: `import { TDSLoader } from "three/examples/jsm/loaders/TDSLoader.js";
const loader = new TDSLoader();
requestAnimationFrame(() => {
  loader.parse(data, path);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "TGALoader from three/addons/loaders/TGALoader.js",
      code: `import { TGALoader } from "three/addons/loaders/TGALoader.js";
const loader = new TGALoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "TGALoader from three/examples/jsm/loaders/TGALoader.js",
      code: `import { TGALoader } from "three/examples/jsm/loaders/TGALoader.js";
const loader = new TGALoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "TIFFLoader from three/addons/loaders/TIFFLoader.js",
      code: `import { TIFFLoader } from "three/addons/loaders/TIFFLoader.js";
const loader = new TIFFLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "TIFFLoader from three/examples/jsm/loaders/TIFFLoader.js",
      code: `import { TIFFLoader } from "three/examples/jsm/loaders/TIFFLoader.js";
const loader = new TIFFLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "TTFLoader from three/addons/loaders/TTFLoader.js",
      code: `import { TTFLoader } from "three/addons/loaders/TTFLoader.js";
const loader = new TTFLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "TTFLoader from three/examples/jsm/loaders/TTFLoader.js",
      code: `import { TTFLoader } from "three/examples/jsm/loaders/TTFLoader.js";
const loader = new TTFLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "USDLoader from three/addons/loaders/USDLoader.js",
      code: `import { USDLoader } from "three/addons/loaders/USDLoader.js";
const loader = new USDLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "USDLoader from three/examples/jsm/loaders/USDLoader.js",
      code: `import { USDLoader } from "three/examples/jsm/loaders/USDLoader.js";
const loader = new USDLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "USDZLoader from three/addons/loaders/USDZLoader.js",
      code: `import { USDZLoader } from "three/addons/loaders/USDZLoader.js";
const loader = new USDZLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "USDZLoader from three/examples/jsm/loaders/USDZLoader.js",
      code: `import { USDZLoader } from "three/examples/jsm/loaders/USDZLoader.js";
const loader = new USDZLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "VOXLoader from three/addons/loaders/VOXLoader.js",
      code: `import { VOXLoader } from "three/addons/loaders/VOXLoader.js";
const loader = new VOXLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "VOXLoader from three/examples/jsm/loaders/VOXLoader.js",
      code: `import { VOXLoader } from "three/examples/jsm/loaders/VOXLoader.js";
const loader = new VOXLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "VRMLLoader from three/addons/loaders/VRMLLoader.js",
      code: `import { VRMLLoader } from "three/addons/loaders/VRMLLoader.js";
const loader = new VRMLLoader();
requestAnimationFrame(() => {
  loader.parse(data, path);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "VRMLLoader from three/examples/jsm/loaders/VRMLLoader.js",
      code: `import { VRMLLoader } from "three/examples/jsm/loaders/VRMLLoader.js";
const loader = new VRMLLoader();
requestAnimationFrame(() => {
  loader.parse(data, path);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "VTKLoader from three/addons/loaders/VTKLoader.js",
      code: `import { VTKLoader } from "three/addons/loaders/VTKLoader.js";
const loader = new VTKLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "VTKLoader from three/examples/jsm/loaders/VTKLoader.js",
      code: `import { VTKLoader } from "three/examples/jsm/loaders/VTKLoader.js";
const loader = new VTKLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "XYZLoader from three/addons/loaders/XYZLoader.js",
      code: `import { XYZLoader } from "three/addons/loaders/XYZLoader.js";
const loader = new XYZLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "XYZLoader from three/examples/jsm/loaders/XYZLoader.js",
      code: `import { XYZLoader } from "three/examples/jsm/loaders/XYZLoader.js";
const loader = new XYZLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "ThreeMFLoader from three/addons",
      code: `import { ThreeMFLoader } from "three/addons";
const loader = new ThreeMFLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "AMFLoader from three/addons",
      code: `import { AMFLoader } from "three/addons";
const loader = new AMFLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "BVHLoader from three/addons",
      code: `import { BVHLoader } from "three/addons";
const loader = new BVHLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "ColladaLoader from three/addons",
      code: `import { ColladaLoader } from "three/addons";
const loader = new ColladaLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "DDSLoader from three/addons",
      code: `import { DDSLoader } from "three/addons";
const loader = new DDSLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "EXRLoader from three/addons",
      code: `import { EXRLoader } from "three/addons";
const loader = new EXRLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "FBXLoader from three/addons",
      code: `import { FBXLoader } from "three/addons";
const loader = new FBXLoader();
requestAnimationFrame(() => {
  loader.parse(data, path);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "FontLoader from three/addons",
      code: `import { FontLoader } from "three/addons";
const loader = new FontLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "GCodeLoader from three/addons",
      code: `import { GCodeLoader } from "three/addons";
const loader = new GCodeLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "HDRLoader from three/addons",
      code: `import { HDRLoader } from "three/addons";
const loader = new HDRLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "IESLoader from three/addons",
      code: `import { IESLoader } from "three/addons";
const loader = new IESLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "KMZLoader from three/addons",
      code: `import { KMZLoader } from "three/addons";
const loader = new KMZLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "KTXLoader from three/addons",
      code: `import { KTXLoader } from "three/addons";
const loader = new KTXLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "LUT3dlLoader from three/addons",
      code: `import { LUT3dlLoader } from "three/addons";
const loader = new LUT3dlLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "LUTCubeLoader from three/addons",
      code: `import { LUTCubeLoader } from "three/addons";
const loader = new LUTCubeLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "LUTImageLoader from three/addons",
      code: `import { LUTImageLoader } from "three/addons";
const loader = new LUTImageLoader();
requestAnimationFrame(() => {
  loader.parse(data, path);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "LWOLoader from three/addons",
      code: `import { LWOLoader } from "three/addons";
const loader = new LWOLoader();
requestAnimationFrame(() => {
  loader.parse(data, path, modelName);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "MD2Loader from three/addons",
      code: `import { MD2Loader } from "three/addons";
const loader = new MD2Loader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "MDDLoader from three/addons",
      code: `import { MDDLoader } from "three/addons";
const loader = new MDDLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "MTLLoader from three/addons",
      code: `import { MTLLoader } from "three/addons";
const loader = new MTLLoader();
requestAnimationFrame(() => {
  loader.parse(data, path);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "NRRDLoader from three/addons",
      code: `import { NRRDLoader } from "three/addons";
const loader = new NRRDLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "OBJLoader from three/addons",
      code: `import { OBJLoader } from "three/addons";
const loader = new OBJLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "PCDLoader from three/addons",
      code: `import { PCDLoader } from "three/addons";
const loader = new PCDLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "PDBLoader from three/addons",
      code: `import { PDBLoader } from "three/addons";
const loader = new PDBLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "PLYLoader from three/addons",
      code: `import { PLYLoader } from "three/addons";
const loader = new PLYLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "PVRLoader from three/addons",
      code: `import { PVRLoader } from "three/addons";
const loader = new PVRLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "RGBELoader from three/addons",
      code: `import { RGBELoader } from "three/addons";
const loader = new RGBELoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "STLLoader from three/addons",
      code: `import { STLLoader } from "three/addons";
const loader = new STLLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "SVGLoader from three/addons",
      code: `import { SVGLoader } from "three/addons";
const loader = new SVGLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "TDSLoader from three/addons",
      code: `import { TDSLoader } from "three/addons";
const loader = new TDSLoader();
requestAnimationFrame(() => {
  loader.parse(data, path);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "TGALoader from three/addons",
      code: `import { TGALoader } from "three/addons";
const loader = new TGALoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "TIFFLoader from three/addons",
      code: `import { TIFFLoader } from "three/addons";
const loader = new TIFFLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "TTFLoader from three/addons",
      code: `import { TTFLoader } from "three/addons";
const loader = new TTFLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "USDLoader from three/addons",
      code: `import { USDLoader } from "three/addons";
const loader = new USDLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "VOXLoader from three/addons",
      code: `import { VOXLoader } from "three/addons";
const loader = new VOXLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "VRMLLoader from three/addons",
      code: `import { VRMLLoader } from "three/addons";
const loader = new VRMLLoader();
requestAnimationFrame(() => {
  loader.parse(data, path);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "VTKLoader from three/addons",
      code: `import { VTKLoader } from "three/addons";
const loader = new VTKLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "XYZLoader from three/addons",
      code: `import { XYZLoader } from "three/addons";
const loader = new XYZLoader();
requestAnimationFrame(() => {
  loader.parse(data);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "namespace-imported core loader",
      code: `import * as THREE from "three";
const loader = new THREE.ObjectLoader();
requestAnimationFrame(() => {
  loader.parse(json);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "loader reached through one immutable alias hop",
      code: `import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
const created = new OBJLoader();
const loader = created;
requestAnimationFrame(() => {
  loader.parse(text);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 5,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "TypeScript non-null receiver stays transparent",
      code: `import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
const loader = new OBJLoader();
requestAnimationFrame(() => {
  loader!.parse(text);
});`,
      output: null,
      languageOptions: tsLanguageOptions,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "extra arguments beyond the minimum still parse",
      code: `import { ObjectLoader } from "three";
const loader = new ObjectLoader();
requestAnimationFrame(() => {
  loader.parse(json, onLoad);
});`,
      output: null,
      errors: [
        {
          messageId: "loaderParseInLoop",
          data: { loader: "loader" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
  ],
});
