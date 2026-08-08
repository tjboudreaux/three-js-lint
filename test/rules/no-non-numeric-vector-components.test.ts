import rule from "../../src/rules/no-non-numeric-vector-components.js";
import { createRuleTester, tsLanguageOptions } from "../helpers/rule-tester.js";

const ruleTester = createRuleTester();

/*
 * Every constructor slot of all three classes, every setter family, both alias
 * families, and every statically non-numeric value kind are covered, together with
 * the exact `component` and `valueType` interpolation and each deliberate
 * unknown, dynamic, or compound refusal.
 */
ruleTester.run("no-non-numeric-vector-components", rule, {
  valid: [
    {
      name: "numeric components",
      code: `import { Vector3 } from "three";
const v = new Vector3(1, 2, 3);`,
    },
    {
      name: "negative numeric component",
      code: `import { Vector3 } from "three";
const v = new Vector3(-1, 2, 3);`,
    },
    {
      name: "bitwise negation of a number stays numeric",
      code: `import { Vector3 } from "three";
const v = new Vector3();
v.x = ~1;`,
    },
    {
      name: "unary plus on a number stays numeric",
      code: `import { Vector3 } from "three";
const v = new Vector3();
v.x = +1;`,
    },
    {
      name: "unary plus on a bigint throws before assignment",
      code: `import { Vector3 } from "three";
const v = new Vector3();
v.x = +1n;`,
    },
    {
      name: "NaN is a number",
      code: `import { Vector3 } from "three";
const v = new Vector3();
v.x = NaN;`,
    },
    {
      name: "Infinity is a number",
      code: `import { Vector3 } from "three";
const v = new Vector3();
v.x = Infinity;`,
    },
    {
      name: "an identifier value is unresolved",
      code: `import { Vector3 } from "three";
const v = new Vector3();
v.x = offset;`,
    },
    {
      name: "a call result is unresolved",
      code: `import { Vector3 } from "three";
const v = new Vector3();
v.x = compute();`,
    },
    {
      name: "a member access is unresolved",
      code: `import { Vector3 } from "three";
const v = new Vector3();
v.x = state.offset;`,
    },
    {
      name: "shadowed undefined is a local binding",
      code: `import { Vector3 } from "three";
const undefined = 1;
const v = new Vector3();
v.x = undefined;`,
    },
    {
      name: "Vector3 has no width alias",
      code: `import { Vector3 } from "three";
const v = new Vector3();
v.width = "bad";`,
    },
    {
      name: "Vector2 has no z component",
      code: `import { Vector2 } from "three";
const v = new Vector2();
v.z = "bad";`,
    },
    {
      name: "Vector2 has no setZ",
      code: `import { Vector2 } from "three";
const v = new Vector2();
v.setZ("bad");`,
    },
    {
      name: "Vector3 has no setW",
      code: `import { Vector3 } from "three";
const v = new Vector3();
v.setW("bad");`,
    },
    {
      name: "setComponent index out of range",
      code: `import { Vector2 } from "three";
const v = new Vector2();
v.setComponent(2, "bad");`,
    },
    {
      name: "setComponent with a negative index",
      code: `import { Vector3 } from "three";
const v = new Vector3();
v.setComponent(-1, "bad");`,
    },
    {
      name: "setComponent with a dynamic index",
      code: `import { Vector3 } from "three";
const v = new Vector3();
v.setComponent(index, "bad");`,
    },
    {
      name: "an unlisted property",
      code: `import { Vector3 } from "three";
const v = new Vector3();
v.userData = "bad";`,
    },
    {
      name: "a dynamic property name",
      code: `import { Vector3 } from "three";
const v = new Vector3();
v[componentName] = "bad";`,
    },
    {
      name: "compound assignment reads the stored number first",
      code: `import { Vector3 } from "three";
const v = new Vector3();
v.x += "bad";`,
    },
    {
      name: "update expression is arithmetic",
      code: `import { Vector3 } from "three";
const v = new Vector3();
v.x++;`,
    },
    {
      name: "logical assignment is not a plain write",
      code: `import { Vector3 } from "three";
const v = new Vector3();
v.x ||= "bad";`,
    },
    {
      name: "spread hides the argument positions",
      code: `import { Vector3 } from "three";
const parts = ["bad"];
const v = new Vector3(...parts);`,
    },
    {
      name: "set with the wrong arity is not the documented call",
      code: `import { Vector3 } from "three";
const v = new Vector3();
v.set("bad", 1);`,
    },
    {
      name: "setScalar with two arguments is not the documented call",
      code: `import { Vector3 } from "three";
const v = new Vector3();
v.setScalar("bad", 1);`,
    },
    {
      name: "extra constructor arguments are ignored by Three.js",
      code: `import { Vector2 } from "three";
const v = new Vector2(1, 2, "bad");`,
    },
    {
      name: "same-named vector from an unrelated module",
      code: `import { Vector3 } from "my-math";
const v = new Vector3("bad", 1, 2);`,
    },
    {
      name: "a user class named Vector3",
      code: `class Vector3 {}
const v = new Vector3("bad");`,
    },
    {
      name: "mutable vector binding",
      code: `import { Vector3 } from "three";
let v = new Vector3();
v = other;
v.x = "bad";`,
    },
    {
      name: "vector reached through two alias hops",
      code: `import { Vector3 } from "three";
const created = new Vector3();
const middle = created;
const v = middle;
v.x = "bad";`,
    },
    {
      name: "an unresolved receiver",
      code: `mesh.position.x = "bad";`,
    },
    {
      name: "Quaternion is not a cataloged vector class",
      code: `import { Quaternion } from "three";
const q = new Quaternion();
q.x = "bad";`,
    },
  ],
  invalid: [
    {
      name: "Vector2 constructor slot x",
      code: `import { Vector2 } from "three";
const v = new Vector2("bad", 0);`,
      output: null,
      errors: [
        {
          messageId: "nonNumericVectorComponent",
          data: { className: "Vector2", valueType: "a string", component: "component x" },
          line: 2,
          column: 23,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector2 constructor slot y",
      code: `import { Vector2 } from "three";
const v = new Vector2(0, "bad");`,
      output: null,
      errors: [
        {
          messageId: "nonNumericVectorComponent",
          data: { className: "Vector2", valueType: "a string", component: "component y" },
          line: 2,
          column: 26,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector3 constructor slot x",
      code: `import { Vector3 } from "three";
const v = new Vector3("bad", 0, 0);`,
      output: null,
      errors: [
        {
          messageId: "nonNumericVectorComponent",
          data: { className: "Vector3", valueType: "a string", component: "component x" },
          line: 2,
          column: 23,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector3 constructor slot y",
      code: `import { Vector3 } from "three";
const v = new Vector3(0, "bad", 0);`,
      output: null,
      errors: [
        {
          messageId: "nonNumericVectorComponent",
          data: { className: "Vector3", valueType: "a string", component: "component y" },
          line: 2,
          column: 26,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector3 constructor slot z",
      code: `import { Vector3 } from "three";
const v = new Vector3(0, 0, "bad");`,
      output: null,
      errors: [
        {
          messageId: "nonNumericVectorComponent",
          data: { className: "Vector3", valueType: "a string", component: "component z" },
          line: 2,
          column: 29,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector4 constructor slot x",
      code: `import { Vector4 } from "three";
const v = new Vector4("bad", 0, 0, 0);`,
      output: null,
      errors: [
        {
          messageId: "nonNumericVectorComponent",
          data: { className: "Vector4", valueType: "a string", component: "component x" },
          line: 2,
          column: 23,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector4 constructor slot y",
      code: `import { Vector4 } from "three";
const v = new Vector4(0, "bad", 0, 0);`,
      output: null,
      errors: [
        {
          messageId: "nonNumericVectorComponent",
          data: { className: "Vector4", valueType: "a string", component: "component y" },
          line: 2,
          column: 26,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector4 constructor slot z",
      code: `import { Vector4 } from "three";
const v = new Vector4(0, 0, "bad", 0);`,
      output: null,
      errors: [
        {
          messageId: "nonNumericVectorComponent",
          data: { className: "Vector4", valueType: "a string", component: "component z" },
          line: 2,
          column: 29,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector4 constructor slot w",
      code: `import { Vector4 } from "three";
const v = new Vector4(0, 0, 0, "bad");`,
      output: null,
      errors: [
        {
          messageId: "nonNumericVectorComponent",
          data: { className: "Vector4", valueType: "a string", component: "component w" },
          line: 2,
          column: 32,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector2 set last component",
      code: `import { Vector2 } from "three";
const v = new Vector2();
v.set(0, true);`,
      output: null,
      errors: [
        {
          messageId: "nonNumericVectorComponent",
          data: { className: "Vector2", valueType: "a boolean", component: "component y" },
          line: 3,
          column: 10,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector3 set last component",
      code: `import { Vector3 } from "three";
const v = new Vector3();
v.set(0, 0, true);`,
      output: null,
      errors: [
        {
          messageId: "nonNumericVectorComponent",
          data: { className: "Vector3", valueType: "a boolean", component: "component z" },
          line: 3,
          column: 13,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector4 set last component",
      code: `import { Vector4 } from "three";
const v = new Vector4();
v.set(0, 0, 0, true);`,
      output: null,
      errors: [
        {
          messageId: "nonNumericVectorComponent",
          data: { className: "Vector4", valueType: "a boolean", component: "component w" },
          line: 3,
          column: 16,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector3 setScalar with a string",
      code: `import { Vector3 } from "three";
const v = new Vector3();
v.setScalar("1");`,
      output: null,
      errors: [
        {
          messageId: "nonNumericVectorComponent",
          data: { className: "Vector3", valueType: "a string", component: "all components" },
          line: 3,
          column: 13,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector2 setX",
      code: `import { Vector2 } from "three";
const v = new Vector2();
v.setX(null);`,
      output: null,
      errors: [
        {
          messageId: "nonNumericVectorComponent",
          data: { className: "Vector2", valueType: "null", component: "component x" },
          line: 3,
          column: 8,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector2 setY",
      code: `import { Vector2 } from "three";
const v = new Vector2();
v.setY(null);`,
      output: null,
      errors: [
        {
          messageId: "nonNumericVectorComponent",
          data: { className: "Vector2", valueType: "null", component: "component y" },
          line: 3,
          column: 8,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector3 setZ",
      code: `import { Vector3 } from "three";
const v = new Vector3();
v.setZ(null);`,
      output: null,
      errors: [
        {
          messageId: "nonNumericVectorComponent",
          data: { className: "Vector3", valueType: "null", component: "component z" },
          line: 3,
          column: 8,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector4 setW",
      code: `import { Vector4 } from "three";
const v = new Vector4();
v.setW(null);`,
      output: null,
      errors: [
        {
          messageId: "nonNumericVectorComponent",
          data: { className: "Vector4", valueType: "null", component: "component w" },
          line: 3,
          column: 8,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector2 setComponent 0",
      code: `import { Vector2 } from "three";
const v = new Vector2();
v.setComponent(0, "bad");`,
      output: null,
      errors: [
        {
          messageId: "nonNumericVectorComponent",
          data: { className: "Vector2", valueType: "a string", component: "component x" },
          line: 3,
          column: 19,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector2 setComponent 1",
      code: `import { Vector2 } from "three";
const v = new Vector2();
v.setComponent(1, "bad");`,
      output: null,
      errors: [
        {
          messageId: "nonNumericVectorComponent",
          data: { className: "Vector2", valueType: "a string", component: "component y" },
          line: 3,
          column: 19,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector3 setComponent 0",
      code: `import { Vector3 } from "three";
const v = new Vector3();
v.setComponent(0, "bad");`,
      output: null,
      errors: [
        {
          messageId: "nonNumericVectorComponent",
          data: { className: "Vector3", valueType: "a string", component: "component x" },
          line: 3,
          column: 19,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector3 setComponent 1",
      code: `import { Vector3 } from "three";
const v = new Vector3();
v.setComponent(1, "bad");`,
      output: null,
      errors: [
        {
          messageId: "nonNumericVectorComponent",
          data: { className: "Vector3", valueType: "a string", component: "component y" },
          line: 3,
          column: 19,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector3 setComponent 2",
      code: `import { Vector3 } from "three";
const v = new Vector3();
v.setComponent(2, "bad");`,
      output: null,
      errors: [
        {
          messageId: "nonNumericVectorComponent",
          data: { className: "Vector3", valueType: "a string", component: "component z" },
          line: 3,
          column: 19,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector4 setComponent 0",
      code: `import { Vector4 } from "three";
const v = new Vector4();
v.setComponent(0, "bad");`,
      output: null,
      errors: [
        {
          messageId: "nonNumericVectorComponent",
          data: { className: "Vector4", valueType: "a string", component: "component x" },
          line: 3,
          column: 19,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector4 setComponent 1",
      code: `import { Vector4 } from "three";
const v = new Vector4();
v.setComponent(1, "bad");`,
      output: null,
      errors: [
        {
          messageId: "nonNumericVectorComponent",
          data: { className: "Vector4", valueType: "a string", component: "component y" },
          line: 3,
          column: 19,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector4 setComponent 2",
      code: `import { Vector4 } from "three";
const v = new Vector4();
v.setComponent(2, "bad");`,
      output: null,
      errors: [
        {
          messageId: "nonNumericVectorComponent",
          data: { className: "Vector4", valueType: "a string", component: "component z" },
          line: 3,
          column: 19,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector4 setComponent 3",
      code: `import { Vector4 } from "three";
const v = new Vector4();
v.setComponent(3, "bad");`,
      output: null,
      errors: [
        {
          messageId: "nonNumericVectorComponent",
          data: { className: "Vector4", valueType: "a string", component: "component w" },
          line: 3,
          column: 19,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector2 x write",
      code: `import { Vector2 } from "three";
const v = new Vector2();
v.x = "bad";`,
      output: null,
      errors: [
        {
          messageId: "nonNumericVectorComponent",
          data: { className: "Vector2", valueType: "a string", component: "component x" },
          line: 3,
          column: 7,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector2 y write",
      code: `import { Vector2 } from "three";
const v = new Vector2();
v.y = "bad";`,
      output: null,
      errors: [
        {
          messageId: "nonNumericVectorComponent",
          data: { className: "Vector2", valueType: "a string", component: "component y" },
          line: 3,
          column: 7,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector3 x write",
      code: `import { Vector3 } from "three";
const v = new Vector3();
v.x = "bad";`,
      output: null,
      errors: [
        {
          messageId: "nonNumericVectorComponent",
          data: { className: "Vector3", valueType: "a string", component: "component x" },
          line: 3,
          column: 7,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector3 y write",
      code: `import { Vector3 } from "three";
const v = new Vector3();
v.y = "bad";`,
      output: null,
      errors: [
        {
          messageId: "nonNumericVectorComponent",
          data: { className: "Vector3", valueType: "a string", component: "component y" },
          line: 3,
          column: 7,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector3 z write",
      code: `import { Vector3 } from "three";
const v = new Vector3();
v.z = "bad";`,
      output: null,
      errors: [
        {
          messageId: "nonNumericVectorComponent",
          data: { className: "Vector3", valueType: "a string", component: "component z" },
          line: 3,
          column: 7,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector4 x write",
      code: `import { Vector4 } from "three";
const v = new Vector4();
v.x = "bad";`,
      output: null,
      errors: [
        {
          messageId: "nonNumericVectorComponent",
          data: { className: "Vector4", valueType: "a string", component: "component x" },
          line: 3,
          column: 7,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector4 y write",
      code: `import { Vector4 } from "three";
const v = new Vector4();
v.y = "bad";`,
      output: null,
      errors: [
        {
          messageId: "nonNumericVectorComponent",
          data: { className: "Vector4", valueType: "a string", component: "component y" },
          line: 3,
          column: 7,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector4 z write",
      code: `import { Vector4 } from "three";
const v = new Vector4();
v.z = "bad";`,
      output: null,
      errors: [
        {
          messageId: "nonNumericVectorComponent",
          data: { className: "Vector4", valueType: "a string", component: "component z" },
          line: 3,
          column: 7,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector4 w write",
      code: `import { Vector4 } from "three";
const v = new Vector4();
v.w = "bad";`,
      output: null,
      errors: [
        {
          messageId: "nonNumericVectorComponent",
          data: { className: "Vector4", valueType: "a string", component: "component w" },
          line: 3,
          column: 7,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector2 width alias write",
      code: `import { Vector2 } from "three";
const v = new Vector2();
v.width = "bad";`,
      output: null,
      errors: [
        {
          messageId: "nonNumericVectorComponent",
          data: { className: "Vector2", valueType: "a string", component: "component x (width)" },
          line: 3,
          column: 11,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector2 height alias write",
      code: `import { Vector2 } from "three";
const v = new Vector2();
v.height = "bad";`,
      output: null,
      errors: [
        {
          messageId: "nonNumericVectorComponent",
          data: { className: "Vector2", valueType: "a string", component: "component y (height)" },
          line: 3,
          column: 12,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector4 width alias write",
      code: `import { Vector4 } from "three";
const v = new Vector4();
v.width = "bad";`,
      output: null,
      errors: [
        {
          messageId: "nonNumericVectorComponent",
          data: { className: "Vector4", valueType: "a string", component: "component z (width)" },
          line: 3,
          column: 11,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector4 height alias write",
      code: `import { Vector4 } from "three";
const v = new Vector4();
v.height = "bad";`,
      output: null,
      errors: [
        {
          messageId: "nonNumericVectorComponent",
          data: { className: "Vector4", valueType: "a string", component: "component w (height)" },
          line: 3,
          column: 12,
          suggestions: [],
        },
      ],
    },
    {
      name: "a string from a string literal",
      code: `import { Vector3 } from "three";
const v = new Vector3();
v.x = "text";`,
      output: null,
      errors: [
        {
          messageId: "nonNumericVectorComponent",
          data: { className: "Vector3", valueType: "a string", component: "component x" },
          line: 3,
          column: 7,
          suggestions: [],
        },
      ],
    },
    {
      name: "a string from a template literal",
      code: `import { Vector3 } from "three";
const v = new Vector3();
v.x = \`text\`;`,
      output: null,
      errors: [
        {
          messageId: "nonNumericVectorComponent",
          data: { className: "Vector3", valueType: "a string", component: "component x" },
          line: 3,
          column: 7,
          suggestions: [],
        },
      ],
    },
    {
      name: "a string from a typeof expression",
      code: `import { Vector3 } from "three";
const v = new Vector3();
v.x = typeof other;`,
      output: null,
      errors: [
        {
          messageId: "nonNumericVectorComponent",
          data: { className: "Vector3", valueType: "a string", component: "component x" },
          line: 3,
          column: 7,
          suggestions: [],
        },
      ],
    },
    {
      name: "a boolean from a boolean literal",
      code: `import { Vector3 } from "three";
const v = new Vector3();
v.x = true;`,
      output: null,
      errors: [
        {
          messageId: "nonNumericVectorComponent",
          data: { className: "Vector3", valueType: "a boolean", component: "component x" },
          line: 3,
          column: 7,
          suggestions: [],
        },
      ],
    },
    {
      name: "a boolean from a logical negation",
      code: `import { Vector3 } from "three";
const v = new Vector3();
v.x = !flag;`,
      output: null,
      errors: [
        {
          messageId: "nonNumericVectorComponent",
          data: { className: "Vector3", valueType: "a boolean", component: "component x" },
          line: 3,
          column: 7,
          suggestions: [],
        },
      ],
    },
    {
      name: "a boolean from a delete expression",
      code: `import { Vector3 } from "three";
const v = new Vector3();
v.x = delete host.field;`,
      output: null,
      errors: [
        {
          messageId: "nonNumericVectorComponent",
          data: { className: "Vector3", valueType: "a boolean", component: "component x" },
          line: 3,
          column: 7,
          suggestions: [],
        },
      ],
    },
    {
      name: "null from the null literal",
      code: `import { Vector3 } from "three";
const v = new Vector3();
v.x = null;`,
      output: null,
      errors: [
        {
          messageId: "nonNumericVectorComponent",
          data: { className: "Vector3", valueType: "null", component: "component x" },
          line: 3,
          column: 7,
          suggestions: [],
        },
      ],
    },
    {
      name: "a bigint from a bigint literal",
      code: `import { Vector3 } from "three";
const v = new Vector3();
v.x = 1n;`,
      output: null,
      errors: [
        {
          messageId: "nonNumericVectorComponent",
          data: { className: "Vector3", valueType: "a bigint", component: "component x" },
          line: 3,
          column: 7,
          suggestions: [],
        },
      ],
    },
    {
      name: "a bigint from a negated bigint",
      code: `import { Vector3 } from "three";
const v = new Vector3();
v.x = -1n;`,
      output: null,
      errors: [
        {
          messageId: "nonNumericVectorComponent",
          data: { className: "Vector3", valueType: "a bigint", component: "component x" },
          line: 3,
          column: 7,
          suggestions: [],
        },
      ],
    },
    {
      name: "a bigint from a bitwise-negated bigint",
      code: `import { Vector3 } from "three";
const v = new Vector3();
v.x = ~1n;`,
      output: null,
      errors: [
        {
          messageId: "nonNumericVectorComponent",
          data: { className: "Vector3", valueType: "a bigint", component: "component x" },
          line: 3,
          column: 7,
          suggestions: [],
        },
      ],
    },
    {
      name: "a regular expression from a regexp literal",
      code: `import { Vector3 } from "three";
const v = new Vector3();
v.x = /re/;`,
      output: null,
      errors: [
        {
          messageId: "nonNumericVectorComponent",
          data: {
            className: "Vector3",
            valueType: "a regular expression",
            component: "component x",
          },
          line: 3,
          column: 7,
          suggestions: [],
        },
      ],
    },
    {
      name: "an array from an array literal",
      code: `import { Vector3 } from "three";
const v = new Vector3();
v.x = [1];`,
      output: null,
      errors: [
        {
          messageId: "nonNumericVectorComponent",
          data: { className: "Vector3", valueType: "an array", component: "component x" },
          line: 3,
          column: 7,
          suggestions: [],
        },
      ],
    },
    {
      name: "an object from an object literal",
      code: `import { Vector3 } from "three";
const v = new Vector3();
v.x = ({});`,
      output: null,
      errors: [
        {
          messageId: "nonNumericVectorComponent",
          data: { className: "Vector3", valueType: "an object", component: "component x" },
          line: 3,
          column: 8,
          suggestions: [],
        },
      ],
    },
    {
      name: "an object from a new expression",
      code: `import { Vector3 } from "three";
const v = new Vector3();
v.x = new Date();`,
      output: null,
      errors: [
        {
          messageId: "nonNumericVectorComponent",
          data: { className: "Vector3", valueType: "an object", component: "component x" },
          line: 3,
          column: 7,
          suggestions: [],
        },
      ],
    },
    {
      name: "a function from an arrow function",
      code: `import { Vector3 } from "three";
const v = new Vector3();
v.x = () => 1;`,
      output: null,
      errors: [
        {
          messageId: "nonNumericVectorComponent",
          data: { className: "Vector3", valueType: "a function", component: "component x" },
          line: 3,
          column: 7,
          suggestions: [],
        },
      ],
    },
    {
      name: "a function from a function expression",
      code: `import { Vector3 } from "three";
const v = new Vector3();
v.x = (function () {});`,
      output: null,
      errors: [
        {
          messageId: "nonNumericVectorComponent",
          data: { className: "Vector3", valueType: "a function", component: "component x" },
          line: 3,
          column: 8,
          suggestions: [],
        },
      ],
    },
    {
      name: "a class from a class expression",
      code: `import { Vector3 } from "three";
const v = new Vector3();
v.x = (class {});`,
      output: null,
      errors: [
        {
          messageId: "nonNumericVectorComponent",
          data: { className: "Vector3", valueType: "a class", component: "component x" },
          line: 3,
          column: 8,
          suggestions: [],
        },
      ],
    },
    {
      name: "undefined from unshadowed undefined",
      code: `import { Vector3 } from "three";
const v = new Vector3();
v.x = undefined;`,
      output: null,
      errors: [
        {
          messageId: "nonNumericVectorComponent",
          data: { className: "Vector3", valueType: "undefined", component: "component x" },
          line: 3,
          column: 7,
          suggestions: [],
        },
      ],
    },
    {
      name: "undefined from a void expression",
      code: `import { Vector3 } from "three";
const v = new Vector3();
v.x = void 0;`,
      output: null,
      errors: [
        {
          messageId: "nonNumericVectorComponent",
          data: { className: "Vector3", valueType: "undefined", component: "component x" },
          line: 3,
          column: 7,
          suggestions: [],
        },
      ],
    },
    {
      name: "namespace-imported vector",
      code: `import * as THREE from "three";
const v = new THREE.Vector3();
v.y = "bad";`,
      output: null,
      errors: [
        {
          messageId: "nonNumericVectorComponent",
          data: { className: "Vector3", valueType: "a string", component: "component y" },
          line: 3,
          column: 7,
          suggestions: [],
        },
      ],
    },
    {
      name: "vector reached through one immutable alias hop",
      code: `import { Vector3 } from "three";
const created = new Vector3();
const v = created;
v.z = "bad";`,
      output: null,
      errors: [
        {
          messageId: "nonNumericVectorComponent",
          data: { className: "Vector3", valueType: "a string", component: "component z" },
          line: 4,
          column: 7,
          suggestions: [],
        },
      ],
    },
    {
      name: "computed component name resolved from a string literal",
      code: `import { Vector3 } from "three";
const v = new Vector3();
v["x"] = "bad";`,
      output: null,
      errors: [
        {
          messageId: "nonNumericVectorComponent",
          data: { className: "Vector3", valueType: "a string", component: "component x" },
          line: 3,
          column: 10,
          suggestions: [],
        },
      ],
    },
    {
      name: "webgpu core module vector",
      code: `import { Vector4 } from "three/webgpu";
const v = new Vector4();
v.height = "bad";`,
      output: null,
      errors: [
        {
          messageId: "nonNumericVectorComponent",
          data: {
            className: "Vector4",
            valueType: "a string",
            component: "component w (height)",
          },
          line: 3,
          column: 12,
          suggestions: [],
        },
      ],
    },
    {
      name: "TypeScript assertion wrapper is transparent",
      code: `import { Vector3 } from "three";
const v = new Vector3();
v.x = "bad" as unknown as number;`,
      output: null,
      languageOptions: tsLanguageOptions,
      errors: [
        {
          messageId: "nonNumericVectorComponent",
          data: { className: "Vector3", valueType: "a string", component: "component x" },
          line: 3,
          column: 7,
          suggestions: [],
        },
      ],
    },
    {
      name: "every constructor slot reports independently",
      code: `import { Vector2 } from "three";
const v = new Vector2("x", true);`,
      output: null,
      errors: [
        {
          messageId: "nonNumericVectorComponent",
          data: { className: "Vector2", valueType: "a string", component: "component x" },
          line: 2,
          column: 23,
          suggestions: [],
        },
        {
          messageId: "nonNumericVectorComponent",
          data: { className: "Vector2", valueType: "a boolean", component: "component y" },
          line: 2,
          column: 28,
          suggestions: [],
        },
      ],
    },
  ],
});
