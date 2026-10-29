/**
 * `corner-chrome.tsx` (3.8, 4.5, 4.6, 5.1), rendered through the render harness
 * (`scripts/render.ts`): the identity line and its two links — the model,
 * `a.chrome-route[href="/cosmos-portfolio/colophon"]`, its class `chrome-route` in every state
 * (5.1), then the chart, `a.chrome-route[href="/cosmos-portfolio/chart"]` — before the offer,
 * the chart's class exactly `chrome-route`, and after three gaps latch the
 * offer, the same link with `chrome-route chrome-route-offered`. The offer's latch and the navigation
 * store are driven through the module instances the harness loaded — the ones
 * the component reads — and reset after each test. Each check is driven red
 * against the other state and against broken markup. Since 4.8, each link's
 * click (the model's since 5.1) — the handler the render handed its `<a>`, read off the harness's
 * element recorder and run through a recording router — and the subscription to
 * the offer, read off its subscription recorder; each check red against a
 * broken handler or subscription list, never a source mutant.
 *
 * Plus the source audit of the renderer, moved here from `chrome-model.test.ts`
 * with its mutation rows: the subscriptions, the pace, the offer read only into
 * the link's class, the one persistent slot and its button, the hand-back, the
 * click rule, no state, no viewport, no ARIA. Retired, each held by the rendered
 * rows: the identity line's shape, the chart link's `href` and class (narrowed
 * to its click), the one-`<a>` count and the strings-written-here ban — with the
 * rows that targeted them. `chartRouteClass` and the stylesheet audits stay in
 * `chrome-model.test.ts`: they pin `chrome-model.ts` and the CSS.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { afterEach, after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { React, elementsOf, parseMarkup, queryAll, renderer, textOf, type MarkupElement, type Renderer } from '../../scripts/render.ts';
import { stripComments } from '../../scripts/source-scan.ts';
import type * as Activate from './activate.ts';
import type * as ChartOffer from './chart-offer.ts';
import type { CornerChrome as CornerChromeComponent } from './corner-chrome.tsx';
import { OVERVIEW_ID } from './index-model.ts';
import type * as MotionPreference from './motion-preference.ts';
import type { Route } from './route.ts';
import { followRoute, type RouteClick } from './route-link.ts';
import type { Router } from './router.ts';
import type * as State from './state.ts';

const CHROME_TSX = fileURLToPath(new URL('./corner-chrome.tsx', import.meta.url));

/** A file as the mutations see it: LF line endings, whatever the checkout wrote. */
const read = (path: string): string => readFileSync(path, 'utf8').replace(/\r\n/g, '\n');

// Set only once the server has started, so a failed start is not masked by its close.
let started: Renderer | undefined;
after(() => started?.close());
const harness = (started = await renderer());

const { CornerChrome } = await harness.load<{ CornerChrome: typeof CornerChromeComponent }>('/src/shell/corner-chrome.tsx');
// The instances the component imports: state driven through any other copy would never reach it.
const offer = await harness.load<typeof ChartOffer>('/src/shell/chart-offer.ts');
const state = await harness.load<typeof State>('/src/shell/state.ts');
const motion = await harness.load<typeof MotionPreference>('/src/shell/motion-preference.ts');
const doors = await harness.load<typeof Activate>('/src/shell/activate.ts');

afterEach(() => {
  offer.resetChartOfferForTest();
  state.resetNavigation();
  motion.setReducedMotion(false);
});

const router: Router = { route: () => 'home', subscribe: () => () => undefined, navigate: () => true, dispose: () => undefined };

async function renderChrome(withRouter: Router = router): Promise<string> {
  return harness.render(React.createElement(CornerChrome, { router: withRouter }), { name: 'CornerChrome' });
}

/** Latch the offer the way the scene would: `SUSTAINED_GAPS` frames over the cap in a row. */
function latchOffer(): void {
  for (let gap = 0; gap < offer.SUSTAINED_GAPS; gap += 1) offer.sampleFrame(offer.MAX_FRAME_SECONDS * 2);
  assert.equal(offer.chartOffered(), true, 'three gaps latch the offer');
}

/**
 * The chrome's two lines: the identity `<p>` — `THOMAS NAVARRO · `, the link
 * `the model` to `/colophon`, its class exactly `chrome-route` whatever the
 * offer (5.1), ` · `, and the link `the chart` to `/chart`, its class exactly
 * `expectedClass` — then the slot `<p>`; and no other link anywhere.
 */
function chromeLink(root: MarkupElement, expectedClass: string): string[] {
  const failures: string[] = [];
  const lines = elementsOf(root);
  const shape = lines.map((line) => `${line.tag}.${line.attrs['class'] ?? ''}`);
  if (JSON.stringify(shape) !== JSON.stringify(['p.chrome-identity', 'p.chrome-slot'])) return [`the chrome renders ${JSON.stringify(shape)}, not the identity line and the slot`];
  const identity = lines[0] as MarkupElement;
  if (textOf(identity) !== 'THOMAS NAVARRO · the model · the chart') failures.push(`the identity line reads ${JSON.stringify(textOf(identity))}`);
  const links = queryAll(root, 'a');
  if (links.length !== 2) failures.push(`${links.length} links in the chrome, not two`);
  const [model, link] = queryAll(identity, 'a');
  if (model === undefined || link === undefined) return [...failures, 'the identity line holds fewer than two links'];
  if (model.attrs['href'] !== '/cosmos-portfolio/colophon') failures.push(`the model link goes to ${model.attrs['href']}, not /cosmos-portfolio/colophon`);
  if (textOf(model) !== 'the model') failures.push(`the model link reads ${JSON.stringify(textOf(model))}`);
  if (model.attrs['class'] !== 'chrome-route') failures.push(`the model link's class is ${JSON.stringify(model.attrs['class'])}, not "chrome-route": the offer is the chart link's alone`);
  if (link.attrs['href'] !== '/cosmos-portfolio/chart') failures.push(`the link goes to ${link.attrs['href']}, not /cosmos-portfolio/chart`);
  if (textOf(link) !== 'the chart') failures.push(`the link reads ${JSON.stringify(textOf(link))}`);
  if (link.attrs['class'] !== expectedClass) failures.push(`the link's class is ${JSON.stringify(link.attrs['class'])}, not ${JSON.stringify(expectedClass)}`);
  if (elementsOf(identity).length !== 2) failures.push('the identity line holds an element beside its two links');
  return failures;
}

