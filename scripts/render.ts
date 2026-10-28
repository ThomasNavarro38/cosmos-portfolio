/**
 * The render harness: shipped `.tsx` modules, loaded through Vite and rendered
 * to markup, so a test can assert what a component renders rather than how its
 * source is spelled.
 *
 * `node --test` cannot load `.tsx`, so until this harness the React wiring of
 * `App`, `FallbackHost`, `Chart` and `CornerChrome` was held by exact-shape
 * source regexes: a wrong prop that kept the text passed, and a
 * behaviour-preserving refactor failed. Test-only — it lives beside
 * `source-scan.ts` and `mutant.ts`, outside `src/`, and only `*.test.ts` files
 * import it, so no shipped chunk can reach it.
 *
 * **Loading.** `renderer()` starts one Vite dev server per test file, with an
 * inline config and nothing else: `configFile: false` (no project config, so no
 * plugin — Vite's own transform compiles the TSX), `cacheDir` under
 * `os.tmpdir()`, no dependency discovery, and `server: { middlewareMode: true,
 * hmr: false, ws: false, watch: null }`. So it writes nothing under the repo and
 * binds no port. `load(path)` is `ssrLoadModule`: the module's CSS, JSON and
 * `.ts` imports resolve as the build resolves them, and a lazy edge
 * (`lazy(() => import('…'))`) is loaded through the same server when it is
 * rendered. `close()` stops the server; the caller registers it in `after`.
 *
 * **One React.** `react` stays external to Vite's runner, so the modules import
 * Node's own copy — the one this file requires natively (`createRequire` from
 * the repo root), together with `react-dom/static`. Rendering with any other
 * instance would be the classic two-Reacts failure.
 *
 * **The server snapshot.** A server render demands `getServerSnapshot`, and the
 * shipped `useSyncExternalStore` calls pass none (`App.tsx`, `corner-chrome.tsx`,
 * `focus-panel.tsx`). A static render has no hydration to agree with, so a
 * missing server snapshot is the client snapshot: React's export is wrapped once,
 * when this module is imported — before any Vite-loaded module binds it. The
 * shipped call shapes are unchanged, and their audits still pin them.
 *
 * **The recorders** (4.8). Markup shows no handler and no subscription, so two
 * more wraps, installed the same way and at the same time — before any
 * Vite-loaded module binds the export — record what a render's components hand
 * React. The element recorder wraps `createElement` and the automatic runtimes
 * (`jsx`/`jsxs`, and `jsxDEV`, which Vite's dev transform emits): every host
 * element (a string tag) created while a render pass runs is kept with the props
 * it was handed, its `onClick` included — `elements(tag?)`. The subscription
 * recorder is the `useSyncExternalStore` wrap: every `subscribe` argument —
 * `subscriptions()`. Both are emptied when each pass starts, record nothing
 * outside one, and are emptied again when `render()` rejects, so they hold the
 * last successful render pass in this process alone; neither changes the markup.
 * They live on `globalThis` under a `Symbol.for` key, beside the wrap guard, so
 * a second instance of this module — whose wraps the guard skips — reads the
 * same recordings. What they hold is what was *created* during the pass, which
 * can include an element of a branch React then discarded (a suspended attempt,
 * say), not only what reached the markup. The props are as the factory received
 * them: the automatic runtimes' (`jsx`, `jsxDEV`) carry `children`, while
 * `createElement`'s are its config, children passed beside it and not recorded.
 * `corner-chrome.test.ts` and `fallback-host.test.ts` run the route links' click
 * rule on the rendered handlers, and the chrome's subscription to the offer.
 *
 * **Fully resolved, or a failure.** `render(element)` uses
 * `prerenderToNodeStream`, which waits for every suspended boundary. A resolved
 * boundary can still arrive out of line — a `<template id="B:0">` placeholder
 * and a hidden `S:0` segment completed by React's inline `$RC` script: React
 * 19.2 outlines a large boundary (the chart's), and a lazy surface pending when
 * the shell flushed is outlined too. `inlineSegments` puts each completed
 * segment back in its placeholder, as `$RC` does in a browser; a render still
 * out of line is repeated once, its payload resolved, and a second such render
 * fails.
 * Any `onError`, any client-rendered (`<!--$!-->`) or pending (`<!--$?-->`)
 * boundary, and a render outlasting `timeoutMs` reject, naming the subject.
 *
 * **Client renders** (Epic 5 retro item 42, ruling (a) 2026-10-28). A static
 * render runs no effect, no click and no client error boundary, so
 * `mount(element)` renders on the client: `react-dom/client`'s `createRoot`,
 * under React's `act`, into a container in a happy-dom document. happy-dom is a
 * devDependency imported here alone — dynamically, on the first mount, so a
 * static suite never loads it — and never by a `*.test.ts` or by `src/`. Its
 * globals are installed only between mount and unmount, by name, from one
 * `new Window()` (JavaScript evaluation and file loading off): `window`,
 * `document`, `navigator`, the constructors in `DOM_CONSTRUCTORS` (`Node`,
 * `Element`, `HTMLElement`, `HTMLIFrameElement`, `Text`, `Event`,
 * `MouseEvent`, `KeyboardEvent`, `FocusEvent`), `requestAnimationFrame`,
 * `cancelAnimationFrame`, `getComputedStyle`, and `IS_REACT_ACT_ENVIRONMENT`.
 * The list is deliberately minimal — what React's DOM client and today's
 * tests read — so `matchMedia`, `localStorage`, `CustomEvent`,
 * `PointerEvent`, `MutationObserver` and the rest are absent; a component
 * that needs one gets it by adding its name to `DOM_CONSTRUCTORS` (or to
 * `domGlobals`, bound, for a function), or from a test through `globals`.
 * Each is saved before and restored after — Node's own `navigator` comes back,
 * `document` goes — and Node's own `fetch` and `AbortController` are never
 * replaced unless a test hands its own through `globals`, installed after the
 * DOM's and restored the same way (a fake `fetch`, a `navigator` with a fake
 * clipboard). One mount at a time, and no static `render()` while one is open:
 * the globals and the recorders are the process's.
 *
 * `react-dom/client` is required through `requireFromRoot`, beside `react`, so
 * the client renders with the one React too. Node caches it on first load, and
 * it reads `window` and `navigator.userAgent` then: it must first load inside a
 * mount, which `mount` does. A module that reaches `react-dom/client` loaded
 * through `harness.load` outside a mount would cache it with no DOM — its
 * load-time detection (`canUseDOM`, the supported events) fixed false — and
 * every later client render in that process would run on that wrong reading.
 *
 * The recorders are emptied and marked active for the client pass — every
 * re-render a click or an effect causes is recorded — and marked inactive at
 * unmount, so nothing leaks into the next pass. React's own report of an error
 * a boundary caught is recorded in `caught` rather than logged, so a test
 * counts the component's own `console.error` alone; an uncaught one is
 * recorded in `uncaught` and makes the `act` — or the `unmount`, for a
 * cleanup that threw — that let it escape reject. `settle(n)` runs `n` short
 * `act` passes, and `waitFor(condition)` repeats them until `condition()`
 * holds or its timeout passes; each flushes what settled during it. After
 * unmount, `act`, `settle` and `waitFor` throw. `markup()` is the container's
 * `innerHTML` through `parseMarkup`, so a client render is read with the same
 * selectors as a static one.
 *
 * **Reading the markup.** `parseMarkup` turns the rendered string into a tree
 * (comments, React's boundary marks among them, dropped; entities decoded), and
 * `queryAll`/`queryOne` select from it with compound selectors joined by
 * descendant or child combinators — enough for a test to say which elements a
 * surface holds, in which order — a static render needs no DOM package.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type * as ReactTypes from 'react';
import type * as ClientTypes from 'react-dom/client';
import type * as StaticTypes from 'react-dom/static';
import { createServer, type ViteDevServer } from 'vite';

/** The repository root: the Vite root, and where React is required from. */
export const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));

