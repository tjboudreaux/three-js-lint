import type { KnownSource } from "./bindings.js";

/** Modules that export the Three.js core class surface. */
const THREE_SOURCES: Record<string, true> = {
  three: true,
  "three/webgpu": true,
};

/**
 * True when a module specifier exports Three.js core classes.
 *
 * `three/webgpu` re-exports the same core class names as `three` alongside the
 * WebGPU renderer, so both are treated as the Three.js core surface.
 */
export function isThreeSource(source: KnownSource): boolean {
  return THREE_SOURCES[source] === true;
}

/**
 * Renderer constructors, keyed by the exact module each must come from.
 *
 * A `WebGPURenderer` imported from `three` (or a `WebGLRenderer` imported from
 * `three/webgpu`) does not match, so the mapping stays a proof of provenance
 * rather than a name check.
 */
export const RENDERER_CONSTRUCTORS: Record<string, string> = {
  three: "WebGLRenderer",
  "three/webgpu": "WebGPURenderer",
};

/**
 * Concrete `Material` subclasses whose `needsUpdate` triggers shader program
 * work, plus `Material` itself.
 *
 * Enumerated rather than pattern-matched on a `Material` suffix so a user class
 * named `FoamMaterial` is never mistaken for a Three.js material.
 */
export const MATERIAL_CONSTRUCTORS: Record<string, true> = {
  Material: true,
  ShadowMaterial: true,
  SpriteMaterial: true,
  RawShaderMaterial: true,
  ShaderMaterial: true,
  PointsMaterial: true,
  MeshStandardMaterial: true,
  MeshPhysicalMaterial: true,
  MeshPhongMaterial: true,
  MeshToonMaterial: true,
  MeshNormalMaterial: true,
  MeshLambertMaterial: true,
  MeshMatcapMaterial: true,
  MeshBasicMaterial: true,
  MeshDepthMaterial: true,
  MeshDistanceMaterial: true,
  LineBasicMaterial: true,
  LineDashedMaterial: true,
};

/**
 * `Object3D` and the subclasses that inherit its non-writable transform
 * properties.
 */
export const OBJECT3D_CONSTRUCTORS: Record<string, true> = {
  Object3D: true,
  Group: true,
  Scene: true,
  Bone: true,
  Mesh: true,
  SkinnedMesh: true,
  InstancedMesh: true,
  BatchedMesh: true,
  Line: true,
  LineLoop: true,
  LineSegments: true,
  LOD: true,
  Points: true,
  Sprite: true,
  Camera: true,
  ArrayCamera: true,
  CubeCamera: true,
  OrthographicCamera: true,
  PerspectiveCamera: true,
};

/**
 * `Object3D` transform properties Three.js defines as non-writable, mapped to
 * the only Three.js class whose instance could replace each one.
 *
 * `up` is excluded on purpose: Three.js declares it as a writable property, so
 * replacing it is supported.
 */
export const OBJECT3D_TRANSFORM_PROPERTIES: Record<string, string> = {
  position: "Vector3",
  scale: "Vector3",
  rotation: "Euler",
  quaternion: "Quaternion",
};

/**
 * React Three Fiber host props that accept a Three.js transform instance,
 * mapped to the class an inline construction would create.
 *
 * `up` appears here even though it is writable on `Object3D`, because in JSX the
 * concern is a new object per React render rather than transform identity.
 */
export const R3F_TRANSFORM_PROPS: Record<string, string> = {
  position: "Vector3",
  scale: "Vector3",
  up: "Vector3",
  rotation: "Euler",
  quaternion: "Quaternion",
};

/**
 * Lowercase React Three Fiber host tags that map to an `Object3D` subclass.
 *
 * Restricted to the transform-bearing hosts this plugin reasons about; geometry,
 * material, light, and helper hosts are intentionally absent.
 */
export const R3F_HOST_TAGS: Record<string, true> = {
  object3D: true,
  group: true,
  scene: true,
  mesh: true,
  skinnedMesh: true,
  instancedMesh: true,
  batchedMesh: true,
  line: true,
  lineLoop: true,
  lineSegments: true,
  points: true,
  sprite: true,
  lod: true,
  perspectiveCamera: true,
  orthographicCamera: true,
  arrayCamera: true,
  cubeCamera: true,
};
/**
 * Concrete node-material classes that only `three/webgpu` exports.
 *
 * Alphabetical and enumerated from `src/materials/nodes/NodeMaterials.js` in
 * r185. `NodeMaterialObserver` is not a material and is deliberately absent.
 */
export const WEBGPU_NODE_MATERIAL_CONSTRUCTORS: Record<string, true> = {
  Line2NodeMaterial: true,
  LineBasicNodeMaterial: true,
  LineDashedNodeMaterial: true,
  MeshBasicNodeMaterial: true,
  MeshLambertNodeMaterial: true,
  MeshMatcapNodeMaterial: true,
  MeshNormalNodeMaterial: true,
  MeshPhongNodeMaterial: true,
  MeshPhysicalNodeMaterial: true,
  MeshSSSNodeMaterial: true,
  MeshStandardNodeMaterial: true,
  MeshToonNodeMaterial: true,
  NodeMaterial: true,
  PointsNodeMaterial: true,
  ShadowNodeMaterial: true,
  SpriteNodeMaterial: true,
  VolumeNodeMaterial: true,
};

