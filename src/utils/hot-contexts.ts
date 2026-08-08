import type { SourceCode } from "eslint";

import {
  childNode,
  childNodes,
  getEnclosingFunction,
  getStaticPropertyName,
  isFunctionNode,
  nodeField,
  unwrapExpression,
  walkAll,
  type AstNode,
} from "./ast.js";
import {
  getDestructuredBinding,
  getImmutableFunction,
  getNamespaceImport,
  isImmutableBinding,
  resolveConstructorImport,
  resolveGlobalReference,
  resolveImportedValue,
  resolveVariable,
} from "./bindings.js";
import {
  isThreeSource,
  OBJECT_RENDER_HOOK_CONSTRUCTORS,
  OBJECT_RENDER_HOOKS,
  RENDERER_CONSTRUCTORS,
  RENDERER_SORT_SETTERS,
} from "./three-api.js";

/**
 * The dispatch mechanism that proves a callback runs on a render loop.
 *
 * Each kind corresponds to a call, assignment, or class member whose receiver
 * and callee were both resolved from syntax; a callback is never classified by
 * its own name.
 */
export type HotCallbackKind =
  | "requestAnimationFrame"
  | "setAnimationLoop"
  | "aframeTick"
  | "tresLoop"
  | "useFrame"
  | "rendererSort"
  | "objectRenderHook";

/** Current `useLoop()` callback registrars in `@tresjs/core`. */
const TRES_LOOP_CALLBACKS: Record<string, true> = {
  onBeforeRender: true,
  onRender: true,
};

/**
 * Resolves the function a call receives as a callback.
 *
 * Accepts an inline function or arrow, plus one immutable local binding that
 * permanently holds a function. A callback reached through a mutable binding, a
 * parameter, a property, or a call result stays unresolved.
 */
function resolveCallbackFunction(sourceCode: SourceCode, node: unknown): AstNode | null {
  const target = unwrapExpression(node);
  if (target !== null && isFunctionNode(target)) {
    return target;
  }
  if (target?.type !== "Identifier") {
    return null;
  }
  const variable = resolveVariable(sourceCode, target);
  return variable === null ? null : getImmutableFunction(variable);
}

/**
 * True when `node` addresses A-Frame's global registry object.
 *
 * Either a namespace import of `aframe` under any local name, or a global named
 * `AFRAME` that the ESLint configuration actually declares. An undeclared
 * `AFRAME` is deliberately unrecognized so a same-named local or an unrelated
 * project global can never be mistaken for A-Frame.
 */
function isAframeRegistry(sourceCode: SourceCode, node: unknown): boolean {
  const target = unwrapExpression(node);
  if (target === null || target.type !== "Identifier") {
    return false;
  }
  const variable = resolveVariable(sourceCode, target);
  if (variable !== null && getNamespaceImport(variable) === "aframe") {
    return true;
  }
  const global = resolveGlobalReference(sourceCode, target);
  return global !== null && global.configured && global.name === "AFRAME";
}

/** Per-source-code cache of A-Frame frame-method callbacks. */
const aframeCache = new WeakMap<SourceCode, ReadonlyMap<AstNode, "tick" | "tock">>();

/**
 * Collects the `tick` and `tock` methods of every component registered through
 * `AFRAME.registerComponent`.
 *
 * Only an object literal passed directly as an argument is inspected; a
 * definition object reached through a variable, a spread, or a helper is not.
 */
