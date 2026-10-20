/**
 * `surface-main.tsx` (4.10), audited as source: the one wiring between the pure
 * tracker (`createArrival`, executed in `arrival.test.ts`) and the real
 * `<main>`. The server prerender runs no effects, so no render shows it; each
 * clause is driven red over a mutation of the shipped file.
 *
 * - the tracker is created once for the component's lifetime (`useState`'s
 *   lazy initialiser), never per render;
 * - it is called inside `useEffect` with `main.current` and `document`;
 * - that effect has no deps array, so it runs after every render: the title is
 *   set on every render, and the same-surface rule is the tracker's own;
 * - the `<main>` carries the ref, `aria-label={SURFACE_NAMES[shown]}` and
 *   `tabIndex={-1}`.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { stripComments } from '../../scripts/source-scan.ts';

const SURFACE_MAIN_TSX = fileURLToPath(new URL('./surface-main.tsx', import.meta.url));

function auditSurfaceMain(source: string): string[] {
  const code = stripComments(source);
  const failures: string[] = [];
  if (!/import\s*\{[^}]*\bcreateArrival\b[^}]*\}\s*from\s*'\.\/arrival\.ts'/.test(code)) failures.push('createArrival is not imported from arrival.ts');
  if (!/const \[arrival\] = useState\(createArrival\);/.test(code) || (code.match(/\bcreateArrival\b/g) ?? []).length !== 2) {
    failures.push('the tracker is not created once, by useState(createArrival)');
  }
  const effects = [...code.matchAll(/\buse(?:Layout)?Effect\(/g)];
  const effect = /useEffect\(\(\) => \{\s*arrival\(shown, main\.current, document\);\s*\}(\s*,[^)]*)?\);/.exec(code);
  if (effects.length !== 1 || effect === null) failures.push('the tracker is not called inside one useEffect with shown, main.current and document');
  else if (effect[1] !== undefined) failures.push('the effect has a deps array — it must run after every render');
  if ((code.match(/\barrival\(/g) ?? []).length !== 1) failures.push('the tracker is called other than by the effect');
  if (!/const main = useRef<HTMLElement>\(null\);/.test(code)) failures.push('the <main> ref is not a useRef<HTMLElement>(null)');
  const mains = code.match(/<main\b[^>]*>/g) ?? [];
  if (mains.length !== 1 || mains[0] !== '<main ref={main} aria-label={SURFACE_NAMES[shown]} tabIndex={-1}>') {
    failures.push('the <main> does not carry the ref, aria-label={SURFACE_NAMES[shown]} and tabIndex={-1}');
  }
  return failures;
}

test('surface-main.tsx: the tracker created once, called after every render from useEffect, the <main> named and focusable by script', () => {
  const real = readFileSync(SURFACE_MAIN_TSX, 'utf8').replace(/\r\n/g, '\n');
  assert.deepEqual(auditSurfaceMain(real), []);
  const cases: readonly (readonly [string, (source: string) => string, RegExp])[] = [
    ['a tracker per render', (s) => s.replace('const [arrival] = useState(createArrival);', 'const arrival = createArrival();'), /not created once/],
    ['a tracker built eagerly every render', (s) => s.replace('useState(createArrival)', 'useState(createArrival())'), /not created once/],
    ['a deps array on shown', (s) => s.replace('arrival(shown, main.current, document);\n  });', 'arrival(shown, main.current, document);\n  }, [shown]);'), /has a deps array/],
    ['an empty deps array', (s) => s.replace('arrival(shown, main.current, document);\n  });', 'arrival(shown, main.current, document);\n  }, []);'), /has a deps array/],
    ['a layout effect', (s) => s.replace('useEffect(() => {', 'useLayoutEffect(() => {'), /not called inside one useEffect/],
    ['no main', (s) => s.replace('arrival(shown, main.current, document);', 'arrival(shown, null, document);'), /not called inside one useEffect/],
    ['no document', (s) => s.replace('arrival(shown, main.current, document);', "arrival(shown, main.current, { title: '', activeElement: null });"), /not called inside one useEffect/],
    ['called during render', (s) => s.replace('  return (\n    <main', '  arrival(shown, main.current, document);\n  return (\n    <main'), /called other than by the effect/],
    ['the ref dropped', (s) => s.replace('<main ref={main} ', '<main '), /does not carry the ref/],
    ['a written name', (s) => s.replace('aria-label={SURFACE_NAMES[shown]}', 'aria-label="the page"'), /does not carry the ref/],
    ['a tab stop', (s) => s.replace('tabIndex={-1}>', 'tabIndex={0}>'), /does not carry the ref/],
    ['no tabindex', (s) => s.replace(' tabIndex={-1}', ''), /does not carry the ref/],
  ];
  for (const [name, mutate, message] of cases) {
    const mutated = mutate(real);
    assert.notEqual(mutated, real, `the mutation "${name}" must apply`);
    assert.match(auditSurfaceMain(mutated).join('\n'), message, `"${name}" must be rejected`);
  }
});
