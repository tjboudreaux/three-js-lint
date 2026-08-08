import rule from "../../src/rules/no-three-allocating-call-in-render-loop.js";
import { createRuleTester, tsLanguageOptions } from "../helpers/rule-tester.js";

const ruleTester = createRuleTester();

/*
 * All ten concrete point receivers, both tangent behaviours (the two `LineCurve`
 * overrides against the eight inherited implementations), all 13 container
 * receivers, all eight `toArray` owners, both raycast methods, and the `Object3D`
 * result target are covered, alongside the stable-target silence, the inline-array
 * and `undefined` targets, the empty-path refusal, and the cache and `Matrix2`
 * exclusions.
 */
ruleTester.run("no-three-allocating-call-in-render-loop", rule, {
  valid: [
    {
      name: "allocation outside the loop",
      code: `import { Vector3 } from "three";
const value = new Vector3();
value.toArray();`,
    },
    {
      name: "stable scratch array reused across invocations",
      code: `import { Vector3 } from "three";
const value = new Vector3();
const scratch = [];
requestAnimationFrame(() => {
  value.toArray(scratch);
});`,
    },
    {
      name: "stable scratch array with an offset",
      code: `import { Vector3 } from "three";
const value = new Vector3();
const scratch = new Float32Array(3);
requestAnimationFrame(() => {
  value.toArray(scratch, 0);
});`,
    },
    {
      name: "stable scratch vector for a curve point",
      code: `import { LineCurve, Vector2 } from "three";
const curve = new LineCurve();
const scratch = new Vector2();
requestAnimationFrame(() => {
  curve.getPoint(0.5, scratch);
});`,
    },
    {
      name: "stable scratch vector for a Line tangent",
      code: `import { LineCurve3, Vector3 } from "three";
const curve = new LineCurve3();
const scratch = new Vector3();
requestAnimationFrame(() => {
  curve.getTangent(0.5, scratch);
});`,
    },
    {
      name: "stable result array for a raycast",
      code: `import { Raycaster } from "three";
const raycaster = new Raycaster();
const hits = [];
requestAnimationFrame(() => {
  raycaster.intersectObject(mesh, true, hits);
});`,
    },
    {
      name: "stable result array for getObjectsByProperty",
      code: `import { Scene } from "three";
const scene = new Scene();
const found = [];
requestAnimationFrame(() => {
  scene.getObjectsByProperty("name", "target", found);
});`,
    },
    {
      name: "member expression target counts as stable",
      code: `import { Vector3 } from "three";
const value = new Vector3();
requestAnimationFrame(() => {
  value.toArray(state.scratch);
});`,
    },
    {
      name: "a null target is a different call shape",
      code: `import { Vector3 } from "three";
const value = new Vector3();
requestAnimationFrame(() => {
  value.toArray(null);
});`,
    },
    {
      name: "Path point calls are not cataloged",
      code: `import { Path } from "three";
const path = new Path();
requestAnimationFrame(() => {
  path.getPoint(0.5);
});`,
    },
    {
      name: "Shape tangent calls are not cataloged",
      code: `import { Shape } from "three";
const path = new Shape();
requestAnimationFrame(() => {
  path.getTangent(0.5);
});`,
    },
    {
      name: "CurvePath point calls are not cataloged",
      code: `import { CurvePath } from "three";
const path = new CurvePath();
requestAnimationFrame(() => {
  path.getPointAt(0.5);
});`,
    },
    {
      name: "getLengths depends on a cache and is excluded",
      code: `import { LineCurve } from "three";
const curve = new LineCurve();
requestAnimationFrame(() => {
  curve.getLengths();
});`,
    },
    {
      name: "Matrix2 has no toArray",
      code: `import { Matrix2 } from "three";
const value = new Matrix2();
requestAnimationFrame(() => {
  value.toArray();
});`,
    },
    {
      name: "required-target getters are excluded",
      code: `import { Box3 } from "three";
const box = new Box3();
requestAnimationFrame(() => {
  box.getCenter();
});`,
    },
    {
      name: "an uncataloged method on a cataloged receiver",
      code: `import { Vector3 } from "three";
const value = new Vector3();
requestAnimationFrame(() => {
  value.normalize();
});`,
    },
    {
      name: "an uncataloged receiver class",
      code: `import { Matrix2 } from "three";
const value = new Matrix2();
requestAnimationFrame(() => {
  value.getPoints();
});`,
    },
    {
      name: "toArray with three arguments is out of range",
      code: `import { Vector3 } from "three";
const value = new Vector3();
requestAnimationFrame(() => {
  value.toArray(scratch, 0, extra);
});`,
    },
    {
      name: "getPoint with no argument is an invalid call",
      code: `import { LineCurve } from "three";
const curve = new LineCurve();
requestAnimationFrame(() => {
  curve.getPoint();
});`,
    },
    {
      name: "computeFrenetFrames with no argument is an invalid call",
      code: `import { CurvePath } from "three";
const path = new CurvePath();
requestAnimationFrame(() => {
  path.computeFrenetFrames();
});`,
    },
    {
      name: "getPoints with two arguments is out of range",
      code: `import { Path } from "three";
const path = new Path();
requestAnimationFrame(() => {
  path.getPoints(12, extra);
});`,
    },
    {
      name: "spread hides the argument count",
      code: `import { Vector3 } from "three";
const value = new Vector3();
const parts = [scratch];
requestAnimationFrame(() => {
  value.toArray(...parts);
});`,
    },
    {
      name: "dynamic method name",
      code: `import { Vector3 } from "three";
const value = new Vector3();
requestAnimationFrame(() => {
  value[methodName]();
});`,
    },
    {
      name: "mutable receiver binding",
      code: `import { Vector3 } from "three";
let value = new Vector3();
value = other;
requestAnimationFrame(() => {
  value.toArray();
});`,
    },
    {
      name: "receiver reached through two alias hops",
      code: `import { Vector3 } from "three";
const created = new Vector3();
const middle = created;
const value = middle;
requestAnimationFrame(() => {
  value.toArray();
});`,
    },
    {
      name: "allocation inside a nested helper",
      code: `import { Vector3 } from "three";
const value = new Vector3();
requestAnimationFrame(() => {
  queue(() => {
    value.toArray();
  });
});`,
    },
    {
      name: "same-named class from an unrelated module",
      code: `import { Vector3 } from "my-math";
const value = new Vector3();
requestAnimationFrame(() => {
  value.toArray();
});`,
    },
  ],
  invalid: [
    {
      name: "ArcCurve.getPoint without a target",
      code: `import { ArcCurve } from "three";
const curve = new ArcCurve();
requestAnimationFrame(() => {
  curve.getPoint(0.5);
});`,
      output: null,
      errors: [
        {
          messageId: "missingReusableTargetInLoop",
          data: { receiver: "curve", method: "getPoint" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "CatmullRomCurve3.getPoint without a target",
      code: `import { CatmullRomCurve3 } from "three";
const curve = new CatmullRomCurve3();
requestAnimationFrame(() => {
  curve.getPoint(0.5);
});`,
      output: null,
      errors: [
        {
          messageId: "missingReusableTargetInLoop",
          data: { receiver: "curve", method: "getPoint" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "CubicBezierCurve.getPoint without a target",
      code: `import { CubicBezierCurve } from "three";
const curve = new CubicBezierCurve();
requestAnimationFrame(() => {
  curve.getPoint(0.5);
});`,
      output: null,
      errors: [
        {
          messageId: "missingReusableTargetInLoop",
          data: { receiver: "curve", method: "getPoint" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "CubicBezierCurve3.getPoint without a target",
      code: `import { CubicBezierCurve3 } from "three";
const curve = new CubicBezierCurve3();
requestAnimationFrame(() => {
  curve.getPoint(0.5);
});`,
      output: null,
      errors: [
        {
          messageId: "missingReusableTargetInLoop",
          data: { receiver: "curve", method: "getPoint" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "EllipseCurve.getPoint without a target",
      code: `import { EllipseCurve } from "three";
const curve = new EllipseCurve();
requestAnimationFrame(() => {
  curve.getPoint(0.5);
});`,
      output: null,
      errors: [
        {
          messageId: "missingReusableTargetInLoop",
          data: { receiver: "curve", method: "getPoint" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "LineCurve.getPoint without a target",
      code: `import { LineCurve } from "three";
const curve = new LineCurve();
requestAnimationFrame(() => {
  curve.getPoint(0.5);
});`,
      output: null,
      errors: [
        {
          messageId: "missingReusableTargetInLoop",
          data: { receiver: "curve", method: "getPoint" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "LineCurve3.getPoint without a target",
      code: `import { LineCurve3 } from "three";
const curve = new LineCurve3();
requestAnimationFrame(() => {
  curve.getPoint(0.5);
});`,
      output: null,
      errors: [
        {
          messageId: "missingReusableTargetInLoop",
          data: { receiver: "curve", method: "getPoint" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "QuadraticBezierCurve.getPoint without a target",
      code: `import { QuadraticBezierCurve } from "three";
const curve = new QuadraticBezierCurve();
requestAnimationFrame(() => {
  curve.getPoint(0.5);
});`,
      output: null,
      errors: [
        {
          messageId: "missingReusableTargetInLoop",
          data: { receiver: "curve", method: "getPoint" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "QuadraticBezierCurve3.getPoint without a target",
      code: `import { QuadraticBezierCurve3 } from "three";
const curve = new QuadraticBezierCurve3();
requestAnimationFrame(() => {
  curve.getPoint(0.5);
});`,
      output: null,
      errors: [
        {
          messageId: "missingReusableTargetInLoop",
          data: { receiver: "curve", method: "getPoint" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "SplineCurve.getPoint without a target",
      code: `import { SplineCurve } from "three";
const curve = new SplineCurve();
requestAnimationFrame(() => {
  curve.getPoint(0.5);
});`,
      output: null,
      errors: [
        {
          messageId: "missingReusableTargetInLoop",
          data: { receiver: "curve", method: "getPoint" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "SplineCurve.getPointAt without a target",
      code: `import { SplineCurve } from "three";
const curve = new SplineCurve();
requestAnimationFrame(() => {
  curve.getPointAt(0.5);
});`,
      output: null,
      errors: [
        {
          messageId: "missingReusableTargetInLoop",
          data: { receiver: "curve", method: "getPointAt" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "LineCurve.getTangent without a target",
      code: `import { LineCurve } from "three";
const curve = new LineCurve();
requestAnimationFrame(() => {
  curve.getTangent(0.5);
});`,
      output: null,
      errors: [
        {
          messageId: "missingReusableTargetInLoop",
          data: { receiver: "curve", method: "getTangent" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "LineCurve.getTangentAt without a target",
      code: `import { LineCurve } from "three";
const curve = new LineCurve();
requestAnimationFrame(() => {
  curve.getTangentAt(0.5);
});`,
      output: null,
      errors: [
        {
          messageId: "missingReusableTargetInLoop",
          data: { receiver: "curve", method: "getTangentAt" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "LineCurve3.getTangent without a target",
      code: `import { LineCurve3 } from "three";
const curve = new LineCurve3();
requestAnimationFrame(() => {
  curve.getTangent(0.5);
});`,
      output: null,
      errors: [
        {
          messageId: "missingReusableTargetInLoop",
          data: { receiver: "curve", method: "getTangent" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "LineCurve3.getTangentAt without a target",
      code: `import { LineCurve3 } from "three";
const curve = new LineCurve3();
requestAnimationFrame(() => {
  curve.getTangentAt(0.5);
});`,
      output: null,
      errors: [
        {
          messageId: "missingReusableTargetInLoop",
          data: { receiver: "curve", method: "getTangentAt" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "ArcCurve.getTangent allocates even with a target",
      code: `import { ArcCurve } from "three";
const curve = new ArcCurve();
requestAnimationFrame(() => {
  curve.getTangent(0.5, scratch);
});`,
      output: null,
      errors: [
        {
          messageId: "alwaysAllocatingCallInLoop",
          data: { receiver: "curve", method: "getTangent" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "CatmullRomCurve3.getTangent allocates even with a target",
      code: `import { CatmullRomCurve3 } from "three";
const curve = new CatmullRomCurve3();
requestAnimationFrame(() => {
  curve.getTangent(0.5, scratch);
});`,
      output: null,
      errors: [
        {
          messageId: "alwaysAllocatingCallInLoop",
          data: { receiver: "curve", method: "getTangent" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "CubicBezierCurve.getTangent allocates even with a target",
      code: `import { CubicBezierCurve } from "three";
const curve = new CubicBezierCurve();
requestAnimationFrame(() => {
  curve.getTangent(0.5, scratch);
});`,
      output: null,
      errors: [
        {
          messageId: "alwaysAllocatingCallInLoop",
          data: { receiver: "curve", method: "getTangent" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "CubicBezierCurve3.getTangent allocates even with a target",
      code: `import { CubicBezierCurve3 } from "three";
const curve = new CubicBezierCurve3();
requestAnimationFrame(() => {
  curve.getTangent(0.5, scratch);
});`,
      output: null,
      errors: [
        {
          messageId: "alwaysAllocatingCallInLoop",
          data: { receiver: "curve", method: "getTangent" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "EllipseCurve.getTangent allocates even with a target",
      code: `import { EllipseCurve } from "three";
const curve = new EllipseCurve();
requestAnimationFrame(() => {
  curve.getTangent(0.5, scratch);
});`,
      output: null,
      errors: [
        {
          messageId: "alwaysAllocatingCallInLoop",
          data: { receiver: "curve", method: "getTangent" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "QuadraticBezierCurve.getTangent allocates even with a target",
      code: `import { QuadraticBezierCurve } from "three";
const curve = new QuadraticBezierCurve();
requestAnimationFrame(() => {
  curve.getTangent(0.5, scratch);
});`,
      output: null,
      errors: [
        {
          messageId: "alwaysAllocatingCallInLoop",
          data: { receiver: "curve", method: "getTangent" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "QuadraticBezierCurve3.getTangent allocates even with a target",
      code: `import { QuadraticBezierCurve3 } from "three";
const curve = new QuadraticBezierCurve3();
requestAnimationFrame(() => {
  curve.getTangent(0.5, scratch);
});`,
      output: null,
      errors: [
        {
          messageId: "alwaysAllocatingCallInLoop",
          data: { receiver: "curve", method: "getTangent" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "SplineCurve.getTangent allocates even with a target",
      code: `import { SplineCurve } from "three";
const curve = new SplineCurve();
requestAnimationFrame(() => {
  curve.getTangent(0.5, scratch);
});`,
      output: null,
      errors: [
        {
          messageId: "alwaysAllocatingCallInLoop",
          data: { receiver: "curve", method: "getTangent" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "EllipseCurve.getTangentAt allocates even with a target",
      code: `import { EllipseCurve } from "three";
const curve = new EllipseCurve();
requestAnimationFrame(() => {
  curve.getTangentAt(0.5, scratch);
});`,
      output: null,
      errors: [
        {
          messageId: "alwaysAllocatingCallInLoop",
          data: { receiver: "curve", method: "getTangentAt" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "ArcCurve.getPoints allocates",
      code: `import { ArcCurve } from "three";
const path = new ArcCurve();
requestAnimationFrame(() => {
  path.getPoints();
});`,
      output: null,
      errors: [
        {
          messageId: "alwaysAllocatingCallInLoop",
          data: { receiver: "path", method: "getPoints" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "CatmullRomCurve3.getPoints allocates",
      code: `import { CatmullRomCurve3 } from "three";
const path = new CatmullRomCurve3();
requestAnimationFrame(() => {
  path.getPoints();
});`,
      output: null,
      errors: [
        {
          messageId: "alwaysAllocatingCallInLoop",
          data: { receiver: "path", method: "getPoints" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "CubicBezierCurve.getPoints allocates",
      code: `import { CubicBezierCurve } from "three";
const path = new CubicBezierCurve();
requestAnimationFrame(() => {
  path.getPoints();
});`,
      output: null,
      errors: [
        {
          messageId: "alwaysAllocatingCallInLoop",
          data: { receiver: "path", method: "getPoints" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "CubicBezierCurve3.getPoints allocates",
      code: `import { CubicBezierCurve3 } from "three";
const path = new CubicBezierCurve3();
requestAnimationFrame(() => {
  path.getPoints();
});`,
      output: null,
      errors: [
        {
          messageId: "alwaysAllocatingCallInLoop",
          data: { receiver: "path", method: "getPoints" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "EllipseCurve.getPoints allocates",
      code: `import { EllipseCurve } from "three";
const path = new EllipseCurve();
requestAnimationFrame(() => {
  path.getPoints();
});`,
      output: null,
      errors: [
        {
          messageId: "alwaysAllocatingCallInLoop",
          data: { receiver: "path", method: "getPoints" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "LineCurve.getPoints allocates",
      code: `import { LineCurve } from "three";
const path = new LineCurve();
requestAnimationFrame(() => {
  path.getPoints();
});`,
      output: null,
      errors: [
        {
          messageId: "alwaysAllocatingCallInLoop",
          data: { receiver: "path", method: "getPoints" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "LineCurve3.getPoints allocates",
      code: `import { LineCurve3 } from "three";
const path = new LineCurve3();
requestAnimationFrame(() => {
  path.getPoints();
});`,
      output: null,
      errors: [
        {
          messageId: "alwaysAllocatingCallInLoop",
          data: { receiver: "path", method: "getPoints" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "QuadraticBezierCurve.getPoints allocates",
      code: `import { QuadraticBezierCurve } from "three";
const path = new QuadraticBezierCurve();
requestAnimationFrame(() => {
  path.getPoints();
});`,
      output: null,
      errors: [
        {
          messageId: "alwaysAllocatingCallInLoop",
          data: { receiver: "path", method: "getPoints" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "QuadraticBezierCurve3.getPoints allocates",
      code: `import { QuadraticBezierCurve3 } from "three";
const path = new QuadraticBezierCurve3();
requestAnimationFrame(() => {
  path.getPoints();
});`,
      output: null,
      errors: [
        {
          messageId: "alwaysAllocatingCallInLoop",
          data: { receiver: "path", method: "getPoints" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "SplineCurve.getPoints allocates",
      code: `import { SplineCurve } from "three";
const path = new SplineCurve();
requestAnimationFrame(() => {
  path.getPoints();
});`,
      output: null,
      errors: [
        {
          messageId: "alwaysAllocatingCallInLoop",
          data: { receiver: "path", method: "getPoints" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "CurvePath.getPoints allocates",
      code: `import { CurvePath } from "three";
const path = new CurvePath();
requestAnimationFrame(() => {
  path.getPoints();
});`,
      output: null,
      errors: [
        {
          messageId: "alwaysAllocatingCallInLoop",
          data: { receiver: "path", method: "getPoints" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "Path.getPoints allocates",
      code: `import { Path } from "three";
const path = new Path();
requestAnimationFrame(() => {
  path.getPoints();
});`,
      output: null,
      errors: [
        {
          messageId: "alwaysAllocatingCallInLoop",
          data: { receiver: "path", method: "getPoints" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "Shape.getPoints allocates",
      code: `import { Shape } from "three";
const path = new Shape();
requestAnimationFrame(() => {
  path.getPoints();
});`,
      output: null,
      errors: [
        {
          messageId: "alwaysAllocatingCallInLoop",
          data: { receiver: "path", method: "getPoints" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "Path.getSpacedPoints allocates",
      code: `import { Path } from "three";
const path = new Path();
requestAnimationFrame(() => {
  path.getSpacedPoints(24);
});`,
      output: null,
      errors: [
        {
          messageId: "alwaysAllocatingCallInLoop",
          data: { receiver: "path", method: "getSpacedPoints" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "Shape.computeFrenetFrames allocates",
      code: `import { Shape } from "three";
const path = new Shape();
requestAnimationFrame(() => {
  path.computeFrenetFrames(8);
});`,
      output: null,
      errors: [
        {
          messageId: "alwaysAllocatingCallInLoop",
          data: { receiver: "path", method: "computeFrenetFrames" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "CurvePath.computeFrenetFrames with a closed flag allocates",
      code: `import { CurvePath } from "three";
const path = new CurvePath();
requestAnimationFrame(() => {
  path.computeFrenetFrames(8, true);
});`,
      output: null,
      errors: [
        {
          messageId: "alwaysAllocatingCallInLoop",
          data: { receiver: "path", method: "computeFrenetFrames" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector2.toArray without a reusable array",
      code: `import { Vector2 } from "three";
const value = new Vector2();
requestAnimationFrame(() => {
  value.toArray();
});`,
      output: null,
      errors: [
        {
          messageId: "missingReusableTargetInLoop",
          data: { receiver: "value", method: "toArray" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector3.toArray without a reusable array",
      code: `import { Vector3 } from "three";
const value = new Vector3();
requestAnimationFrame(() => {
  value.toArray();
});`,
      output: null,
      errors: [
        {
          messageId: "missingReusableTargetInLoop",
          data: { receiver: "value", method: "toArray" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector4.toArray without a reusable array",
      code: `import { Vector4 } from "three";
const value = new Vector4();
requestAnimationFrame(() => {
  value.toArray();
});`,
      output: null,
      errors: [
        {
          messageId: "missingReusableTargetInLoop",
          data: { receiver: "value", method: "toArray" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "Quaternion.toArray without a reusable array",
      code: `import { Quaternion } from "three";
const value = new Quaternion();
requestAnimationFrame(() => {
  value.toArray();
});`,
      output: null,
      errors: [
        {
          messageId: "missingReusableTargetInLoop",
          data: { receiver: "value", method: "toArray" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "Euler.toArray without a reusable array",
      code: `import { Euler } from "three";
const value = new Euler();
requestAnimationFrame(() => {
  value.toArray();
});`,
      output: null,
      errors: [
        {
          messageId: "missingReusableTargetInLoop",
          data: { receiver: "value", method: "toArray" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "Color.toArray without a reusable array",
      code: `import { Color } from "three";
const value = new Color();
requestAnimationFrame(() => {
  value.toArray();
});`,
      output: null,
      errors: [
        {
          messageId: "missingReusableTargetInLoop",
          data: { receiver: "value", method: "toArray" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "Matrix3.toArray without a reusable array",
      code: `import { Matrix3 } from "three";
const value = new Matrix3();
requestAnimationFrame(() => {
  value.toArray();
});`,
      output: null,
      errors: [
        {
          messageId: "missingReusableTargetInLoop",
          data: { receiver: "value", method: "toArray" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "Matrix4.toArray without a reusable array",
      code: `import { Matrix4 } from "three";
const value = new Matrix4();
requestAnimationFrame(() => {
  value.toArray();
});`,
      output: null,
      errors: [
        {
          messageId: "missingReusableTargetInLoop",
          data: { receiver: "value", method: "toArray" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "Raycaster.intersectObject without a result array",
      code: `import { Raycaster } from "three";
const raycaster = new Raycaster();
requestAnimationFrame(() => {
  raycaster.intersectObject(mesh);
});`,
      output: null,
      errors: [
        {
          messageId: "missingReusableTargetInLoop",
          data: { receiver: "raycaster", method: "intersectObject" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "Raycaster.intersectObjects without a result array",
      code: `import { Raycaster } from "three";
const raycaster = new Raycaster();
requestAnimationFrame(() => {
  raycaster.intersectObjects(meshes, true);
});`,
      output: null,
      errors: [
        {
          messageId: "missingReusableTargetInLoop",
          data: { receiver: "raycaster", method: "intersectObjects" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "Object3D.getObjectsByProperty without a result array",
      code: `import { Group } from "three";
const group = new Group();
requestAnimationFrame(() => {
  group.getObjectsByProperty("name", "target");
});`,
      output: null,
      errors: [
        {
          messageId: "missingReusableTargetInLoop",
          data: { receiver: "group", method: "getObjectsByProperty" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "Scene.getObjectsByProperty with an inline array",
      code: `import { Scene } from "three";
const scene = new Scene();
requestAnimationFrame(() => {
  scene.getObjectsByProperty("name", "target", []);
});`,
      output: null,
      errors: [
        {
          messageId: "missingReusableTargetInLoop",
          data: { receiver: "scene", method: "getObjectsByProperty" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "toArray with an inline array target",
      code: `import { Vector3 } from "three";
const value = new Vector3();
requestAnimationFrame(() => {
  value.toArray([]);
});`,
      output: null,
      errors: [
        {
          messageId: "missingReusableTargetInLoop",
          data: { receiver: "value", method: "toArray" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "toArray with an explicitly undefined target",
      code: `import { Vector3 } from "three";
const value = new Vector3();
requestAnimationFrame(() => {
  value.toArray(undefined, 0);
});`,
      output: null,
      errors: [
        {
          messageId: "missingReusableTargetInLoop",
          data: { receiver: "value", method: "toArray" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "getPoint with a void target",
      code: `import { LineCurve } from "three";
const curve = new LineCurve();
requestAnimationFrame(() => {
  curve.getPoint(0.5, void 0);
});`,
      output: null,
      errors: [
        {
          messageId: "missingReusableTargetInLoop",
          data: { receiver: "curve", method: "getPoint" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "namespace-imported receiver",
      code: `import * as THREE from "three";
const value = new THREE.Quaternion();
requestAnimationFrame(() => {
  value.toArray();
});`,
      output: null,
      errors: [
        {
          messageId: "missingReusableTargetInLoop",
          data: { receiver: "value", method: "toArray" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "receiver reached through one immutable alias hop",
      code: `import { Vector3 } from "three";
const created = new Vector3();
const value = created;
requestAnimationFrame(() => {
  value.toArray();
});`,
      output: null,
      errors: [
        {
          messageId: "missingReusableTargetInLoop",
          data: { receiver: "value", method: "toArray" },
          line: 5,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "computed method name resolved from a string literal",
      code: `import { Vector3 } from "three";
const value = new Vector3();
requestAnimationFrame(() => {
  value["toArray"]();
});`,
      output: null,
      errors: [
        {
          messageId: "missingReusableTargetInLoop",
          data: { receiver: "value", method: "toArray" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "TypeScript non-null receiver stays transparent",
      code: `import { Vector3 } from "three";
const value = new Vector3();
requestAnimationFrame(() => {
  value!.toArray();
});`,
      output: null,
      languageOptions: tsLanguageOptions,
      errors: [
        {
          messageId: "missingReusableTargetInLoop",
          data: { receiver: "value", method: "toArray" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "React Three Fiber useFrame is included",
      code: `import { useFrame } from "@react-three/fiber";
import { Vector3 } from "three";
const value = new Vector3();
useFrame(() => {
  value.toArray();
});`,
      output: null,
      errors: [
        {
          messageId: "missingReusableTargetInLoop",
          data: { receiver: "value", method: "toArray" },
          line: 5,
          column: 3,
          suggestions: [],
        },
      ],
    },
    {
      name: "webgpu core module receiver",
      code: `import { Vector4 } from "three/webgpu";
const value = new Vector4();
requestAnimationFrame(() => {
  value.toArray();
});`,
      output: null,
      errors: [
        {
          messageId: "missingReusableTargetInLoop",
          data: { receiver: "value", method: "toArray" },
          line: 4,
          column: 3,
          suggestions: [],
        },
      ],
    },
  ],
});