export function collectAframeFrameMethods(
  sourceCode: SourceCode,
): ReadonlyMap<AstNode, "tick" | "tock"> {
  const cached = aframeCache.get(sourceCode);
  if (cached !== undefined) {
    return cached;
  }

  const methods = new Map<AstNode, "tick" | "tock">();
  const program: AstNode = sourceCode.ast;

  walkAll(program, (node) => {
    if (node.type !== "CallExpression") {
      return;
    }
    const callee = unwrapExpression(childNode(node, "callee"));
    if (
      callee === null ||
      callee.type !== "MemberExpression" ||
      getStaticPropertyName(callee) !== "registerComponent" ||
      !isAframeRegistry(sourceCode, childNode(callee, "object"))
    ) {
      return;
    }

    for (const argument of childNodes(node, "arguments")) {
      const definition = unwrapExpression(argument);
      if (definition === null || definition.type !== "ObjectExpression") {
        continue;
      }
      for (const property of childNodes(definition, "properties")) {
        if (property.type !== "Property") {
          continue;
        }
        const name = getStaticPropertyName(property);
        if (name !== "tick" && name !== "tock") {
          continue;
        }
        const value = unwrapExpression(childNode(property, "value"));
        if (value === null || !isFunctionNode(value)) {
          continue;
        }
        methods.set(value, name);
      }
    }
  });

  aframeCache.set(sourceCode, methods);
  return methods;
}

/**
 * True when `callee` is a `useLoop()` callback registrar from `@tresjs/core`.
 *
 * Matches only the current API: `onBeforeRender` or `onRender` destructured
 * from a direct `useLoop()` call whose callee resolves to a runtime import.
 * The legacy `useRenderLoop().onLoop` API is intentionally unrecognized.
 */
function isTresLoopRegistrar(sourceCode: SourceCode, callee: AstNode): boolean {
  if (callee.type !== "Identifier") {
    return false;
  }
  const variable = resolveVariable(sourceCode, callee);
  if (variable === null) {
    return false;
  }
  const destructured = getDestructuredBinding(variable);
  if (destructured === null || TRES_LOOP_CALLBACKS[destructured.property] !== true) {
    return false;
  }
  if (destructured.initializer.type !== "CallExpression") {
    return false;
  }
  const hook = resolveImportedValue(sourceCode, childNode(destructured.initializer, "callee"));
  return hook !== null && hook.source === "@tresjs/core" && hook.name === "useLoop";
}

/**
 * True when a call is an exact one-argument, no-spread sort-comparator setter on
 * a receiver proven to be the renderer its own module exports.
 *
 * A renderer sort comparator runs once per render-list comparison, so it is a
 * strictly hotter path than the frame callback itself.
 */
function isRendererSortRegistration(
  sourceCode: SourceCode,
  call: AstNode,
  callee: AstNode,
): boolean {
  if (callee.type !== "MemberExpression") {
    return false;
  }
  const method = getStaticPropertyName(callee);
  if (method === null || RENDERER_SORT_SETTERS[method] !== true) {
    return false;
  }
  if (!hasExactArguments(call, 1, 1)) {
    return false;
  }
  const renderer = resolveConstructorImport(sourceCode, childNode(callee, "object"));
  return renderer !== null && RENDERER_CONSTRUCTORS[renderer.source] === renderer.name;
}

/**
 * True when a call has between `min` and `max` arguments and spreads none of them.
 *
 * A spread hides its own expansion, so an otherwise valid arity proves nothing.
 */
function hasExactArguments(call: AstNode, min: number, max: number): boolean {
  const args = childNodes(call, "arguments");
  if (args.length < min || args.length > max) {
    return false;
  }
  return !args.some((argument) => argument.type === "SpreadElement");
}

/**
 * True when `name` is a per-object render hook a renderer dispatches on a
 * cataloged renderable class.
 */
function isObjectRenderHookName(name: string | null): boolean {
  return name !== null && OBJECT_RENDER_HOOKS[name] === true;
}

/**
 * True when an expression resolves to one of the imported classes a renderer
 * dispatches `onBeforeRender`/`onAfterRender` on.
 */
function isRenderHookClass(sourceCode: SourceCode, node: unknown): boolean {
  const imported = resolveImportedValue(sourceCode, node);
  return (
    imported !== null &&
    isThreeSource(imported.source) &&
    OBJECT_RENDER_HOOK_CONSTRUCTORS[imported.name] === true
  );
}

/**
 * Resolves the render-hook callback an `onBeforeRender`/`onAfterRender` write
 * installs on a proven renderable instance.
 *
 * The receiver must be an immutable identifier whose construction resolves —
 * directly or through one receiver-alias hop — to an imported catalog class. A
 * write straight onto a `new` expression, onto a local subclass instance, or onto
 * an unresolved receiver proves nothing about which class the renderer will
 * dispatch.
 */
