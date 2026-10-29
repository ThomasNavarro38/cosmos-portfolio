/**
 * The host's copies of the page (`scripts/pages.ts`): driven through the
 * plugin's own `generateBundle` over a stub bundle, with a stub context
 * recording what it emits.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { ROUTE_PATHS } from '../src/shell/route.ts';
import { PAGE_COPIES, pages } from './pages.ts';

const VITE_CONFIG = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8');

interface Emitted {
  readonly type: string;
  readonly fileName: string;
  readonly source: unknown;
}

/** What the plugin's `generateBundle` emits over `bundle`, or the error it throws. */
function emitted(bundle: Record<string, unknown>, plugin: Partial<ReturnType<typeof pages>> = pages()): Emitted[] {
  const out: Emitted[] = [];
  const hook = plugin.generateBundle;
  const fn = typeof hook === 'function' ? hook : (hook as { handler?: unknown } | undefined)?.handler;
  if (typeof fn === 'function') (fn as (options: unknown, bundle: unknown) => void).call({ emitFile: (file: Emitted) => out.push(file) }, {}, bundle);
  return out;
}

const PAGE = '<!doctype html><html><head><script type="module" src="/cosmos-portfolio/assets/entry-x.js"></script></head></html>';
const BUNDLE = { 'index.html': { type: 'asset', fileName: 'index.html', source: PAGE }, 'assets/entry-x.js': { type: 'chunk', fileName: 'assets/entry-x.js' } };

test('the copies: each route other than home as its directory’s index.html, then 404.html', () => {
  const routes = Object.values(ROUTE_PATHS).filter((path) => path !== '/').map((path) => `${path.slice(1)}/index.html`);
  assert.deepEqual(PAGE_COPIES, [...routes, '404.html']);
  assert.deepEqual(PAGE_COPIES, ['chart/index.html', 'colophon/index.html', '404.html']);
});

/** Every way `out` is not `PAGE_COPIES`, in order, each an asset holding `page`. */
function copyFailures(out: readonly Emitted[], page: unknown): string[] {
  const failures: string[] = [];
  if (JSON.stringify(out.map((file) => file.fileName)) !== JSON.stringify(PAGE_COPIES)) failures.push(`emitted ${JSON.stringify(out.map((file) => file.fileName))}, not ${JSON.stringify(PAGE_COPIES)}`);
  for (const file of out) {
    if (file.type !== 'asset') failures.push(`${file.fileName} is not an asset`);
    if (file.source !== page) failures.push(`${file.fileName} is not index.html, byte for byte`);
  }
  return failures;
}

test('each copy is emitted once, as an asset holding index.html’s exact source', () => {
  assert.deepEqual(copyFailures(emitted(BUNDLE), PAGE), []);
  const buffer = Buffer.from(PAGE);
  assert.deepEqual(copyFailures(emitted({ 'index.html': { type: 'asset', fileName: 'index.html', source: buffer } }), buffer), [], 'a buffer source is handed over as it is');
});

test('a bundle writing pages but not index.html fails the build, naming it; one writing no page is left alone', () => {
  assert.throws(() => emitted({ 'other.html': { type: 'asset', fileName: 'other.html', source: PAGE } }), /other\.html.*no index\.html/);
  assert.throws(() => emitted({ 'other.html': { type: 'asset', fileName: 'other.html', source: PAGE }, 'index.html': { type: 'chunk', fileName: 'index.html' } }), /no index\.html/, 'a chunk named index.html is not the page');
  assert.deepEqual(emitted({ 'assets/entry-x.js': BUNDLE['assets/entry-x.js'] }), [], 'a fixture or SSR build writes no page, so nothing is copied');
});

test('the plugin applies to the client environment alone', () => {
  const applies = pages().applyToEnvironment as (environment: { config: { consumer: string } }) => boolean;
  assert.equal(applies({ config: { consumer: 'client' } }), true);
  assert.equal(applies({ config: { consumer: 'server' } }), false);
});

test('the copy check is red against no copies, a copy missing, the page altered, or a chunk', () => {
  const { generateBundle: _dropped, ...silent } = pages();
  assert.notDeepEqual(copyFailures(emitted(BUNDLE, silent), PAGE), [], 'a plugin without the hook');
  const real = emitted(BUNDLE);
  assert.notDeepEqual(copyFailures(real.filter((file) => file.fileName !== '404.html'), PAGE), [], 'no 404.html');
  assert.notDeepEqual(copyFailures(real.map((file, index) => (index === 0 ? { ...file, source: PAGE.replace('/cosmos-portfolio/', '/') } : file)), PAGE), [], 'a copy off the base');
  assert.notDeepEqual(copyFailures(real.map((file) => ({ ...file, type: 'chunk' })), PAGE), [], 'copies emitted as chunks');
});

test('the plugin runs after the page is written, and the config builds under the base with it', () => {
  assert.equal(pages().enforce, 'post');
  assert.match(VITE_CONFIG, /^import \{ BASE \} from '\.\/scripts\/site\.ts';$/m);
  assert.match(VITE_CONFIG, /^import \{ pages \} from '\.\/scripts\/pages\.ts';$/m);
  assert.match(VITE_CONFIG, /^ {2}base: BASE,$/m);
  assert.match(VITE_CONFIG, /plugins: \[react\(\), bundleAssertion\(\), exhibits\(\), pages\(\)\]/);
});
