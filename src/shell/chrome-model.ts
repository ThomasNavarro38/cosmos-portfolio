/**
 * The corner chrome as a pure model (3.8, DESIGN.md §7.9, UX-DR27): the two
 * lines the frame carries, and what the stateful one says.
 *
 * **Exactly two lines, in opposite corners.** Top-left, one constant identity
 * line, never a control. Bottom-right, one slot whose content is read off the
 * navigation state's `mode` and `focusedProjectId` and nothing else:
 *
 * | State | Text | Element |
 * | --- | --- | --- |
 * | `rail`, nothing focused | `scroll ↓ — time runs backward` | text, not focusable |
 * | `freeflight`, nothing focused | `↩ resume the journey` | a button → `returnToRail()` |
 * | any Project focused, either mode | `esc — release` | a button → `releaseLayer()` |
 *
 * The slot swaps its content; it never adds a third line. Each button's
 * accessible name is its visible text — no `aria-*` name, no `title`.
 *
 * **The strings are set as authored.** DESIGN.md sets plate designations in
 * capitals, corner chrome included, but the ratified strings are mixed case
 * (`the model`, `scroll ↓ …`), so no `text-transform` touches them. `the model`
 * is plain text until Story 5.1 adds its route (ruled 2026-10-10, 1a).
 *
 * **The slot moves with the panel** (ruled 3a). While Focused the panel's column
 * covers the right edge, so the slot sits `--space-xl` left of it — the same
 * `panelWidthCss()` the panel is drawn at — and `right` transitions over
 * `FOCUS_SECONDS × pace` on the Focus curve, so the two move as one and the slot
 * never jumps.
 *
 * **Pure.** No React, no DOM, no store: state and pace arrive as arguments.
 * `corner-chrome.tsx` is the thin renderer, and `chrome-model.test.ts` audits it.
 */

import { FOCUS_SECONDS, focusEasingCss } from './focus-motion.ts';
import { panelWidthCss } from './panel-model.ts';

/** The top-left line, verbatim (UX-DR27). Text, never a control or a link — the route is 5.1's. */
export const IDENTITY_LINE = 'THOMAS NAVARRO · the model';

/** The slot's three texts, verbatim (DESIGN.md §7.9). `↓` and `↩` are the permitted instruction glyphs. */
export const SLOT_TEXT = {
  instruction: 'scroll ↓ — time runs backward',
  return: '↩ resume the journey',
  release: 'esc — release',
} as const;

/**
 * What the bottom-right slot holds: an instruction, or one control and the door
 * it opens. Each variant's text is its own `SLOT_TEXT` literal, so a control
 * cannot carry another's words.
 */
export type ChromeSlot =
  | { readonly kind: 'instruction'; readonly text: typeof SLOT_TEXT.instruction }
  | { readonly kind: 'control'; readonly action: 'return'; readonly text: typeof SLOT_TEXT.return }
  | { readonly kind: 'control'; readonly action: 'release'; readonly text: typeof SLOT_TEXT.release };

/**
 * The slot for a state.
 *
 * Focus wins in either mode — the panel is the innermost layer, and `Escape`
 * would release it first — so a Project focused in free flight shows release,
 * never resume. Otherwise free flight offers the return, and the Rail the
 * instruction.
 */
export function chromeSlot(mode: 'rail' | 'freeflight', focusedProjectId: string | null): ChromeSlot {
  if (focusedProjectId !== null) return { kind: 'control', action: 'release', text: SLOT_TEXT.release };
  if (mode === 'freeflight') return { kind: 'control', action: 'return', text: SLOT_TEXT.return };
  return { kind: 'instruction', text: SLOT_TEXT.instruction };
}

/** The slot's inline style: the two declarations that depend on state. The rest is `corner-chrome.css`. */
export interface SlotStyle {
  readonly right: string;
  readonly transition: string;
}

/**
 * The slot's `right` inset and its transition.
 *
 * `var(--space-xl)` (40px) from the edge with nothing focused; while Focused,
 * `calc(<panel width> + var(--space-xl))`, so it clears the panel by the same
 * inset. The move runs over `FOCUS_SECONDS × pace` on `focusEasingCss()` —
 * the panel's own slide — so the slot travels with the panel's edge. `pace` is
 * the reduced-motion pace (2.10); one that is not a positive finite number reads
 * as `1`, never a `0s` cut or a `NaN` the browser would drop.
 */
export function slotStyle(focused: boolean, pace = 1): SlotStyle {
  const seconds = FOCUS_SECONDS * (Number.isFinite(pace) && pace > 0 ? pace : 1);
  return {
    right: focused ? `calc(${panelWidthCss()} + var(--space-xl))` : 'var(--space-xl)',
    transition: `right ${seconds}s ${focusEasingCss()}`,
  };
}