function resolveObjectRenderHookAssignment(sourceCode: SourceCode, node: AstNode): AstNode | null {
  if (nodeField(node, "operator") !== "=") {
    return null;
  }
  const target = unwrapExpression(childNode(node, "left"));
  if (
    target === null ||
    target.type !== "MemberExpression" ||
    !isObjectRenderHookName(getStaticPropertyName(target))
  ) {
    return null;
  }

  const receiver = unwrapExpression(childNode(target, "object"));
  if (receiver === null || receiver.type !== "Identifier") {
    return null;
  }
  const variable = resolveVariable(sourceCode, receiver);
  if (variable === null || !isImmutableBinding(variable)) {
    return null;
  }
  const constructed = resolveConstructorImport(sourceCode, receiver);
  if (
    constructed === null ||
    !isThreeSource(constructed.source) ||
    OBJECT_RENDER_HOOK_CONSTRUCTORS[constructed.name] !== true
  ) {
    return null;
  }

  return resolveCallbackFunction(sourceCode, childNode(node, "right"));
}

/**
 * Collects the render-hook members declared directly on a class that extends an
 * imported catalog class.
 *
 * Exactly one local layer is supported: `class CustomMesh extends Mesh` and the
 * equivalent immutable class expression. A subclass of that subclass is not,
 * because its own superclass is a local binding rather than an import. Accessors,
 * static members, prototype rewrites, constructor-time `this` writes, and dynamic
 * keys are all rejected.
 */
function collectClassRenderHooks(
  sourceCode: SourceCode,
  node: AstNode,
  visit: (callback: AstNode) => void,
): void {
  if (!isRenderHookClass(sourceCode, childNode(node, "superClass"))) {
    return;
  }
  const body = childNode(node, "body");
  if (body === null) {
    return;
  }

  for (const member of childNodes(body, "body")) {
    if (
      nodeField(member, "static") === true ||
      !isObjectRenderHookName(getStaticPropertyName(member))
    ) {
      continue;
    }
    if (member.type === "MethodDefinition") {
      if (nodeField(member, "kind") !== "method") {
        continue;
      }
      const value = unwrapExpression(childNode(member, "value"));
      if (value !== null && isFunctionNode(value)) {
        visit(value);
      }
      continue;
    }
    if (member.type !== "PropertyDefinition") {
      continue;
    }
    const callback = resolveCallbackFunction(sourceCode, childNode(member, "value"));
    if (callback !== null) {
      visit(callback);
    }
  }
}

/** Cache of collected hot callbacks, split by whether R3F `useFrame` counts. */
const hotCallbackCache = new WeakMap<
  SourceCode,
  Map<boolean, ReadonlyMap<AstNode, ReadonlySet<HotCallbackKind>>>
>();

/** Options controlling which dispatch mechanisms count as a render loop. */
export interface HotContextOptions {
  /**
   * Whether React Three Fiber's `useFrame` callbacks are treated as hot.
   *
   * `@react-three/eslint-plugin` already owns allocation diagnostics inside
   * `useFrame`, so the allocation rule opts out to avoid duplicate reports while
   * every other loop rule opts in.
   */
  readonly includeUseFrame: boolean;
}

/**
 * Collects every callback this plugin can prove runs on a render loop, mapped to
 * every dispatch mechanism that reaches it.
 *
 * Recognized dispatch: an unshadowed `requestAnimationFrame`, `setAnimationLoop`
 * or a sort-comparator setter on a tracked Three.js renderer construction,
 * `tick`/`tock` of an `AFRAME.registerComponent` definition, current
 * `@tresjs/core` `useLoop` callbacks, `onBeforeRender`/`onAfterRender` installed
 * on a proven renderable instance or declared on a direct subclass of one, and
 * optionally React Three Fiber's `useFrame`.
 *
 * One function can be reached by several mechanisms, so registrations merge into
 * a set instead of overwriting: the result never depends on traversal order. A
 * callback is never recognized by name alone, and the result is cached per source
 * code so repeated rule lookups cost one traversal per file.
 */
