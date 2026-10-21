/**
 * The corner chrome, rendered (3.8, DESIGN.md §7.9, UX-DR27): the identity line
 * top-left, and the stateful slot bottom-right.
 *
 * **A mapping, and nothing else.** What each corner says, which state makes the
 * slot a control, and where the slot sits while the panel is open all live in
 * `chrome-model.ts`, which is pure and executed under `node --test`. This file
 * cannot be loaded by that runner (`.tsx`), so it is kept thin enough that
 * reading it suffices, and `corner-chrome.test.ts` scans it for anything that
 * would be a rule of its own, and renders it (`scripts/render.ts`) before and
 * after the offer.
 *
 * What it holds, and why each is here rather than in the model:
 *
 *   - **Two selector subscriptions** — `mode` and `focusedProjectId`, the slot's
 *     only inputs — never the whole store, so the Rail's sixty progress writes a
 *     second re-render nothing.
 *   - **The reduced-motion pace** (2.10), read with `useSyncExternalStore` as
 *     `focus-panel.tsx` reads it, and handed to `slotStyle`, so the slot moves
 *     with the panel's slide on `FOCUS_SECONDS × pace`.
 *   - **The hand-back** — a stable React 19 ref cleanup on the slot's button. A
 *     button that unmounts while it holds DOM focus would drop focus to
 *     `<body>`. On resume (a click, `Escape`, or `Home` through `goHome`) the
 *     button gives way to the
 *     instruction text, so the cleanup hands focus to the index's `overview`,
 *     found by `OVERVIEW_ID`, exactly when the button still holds it — and only
 *     when the button's last action was `return`, read off its own
 *     `data-action` rather than the store (which has already moved on). A
 *     release from the Rail unmounts the button too, but its focus target is
 *     `focusMove`'s alone (the Project's entry), so the cleanup leaves it be:
 *     DOM focus moves once, never to `overview` first. Stable (`useCallback`, no
 *     dependencies), so it runs on unmount and never on a re-render: a release
 *     in free flight turns the button from `esc — release` into `↩ resume the
 *     journey` in place — the same element — and its cleanup does not run.
 *
 * **The routes to the model and the chart** (4.5 ruling Q1, 5.1). The identity
 * line reads `THOMAS NAVARRO · the model · the chart`: `IDENTITY_NAME`, then
 * ` · ` and one `<a href="/colophon">`, `the model`, then ` · ` and one
 * `<a href="/chart">`, `the chart` — present in every state, Rail, free flight
 * and Focused, since the panel covers the right edge and never the left-top.
 * Each click is `followRoute`'s (`route-link.ts`): a primary click is the
 * router's one `navigate('colophon')` or `navigate('chart')`, any other is the
 * browser's, so a new tab works. Leaving the scene releases nothing: Focus, the
 * mode and the Rail's progress are the store's and survive the round trip, and
 * the router restores the Rail's position on Back. `the model` takes
 * `chrome-route` and only that: the offer is the chart link's alone. The router
 * arrives as the one prop.
 *
 * **The offer** (4.6, ruling Q1a). When the scene has run below the sustained
 * floor, `chart-offer.ts` latches, and the link reads it with
 * `useSyncExternalStore(subscribeChartOffer, chartOffered)` — as the pace is
 * read — taking its class from `chartRouteClass(offered)`: raised and
 * underlined at rest. Only the class changes: no element, no copy, no `aria-*`,
 * and nothing here navigates on the offer — the visitor's click is the route.
 *
 * **Exactly two lines, and one persistent slot.** The slot is one `<p>` mounted
 * in every state, carrying the position and the `right` transition, so the
 * transition runs on every change of Focus — Rail ↔ Focus included — and the
 * slot moves with the panel rather than jumping. Its content is the instruction
 * text or one `<button>` — one element for both actions, so a swap of action
 * keeps the element. Each button's accessible name is its visible text. No store
 * event is called here: the click hands the model's `action` to its door in
 * `activate.ts`, `returnToRail` or `releaseLayer`.
 *
 * **One click, one layer.** Because the element is reused, a double-click in
 * free flight while Focused would release Focus on its first click and then —
 * the same button now reading resume — return to the Rail on its second,
 * unwinding two layers. So a click whose `event.detail > 1` (the second or later
 * click of a multi-click) is ignored. The trade-off is deliberate: a second
 * click meant as a second action, landing within the system's double-click
 * interval, is ignored too — one click, one layer. A keyboard activation has
 * `detail` 0, so it passes that guard; instead a held Enter, whose auto-repeated
 * keydowns would each synthesize a click (release, then resume on the same
 * button), has the default of its repeated keydowns prevented — Enter's only,
 * so a held Tab still leaves the button — and one press releases one layer: the
 * rule `keyAction` applies to `Escape`. Space activates on keyup and needs
 * nothing. A double-click's second click that misses the button — it unmounted,
 * or slid away with the panel — falls on the scene, which ignores it by the
 * same `detail` rule (`activateBody`).
 *
 * **The treatment is `corner-chrome.css`**: the `chrome` type role at
 * `ink-label`, fixed at the `--space-xl` inset, below the panel. Only the slot's
 * `right` and its transition are inline, because they follow the state. The
 * two route links take the pointer on a line that otherwise takes none, and
 * mirror the slot's button.
 */

