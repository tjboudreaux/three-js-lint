import type { Rule } from "eslint";

import {
  childNode,
  getSpreadFreeArguments,
  getStaticPropertyName,
  toReportNode,
  unwrapExpression,
  type AstNode,
} from "../utils/ast.js";
import {
  getConstructionDetails,
  getImmutableInitializer,
  isImmutableBinding,
  isStaticallyNullish,
  resolveConstructorImport,
  resolveGlobalReference,
  resolveVariable,
} from "../utils/bindings.js";
import { createRule } from "../utils/create-rule.js";
import { collectHotCallbacks, getDirectHotCallback } from "../utils/hot-contexts.js";
import { RENDERER_CONSTRUCTORS, type ArityRange } from "../utils/three-api.js";

/**
 * Global view constructors that allocate client memory a synchronous readback can
 * write into.
 *
 * `Float16Array`, `Float64Array`, and the bigint views are absent: no WebGL
 * `readPixels` type maps to them, so a call naming one is not a readback this rule
 * can prove. `ArrayBuffer` is absent because it is not a view.
 */
const CLIENT_MEMORY_VIEWS: Record<string, ArityRange> = {
  DataView: { minArgs: 1, maxArgs: 3 },
  Float32Array: { minArgs: 0, maxArgs: 3 },
  Int16Array: { minArgs: 0, maxArgs: 3 },
  Int32Array: { minArgs: 0, maxArgs: 3 },
  Int8Array: { minArgs: 0, maxArgs: 3 },
  Uint16Array: { minArgs: 0, maxArgs: 3 },
  Uint32Array: { minArgs: 0, maxArgs: 3 },
  Uint8Array: { minArgs: 0, maxArgs: 3 },
  Uint8ClampedArray: { minArgs: 0, maxArgs: 3 },
};

/** Argument index holding the destination buffer of `readRenderTargetPixels`. */
const RENDER_TARGET_BUFFER_INDEX = 5;

/** Argument index holding the destination of a WebGL `readPixels` call. */
const READ_PIXELS_DESTINATION_INDEX = 6;

/**
 * True when an expression constructs a client-memory view this rule accepts as a
 * synchronous readback destination.
 *
 * The constructor must resolve as an unshadowed global, so a local class named
 * `Uint8Array` is never mistaken for the built-in. A numeric `readPixels` offset
 * addresses a pixel buffer object instead of client memory and never matches,
 * and a `DataView` over a nullish buffer cannot be constructed at all.
 */
function isClientMemoryViewConstruction(
  sourceCode: Rule.RuleContext["sourceCode"],
  node: unknown,
): boolean {
  const construction = getConstructionDetails(sourceCode, node);
  if (construction === null) {
    return false;
  }
  const global = resolveGlobalReference(
    sourceCode,
    childNode(construction.newExpression, "callee"),
  );
  const arity = global === null ? undefined : CLIENT_MEMORY_VIEWS[global.name];
  const args = getSpreadFreeArguments(construction.newExpression);
  if (
    global === null ||
    arity === undefined ||
    args === null ||
    args.length < arity.minArgs ||
    args.length > arity.maxArgs
  ) {
    return false;
  }
  if (global.name !== "DataView") {
    return true;
  }
  const buffer = args[0];
  return buffer !== undefined && !isStaticallyNullish(sourceCode, buffer);
}

/**
 * True when `receiver` resolves to a `three` `WebGLRenderer` construction.
 *
 * `three/webgpu` is excluded throughout this rule: its readback API is
 * asynchronous, so there is no synchronous stall to report.
 */
function isWebGLRenderer(sourceCode: Rule.RuleContext["sourceCode"], receiver: AstNode): boolean {
  const renderer = resolveConstructorImport(sourceCode, receiver);
  return (
    renderer !== null &&
    renderer.source === "three" &&
    RENDERER_CONSTRUCTORS[renderer.source] === renderer.name
  );
}