// --- The offer, rendered ---------------------------------------------------------------------

test('before the offer: a.chrome-route[href="/cosmos-portfolio/colophon"], the model, then a.chrome-route[href="/cosmos-portfolio/chart"], the chart, its class exactly chrome-route', async () => {
  assert.equal(offer.chartOffered(), false);
  assert.deepEqual(chromeLink(parseMarkup(await renderChrome()), 'chrome-route'), []);
});

test('after the offer: three gaps latch it, and the chart link carries chrome-route chrome-route-offered; the model link stays chrome-route', async () => {
  latchOffer();
  assert.deepEqual(chromeLink(parseMarkup(await renderChrome()), 'chrome-route chrome-route-offered'), []);
});

test('the latch is reset after each test: the next render is unoffered again', async () => {
  assert.equal(offer.chartOffered(), false);
  assert.deepEqual(chromeLink(parseMarkup(await renderChrome()), 'chrome-route'), []);
});

test('the chrome check is red against the other state and against broken markup', async () => {
  const before = await renderChrome();
  assert.notDeepEqual(chromeLink(parseMarkup(before), 'chrome-route chrome-route-offered'), [], 'unoffered, read as offered');
  latchOffer();
  const offered = await renderChrome();
  assert.notDeepEqual(chromeLink(parseMarkup(offered), 'chrome-route'), [], 'offered, read as unoffered');
  for (const [name, markup] of [
    ['the link to the colophon', before.replace('href="/cosmos-portfolio/chart"', 'href="/cosmos-portfolio/colophon"')],
    ['the model to the chart', before.replace('href="/cosmos-portfolio/colophon"', 'href="/cosmos-portfolio/chart"')],
    ['the model renamed', before.replace('>the model</a>', '>model</a>')],
    ['the model offered', before.replace('<a class="chrome-route" href="/cosmos-portfolio/colophon">', '<a class="chrome-route chrome-route-offered" href="/cosmos-portfolio/colophon">')],
    ['the links swapped', before.replace('<a class="chrome-route" href="/cosmos-portfolio/colophon">the model</a> · <a class="chrome-route" href="/cosmos-portfolio/chart">the chart</a>', '<a class="chrome-route" href="/cosmos-portfolio/chart">the chart</a> · <a class="chrome-route" href="/cosmos-portfolio/colophon">the model</a>')],
    ['the link renamed', before.replace('>the chart</a>', '>chart</a>')],
    ['the link dropped', before.replace(/<a [^>]*>the chart<\/a>/, 'the chart')],
    ['the link a button', before.replace(/<a ([^>]*)>the chart<\/a>/, '<button $1>the chart</button>')],
    ['the model unlinked', before.replace('<a class="chrome-route" href="/cosmos-portfolio/colophon">the model</a>', 'the model')],
    ['a link beside the slot', before.replace('<p class="chrome-slot"', '<a href="/cosmos-portfolio/">x</a><p class="chrome-slot"')],
    ['the identity rewritten', before.replace('THOMAS NAVARRO', 'Thomas Navarro')],
    ['a third line', `${before}<p class="chrome-hud">rail</p>`],
  ] as const) {
    assert.notEqual(markup, before, `the break "${name}" must apply`);
    assert.notDeepEqual(chromeLink(parseMarkup(markup), 'chrome-route'), [], `"${name}" must be rejected`);
  }
});

// --- The click and the subscription, rendered (4.8) ----------------------------------------

/** A router whose `navigate` is recorded and answers `accept`: the one the rendered handler is bound to. */
const recording = { calls: [] as Route[], accept: true };
const recordingRouter: Router = {
  route: () => 'home',
  subscribe: () => () => undefined,
  navigate: (to) => {
    recording.calls.push(to);
    return recording.accept;
  },
  dispose: () => undefined,
};

/** A click as `followRoute` reads it, counting its `preventDefault` calls. */
function fakeClick(init: Partial<Pick<RouteClick, 'button' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey' | 'defaultPrevented'>> = {}): RouteClick & { prevented: number } {
  const click = {
    button: 0,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    defaultPrevented: false,
    prevented: 0,
    ...init,
    // As a real event: the call is counted, and the event reads prevented from then on.
    preventDefault() {
      click.prevented += 1;
      click.defaultPrevented = true;
    },
  };
  return click;
}

/**
 * The click rule, run on `handler` — the `onClick` the link `name` was handed —
 * through `recording`: a primary click the router takes navigates to `to` once
 * and prevents the default once; a refused one navigates once and prevents
 * nothing; a Ctrl-click and a middle click do neither.
 */
function followsRouteRule(name: string, handler: unknown, to: Route): string[] {
  if (typeof handler !== 'function') return [`${name}: no click handler`];
  const failures: string[] = [];
  const cases: readonly (readonly [string, boolean, Parameters<typeof fakeClick>[0], readonly Route[], number])[] = [
    ['a primary click, taken', true, {}, [to], 1],
    ['a primary click, refused', false, {}, [to], 0],
    ['a Ctrl-click', true, { ctrlKey: true }, [], 0],
    ['a Shift-click', true, { shiftKey: true }, [], 0],
    ['a Meta-click', true, { metaKey: true }, [], 0],
    ['an Alt-click', true, { altKey: true }, [], 0],
    ['a middle click', true, { button: 1 }, [], 0],
    ['a click already prevented', true, { defaultPrevented: true }, [], 0],
  ];
  try {
    for (const [scenario, accept, init, calls, prevented] of cases) {
      recording.calls = [];
      recording.accept = accept;
      const event = fakeClick(init);
      (handler as (event: RouteClick) => void)(event);
      if (JSON.stringify(recording.calls) !== JSON.stringify(calls)) failures.push(`${name}: ${scenario} navigates ${JSON.stringify(recording.calls)}, not ${JSON.stringify(calls)}`);
      if (event.prevented !== prevented) failures.push(`${name}: ${scenario} prevents the default ${event.prevented} times, not ${prevented}`);
    }
  } finally {
    recording.calls = [];
    recording.accept = true;
  }
  return failures;
}