/**
 * True when `name` is a Three.js material class exported by `source`.
 *
 * Classic materials come from either core module; node materials exist only in
 * `three/webgpu`, so importing one from `three` proves nothing and is rejected.
 * Names are enumerated, never matched on a `Material` suffix.
 */
export function isMaterialConstructor(source: string, name: string): boolean {
  if (MATERIAL_CONSTRUCTORS[name] === true) {
    return source === "three" || source === "three/webgpu";
  }
  return source === "three/webgpu" && WEBGPU_NODE_MATERIAL_CONSTRUCTORS[name] === true;
}

/** Renderer methods that install exactly one render-list sort comparator. */
export const RENDERER_SORT_SETTERS: Record<string, true> = {
  setOpaqueSort: true,
  setTransparentSort: true,
};

/**
 * Renderer precompilation methods, which traverse a scene and build shader or
 * pipeline state.
 *
 * `WebGLRenderer` declares `compile( scene, camera, targetScene )` and
 * `compileAsync` with the same shape; the WebGPU `Renderer` declares
 * `compileAsync( scene, camera, targetScene )` and exposes `compile` as its
 * public getter alias, so both names take the same two or three arguments in both
 * renderers. Neither accepts a progress callback.
 */
export const RENDERER_COMPILE_METHODS: Record<string, true> = {
  compile: true,
  compileAsync: true,
};

/** Fewest arguments a renderer precompilation call accepts. */
export const RENDERER_COMPILE_MIN_ARGS = 2;

/** Most arguments a renderer precompilation call accepts. */
export const RENDERER_COMPILE_MAX_ARGS = 3;

/** The two per-object render hooks a renderer invokes while drawing. */
export const OBJECT_RENDER_HOOKS: Record<string, true> = {
  onAfterRender: true,
  onBeforeRender: true,
};

/**
 * Classes whose instances a renderer actually dispatches `onBeforeRender` and
 * `onAfterRender` on.
 *
 * Deliberately narrower than {@link OBJECT3D_CONSTRUCTORS}: only `Scene` and the
 * renderable objects that reach a render list receive these hooks. The nine
 * helpers are included because r185 derives them from `Mesh`, `Line`, or
 * `LineSegments`; `ArrowHelper`, `DirectionalLightHelper`,
 * `HemisphereLightHelper`, and `SpotLightHelper` derive from plain `Object3D` and
 * are absent, as are `Group`, `LOD`, cameras, lights, and materials.
 *
 * `LineLoop` is absent on purpose. Both renderers share the core object classes,
 * so an object's import source cannot prove which renderer will dispatch it, and
 * the same reasoning keeps `onBeforeShadow`/`onAfterShadow` out entirely.
 */
export const OBJECT_RENDER_HOOK_CONSTRUCTORS: Record<string, true> = {
  AxesHelper: true,
  BatchedMesh: true,
  Box3Helper: true,
  BoxHelper: true,
  CameraHelper: true,
  GridHelper: true,
  InstancedMesh: true,
  Line: true,
  LineSegments: true,
  Mesh: true,
  PlaneHelper: true,
  PointLightHelper: true,
  Points: true,
  PolarGridHelper: true,
  Scene: true,
  SkeletonHelper: true,
  SkinnedMesh: true,
  Sprite: true,
};

/** An inclusive range of accepted argument counts. */
export interface ArityRange {
  /** Fewest arguments the call accepts. */
  readonly minArgs: number;
  /** Most arguments the call accepts. */
  readonly maxArgs: number;
}

/** The environment-map prefilter class, constructed from a renderer. */
export const PMREM_GENERATOR_CONSTRUCTOR = "PMREMGenerator";

/**
 * `PMREMGenerator` methods that run the prefilter chain, keyed by the module the
 * generator's constructor came from.
 *
 * The WebGPU generator adds three `...Async` names that r185 deprecates in favour
 * of `await renderer.init()`; they still run the same generation work.
 * `compileCubemapShader`, `compileEquirectangularShader`, and `dispose` are not
 * generation calls and are absent.
 */
export const PMREM_GENERATION_METHODS: Record<string, Record<string, ArityRange>> = {
  three: {
    fromCubemap: { minArgs: 1, maxArgs: 2 },
    fromEquirectangular: { minArgs: 1, maxArgs: 2 },
    fromScene: { minArgs: 1, maxArgs: 5 },
  },
  "three/webgpu": {
    fromCubemap: { minArgs: 1, maxArgs: 2 },
    fromCubemapAsync: { minArgs: 1, maxArgs: 2 },
    fromEquirectangular: { minArgs: 1, maxArgs: 2 },
    fromEquirectangularAsync: { minArgs: 1, maxArgs: 2 },
    fromScene: { minArgs: 1, maxArgs: 5 },
    fromSceneAsync: { minArgs: 1, maxArgs: 5 },
  },
};

/** Looks up a `PMREMGenerator` generation method for the generator's own source. */
export function getPmremGenerationMethod(source: string, method: string): ArityRange | null {
  if (source !== "three" && source !== "three/webgpu") {
    return null;
  }
  return PMREM_GENERATION_METHODS[source]?.[method] ?? null;
}

/** How a cataloged method allocates, and where a reusable output could go. */
export interface AllocatingMethod extends ArityRange {
  /**
   * Index of the argument that accepts a reusable output, or `null` when the call
   * allocates on every invocation regardless of its arguments.
   */
  readonly targetIndex: number | null;
  /**
   * Whether the reusable output is an array.
   *
   * An inline `[]` in an array slot is a fresh allocation per invocation, so it is
   * reported rather than accepted as reuse.
   */
  readonly arrayTarget: boolean;
}