import { useCallback, useSyncExternalStore } from 'react';
import { useStore } from 'zustand/react';
import { releaseLayer, returnToRail } from './activate.ts';
import { chartOffered, subscribeChartOffer } from './chart-offer.ts';
import { IDENTITY_MODEL, IDENTITY_NAME, chartRouteClass, chromeSlot, slotStyle } from './chrome-model.ts';
import { OVERVIEW_ID } from './index-model.ts';
import { motionPace, reducedMotion, subscribeReducedMotion } from './motion-preference.ts';
import { ROUTE_PATHS } from './route.ts';
import { CHART_LINK_TEXT, followRoute } from './route-link.ts';
import type { Router } from './router.ts';
import { navigationStore } from './state.ts';
import './corner-chrome.css';

/** The two chrome lines. Always in the document; the slot swaps its content. */
export function CornerChrome({ router }: { readonly router: Router }) {
  const mode = useStore(navigationStore, (state) => state.mode);
  const focusedProjectId = useStore(navigationStore, (state) => state.focusedProjectId);
  const pace = motionPace(useSyncExternalStore(subscribeReducedMotion, reducedMotion));
  const offered = useSyncExternalStore(subscribeChartOffer, chartOffered);
  const slot = chromeSlot(mode, focusedProjectId);
  const style = slotStyle(focusedProjectId !== null, pace);
  // Stable, so React calls its cleanup only when the button unmounts — an inline
  // callback would be cleaned up on every re-render and move focus spuriously.
  const handBack = useCallback(
    (button: HTMLButtonElement | null) => () => {
      if (button?.dataset.action === 'return' && button.matches(':focus')) document.getElementById(OVERVIEW_ID)?.focus();
    },
    [],
  );

  return (
    <>
      <p className="chrome-identity">
        {IDENTITY_NAME} · <a className="chrome-route" href={ROUTE_PATHS.colophon} onClick={(event) => followRoute(event, router.navigate, 'colophon')}>{IDENTITY_MODEL}</a> · <a className={chartRouteClass(offered)} href={ROUTE_PATHS.chart} onClick={(event) => followRoute(event, router.navigate, 'chart')}>{CHART_LINK_TEXT}</a>
      </p>
      <p className="chrome-slot" style={style}>
        {slot.kind === 'control' ? (
          <button
            type="button"
            ref={handBack}
            className="chrome-slot-control"
            data-action={slot.action}
            onClick={(event) => (event.detail > 1 ? undefined : slot.action === 'return' ? returnToRail() : releaseLayer())}
            onKeyDown={(event) => {
              if (event.repeat && event.key === 'Enter') event.preventDefault();
            }}
          >
            {slot.text}
          </button>
        ) : (
          slot.text
        )}
      </p>
    </>
  );
}
