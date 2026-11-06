/**
 * Realism's status, and the one owner of its lifecycle (7.5, 7.6): when the
 * `realism` chunk is imported, when the maps are decoded, when the layer is built
 * and gone, and what every failure leaves behind, which is the schematic scene
 * exactly as it was.
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
 * **The layer (7.6).** The first frame that finds the images held builds the layer
 * and attaches it, so a Planet has its fill on that same frame, with `markUploaded`
 * then `markShown`. A later Canvas over a `shown` document stays `shown`, with
 * `uploaded` false until its first frame builds again from the held images, with no
 * request. A synchronous throw from building, attaching or updating the layer ends
 * in `markFailed`, which removes the fills and glows (7.7). **A shader that fails to compile, or a
 * texture that fails to upload, does neither here:** both happen inside three's
 * render, after this frame has returned, so today they do not reach this owner, and
 * `uploaded` means the layer was built and updated, not that the GPU took it. 7.8's
 * explicit `initTexture` and `compileAsync` own that. A lost context restored under
 * one Canvas changes nothing here: three uploads again from the kept images on its
 * next draw, so `uploaded` stays true (7.8 must revisit this too).
 *
 * **A Canvas goes late.** R3F unmounts a Canvas asynchronously, so leaving is the
 * function `enterCanvas` returns, and a stale one does nothing. Entering leaves any
 * layer where it is, since a first frame may run before the passive effect: a layer
 * belongs to the scene it was attached to, and a frame from another scene moves it.
 *
 * `markUploaded`, `markShown` and `markFailed` stay public, for 7.8.
 *
 * **Pure.** It imports nothing and is not in `navigationStore`. The import
 * arrives as an argument and the layer behind a port typed here, so
 * `realism-mount.tsx` stays the only shipped module naming the chunk, and every
 * rule here runs under `node --test`.
 */

/** The document's status. `failed` is terminal. */
export type DocumentStatus = 'idle' | 'fetching' | 'decoded' | 'shown' | 'failed';

interface RealismPoint {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** The artifact as far as realism is concerned: each Planet's map and turn, and where it and its Star stand. Structural, so nothing here imports `src/derive/`. */
export interface RealismArtifact {
  readonly clients: readonly {
    readonly id: string;
    readonly position: RealismPoint;
    readonly projects: readonly {
      readonly id: string;
      readonly clientId: string;
      readonly position: RealismPoint;
      readonly appearance: {
        readonly map: string;
        readonly meanLuminance: number;
        readonly tilt: number;
        readonly spinRate: number;
        readonly spinPhase: number;
      };
    }[];
  }[];
}

/**
 * What a frame hands the layer: this Canvas's scene and camera, and the frame's facts.
 * `subject` is a thunk, so the store is read inside this owner's `try`, and only when a
 * layer exists (7.7). `pace` is `motionPace`'s number, from the mount's one read.
 */
export interface RealismDraw<Scene = unknown, Camera = unknown> {
  readonly scene: Scene;
  readonly camera: Camera;
  readonly delta: number;
  readonly reduced: boolean;
  readonly pace: number;
  readonly subject: () => string | null;
}

/** The drawn layer, as the owner holds it. */
export interface RealismLayer<Scene = unknown, Camera = unknown> {
  attach(scene: Scene): void;
  frame(camera: Camera, delta: number, reduced: boolean, pace: number, subject: string | null): void;
  dispose(): void;
}

/** What the `realism` chunk gives the owner. */
export interface RealismChunk<Image, Scene = unknown, Camera = unknown> {
  decodeMaps(artifact: RealismArtifact, base: string): Promise<ReadonlyMap<string, Image>>;
  createFillLayer(artifact: RealismArtifact, images: ReadonlyMap<string, Image>): RealismLayer<Scene, Camera>;
}

/** Both scopes, as they stand. */
export interface RealismStatus {
  readonly document: DocumentStatus;
  readonly uploaded: boolean;
}

export interface RealismOwner<Image, Scene = unknown, Camera = unknown> {
  /** One frame of the Canvas's loop. Never throws. */
  frame(artifact: RealismArtifact, base: string, draw: RealismDraw<Scene, Camera>): void;
  /** A new `<Canvas>`: `uploaded` resets, and nothing else. Returns how to leave it, which disposes the layer unless another Canvas has entered since. */
  enterCanvas(): () => void;
  /** The maps are on this Canvas's context. Ignored unless the document holds them. */
  markUploaded(): void;
  /** The layer is on screen. Ignored unless the document is `decoded` and this Canvas has `uploaded`. */
  markShown(): void;
  /** A later stage failed, as reported by whoever saw it. Terminal, from any status, removes the layer and never throws. Today only the owner's own frame calls it, on a synchronous throw: a compile or upload failure inside render does not get here until 7.8. */
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
export function createRealismOwner<Image, Scene = unknown, Camera = unknown>(importChunk: () => Promise<RealismChunk<Image, Scene, Camera>>): RealismOwner<Image, Scene, Camera> {
  let document: DocumentStatus = 'idle';
  let uploaded = false;
  let held: ReadonlyMap<string, Image> | null = null;
  let frames = 0;
  let chunk: RealismChunk<Image, Scene, Camera> | null = null;
  let layer: RealismLayer<Scene, Camera> | null = null;
  let layerScene: Scene | null = null;
  let canvases = 0;

  /** The layer goes. Its own failure to go is as silent as any other. */
  const release = (): void => {
    const gone = layer;
    layer = null;
    layerScene = null;
    try {
      gone?.dispose();
    } catch {
      // Nothing more can be done for a layer that is already gone.
    }
  };

  const fail = (): void => {
    document = moveStatus(document, 'failed');
    uploaded = false;
    release();
  };

  const markUploaded = (): void => {
    if (document === 'decoded' || document === 'shown') uploaded = true;
  };

  const markShown = (): void => {
    if (uploaded) document = moveStatus(document, 'shown');
  };

  const start = (artifact: RealismArtifact, base: string): void => {
    document = moveStatus(document, 'fetching');
    Promise.resolve(importChunk())
      .then((arrived) => {
        chunk = arrived;
        return arrived.decodeMaps(artifact, base);
      })
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

  const drawLayer = (artifact: RealismArtifact, draw: RealismDraw<Scene, Camera>): void => {
    if (chunk === null || held === null) return;
    if (layer !== null && layerScene !== draw.scene) {
      release();
      uploaded = false;
    }
    if (layer === null) {
      layer = chunk.createFillLayer(artifact, held);
      layerScene = draw.scene;
      layer.attach(draw.scene);
    }
    layer.frame(draw.camera, draw.delta, draw.reduced, draw.pace, draw.subject());
    markUploaded();
    markShown();
  };

  return {
    frame(artifact, base, draw) {
      try {
        if (document === 'decoded' || document === 'shown') {
          drawLayer(artifact, draw);
          return;
        }
        if (document !== 'idle') return;
        frames += 1;
        if (frames > 1) start(artifact, base);
      } catch {
        fail();
      }
    },
    enterCanvas() {
      uploaded = false;
      canvases += 1;
      const entered = canvases;
      return () => {
        if (entered !== canvases) return;
        release();
        uploaded = false;
      };
    },
    markUploaded,
    markShown,
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
