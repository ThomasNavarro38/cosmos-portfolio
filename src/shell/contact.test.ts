/**
 * `contact.ts` (6.3): the ruled copy, verbatim; `createContactCopy`, the press
 * `contact-route.tsx` binds, executed against a fake `writeText` for every row
 * of the spec's I/O matrix — a resolve gives `copied`, a rejection, a missing
 * `writeText` and a synchronous throw each give `failed` with nothing thrown,
 * a second press tries again and the newest press's outcome wins over an older
 * one settling late, and after the stop nothing is set — with `writeText`
 * called once per press and never otherwise; `contactLabel` mapping each state
 * to its label; and a source audit: no import and no DOM global, each driven
 * red by a mutation. Plus the deferral: the address is still the `.invalid`
 * placeholder, reported as a `todo` until Thomas supplies the real one (6.5).
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { stripCommentsAndStrings } from '../../scripts/source-scan.ts';
import { CONTACT, contactLabel, createContactCopy, type ContactCopyState, type WriteText } from './contact.ts';

const SOURCE = readFileSync(new URL('./contact.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');

test('the copy is the ruling’s, verbatim, as one single-line literal', () => {
  assert.deepEqual(CONTACT, { address: 'address@example.invalid', copy: 'copy', copied: 'copied', failed: 'not copied' });
  assert.match(SOURCE, /^export const CONTACT = \{ address: 'address@example\.invalid', copy: 'copy', copied: 'copied', failed: 'not copied' \} as const;$/m);
});

test('the real address is supplied', { todo: 'Thomas to supply before 6.5' }, () => {
  assert.ok(!CONTACT.address.endsWith('.invalid'), `the address is still the placeholder ${CONTACT.address}`);
  assert.match(CONTACT.address, /^[^@\s]+@[^@\s]+\.[^@\s.]+$/, 'a plain address: one @, a dotted domain, no space');
});

test('the label: copy at rest, copied after a copy, not copied after a refusal', () => {
  assert.equal(contactLabel('idle'), 'copy');
  assert.equal(contactLabel('copied'), 'copied');
  assert.equal(contactLabel('failed'), 'not copied');
});

// --- The press: createContactCopy -------------------------------------------------------------

/** A deferred value, settled from outside. */
function deferred(): { readonly promise: Promise<void>; resolve(): void; reject(error: unknown): void } {
  let resolve: () => void = () => undefined;
  let reject: (error: unknown) => void = () => undefined;
  const promise = new Promise<void>((yes, no) => ((resolve = () => yes()), (reject = no)));
  promise.catch(() => undefined);
  return { promise, resolve, reject };
}

/** Every pending callback run. */
const settle = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

/** A `writeText` whose every call is answered by a deferred the test settles, recorded in order. */
function clipboard(): { readonly writeText: WriteText; readonly written: string[]; readonly calls: ReturnType<typeof deferred>[] } {
  const written: string[] = [];
  const calls: ReturnType<typeof deferred>[] = [];
  const writeText: WriteText = (text) => {
    written.push(text);
    const call = deferred();
    calls.push(call);
    return call.promise;
  };
  return { writeText, written, calls };
}

/** Every state set, in order. */
function states(): { readonly set: ContactCopyState[]; readonly setCopyState: (state: ContactCopyState) => void } {
  const set: ContactCopyState[] = [];
  return { set, setCopyState: (state) => void set.push(state) };
}

test('nothing is written and nothing is set until the first press', async () => {
  const board = clipboard();
  const out = states();
  createContactCopy(board.writeText, out.setCopyState);
  await settle();
  assert.deepEqual(board.written, []);
  assert.deepEqual(out.set, []);
});

test('copy works: the address written once, then copied', async () => {
  const board = clipboard();
  const out = states();
  createContactCopy(board.writeText, out.setCopyState).press();
  assert.deepEqual(board.written, ['address@example.invalid'], 'the address, written at once');
  assert.deepEqual(out.set, [], 'nothing set before the clipboard answers');
  board.calls[0]?.resolve();
  await settle();
  assert.deepEqual(out.set, ['copied']);
  assert.deepEqual(board.written, ['address@example.invalid'], 'one call for one press');
});

test('the clipboard blocked: a rejection gives not copied, nothing thrown', async () => {
  const board = clipboard();
  const out = states();
  createContactCopy(board.writeText, out.setCopyState).press();
  board.calls[0]?.reject(new DOMException('Write permission denied.', 'NotAllowedError'));
  await settle();
  assert.deepEqual(out.set, ['failed']);
});

test('no clipboard API: an undefined writeText gives not copied, nothing thrown', async () => {
  const out = states();
  const tracker = createContactCopy(undefined, out.setCopyState);
  assert.doesNotThrow(() => tracker.press());
  await settle();
  assert.deepEqual(out.set, ['failed']);
});

test('a synchronous throw is caught and gives not copied', async () => {
  const out = states();
  let calls = 0;
  const tracker = createContactCopy(() => {
    calls += 1;
    throw new TypeError('Illegal invocation');
  }, out.setCopyState);
  assert.doesNotThrow(() => tracker.press());
  await settle();
  assert.deepEqual(out.set, ['failed']);
  assert.equal(calls, 1);
});

