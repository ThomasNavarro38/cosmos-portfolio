/**
 * `contact-route.tsx` (6.3), rendered through the render harness
 * (`scripts/render.ts`): `ContactRouteView` for each label — one
 * `p.contact-route` holding the address as an `a.contact-address` to `mailto:`
 * and the address (its text, and so its accessible name, the address alone),
 * a space, then one `button.contact-copy` of `type="button"`, never disabled,
 * whose text is the label and whose click is the `onCopy` it was handed — and
 * `ContactRoute`'s first render, `copy`. Each check driven red against broken
 * markup.
 *
 * What a static render cannot run — the press, the late result, the unmount —
 * is the tracker's, executed in `contact.test.ts`; the binding is audited here
 * as source: the label's state, the tracker built once by a lazy `useState`
 * from the clipboard's bound `writeText` (or `undefined`) and that state's
 * setter, its stop the unmount's cleanup, the press handed to the view, and
 * the label read through `contactLabel` — each wiring break rejected.
 *
 * Beside the audit, the label executed (Epic 5 retro item 42): `ContactRoute`
 * mounted on the client (the harness's `mount`) under a fake `navigator`, its
 * button clicked, reads `copied` under a clipboard that resolves, `not copied`
 * under one that rejects (asked once), one without `writeText` and none, with
 * nothing logged — driven red once with the setter not
 * handed to the tracker.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { after, mock, test } from 'node:test';
import { React, elementsOf, parseMarkup, renderer, textOf, type MarkupElement, type Renderer } from '../../scripts/render.ts';
import { stripComments } from '../../scripts/source-scan.ts';
import { CONTACT, contactLabel } from './contact.ts';
import type { ContactRoute as ContactRouteComponent, ContactRouteView as ContactRouteViewComponent } from './contact-route.tsx';

// Set only once the server has started, so a failed start is not masked by its close.
let started: Renderer | undefined;
after(() => started?.close());
const harness = (started = await renderer());

const { ContactRoute, ContactRouteView } = await harness.load<{ ContactRoute: typeof ContactRouteComponent; ContactRouteView: typeof ContactRouteViewComponent }>('/src/shell/contact-route.tsx');

/** A press the view must hand the button, unchanged. */
const onCopy = (): void => undefined;

/** The route against `label`: the line, the mailto address, a space, the button reading `label` — nothing else. */
function routeDrawn(html: string, label: string): string[] {
  const roots = elementsOf(parseMarkup(html));
  if (roots.length !== 1) return [`${roots.length} elements rendered, not one line`];
  const route = roots[0] as MarkupElement;
  const failures: string[] = [];
  if (route.tag !== 'p' || JSON.stringify(route.attrs) !== JSON.stringify({ class: 'contact-route' })) failures.push(`the line is ${route.tag}${JSON.stringify(route.attrs)}, not p.contact-route`);
  const parts = elementsOf(route);
  const [link, button] = parts as [MarkupElement | undefined, MarkupElement | undefined];
  if (parts.length !== 2 || link?.tag !== 'a' || button?.tag !== 'button') return [...failures, `the line holds ${JSON.stringify(parts.map((part) => part.tag))}, not a link and a button`];
  if (JSON.stringify(link.attrs) !== JSON.stringify({ class: 'contact-address', href: `mailto:${CONTACT.address}` })) failures.push(`the link carries ${JSON.stringify(link.attrs)}`);
  if (elementsOf(link).length !== 0 || textOf(link) !== CONTACT.address) failures.push(`the link reads ${JSON.stringify(textOf(link))}, not the address alone`);
  if (JSON.stringify(button.attrs) !== JSON.stringify({ type: 'button', class: 'contact-copy' })) failures.push(`the button carries ${JSON.stringify(button.attrs)}`);
  if (elementsOf(button).length !== 0 || textOf(button) !== label) failures.push(`the button reads ${JSON.stringify(textOf(button))}, not ${JSON.stringify(label)}`);
  if (textOf(route) !== `${CONTACT.address} ${label}`) failures.push(`the line reads ${JSON.stringify(textOf(route))}`);
  return failures;
}

