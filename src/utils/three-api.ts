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
