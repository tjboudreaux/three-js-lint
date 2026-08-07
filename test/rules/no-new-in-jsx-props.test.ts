import rule from "../../src/rules/no-new-in-jsx-props.js";
import {
  createRuleTester,
  jsxLanguageOptions,
  tsxLanguageOptions,
} from "../helpers/rule-tester.js";

const ruleTester = createRuleTester();

ruleTester.run("no-new-in-jsx-props", rule, {
  valid: [
    {
      name: "array literal prop",
      code: `import { Canvas } from "@react-three/fiber";
const view = <mesh position={[0, 1, 0]} />;`,
      languageOptions: jsxLanguageOptions,
    },
    {
      name: "stable identifier prop",
      code: `import { Canvas } from "@react-three/fiber";
import { Vector3 } from "three";
const offset = new Vector3(0, 1, 0);
const view = <mesh position={offset} />;`,
      languageOptions: jsxLanguageOptions,
    },
    {
      name: "no React Three Fiber import in the file",
      code: `import { Vector3 } from "three";
const view = <mesh position={new Vector3(0, 1, 0)} />;`,
      languageOptions: jsxLanguageOptions,
    },
    {
      name: "custom component tag",
      code: `import { Canvas } from "@react-three/fiber";
import { Vector3 } from "three";
const view = <Marker position={new Vector3(0, 1, 0)} />;`,
      languageOptions: jsxLanguageOptions,
    },
    {
      name: "member expression tag",
      code: `import { Canvas } from "@react-three/fiber";
import { Vector3 } from "three";
const view = <Scene.Mesh position={new Vector3(0, 1, 0)} />;`,
      languageOptions: jsxLanguageOptions,
    },
    {
      name: "DOM tag",
      code: `import { Canvas } from "@react-three/fiber";
import { Vector3 } from "three";
const view = <div position={new Vector3(0, 1, 0)} />;`,
      languageOptions: jsxLanguageOptions,
    },
    {
      name: "primitive host owns its own props",
      code: `import { Canvas } from "@react-three/fiber";
import { Vector3 } from "three";
const view = <primitive position={new Vector3(0, 1, 0)} />;`,
      languageOptions: jsxLanguageOptions,
    },
    {
      name: "args prop",
      code: `import { Canvas } from "@react-three/fiber";
import { Vector3 } from "three";
const view = <mesh args={[new Vector3(0, 1, 0)]} />;`,
      languageOptions: jsxLanguageOptions,
    },
    {
      name: "material prop",
      code: `import { Canvas } from "@react-three/fiber";
import { MeshBasicMaterial } from "three";
const view = <mesh material={new MeshBasicMaterial()} />;`,
      languageOptions: jsxLanguageOptions,
    },
    {
      name: "spread attribute",
      code: `import { Canvas } from "@react-three/fiber";
const view = <mesh {...props} />;`,
      languageOptions: jsxLanguageOptions,
    },
    {
      name: "nested conditional expression",
      code: `import { Canvas } from "@react-three/fiber";
import { Vector3 } from "three";
const view = <mesh position={flag ? base : new Vector3(0, 1, 0)} />;`,
      languageOptions: jsxLanguageOptions,
    },
    {
      name: "class mismatched with the prop",
      code: `import { Canvas } from "@react-three/fiber";
import { Euler } from "three";
const view = <mesh position={new Euler(0, 1, 0)} />;`,
      languageOptions: jsxLanguageOptions,
    },
    {
      name: "string literal prop",
      code: `import { Canvas } from "@react-three/fiber";
const view = <mesh name="hero" />;`,
      languageOptions: jsxLanguageOptions,
    },
    {
      name: "Vector3 from an unrelated module",
      code: `import { Canvas } from "@react-three/fiber";
import { Vector3 } from "custom-math";
const view = <mesh position={new Vector3(0, 1, 0)} />;`,
      languageOptions: jsxLanguageOptions,
    },
    {
      name: "type-only R3F import does not enable the rule",
      code: `import type { MeshProps } from "@react-three/fiber";
import { Vector3 } from "three";
declare const props: MeshProps;
const view = <mesh position={new Vector3(0, 1, 0)} />;`,
      languageOptions: tsxLanguageOptions,
    },
  ],
  invalid: [
    {
      name: "Vector3 in a position prop",
      code: `import { Canvas } from "@react-three/fiber";
import { Vector3 } from "three";
const view = <mesh position={new Vector3(0, 1, 0)} />;`,
      output: null,
      languageOptions: jsxLanguageOptions,
      errors: [
        {
          messageId: "newThreeObjectInJsxProp",
          data: { constructor: "Vector3", property: "position" },
          line: 3,
          column: 20,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector3 in a scale prop",
      code: `import { Canvas } from "@react-three/fiber";
import { Vector3 } from "three";
const view = <group scale={new Vector3(2, 2, 2)} />;`,
      output: null,
      languageOptions: jsxLanguageOptions,
      errors: [
        {
          messageId: "newThreeObjectInJsxProp",
          data: { constructor: "Vector3", property: "scale" },
          line: 3,
          column: 21,
          suggestions: [],
        },
      ],
    },
    {
      name: "Vector3 in an up prop",
      code: `import { Canvas } from "@react-three/fiber";
import { Vector3 } from "three";
const view = <perspectiveCamera up={new Vector3(0, 0, 1)} />;`,
      output: null,
      languageOptions: jsxLanguageOptions,
      errors: [
        {
          messageId: "newThreeObjectInJsxProp",
          data: { constructor: "Vector3", property: "up" },
          line: 3,
          column: 33,
          suggestions: [],
        },
      ],
    },
    {
      name: "Euler in a rotation prop",
      code: `import { Canvas } from "@react-three/fiber";
import { Euler } from "three";
const view = <mesh rotation={new Euler(0, 1, 0)} />;`,
      output: null,
      languageOptions: jsxLanguageOptions,
      errors: [
        {
          messageId: "newThreeObjectInJsxProp",
          data: { constructor: "Euler", property: "rotation" },
          line: 3,
          column: 20,
          suggestions: [],
        },
      ],
    },
    {
      name: "Quaternion in a quaternion prop",
      code: `import { Canvas } from "@react-three/fiber";
import { Quaternion } from "three";
const view = <instancedMesh quaternion={new Quaternion(0, 0, 0, 1)} />;`,
      output: null,
      languageOptions: jsxLanguageOptions,
      errors: [
        {
          messageId: "newThreeObjectInJsxProp",
          data: { constructor: "Quaternion", property: "quaternion" },
          line: 3,
          column: 29,
          suggestions: [],
        },
      ],
    },
    {
      name: "namespace-imported constructor",
      code: `import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
const view = <points position={new THREE.Vector3(0, 1, 0)} />;`,
      output: null,
      languageOptions: jsxLanguageOptions,
      errors: [
        {
          messageId: "newThreeObjectInJsxProp",
          data: { constructor: "Vector3", property: "position" },
          line: 3,
          column: 22,
          suggestions: [],
        },
      ],
    },
    {
      name: "TSX host with a typescript-eslint parser",
      code: `import { Canvas } from "@react-three/fiber";
import { Vector3 } from "three";
export const View = (): JSX.Element => <lineSegments position={new Vector3(0, 1, 0)} />;`,
      output: null,
      languageOptions: tsxLanguageOptions,
      errors: [
        {
          messageId: "newThreeObjectInJsxProp",
          data: { constructor: "Vector3", property: "position" },
          line: 3,
          column: 54,
          suggestions: [],
        },
      ],
    },
  ],
});