const renderView = (label: string): Promise<string> => harness.render(React.createElement(ContactRouteView, { label, onCopy }), { name: 'ContactRouteView' });

test('the view, for each label: the mailto address, then the button reading the label', async () => {
  for (const state of ['idle', 'copied', 'failed'] as const) {
    assert.deepEqual(routeDrawn(await renderView(contactLabel(state)), contactLabel(state)), [], state);
  }
});

test('the button’s click is the onCopy it was handed, and it is the one control with a click', async () => {
  await renderView(CONTACT.copy);
  const buttons = harness.elements('button');
  assert.equal(buttons.length, 1, 'one button');
  assert.equal((buttons[0] as { props: Record<string, unknown> }).props['onClick'], onCopy);
  assert.equal((harness.elements('a')[0] as { props: Record<string, unknown> }).props['onClick'], undefined, 'the link is a plain mailto link');
});

test('the route as bound, first render: copy', async () => {
  const html = await harness.render(React.createElement(ContactRoute), { name: 'ContactRoute' });
  assert.deepEqual(routeDrawn(html, CONTACT.copy), []);
});

test('the route check is red against broken markup', async () => {
  const real = await renderView(CONTACT.copy);
  for (const [name, markup] of [
    ['the address not a mailto link', real.replace(`href="mailto:${CONTACT.address}"`, `href="${CONTACT.address}"`)],
    ['the address unlinked', real.replace(/<a [^>]*>([^<]*)<\/a>/, '$1')],
    ['the address renamed', real.replace(`>${CONTACT.address}</a>`, '>email me</a>')],
    ['the address in a <code>', real.replace(`>${CONTACT.address}</a>`, `><code>${CONTACT.address}</code></a>`)],
    ['a title on the link', real.replace('<a class="contact-address"', '<a title="Email Thomas" class="contact-address"')],
    ['the button a submit', real.replace('type="button"', 'type="submit"')],
    ['the button disabled', real.replace('<button type="button" class="contact-copy">', '<button type="button" class="contact-copy" disabled="">')],
    ['the button relabelled', real.replace(`>${CONTACT.copy}</button>`, '>Copy email</button>')],
    ['a live region', real.replace('<button type="button" class="contact-copy">', '<button type="button" class="contact-copy" aria-live="polite">')],
    ['help text', real.replace('</button>', '</button><span>Click to copy</span>')],
    ['the button before the link', real.replace(/(<a [^>]*>[^<]*<\/a>) (<button [^>]*>[^<]*<\/button>)/, '$2 $1')],
    ['wrapped', `<div>${real}</div>`],
  ] as const) {
    assert.notEqual(markup, real, `the break "${name}" must apply`);
    assert.notDeepEqual(routeDrawn(markup, CONTACT.copy), [], `"${name}" must be rejected`);
  }
  assert.notDeepEqual(routeDrawn(await renderView(CONTACT.copied), CONTACT.copy), [], 'a label other than the one handed');
});

// --- The clipboard lookup, executed -------------------------------------------------------------------

/** Every `writeText` call a fake clipboard took: the text and the `this` it was called with. */
interface Write {
  readonly text: string;
  readonly self: unknown;
}

/** A clipboard whose `writeText` records each call and resolves. */
function fakeClipboard(): { readonly clipboard: { writeText(text: string): Promise<void> }; readonly writes: Write[] } {
  const writes: Write[] = [];
  const clipboard = {
    writeText(this: unknown, text: string): Promise<void> {
      writes.push({ text, self: this });
      return Promise.resolve();
    },
  };
  return { clipboard, writes };
}

/** `run` with `globalThis.navigator` replaced by `value` (`undefined` removes it), restored after, whatever happens. */
async function withNavigator<T>(value: unknown, run: () => Promise<T> | T): Promise<T> {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  if (value === undefined) Reflect.deleteProperty(globalThis, 'navigator');
  else Object.defineProperty(globalThis, 'navigator', { value, configurable: true, enumerable: true, writable: true });
  try {
    return await run();
  } finally {
    if (original === undefined) Reflect.deleteProperty(globalThis, 'navigator');
    else Object.defineProperty(globalThis, 'navigator', original);
  }
}