/**
 * Receiver classes with at least one cataloged allocating method.
 *
 * Guarding on this table before indexing {@link ALLOCATING_METHODS} keeps the
 * lookup free of inherited `Object.prototype` names.
 */
export const ALLOCATING_RECEIVERS: Record<string, true> = {
  ArcCurve: true,
  CatmullRomCurve3: true,
  Color: true,
  CubicBezierCurve: true,
  CubicBezierCurve3: true,
  CurvePath: true,
  EllipseCurve: true,
  Euler: true,
  LineCurve: true,
  LineCurve3: true,
  Matrix3: true,
  Matrix4: true,
  Path: true,
  QuadraticBezierCurve: true,
  QuadraticBezierCurve3: true,
  Quaternion: true,
  Raycaster: true,
  Shape: true,
  SplineCurve: true,
  Vector2: true,
  Vector3: true,
  Vector4: true,
};

/**
 * Methods that either allocate their result or accept a reusable output object,
 * keyed by receiver class and method name.
 *
 * Verified against r185. Notable asymmetry: `LineCurve` and `LineCurve3` override
 * `getTangent`/`getTangentAt` and honour the optional target, while the other
 * eight concrete curves inherit `Curve#getTangent`, which calls `getPoint` twice
 * without a target and therefore allocates two intermediate points even when a
 * target is supplied.
 *
 * `CurvePath`, `Path`, and `Shape` appear only under the container methods:
 * `CurvePath#getPoint` returns `null` for an empty path, so a point or tangent
 * call on them cannot be proven to produce anything.
 *
 * Abstract `Curve#getPoint`, cache-dependent `getLengths`, and `Matrix2` (which
 * has no `toArray`) are all absent.
 */
