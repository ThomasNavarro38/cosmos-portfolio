/**
 * `colophon-host.tsx` (4.2): rendered through the render harness
 * (`scripts/render.ts`) — the lazy Colophon arrives inline, its one `<h1>`
 * and its contact route (6.3) alone, the host adding no element of its own — and its structural audit,
 * moved here from `router.test.ts` with its mutation rows unchanged: the lazy
 * edge, the boundary outside the suspense edge, the logged failure. The audit is
 * structural throughout (imports, the lazy edge, boundary order), so none of its
 * clauses is retired.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { React, elementsOf, parseMarkup, renderer, textOf, type Renderer } from '../../scripts/render.ts';
import { stripComments } from '../../scripts/source-scan.ts';
import type { ColophonHost as ColophonHostComponent } from './colophon-host.tsx';

const SHELL = fileURLToPath(new URL('.', import.meta.url));
const COLOPHON_HOST_TSX = join(SHELL, 'colophon-host.tsx');

// Set only once the server has started, so a failed start is not masked by its close.
let started: Renderer | undefined;
after(() => started?.close());
const harness = (started = await renderer());

const { ColophonHost } = await harness.load<{ ColophonHost: typeof ColophonHostComponent }>('/src/shell/colophon-host.tsx');

/** The host's render: the Colophon's one `<h1>`, `the model`, then its contact route (6.3), and nothing of the host's own. */
function colophonOnly(html: string): string[] {
  const children = elementsOf(parseMarkup(html));
  if (children.length !== 2 || children[0]?.tag !== 'h1' || textOf(children[0]) !== 'the model' || children[1]?.tag !== 'p' || children[1]?.attrs['class'] !== 'contact-route') {
    return [`the host renders ${children.map((child) => child.tag).join(', ') || 'nothing'} — not the Colophon's one <h1> and its contact route`];
  }
  return [];
}

test('the colophon host renders the lazy Colophon inline: its one <h1>, nothing of its own', async () => {
  assert.deepEqual(colophonOnly(await harness.render(React.createElement(ColophonHost))), []);
});

test('the colophon host check is red against a broken render', async () => {
  const real = await harness.render(React.createElement(ColophonHost));
  for (const [name, markup] of [
    ['nothing rendered', ''],
    ['a loading copy beside it', `<p>loading</p>${real}`],
    ['wrapped by the host', `<div>${real}</div>`],
    ['the heading twice', `${real}${real}`],
  ] as const) {
    assert.notEqual(markup, real, `the break "${name}" must apply`);
    assert.notDeepEqual(colophonOnly(markup), [], `"${name}" must be rejected`);
  }
});

// --- The lazy edge, structurally ---------------------------------------------------------------


/**
 * `colophon-host.tsx`: `lazy(() => import('../colophon/colophon.tsx'))` — the one
 * import of the colophon anywhere — behind an error boundary that logs and
 * renders `null`, around `<Suspense fallback={null}>`. Nothing static from the
 * colophon, no render-scene.
 */
function auditColophonHost(source: string): string[] {
  const code = stripComments(source);
  const failures: string[] = [];
  if (!/const\s+Colophon\s*=\s*lazy\(\s*\(\s*\)\s*=>\s*import\(\s*'\.\.\/colophon\/colophon\.tsx'\s*\)\s*\)\s*;/.test(code)) {
    failures.push("the colophon is not lazy(() => import('../colophon/colophon.tsx'))");
  }
  if ((code.match(/\bimport\s*\(/g) ?? []).length !== 1) failures.push('the host holds other than one dynamic import');
  if (/^\s*import\s[^\n]*from\s*'\.\.\/colophon\//m.test(code)) failures.push('the colophon is imported statically');
  if (/render-scene|render-fallback/.test(code)) failures.push('the colophon host reaches a renderer');
  const tags = (code.match(/<(?:ColophonBoundary|Suspense|Colophon)\b[^>]*>/g) ?? []).map((tag) => tag.replace(/^<(\w+)[\s\S]*$/, '$1'));
  if (JSON.stringify(tags) !== JSON.stringify(['ColophonBoundary', 'Suspense', 'Colophon'])) {
    failures.push(`the nesting is ${JSON.stringify(tags)}, not boundary, Suspense, Colophon`);
  }
  if (!/<Suspense\s+fallback=\{\s*null\s*\}\s*>/.test(code)) failures.push('the suspense edge shows something while loading');
  if (!/static\s+getDerivedStateFromError\s*\(/.test(code)) failures.push('the boundary does not stop the unmount');
  if (!/\bcomponentDidCatch\s*\([^)]*\)\s*:\s*void\s*\{\s*console\.error\(/.test(code)) failures.push('a failed colophon is not logged');
  if (!/this\.state\.failed\s*\?\s*null\s*:/.test(code)) failures.push('a failed colophon does not render null');
  if (/retry|setTimeout|setInterval|location\.reload/.test(code)) failures.push('a failed colophon is retried');
  return failures;
}

test('the colophon host is a lazy edge behind a logging boundary, nothing else', () => {
  assert.deepEqual(auditColophonHost(readFileSync(COLOPHON_HOST_TSX, 'utf8')), []);
});

test('the colophon host audit rejects the real host with any one guarantee removed', () => {
  const real = readFileSync(COLOPHON_HOST_TSX, 'utf8').replace(/\r\n/g, '\n');
  const mutations: readonly (readonly [string, (source: string) => string])[] = [
    ['a static import', (s) => s.replace("const Colophon = lazy(() => import('../colophon/colophon.tsx'));", "import Colophon from '../colophon/colophon.tsx';")],
    ['the scene instead', (s) => s.replace("import('../colophon/colophon.tsx')", "import('../render-scene/scene.tsx')")],
    ['a second import', (s) => `${s}\nvoid import('../colophon/colophon.tsx');\n`],
    ['the boundary inside Suspense', (s) => s.replace(/<ColophonBoundary>\s*<Suspense fallback=\{null\}>\s*<Colophon \/>\s*<\/Suspense>\s*<\/ColophonBoundary>/, '<Suspense fallback={null}>\n      <ColophonBoundary>\n        <Colophon />\n      </ColophonBoundary>\n    </Suspense>')],
    ['a loading copy', (s) => s.replace(/(\n\s*)<Suspense fallback=\{null\}>/, '$1<Suspense fallback={<p>loading</p>}>')],
    ['not logged', (s) => s.replace(/console\.error\(/, 'void (')],
    ['a failure rendered', (s) => s.replace('this.state.failed ? null :', 'this.state.failed ? this.props.children :')],
  ];
  for (const [name, mutate] of mutations) {
    const mutated = mutate(real);
    assert.notEqual(mutated, real, `the mutation "${name}" must apply`);
    assert.notDeepEqual(auditColophonHost(mutated), [], `"${name}" must be rejected`);
  }
});
