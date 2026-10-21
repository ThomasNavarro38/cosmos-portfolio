/**
 * The composed link preview (6.1, FR-24, UX-DR55): the opening frame drawn as a
 * deterministic 1200×630 SVG, from the committed artifact, the scene's own pure
 * models and the generated tokens, and nothing else.
 *
 * **The same composition, framed for the card** (Thomas, Q1 (b)). The camera is
 * `frameBodies(bodies, DEFAULT_FOV, 1200 / 630)`: keyframe 0's direction and
 * target, its distance fitted to the card's aspect rather than the scene's
 * narrowest one. The scene itself is unchanged. What is drawn is what First
 * Paint draws (`src/render-scene/scene.tsx`), in its draw order and at its
 * models' values: the ground, the Dust media and particles, the orbits and the
 * Rail, the Body outlines (the subject at progress 0, `client:decathlon` today,
 * white), the core dots, the Rings, the Moons at their pixel floor, the
 * vignette, and the two corner-chrome lines as First Paint shows them (Q2 (a)),
 * their text read off the shell's constants.
 *
 * **Projection.** A perspective camera looking down −z with vertical fov `f`
 * and aspect `A`: for a point at depth `d = camera.z − z`,
 * `px = ((x − cx) / (d·tan(f/2)·A) + 1) / 2 · W` and
 * `py = (1 − (y − cy) / (d·tan(f/2))) / 2 · H`. A Body is a camera-facing
 * billboard, so its outline, Ring and Moon are screen circles at the radius
 * projected at its own depth.
 *
 * **Identity.** Every colour, family, size and inset is read from
 * `src/tokens/tokens.ts`: no literal colour in this file, no filter, no blur,
 * no shadow, no rounded rect, no hue.
 *
 * **The PNG is captured once, by hand, not built** (Q5 (a)). The build renders
 * nothing; `public/preview.png` is committed. To regenerate it — part of the
 * deliberate re-solve (`src/derive/README.md`) — compose, then capture:
 *
 *     npm run compose:preview -- --out preview.svg
 *     chrome --headless --screenshot="<repo>/public/preview.png" --window-size=1200,630 --hide-scrollbars --force-device-scale-factor=1 --disable-lcd-text file:///<absolute path>/preview.svg
 *
 * The first command prints the second filled in, cwd-independent: the
 * `--screenshot` path absolute and quoted, the SVG as a `file:` URL. `chrome` is
 * the Chrome or Chromium binary — on Windows it means the full path to
 * `chrome.exe`, `"C:\Program Files\Google\Chrome\Application\chrome.exe"`; in
 * PowerShell a quoted path runs only through the call operator,
 * `& "C:\…\chrome.exe" --headless …`. Then delete the SVG, and run `npm test`:
 * `scripts/preview.test.ts` decodes the PNG and holds its size, its chroma and
 * its one white Star.
 *
 * **When to recapture.** After a re-solve that moves anything, and after any
 * change to the chrome strings (`IDENTITY_LINE`, `CHART_LINK_TEXT`, the Rail's
 * slot text) or to the tokens this file reads (colours, the `chrome` type role,
 * `spacing.xl`). The committed capture was made on Windows, where the token
 * font stack falls back to Arial; a capture elsewhere may set the chrome lines
 * in another face.
 *
 * `--artifact <file>` reads another artifact than the committed one: a test seam.
 * A missing or unparseable artifact, an artifact the scene's models refuse, or
 * an `--out` whose directory does not exist, exits 1 with one line naming the
 * file, and writes nothing.
 */

import { existsSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CHART_LINK_TEXT } from '../src/shell/route-link.ts';
import { IDENTITY_LINE, chromeSlot } from '../src/shell/chrome-model.ts';
import { tokens } from '../src/tokens/tokens.ts';
import { DEFAULT_FOV, buildScene, frameBodies, type Body, type SceneArtifact, type SceneFraming, type ScenePosition } from '../src/render-scene/scene-model.ts';
import { RAIL_LINE_SAMPLES_PER_SEGMENT, buildRail, railLine, type Rail } from '../src/render-scene/rail-model.ts';
import {
  VIGNETTE_INNER_OPACITY,
  VIGNETTE_INNER_STOP,
  VIGNETTE_OUTER_OPACITY,
  bodyRadius,
  bodyStroke,
  coreDots,
  sceneLines,
  sceneSubject,
} from '../src/render-scene/stroke-model.ts';
import { DUST_MEDIUM_COLOR, DUST_PARTICLE_COLOR, DUST_PARTICLE_OPACITY, DUST_PARTICLE_RADIUS, buildDust, falloffAt } from '../src/render-scene/dust-model.ts';
import { MOON_MIN_RADIUS_PX, notableMoons, notableRings } from '../src/render-scene/notable-model.ts';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));

/** The committed artifact the preview is composed from. */
export const ARTIFACT_PATH = resolve(REPO_ROOT, 'generated', 'layout.generated.json');

/** Where the capture lands: the committed preview, absolute so the command is cwd-independent. */
export const PNG_PATH = resolve(REPO_ROOT, 'public', 'preview.png');

/** The card: the size Slack, LinkedIn and the rest crop a large preview to. */
export const PREVIEW_WIDTH = 1200;
export const PREVIEW_HEIGHT = 630;

/** The card's aspect, which the opening camera is framed at. */
export const PREVIEW_ASPECT = PREVIEW_WIDTH / PREVIEW_HEIGHT;

/** How many stops the Dust medium's radial gradient samples `falloffAt` at, centre to edge. */
export const MEDIUM_GRADIENT_STOPS = 9;

/** The capture flags, verbatim: one CSS pixel per device pixel, grayscale text, no scrollbar. */
export const CAPTURE_FLAGS = [
  '--headless',
  '--screenshot',
  `--window-size=${PREVIEW_WIDTH},${PREVIEW_HEIGHT}`,
  '--hide-scrollbars',
  '--force-device-scale-factor=1',
  '--disable-lcd-text',
] as const;

/** The two chrome lines, as First Paint shows them: the identity line with its chart link, and the Rail's instruction. */
export function chromeLines(): { readonly topLeft: string; readonly bottomRight: string } {
  return { topLeft: `${IDENTITY_LINE} · ${CHART_LINK_TEXT}`, bottomRight: chromeSlot('rail', null).text };
}

/** The camera the preview is drawn through: keyframe 0, framed at the card's aspect. */
export function previewCamera(bodies: readonly Body[]): SceneFraming {
  return frameBodies(bodies, DEFAULT_FOV, PREVIEW_ASPECT);
}

/** A point on the card, and the pixels one scene unit spans at its depth. */
export interface Projected {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
}

/**
 * Projects a scene point onto the card through `camera` (see the header).
 * Throws on a point at or behind the camera: it has no place on the card, and
 * the formula would mirror it onto one.
 */
export function project(point: ScenePosition, camera: SceneFraming): Projected {
  const tangent = Math.tan((camera.fov * Math.PI) / 360);
  const depth = camera.position.z - point.z;
  if (!(depth > 0)) {
    throw new Error(`the point (${point.x}, ${point.y}, ${point.z}) is at or behind the camera at z ${camera.position.z}, so it has no place on the card.`);
  }
  const half = depth * tangent;
  return {
    x: (((point.x - camera.position.x) / (half * PREVIEW_ASPECT) + 1) / 2) * PREVIEW_WIDTH,
    y: ((1 - (point.y - camera.position.y) / half) / 2) * PREVIEW_HEIGHT,
    scale: PREVIEW_HEIGHT / 2 / half,
  };
}

/** A CSS pixel length token (`'40px'`) as a number. Throws on any other form. */
function px(value: string, name: string): number {
  const match = /^(\d+(?:\.\d+)?)px$/.exec(value);
  if (match === null) throw new Error(`${name} is ${JSON.stringify(value)}, not a <n>px length`);
  return Number(match[1]);
}