/** True when a call is an exact zero-argument `renderer.getContext()` call. */
function isRendererGetContextCall(
  sourceCode: Rule.RuleContext["sourceCode"],
  node: AstNode,
): boolean {
  if (node.type !== "CallExpression") {
    return false;
  }
  const callee = unwrapExpression(childNode(node, "callee"));
  if (
    callee === null ||
    callee.type !== "MemberExpression" ||
    getStaticPropertyName(callee) !== "getContext"
  ) {
    return false;
  }
  const args = getSpreadFreeArguments(node);
  const receiver = unwrapExpression(childNode(callee, "object"));
  if (args === null || args.length !== 0 || receiver === null) {
    return false;
  }
  return isWebGLRenderer(sourceCode, receiver);
}

/**
 * True when `receiver` denotes the raw WebGL context of a tracked renderer.
 *
 * Only two shapes qualify: the `renderer.getContext()` call itself, and one
 * immutable binding whose initializer is exactly that call. A context obtained
 * from a canvas, passed in, or reached through a second hop is not tracked, so an
 * unrelated object with a `finish` method is never reported.
 */
function isTrackedContext(sourceCode: Rule.RuleContext["sourceCode"], receiver: AstNode): boolean {
  if (isRendererGetContextCall(sourceCode, receiver)) {
    return true;
  }
  if (receiver.type !== "Identifier") {
    return false;
  }
  const variable = resolveVariable(sourceCode, receiver);
  if (variable === null || !isImmutableBinding(variable)) {
    return false;
  }
  const initializer = getImmutableInitializer(variable);
  return initializer !== null && isRendererGetContextCall(sourceCode, initializer);
}

export default createRule({
  name: "no-synchronous-gpu-operation-in-render-loop",
  type: "suggestion",
  description: "Disallow synchronous GPU operations in verified render-loop callbacks.",
  recommended: true,
  messages: {
    synchronousGpuOperationInLoop:
      "Calling {{operation}}() inside this verified render-loop callback can block the CPU until queued GPU work completes; use asynchronous readback or move synchronization outside the repeated path.",
  },
  create(context) {
    const { sourceCode } = context;
    const hotCallbacks = collectHotCallbacks(sourceCode, { includeUseFrame: true });
    if (hotCallbacks.size === 0) {
      return {};
    }

    return {
      CallExpression(node) {
        const call: AstNode = node;
        if (getDirectHotCallback(call, hotCallbacks) === null) {
          return;
        }

        const callee = unwrapExpression(childNode(call, "callee"));
        if (callee === null || callee.type !== "MemberExpression") {
          return;
        }
        const method = getStaticPropertyName(callee);
        const receiver = unwrapExpression(childNode(callee, "object"));
        const args = getSpreadFreeArguments(call);
        if (method === null || receiver === null || args === null) {
          return;
        }

        const report = (): void => {
          context.report({
            node: toReportNode(call),
            messageId: "synchronousGpuOperationInLoop",
            data: { operation: sourceCode.getText(toReportNode(callee)) },
          });
        };

        if (method === "readRenderTargetPixels") {
          const buffer = args[RENDER_TARGET_BUFFER_INDEX];
          if (
            args.length < 6 ||
            args.length > 8 ||
            buffer === undefined ||
            !isWebGLRenderer(sourceCode, receiver) ||
            !isClientMemoryViewConstruction(sourceCode, buffer)
          ) {
            return;
          }
          report();
          return;
        }

        if (method === "finish") {
          if (args.length !== 0 || !isTrackedContext(sourceCode, receiver)) {
            return;
          }
          report();
          return;
        }

        if (method !== "readPixels") {
          return;
        }
        const destination = args[READ_PIXELS_DESTINATION_INDEX];
        if (
          args.length < 7 ||
          args.length > 8 ||
          destination === undefined ||
          !isTrackedContext(sourceCode, receiver) ||
          !isClientMemoryViewConstruction(sourceCode, destination)
        ) {
          return;
        }
        report();
      },
    };
  },
});