export const ALLOCATING_METHODS: Record<string, Record<string, AllocatingMethod>> = {
  ArcCurve: {
    computeFrenetFrames: { minArgs: 1, maxArgs: 2, targetIndex: null, arrayTarget: false },
    getPoint: { minArgs: 1, maxArgs: 2, targetIndex: 1, arrayTarget: false },
    getPointAt: { minArgs: 1, maxArgs: 2, targetIndex: 1, arrayTarget: false },
    getPoints: { minArgs: 0, maxArgs: 1, targetIndex: null, arrayTarget: false },
    getSpacedPoints: { minArgs: 0, maxArgs: 1, targetIndex: null, arrayTarget: false },
    getTangent: { minArgs: 1, maxArgs: 2, targetIndex: null, arrayTarget: false },
    getTangentAt: { minArgs: 1, maxArgs: 2, targetIndex: null, arrayTarget: false },
  },
  CatmullRomCurve3: {
    computeFrenetFrames: { minArgs: 1, maxArgs: 2, targetIndex: null, arrayTarget: false },
    getPoint: { minArgs: 1, maxArgs: 2, targetIndex: 1, arrayTarget: false },
    getPointAt: { minArgs: 1, maxArgs: 2, targetIndex: 1, arrayTarget: false },
    getPoints: { minArgs: 0, maxArgs: 1, targetIndex: null, arrayTarget: false },
    getSpacedPoints: { minArgs: 0, maxArgs: 1, targetIndex: null, arrayTarget: false },
    getTangent: { minArgs: 1, maxArgs: 2, targetIndex: null, arrayTarget: false },
    getTangentAt: { minArgs: 1, maxArgs: 2, targetIndex: null, arrayTarget: false },
  },
  Color: {
    toArray: { minArgs: 0, maxArgs: 2, targetIndex: 0, arrayTarget: true },
  },
  CubicBezierCurve: {
    computeFrenetFrames: { minArgs: 1, maxArgs: 2, targetIndex: null, arrayTarget: false },
    getPoint: { minArgs: 1, maxArgs: 2, targetIndex: 1, arrayTarget: false },
    getPointAt: { minArgs: 1, maxArgs: 2, targetIndex: 1, arrayTarget: false },
    getPoints: { minArgs: 0, maxArgs: 1, targetIndex: null, arrayTarget: false },
    getSpacedPoints: { minArgs: 0, maxArgs: 1, targetIndex: null, arrayTarget: false },
    getTangent: { minArgs: 1, maxArgs: 2, targetIndex: null, arrayTarget: false },
    getTangentAt: { minArgs: 1, maxArgs: 2, targetIndex: null, arrayTarget: false },
  },
  CubicBezierCurve3: {
    computeFrenetFrames: { minArgs: 1, maxArgs: 2, targetIndex: null, arrayTarget: false },
    getPoint: { minArgs: 1, maxArgs: 2, targetIndex: 1, arrayTarget: false },
    getPointAt: { minArgs: 1, maxArgs: 2, targetIndex: 1, arrayTarget: false },
    getPoints: { minArgs: 0, maxArgs: 1, targetIndex: null, arrayTarget: false },
    getSpacedPoints: { minArgs: 0, maxArgs: 1, targetIndex: null, arrayTarget: false },
    getTangent: { minArgs: 1, maxArgs: 2, targetIndex: null, arrayTarget: false },
    getTangentAt: { minArgs: 1, maxArgs: 2, targetIndex: null, arrayTarget: false },
  },
  CurvePath: {
    computeFrenetFrames: { minArgs: 1, maxArgs: 2, targetIndex: null, arrayTarget: false },
    getPoints: { minArgs: 0, maxArgs: 1, targetIndex: null, arrayTarget: false },
    getSpacedPoints: { minArgs: 0, maxArgs: 1, targetIndex: null, arrayTarget: false },
  },
  EllipseCurve: {
    computeFrenetFrames: { minArgs: 1, maxArgs: 2, targetIndex: null, arrayTarget: false },
    getPoint: { minArgs: 1, maxArgs: 2, targetIndex: 1, arrayTarget: false },
    getPointAt: { minArgs: 1, maxArgs: 2, targetIndex: 1, arrayTarget: false },
    getPoints: { minArgs: 0, maxArgs: 1, targetIndex: null, arrayTarget: false },
    getSpacedPoints: { minArgs: 0, maxArgs: 1, targetIndex: null, arrayTarget: false },
    getTangent: { minArgs: 1, maxArgs: 2, targetIndex: null, arrayTarget: false },
    getTangentAt: { minArgs: 1, maxArgs: 2, targetIndex: null, arrayTarget: false },
  },
  Euler: {
    toArray: { minArgs: 0, maxArgs: 2, targetIndex: 0, arrayTarget: true },
  },
  LineCurve: {
    computeFrenetFrames: { minArgs: 1, maxArgs: 2, targetIndex: null, arrayTarget: false },
    getPoint: { minArgs: 1, maxArgs: 2, targetIndex: 1, arrayTarget: false },
    getPointAt: { minArgs: 1, maxArgs: 2, targetIndex: 1, arrayTarget: false },
    getPoints: { minArgs: 0, maxArgs: 1, targetIndex: null, arrayTarget: false },
    getSpacedPoints: { minArgs: 0, maxArgs: 1, targetIndex: null, arrayTarget: false },
    getTangent: { minArgs: 1, maxArgs: 2, targetIndex: 1, arrayTarget: false },
    getTangentAt: { minArgs: 1, maxArgs: 2, targetIndex: 1, arrayTarget: false },
  },
  LineCurve3: {
    computeFrenetFrames: { minArgs: 1, maxArgs: 2, targetIndex: null, arrayTarget: false },
    getPoint: { minArgs: 1, maxArgs: 2, targetIndex: 1, arrayTarget: false },
    getPointAt: { minArgs: 1, maxArgs: 2, targetIndex: 1, arrayTarget: false },
    getPoints: { minArgs: 0, maxArgs: 1, targetIndex: null, arrayTarget: false },
    getSpacedPoints: { minArgs: 0, maxArgs: 1, targetIndex: null, arrayTarget: false },
    getTangent: { minArgs: 1, maxArgs: 2, targetIndex: 1, arrayTarget: false },
    getTangentAt: { minArgs: 1, maxArgs: 2, targetIndex: 1, arrayTarget: false },
  },
  Matrix3: {
    toArray: { minArgs: 0, maxArgs: 2, targetIndex: 0, arrayTarget: true },
  },
  Matrix4: {
    toArray: { minArgs: 0, maxArgs: 2, targetIndex: 0, arrayTarget: true },
  },
  Path: {
    computeFrenetFrames: { minArgs: 1, maxArgs: 2, targetIndex: null, arrayTarget: false },
    getPoints: { minArgs: 0, maxArgs: 1, targetIndex: null, arrayTarget: false },
    getSpacedPoints: { minArgs: 0, maxArgs: 1, targetIndex: null, arrayTarget: false },
  },
  QuadraticBezierCurve: {
    computeFrenetFrames: { minArgs: 1, maxArgs: 2, targetIndex: null, arrayTarget: false },
    getPoint: { minArgs: 1, maxArgs: 2, targetIndex: 1, arrayTarget: false },
    getPointAt: { minArgs: 1, maxArgs: 2, targetIndex: 1, arrayTarget: false },
    getPoints: { minArgs: 0, maxArgs: 1, targetIndex: null, arrayTarget: false },
    getSpacedPoints: { minArgs: 0, maxArgs: 1, targetIndex: null, arrayTarget: false },
    getTangent: { minArgs: 1, maxArgs: 2, targetIndex: null, arrayTarget: false },
    getTangentAt: { minArgs: 1, maxArgs: 2, targetIndex: null, arrayTarget: false },
  },
  QuadraticBezierCurve3: {
    computeFrenetFrames: { minArgs: 1, maxArgs: 2, targetIndex: null, arrayTarget: false },
    getPoint: { minArgs: 1, maxArgs: 2, targetIndex: 1, arrayTarget: false },
    getPointAt: { minArgs: 1, maxArgs: 2, targetIndex: 1, arrayTarget: false },
    getPoints: { minArgs: 0, maxArgs: 1, targetIndex: null, arrayTarget: false },
    getSpacedPoints: { minArgs: 0, maxArgs: 1, targetIndex: null, arrayTarget: false },
    getTangent: { minArgs: 1, maxArgs: 2, targetIndex: null, arrayTarget: false },
    getTangentAt: { minArgs: 1, maxArgs: 2, targetIndex: null, arrayTarget: false },
  },
  Quaternion: {
    toArray: { minArgs: 0, maxArgs: 2, targetIndex: 0, arrayTarget: true },
  },
  Raycaster: {
    intersectObject: { minArgs: 1, maxArgs: 3, targetIndex: 2, arrayTarget: true },
    intersectObjects: { minArgs: 1, maxArgs: 3, targetIndex: 2, arrayTarget: true },
  },
  Shape: {
    computeFrenetFrames: { minArgs: 1, maxArgs: 2, targetIndex: null, arrayTarget: false },
    getPoints: { minArgs: 0, maxArgs: 1, targetIndex: null, arrayTarget: false },
    getSpacedPoints: { minArgs: 0, maxArgs: 1, targetIndex: null, arrayTarget: false },
  },
  SplineCurve: {
    computeFrenetFrames: { minArgs: 1, maxArgs: 2, targetIndex: null, arrayTarget: false },
    getPoint: { minArgs: 1, maxArgs: 2, targetIndex: 1, arrayTarget: false },
    getPointAt: { minArgs: 1, maxArgs: 2, targetIndex: 1, arrayTarget: false },
    getPoints: { minArgs: 0, maxArgs: 1, targetIndex: null, arrayTarget: false },
    getSpacedPoints: { minArgs: 0, maxArgs: 1, targetIndex: null, arrayTarget: false },
    getTangent: { minArgs: 1, maxArgs: 2, targetIndex: null, arrayTarget: false },
    getTangentAt: { minArgs: 1, maxArgs: 2, targetIndex: null, arrayTarget: false },
  },
  Vector2: {
    toArray: { minArgs: 0, maxArgs: 2, targetIndex: 0, arrayTarget: true },
  },
  Vector3: {
    toArray: { minArgs: 0, maxArgs: 2, targetIndex: 0, arrayTarget: true },
  },
  Vector4: {
    toArray: { minArgs: 0, maxArgs: 2, targetIndex: 0, arrayTarget: true },
  },
};