/** A number written to two places, so the SVG is byte-stable and small. Throws on a non-finite value. */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) throw new Error(`the preview cannot write the non-finite number ${String(value)}.`);
  const rounded = Math.round(value * 100) / 100;
  return Object.is(rounded, -0) ? '0' : String(rounded);
}

const n = formatNumber;

/** Escapes text and attribute values. */
function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * The opening subject: the Body `sceneSubject` names at scroll progress 0 on the
 * Rail, `client:decathlon` on today's artifact. Throws when there is none: a
 * preview with no white Star is not the opening frame.
 */
export function previewSubject(rail: Rail): string {
  const subject = sceneSubject({ mode: 'rail', flightTarget: null, scrollProgress: 0, focusedProjectId: null }, rail);
  if (subject === null) throw new Error('the Rail names no opening subject, so the preview would have no white Star.');
  return subject;
}

/**
 * Throws unless `camera` looks straight down −z: standing on its target's `x`
 * and `y`, above it, with no rotation. `project` assumes exactly that, so an
 * off-axis camera would be drawn as if it were not.
 */
export function assertOnAxis(camera: SceneFraming): void {
  const { position, target, rotation } = camera;
  if (position.x !== target.x || position.y !== target.y || !(position.z > target.z)) {
    throw new Error(
      `the preview camera at (${position.x}, ${position.y}, ${position.z}) does not look straight down −z at its target (${target.x}, ${target.y}, ${target.z}); project() assumes it does.`,
    );
  }
  if (rotation.x !== 0 || rotation.y !== 0 || rotation.z !== 0) {
    throw new Error(`the preview camera is rotated (${rotation.x}, ${rotation.y}, ${rotation.z}); project() assumes no rotation.`);
  }
}

/**
 * The preview as an SVG document, composed from `artifact`.
 *
 * Throws whatever the scene's models throw on an artifact they refuse
 * (`buildScene`, `buildRail`, `bodyStroke`, `sceneLines`): a preview of a
 * document the scene would not draw is not composed. Throws, too, on an
 * off-axis camera (`assertOnAxis`); `frame` is a test seam that defaults to
 * `previewCamera`.
 */