/** The handler the rendered chrome handed its one `<a href={href}>`. */
async function linkHandler(href: '/cosmos-portfolio/chart' | '/cosmos-portfolio/colophon'): Promise<unknown> {
  await renderChrome(recordingRouter);
  const links = harness.elements('a').filter((element) => element.props['href'] === href);
  assert.equal(links.length, 1, `the chrome rendered exactly one link to ${href}`);
  return links[0]?.props['onClick'];
}

const chartLinkHandler = (): Promise<unknown> => linkHandler('/cosmos-portfolio/chart');

test('the chrome’s the chart, clicked: primary → navigate(chart) once and preventDefault once; refused → no preventDefault; Ctrl or middle → neither', async () => {
  assert.deepEqual(followsRouteRule('the chart', await chartLinkHandler(), 'chart'), []);
});

test('the chrome’s the model, clicked (5.1): primary → navigate(colophon) once and preventDefault once; refused → no preventDefault; Ctrl or middle → neither', async () => {
  assert.deepEqual(followsRouteRule('the model', await linkHandler('/cosmos-portfolio/colophon'), 'colophon'), []);
  assert.notDeepEqual(followsRouteRule('the model', await linkHandler('/cosmos-portfolio/colophon'), 'chart'), [], 'the real handler, read as a link to the chart');
});

test('the click check is red against a broken handler: one that never prevents the default, one to the wrong route, one navigating on every click, none', async () => {
  assert.notDeepEqual(followsRouteRule('the chart', await chartLinkHandler(), 'colophon'), [], 'the real handler, read as a link to the colophon');
  const broken: readonly (readonly [string, unknown])[] = [
    ['never preventDefault', (event: RouteClick) => void (event.button === 0 && recordingRouter.navigate('chart'))],
    ['the wrong route', (event: RouteClick) => followRoute(event, recordingRouter.navigate, 'colophon')],
    ['every click navigates', (event: RouteClick) => (recordingRouter.navigate('chart') ? event.preventDefault() : undefined)],
    ['prevented whatever the router says', (event: RouteClick) => (event.button === 0 && !event.ctrlKey ? (recordingRouter.navigate('chart'), event.preventDefault()) : undefined)],
    ['no handler', undefined],
  ];
  for (const [name, handler] of broken) {
    const failures = followsRouteRule('the chart', handler, 'chart');
    assert.notDeepEqual(failures, [], `"${name}" must be rejected`);
    assert.ok(failures.every((failure) => failure.startsWith('the chart: ')), `"${name}": each failure names the link`);
  }
});

/** The rendered chrome subscribes to the offer: `subscribeChartOffer`, the instance the harness loaded, among the stores it hands `useSyncExternalStore`. */
function subscribesToOffer(subscriptions: readonly unknown[]): string[] {
  return subscriptions.includes(offer.subscribeChartOffer) ? [] : ['the chrome does not subscribe to the offer — a latch would leave a running scene’s link unoffered'];
}

test('the chrome subscribes to the offer: subscribeChartOffer, from the loaded chart-offer.ts, is among the stores it hands useSyncExternalStore', async () => {
  await renderChrome();
  const subscriptions = harness.subscriptions();
  assert.deepEqual(subscribesToOffer(subscriptions), []);
  assert.ok(subscriptions.includes(motion.subscribeReducedMotion), 'and to the preference, as the pace is read');
});

test('the subscription check is red against a list holding only subscribeReducedMotion, or a store that is not the offer', () => {
  assert.notDeepEqual(subscribesToOffer([motion.subscribeReducedMotion]), []);
  assert.notDeepEqual(subscribesToOffer([motion.subscribeReducedMotion, () => () => undefined]), [], 'a store that is not the offer');
  assert.notDeepEqual(subscribesToOffer([]), []);
});

// --- The hand-back, executed --------------------------------------------------------------------

/**
 * The chrome mounted on the client, beside an `overview` target, with the store
 * put in its state by `arrange`; then `act` on the slot's button, focused first.
 * Where DOM focus lands after the act.
 *
 * Two guards are not observable here, because React's commit restores focus to
 * whatever held it before, if that is still in the document: the `:focus`
 * check (happy-dom lets the restored element be `<body>`, undoing an unfocused
 * button's hand-back), and the stable `useCallback` (an inline ref's cleanup on
 * a re-render moves focus to `overview`, and the restore moves it straight
 * back). The source audit below holds both.
 */
async function focusAfter(arrange: () => void, act: (button: HTMLButtonElement) => void): Promise<'overview' | 'button' | 'body' | 'elsewhere'> {
  // Each case starts from the initial store and full motion, whatever the last left.
  state.resetNavigation();
  motion.setReducedMotion(false);
  const mounted = await harness.mount(React.createElement(CornerChrome, { router }), { name: 'CornerChrome' });
  try {
    const document = mounted.container.ownerDocument;
    const overview = document.createElement('h2');
    overview.id = OVERVIEW_ID;
    overview.tabIndex = -1;
    document.body.prepend(overview);
    await mounted.act(arrange);
    const button = mounted.container.querySelector<HTMLButtonElement>('button.chrome-slot-control');
    assert.ok(button !== null, 'the slot is a control before the act');
    button.focus();
    assert.equal(document.activeElement, button, 'the button holds focus');
    await mounted.act(() => act(button));
    const active: Element | null = document.activeElement;
    if (active === overview) return 'overview';
    if (active === button) return 'button';
    return active === document.body ? 'body' : 'elsewhere';
  } finally {
    await mounted.unmount();
  }
}

const inFlight = (): void => state.enterFreeFlight(null);

test('executed: resuming from a focused return button — a click, Escape or Home — hands focus to overview, never <body>', async () => {
  assert.equal(await focusAfter(inFlight, (button) => button.click()), 'overview', 'a click');
  assert.equal(await focusAfter(inFlight, () => doors.releaseLayer()), 'overview', 'Escape');
  assert.equal(await focusAfter(inFlight, () => doors.goHome()), 'overview', 'Home');
});

