import rule from "../../src/rules/prefer-squared-vector-magnitude.js";
import { createRuleTester, tsLanguageOptions } from "../helpers/rule-tester.js";

const ruleTester = createRuleTester();

/*
 * `Vector2` and `Vector3` length and distance plus `Vector4` length are each
 * exercised with all eight comparison operators in both operand directions, next
 * to every zero form and every threshold or equivalence refusal.
 */
ruleTester.run("prefer-squared-vector-magnitude", rule, {
  valid: [
    {
      name: "a nonzero threshold is not an equivalent rewrite",
      code: `import { Vector3 } from "three";
const v = new Vector3();
const near = v.length() < 5;`,
    },
    {
      name: "a fractional threshold is not an equivalent rewrite",
      code: `import { Vector3 } from "three";
const v = new Vector3();
const near = v.length() < 0.5;`,
    },
    {
      name: "a dynamic threshold cannot be squared",
      code: `import { Vector3 } from "three";
const v = new Vector3();
const near = v.length() < limit;`,
    },
    {
      name: "a bigint zero is not a number",
      code: `import { Vector3 } from "three";
const v = new Vector3();
const isZero = v.length() === 0n;`,
    },
    {
      name: "NaN is never a zero comparison",
      code: `import { Vector3 } from "three";
const v = new Vector3();
const isZero = v.length() === NaN;`,
    },
    {
      name: "Infinity is not zero",
      code: `import { Vector3 } from "three";
const v = new Vector3();
const isFar = v.length() > Infinity;`,
    },
    {
      name: "comparing two magnitudes squares neither side safely",
      code: `import { Vector3 } from "three";
const a = new Vector3();
const b = new Vector3();
const closer = a.length() < b.length();`,
    },
    {
      name: "Vector4 has no distanceTo",
      code: `import { Vector4 } from "three";
const v = new Vector4();
const other = new Vector4();
const isZero = v.distanceTo(other) === 0;`,
    },
    {
      name: "distanceTo against a different vector class",
      code: `import { Vector2, Vector3 } from "three";
const v = new Vector3();
const other = new Vector2();
const isZero = v.distanceTo(other) === 0;`,
    },
    {
      name: "distanceTo against an unresolved operand",
      code: `import { Vector3 } from "three";
const v = new Vector3();
const isZero = v.distanceTo(other) === 0;`,
    },
    {
      name: "distanceTo with no argument",
      code: `import { Vector3 } from "three";
const v = new Vector3();
const isZero = v.distanceTo() === 0;`,
    },
    {
      name: "distanceTo with a spread argument",
      code: `import { Vector3 } from "three";
const v = new Vector3();
const parts = [other];
const isZero = v.distanceTo(...parts) === 0;`,
    },
    {
      name: "length with an argument is not the documented call",
      code: `import { Vector3 } from "three";
const v = new Vector3();
const isZero = v.length(1) === 0;`,
    },
    {
      name: "manhattanLength has no squared equivalent",
      code: `import { Vector3 } from "three";
const v = new Vector3();
const isZero = v.manhattanLength() === 0;`,
    },
    {
      name: "Quaternion is not a cataloged vector class",
      code: `import { Quaternion } from "three";
const q = new Quaternion();
const isZero = q.length() === 0;`,
    },
    {
      name: "an unresolved receiver",
      code: `const isZero = mesh.position.length() === 0;`,
    },
    {
      name: "mutable vector binding",
      code: `import { Vector3 } from "three";
let v = new Vector3();
v = other;
const isZero = v.length() === 0;`,
    },
    {
      name: "vector reached through two alias hops",
      code: `import { Vector3 } from "three";
const created = new Vector3();
const middle = created;
const v = middle;
const isZero = v.length() === 0;`,
    },
    {
      name: "magnitude used arithmetically rather than compared",
      code: `import { Vector3 } from "three";
const v = new Vector3();
const scaled = v.length() + 0;`,
    },
    {
      name: "magnitude assigned rather than compared",
      code: `import { Vector3 } from "three";
const v = new Vector3();
const size = v.length();`,
    },
    {
      name: "magnitude passed as an argument",
      code: `import { Vector3 } from "three";
const v = new Vector3();
report(v.length());`,
    },
    {
      name: "magnitude reached through a helper",
      code: `import { Vector3 } from "three";
const v = new Vector3();
const isZero = measure(v) === 0;`,
    },
    {
      name: "comparison nested behind an intermediate binding",
      code: `import { Vector3 } from "three";
const v = new Vector3();
const size = v.length();
const isZero = size === 0;`,
    },
    {
      name: "a logical expression is not a comparison",
      code: `import { Vector3 } from "three";
const v = new Vector3();
const isZero = v.length() || 0;`,
    },
    {
      name: "same-named vector from an unrelated module",
      code: `import { Vector3 } from "my-math";
const v = new Vector3();
const isZero = v.length() === 0;`,
    },
    {
      name: "dynamic method name",
      code: `import { Vector3 } from "three";
const v = new Vector3();
const isZero = v[methodName]() === 0;`,
    },
  ],
  invalid: [
    {
      name: "Vector2 length() < zero",
      code: `import { Vector2 } from "three";
const v = new Vector2();
const flag = v.length() < 0;`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.length()", squaredMethod: "lengthSq" },
          line: 3,
          column: 14,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector2 zero < length()",
      code: `import { Vector2 } from "three";
const v = new Vector2();
const flag = 0 < v.length();`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.length()", squaredMethod: "lengthSq" },
          line: 3,
          column: 18,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector2 length() <= zero",
      code: `import { Vector2 } from "three";
const v = new Vector2();
const flag = v.length() <= 0;`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.length()", squaredMethod: "lengthSq" },
          line: 3,
          column: 14,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector2 zero <= length()",
      code: `import { Vector2 } from "three";
const v = new Vector2();
const flag = 0 <= v.length();`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.length()", squaredMethod: "lengthSq" },
          line: 3,
          column: 19,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector2 length() > zero",
      code: `import { Vector2 } from "three";
const v = new Vector2();
const flag = v.length() > 0;`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.length()", squaredMethod: "lengthSq" },
          line: 3,
          column: 14,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector2 zero > length()",
      code: `import { Vector2 } from "three";
const v = new Vector2();
const flag = 0 > v.length();`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.length()", squaredMethod: "lengthSq" },
          line: 3,
          column: 18,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector2 length() >= zero",
      code: `import { Vector2 } from "three";
const v = new Vector2();
const flag = v.length() >= 0;`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.length()", squaredMethod: "lengthSq" },
          line: 3,
          column: 14,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector2 zero >= length()",
      code: `import { Vector2 } from "three";
const v = new Vector2();
const flag = 0 >= v.length();`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.length()", squaredMethod: "lengthSq" },
          line: 3,
          column: 19,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector2 length() == zero",
      code: `import { Vector2 } from "three";
const v = new Vector2();
const flag = v.length() == 0;`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.length()", squaredMethod: "lengthSq" },
          line: 3,
          column: 14,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector2 zero == length()",
      code: `import { Vector2 } from "three";
const v = new Vector2();
const flag = 0 == v.length();`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.length()", squaredMethod: "lengthSq" },
          line: 3,
          column: 19,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector2 length() != zero",
      code: `import { Vector2 } from "three";
const v = new Vector2();
const flag = v.length() != 0;`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.length()", squaredMethod: "lengthSq" },
          line: 3,
          column: 14,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector2 zero != length()",
      code: `import { Vector2 } from "three";
const v = new Vector2();
const flag = 0 != v.length();`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.length()", squaredMethod: "lengthSq" },
          line: 3,
          column: 19,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector2 length() === zero",
      code: `import { Vector2 } from "three";
const v = new Vector2();
const flag = v.length() === 0;`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.length()", squaredMethod: "lengthSq" },
          line: 3,
          column: 14,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector2 zero === length()",
      code: `import { Vector2 } from "three";
const v = new Vector2();
const flag = 0 === v.length();`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.length()", squaredMethod: "lengthSq" },
          line: 3,
          column: 20,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector2 length() !== zero",
      code: `import { Vector2 } from "three";
const v = new Vector2();
const flag = v.length() !== 0;`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.length()", squaredMethod: "lengthSq" },
          line: 3,
          column: 14,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector2 zero !== length()",
      code: `import { Vector2 } from "three";
const v = new Vector2();
const flag = 0 !== v.length();`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.length()", squaredMethod: "lengthSq" },
          line: 3,
          column: 20,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector3 length() < zero",
      code: `import { Vector3 } from "three";
const v = new Vector3();
const flag = v.length() < 0;`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.length()", squaredMethod: "lengthSq" },
          line: 3,
          column: 14,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector3 zero < length()",
      code: `import { Vector3 } from "three";
const v = new Vector3();
const flag = 0 < v.length();`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.length()", squaredMethod: "lengthSq" },
          line: 3,
          column: 18,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector3 length() <= zero",
      code: `import { Vector3 } from "three";
const v = new Vector3();
const flag = v.length() <= 0;`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.length()", squaredMethod: "lengthSq" },
          line: 3,
          column: 14,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector3 zero <= length()",
      code: `import { Vector3 } from "three";
const v = new Vector3();
const flag = 0 <= v.length();`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.length()", squaredMethod: "lengthSq" },
          line: 3,
          column: 19,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector3 length() > zero",
      code: `import { Vector3 } from "three";
const v = new Vector3();
const flag = v.length() > 0;`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.length()", squaredMethod: "lengthSq" },
          line: 3,
          column: 14,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector3 zero > length()",
      code: `import { Vector3 } from "three";
const v = new Vector3();
const flag = 0 > v.length();`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.length()", squaredMethod: "lengthSq" },
          line: 3,
          column: 18,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector3 length() >= zero",
      code: `import { Vector3 } from "three";
const v = new Vector3();
const flag = v.length() >= 0;`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.length()", squaredMethod: "lengthSq" },
          line: 3,
          column: 14,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector3 zero >= length()",
      code: `import { Vector3 } from "three";
const v = new Vector3();
const flag = 0 >= v.length();`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.length()", squaredMethod: "lengthSq" },
          line: 3,
          column: 19,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector3 length() == zero",
      code: `import { Vector3 } from "three";
const v = new Vector3();
const flag = v.length() == 0;`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.length()", squaredMethod: "lengthSq" },
          line: 3,
          column: 14,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector3 zero == length()",
      code: `import { Vector3 } from "three";
const v = new Vector3();
const flag = 0 == v.length();`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.length()", squaredMethod: "lengthSq" },
          line: 3,
          column: 19,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector3 length() != zero",
      code: `import { Vector3 } from "three";
const v = new Vector3();
const flag = v.length() != 0;`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.length()", squaredMethod: "lengthSq" },
          line: 3,
          column: 14,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector3 zero != length()",
      code: `import { Vector3 } from "three";
const v = new Vector3();
const flag = 0 != v.length();`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.length()", squaredMethod: "lengthSq" },
          line: 3,
          column: 19,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector3 length() === zero",
      code: `import { Vector3 } from "three";
const v = new Vector3();
const flag = v.length() === 0;`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.length()", squaredMethod: "lengthSq" },
          line: 3,
          column: 14,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector3 zero === length()",
      code: `import { Vector3 } from "three";
const v = new Vector3();
const flag = 0 === v.length();`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.length()", squaredMethod: "lengthSq" },
          line: 3,
          column: 20,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector3 length() !== zero",
      code: `import { Vector3 } from "three";
const v = new Vector3();
const flag = v.length() !== 0;`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.length()", squaredMethod: "lengthSq" },
          line: 3,
          column: 14,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector3 zero !== length()",
      code: `import { Vector3 } from "three";
const v = new Vector3();
const flag = 0 !== v.length();`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.length()", squaredMethod: "lengthSq" },
          line: 3,
          column: 20,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector4 length() < zero",
      code: `import { Vector4 } from "three";
const v = new Vector4();
const flag = v.length() < 0;`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.length()", squaredMethod: "lengthSq" },
          line: 3,
          column: 14,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector4 zero < length()",
      code: `import { Vector4 } from "three";
const v = new Vector4();
const flag = 0 < v.length();`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.length()", squaredMethod: "lengthSq" },
          line: 3,
          column: 18,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector4 length() <= zero",
      code: `import { Vector4 } from "three";
const v = new Vector4();
const flag = v.length() <= 0;`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.length()", squaredMethod: "lengthSq" },
          line: 3,
          column: 14,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector4 zero <= length()",
      code: `import { Vector4 } from "three";
const v = new Vector4();
const flag = 0 <= v.length();`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.length()", squaredMethod: "lengthSq" },
          line: 3,
          column: 19,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector4 length() > zero",
      code: `import { Vector4 } from "three";
const v = new Vector4();
const flag = v.length() > 0;`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.length()", squaredMethod: "lengthSq" },
          line: 3,
          column: 14,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector4 zero > length()",
      code: `import { Vector4 } from "three";
const v = new Vector4();
const flag = 0 > v.length();`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.length()", squaredMethod: "lengthSq" },
          line: 3,
          column: 18,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector4 length() >= zero",
      code: `import { Vector4 } from "three";
const v = new Vector4();
const flag = v.length() >= 0;`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.length()", squaredMethod: "lengthSq" },
          line: 3,
          column: 14,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector4 zero >= length()",
      code: `import { Vector4 } from "three";
const v = new Vector4();
const flag = 0 >= v.length();`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.length()", squaredMethod: "lengthSq" },
          line: 3,
          column: 19,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector4 length() == zero",
      code: `import { Vector4 } from "three";
const v = new Vector4();
const flag = v.length() == 0;`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.length()", squaredMethod: "lengthSq" },
          line: 3,
          column: 14,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector4 zero == length()",
      code: `import { Vector4 } from "three";
const v = new Vector4();
const flag = 0 == v.length();`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.length()", squaredMethod: "lengthSq" },
          line: 3,
          column: 19,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector4 length() != zero",
      code: `import { Vector4 } from "three";
const v = new Vector4();
const flag = v.length() != 0;`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.length()", squaredMethod: "lengthSq" },
          line: 3,
          column: 14,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector4 zero != length()",
      code: `import { Vector4 } from "three";
const v = new Vector4();
const flag = 0 != v.length();`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.length()", squaredMethod: "lengthSq" },
          line: 3,
          column: 19,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector4 length() === zero",
      code: `import { Vector4 } from "three";
const v = new Vector4();
const flag = v.length() === 0;`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.length()", squaredMethod: "lengthSq" },
          line: 3,
          column: 14,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector4 zero === length()",
      code: `import { Vector4 } from "three";
const v = new Vector4();
const flag = 0 === v.length();`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.length()", squaredMethod: "lengthSq" },
          line: 3,
          column: 20,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector4 length() !== zero",
      code: `import { Vector4 } from "three";
const v = new Vector4();
const flag = v.length() !== 0;`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.length()", squaredMethod: "lengthSq" },
          line: 3,
          column: 14,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector4 zero !== length()",
      code: `import { Vector4 } from "three";
const v = new Vector4();
const flag = 0 !== v.length();`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.length()", squaredMethod: "lengthSq" },
          line: 3,
          column: 20,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector2 distanceTo(other) < zero",
      code: `import { Vector2 } from "three";
const v = new Vector2();
const other = new Vector2();
const flag = v.distanceTo(other) < 0;`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.distanceTo(other)", squaredMethod: "distanceToSquared" },
          line: 4,
          column: 14,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector2 zero < distanceTo(other)",
      code: `import { Vector2 } from "three";
const v = new Vector2();
const other = new Vector2();
const flag = 0 < v.distanceTo(other);`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.distanceTo(other)", squaredMethod: "distanceToSquared" },
          line: 4,
          column: 18,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector2 distanceTo(other) <= zero",
      code: `import { Vector2 } from "three";
const v = new Vector2();
const other = new Vector2();
const flag = v.distanceTo(other) <= 0;`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.distanceTo(other)", squaredMethod: "distanceToSquared" },
          line: 4,
          column: 14,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector2 zero <= distanceTo(other)",
      code: `import { Vector2 } from "three";
const v = new Vector2();
const other = new Vector2();
const flag = 0 <= v.distanceTo(other);`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.distanceTo(other)", squaredMethod: "distanceToSquared" },
          line: 4,
          column: 19,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector2 distanceTo(other) > zero",
      code: `import { Vector2 } from "three";
const v = new Vector2();
const other = new Vector2();
const flag = v.distanceTo(other) > 0;`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.distanceTo(other)", squaredMethod: "distanceToSquared" },
          line: 4,
          column: 14,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector2 zero > distanceTo(other)",
      code: `import { Vector2 } from "three";
const v = new Vector2();
const other = new Vector2();
const flag = 0 > v.distanceTo(other);`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.distanceTo(other)", squaredMethod: "distanceToSquared" },
          line: 4,
          column: 18,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector2 distanceTo(other) >= zero",
      code: `import { Vector2 } from "three";
const v = new Vector2();
const other = new Vector2();
const flag = v.distanceTo(other) >= 0;`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.distanceTo(other)", squaredMethod: "distanceToSquared" },
          line: 4,
          column: 14,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector2 zero >= distanceTo(other)",
      code: `import { Vector2 } from "three";
const v = new Vector2();
const other = new Vector2();
const flag = 0 >= v.distanceTo(other);`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.distanceTo(other)", squaredMethod: "distanceToSquared" },
          line: 4,
          column: 19,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector2 distanceTo(other) == zero",
      code: `import { Vector2 } from "three";
const v = new Vector2();
const other = new Vector2();
const flag = v.distanceTo(other) == 0;`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.distanceTo(other)", squaredMethod: "distanceToSquared" },
          line: 4,
          column: 14,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector2 zero == distanceTo(other)",
      code: `import { Vector2 } from "three";
const v = new Vector2();
const other = new Vector2();
const flag = 0 == v.distanceTo(other);`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.distanceTo(other)", squaredMethod: "distanceToSquared" },
          line: 4,
          column: 19,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector2 distanceTo(other) != zero",
      code: `import { Vector2 } from "three";
const v = new Vector2();
const other = new Vector2();
const flag = v.distanceTo(other) != 0;`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.distanceTo(other)", squaredMethod: "distanceToSquared" },
          line: 4,
          column: 14,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector2 zero != distanceTo(other)",
      code: `import { Vector2 } from "three";
const v = new Vector2();
const other = new Vector2();
const flag = 0 != v.distanceTo(other);`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.distanceTo(other)", squaredMethod: "distanceToSquared" },
          line: 4,
          column: 19,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector2 distanceTo(other) === zero",
      code: `import { Vector2 } from "three";
const v = new Vector2();
const other = new Vector2();
const flag = v.distanceTo(other) === 0;`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.distanceTo(other)", squaredMethod: "distanceToSquared" },
          line: 4,
          column: 14,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector2 zero === distanceTo(other)",
      code: `import { Vector2 } from "three";
const v = new Vector2();
const other = new Vector2();
const flag = 0 === v.distanceTo(other);`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.distanceTo(other)", squaredMethod: "distanceToSquared" },
          line: 4,
          column: 20,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector2 distanceTo(other) !== zero",
      code: `import { Vector2 } from "three";
const v = new Vector2();
const other = new Vector2();
const flag = v.distanceTo(other) !== 0;`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.distanceTo(other)", squaredMethod: "distanceToSquared" },
          line: 4,
          column: 14,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector2 zero !== distanceTo(other)",
      code: `import { Vector2 } from "three";
const v = new Vector2();
const other = new Vector2();
const flag = 0 !== v.distanceTo(other);`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.distanceTo(other)", squaredMethod: "distanceToSquared" },
          line: 4,
          column: 20,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector3 distanceTo(other) < zero",
      code: `import { Vector3 } from "three";
const v = new Vector3();
const other = new Vector3();
const flag = v.distanceTo(other) < 0;`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.distanceTo(other)", squaredMethod: "distanceToSquared" },
          line: 4,
          column: 14,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector3 zero < distanceTo(other)",
      code: `import { Vector3 } from "three";
const v = new Vector3();
const other = new Vector3();
const flag = 0 < v.distanceTo(other);`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.distanceTo(other)", squaredMethod: "distanceToSquared" },
          line: 4,
          column: 18,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector3 distanceTo(other) <= zero",
      code: `import { Vector3 } from "three";
const v = new Vector3();
const other = new Vector3();
const flag = v.distanceTo(other) <= 0;`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.distanceTo(other)", squaredMethod: "distanceToSquared" },
          line: 4,
          column: 14,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector3 zero <= distanceTo(other)",
      code: `import { Vector3 } from "three";
const v = new Vector3();
const other = new Vector3();
const flag = 0 <= v.distanceTo(other);`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.distanceTo(other)", squaredMethod: "distanceToSquared" },
          line: 4,
          column: 19,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector3 distanceTo(other) > zero",
      code: `import { Vector3 } from "three";
const v = new Vector3();
const other = new Vector3();
const flag = v.distanceTo(other) > 0;`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.distanceTo(other)", squaredMethod: "distanceToSquared" },
          line: 4,
          column: 14,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector3 zero > distanceTo(other)",
      code: `import { Vector3 } from "three";
const v = new Vector3();
const other = new Vector3();
const flag = 0 > v.distanceTo(other);`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.distanceTo(other)", squaredMethod: "distanceToSquared" },
          line: 4,
          column: 18,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector3 distanceTo(other) >= zero",
      code: `import { Vector3 } from "three";
const v = new Vector3();
const other = new Vector3();
const flag = v.distanceTo(other) >= 0;`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.distanceTo(other)", squaredMethod: "distanceToSquared" },
          line: 4,
          column: 14,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector3 zero >= distanceTo(other)",
      code: `import { Vector3 } from "three";
const v = new Vector3();
const other = new Vector3();
const flag = 0 >= v.distanceTo(other);`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.distanceTo(other)", squaredMethod: "distanceToSquared" },
          line: 4,
          column: 19,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector3 distanceTo(other) == zero",
      code: `import { Vector3 } from "three";
const v = new Vector3();
const other = new Vector3();
const flag = v.distanceTo(other) == 0;`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.distanceTo(other)", squaredMethod: "distanceToSquared" },
          line: 4,
          column: 14,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector3 zero == distanceTo(other)",
      code: `import { Vector3 } from "three";
const v = new Vector3();
const other = new Vector3();
const flag = 0 == v.distanceTo(other);`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.distanceTo(other)", squaredMethod: "distanceToSquared" },
          line: 4,
          column: 19,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector3 distanceTo(other) != zero",
      code: `import { Vector3 } from "three";
const v = new Vector3();
const other = new Vector3();
const flag = v.distanceTo(other) != 0;`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.distanceTo(other)", squaredMethod: "distanceToSquared" },
          line: 4,
          column: 14,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector3 zero != distanceTo(other)",
      code: `import { Vector3 } from "three";
const v = new Vector3();
const other = new Vector3();
const flag = 0 != v.distanceTo(other);`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.distanceTo(other)", squaredMethod: "distanceToSquared" },
          line: 4,
          column: 19,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector3 distanceTo(other) === zero",
      code: `import { Vector3 } from "three";
const v = new Vector3();
const other = new Vector3();
const flag = v.distanceTo(other) === 0;`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.distanceTo(other)", squaredMethod: "distanceToSquared" },
          line: 4,
          column: 14,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector3 zero === distanceTo(other)",
      code: `import { Vector3 } from "three";
const v = new Vector3();
const other = new Vector3();
const flag = 0 === v.distanceTo(other);`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.distanceTo(other)", squaredMethod: "distanceToSquared" },
          line: 4,
          column: 20,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector3 distanceTo(other) !== zero",
      code: `import { Vector3 } from "three";
const v = new Vector3();
const other = new Vector3();
const flag = v.distanceTo(other) !== 0;`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.distanceTo(other)", squaredMethod: "distanceToSquared" },
          line: 4,
          column: 14,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector3 zero !== distanceTo(other)",
      code: `import { Vector3 } from "three";
const v = new Vector3();
const other = new Vector3();
const flag = 0 !== v.distanceTo(other);`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.distanceTo(other)", squaredMethod: "distanceToSquared" },
          line: 4,
          column: 20,
          suggestions: [],
        },
      ],
    },
    {
      name: "unary plus zero is still zero",
      code: `import { Vector3 } from "three";
const v = new Vector3();
const isZero = v.length() === +0;`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.length()", squaredMethod: "lengthSq" },
          line: 3,
          column: 16,
          suggestions: [],
        },
      ],
    },
    {
      name: "negative zero is still zero",
      code: `import { Vector3 } from "three";
const v = new Vector3();
const isZero = v.length() === -0;`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.length()", squaredMethod: "lengthSq" },
          line: 3,
          column: 16,
          suggestions: [],
        },
      ],
    },
    {
      name: "a fractional zero literal is still zero",
      code: `import { Vector3 } from "three";
const v = new Vector3();
const isZero = v.length() === 0.0;`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.length()", squaredMethod: "lengthSq" },
          line: 3,
          column: 16,
          suggestions: [],
        },
      ],
    },
    {
      name: "namespace-imported vector",
      code: `import * as THREE from "three";
const v = new THREE.Vector3();
const isZero = v.length() === 0;`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.length()", squaredMethod: "lengthSq" },
          line: 3,
          column: 16,
          suggestions: [],
        },
      ],
    },
    {
      name: "vector reached through one immutable alias hop",
      code: `import { Vector3 } from "three";
const created = new Vector3();
const v = created;
const isZero = v.length() === 0;`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.length()", squaredMethod: "lengthSq" },
          line: 4,
          column: 16,
          suggestions: [],
        },
      ],
    },
    {
      name: "webgpu core module vector",
      code: `import { Vector2 } from "three/webgpu";
const v = new Vector2();
const other = new Vector2();
const isZero = v.distanceTo(other) === 0;`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v.distanceTo(other)", squaredMethod: "distanceToSquared" },
          line: 4,
          column: 16,
          suggestions: [],
        },
      ],
    },
    {
      name: "TypeScript non-null receiver stays transparent",
      code: `import { Vector3 } from "three";
const v = new Vector3();
const isZero = v!.length() === 0;`,
      output: null,
      languageOptions: tsLanguageOptions,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: "v!.length()", squaredMethod: "lengthSq" },
          line: 3,
          column: 16,
          suggestions: [],
        },
      ],
    },
    {
      name: "computed method name resolved from a string literal",
      code: `import { Vector3 } from "three";
const v = new Vector3();
const isZero = v["length"]() === 0;`,
      output: null,
      errors: [
        {
          messageId: "preferSquaredZeroComparison",
          data: { expression: 'v["length"]()', squaredMethod: "lengthSq" },
          line: 3,
          column: 16,
          suggestions: [],
        },
      ],
    },
  ],
});