const requireFromRoot = createRequire(join(REPO_ROOT, 'package.json'));

/** React, as Node loads it — the instance every Vite-loaded module imports. */
export const React = requireFromRoot('react') as typeof ReactTypes;

const { prerenderToNodeStream } = requireFromRoot('react-dom/static') as typeof StaticTypes;

/** A `useSyncExternalStore` subscribe argument. */
export type Subscribe = (onChange: () => void) => () => void;
type UseSyncExternalStore = <T>(subscribe: Subscribe, getSnapshot: () => T, getServerSnapshot?: () => T) => T;

/** One host element a rendered component created: its tag and the props it was handed, functions included. */
export interface RecordedElement {
  readonly tag: string;
  readonly props: Readonly<Record<string, unknown>>;
}

/** Marks a wrapped export, so a second import of this module wraps nothing. */
const WRAPPED = Symbol.for('cosmos-portfolio.render.wrapped');

/** Where the recordings live on `globalThis`: one store per process, whichever instance of this module wrapped React. */
const RECORDED = Symbol.for('cosmos-portfolio.render.recorded');

interface Recordings {
  active: boolean;
  /** A client render is mounted: its globals and its recordings are the process's until it unmounts. */
  clientOpen: boolean;
  elements: RecordedElement[];
  subscriptions: Subscribe[];
}