export function collectHotCallbacks(
  sourceCode: SourceCode,
  options: HotContextOptions,
): ReadonlyMap<AstNode, ReadonlySet<HotCallbackKind>> {
  let byOption = hotCallbackCache.get(sourceCode);
  if (byOption === undefined) {
    byOption = new Map();
    hotCallbackCache.set(sourceCode, byOption);
  }
  const cached = byOption.get(options.includeUseFrame);
  if (cached !== undefined) {
    return cached;
  }

  const callbacks = new Map<AstNode, Set<HotCallbackKind>>();
  const program: AstNode = sourceCode.ast;

  const add = (callback: AstNode, kind: HotCallbackKind): void => {
    const kinds = callbacks.get(callback);
    if (kinds === undefined) {
      callbacks.set(callback, new Set([kind]));
      return;
    }
    kinds.add(kind);
  };

  const register = (argument: unknown, kind: HotCallbackKind): void => {
    const callback = resolveCallbackFunction(sourceCode, argument);
    if (callback !== null) {
      add(callback, kind);
    }
  };

  for (const method of collectAframeFrameMethods(sourceCode).keys()) {
    add(method, "aframeTick");
  }

  walkAll(program, (node) => {
    if (node.type === "AssignmentExpression") {
      const hook = resolveObjectRenderHookAssignment(sourceCode, node);
      if (hook !== null) {
        add(hook, "objectRenderHook");
      }
      return;
    }
    if (node.type === "ClassDeclaration" || node.type === "ClassExpression") {
      collectClassRenderHooks(sourceCode, node, (callback) => {
        add(callback, "objectRenderHook");
      });
      return;
    }
    if (node.type !== "CallExpression") {
      return;
    }
    const callee = unwrapExpression(childNode(node, "callee"));
    const firstArgument = childNodes(node, "arguments")[0];
    if (callee === null || firstArgument === undefined) {
      return;
    }

    const global = resolveGlobalReference(sourceCode, callee);
    if (global !== null && global.name === "requestAnimationFrame") {
      register(firstArgument, "requestAnimationFrame");
      return;
    }

    if (isRendererSortRegistration(sourceCode, node, callee)) {
      register(firstArgument, "rendererSort");
      return;
    }

    if (
      callee.type === "MemberExpression" &&
      getStaticPropertyName(callee) === "setAnimationLoop"
    ) {
      const renderer = resolveConstructorImport(sourceCode, childNode(callee, "object"));
      if (renderer !== null && RENDERER_CONSTRUCTORS[renderer.source] === renderer.name) {
        register(firstArgument, "setAnimationLoop");
      }
      return;
    }

    if (isTresLoopRegistrar(sourceCode, callee)) {
      register(firstArgument, "tresLoop");
      return;
    }

    if (!options.includeUseFrame) {
      return;
    }
    const hook = resolveImportedValue(sourceCode, callee);
    if (hook !== null && hook.source === "@react-three/fiber" && hook.name === "useFrame") {
      register(firstArgument, "useFrame");
    }
  });

  byOption.set(options.includeUseFrame, callbacks);
  return callbacks;
}

/**
 * Returns the verified render-loop callback whose own body directly contains
 * `node`, or `null` when `node` sits at module level or inside a nested
 * function.
 *
 * Requiring the *nearest* enclosing function to be the hot callback is what
 * keeps these rules free of interprocedural guessing: code moved into a helper
 * or a nested closure is never attributed to the loop. Only callback membership
 * is tested; which mechanisms reached it does not matter here.
 */
export function getDirectHotCallback(
  node: AstNode,
  hotCallbacks: ReadonlyMap<AstNode, unknown>,
): AstNode | null {
  const enclosing = getEnclosingFunction(node);
  if (enclosing === null || !hotCallbacks.has(enclosing)) {
    return null;
  }
  return enclosing;
}
