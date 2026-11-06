/**
 * Realism's status, and the one owner of its lifecycle (7.5, 7.6, 7.8): when the
 * `realism` chunk is imported, when the maps are decoded, when the layer is built,
 * warmed, attached and faded in, and what every failure leaves behind, which is the
 * schematic scene exactly as it was.
 *
 * **Two scopes.** The document status runs `idle → fetching → decoded → shown`,
 * or `failed`, which is terminal: a document that failed never asks again. `shown`
 * means the first visible frame of the layer has begun. The context scope is this
 * Canvas's arrival, below, and one flag, `uploaded`, reset by every new `<Canvas>`,
 * because a GPU context does not outlive its Canvas and decoded images do. So a
 * second Canvas finds the same document status and images, and a failure stays one.
 *
 * **The frame after the first.** The First Paint mark is a microtask queued in
 * the first frame, and runs when that animation frame's callback returns. So the
 * first `frame()` only counts, and the second starts the import: every request
 * lands after `schematic-first-frame`, whatever the order of the `useFrame`
 * subscribers, and `first-frame-mark.tsx` does not change. Nothing is warmed before
 * the maps have decoded, so `compileAsync` too runs only after the mark, and the
 * first frame's own compile stays synchronous.
 *
 * **Whole or not at all, and silent.** Any one map failing fails the document.
 * Every synchronous throw and every rejection ends in `failed`, with nothing
 * rethrown, logged, retried or shown. Decoded images are kept and never closed.
 *
 * **A Canvas's arrival (7.8),** one phase per Canvas, reset by `enterCanvas` and by
 * a frame from another scene:
 *
 * - `none`, on a frame with the images held: build the layer, `resetSampling()`
 *   (upload begins), and start `warm(renderer, camera, scene)`, which uploads every
 *   map and compiles every material off-screen. Nothing is attached → `warming`.
 * - `warming` draws nothing. The promise resolving → `warmed`; rejecting fails the
 *   document, silently. A promise that settles after its layer was released (the
 *   Canvas left, the scene changed) does nothing either way.
 * - `warmed`, on a frame: attach the layer at fade 0, update it, `markUploaded`. This
 *   is the hidden warm draw: every program and texture of a draw in view binds for real,
 *   invisibly, with no render target or extra pass; three culls what is out of view, and
 *   binds that when it comes into view → `warm-drawn`.
 * - `warm-drawn`, on a frame: `resetSampling()` again (the first visible frame begins),
 *   `arrive(fade)` with `fade` only while the document is not yet `shown`, `markShown`,
 *   and update it → `arrived`. So the first Canvas fades in, and a later Canvas in a
 *   `shown` document does the same work but is whole on its first visible frame.
 * - `arrived`: update the layer each frame.
 *
 * `resetSampling` is called exactly twice per arrival, and only by this owner. A rebuild
 * is a new arrival with its own two: a frame from another scene, or a frame that ran
 * before the new Canvas's passive effect, whose `enterCanvas` then resets the arrival, so
 * that layer is built, uploaded and compiled twice. The port
 * is the mount's, bound to `resetFrameSampling`. A synchronous throw from
 * building, warming, attaching or updating the layer ends in `markFailed`, which
 * removes every fill and glow (7.7) and leaves the frame loop alive.
 *
 * **A lost and restored context under one Canvas changes nothing here,** as 7.6
 * settled it. Three uploads and compiles again on its next draw, from the kept images,
 * with no request and no fade, and `uploaded` stays true. The explicit warm-up is a
 * new Canvas's, not a restored context's.
 *
 * **A Canvas goes late.** R3F unmounts a Canvas asynchronously, so leaving is the
 * function `enterCanvas` returns, and a stale one does nothing. Entering leaves any
 * layer where it is until the next frame, which starts the arrival afresh and so
 * disposes it first: a layer belongs to the Canvas whose arrival built it.
 *
 * `markUploaded`, `markShown` and `markFailed` stay public.
 *
 * **Pure.** It imports nothing and is not in `navigationStore`. The import and the
 * sampling reset arrive as arguments and the layer behind a port typed here, so
 * `realism-mount.tsx` stays the only shipped module naming the chunk, and every rule
 * here runs under `node --test`. It sets no timer: every step waits for a frame.
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
 * What a frame hands the layer: this Canvas's scene, camera and renderer, and the frame's facts.
 * `subject` is a thunk, so the store is read inside this owner's `try`, and only when a
 * layer exists (7.7). `pace` is `motionPace`'s number, from the mount's one read.
 */
export interface RealismDraw<Scene = unknown, Camera = unknown, Renderer = unknown> {
  readonly scene: Scene;
  readonly camera: Camera;
  readonly renderer: Renderer;
  readonly delta: number;
  readonly reduced: boolean;
  readonly pace: number;
  readonly subject: () => string | null;
}