/**
 * The recorders (4.8): what a render's components handed React, which the
 * markup cannot show — a host element's handlers, and the stores a component
 * subscribes to. Filled only while a render pass runs, cleared when each pass
 * starts and when a render rejects, so `elements()` and `subscriptions()` hold
 * the last successful render pass in this process alone.
 */
const recorded = ((globalThis as unknown as Record<symbol, Recordings | undefined>)[RECORDED] ??= { active: false, clientOpen: false, elements: [], subscriptions: [] });

/** `exports[name]`, replaced once by `wrap(original)` — before any Vite-loaded module binds it. */
function wrapExport(exports: Record<string | symbol, unknown>, name: string, wrap: (original: (...args: never[]) => unknown) => (...args: never[]) => unknown): void {
  const original = exports[name] as ((...args: never[]) => unknown) & { [WRAPPED]?: true };
  // `react/jsx-dev-runtime` exports no `jsxDEV` in a production build: nothing to wrap.
  if (typeof original !== 'function' || original[WRAPPED] === true) return;
  const wrapped = wrap(original) as ((...args: never[]) => unknown) & { [WRAPPED]?: true };
  wrapped[WRAPPED] = true;
  exports[name] = wrapped;
}

{
  const exports = React as unknown as Record<string | symbol, unknown>;
  // A missing server snapshot is the client snapshot; the subscribe argument is recorded.
  wrapExport(exports, 'useSyncExternalStore', (original) => {
    const store = original as unknown as UseSyncExternalStore;
    return (<T>(subscribe: Subscribe, getSnapshot: () => T, getServerSnapshot?: () => T): T => {
      if (recorded.active) recorded.subscriptions.push(subscribe);
      return store(subscribe, getSnapshot, getServerSnapshot ?? getSnapshot);
    }) as never;
  });
  // Every element factory a component can reach: `createElement`, and the
  // automatic runtimes Vite's transform emits (`jsxDEV` in the dev server).
  const recordHost =
    (original: (...args: never[]) => unknown) =>
    (...args: never[]): unknown => {
      const [type, props] = args as unknown as [unknown, Record<string, unknown> | null | undefined];
      if (recorded.active && typeof type === 'string') recorded.elements.push({ tag: type, props: props ?? {} });
      return original(...args);
    };
  wrapExport(exports, 'createElement', recordHost);
  const runtime = requireFromRoot('react/jsx-runtime') as Record<string | symbol, unknown>;
  wrapExport(runtime, 'jsx', recordHost);
  wrapExport(runtime, 'jsxs', recordHost);
  wrapExport(requireFromRoot('react/jsx-dev-runtime') as Record<string | symbol, unknown>, 'jsxDEV', recordHost);
}

/** The longest a render may take before it fails, in milliseconds. */
export const RENDER_TIMEOUT_MS = 10_000;

/** A boundary streamed out of line: its placeholder, its hidden segment, or a partial segment's placeholder. */
const OUT_OF_LINE = /<template id="[BP]:\d+"|<div hidden id="S:\d+"/;

/** A boundary that never resolved on the server: pending (`$?`) or client-rendered (`$!`). */
const UNRESOLVED = /<!--\$[?!]-->/;