/**
 * `Object3D` methods that write their result into a reusable array.
 *
 * Applies to the whole closed {@link OBJECT3D_CONSTRUCTORS} receiver set rather
 * than to one class.
 */
export const OBJECT3D_RESULT_METHODS: Record<string, AllocatingMethod> = {
  getObjectsByProperty: { minArgs: 2, maxArgs: 3, targetIndex: 2, arrayTarget: true },
};

/**
 * Resolves the allocation contract of `class.method`, or `null` when the pair is
 * not cataloged.
 */
export function getAllocatingMethod(className: string, method: string): AllocatingMethod | null {
  if (ALLOCATING_RECEIVERS[className] === true) {
    const entry = ALLOCATING_METHODS[className]?.[method];
    if (entry !== undefined) {
      return entry;
    }
  }
  if (OBJECT3D_CONSTRUCTORS[className] === true) {
    return OBJECT3D_RESULT_METHODS[method] ?? null;
  }
  return null;
}

/** A construction shape the receiver of a bounds method must have. */
export interface ConstructionRequirement extends ArityRange {
  /** Argument indices that must not be statically nullish. */
  readonly requiredSlots: readonly number[];
}

/** A bounds method, together with any requirement on its receiver's construction. */
export interface BoundsMethod extends ArityRange {
  /**
   * Construction shape the receiver must have, or `null` when the call itself
   * carries the data it scans.
   *
   * `BoxHelper#update` and the object-level compute methods scan data the
   * constructor supplied, so a construction that never received that data cannot
   * be shown to scan anything.
   */
  readonly construction: ConstructionRequirement | null;
}

/** Receiver classes with at least one cataloged full-scan bounds method. */
export const BOUNDS_RECEIVERS: Record<string, true> = {
  BatchedMesh: true,
  Box3: true,
  BoxHelper: true,
  InstancedMesh: true,
  SkinnedMesh: true,
  Sphere: true,
};

/**
 * Bounds methods that scan every point, vertex, or descendant, keyed by receiver
 * class and method name.
 *
 * Cheap unions (`Box3#expandByPoint`, `Box3#union`, `Sphere#expandByPoint`) and
 * required-target getters (`getCenter`, `getSize`) are absent: they touch one
 * datum, not a whole buffer or subtree.
 */
export const BOUNDS_METHODS: Record<string, Record<string, BoundsMethod>> = {
  BatchedMesh: {
    computeBoundingBox: {
      minArgs: 0,
      maxArgs: 0,
      construction: { minArgs: 2, maxArgs: 4, requiredSlots: [0, 1] },
    },
    computeBoundingSphere: {
      minArgs: 0,
      maxArgs: 0,
      construction: { minArgs: 2, maxArgs: 4, requiredSlots: [0, 1] },
    },
  },
  Box3: {
    expandByObject: { minArgs: 1, maxArgs: 2, construction: null },
    setFromArray: { minArgs: 1, maxArgs: 1, construction: null },
    setFromBufferAttribute: { minArgs: 1, maxArgs: 1, construction: null },
    setFromObject: { minArgs: 1, maxArgs: 2, construction: null },
    setFromPoints: { minArgs: 1, maxArgs: 1, construction: null },
  },
  BoxHelper: {
    setFromObject: { minArgs: 1, maxArgs: 1, construction: null },
    update: {
      minArgs: 0,
      maxArgs: 0,
      construction: { minArgs: 1, maxArgs: 2, requiredSlots: [0] },
    },
  },
  InstancedMesh: {
    computeBoundingBox: {
      minArgs: 0,
      maxArgs: 0,
      construction: { minArgs: 3, maxArgs: 3, requiredSlots: [0, 2] },
    },
    computeBoundingSphere: {
      minArgs: 0,
      maxArgs: 0,
      construction: { minArgs: 3, maxArgs: 3, requiredSlots: [0, 2] },
    },
  },
  SkinnedMesh: {
    computeBoundingBox: {
      minArgs: 0,
      maxArgs: 0,
      construction: { minArgs: 1, maxArgs: 2, requiredSlots: [0] },
    },
    computeBoundingSphere: {
      minArgs: 0,
      maxArgs: 0,
      construction: { minArgs: 1, maxArgs: 2, requiredSlots: [0] },
    },
  },
  Sphere: {
    setFromPoints: { minArgs: 1, maxArgs: 2, construction: null },
  },
};