export function composePreview(artifact: SceneArtifact, frame: (bodies: readonly Body[]) => SceneFraming = previewCamera): string {
  const { bodies } = buildScene(artifact);
  const camera = frame(bodies);
  assertOnAxis(camera);
  const rail = buildRail(artifact, bodies);
  const subject = previewSubject(rail);
  const { media, particles } = buildDust(bodies);
  const out: string[] = [];

  out.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${PREVIEW_WIDTH}" height="${PREVIEW_HEIGHT}" viewBox="0 0 ${PREVIEW_WIDTH} ${PREVIEW_HEIGHT}">`,
  );

  // The gradients: one per Dust medium, and the vignette.
  out.push('<defs>');
  media.forEach((medium, index) => {
    const stops = Array.from({ length: MEDIUM_GRADIENT_STOPS }, (_, i) => {
      const t = i / (MEDIUM_GRADIENT_STOPS - 1);
      return `<stop offset="${n(t)}" stop-color="${DUST_MEDIUM_COLOR}" stop-opacity="${n(medium.opacity * falloffAt(t))}"/>`;
    });
    out.push(`<radialGradient id="medium-${index}">${stops.join('')}</radialGradient>`);
  });
  // The vignette: `ellipse farthest-corner at 50% 50%` — in the rect's own box,
  // where r = 0.5 is the inscribed ellipse, the one through the corners is √½.
  const vignette = tokens.colors['vignette-dark'];
  out.push(
    `<radialGradient id="vignette" cx="0.5" cy="0.5" r="${Math.SQRT1_2.toFixed(4)}">` +
      `<stop offset="${n(VIGNETTE_INNER_STOP / 100)}" stop-color="${vignette}" stop-opacity="${n(VIGNETTE_INNER_OPACITY)}"/>` +
      `<stop offset="1" stop-color="${vignette}" stop-opacity="${n(VIGNETTE_OUTER_OPACITY)}"/>` +
      '</radialGradient>',
  );
  out.push('</defs>');

  // The ground.
  out.push(`<rect width="${PREVIEW_WIDTH}" height="${PREVIEW_HEIGHT}" fill="${tokens.colors['surface-base-dark']}"/>`);

  // The Dust: each medium a billboard disc fading to 0 at its radius, then the particles.
  media.forEach((medium, index) => {
    const at = project(medium.position, camera);
    out.push(`<circle cx="${n(at.x)}" cy="${n(at.y)}" r="${n(medium.radius * at.scale)}" fill="url(#medium-${index})"/>`);
  });
  for (const particle of particles) {
    const at = project(particle.position, camera);
    out.push(
      `<circle cx="${n(at.x)}" cy="${n(at.y)}" r="${n(DUST_PARTICLE_RADIUS * at.scale)}" fill="${DUST_PARTICLE_COLOR}" fill-opacity="${n(DUST_PARTICLE_OPACITY)}"/>`,
    );
  }

  // The orbits and the Rail.
  for (const line of sceneLines(bodies, railLine(rail, RAIL_LINE_SAMPLES_PER_SEGMENT))) {
    const points = line.points.map(([x, y, z]) => {
      const at = project({ x, y, z }, camera);
      return `${n(at.x)},${n(at.y)}`;
    });
    out.push(
      `<polyline data-line="${esc(line.id)}" points="${points.join(' ')}" fill="none" stroke="${line.color}" stroke-width="${n(line.widthPx)}"/>`,
    );
  }

  // Each Body: its outline, its Ring, its core dot — a billboard, so screen circles.
  for (const body of bodies) {
    const at = project(body.position, camera);
    const stroke = bodyStroke(body, subject);
    out.push(
      `<circle data-body="${esc(body.id)}" cx="${n(at.x)}" cy="${n(at.y)}" r="${n(bodyRadius(body) * at.scale)}" fill="none" stroke="${stroke.color}" stroke-width="${n(stroke.widthPx)}"/>`,
    );
    for (const ring of notableRings(body)) {
      const [first] = ring.points;
      const radius = first === undefined ? 0 : Math.hypot(first[0], first[1]);
      out.push(
        `<circle data-ring="${esc(ring.id)}" cx="${n(at.x)}" cy="${n(at.y)}" r="${n(radius * at.scale)}" fill="none" stroke="${ring.color}" stroke-width="${n(ring.widthPx)}"/>`,
      );
    }
    for (const dot of coreDots(body, subject)) {
      out.push(`<circle data-core="${esc(dot.id)}" cx="${n(at.x)}" cy="${n(at.y)}" r="${n(dot.radius * at.scale)}" fill="${dot.color}"/>`);
    }
  }

  // The Moons, after the Bodies, held at their pixel floor.
  for (const moon of notableMoons(bodies)) {
    const at = project(moon.position, camera);
    const radius = Math.max(moon.radius * at.scale, MOON_MIN_RADIUS_PX);
    const cx = at.x + moon.center[0] * at.scale;
    const cy = at.y - moon.center[1] * at.scale;
    out.push(`<circle data-moon="${esc(moon.id)}" cx="${n(cx)}" cy="${n(cy)}" r="${n(radius)}" fill="${moon.color}"/>`);
  }

  // The vignette, over the whole frame.
  out.push(`<rect width="${PREVIEW_WIDTH}" height="${PREVIEW_HEIGHT}" fill="url(#vignette)"/>`);

  // The corner chrome: the `chrome` role at `ink-label`, each line box's outer corner at the `space-xl` inset.
  const role = tokens.typography.chrome;
  const size = px(role.fontSize, 'typography.chrome.fontSize');
  const inset = px(tokens.spacing.xl, 'spacing.xl');
  const halfLine = (size * role.lineHeight) / 2;
  const type =
    `font-family="${esc(role.fontFamily)}" font-size="${n(size)}" font-weight="${role.fontWeight}" ` +
    `letter-spacing="${role.letterSpacing}" fill="${tokens.colors['ink-label-dark']}" dominant-baseline="central"`;
  const { topLeft, bottomRight } = chromeLines();
  out.push(`<text data-chrome="identity" x="${n(inset)}" y="${n(inset + halfLine)}" ${type}>${esc(topLeft)}</text>`);
  out.push(
    `<text data-chrome="slot" x="${n(PREVIEW_WIDTH - inset)}" y="${n(PREVIEW_HEIGHT - inset - halfLine)}" text-anchor="end" ${type}>${esc(bottomRight)}</text>`,
  );

  out.push('</svg>');
  return `${out.join('\n')}\n`;
}