/** The drawn layer, as the owner holds it. */
export interface RealismLayer<Scene = unknown, Camera = unknown, Renderer = unknown> {
  /** Uploads and compiles off-screen, attaching nothing; rejects if a program did not link. */
  warm(renderer: Renderer, camera: Camera, scene: Scene): Promise<void>;
  attach(scene: Scene): void;
  /** The first visible frame: with `fade`, the layer fades in from 0; without, it is whole at once. */
  arrive(fade: boolean): void;
  frame(camera: Camera, delta: number, reduced: boolean, pace: number, subject: string | null): void;
  dispose(): void;
}

/** What the `realism` chunk gives the owner. */
export interface RealismChunk<Image, Scene = unknown, Camera = unknown, Renderer = unknown> {
  decodeMaps(artifact: RealismArtifact, base: string): Promise<ReadonlyMap<string, Image>>;
  createFillLayer(artifact: RealismArtifact, images: ReadonlyMap<string, Image>): RealismLayer<Scene, Camera, Renderer>;
}

/** Both scopes, as they stand. */
export interface RealismStatus {
  readonly document: DocumentStatus;
  readonly uploaded: boolean;
}

export interface RealismOwner<Image, Scene = unknown, Camera = unknown, Renderer = unknown> {
  /** One frame of the Canvas's loop. Never throws. */
  frame(artifact: RealismArtifact, base: string, draw: RealismDraw<Scene, Camera, Renderer>): void;
  /** A new `<Canvas>`: `uploaded` and the arrival reset, and nothing else. Returns how to leave it, which disposes the layer unless another Canvas has entered since. */
  enterCanvas(): () => void;
  /** The maps are on this Canvas's context. Ignored unless the document holds them. */
  markUploaded(): void;
  /** The layer is on screen. Ignored unless the document is `decoded` and this Canvas has `uploaded`. */
  markShown(): void;
  /** A later stage failed, as reported by whoever saw it. Terminal, from any status, removes the layer and never throws. The owner calls it itself on a synchronous throw from any stage, and on a warm-up that rejects. */
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

/** Where this Canvas's arrival stands. */
type Arrival = 'none' | 'warming' | 'warmed' | 'warm-drawn' | 'arrived';

/**
 * One owner per document: `realism-mount.tsx` holds it at module scope. `resetSampling`
 * starts frame-time sampling afresh, and is called when upload begins and when the first
 * visible frame begins.
 */
export function createRealismOwner<Image, Scene = unknown, Camera = unknown, Renderer = unknown>(
  importChunk: () => Promise<RealismChunk<Image, Scene, Camera, Renderer>>,
  resetSampling: () => void,
): RealismOwner<Image, Scene, Camera, Renderer> {
  let document: DocumentStatus = 'idle';
  let uploaded = false;
  let held: ReadonlyMap<string, Image> | null = null;
  let frames = 0;
  let chunk: RealismChunk<Image, Scene, Camera, Renderer> | null = null;
  let layer: RealismLayer<Scene, Camera, Renderer> | null = null;
  let layerScene: Scene | null = null;
  let arrival: Arrival = 'none';
  let canvases = 0;

  /** The layer goes, and this Canvas's arrival with it. Its own failure to go is as silent as any other. */
  const release = (): void => {
    const gone = layer;
    layer = null;
    layerScene = null;
    arrival = 'none';
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

  /** A new arrival: any layer left goes, a new one is built, sampling resets and the warm-up starts. Whatever the promise does once this layer is gone is ignored. */
  const build = (artifact: RealismArtifact, draw: RealismDraw<Scene, Camera, Renderer>, from: RealismChunk<Image, Scene, Camera, Renderer>, images: ReadonlyMap<string, Image>): void => {
    release();
    uploaded = false;
    const built = from.createFillLayer(artifact, images);
    layer = built;
    layerScene = draw.scene;
    arrival = 'warming';
    resetSampling();
    Promise.resolve(built.warm(draw.renderer, draw.camera, draw.scene)).then(
      () => {
        if (layer === built && arrival === 'warming') arrival = 'warmed';
      },
      () => {
        if (layer === built) fail();
      },
    );
  };

  const drawLayer = (artifact: RealismArtifact, draw: RealismDraw<Scene, Camera, Renderer>): void => {
    if (chunk === null || held === null) return;
    if (layer === null || arrival === 'none' || layerScene !== draw.scene) {
      build(artifact, draw, chunk, held);
      return;
    }
    if (arrival === 'warming') return;
    if (arrival === 'warmed') {
      layer.attach(draw.scene);
      layer.frame(draw.camera, draw.delta, draw.reduced, draw.pace, draw.subject());
      markUploaded();
      arrival = 'warm-drawn';
      return;
    }
    if (arrival === 'warm-drawn') {
      resetSampling();
      layer.arrive(document !== 'shown');
      markShown();
      arrival = 'arrived';
    }
    layer.frame(draw.camera, draw.delta, draw.reduced, draw.pace, draw.subject());
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
      arrival = 'none';
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