/** Resolves the bounds contract of `class.method`, or `null` when uncataloged. */
export function getBoundsMethod(className: string, method: string): BoundsMethod | null {
  if (BOUNDS_RECEIVERS[className] !== true) {
    return null;
  }
  return BOUNDS_METHODS[className]?.[method] ?? null;
}

/**
 * Concrete, importable `BufferGeometry` classes.
 *
 * `BufferGeometry`, `InstancedBufferGeometry`, and the 21 generator geometries
 * r185 exports from `src/geometries/Geometries.js`. Enumerated rather than
 * suffix-matched, so a user class named `TerrainGeometry` never matches.
 */
export const GEOMETRY_CONSTRUCTORS: Record<string, true> = {
  BoxGeometry: true,
  BufferGeometry: true,
  CapsuleGeometry: true,
  CircleGeometry: true,
  ConeGeometry: true,
  CylinderGeometry: true,
  DodecahedronGeometry: true,
  EdgesGeometry: true,
  ExtrudeGeometry: true,
  IcosahedronGeometry: true,
  InstancedBufferGeometry: true,
  LatheGeometry: true,
  OctahedronGeometry: true,
  PlaneGeometry: true,
  PolyhedronGeometry: true,
  RingGeometry: true,
  ShapeGeometry: true,
  SphereGeometry: true,
  TetrahedronGeometry: true,
  TorusGeometry: true,
  TorusKnotGeometry: true,
  TubeGeometry: true,
  WireframeGeometry: true,
};

/**
 * Zero-argument `BufferGeometry` methods that rescan every vertex or index.
 *
 * `normalizeNormals` and `toNonIndexed` are absent: the first is a per-normal pass
 * with no scan-and-cache contract, and the second returns a new geometry rather
 * than refreshing a cache.
 */
export const GEOMETRY_RECOMPUTE_METHODS: Record<string, true> = {
  computeBoundingBox: true,
  computeBoundingSphere: true,
  computeTangents: true,
  computeVertexNormals: true,
};

/**
 * Classes whose `dispose()` dispatches a `dispose` event and that both core
 * modules export.
 *
 * Every entry is source-proven in r185, either by dispatching directly
 * (`BufferGeometry`, `BufferAttribute`, `Texture`, `RenderTarget`) or by
 * inheriting an unoverridden `dispose` from one that does. `HTMLTexture` and
 * `VideoTexture` override `dispose` but both call `super.dispose()`.
 *
 * `RenderTargetArray` is part of the approved catalog; r185 exports no such name,
 * so the entry is unreachable through any import and inert. The catalog is
 * deliberately not widened to compensate.
 *
 * Renderers, `Object3D` subclasses, `Skeleton`, `Source`, interleaved and GL
 * attributes, non-material `Node` classes, and addons are all absent.
 */
export const SHARED_DISPOSE_EVENT_HOSTS: Record<string, true> = {
  BoxGeometry: true,
  BufferGeometry: true,
  CapsuleGeometry: true,
  CircleGeometry: true,
  ConeGeometry: true,
  CylinderGeometry: true,
  DodecahedronGeometry: true,
  EdgesGeometry: true,
  ExtrudeGeometry: true,
  IcosahedronGeometry: true,
  InstancedBufferGeometry: true,
  LatheGeometry: true,
  OctahedronGeometry: true,
  PlaneGeometry: true,
  PolyhedronGeometry: true,
  RingGeometry: true,
  ShapeGeometry: true,
  SphereGeometry: true,
  TetrahedronGeometry: true,
  TorusGeometry: true,
  TorusKnotGeometry: true,
  TubeGeometry: true,
  WireframeGeometry: true,
  BufferAttribute: true,
  Float16BufferAttribute: true,
  Float32BufferAttribute: true,
  InstancedBufferAttribute: true,
  Int16BufferAttribute: true,
  Int32BufferAttribute: true,
  Int8BufferAttribute: true,
  Uint16BufferAttribute: true,
  Uint32BufferAttribute: true,
  Uint8BufferAttribute: true,
  Uint8ClampedBufferAttribute: true,
  CanvasTexture: true,
  CompressedArrayTexture: true,
  CompressedCubeTexture: true,
  CompressedTexture: true,
  CubeDepthTexture: true,
  CubeTexture: true,
  Data3DTexture: true,
  DataArrayTexture: true,
  DataTexture: true,
  DepthTexture: true,
  ExternalTexture: true,
  FramebufferTexture: true,
  HTMLTexture: true,
  Texture: true,
  VideoFrameTexture: true,
  VideoTexture: true,
  RenderTarget: true,
  RenderTarget3D: true,
  RenderTargetArray: true,
};

/** Dispose-event hosts only `three` exports. */
export const WEBGL_DISPOSE_EVENT_HOSTS: Record<string, true> = {
  WebGLCubeRenderTarget: true,
};

