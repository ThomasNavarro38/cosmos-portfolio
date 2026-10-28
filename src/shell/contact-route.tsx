/**
 * The contact route, drawn (6.3, FR-23): one shell component the two reading
 * surfaces share — the Fallback chart's chrome row, beside its heading (ruling
 * Q3 (a)), and the Colophon's chrome row, likewise beside its heading (Epic
 * 5 item 38, ruling (a)) — and never the scene
 * (ruling Q2 (d)).
 * It lives here, in the `ui` chunk (`vite.config.ts`), because `chart.tsx` may
 * not import React itself and the colophon chunk may hold only `src/colophon/`
 * modules: one copy of the markup both may import.
 *
 * `ContactRouteView` is the markup: one `p.contact-route` holding the address
 * as an `a.contact-address` — its visible text and its accessible name the
 * address, its `href` `mailto:` and the address, selectable by hand — then a
 * space and the `button.contact-copy` (`type="button"`, never `disabled`),
 * whose text is the current label. The label is the feedback: it changes in
 * place, and a screen reader hears the new name on the focused button. No
 * tooltip, no caption, no toast, no live region, no timer.
 *
 * `ContactRoute` binds it: the label's state, the tracker built once by a lazy
 * `useState` (`createContactCopy` in `contact.ts`, executed in
 * `contact.test.ts`) and handed the clipboard's bound `writeText` where the
 * browser has one, `undefined` where it has none, and the tracker's stop as
 * the unmount's cleanup — a stop drops a late result, and does not retire the
 * tracker, so StrictMode's double effect leaves the press working. The lookup,
 * `clipboardWrite`, is exported so `contact-route.test.ts` executes it against
 * a fake `navigator.clipboard`, through the rendered button's own click.
 *
 * No form, no fetch, no endpoint: nothing is submitted anywhere.
 */

import { useEffect, useState } from 'react';
import { CONTACT, contactLabel, createContactCopy, type ContactCopyState, type WriteText } from './contact.ts';
import './contact-route.css';

/** The clipboard's `writeText`, bound, or `undefined` where the browser offers none. */
export function clipboardWrite(): WriteText | undefined {
  const clipboard = typeof navigator === 'undefined' ? undefined : navigator.clipboard;
  // `== null`: a page whose clipboard reads as `null` must not throw while the route renders.
  if (clipboard == null || typeof clipboard.writeText !== 'function') return undefined;
  return clipboard.writeText.bind(clipboard);
}

/** The route as drawn: the address as a mailto link, then the copy button labelled `label`. */
export function ContactRouteView({ label, onCopy }: { readonly label: string; readonly onCopy: () => void }) {
  return (
    <p className="contact-route">
      <a className="contact-address" href={`mailto:${CONTACT.address}`}>
        {CONTACT.address}
      </a>{' '}
      <button type="button" className="contact-copy" onClick={onCopy}>
        {label}
      </button>
    </p>
  );
}

/** The route, bound: `copy` until pressed, then the newest press's outcome. */
export function ContactRoute() {
  const [state, setCopyState] = useState<ContactCopyState>('idle');
  const [tracker] = useState(() => createContactCopy(clipboardWrite(), setCopyState));
  useEffect(() => () => tracker.stop(), [tracker]);
  return <ContactRouteView label={contactLabel(state)} onCopy={() => tracker.press()} />;
}
