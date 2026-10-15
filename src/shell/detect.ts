/**
 * Capability detection (4.1, AD-6, AD-8): which surface this visitor gets,
 * decided before anything heavy is fetched.
 *
 * **Two questions, and only two.** Can this browser create a WebGL2 context, and
 * is its *primary* pointer coarse? A context is created once and released at once
 * through `WEBGL_lose_context`; nothing is timed, no frame is drawn and the GPU is
 * not probed, because no performance probe runs on the First Paint path (4.6
 * offers the other surface from the running scene instead). "Mobile" is the
 * primary pointer: never `any-pointer`, which a touchscreen laptop answers yes to,
 * and never a width or height, so a narrow desktop window keeps the scene.
 *
 * **The motion preference is not a capability.** A visitor who prefers reduced
 * motion on a capable machine gets the scene, paced down; nothing here reads the
 * preference, and an audit in `scene-model.test.ts` pins who may.
 *
 * **Pure and injectable.** `detect(env)` takes the two browser seams it needs, so
 * every row of the story's matrix runs under `node --test`; `browserEnv()` is the
 * real one. Imports nothing, so the thin entry stays thin (AD-7).
 */

/** The surface the entry mounts. Not in the navigation store: it is chosen once, before the store exists. */
export type Surface = 'scene' | 'fallback';

/** What the two questions answered. */
export interface Capabilities {
  readonly webgl2: boolean;
  readonly coarsePointer: boolean;
}

/** The release extension, as much of it as detection uses. */
interface LoseContext {
  loseContext(): void;
}

/** A WebGL2 context, as much of it as detection uses. */
interface ProbedContext {
  getExtension(name: 'WEBGL_lose_context'): LoseContext | null;
}

/** The browser, as much of it as detection uses. */
export interface DetectEnv {
  /** A fresh canvas, never attached to the document. */
  createCanvas(): { getContext(contextId: 'webgl2'): ProbedContext | null };
  /** `window.matchMedia`, or `undefined` where the browser has none. */
  readonly matchMedia: ((query: string) => { readonly matches: boolean }) | undefined;
}

/** The primary pointer, coarse: a phone or a tablet. */
export const COARSE_POINTER_QUERY = '(pointer: coarse)';

/** One WebGL2 context, created and released. A throw is a browser saying no. */
function hasWebGL2(env: DetectEnv): boolean {
  let context: ProbedContext | null;
  try {
    context = env.createCanvas().getContext('webgl2');
  } catch {
    return false;
  }
  if (context === null) return false;
  try {
    context.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    // The context was created, which is the answer; the release is a courtesy.
  }
  return true;
}

/** The primary pointer, coarse or not. Absent, or throwing, `matchMedia` reads as a fine pointer. */
function hasCoarsePointer(env: DetectEnv): boolean {
  if (typeof env.matchMedia !== 'function') return false;
  try {
    return env.matchMedia(COARSE_POINTER_QUERY).matches;
  } catch {
    return false;
  }
}

/** The two answers. Neither ever throws: detection runs at the top of the entry. */
export function detect(env: DetectEnv): Capabilities {
  return { webgl2: hasWebGL2(env), coarsePointer: hasCoarsePointer(env) };
}

/** The scene for WebGL2 under a fine pointer; the fallback for everyone else. There is no third tier. */
export function chooseSurface({ webgl2, coarsePointer }: Capabilities): Surface {
  return webgl2 && !coarsePointer ? 'scene' : 'fallback';
}

/** The real browser. */
export function browserEnv(): DetectEnv {
  return {
    createCanvas: () => document.createElement('canvas'),
    matchMedia: typeof window.matchMedia === 'function' ? (query) => window.matchMedia(query) : undefined,
  };
}
