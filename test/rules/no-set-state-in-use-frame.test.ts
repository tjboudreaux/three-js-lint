import rule from "../../src/rules/no-set-state-in-use-frame.js";
import { createRuleTester, tsxLanguageOptions } from "../helpers/rule-tester.js";

const ruleTester = createRuleTester();

ruleTester.run("no-set-state-in-use-frame", rule, {
  valid: [
    {
      name: "ref mutation instead of state",
      code: `import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
function Spinner() {
  const ref = useRef(0);
  useFrame(() => {
    ref.current += 1;
  });
}`,
    },
    {
      name: "setter called outside the callback",
      code: `import { useFrame } from "@react-three/fiber";
import { useState } from "react";
function Spinner() {
  const [count, setCount] = useState(0);
  setCount(1);
  useFrame(() => {});
}`,
    },
    {
      name: "custom hook updater",
      code: `import { useFrame } from "@react-three/fiber";
import { useCounter } from "./counter.js";
function Spinner() {
  const [count, setCount] = useCounter(0);
  useFrame(() => {
    setCount(1);
  });
}`,
    },
    {
      name: "updater from props",
      code: `import { useFrame } from "@react-three/fiber";
function Spinner({ setCount }) {
  useFrame(() => {
    setCount(1);
  });
}`,
    },
    {
      name: "external store setter",
      code: `import { useFrame } from "@react-three/fiber";
import { useStore } from "./store.js";
function Spinner() {
  const store = useStore();
  useFrame(() => {
    store.setCount(1);
  });
}`,
    },
    {
      name: "class setState",
      code: `import { useFrame } from "@react-three/fiber";
class Spinner {
  render() {
    useFrame(() => {
      this.setState({ count: 1 });
    });
  }
}`,
    },
    {
      name: "setter passed but not called",
      code: `import { useFrame } from "@react-three/fiber";
import { useState } from "react";
function Spinner() {
  const [count, setCount] = useState(0);
  useFrame(() => {
    schedule(setCount);
  });
}`,
    },
    {
      name: "setter called from a transitive helper",
      code: `import { useFrame } from "@react-three/fiber";
import { useState } from "react";
function Spinner() {
  const [count, setCount] = useState(0);
  const bump = () => setCount(1);
  useFrame(() => {
    bump();
  });
}`,
    },
    {
      name: "nested callback inside useFrame",
      code: `import { useFrame } from "@react-three/fiber";
import { useState } from "react";
function Spinner() {
  const [count, setCount] = useState(0);
  useFrame(() => {
    queue(() => {
      setCount(1);
    });
  });
}`,
    },
    {
      name: "locally shadowed useFrame",
      code: `import { useState } from "react";
function Spinner(useFrame) {
  const [count, setCount] = useState(0);
  useFrame(() => {
    setCount(1);
  });
}`,
    },
    {
      name: "useFrame from an unrelated module",
      code: `import { useFrame } from "custom-loop";
import { useState } from "react";
function Spinner() {
  const [count, setCount] = useState(0);
  useFrame(() => {
    setCount(1);
  });
}`,
    },
    {
      name: "first tuple element is the value, not an updater",
      code: `import { useFrame } from "@react-three/fiber";
import { useState } from "react";
function Spinner() {
  const [update, setUpdate] = useState(() => noop);
  useFrame(() => {
    update();
  });
}`,
    },
    {
      name: "useState from an unrelated module",
      code: `import { useFrame } from "@react-three/fiber";
import { useState } from "preact/hooks";
function Spinner() {
  const [count, setCount] = useState(0);
  useFrame(() => {
    setCount(1);
  });
}`,
    },
  ],
  invalid: [
    {
      name: "useState setter in useFrame",
      code: `import { useFrame } from "@react-three/fiber";
import { useState } from "react";
function Spinner() {
  const [count, setCount] = useState(0);
  useFrame(() => {
    setCount(count + 1);
  });
}`,
      output: null,
      errors: [
        {
          messageId: "stateSetterInUseFrame",
          data: { name: "setCount" },
          line: 6,
          column: 5,
          suggestions: [],
        },
      ],
    },
    {
      name: "useReducer dispatch in useFrame",
      code: `import { useFrame } from "@react-three/fiber";
import { useReducer } from "react";
function Spinner() {
  const [state, dispatch] = useReducer(reducer, initial);
  useFrame(() => {
    dispatch({ type: "tick" });
  });
}`,
      output: null,
      errors: [
        {
          messageId: "reducerDispatchInUseFrame",
          data: { name: "dispatch" },
          line: 6,
          column: 5,
          suggestions: [],
        },
      ],
    },
    {
      name: "hole in the tuple pattern keeps the setter at index one",
      code: `import { useFrame } from "@react-three/fiber";
import { useState } from "react";
function Spinner() {
  const [, setCount] = useState(0);
  useFrame(() => {
    setCount(1);
  });
}`,
      output: null,
      errors: [
        {
          messageId: "stateSetterInUseFrame",
          data: { name: "setCount" },
          line: 6,
          column: 5,
          suggestions: [],
        },
      ],
    },
    {
      name: "React namespace import",
      code: `import { useFrame } from "@react-three/fiber";
import * as React from "react";
function Spinner() {
  const [count, setCount] = React.useState(0);
  useFrame(() => {
    setCount(1);
  });
}`,
      output: null,
      errors: [
        {
          messageId: "stateSetterInUseFrame",
          data: { name: "setCount" },
          line: 6,
          column: 5,
          suggestions: [],
        },
      ],
    },
    {
      name: "renamed useFrame import",
      code: `import { useFrame as onFrame } from "@react-three/fiber";
import { useState } from "react";
function Spinner() {
  const [count, setCount] = useState(0);
  onFrame(() => {
    setCount(1);
  });
}`,
      output: null,
      errors: [
        {
          messageId: "stateSetterInUseFrame",
          data: { name: "setCount" },
          line: 6,
          column: 5,
          suggestions: [],
        },
      ],
    },
    {
      name: "one immutable alias of the setter",
      code: `import { useFrame } from "@react-three/fiber";
import { useState } from "react";
function Spinner() {
  const [count, setCount] = useState(0);
  const update = setCount;
  useFrame(() => {
    update(1);
  });
}`,
      output: null,
      errors: [
        {
          messageId: "stateSetterInUseFrame",
          data: { name: "update" },
          line: 7,
          column: 5,
          suggestions: [],
        },
      ],
    },
    {
      name: "immutable local function callback",
      code: `import { useFrame } from "@react-three/fiber";
import { useState } from "react";
function Spinner() {
  const [count, setCount] = useState(0);
  const step = () => {
    setCount(1);
  };
  useFrame(step);
}`,
      output: null,
      errors: [
        {
          messageId: "stateSetterInUseFrame",
          data: { name: "setCount" },
          line: 6,
          column: 5,
          suggestions: [],
        },
      ],
    },
    {
      name: "TSX component",
      code: `import { useFrame } from "@react-three/fiber";
import { useState } from "react";
export function Spinner(): JSX.Element {
  const [count, setCount] = useState<number>(0);
  useFrame(() => {
    setCount(count + 1);
  });
  return <mesh />;
}`,
      output: null,
      languageOptions: tsxLanguageOptions,
      errors: [
        {
          messageId: "stateSetterInUseFrame",
          data: { name: "setCount" },
          line: 6,
          column: 5,
          suggestions: [],
        },
      ],
    },
  ],
});