test('executed: the hand-back moves no focus on a re-render, or on a release', async () => {
  assert.equal(await focusAfter(inFlight, () => motion.setReducedMotion(true)), 'button', 'a re-render keeps the button, and its focus');
  // Focused on the Rail, the button reads release; its focus target is focusMove's alone.
  const focusedOnRail = (): void => state.focusProject('project:a');
  assert.equal(await focusAfter(focusedOnRail, () => doors.releaseLayer()), 'body', 'a release from the Rail');
  // A release in free flight keeps the same element, now reading resume: no cleanup runs.
  const focusedInFlight = (): void => {
    state.enterFreeFlight(null);
    state.focusProject('project:a');
  };
  assert.equal(await focusAfter(focusedInFlight, () => doors.releaseLayer()), 'button', 'the button stays, and so does focus');
});

// --- The renderer stays thin -----------------------------------------------------------------

/**
 * `corner-chrome.tsx` as a pure function over its source: exactly two chrome
 * elements — the identity `<p>` and one persistent slot `<p>`, mounted in every
 * state and carrying the style, whose content is the instruction text or one
 * `<button>` — two selector subscriptions, the pace, and the hand-back, each
 * pinned positively; no name but the visible text, no store event, no rule of
 * its own.
 *
 * The slot is one element so its `right` transition runs on Rail ↔ Focus too: a
 * slot swapped between a `<p>` and a `<button>` mounts the new element at its
 * final `right`, and jumps (Spec Change Log, loop 1). The hand-back runs only
 * when the button's last action — its own `data-action`, not the store — was
 * `return`: a release's focus target is `focusMove`'s alone.
 */