/**
 * The capture command for an SVG written at `svgPath`: cwd-independent, the
 * screenshot path absolute and quoted, the SVG a `file:` URL. On Windows,
 * `chrome` means the full path to `chrome.exe`.
 */
export function captureCommand(svgPath: string): string {
  const url = pathToFileURL(resolve(svgPath)).href;
  return `chrome ${CAPTURE_FLAGS.map((flag) => (flag === '--screenshot' ? `--screenshot="${PNG_PATH}"` : flag)).join(' ')} ${url}`;
}

/** The command line: `--out <file>` (required) and `--artifact <file>`. */
export function parseArgs(argv: readonly string[]): { out: string; artifact: string } | string[] {
  const failures: string[] = [];
  let out: string | undefined;
  let artifact: string | undefined;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i] as string;
    if (arg === '--out' || arg === '--artifact') {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith('--')) {
        failures.push(`${arg} needs a file — scripts/preview.ts ${arg} <file>.`);
        continue;
      }
      if (arg === '--out') out = value;
      else artifact = value;
      i += 1;
      continue;
    }
    failures.push(`unknown argument ${JSON.stringify(arg)} — scripts/preview.ts takes --out <file> and --artifact <file>.`);
  }
  if (out === undefined && !failures.some((line) => line.startsWith('--out'))) {
    failures.push('--out is required — scripts/preview.ts --out <file> writes the composed SVG there.');
  }
  return failures.length > 0 || out === undefined ? failures : { out, artifact: artifact ?? ARTIFACT_PATH };
}

function main(): void {
  const parsed = parseArgs(process.argv.slice(2));
  if (Array.isArray(parsed)) {
    for (const line of parsed) console.error(line);
    process.exit(1);
  }
  const fail = (line: string): never => {
    console.error(line);
    process.exit(1);
  };
  if (!existsSync(parsed.artifact)) fail(`the artifact ${parsed.artifact} does not exist.`);
  let artifact: SceneArtifact;
  try {
    artifact = JSON.parse(readFileSync(parsed.artifact, 'utf8')) as SceneArtifact;
  } catch {
    return fail(`the artifact ${parsed.artifact} is not readable JSON.`);
  }
  const directory = dirname(resolve(parsed.out));
  if (!existsSync(directory) || !statSync(directory).isDirectory()) fail(`the directory for ${parsed.out} does not exist.`);
  // Composed in full before anything is written: a refused artifact writes nothing.
  let svg: string;
  try {
    svg = composePreview(artifact);
  } catch (error) {
    return fail(`${parsed.artifact}: ${error instanceof Error ? error.message : String(error)}`.replace(/\s*\r?\n\s*/g, ' '));
  }
  writeFileSync(parsed.out, svg);
  console.log(`wrote ${parsed.out}. Capture it with:`);
  console.log(captureCommand(parsed.out));
}

/** True when this module is the process entry point (see scripts/tokens.ts for why both sides are canonicalised). */
function isEntryPoint(): boolean {
  const entry = process.argv[1];
  if (entry === undefined) return false;
  const canonical = (path: string): string => {
    let real: string;
    try {
      real = realpathSync(path);
    } catch {
      real = resolve(path);
    }
    return process.platform === 'win32' ? real.toLowerCase() : real;
  };
  return canonical(entry) === canonical(fileURLToPath(import.meta.url));
}

if (isEntryPoint()) {
  main();
}