/** Every pending callback run. */
const settled = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

test('clipboardWrite: the clipboard’s own writeText, bound to it; undefined with no navigator, no clipboard or no writeText', async () => {
  const { clipboardWrite } = await harness.load<{ clipboardWrite: () => ((text: string) => Promise<void>) | undefined }>('/src/shell/contact-route.tsx');
  const board = fakeClipboard();
  await withNavigator({ clipboard: board.clipboard }, async () => {
    const write = clipboardWrite();
    assert.equal(typeof write, 'function', 'a writeText where the clipboard has one');
    await write?.(CONTACT.address);
    assert.deepEqual(board.writes, [{ text: CONTACT.address, self: board.clipboard }], 'called with the clipboard as this');
  });
  for (const [name, navigator] of [
    ['no navigator', undefined],
    ['no clipboard', {}],
    ['a null clipboard', { clipboard: null }],
    ['a clipboard lacking writeText', { clipboard: {} }],
    ['a writeText that is not a function', { clipboard: { writeText: 'x' } }],
  ] as const) {
    await withNavigator(navigator, () => assert.equal(clipboardWrite(), undefined, name));
  }
});

/** `ContactRoute` rendered under `navigator`, then its button's own recorded click run, and every callback settled. */
async function pressRendered(navigator: unknown): Promise<void> {
  await withNavigator(navigator, async () => {
    const html = await harness.render(React.createElement(ContactRoute), { name: 'ContactRoute' });
    assert.deepEqual(routeDrawn(html, CONTACT.copy), [], 'drawn, reading copy');
    const buttons = harness.elements('button');
    assert.equal(buttons.length, 1, 'one button');
    const onClick = (buttons[0] as { props: Record<string, unknown> }).props['onClick'];
    assert.equal(typeof onClick, 'function', 'the button carries a click');
    (onClick as () => void)();
    await settled();
  });
}

test('the rendered button’s click writes the address through the fake clipboard, bound to it, once', async () => {
  const board = fakeClipboard();
  await pressRendered({ clipboard: board.clipboard });
  assert.deepEqual(board.writes, [{ text: CONTACT.address, self: board.clipboard }]);
});

test('with no clipboard, or a clipboard lacking writeText, the click writes nothing and throws nothing', async () => {
  await pressRendered({});
  await pressRendered({ clipboard: {} });
  const board = fakeClipboard();
  await pressRendered({ clipboard: { other: board.clipboard.writeText } });
  assert.deepEqual(board.writes, [], 'nothing written');
});

// --- The binding, audited ---------------------------------------------------------------------------

const SOURCE = readFileSync(new URL('./contact-route.tsx', import.meta.url), 'utf8').replace(/\r\n/g, '\n');