/** React's own inline runtime: the completion script and the timing mark, nothing a component renders. */
const REACT_SCRIPT = /<script>(?:\$R|requestAnimationFrame\(function\(\)\{\$RT)[\s\S]*?<\/script>/g;

/** A script left after the runtime is stripped: an instruction `inlineSegments` does not perform. */
const UNHANDLED_SCRIPT = /<script[\s>]/;

/** One completion instruction: boundary `B:n` is segment `S:m`. */
const COMPLETE = /\$RC\("(B:\d+)","(S:\d+)"\)/g;

/**
 * `html` with every completed out-of-line boundary put back where it belongs —
 * what React's `$RC` does in a browser, done on the markup. React 19.2 outlines a
 * large boundary even when it has resolved (the chart's records are one), and a
 * boundary pending when the shell flushed is outlined too, so a fully resolved
 * render can still arrive in two places: `<!--$?--><template id="B:n"></template>`
 * where it belongs, and `<div hidden id="S:m">…</div>` after the shell. Anything
 * this does not resolve is left in place for the caller to reject.
 */
export function inlineSegments(html: string): string {
  const pairs = [...html.matchAll(COMPLETE)].map((match) => [match[1] as string, match[2] as string] as const);
  let out = html.replace(REACT_SCRIPT, '');
  for (const [boundary, segment] of pairs) {
    const open = `<div hidden id="${segment}">`;
    const start = out.indexOf(open);
    if (start === -1) continue;
    // The segment's own closing tag: React's markup is well-formed and escapes `<` in text.
    let depth = 0;
    let end = -1;
    const tag = /<div\b|<\/div>/g;
    tag.lastIndex = start;
    for (let match = tag.exec(out); match !== null; match = tag.exec(out)) {
      depth += match[0] === '</div>' ? -1 : 1;
      if (depth === 0) {
        end = match.index;
        break;
      }
    }
    if (end === -1) continue;
    const content = out.slice(start + open.length, end);
    const placeholder = `<!--$?--><template id="${boundary}"></template>`;
    if (!out.includes(placeholder)) continue;
    out = out.slice(0, start) + out.slice(end + '</div>'.length);
    out = out.replace(placeholder, () => `<!--$-->${content}`);
  }
  return out;
}

export interface RenderOptions {
  /** The subject's name in a failure; the element type's name when omitted. */
  readonly name?: string;
  readonly timeoutMs?: number;
}

export interface Renderer {
  /** A shipped module, by its path from the repo root (`/src/App.tsx`), loaded through Vite's SSR runner. */
  load<T = Record<string, unknown>>(path: string): Promise<T>;
  /** `element`, rendered to fully resolved markup. Rejects naming the subject on any error, pending boundary or timeout. */
  render(element: ReactTypes.ReactElement, options?: RenderOptions): Promise<string>;
  /**
   * The host elements created during the last render pass in this process — by
   * any renderer, of any instance of this module — `tag`'s alone when given, in
   * creation order, with the props each was handed. Empty after a rejection.
   */
  elements(tag?: string): readonly RecordedElement[];
  /** The `subscribe` argument of every `useSyncExternalStore` call made during the last render pass in this process, in call order. Empty after a rejection. */
  subscriptions(): readonly Subscribe[];
  /**
   * `element`, rendered on the client into a happy-dom document, its effects
   * run and settled under `act`. The DOM's globals, and `options.globals`, are
   * installed until `unmount()`. Rejects naming the subject on an uncaught
   * error, or while another mount is still open. While one is open, `render()`
   * throws: a static pass would reset the recorders under it.
   */
  mount(element: ReactTypes.ReactElement, options?: MountOptions): Promise<Mounted>;
  /** Stops the server and removes its cache. */
  close(): Promise<void>;
}

export interface MountOptions {
  /** The subject's name in a failure; the element type's name when omitted. */
  readonly name?: string;
  /** Globals the tree reads beside the DOM's — a fake `fetch`, a `navigator` with a fake clipboard — installed for the pass and restored after; they win over the DOM's own. */
  readonly globals?: Readonly<Record<string, unknown>>;
}

/** A client render, open until `unmount()`. */
export interface Mounted {
  /** The element the root renders into, in the happy-dom document. */
  readonly container: HTMLElement;
  /** The container's markup, read as `parseMarkup` reads a static render. */
  markup(): MarkupElement;
  /** `run` under React's `act`: every update it causes, and every effect, flushed before this resolves. Rejects on an uncaught error, and after unmount. */
  act(run: () => void | Promise<void>): Promise<void>;
  /** `turns` short `act` passes (1 by default), each one turn of the event loop: what settles during them is flushed. Throws after unmount. */
  settle(turns?: number): Promise<void>;
  /** Short `act` passes until `condition()` holds; rejects naming `what` after `timeoutMs` (finite, at least 0, else a `RangeError`). Throws after unmount. */
  waitFor(condition: () => boolean, what: string, timeoutMs?: number): Promise<void>;
  /** The errors a client error boundary caught, as React reported them (recorded, not logged). */
  readonly caught: readonly unknown[];
  /** The errors no boundary caught (recorded, not logged). */
  readonly uncaught: readonly unknown[];
  /** Unmounts under `act`, closes the window and restores every global — then rejects, naming the subject, if an effect's cleanup threw. Idempotent. */
  unmount(): Promise<void>;
}

/** The subject's name: the option, else the element type's display name or function name. */
function subjectOf(element: ReactTypes.ReactElement, options: RenderOptions): string {
  if (options.name !== undefined) return options.name;
  const type = element.type as { displayName?: string; name?: string } | string;
  if (typeof type === 'string') return type;
  return type.displayName ?? type.name ?? 'an anonymous component';
}

/** A stream's text, decoded once over every chunk, so a character split across two chunks survives. */
export async function readAll(stream: NodeJS.ReadableStream): Promise<string> {
  const parts: Buffer[] = [];
  for await (const chunk of stream) parts.push(typeof chunk === 'string' ? Buffer.from(chunk, 'utf8') : (chunk as Buffer));
  return Buffer.concat(parts).toString('utf8');
}

/** One prerender pass: its markup, or a rejection naming `subject`. */
async function prerenderOnce(element: ReactTypes.ReactElement, subject: string, timeoutMs: number): Promise<string> {
  const controller = new AbortController();
  const errors: unknown[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`${subject}: the render did not resolve within ${timeoutMs} ms`));
    }, timeoutMs);
  });
  // A pass's recordings replace the last's: a repeated pass is the render.
  recorded.elements = [];
  recorded.subscriptions = [];
  recorded.active = true;
  const rendering = (async () => {
    const { prelude } = await prerenderToNodeStream(element, {
      signal: controller.signal,
      onError(error: unknown) {
        errors.push(error);
      },
    });
    return readAll(prelude);
  })();
  try {
    const html = await Promise.race([rendering, timeout]);
    if (errors.length > 0) {
      const cause = errors[0];
      throw new Error(`${subject}: the render reported an error: ${cause instanceof Error ? cause.message : String(cause)}`, { cause });
    }
    return html;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith(`${subject}:`)) throw error;
    throw new Error(`${subject}: the render failed: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
  } finally {
    recorded.active = false;
    clearTimeout(timer);
    // A losing render is aborted, so nothing outlives the test.
    rendering.catch(() => undefined);
  }
}

// --- Client renders ----------------------------------------------------------------------------

/**
 * Installs `values` on `globalThis` by name; returns the restore, which puts
 * back exactly what was there — a descriptor, or nothing — newest first. If a
 * definition throws partway, what was already installed is restored before the
 * error is rethrown, so a failed install leaves nothing behind.
 */
function installGlobals(values: Readonly<Record<string, unknown>>): () => void {
  const target = globalThis as unknown as Record<string, unknown>;
  const saved: (readonly [string, PropertyDescriptor | undefined])[] = [];
  const restore = (): void => {
    for (let at = saved.length - 1; at >= 0; at -= 1) {
      const [name, descriptor] = saved[at] as readonly [string, PropertyDescriptor | undefined];
      if (descriptor === undefined) Reflect.deleteProperty(target, name);
      else Object.defineProperty(target, name, descriptor);
    }
  };
  try {
    for (const [name, value] of Object.entries(values)) {
      const descriptor = Object.getOwnPropertyDescriptor(globalThis, name);
      Object.defineProperty(target, name, { value, configurable: true, enumerable: true, writable: true });
      saved.push([name, descriptor]);
    }
  } catch (error) {
    restore();
    throw error;
  }
  return restore;
}

/** The constructors installed from the window: what React's DOM client and a test read by name. */
const DOM_CONSTRUCTORS = ['Node', 'Element', 'HTMLElement', 'HTMLIFrameElement', 'Text', 'Event', 'MouseEvent', 'KeyboardEvent', 'FocusEvent'] as const;

/** The happy-dom window, as far as the harness reads it. */
interface ClientWindow {
  readonly document: Document;
  readonly navigator: unknown;
  requestAnimationFrame(callback: (time: number) => void): number;
  cancelAnimationFrame(handle: number): void;
  getComputedStyle(element: Element): unknown;
  readonly happyDOM: { close(): Promise<void> };
}

/** The window's globals, by name, its functions bound to it. */
function domGlobals(window: ClientWindow): Record<string, unknown> {
  const globals: Record<string, unknown> = {
    window,
    document: window.document,
    navigator: window.navigator,
    requestAnimationFrame: window.requestAnimationFrame.bind(window),
    cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
    getComputedStyle: window.getComputedStyle.bind(window),
  };
  for (const name of DOM_CONSTRUCTORS) globals[name] = (window as unknown as Record<string, unknown>)[name];
  return globals;
}

/** The longest `waitFor` waits by default, in milliseconds. */
export const WAIT_TIMEOUT_MS = 10_000;

/** One turn of the event loop: every settled promise and due immediate run. */
const turn = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

/** `error`'s message, for a failure that names its cause. */
const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));

async function mountClient(element: ReactTypes.ReactElement, options: MountOptions): Promise<Mounted> {
  const subject = subjectOf(element, options);
  if (recorded.clientOpen) throw new Error(`${subject}: another client render is still mounted — unmount it first`);
  recorded.clientOpen = true;
  let window: ClientWindow | undefined;
  let restore: () => void = () => undefined;
  // Everything a mount set up, undone once: the recorder, the window, the globals.
  let released = false;
  const release = async (): Promise<void> => {
    if (released) return;
    released = true;
    recorded.active = false;
    try {
      await window?.happyDOM.close();
    } finally {
      restore();
      recorded.clientOpen = false;
    }
  };
  try {
    const { Window } = await import('happy-dom');
    window = new Window({
      url: 'http://localhost/',
      settings: { disableJavaScriptEvaluation: true, disableJavaScriptFileLoading: true, disableCSSFileLoading: true },
    }) as unknown as ClientWindow;
    const restoreDom = installGlobals({ ...domGlobals(window), IS_REACT_ACT_ENVIRONMENT: true });
    restore = restoreDom;
    // Required while the DOM is installed, and before a test's own globals: React's
    // DOM client reads `window` and `navigator.userAgent` when it is first loaded.
    const { createRoot } = requireFromRoot('react-dom/client') as typeof ClientTypes;
    // A failure here is undone by itself, then the DOM's by `release`.
    const restoreHanded = installGlobals(options.globals ?? {});
    restore = () => {
      restoreHanded();
      restoreDom();
    };
    const container = window.document.createElement('div');
    window.document.body.appendChild(container);
    const caught: unknown[] = [];
    const uncaught: unknown[] = [];
    const root = createRoot(container, {
      onCaughtError: (error) => void caught.push(error),
      onUncaughtError: (error) => void uncaught.push(error),
    });
    recorded.elements = [];
    recorded.subscriptions = [];
    recorded.active = true;
    let open = true;
    const escaped = (cause: unknown, when = ''): Error => new Error(`${subject}: an error escaped the client render${when}: ${messageOf(cause)}`, { cause });
    /** `run` under React's `act`, whatever escaped the root recorded in `uncaught`. */
    const actRecording = async (run: () => void | Promise<void>): Promise<void> => {
      try {
        await React.act(async () => {
          await run();
        });
      } catch (error) {
        // `act` rethrows what escaped the root; recorded here too, so `uncaught` holds it.
        if (!uncaught.includes(error)) uncaught.push(error);
      }
    };
    const stillOpen = (what: string): void => {
      if (!open) throw new Error(`${subject}: ${what} after unmount`);
    };
    const act = async (run: () => void | Promise<void>): Promise<void> => {
      stillOpen('act');
      const before = uncaught.length;
      await actRecording(run);
      if (uncaught.length > before) throw escaped(uncaught[before]);
    };
    const unmount = async (): Promise<void> => {
      if (!open) return;
      open = false;
      const before = uncaught.length;
      try {
        await actRecording(() => root.unmount());
      } finally {
        await release();
      }
      // An effect's cleanup that threw: the unmount let it escape.
      if (uncaught.length > before) throw escaped(uncaught[before], ' during unmount');
    };
    const mounted: Mounted = {
      container,
      markup: () => parseMarkup(container.innerHTML),
      act,
      async settle(turns = 1) {
        stillOpen('settle');
        for (let at = 0; at < turns; at += 1) await act(turn);
      },
      async waitFor(condition, what, timeoutMs = WAIT_TIMEOUT_MS) {
        stillOpen('waitFor');
        if (!Number.isFinite(timeoutMs) || timeoutMs < 0) throw new RangeError(`${subject}: waitFor's timeout must be a finite number of ms, at least 0 — not ${timeoutMs}`);
        const deadline = Date.now() + timeoutMs;
        while (!condition()) {
          if (Date.now() > deadline) throw new Error(`${subject}: ${what} did not happen within ${timeoutMs} ms`);
          await act(turn);
        }
      },
      caught,
      uncaught,
      unmount,
    };
    try {
      await act(() => root.render(element));
    } catch (error) {
      // The render's failure is the one reported, whatever the unmount then does.
      await unmount().catch(() => undefined);
      throw error;
    }
    return mounted;
  } catch (error) {
    await release();
    throw error;
  }
}