test('press again: every press tries again, and the label follows the newest outcome', async () => {
  const board = clipboard();
  const out = states();
  const tracker = createContactCopy(board.writeText, out.setCopyState);
  tracker.press();
  board.calls[0]?.resolve();
  await settle();
  tracker.press();
  board.calls[1]?.reject(new Error('denied'));
  await settle();
  tracker.press();
  board.calls[2]?.resolve();
  await settle();
  assert.deepEqual(out.set, ['copied', 'failed', 'copied']);
  assert.equal(board.written.length, 3, 'one write per press, and no other');
});

test('the newest press wins: an older press settling late is dropped, whichever way it settles', async () => {
  for (const [late, newest, expected] of [
    ['resolve', 'reject', 'failed'],
    ['reject', 'resolve', 'copied'],
  ] as const) {
    const board = clipboard();
    const out = states();
    const tracker = createContactCopy(board.writeText, out.setCopyState);
    tracker.press();
    tracker.press();
    assert.equal(board.written.length, 2, 'a press while another is in flight still tries');
    if (newest === 'resolve') board.calls[1]?.resolve();
    else board.calls[1]?.reject(new Error('denied'));
    await settle();
    if (late === 'resolve') board.calls[0]?.resolve();
    else board.calls[0]?.reject(new Error('denied'));
    await settle();
    assert.deepEqual(out.set, [expected], `the older press's late ${late} is dropped`);
  }
});

test('unmounted: after the stop, a late result is never set', async () => {
  for (const outcome of ['resolve', 'reject'] as const) {
    const board = clipboard();
    const out = states();
    const tracker = createContactCopy(board.writeText, out.setCopyState);
    tracker.press();
    tracker.stop();
    if (outcome === 'resolve') board.calls[0]?.resolve();
    else board.calls[0]?.reject(new Error('late'));
    await settle();
    assert.deepEqual(out.set, [], `a late ${outcome} is not set`);
  }
});

test('the stop drops what is in flight and retires nothing: a press after it (StrictMode’s remount) still copies', async () => {
  const board = clipboard();
  const out = states();
  const tracker = createContactCopy(board.writeText, out.setCopyState);
  tracker.stop();
  tracker.press();
  board.calls[0]?.resolve();
  await settle();
  assert.deepEqual(out.set, ['copied']);
});

// --- Import-free, no DOM global ------------------------------------------------------------------

function auditSource(source: string): string[] {
  const failures: string[] = [];
  const code = stripCommentsAndStrings(source);
  if (/^\s*import\b|\bimport\s*\(|\brequire\s*\(/m.test(code)) failures.push('an import — the module is import-free');
  if (/\bwindow\b|\bdocument\b|\bnavigator\b|\bglobalThis\b|\bself\b|\bclipboard\b/.test(code)) failures.push('reads a DOM global — the clipboard arrives as an argument');
  if (/\bsetTimeout\b|\bsetInterval\b|\brequestAnimationFrame\b/.test(code)) failures.push('a timer — the label stays until the next press');
  if (/\bconsole\b/.test(code)) failures.push('logs — a refused copy is its label, nothing more');
  if (/\bfetch\b|\bXMLHttpRequest\b|\bsendBeacon\b/.test(code)) failures.push('a request — nothing is submitted anywhere');
  return failures;
}

test('contact.ts imports nothing and reads no DOM global, no timer, no log, no request', () => {
  assert.deepEqual(auditSource(SOURCE), []);
});

test('the source audit rejects each reach', () => {
  for (const [name, mutate, message] of [
    ['a static import', (s: string) => `import { useState } from 'react';\n${s}`, /an import/],
    ['a dynamic import', (s: string) => s.replace('  let current = 0;\n', "  let current = 0;\n  void import('./state.ts');\n"), /an import/],
    ['navigator read', (s: string) => s.replace('written = Promise.resolve(writeText(CONTACT.address));', 'written = navigator.clipboard.writeText(CONTACT.address);'), /reads a DOM global/],
    ['window read', (s: string) => s.replace('  let current = 0;\n', '  let current = window.length;\n'), /reads a DOM global/],
    ['document read', (s: string) => s.replace('  let current = 0;\n', "  let current = 0;\n  document.execCommand('copy');\n"), /reads a DOM global/],
    ['a reset timer', (s: string) => s.replace("() => settle('copied'),", "() => (settle('copied'), setTimeout(() => setCopyState('idle'), 2000)),"), /a timer/],
    ['a log', (s: string) => s.replace("() => settle('failed'),\n", "(error) => (console.error(error), settle('failed')),\n"), /logs/],
    ['a request', (s: string) => s.replace('  let current = 0;\n', "  let current = 0;\n  void fetch('/contact');\n"), /a request/],
  ] as const) {
    const mutated = mutate(SOURCE);
    assert.notEqual(mutated, SOURCE, `the mutation "${name}" must apply`);
    assert.match(auditSource(mutated).join('\n'), message, `"${name}" must be rejected`);
  }
});