function auditBinding(source: string): string[] {
  const code = stripComments(source);
  const failures: string[] = [];
  if (!/const \[state, setCopyState\] = useState<ContactCopyState>\('idle'\);/.test(code)) failures.push("the label's state is not useState<ContactCopyState>('idle')");
  if (!/const \[tracker\] = useState\(\(\) => createContactCopy\(clipboardWrite\(\), setCopyState\)\);/.test(code)) failures.push('the tracker is not built once from the clipboard and the setter');
  if (!/useEffect\(\(\) => \(\) => tracker\.stop\(\), \[tracker\]\);/.test(code)) failures.push('the unmount does not call the tracker’s stop');
  if (!/return <ContactRouteView label=\{contactLabel\(state\)\} onCopy=\{\(\) => tracker\.press\(\)\} \/>;/.test(code)) failures.push('the view is not handed contactLabel(state) and the press');
  if (!/const clipboard = typeof navigator === 'undefined' \? undefined : navigator\.clipboard;/.test(code) || !/return clipboard\.writeText\.bind\(clipboard\);/.test(code)) failures.push('writeText is not the clipboard’s own, bound, or undefined');
  if ((code.match(/\bsetCopyState\b/g) ?? []).length !== 2) failures.push('the setter used other than by the tracker');
  if ((code.match(/\buseEffect\(/g) ?? []).length !== 1) failures.push('an effect other than the unmount’s stop');
  if (/\bexecCommand\b|\bconsole\b|\bfetch\s*\(/.test(code)) failures.push('a copy, a log or a request beside the tracker');
  return failures;
}

test('ContactRoute binds the tracker: built once from the bound clipboard, stopped on unmount, its press handed to the view', () => {
  assert.deepEqual(auditBinding(SOURCE), []);
});

test('the binding audit rejects the real source with its wiring broken', () => {
  for (const [name, mutate] of [
    ['the stop dropped', (s: string) => s.replace('  useEffect(() => () => tracker.stop(), [tracker]);\n', '')],
    ['the tracker rebuilt every render', (s: string) => s.replace('const [tracker] = useState(() => createContactCopy(clipboardWrite(), setCopyState));', 'const tracker = createContactCopy(clipboardWrite(), setCopyState);')],
    ['the outcome never shown', (s: string) => s.replace('createContactCopy(clipboardWrite(), setCopyState)', 'createContactCopy(clipboardWrite(), () => undefined)')],
    ['the clipboard unbound', (s: string) => s.replace('return clipboard.writeText.bind(clipboard);', 'return clipboard.writeText;')],
    ['a label written in', (s: string) => s.replace('label={contactLabel(state)}', 'label={CONTACT.copy}')],
    ['the press not handed', (s: string) => s.replace('onCopy={() => tracker.press()}', 'onCopy={() => undefined}')],
    ['a legacy copy beside it', (s: string) => s.replace('  useEffect(() => () => tracker.stop(), [tracker]);\n', "  useEffect(() => () => tracker.stop(), [tracker]);\n  const legacy = () => document.execCommand('copy');\n")],
    ['a reset effect', (s: string) => s.replace('  useEffect(() => () => tracker.stop(), [tracker]);\n', "  useEffect(() => () => tracker.stop(), [tracker]);\n  useEffect(() => setCopyState('idle'), []);\n")],
  ] as const) {
    const mutated = mutate(SOURCE);
    assert.notEqual(mutated, SOURCE, `the mutation "${name}" must apply`);
    assert.notDeepEqual(auditBinding(mutated), [], `"${name}" must be rejected`);
  }
});

// --- The label, executed (Epic 5 retro item 42) ------------------------------------------------

/** `ContactRoute` mounted on the client under `navigator`, its button clicked; the label it then reads, once settled. */
async function labelAfterClick(navigator: unknown): Promise<string> {
  const mounted = await harness.mount(React.createElement(ContactRoute), { name: 'ContactRoute', globals: { navigator } });
  try {
    const button = mounted.container.querySelector('button.contact-copy') as HTMLButtonElement;
    assert.equal(button.textContent, CONTACT.copy, 'copy, before the press');
    await mounted.act(() => button.click());
    await mounted.waitFor(() => button.textContent !== CONTACT.copy, 'the label changed', 5_000);
    return button.textContent ?? '';
  } finally {
    await mounted.unmount();
  }
}

test('executed: a click reads copied under a clipboard that takes the address, not copied under one that refuses it, one without writeText, or none at all — nothing logged', async () => {
  const error = mock.method(console, 'error', () => undefined);
  try {
    const board = fakeClipboard();
    assert.equal(await labelAfterClick({ clipboard: board.clipboard }), CONTACT.copied, 'a resolving clipboard');
    assert.deepEqual(board.writes, [{ text: CONTACT.address, self: board.clipboard }], 'the address written, once');
    const refused: string[] = [];
    const refusing = { writeText: (text: string) => (refused.push(text), Promise.reject(new Error('denied'))) };
    assert.equal(await labelAfterClick({ clipboard: refusing }), CONTACT.failed, 'a rejecting clipboard');
    assert.deepEqual(refused, [CONTACT.address], 'the rejecting clipboard was asked once');
    assert.equal(await labelAfterClick({ clipboard: {} }), CONTACT.failed, 'a clipboard without writeText');
    assert.equal(await labelAfterClick({}), CONTACT.failed, 'no clipboard');
    assert.equal(error.mock.callCount(), 0, 'nothing logged');
  } finally {
    error.mock.restore();
  }
});
