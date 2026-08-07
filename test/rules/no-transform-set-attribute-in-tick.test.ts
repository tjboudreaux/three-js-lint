import rule from "../../src/rules/no-transform-set-attribute-in-tick.js";
import { createRuleTester, jsLanguageOptions } from "../helpers/rule-tester.js";

const ruleTester = createRuleTester();

/** Language options declaring A-Frame's global registry, as A-Frame projects do. */
const aframeLanguageOptions = {
  ...jsLanguageOptions,
  globals: { AFRAME: "readonly" as const },
};

ruleTester.run("no-transform-set-attribute-in-tick", rule, {
  valid: [
    {
      name: "direct object3D update",
      code: `AFRAME.registerComponent("mover", {
  tick() {
    this.el.object3D.position.set(0, 1, 0);
  },
});`,
      languageOptions: aframeLanguageOptions,
    },
    {
      name: "setAttribute in init rather than tick",
      code: `AFRAME.registerComponent("mover", {
  init() {
    this.el.setAttribute("position", { x: 0, y: 1, z: 0 });
  },
});`,
      languageOptions: aframeLanguageOptions,
    },
    {
      name: "geometry attribute",
      code: `AFRAME.registerComponent("mover", {
  tick() {
    this.el.setAttribute("geometry", { primitive: "box" });
  },
});`,
      languageOptions: aframeLanguageOptions,
    },
    {
      name: "material attribute",
      code: `AFRAME.registerComponent("mover", {
  tick() {
    this.el.setAttribute("material", { color: "red" });
  },
});`,
      languageOptions: aframeLanguageOptions,
    },
    {
      name: "custom attribute",
      code: `AFRAME.registerComponent("mover", {
  tick() {
    this.el.setAttribute("data-state", "moving");
  },
});`,
      languageOptions: aframeLanguageOptions,
    },
    {
      name: "dynamic attribute name",
      code: `AFRAME.registerComponent("mover", {
  tick() {
    this.el.setAttribute(attributeName, value);
  },
});`,
      languageOptions: aframeLanguageOptions,
    },
    {
      name: "element alias receiver",
      code: `AFRAME.registerComponent("mover", {
  tick() {
    const el = this.el;
    el.setAttribute("position", { x: 0, y: 1, z: 0 });
  },
});`,
      languageOptions: aframeLanguageOptions,
    },
    {
      name: "another entity's setAttribute",
      code: `AFRAME.registerComponent("mover", {
  tick() {
    this.target.setAttribute("position", { x: 0, y: 1, z: 0 });
  },
});`,
      languageOptions: aframeLanguageOptions,
    },
    {
      name: "nested callback inside tick",
      code: `AFRAME.registerComponent("mover", {
  tick() {
    queue(() => {
      this.el.setAttribute("position", { x: 0, y: 1, z: 0 });
    });
  },
});`,
      languageOptions: aframeLanguageOptions,
    },
    {
      name: "registerSystem is not a component",
      code: `AFRAME.registerSystem("mover", {
  tick() {
    this.el.setAttribute("position", { x: 0, y: 1, z: 0 });
  },
});`,
      languageOptions: aframeLanguageOptions,
    },
    {
      name: "unconfigured AFRAME global",
      code: `AFRAME.registerComponent("mover", {
  tick() {
    this.el.setAttribute("position", { x: 0, y: 1, z: 0 });
  },
});`,
    },
    {
      name: "locally shadowed AFRAME",
      code: `function register(AFRAME) {
  AFRAME.registerComponent("mover", {
    tick() {
      this.el.setAttribute("position", { x: 0, y: 1, z: 0 });
    },
  });
}`,
      languageOptions: aframeLanguageOptions,
    },
    {
      name: "component definition passed through a variable",
      code: `const definition = {
  tick() {
    this.el.setAttribute("position", { x: 0, y: 1, z: 0 });
  },
};
AFRAME.registerComponent("mover", definition);`,
      languageOptions: aframeLanguageOptions,
    },
  ],
  invalid: [
    {
      name: "position setAttribute in tick",
      code: `AFRAME.registerComponent("mover", {
  tick() {
    this.el.setAttribute("position", { x: 0, y: 1, z: 0 });
  },
});`,
      output: null,
      languageOptions: aframeLanguageOptions,
      errors: [
        {
          messageId: "transformSetAttributeInTick",
          data: { attribute: "position" },
          line: 3,
          column: 5,
          suggestions: [],
        },
      ],
    },
    {
      name: "rotation setAttribute in tick",
      code: `AFRAME.registerComponent("mover", {
  tick() {
    this.el.setAttribute("rotation", { x: 0, y: 90, z: 0 });
  },
});`,
      output: null,
      languageOptions: aframeLanguageOptions,
      errors: [
        {
          messageId: "transformSetAttributeInTick",
          data: { attribute: "rotation" },
          line: 3,
          column: 5,
          suggestions: [],
        },
      ],
    },
    {
      name: "scale setAttribute in tock",
      code: `AFRAME.registerComponent("mover", {
  tock: function () {
    this.el.setAttribute("scale", { x: 2, y: 2, z: 2 });
  },
});`,
      output: null,
      languageOptions: aframeLanguageOptions,
      errors: [
        {
          messageId: "transformSetAttributeInTick",
          data: { attribute: "scale" },
          line: 3,
          column: 5,
          suggestions: [],
        },
      ],
    },
    {
      name: "visible setAttribute in tick",
      code: `AFRAME.registerComponent("mover", {
  tick() {
    this.el.setAttribute("visible", false);
  },
});`,
      output: null,
      languageOptions: aframeLanguageOptions,
      errors: [
        {
          messageId: "visibilitySetAttributeInTick",
          line: 3,
          column: 5,
          suggestions: [],
        },
      ],
    },
    {
      name: "aframe namespace import registry",
      code: `import * as aframe from "aframe";
aframe.registerComponent("mover", {
  tick() {
    this.el.setAttribute("position", { x: 0, y: 1, z: 0 });
  },
});`,
      output: null,
      errors: [
        {
          messageId: "transformSetAttributeInTick",
          data: { attribute: "position" },
          line: 4,
          column: 5,
          suggestions: [],
        },
      ],
    },
    {
      name: "template literal attribute name",
      code: `AFRAME.registerComponent("mover", {
  tick() {
    this.el.setAttribute(\`position\`, { x: 0, y: 1, z: 0 });
  },
});`,
      output: null,
      languageOptions: aframeLanguageOptions,
      errors: [
        {
          messageId: "transformSetAttributeInTick",
          data: { attribute: "position" },
          line: 3,
          column: 5,
          suggestions: [],
        },
      ],
    },
  ],
});