/** Starts the server. One per test file; close it in `after`. */
export async function renderer(): Promise<Renderer> {
  const cacheDir = mkdtempSync(join(tmpdir(), 'cosmos-render-'));
  let server: ViteDevServer;
  try {
    server = await createServer({
      root: REPO_ROOT,
      configFile: false,
      cacheDir,
      logLevel: 'error',
      appType: 'custom',
      server: { middlewareMode: true, hmr: false, ws: false, watch: null },
      optimizeDeps: { noDiscovery: true, include: [] },
    });
  } catch (error) {
    rmSync(cacheDir, { recursive: true, force: true });
    throw error;
  }
  return {
    async load<T>(path: string): Promise<T> {
      return (await server.ssrLoadModule(path)) as T;
    },
    async render(element, options = {}) {
      const subject = subjectOf(element, options);
      // A static pass would reset the recorders under the open client pass.
      if (recorded.clientOpen) throw new Error(`${subject}: a client render is mounted — unmount it first`);
      const timeoutMs = options.timeoutMs ?? RENDER_TIMEOUT_MS;
      try {
        let html = inlineSegments(await prerenderOnce(element, subject, timeoutMs));
        // A boundary still out of line was pending when the shell flushed and its
        // completion did not arrive in this pass: its payload has resolved by now,
        // so a second pass renders it.
        if (OUT_OF_LINE.test(html)) html = inlineSegments(await prerenderOnce(element, subject, timeoutMs));
        if (OUT_OF_LINE.test(html) || UNRESOLVED.test(html) || UNHANDLED_SCRIPT.test(html)) {
          throw new Error(`${subject}: the render left a boundary unresolved`);
        }
        return html;
      } catch (error) {
        // A failed render returns nothing to read.
        recorded.elements = [];
        recorded.subscriptions = [];
        throw error;
      }
    },
    elements(tag) {
      return tag === undefined ? [...recorded.elements] : recorded.elements.filter((element) => element.tag === tag);
    },
    subscriptions() {
      return [...recorded.subscriptions];
    },
    mount(element, options = {}) {
      return mountClient(element, options);
    },
    async close() {
      try {
        await server.close();
      } finally {
        rmSync(cacheDir, { recursive: true, force: true });
      }
    },
  };
}