/** Dispose-event hosts only `three/webgpu` exports, besides the node materials. */
export const WEBGPU_DISPOSE_EVENT_HOSTS: Record<string, true> = {
  CanvasTarget: true,
  CubeRenderTarget: true,
  IndirectStorageBufferAttribute: true,
  Storage3DTexture: true,
  StorageArrayTexture: true,
  StorageBufferAttribute: true,
  StorageInstancedBufferAttribute: true,
  StorageTexture: true,
};

/**
 * True when `name` imported from `source` is a class whose `dispose()` dispatches
 * a `dispose` event, so a listener registered on it accumulates.
 */
export function isDisposeEventHost(source: string, name: string): boolean {
  if (source !== "three" && source !== "three/webgpu") {
    return false;
  }
  if (SHARED_DISPOSE_EVENT_HOSTS[name] === true || isMaterialConstructor(source, name)) {
    return true;
  }
  if (source === "three") {
    return WEBGL_DISPOSE_EVENT_HOSTS[name] === true;
  }
  return WEBGPU_DISPOSE_EVENT_HOSTS[name] === true;
}

/** The component layout of one Three.js vector class. */
export interface VectorLayout {
  /** Component names, in constructor and `set` order. */
  readonly components: readonly string[];
  /** Writable property aliases, mapped to the component each addresses. */
  readonly aliases: Readonly<Record<string, string>>;
}

/**
 * Vector classes whose components are stored without validation, mapped to their
 * component layout.
 *
 * `Vector2` aliases `width`/`height` onto x/y, while `Vector4` aliases them onto
 * z/w; `Vector3` has no aliases.
 */
export const VECTOR_LAYOUTS: Record<string, VectorLayout> = {
  Vector2: { components: ["x", "y"], aliases: { width: "x", height: "y" } },
  Vector3: { components: ["x", "y", "z"], aliases: {} },
  Vector4: { components: ["x", "y", "z", "w"], aliases: { width: "z", height: "w" } },
};

/** Resolves a vector class layout, or `null` when the class is not cataloged. */
export function getVectorLayout(className: string): VectorLayout | null {
  if (className !== "Vector2" && className !== "Vector3" && className !== "Vector4") {
    return null;
  }
  return VECTOR_LAYOUTS[className] ?? null;
}

/** Single-component vector setters, mapped to the component each writes. */
export const VECTOR_COMPONENT_SETTERS: Record<string, string> = {
  setW: "w",
  setX: "x",
  setY: "y",
  setZ: "z",
};

/**
 * Vector magnitude methods with an exact squared equivalent, keyed by class.
 *
 * `Vector4` has `lengthSq` but no `distanceTo`, so it maps only the length pair.
 */
export const SQUARED_MAGNITUDE_METHODS: Record<string, Record<string, string>> = {
  Vector2: { distanceTo: "distanceToSquared", length: "lengthSq" },
  Vector3: { distanceTo: "distanceToSquared", length: "lengthSq" },
  Vector4: { length: "lengthSq" },
};

/** Argument count each squared-magnitude method takes, exactly. */
export const MAGNITUDE_METHOD_ARGS: Record<string, number> = {
  distanceTo: 1,
  length: 0,
};

/** Resolves the squared equivalent of `class.method`, or `null` when there is none. */
export function getSquaredMagnitudeMethod(className: string, method: string): string | null {
  if (getVectorLayout(className) === null) {
    return null;
  }
  return SQUARED_MAGNITUDE_METHODS[className]?.[method] ?? null;
}

/**
 * Core loader classes with a synchronous `parse`, keyed by module.
 *
 * The three node loaders exist only in `three/webgpu`. `ObjectLoader`,
 * `NodeObjectLoader`, and the addon `USDLoader` return their object graph
 * synchronously from `parse` even though texture readiness may continue
 * asynchronously afterwards.
 */
export const CORE_SYNC_PARSE_LOADERS: Record<string, Record<string, true>> = {
  three: {
    AnimationLoader: true,
    BufferGeometryLoader: true,
    MaterialLoader: true,
    ObjectLoader: true,
  },
  "three/webgpu": {
    AnimationLoader: true,
    BufferGeometryLoader: true,
    MaterialLoader: true,
    NodeLoader: true,
    NodeMaterialLoader: true,
    NodeObjectLoader: true,
    ObjectLoader: true,
  },
};

/** The bare addon barrel `three/addons` re-exports loaders from. */
export const ADDONS_BARREL_SOURCE = "three/addons";

/**
 * Module prefixes under which a single official addon loader may be imported.
 *
 * `three/addons/loaders/<File>.js` is the current path and
 * `three/examples/jsm/loaders/<File>.js` is the compatibility path. No other
 * addon directory, deep `three/src` path, or user barrel is accepted.
 */
export const ADDON_LOADER_PREFIXES: readonly string[] = [
  "three/addons/loaders/",
  "three/examples/jsm/loaders/",
];

/**
 * Official addon loader modules with a synchronous `parse`, mapped from file stem
 * to exported class name.
 *
 * Every name matches its file except `3MFLoader`, which exports `ThreeMFLoader`.
 * `Rhino3dmLoader`/`3DMLoader`, `DRACOLoader`, `GLTFLoader`, `KTX2Loader`,
 * `LDrawLoader`, and `UltraHDRLoader` are absent because their parsers report
 * through a callback rather than returning; abstract `Loader`,
 * `CompressedTextureLoader`, `DataTextureLoader`, and every load-only loader are
 * absent because they have no synchronous `parse` of their own.
 */
