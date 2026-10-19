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
 * **Reading the markup.** `parseMarkup` turns the rendered string into a tree
 * (comments, React's boundary marks among them, dropped; entities decoded), and
 * `queryAll`/`queryOne` select from it with compound selectors joined by
 * descendant or child combinators — enough for a test to say which elements a
 * surface holds, in which order, without a DOM package.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type * as ReactTypes from 'react';
import type * as StaticTypes from 'react-dom/static';
import { createServer, type ViteDevServer } from 'vite';

/** The repository root: the Vite root, and where React is required from. */
export const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));

const requireFromRoot = createRequire(join(REPO_ROOT, 'package.json'));

/** React, as Node loads it — the instance every Vite-loaded module imports. */
export const React = requireFromRoot('react') as typeof ReactTypes;

const { prerenderToNodeStream } = requireFromRoot('react-dom/static') as typeof StaticTypes;

type Subscribe = (onChange: () => void) => () => void;
type UseSyncExternalStore = <T>(subscribe: Subscribe, getSnapshot: () => T, getServerSnapshot?: () => T) => T;

/** Marks the wrapped export, so a second import of this module wraps nothing. */
const WRAPPED = Symbol.for('cosmos-portfolio.render.useSyncExternalStore');

{
  const exports = React as unknown as Record<string | symbol, unknown>;
  const original = exports['useSyncExternalStore'] as UseSyncExternalStore & { [WRAPPED]?: true };
  if (original[WRAPPED] !== true) {
    const wrapped = (<T>(subscribe: Subscribe, getSnapshot: () => T, getServerSnapshot?: () => T): T =>
      original(subscribe, getSnapshot, getServerSnapshot ?? getSnapshot)) as UseSyncExternalStore & { [WRAPPED]?: true };
    wrapped[WRAPPED] = true;
    exports['useSyncExternalStore'] = wrapped;
  }
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
  /** Stops the server and removes its cache. */
  close(): Promise<void>;
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
    clearTimeout(timer);
    // A losing render is aborted, so nothing outlives the test.
    rendering.catch(() => undefined);
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
      const timeoutMs = options.timeoutMs ?? RENDER_TIMEOUT_MS;
      let html = inlineSegments(await prerenderOnce(element, subject, timeoutMs));
      // A boundary still out of line was pending when the shell flushed and its
      // completion did not arrive in this pass: its payload has resolved by now,
      // so a second pass renders it.
      if (OUT_OF_LINE.test(html)) html = inlineSegments(await prerenderOnce(element, subject, timeoutMs));
      if (OUT_OF_LINE.test(html) || UNRESOLVED.test(html) || UNHANDLED_SCRIPT.test(html)) {
        throw new Error(`${subject}: the render left a boundary unresolved`);
      }
      return html;
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
