import rule from "../../src/rules/no-deep-reactive-three-object.js";
import { createRuleTester, tsLanguageOptions } from "../helpers/rule-tester.js";

const ruleTester = createRuleTester();

ruleTester.run("no-deep-reactive-three-object", rule, {
  valid: [
    {
      name: "shallowRef around a construction",
      code: `import { shallowRef } from "vue";
import { Mesh } from "three";
const mesh = shallowRef(new Mesh());`,
    },
    {
      name: "shallowReactive around a construction",
      code: `import { shallowReactive } from "vue";
import { Mesh } from "three";
const mesh = shallowReactive(new Mesh());`,
    },
    {
      name: "markRaw wrapper",
      code: `import { markRaw, ref } from "vue";
import { Mesh } from "three";
const mesh = ref(markRaw(new Mesh()));`,
    },
    {
      name: "identifier argument",
      code: `import { ref } from "vue";
import { Mesh } from "three";
const created = new Mesh();
const mesh = ref(created);`,
    },
    {
      name: "nested object graph",
      code: `import { ref } from "vue";
import { Mesh } from "three";
const state = ref({ mesh: new Mesh() });`,
    },
    {
      name: "loader result",
      code: `import { ref } from "vue";
import { loadMesh } from "./loader.js";
const mesh = ref(loadMesh());`,
    },
    {
      name: "non-Three construction",
      code: `import { ref } from "vue";
class Pose {}
const pose = ref(new Pose());`,
    },
    {
      name: "ref from an unrelated module",
      code: `import { ref } from "custom-reactivity";
import { Mesh } from "three";
const mesh = ref(new Mesh());`,
    },
    {
      name: "type-only vue import",
      code: `import type { Ref } from "vue";
import { Mesh } from "three";
declare const mesh: Ref<Mesh>;`,
      languageOptions: tsLanguageOptions,
    },
    {
      name: "ref with no argument",
      code: `import { ref } from "vue";
const empty = ref();`,
    },
    {
      name: "computed is not a deep reactivity factory",
      code: `import { computed } from "vue";
import { Mesh } from "three";
const mesh = computed(() => new Mesh());`,
    },
  ],
  invalid: [
    {
      name: "ref of a construction without an existing shallowRef binding",
      code: `import { ref } from "vue";
import { Mesh } from "three";
const mesh = ref(new Mesh());`,
      output: null,
      errors: [
        {
          messageId: "preferShallowRefForThreeInstance",
          data: { constructor: "Mesh" },
          line: 3,
          column: 14,
          suggestions: [],
        },
      ],
    },
    {
      name: "ref of a construction with an existing shallowRef binding",
      code: `import { ref, shallowRef } from "vue";
import { Mesh } from "three";
const raw = shallowRef(null);
const mesh = ref(new Mesh());`,
      output: null,
      errors: [
        {
          messageId: "preferShallowRefForThreeInstance",
          data: { constructor: "Mesh" },
          line: 4,
          column: 14,
          suggestions: [
            {
              messageId: "useExistingShallowRef",
              output: `import { ref, shallowRef } from "vue";
import { Mesh } from "three";
const raw = shallowRef(null);
const mesh = shallowRef(new Mesh());`,
            },
          ],
        },
      ],
    },
    {
      name: "renamed shallowRef binding is reused verbatim",
      code: `import { ref, shallowRef as rawRef } from "vue";
import { Scene } from "three";
const scene = ref(new Scene());`,
      output: null,
      errors: [
        {
          messageId: "preferShallowRefForThreeInstance",
          data: { constructor: "Scene" },
          line: 3,
          column: 15,
          suggestions: [
            {
              messageId: "useExistingShallowRef",
              output: `import { ref, shallowRef as rawRef } from "vue";
import { Scene } from "three";
const scene = rawRef(new Scene());`,
            },
          ],
        },
      ],
    },
    {
      name: "vue namespace import suggests the same namespace",
      code: `import * as Vue from "vue";
import { Mesh } from "three";
const mesh = Vue.ref(new Mesh());`,
      output: null,
      errors: [
        {
          messageId: "preferShallowRefForThreeInstance",
          data: { constructor: "Mesh" },
          line: 3,
          column: 14,
          suggestions: [
            {
              messageId: "useExistingShallowRef",
              output: `import * as Vue from "vue";
import { Mesh } from "three";
const mesh = Vue.shallowRef(new Mesh());`,
            },
          ],
        },
      ],
    },
    {
      name: "reactive of a construction never suggests a rewrite",
      code: `import { reactive } from "vue";
import { Mesh } from "three";
const mesh = reactive(new Mesh());`,
      output: null,
      errors: [
        {
          messageId: "avoidReactiveThreeInstance",
          data: { constructor: "Mesh" },
          line: 3,
          column: 14,
          suggestions: [],
        },
      ],
    },
    {
      name: "reactive with an existing shallowRef binding still has no suggestion",
      code: `import { reactive, shallowRef } from "vue";
import { Mesh } from "three";
const raw = shallowRef(null);
const mesh = reactive(new Mesh());`,
      output: null,
      errors: [
        {
          messageId: "avoidReactiveThreeInstance",
          data: { constructor: "Mesh" },
          line: 4,
          column: 14,
          suggestions: [],
        },
      ],
    },
    {
      name: "namespace-imported Three constructor",
      code: `import { ref } from "vue";
import * as THREE from "three";
const mesh = ref(new THREE.Mesh());`,
      output: null,
      errors: [
        {
          messageId: "preferShallowRefForThreeInstance",
          data: { constructor: "Mesh" },
          line: 3,
          column: 14,
          suggestions: [],
        },
      ],
    },
    {
      name: "three/webgpu construction",
      code: `import { ref } from "vue";
import { WebGPURenderer } from "three/webgpu";
const renderer = ref(new WebGPURenderer());`,
      output: null,
      errors: [
        {
          messageId: "preferShallowRefForThreeInstance",
          data: { constructor: "WebGPURenderer" },
          line: 3,
          column: 18,
          suggestions: [],
        },
      ],
    },
    {
      name: "TypeScript as assertion is transparent",
      code: `import { ref } from "vue";
import { Mesh } from "three";
const mesh = ref(new Mesh() as Mesh);`,
      output: null,
      languageOptions: tsLanguageOptions,
      errors: [
        {
          messageId: "preferShallowRefForThreeInstance",
          data: { constructor: "Mesh" },
          line: 3,
          column: 14,
          suggestions: [],
        },
      ],
    },
  ],
});