export const ADDON_SYNC_PARSE_LOADERS: Record<string, string> = {
  "3MFLoader": "ThreeMFLoader",
  AMFLoader: "AMFLoader",
  BVHLoader: "BVHLoader",
  ColladaLoader: "ColladaLoader",
  DDSLoader: "DDSLoader",
  EXRLoader: "EXRLoader",
  FBXLoader: "FBXLoader",
  FontLoader: "FontLoader",
  GCodeLoader: "GCodeLoader",
  HDRLoader: "HDRLoader",
  IESLoader: "IESLoader",
  KMZLoader: "KMZLoader",
  KTXLoader: "KTXLoader",
  LUT3dlLoader: "LUT3dlLoader",
  LUTCubeLoader: "LUTCubeLoader",
  LUTImageLoader: "LUTImageLoader",
  LWOLoader: "LWOLoader",
  MD2Loader: "MD2Loader",
  MDDLoader: "MDDLoader",
  MTLLoader: "MTLLoader",
  MaterialXLoader: "MaterialXLoader",
  NRRDLoader: "NRRDLoader",
  OBJLoader: "OBJLoader",
  PCDLoader: "PCDLoader",
  PDBLoader: "PDBLoader",
  PLYLoader: "PLYLoader",
  PVRLoader: "PVRLoader",
  RGBELoader: "RGBELoader",
  STLLoader: "STLLoader",
  SVGLoader: "SVGLoader",
  TDSLoader: "TDSLoader",
  TGALoader: "TGALoader",
  TIFFLoader: "TIFFLoader",
  TTFLoader: "TTFLoader",
  USDLoader: "USDLoader",
  USDZLoader: "USDZLoader",
  VOXLoader: "VOXLoader",
  VRMLLoader: "VRMLLoader",
  VTKLoader: "VTKLoader",
  XYZLoader: "XYZLoader",
};

/** The exported class names of {@link ADDON_SYNC_PARSE_LOADERS}. */
export const ADDON_SYNC_PARSE_LOADER_CLASSES: Record<string, true> = {
  AMFLoader: true,
  BVHLoader: true,
  ColladaLoader: true,
  DDSLoader: true,
  EXRLoader: true,
  FBXLoader: true,
  FontLoader: true,
  GCodeLoader: true,
  HDRLoader: true,
  IESLoader: true,
  KMZLoader: true,
  KTXLoader: true,
  LUT3dlLoader: true,
  LUTCubeLoader: true,
  LUTImageLoader: true,
  LWOLoader: true,
  MD2Loader: true,
  MDDLoader: true,
  MTLLoader: true,
  MaterialXLoader: true,
  NRRDLoader: true,
  OBJLoader: true,
  PCDLoader: true,
  PDBLoader: true,
  PLYLoader: true,
  PVRLoader: true,
  RGBELoader: true,
  STLLoader: true,
  SVGLoader: true,
  TDSLoader: true,
  TGALoader: true,
  TIFFLoader: true,
  TTFLoader: true,
  ThreeMFLoader: true,
  USDLoader: true,
  USDZLoader: true,
  VOXLoader: true,
  VRMLLoader: true,
  VTKLoader: true,
  XYZLoader: true,
};

/**
 * Addon loader classes the bare `three/addons` barrel does not re-export in r185.
 *
 * Both remain reachable through their direct module paths.
 */
export const ADDONS_BARREL_EXCLUSIONS: Record<string, true> = {
  MaterialXLoader: true,
  USDZLoader: true,
};

/**
 * Loader classes whose `parse` needs more than one argument to do any work.
 *
 * Every other cataloged loader needs one.
 */
export const LOADER_PARSE_MIN_ARGS: Record<string, number> = {
  FBXLoader: 2,
  LUTImageLoader: 2,
  LWOLoader: 3,
  MTLLoader: 2,
  TDSLoader: 2,
  VRMLLoader: 2,
};

/**
 * Resolves the fewest `parse` arguments a loader class imported from `source`
 * needs, or `null` when the exact source/class pair is not an official
 * synchronous parser.
 *
 * This is the only place a specifier outside the two core modules is admitted,
 * and it stays exact: the barrel, the two loader prefixes with a matching file
 * stem, and nothing else.
 */
export function getSyncParseLoaderMinArgs(source: string, name: string): number | null {
  if (source === "three" || source === "three/webgpu") {
    return CORE_SYNC_PARSE_LOADERS[source]?.[name] === true ? 1 : null;
  }

  if (source === ADDONS_BARREL_SOURCE) {
    if (ADDON_SYNC_PARSE_LOADER_CLASSES[name] !== true || ADDONS_BARREL_EXCLUSIONS[name] === true) {
      return null;
    }
    return LOADER_PARSE_MIN_ARGS[name] ?? 1;
  }

  for (const prefix of ADDON_LOADER_PREFIXES) {
    if (!source.startsWith(prefix)) {
      continue;
    }
    const file = source.slice(prefix.length);
    if (!file.endsWith(".js")) {
      return null;
    }
    const stem = file.slice(0, -".js".length);
    if (ADDON_SYNC_PARSE_LOADERS[stem] !== name) {
      return null;
    }
    return LOADER_PARSE_MIN_ARGS[name] ?? 1;
  }

  return null;
}