function auditChrome(source: string): string[] {
  const code = stripComments(source);
  const failures: string[] = [];
  if (!/const\s+mode\s*=\s*useStore\(\s*navigationStore\s*,\s*\(\s*(\w+)\s*\)\s*=>\s*\1\.mode\s*\)/.test(code)) failures.push('does not subscribe to mode with a selector');
  if (!/const\s+focusedProjectId\s*=\s*useStore\(\s*navigationStore\s*,\s*\(\s*(\w+)\s*\)\s*=>\s*\1\.focusedProjectId\s*\)/.test(code)) {
    failures.push('does not subscribe to focusedProjectId with a selector');
  }
  if ((code.match(/\buseStore\s*\(/g) ?? []).length !== 2) failures.push('subscribes other than twice');
  if (/\bgetState\b|\bsubscribe\s*\(/.test(code)) failures.push('reads the store outside its two selectors');
  if (!/const\s+pace\s*=\s*motionPace\(\s*useSyncExternalStore\(\s*subscribeReducedMotion\s*,\s*reducedMotion\s*\)\s*\)\s*;/.test(code)) {
    failures.push('the pace is not motionPace of the preference, read through useSyncExternalStore');
  }
  // 4.6: the offer, read the same way, and only into the link's class.
  if (!/const\s+offered\s*=\s*useSyncExternalStore\(\s*subscribeChartOffer\s*,\s*chartOffered\s*\)\s*;/.test(code)) {
    failures.push('the offer is not chartOffered, read through useSyncExternalStore');
  }
  if (!/import\s*\{\s*chartOffered\s*,\s*subscribeChartOffer\s*\}\s*from\s*'\.\/chart-offer\.ts'/.test(code)) failures.push('the offer is not chart-offer.ts’s');
  if (!/import\s*\{[^}]*\bchartRouteClass\b[^}]*\}\s*from\s*'\.\/chrome-model\.ts'/.test(code)) failures.push('the link’s class is not the model’s chartRouteClass');
  if ((code.match(/\boffered\b/g) ?? []).length !== 2) failures.push('the offer is read for something other than the link’s class');
  if (/\b(?:sampleFrame|resetFrameSampling)\b/.test(code)) failures.push('the chrome samples or resets the monitor — it only reads the offer');
  if ((code.match(/\buseSyncExternalStore\s*\(/g) ?? []).length !== 2) failures.push('the preference and the offer are read other than once each');
  if (/\bsetReducedMotion\b/.test(code)) failures.push('the chrome writes the preference — mount.tsx is its one writer');
  if (!/const\s+slot\s*=\s*chromeSlot\(\s*mode\s*,\s*focusedProjectId\s*\)\s*;/.test(code)) failures.push('the slot is not chromeSlot(mode, focusedProjectId)');
  if (!/const\s+style\s*=\s*slotStyle\(\s*focusedProjectId\s*!==\s*null\s*,\s*pace\s*\)\s*;/.test(code)) failures.push('the style is not slotStyle(focused, pace)');
  if ((code.match(/\bchromeSlot\(/g) ?? []).length !== 1 || (code.match(/\bslotStyle\(/g) ?? []).length !== 1) failures.push('the model is asked other than once');
  // Exactly two chrome elements: the identity line, and one persistent slot.
  // 4.5: the identity line ends in one link to the chart. Its shape, its href,
  // its text and its class (4.6) are the rendered rows' since 4.7; what no render
  // shows is its click — `followRoute`'s, to the chart, through the router.
  if (!/<a\b[^>]*\bonClick=\{\(\s*(\w+)\s*\)\s*=>\s*followRoute\(\s*\1\s*,\s*router\.navigate\s*,\s*'chart'\s*\)\}\s*>/.test(code)) {
    failures.push('the chart link’s click is not followRoute(event, router.navigate, \'chart\')');
  }
  // 5.1: `the model`, the route to the Colophon: the same click rule, and its
  // class plain `chrome-route` at the source, since the offer is the chart link's alone.
  if (!/<a\b[^>]*\bonClick=\{\(\s*(\w+)\s*\)\s*=>\s*followRoute\(\s*\1\s*,\s*router\.navigate\s*,\s*'colophon'\s*\)\}\s*>\s*\{\s*IDENTITY_MODEL\s*\}\s*<\/a>/.test(code)) {
    failures.push('the model link’s click is not followRoute(event, router.navigate, \'colophon\')');
  }
  if (!/<a\s+className="chrome-route"\s+href=\{\s*routeHref\('colophon'\)\s*\}/.test(code) || (code.match(/className="chrome-route"/g) ?? []).length !== 1) {
    failures.push('the model link’s class is not plain chrome-route');
  }
  if (!/export\s+function\s+CornerChrome\(\s*\{\s*router\s*\}\s*:\s*\{\s*readonly\s+router\s*:\s*Router\s*\}\s*\)/.test(code)) failures.push('the chrome does not take the router as its one prop');
  if (!/import\s*\{\s*CHART_LINK_TEXT\s*,\s*followRoute\s*\}\s*from\s*'\.\/route-link\.ts'/.test(code)) failures.push('the link text and click are not route-link.ts’s');
  if (/\bnavigate\(/.test(code)) failures.push('the chrome navigates itself — the click is followRoute’s');
  const slot =
    /<p\s+className="chrome-slot"\s+style=\{\s*style\s*\}\s*>\s*\{\s*slot\.kind\s*===\s*'control'\s*\?\s*\(\s*<button\s+type="button"\s+ref=\{\s*handBack\s*\}\s+className="chrome-slot-control"\s+data-action=\{\s*slot\.action\s*\}\s+onClick=\{\(\s*(\w+)\s*\)\s*=>\s*\(\s*\1\.detail\s*>\s*1\s*\?\s*undefined\s*:\s*slot\.action\s*===\s*'return'\s*\?\s*returnToRail\(\)\s*:\s*releaseLayer\(\)\s*\)\}\s+onKeyDown=\{\(\s*(\w+)\s*\)\s*=>\s*\{\s*if\s*\(\s*\2\.repeat\s*&&\s*\2\.key\s*===\s*'Enter'\s*\)\s*\2\.preventDefault\(\)\s*;?\s*\}\s*\}\s*>\s*\{\s*slot\.text\s*\}\s*<\/button>\s*\)\s*:\s*\(\s*slot\.text\s*\)\s*\}\s*<\/p>/;
  if (!slot.test(code)) {
    failures.push('the slot is not one persistent <p> carrying the style, holding the control <button> — its action carried, a multi-click’s later clicks and a held Enter’s repeats ignored, its door by action, its text its name — or the instruction text');
  }
  if ((code.match(/\bstyle=\{/g) ?? []).length !== 1) failures.push('the style is not on the one persistent slot element');
  if (/\bkey=\{/.test(code)) failures.push('a key — a keyed slot remounts, and jumps');
  if ((code.match(/<button\b/g) ?? []).length > 1) failures.push('more than one <button>');
  if (
    (code.match(/className="chrome-identity"/g) ?? []).length !== 1 ||
    (code.match(/className="chrome-slot"/g) ?? []).length !== 1 ||
    (code.match(/className="chrome-slot-control"/g) ?? []).length !== 1 ||
    (code.match(/className=\{chartRouteClass\(/g) ?? []).length !== 1
  ) {
    failures.push('a third chrome line, or a slot drawn twice');
  }
  const elements = code.match(/<[a-zA-Z][\w.]*/g) ?? [];
  if (elements.length !== 5) failures.push(`elements other than the identity, its two links, the slot and its button — found ${elements.join(' ')}`);
  // The name is the visible text.
  if (/\baria-[\w-]+=|\btitle=|\balt=/.test(code)) failures.push('an ARIA or title attribute — the name is the visible text');
  if (/\btabIndex=/.test(code)) failures.push('a tabIndex — the instruction is text, the button focusable by default');
  // No store event, and only the two doors.
  if (/\b(?:focusProject|enterFreeFlight|enterRail|releaseFocus|advanceScroll|hoverProject|keyboardApproach|resetNavigation)\b|\.setState\b|\bsetState\b\s*[:,)}]/.test(code)) {
    failures.push('a store event called directly — the slot opens a door in activate.ts');
  }
  if (/\b(?:pullBack|goHome|activateClient|activateProject|approachByKeyboard|leaveByKeyboard)\b/.test(code)) failures.push('a door other than return and release');
  if (!/import\s*\{\s*releaseLayer\s*,\s*returnToRail\s*\}\s*from\s*'\.\/activate\.ts'/.test(code)) failures.push('the doors are not activate.ts’s');
  if ((code.match(/\bonClick\b/g) ?? []).length !== 3) failures.push('a handler beyond the slot’s and the two links’');
  if (/\bon(?:Mouse|Pointer|Key(?!Down=)|Focus|Blur|Wheel|Scroll)\w*=/.test(code) || (code.match(/\bonKeyDown=/g) ?? []).length !== 1) failures.push('reacts to hover, pointer, keys or focus — the slot is a plain control');
  // The hand-back: a stable ref cleanup, focus to overview by its id, exactly when
  // the button held it and its last action was `return`, read off the element.
  if (
    !/const\s+handBack\s*=\s*useCallback\(\s*\(\s*button\s*:\s*HTMLButtonElement\s*\|\s*null\s*\)\s*=>\s*\(\)\s*=>\s*\{\s*if\s*\(\s*button\?\.dataset\.action\s*===\s*'return'\s*&&\s*button\.matches\(\s*':focus'\s*\)\s*\)\s*document\.getElementById\(\s*OVERVIEW_ID\s*\)\?\.focus\(\)\s*;\s*\}\s*,\s*\[\s*\]\s*,?\s*\)/.test(
      code,
    )
  ) {
    failures.push('the button’s unmount does not hand DOM focus to overview — only after a return, exactly when it holds focus — from a stable ref cleanup');
  }
  if (!/import\s*\{\s*OVERVIEW_ID\s*\}\s*from\s*'\.\/index-model\.ts'/.test(code)) failures.push('OVERVIEW_ID is not the model’s');
  if ((code.match(/\.focus\(/g) ?? []).length !== 1) failures.push('DOM focus is moved other than once, in the hand-back');
  if ((code.match(/\bref=\{/g) ?? []).length !== 1) failures.push('a ref other than the hand-back');
  // No rule and no state of its own.
  if (/\buseState\b|\buseReducer\b|\buseMemo\b|\buseRef\b|\buseEffect\b|\buseLayoutEffect\b/.test(code)) failures.push('keeps state or effects of its own');
  if (/\bwindow\b|innerWidth|innerHeight|getBoundingClientRect|matchMedia/.test(code)) failures.push('reads the viewport');
  if (/\bstyle=\{\{|textTransform|fontWeight|toUpperCase|toLowerCase/.test(code)) failures.push('an inline style literal or a recasing — the treatment is corner-chrome.css and the model');
  if ((code.match(/^import\s+'\.\/corner-chrome\.css'\s*;/gm) ?? []).length !== 1) failures.push('the stylesheet is not imported, once');
  return failures;
}

test('the chrome renderer is a mapping over the model, and holds only what the header names', () => {
  assert.deepEqual(auditChrome(read(CHROME_TSX)), []);
});

/** The slot as attempt 1 drew it: a `<p>` or a `<button>` swapped by kind — the element that jumped. */
const SWAPPED_SLOT = `{slot.kind === 'control' ? (
        <button
          type="button"
          ref={handBack}
          className="chrome-slot-control"
          data-action={slot.action}
          style={style}
          onClick={() => (slot.action === 'return' ? returnToRail() : releaseLayer())}
        >
          {slot.text}
        </button>
      ) : (
        <p className="chrome-slot" style={style}>
          {slot.text}
        </p>
      )}
`;

/**
 * The failure each renderer mutation targets: a mutation that trips some other
 * check alone would pass while its own check lay dead. Where the slot's one
 * expression is the only check for a guarantee, the target is that expression.
 */
const CHROME_TARGETS: ReadonlyMap<string, string> = new Map([
  ['a whole-store subscription', 'does not subscribe to mode with a selector'],
  ['the wrong field selected', 'does not subscribe to focusedProjectId'],
  ['a third subscription', 'subscribes other than twice'],
  ['the slot read off the hover', 'the slot is not chromeSlot(mode, focusedProjectId)'],
  ['the pace ignoring the preference', 'the pace is not motionPace'],
  ['the style never focused', 'the style is not slotStyle(focused, pace)'],
  ['the style at full motion always', 'the style is not slotStyle(focused, pace)'],
  ['a third line', 'elements other than the identity, its two links, the slot and its button'],
  ['a second button', 'more than one <button>'],
  ['the chart link navigating on every click', 'the chart link’s click is not followRoute'],
  ['the chart link to the colophon', 'the chart link’s click is not followRoute'],
  ['the router not a prop', 'the chrome does not take the router as its one prop'],
  ['a click rule of its own', 'the chrome navigates itself'],
  ['the identity recased', 'a recasing'],
  ['an aria-label', 'an ARIA or title attribute'],
  ['an aria-labelledby', 'an ARIA or title attribute'],
  ['a title', 'an ARIA or title attribute'],
  ['the button named by something else', 'the slot is not one persistent'],
  ['every action returns', 'the slot is not one persistent'],
  ['the doors transposed', 'the slot is not one persistent'],
  ['the store called directly', 'a store event called directly'],
  ['the overview door', 'a door other than return and release'],
  ['the instruction focusable', 'a tabIndex'],
  ['the instruction a button', 'more than one <button>'],
  ['the control always shown', 'the slot is not one persistent'],
  ['two button elements for two actions', 'the slot is not one persistent'],
  ['the slot swapped between a <p> and a <button>', 'the style is not on the one persistent slot element'],
  ['the style on the button, not the slot', 'the slot is not one persistent'],
  ['the slot remounted by kind', 'a key — a keyed slot remounts'],
  ['the action not carried', 'the slot is not one persistent'],
  ['the action read off the store', 'reads the store outside its two selectors'],
  ['a hand-back on a release too', 'the button’s unmount does not hand DOM focus'],
  ['a hand-back keyed on a release', 'the button’s unmount does not hand DOM focus'],
  ['the hand-back dropped', 'a ref other than the hand-back'],
  ['focus left on the unmounted button', 'DOM focus is moved other than once'],
  ['focus taken whether or not the button held it', 'the button’s unmount does not hand DOM focus'],
  ['focus moved on mount, not on unmount', 'the button’s unmount does not hand DOM focus'],
  ['a hand-back with dependencies', 'the button’s unmount does not hand DOM focus'],
  ['an inline hand-back', 'DOM focus is moved other than once'],
  ['focus to an id written here', 'the button’s unmount does not hand DOM focus'],
  ['focus moved by the click as well', 'DOM focus is moved other than once'],
  ['the multi-click guard dropped', 'the slot is not one persistent'],
  ['the guard ignoring the first click too', 'the slot is not one persistent'],
  ['the guard inverted', 'the slot is not one persistent'],
  ['the repeat guard dropped', 'reacts to hover, pointer, keys or focus'],
  ['the repeat guard inverted', 'the slot is not one persistent'],
  ['the repeat guard on every held key', 'the slot is not one persistent'],
  ['the repeat guard on another key', 'the slot is not one persistent'],
  ['the repeat guard stops propagation instead', 'the slot is not one persistent'],
  ['a second key handler', 'reacts to hover, pointer, keys or focus'],
  ['an inline style literal', 'an inline style literal'],
  ['the stylesheet not imported', 'the stylesheet is not imported'],
  ['local state', 'keeps state or effects of its own'],
  ['a hover handler', 'reacts to hover, pointer, keys or focus'],
  ['a viewport read', 'reads the viewport'],
  // 4.6: the offer.
  ['the offer never read', 'the offer is not chartOffered'],
  ['the offer read off the store', 'the offer is not chartOffered'],
  ['the offer drawn as a line', 'the offer is read for something other than the link’s class'],
  ['the offer named', 'an ARIA or title attribute'],
  ['the chrome samples frames', 'the chrome samples or resets the monitor'],
  ['the class not the model’s', 'the link’s class is not the model’s chartRouteClass'],
  // 5.1: the model link.
  ['the model link navigating on every click', 'the model link’s click is not followRoute'],
  ['the model link to the chart', 'the model link’s click is not followRoute'],
  ['the model link dropped', 'the model link’s click is not followRoute'],
  ['the model link offered', 'the model link’s class is not plain chrome-route'],
  ['the model link with a class of its own', 'the model link’s class is not plain chrome-route'],
  ['a third link handler', 'a handler beyond the slot’s and the two links’'],
]);

test('the chrome audit rejects the real renderer with any one guarantee broken', () => {
  const real = read(CHROME_TSX);
  const mutations: readonly (readonly [string, (source: string) => string])[] = [
    ['a whole-store subscription', (s) => s.replace('useStore(navigationStore, (state) => state.mode)', 'useStore(navigationStore).mode')],
    ['the wrong field selected', (s) => s.replace('(state) => state.focusedProjectId', '(state) => state.hoveredProjectId')],
    ['a third subscription', (s) => s.replace('const pace =', 'const origin = useStore(navigationStore, (state) => state.focusOrigin);\n  const pace =')],
    ['the slot read off the hover', (s) => s.replace('chromeSlot(mode, focusedProjectId)', 'chromeSlot(mode, navigationStore.getState().hoveredProjectId)')],
    ['the pace ignoring the preference', (s) => s.replace('motionPace(useSyncExternalStore(subscribeReducedMotion, reducedMotion))', 'motionPace(false)')],
    ['the style never focused', (s) => s.replace('slotStyle(focusedProjectId !== null, pace)', 'slotStyle(false, pace)')],
    ['the style at full motion always', (s) => s.replace('slotStyle(focusedProjectId !== null, pace)', 'slotStyle(focusedProjectId !== null)')],
    ['a third line', (s) => s.replace('{CHART_LINK_TEXT}</a>\n      </p>', '{CHART_LINK_TEXT}</a>\n      </p>\n      <p className="chrome-hud">{mode}</p>')],
    ['a second button', (s) => s.replace('{CHART_LINK_TEXT}</a>\n      </p>', '{CHART_LINK_TEXT}</a>\n      </p>\n      <button type="button" onClick={() => releaseLayer()}>esc</button>')],
    ['the chart link navigating on every click', (s) => s.replace("onClick={(event) => followRoute(event, router.navigate, 'chart')}", "onClick={() => router.navigate('chart')}")],
    ['the chart link to the colophon', (s) => s.replace("followRoute(event, router.navigate, 'chart')", "followRoute(event, router.navigate, 'colophon')")],
    ['the router not a prop', (s) => s.replace('export function CornerChrome({ router }: { readonly router: Router }) {', 'export function CornerChrome() {\n  const router = window.router as Router;')],
    ['a click rule of its own', (s) => s.replace("onClick={(event) => followRoute(event, router.navigate, 'chart')}", "onClick={(event) => (event.button === 0 ? (event.preventDefault(), router.navigate('chart')) : undefined)}")],
    ['the identity recased', (s) => s.replace('{IDENTITY_NAME}', '{IDENTITY_NAME.toLowerCase()}')],
    ['an aria-label', (s) => s.replace('className="chrome-slot-control"', 'className="chrome-slot-control"\n            aria-label={slot.text}')],
    ['an aria-labelledby', (s) => s.replace('type="button"', 'type="button" aria-labelledby="chrome"')],
    ['a title', (s) => s.replace('type="button"', 'type="button" title="Escape"')],
    ['the button named by something else', (s) => s.replace('{slot.text}\n          </button>', '{slot.action}\n          </button>')],
    ['every action returns', (s) => s.replace("slot.action === 'return' ? returnToRail() : releaseLayer()", 'returnToRail()')],
    ['the doors transposed', (s) => s.replace("slot.action === 'return' ? returnToRail() : releaseLayer()", "slot.action === 'return' ? releaseLayer() : returnToRail()")],
    ['the store called directly', (s) => s.replace("slot.action === 'return' ? returnToRail() : releaseLayer()", "slot.action === 'return' ? enterRail() : releaseFocus()")],
    ['the overview door', (s) => s.replace("slot.action === 'return' ? returnToRail() : releaseLayer()", "slot.action === 'return' ? pullBack() : releaseLayer()")],
    ['the instruction focusable', (s) => s.replace('<p className="chrome-slot" style={style}>', '<p className="chrome-slot" style={style} tabIndex={0}>')],
    ['the instruction a button', (s) => s.replace(') : (\n          slot.text\n        )}', ') : (\n          <button type="button">{slot.text}</button>\n        )}')],
    ['the control always shown', (s) => s.replace("{slot.kind === 'control' ? (", '{true ? (')],
    ['two button elements for two actions', (s) => s.replace("{slot.kind === 'control' ? (", "{slot.kind === 'control' && slot.action === 'return' ? (")],
    // Loop 1: the slot must be one persistent element, so it moves rather than jumps.
    ['the slot swapped between a <p> and a <button>', (s) => s.replace(/<p className="chrome-slot" style=\{style\}>[\s\S]*?\n {6}<\/p>\n/, SWAPPED_SLOT)],
    [
      'the style on the button, not the slot',
      (s) => s.replace('<p className="chrome-slot" style={style}>', '<p className="chrome-slot">').replace('className="chrome-slot-control"', 'className="chrome-slot-control"\n            style={style}'),
    ],
    ['the slot remounted by kind', (s) => s.replace('<p className="chrome-slot" style={style}>', '<p className="chrome-slot" key={slot.kind} style={style}>')],
    ['the action not carried', (s) => s.replace(/\s*data-action=\{slot\.action\}/, '')],
    ['the action read off the store', (s) => s.replace("button?.dataset.action === 'return'", 'navigationStore.getState().focusedProjectId === null')],
    ['a hand-back on a release too', (s) => s.replace("button?.dataset.action === 'return' && ", 'button !== null && ')],
    ['a hand-back keyed on a release', (s) => s.replace("button?.dataset.action === 'return'", "button?.dataset.action === 'release'")],
    ['the hand-back dropped', (s) => s.replace(/\s*ref=\{handBack\}/, '')],
    [
      'focus left on the unmounted button',
      (s) => s.replace(/\s*if \(button\?\.dataset\.action === 'return' && button\.matches\(':focus'\)\) document\.getElementById\(OVERVIEW_ID\)\?\.focus\(\);/, ''),
    ],
    ['focus taken whether or not the button held it', (s) => s.replace(" && button.matches(':focus')", '')],
    ['focus moved on mount, not on unmount', (s) => s.replace(/\(\) => \{\s*if \(button\?\.dataset/, '{\n      if (button?.dataset')],
    ['a hand-back with dependencies', (s) => s.replace(/\},\s*\[\],\s*\);/, '},\n    [mode],\n  );')],
    [
      'an inline hand-back',
      (s) => s.replace('ref={handBack}', "ref={(button) => () => { if (button?.dataset.action === 'return' && button.matches(':focus')) document.getElementById(OVERVIEW_ID)?.focus(); }}"),
    ],
    ['focus to an id written here', (s) => s.replace('document.getElementById(OVERVIEW_ID)', "document.getElementById('index-overview')")],
    ['focus moved by the click as well', (s) => s.replace("onClick={(event) => (event.detail > 1 ? undefined : slot.action === 'return' ? returnToRail() : releaseLayer())}", 'onClick={() => { returnToRail(); document.body.focus(); }}')],
    // One click, one layer: the reused button must not let a double-click unwind two.
    ['the multi-click guard dropped', (s) => s.replace("onClick={(event) => (event.detail > 1 ? undefined : slot.action === 'return' ? returnToRail() : releaseLayer())}", "onClick={() => (slot.action === 'return' ? returnToRail() : releaseLayer())}")],
    ['the guard ignoring the first click too', (s) => s.replace('event.detail > 1 ?', 'event.detail > 0 ?')],
    ['the guard inverted', (s) => s.replace('event.detail > 1 ?', 'event.detail <= 1 ?')],
    // One press, one layer: a held Enter's repeats must not click the reused button again.
    ['the repeat guard dropped', (s) => s.replace(/\s*onKeyDown=\{\(event\) => \{\s*if \(event\.repeat && event\.key === 'Enter'\) event\.preventDefault\(\);\s*\}\}/, '')],
    ['the repeat guard inverted', (s) => s.replace("if (event.repeat && event.key === 'Enter')", "if (!event.repeat && event.key === 'Enter')")],
    ['the repeat guard on every held key', (s) => s.replace(" && event.key === 'Enter'", '')],
    ['the repeat guard on another key', (s) => s.replace("event.key === 'Enter'", "event.key === ' '")],
    ['the repeat guard stops propagation instead', (s) => s.replace("'Enter') event.preventDefault();", "'Enter') event.stopPropagation();")],
    ['a second key handler', (s) => s.replace('type="button"', 'type="button" onKeyUp={() => releaseLayer()}')],
    ['an inline style literal', (s) => s.replace('<p className="chrome-identity">', '<p className="chrome-identity" style={{ textTransform: "uppercase" }}>')],
    ['the stylesheet not imported', (s) => s.replace("import './corner-chrome.css';", '')],
    ['local state', (s) => s.replace('const slot =', 'const [open] = useState(false);\n  const slot =')],
    ['a hover handler', (s) => s.replace('type="button"', 'type="button" onMouseEnter={() => releaseLayer()}')],
    ['a viewport read', (s) => s.replace('const slot =', 'const wide = window.innerWidth > 1200;\n  const slot =')],
    ['the offer never read', (s) => s.replace('const offered = useSyncExternalStore(subscribeChartOffer, chartOffered);', 'const offered = false;')],
    ['the offer read off the store', (s) => s.replace('const offered = useSyncExternalStore(subscribeChartOffer, chartOffered);', 'const offered = useStore(navigationStore, (state) => state.mode === "freeflight");')],
    ['the offer drawn as a line', (s) => s.replace('{CHART_LINK_TEXT}</a>\n      </p>', '{CHART_LINK_TEXT}</a>\n      {offered ? CHART_LINK_TEXT : null}\n      </p>')],
    ['the offer named', (s) => s.replace('className={chartRouteClass(offered)}', 'className={chartRouteClass(offered)} aria-describedby="offer"')],
    ['the chrome samples frames', (s) => s.replace('const slot =', 'sampleFrame(1);\n  const slot =')],
    ['the class not the model’s', (s) => s.replace('import { IDENTITY_MODEL, IDENTITY_NAME, chartRouteClass, chromeSlot, slotStyle }', 'import { IDENTITY_MODEL, IDENTITY_NAME, chromeSlot, slotStyle }').replace('const slot =', 'const chartRouteClass = (o: boolean) => (o ? "chrome-route chrome-route-offered" : "chrome-route");\n  const slot =')],
    // 5.1: the model link.
    ['the model link navigating on every click', (s) => s.replace("onClick={(event) => followRoute(event, router.navigate, 'colophon')}", "onClick={() => router.navigate('colophon')}")],
    ['the model link to the chart', (s) => s.replace("followRoute(event, router.navigate, 'colophon')", "followRoute(event, router.navigate, 'chart')")],
    ['the model link dropped', (s) => s.replace(/<a className="chrome-route" href=\{routeHref\('colophon'\)\}[^\n]*?\{IDENTITY_MODEL\}<\/a>/, '{IDENTITY_MODEL}')],
    ['the model link offered', (s) => s.replace(`<a className="chrome-route" href={routeHref('colophon')}`, `<a className={chartRouteClass(offered)} href={routeHref('colophon')}`)],
    ['the model link with a class of its own', (s) => s.replace(`<a className="chrome-route" href={routeHref('colophon')}`, `<a className="chrome-model" href={routeHref('colophon')}`)],
    ['a third link handler', (s) => s.replace('<p className="chrome-identity">', '<p className="chrome-identity" onClick={() => undefined}>')],
  ];
  for (const [name, mutate] of mutations) {
    const mutated = mutate(real);
    assert.notEqual(mutated, real, `the mutation "${name}" must apply`);
    const target = CHROME_TARGETS.get(name);
    assert.ok(target !== undefined, `"${name}" names the check it targets`);
    const failures = auditChrome(mutated);
    assert.ok(failures.some((failure) => failure.includes(target)), `"${name}" must be rejected by its own check (${target}) — found ${JSON.stringify(failures)}`);
  }
  assert.deepEqual([...CHROME_TARGETS.keys()].sort(), mutations.map(([name]) => name).sort(), 'every target names a mutation');
});
