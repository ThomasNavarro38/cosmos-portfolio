/**
 * Realism's status, and the one owner of its lifecycle (7.5): when the `realism`
 * chunk is imported, when the maps are decoded, and what every failure leaves
 * behind, which is the schematic scene exactly as it was.
 *
 * **Two scopes.** The document status runs `idle → fetching → decoded → shown`,
 * or `failed`, which is terminal: a document that failed never asks again. The
 * context status is one flag, `uploaded`, reset by every new `<Canvas>`, because
 * a GPU context does not outlive its Canvas and decoded images do. So a second
 * Canvas finds the same document status and images, and a failure stays one.
 *
 * **The frame after the first.** The First Paint mark is a microtask queued in
 * the first frame, and runs when that animation frame's callback returns. So the
 * first `frame()` only counts, and the second starts the import: every request
 * lands after `schematic-first-frame`, whatever the order of the `useFrame`
 * subscribers, and `first-frame-mark.tsx` does not change.
 *
 * **Whole or not at all, and silent.** Any one map failing fails the document.
 * Every synchronous throw and every rejection ends in `failed`, with nothing
 * rethrown, logged, retried or shown. Decoded images are kept and never closed.
 *
 * `markUploaded`, `markShown` and `markFailed` have no shipped caller until 7.6
 * and 7.8: they exist now because the status model is this story's contract. A
 * layer is shown only once it is uploaded, so `markShown` moves only then. A later
 * Canvas over a `shown` document stays `shown`, with `uploaded` false until it
 * uploads again.
 *
 * **Pure.** It imports nothing and is not in `navigationStore`. The import
 * arrives as an argument, so `realism-mount.tsx` stays the only shipped module
 * naming the chunk, and every rule here runs under `node --test`.
 */

/** The document's status. `failed` is terminal. */
export type DocumentStatus = 'idle' | 'fetching' | 'decoded' | 'shown' | 'failed';

/** The artifact as far as realism is concerned: the map each Planet wears. Structural, so nothing here imports `src/derive/`. */
export interface RealismArtifact {
  readonly clients: readonly {
    readonly projects: readonly {
      readonly appearance: { readonly map: string };
    }[];
  }[];
}

/** What the `realism` chunk gives the owner. */
export interface RealismChunk<Image> {
  decodeMaps(artifact: RealismArtifact, base: string): Promise<ReadonlyMap<string, Image>>;
}

/** Both scopes, as they stand. */
export interface RealismStatus {
  readonly document: DocumentStatus;
  readonly uploaded: boolean;
}

export interface RealismOwner<Image> {
  /** One frame of the Canvas's loop. Never throws. */
  frame(artifact: RealismArtifact, base: string): void;
  /** A new `<Canvas>`: `uploaded` resets, and nothing else changes. */
  enterCanvas(): void;
  /** The maps are on this Canvas's context. Ignored unless the document holds them. */
  markUploaded(): void;
  /** The layer is on screen. Ignored unless the document is `decoded` and this Canvas has `uploaded`. */
  markShown(): void;
  /** A later stage failed, as an upload or a shader may. Terminal, from any status, and never throws. */
  markFailed(): void;
  status(): RealismStatus;
  /** The decoded images by map id, or `null` while the document holds none. */
  images(): ReadonlyMap<string, Image> | null;
}

const MOVES: Readonly<Record<DocumentStatus, readonly DocumentStatus[]>> = {
  idle: ['fetching', 'failed'],
  fetching: ['decoded', 'failed'],
  decoded: ['shown', 'failed'],
  shown: ['failed'],
  failed: [],
};

/** The status after asking to move: the new one if the move is legal, otherwise the same. */
export function moveStatus(from: DocumentStatus, to: DocumentStatus): DocumentStatus {
  return MOVES[from].includes(to) ? to : from;
}

/** One owner per document: `realism-mount.tsx` holds it at module scope. */
export function createRealismOwner<Image>(importChunk: () => Promise<RealismChunk<Image>>): RealismOwner<Image> {
  let document: DocumentStatus = 'idle';
  let uploaded = false;
  let held: ReadonlyMap<string, Image> | null = null;
  let frames = 0;

  const fail = (): void => {
    document = moveStatus(document, 'failed');
    uploaded = false;
  };

  const start = (artifact: RealismArtifact, base: string): void => {
    document = moveStatus(document, 'fetching');
    Promise.resolve(importChunk())
      .then((chunk) => chunk.decodeMaps(artifact, base))
      .then((images) => {
        // An empty result has nothing to measure, and that is not a success.
        if (images.size === 0) {
          fail();
          return;
        }
        held = images;
        document = moveStatus(document, 'decoded');
      })
      .catch(fail);
  };

  return {
    frame(artifact, base) {
      try {
        if (document !== 'idle') return;
        frames += 1;
        if (frames > 1) start(artifact, base);
      } catch {
        fail();
      }
    },
    enterCanvas() {
      uploaded = false;
    },
    markUploaded() {
      if (document === 'decoded' || document === 'shown') uploaded = true;
    },
    markShown() {
      if (uploaded) document = moveStatus(document, 'shown');
    },
    markFailed() {
      fail();
    },
    status() {
      return { document, uploaded };
    },
    images() {
      return document === 'decoded' || document === 'shown' ? held : null;
    },
  };
}