// --- Reading the markup ----------------------------------------------------------------

/**
 * A rendered element, as a test reads it: its tag, its attributes (entities
 * decoded) and its children. Comments — React's `<!-- -->` text separators and
 * its `<!--$-->` boundary marks — are dropped, so a boundary is invisible to a
 * structural assertion, as it is to a reader.
 */
export interface MarkupElement {
  readonly tag: string;
  readonly attrs: Readonly<Record<string, string>>;
  readonly children: readonly MarkupNode[];
}

/** An element, or a run of text (entities decoded). */
export type MarkupNode = MarkupElement | string;

/** Elements with no closing tag. */
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);

const ENTITY = /&(?:#x([0-9a-f]+)|#(\d+)|(amp|lt|gt|quot|apos|nbsp));/gi;
const NAMED: Readonly<Record<string, string>> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0' };

function decode(text: string): string {
  return text.replace(ENTITY, (_, hex: string | undefined, dec: string | undefined, name: string | undefined) => {
    if (hex !== undefined) return String.fromCodePoint(Number.parseInt(hex, 16));
    if (dec !== undefined) return String.fromCodePoint(Number.parseInt(dec, 10));
    return NAMED[(name as string).toLowerCase()] as string;
  });
}

const TOKEN = /<!--[\s\S]*?-->|<\/([a-zA-Z][\w:-]*)\s*>|<([a-zA-Z][\w:-]*)((?:\s+[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+))?)*)\s*(\/?)>|[^<]+/g;
const ATTRIBUTE = /([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;

/**
 * `html` as a tree under a `#root` element. Strict: a stray or mismatched
 * closing tag, an unclosed element or text the tokenizer cannot read throws,
 * since React's markup is well-formed and anything else is a harness fault.
 */
export function parseMarkup(html: string): MarkupElement {
  const root: { tag: string; attrs: Record<string, string>; children: MarkupNode[] } = { tag: '#root', attrs: {}, children: [] };
  const stack = [root];
  let consumed = 0;
  for (const match of html.matchAll(TOKEN)) {
    if (match.index !== consumed) throw new Error(`parseMarkup: unreadable markup at ${consumed}: ${html.slice(consumed, consumed + 40)}`);
    consumed += match[0].length;
    const top = stack[stack.length - 1] as (typeof stack)[number];
    const [token, closing, opening, rawAttrs, selfClosing] = match;
    if (token.startsWith('<!--')) continue;
    if (closing !== undefined) {
      if (top.tag !== closing || stack.length === 1) throw new Error(`parseMarkup: </${closing}> closes <${top.tag}>`);
      stack.pop();
      continue;
    }
    if (opening !== undefined) {
      const attrs: Record<string, string> = {};
      for (const [, name, double, single, bare] of (rawAttrs ?? '').matchAll(ATTRIBUTE)) attrs[name as string] = decode(double ?? single ?? bare ?? '');
      const element = { tag: opening, attrs, children: [] as MarkupNode[] };
      top.children.push(element);
      if (selfClosing !== '/' && !VOID.has(opening)) stack.push(element);
      continue;
    }
    top.children.push(decode(token));
  }
  if (consumed !== html.length) throw new Error(`parseMarkup: unreadable markup at ${consumed}`);
  if (stack.length !== 1) throw new Error(`parseMarkup: <${(stack[stack.length - 1] as MarkupElement).tag}> is never closed`);
  return root;
}

/** The element children of `node`, text skipped. */
export function elementsOf(node: MarkupElement): MarkupElement[] {
  return node.children.filter((child): child is MarkupElement => typeof child !== 'string');
}

/** All the text under `node`, in document order. */
export function textOf(node: MarkupNode): string {
  return typeof node === 'string' ? node : node.children.map(textOf).join('');
}

/** `node`'s classes. */
export function classesOf(node: MarkupElement): string[] {
  return (node.attrs['class'] ?? '').split(/\s+/).filter((name) => name !== '');
}

/** `node` as a selector would name it: `tag#id.class…`, for a failure message. */
export function describe(node: MarkupElement): string {
  const id = node.attrs['id'] === undefined ? '' : `#${node.attrs['id']}`;
  return `${node.tag}${id}${classesOf(node).map((name) => `.${name}`).join('')}`;
}

interface Compound {
  readonly tag: string | null;
  readonly test: readonly ((node: MarkupElement) => boolean)[];
}

const COMPOUND_PART = /^(?:\.([\w-]+)|#([\w:/-]+)|\[([\w-]+)(?:(\^?=)"([^"]*)")?\])/;

function compound(text: string): Compound {
  const tag = /^[a-zA-Z][\w-]*/.exec(text)?.[0] ?? null;
  const test: ((node: MarkupElement) => boolean)[] = [];
  let rest = text.slice(tag?.length ?? 0);
  while (rest !== '') {
    const part = COMPOUND_PART.exec(rest);
    if (part === null) throw new Error(`selector: cannot read ${JSON.stringify(rest)}`);
    const [whole, className, id, attr, operator, value] = part;
    if (className !== undefined) test.push((node) => classesOf(node).includes(className));
    else if (id !== undefined) test.push((node) => node.attrs['id'] === id);
    else if (operator === undefined) test.push((node) => (attr as string) in node.attrs);
    else if (operator === '=') test.push((node) => node.attrs[attr as string] === value);
    // As in CSS, an empty prefix matches nothing.
    else test.push((node) => value !== '' && (node.attrs[attr as string] ?? '\u0000').startsWith(value as string));
    rest = rest.slice(whole.length);
  }
  return { tag, test };
}

function matchesCompound(node: MarkupElement, part: Compound): boolean {
  return (part.tag === null || node.tag === part.tag) && part.test.every((test) => test(node));
}

/** Every descendant of `node`, depth-first in document order. */
function descendants(node: MarkupElement): MarkupElement[] {
  return elementsOf(node).flatMap((child) => [child, ...descendants(child)]);
}

/**
 * Every descendant of `scope` matching `selector`, in document order: compound
 * selectors (`tag`, `.class`, `#id`, `[attr]`, `[attr="v"]`, `[attr^="v"]`)
 * joined by descendant (space) or child (`>`) combinators. A leading `>` is
 * relative to `scope`.
 */
export function queryAll(scope: MarkupElement, selector: string): MarkupElement[] {
  const trimmed = selector.trim();
  // An empty selector would match every descendant: refused, never read as "all".
  if (trimmed === '') throw new Error(`selector: ${JSON.stringify(selector)} is empty`);
  const tokens = trimmed.replace(/\s*>\s*/g, ' > ').trim().split(/\s+/);
  let current: MarkupElement[] = [scope];
  let child = false;
  for (const [at, token] of tokens.entries()) {
    if (token === '>') {
      // A combinator needs a compound after it: a trailing or doubled `>` is a typo, not a match.
      if (child || at === tokens.length - 1) throw new Error(`selector: ${JSON.stringify(selector)} has a dangling >`);
      child = true;
      continue;
    }
    const part = compound(token);
    const next = new Set<MarkupElement>();
    for (const node of current) for (const candidate of child ? elementsOf(node) : descendants(node)) if (matchesCompound(candidate, part)) next.add(candidate);
    current = [...next];
    child = false;
  }
  // Document order, whatever order the scopes were walked in.
  const order = descendants(scope);
  return current.filter((node) => node !== scope).sort((a, b) => order.indexOf(a) - order.indexOf(b));
}

/** The one descendant of `scope` matching `selector`; throws naming the count otherwise. */
export function queryOne(scope: MarkupElement, selector: string): MarkupElement {
  const found = queryAll(scope, selector);
  if (found.length !== 1) throw new Error(`${selector}: ${found.length} matches, not one`);
  return found[0] as MarkupElement;
}
