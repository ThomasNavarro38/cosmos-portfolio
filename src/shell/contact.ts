/**
 * The contact route (6.3, FR-23): its copy and its press.
 *
 * **The copy** is Thomas's ruling (Q1, Q4 (b), Q5, 2026-10-22),
 * verbatim: the address, drawn as a `mailto:` link whose visible text and
 * accessible name it is, and the copy button's three labels — `copy` at rest,
 * `copied` once the clipboard took the address, `not copied` when it would not.
 * The address is Thomas's, supplied 2026-10-22 (closing the Q1 deferral);
 * `contact.test.ts` holds it to a plain address shape and off the reserved
 * `.invalid` placeholder it replaced.
 *
 * **The press**, `createContactCopy` — the tracker `contact-route.tsx` binds to
 * its state, as `createLiveSolve` (`src/colophon/live-solve.ts`) is to the
 * Colophon's: the clipboard's `writeText` and the state setter arrive as
 * arguments, so every transition is executed in `contact.test.ts` rather than
 * read off the `.tsx`. Every press attempts a copy. The newest press's outcome
 * wins: an older press settling late is dropped. `stop()` (the unmount) drops
 * whatever is still in flight. A missing `writeText` (no clipboard API, an
 * insecure context), one that throws synchronously, and one that rejects each
 * give `failed`; nothing is thrown and nothing is logged. The label stays until
 * the next press: no timer, no reset.
 *
 * Import-free, and no DOM global: the clipboard arrives as an argument.
 */

/** The ruled copy: the address, and the button's label at rest, after a copy, and after a refusal. */
export const CONTACT = { address: 't.navarro9@laposte.net', copy: 'copy', copied: 'copied', failed: 'not copied' } as const;

/** Where the button stands: never pressed, or the newest press's outcome. */
export type ContactCopyState = 'idle' | 'copied' | 'failed';

/** The clipboard's `writeText`, bound, as the browser gives it. */
export type WriteText = (text: string) => Promise<void>;

/** The press and the unmount's stop. */
export interface ContactCopyTracker {
  press(): void;
  stop(): void;
}

/** The tracker: each press writes the address, its outcome set unless a newer press or the stop came after it. */
export function createContactCopy(writeText: WriteText | undefined, setCopyState: (state: ContactCopyState) => void): ContactCopyTracker {
  let current = 0;
  return {
    press() {
      current += 1;
      const press = current;
      const settle = (state: ContactCopyState): void => {
        if (press === current) setCopyState(state);
      };
      if (writeText === undefined) {
        settle('failed');
        return;
      }
      let written: Promise<void>;
      try {
        written = Promise.resolve(writeText(CONTACT.address));
      } catch {
        settle('failed');
        return;
      }
      written.then(
        () => settle('copied'),
        () => settle('failed'),
      );
    },
    stop() {
      current += 1;
    },
  };
}

/** The button's label for a state. */
export function contactLabel(state: ContactCopyState): string {
  switch (state) {
    case 'idle':
      return CONTACT.copy;
    case 'copied':
      return CONTACT.copied;
    case 'failed':
      return CONTACT.failed;
  }
}
