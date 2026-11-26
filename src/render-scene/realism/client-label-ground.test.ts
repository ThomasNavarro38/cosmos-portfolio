/**
 * The Client names' contrast over realism, composited (Epic 9 retro item 3; F-S2, F-V1,
 * F-V2). AC 9.3 and AC 9.7 say every name keeps its 4.5:1 floor over a fill, a glow or
 * the nebula. The identity audit reads each ink on the flat page ground only, so this
 * file builds the ground a shown name actually sits on and reads the ink on that.
 *
 * **The ground,** at every committed Rail stop, at 16:9, 32:9 and 16:10, at points across
 * every shown name's box, in encoded values as the frame blends them:
 *
 * - the void, or a belt in its own band at full density where the point lies on a
 *   belt's projected strip (`1 ± BELT_HALF_WIDTH_RATIO` of its orbit, as `beltArrays`
 *   builds it). A belt blends over what it lies on, so at alpha 1 it replaces the void;
 *   its profile, noise and junction fade are taken as 1, the worse case;
 * - plus every Star's glow at that point: its falloff `(1 - r²)²` over its projected
 *   `GLOW_RADIUS_RATIO` disc, at the subject's peak for the subject and its band's own
 *   peak otherwise, in its own tint;
 * - plus the nebula at its peak once for every pass of the ribbon over the point: the
 *   drawn Rail projected, each pass a run of segments within the ribbon's projected
 *   half-width. The density is taken as 1 and the end fades as none, the worse case.
 *
 * No fill, Ring or Moon is under a shown name: the box never meets another Body's marks
 * (`client-label-model.test.ts`), and a name sits below its own Star's disc.
 *
 * **The halo** (`CLIENT_LABEL_HALO`) composites the page ground over that, with the
 * coverage a stack of unoffset Gaussian shadows (σ = blur / 2) gives a stroke of
 * `STROKE_PX`. It is read at the glyph's edge and half a pixel out, where a reader sees
 * the stroke against its ground. This is a model of the browser's blur and of a 12px
 * weight-300 stroke, not pixels read back; Thomas's 9.11 pass is the on-screen check.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { PerspectiveCamera } from 'three';
import { tokens } from '../../tokens/tokens.ts';
import { projectToScreen, radiusPx, type AffordanceArtifact, type ScreenRect, type Viewport } from '../affordance-model.ts';
import { CLIENT_LABEL_HALO, CLIENT_LABEL_RECEDED_INK, CLIENT_LABEL_SUBJECT_INK, clientLabelFrame, type ClientLabelArtifact, type ClientLabelDraw, type ClientLabelState } from '../client-label-model.ts';
import { buildRail, RAIL_LINE_SAMPLES_PER_SEGMENT, railFarPlane, railLine, railPose, railStopCount, type Rail, type RailArtifact } from '../rail-model.ts';
import type { RealismArtifact } from '../realism-status.ts';
import { DEFAULT_FOV, DEFAULT_NEAR, buildScene, frameBodies, type Body, type SceneArtifact } from '../scene-model.ts';
import { STAR_RADIUS, sceneSubject } from '../stroke-model.ts';
import { BELT_BAND_LUMINANCE, BELT_HALF_WIDTH_RATIO, beltPlans } from './belt-model.ts';
import { NEBULA_HALF_WIDTH, NEBULA_PEAK_LUMINANCE } from './nebula-model.ts';
import { STAR_TINT_TOKENS } from './star-layer.ts';
import { GLOW_RADIUS_RATIO, bandPeak, starPlans } from './star-model.ts';

const ARTIFACT_JSON = fileURLToPath(new URL('../../../generated/layout.generated.json', import.meta.url));

/** A 12px weight-300 stroke, in CSS pixels: the thinnest a name's glyphs draw. */
const STROKE_PX = 1;

/** Where a reader sees the stroke against its ground: at its edge, and half a pixel out. */
const READ_AT_PX = [0, 0.5] as const;

/** Box points are sampled this far apart, in CSS pixels. */
const SAMPLE_PX = 2;

const VIEWPORTS: readonly Viewport[] = [
  { width: 1920, height: 1080 },
  { width: 3840, height: 1080 },
  { width: 1440, height: 900 },
];

const REST: ClientLabelState = { mode: 'rail', flightTarget: null, scrollProgress: 0, focusedProjectId: null, hoveredProjectId: null, keyboardProjectId: null };

// --- Colour, as the frame blends it --------------------------------------------------------

const channels = (hex: string): number[] => [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16) / 255).map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
const toSrgb = (value: number): number => (value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055);
const toLinear = (value: number): number => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
const luminanceOf = (rgb: readonly number[]): number => 0.2126 * rgb[0]! + 0.7152 * rgb[1]! + 0.0722 * rgb[2]!;
const contrastOf = (a: number, b: number): number => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

/** A tint at an absolute linear luminance, as the shaders write it (divided by its own luminance, clamped), encoded. */
const tintAt = (linear: readonly number[], luminance: number): number[] => linear.map((value) => toSrgb(Math.min((value / Math.max(luminanceOf(linear), 1e-6)) * luminance, 1)));

const VOID = channels(tokens.colors['surface-base-dark']).map(toSrgb);
const BELT_LINEAR = channels(tokens.colors['realism-belt-dark']);
const NEBULA = tintAt(channels(tokens.colors['realism-nebula-dark']), NEBULA_PEAK_LUMINANCE);

// --- The halo -----------------------------------------------------------------------------

const erf = (x: number): number => {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return x >= 0 ? y : -y;
};
const normalCdf = (x: number): number => 0.5 * (1 + erf(x / Math.SQRT2));

/** Each layer's blur, from the halo as the plate writes it. */
function haloBlurs(halo: string): number[] {
  return halo.split(', ').map((layer) => {
    const match = /^0 0 (\d+(?:\.\d+)?)px #[0-9A-Fa-f]{6}$/.exec(layer);
    assert.ok(match !== null, `an unoffset, opaque layer: ${layer}`);
    return Number(match[1]);
  });
}

/** The page ground's coverage `outPx` beyond a stroke's edge, under every layer stacked. */
function haloCoverage(blurs: readonly number[], outPx: number): number {
  return 1 - blurs.reduce((left, blur) => left * (1 - (normalCdf((STROKE_PX + outPx) / (blur / 2)) - normalCdf(outPx / (blur / 2)))), 1);
}

// --- The committed sky --------------------------------------------------------------------

type Committed = SceneArtifact & RailArtifact & ClientLabelArtifact & AffordanceArtifact & Omit<RealismArtifact, 'railLine'>;

function committed() {
  const artifact = JSON.parse(readFileSync(ARTIFACT_JSON, 'utf8')) as Committed;
  const { bodies } = buildScene(artifact);
  const rail = buildRail(artifact, bodies);
  const realism = { ...artifact, railLine: [] };
  return { artifact, bodies, rail, line: railLine(rail, RAIL_LINE_SAMPLES_PER_SEGMENT), plans: starPlans(realism), belts: beltPlans(realism) };
}

function stopCamera(rail: Rail, bodies: readonly Body[], k: number, viewport: Viewport): PerspectiveCamera {
  const aspect = viewport.width / viewport.height;
  const pose = railPose(rail, k, aspect);
  const camera = new PerspectiveCamera(DEFAULT_FOV, aspect, DEFAULT_NEAR, Math.max(frameBodies(bodies).far, railFarPlane(rail, bodies)));
  camera.position.set(pose.position.x, pose.position.y, pose.position.z);
  camera.lookAt(pose.target.x, pose.target.y, pose.target.z);
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  return camera;
}

interface Disc {
  readonly x: number;
  readonly y: number;
  readonly r: number;
}

/** Distance from `p` to the segment `a`–`b`. */
function toSegment(p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const t = dx === 0 && dy === 0 ? 0 : Math.min(Math.max(((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy), 0), 1);
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** How many passes of the ribbon lie over `p`: runs of projected segments within the half-width. */
function ribbonPasses(p: { x: number; y: number }, ribbon: readonly (Disc | null)[]): number {
  let passes = 0;
  let inside = false;
  for (let i = 0; i + 1 < ribbon.length; i += 1) {
    const a = ribbon[i];
    const b = ribbon[i + 1];
    const over = a != null && b != null && toSegment(p, a, b) < Math.max(a.r, b.r);
    if (over && !inside) passes += 1;
    inside = over;
  }
  return passes;
}

interface Spot {
  readonly x: number;
  readonly y: number;
}

/** Whether `p` is inside the triangle `a b c`, either winding. */
function inTriangle(p: Spot, a: Spot, b: Spot, c: Spot): boolean {
  const side = (u: Spot, v: Spot): number => (v.x - u.x) * (p.y - u.y) - (v.y - u.y) * (p.x - u.x);
  const [d1, d2, d3] = [side(a, b), side(b, c), side(c, a)];
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
}

/** One belt's strip, projected: an inner and an outer point per orbit point, `null` behind the camera. */
type Strip = { readonly colour: number[]; readonly quads: readonly (readonly [Spot, Spot, Spot, Spot])[] };

/** Whether `p` lies on the strip. */
const onStrip = (p: Spot, strip: Strip): boolean => strip.quads.some(([a, b, c, d]) => inTriangle(p, a, b, c) || inTriangle(p, a, c, d));

/** The sample points across a box, its edges included. */
function samples(box: ScreenRect): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  for (let y = box.top; y <= box.bottom + 1e-9; y += Math.max(Math.min(SAMPLE_PX, box.bottom - box.top), 1e-3)) {
    for (let x = box.left; x <= box.right + 1e-9; x += Math.max(Math.min(SAMPLE_PX, box.right - box.left), 1e-3)) points.push({ x, y });
  }
  return points;
}

interface Reading {
  readonly where: string;
  readonly contrast: number;
  readonly passes: number;
}

/**
 * The least contrast each ink reads at, over every shown name at every stop and viewport,
 * for the halo `halo` and the inks given, and the most ribbon passes any point had.
 */
function groundReadings(halo: string, inks: { subject: string; receded: string }): { subject: Reading; receded: Reading; names: number; maxPasses: number } {
  const { artifact, bodies, rail, line, plans, belts } = committed();
  const coverages = READ_AT_PX.map((out) => haloCoverage(haloBlurs(halo), out));
  const worst = { subject: { where: '', contrast: Infinity, passes: 0 }, receded: { where: '', contrast: Infinity, passes: 0 } };
  let names = 0;
  let maxPasses = 0;
  for (const viewport of VIEWPORTS) {
    for (let k = 0; k <= railStopCount(rail); k += 1) {
      const nav = { ...REST, scrollProgress: k };
      const subject = sceneSubject(nav, rail);
      const camera = stopCamera(rail, bodies, k, viewport);
      const view = camera.matrixWorldInverse.elements;
      const projection = camera.projectionMatrix.elements;
      const glows = plans.flatMap((plan) => {
        const screen = projectToScreen(plan.position, view, projection, viewport);
        if (screen === null) return [];
        const r = radiusPx(GLOW_RADIUS_RATIO * STAR_RADIUS, screen.depth, projection, viewport.height);
        const colour = tintAt(channels(tokens.colors[STAR_TINT_TOKENS[plan.tint]]), bandPeak(plan.band, plan.id === subject ? 1 : 0));
        return [{ x: screen.x, y: screen.y, r, colour }];
      });
      const ribbon = line.map((point) => {
        const screen = projectToScreen(point, view, projection, viewport);
        return screen === null ? null : { x: screen.x, y: screen.y, r: radiusPx(NEBULA_HALF_WIDTH, screen.depth, projection, viewport.height) };
      });
      const strips: Strip[] = belts.map((belt) => {
        const at = (point: readonly [number, number, number], scale: number) => projectToScreen({ x: belt.centre.x + (point[0] - belt.centre.x) * scale, y: belt.centre.y + (point[1] - belt.centre.y) * scale, z: belt.centre.z + (point[2] - belt.centre.z) * scale }, view, projection, viewport);
        const inner = belt.points.map((point) => at(point, 1 - BELT_HALF_WIDTH_RATIO));
        const outer = belt.points.map((point) => at(point, 1 + BELT_HALF_WIDTH_RATIO));
        const quads = inner.slice(0, -1).flatMap((a, i) => {
          const [b, c, d] = [inner[i + 1], outer[i + 1], outer[i]];
          return a === null || b == null || c == null || d == null ? [] : [[a, b, c, d] as const];
        });
        return { colour: tintAt(BELT_LINEAR, BELT_BAND_LUMINANCE[belt.band]), quads };
      });
      const draws = clientLabelFrame(nav, artifact, bodies, rail, view, projection, viewport);
      for (const draw of draws.filter((each): each is Extract<ClientLabelDraw, { visible: true }> => each.visible)) {
        names += 1;
        const which = draw.id === subject ? 'subject' : 'receded';
        const ink = luminanceOf(channels(which === 'subject' ? inks.subject : inks.receded));
        for (const point of samples(draw.box)) {
          const passes = ribbonPasses(point, ribbon);
          maxPasses = Math.max(maxPasses, passes);
          const under = strips.filter((strip) => onStrip(point, strip));
          const scene = VOID.map((empty, i) => {
            const below = under.reduce((most, strip) => Math.max(most, strip.colour[i]!), empty);
            const glow = glows.reduce((sum, disc) => {
              const t = Math.hypot(point.x - disc.x, point.y - disc.y) / disc.r;
              return t >= 1 ? sum : sum + disc.colour[i]! * (1 - t * t) ** 2;
            }, 0);
            return Math.min(below + glow + passes * NEBULA[i]!, 1);
          });
          for (const coverage of coverages) {
            const ground = luminanceOf(scene.map((value, i) => toLinear(coverage * VOID[i]! + (1 - coverage) * value)));
            const reading = contrastOf(ink, ground);
            if (reading < worst[which].contrast) worst[which] = { where: `stop ${k} at ${viewport.width}×${viewport.height}, ${draw.id} at (${point.x.toFixed(0)}, ${point.y.toFixed(0)}), coverage ${coverage.toFixed(2)}`, contrast: reading, passes };
          }
        }
      }
    }
  }
  return { ...worst, names, maxPasses };
}

const SHIPPED = { subject: CLIENT_LABEL_SUBJECT_INK, receded: CLIENT_LABEL_RECEDED_INK };

test('every shown Client name keeps 4.5:1 over its composited ground, at every committed Rail stop and viewport', () => {
  const { subject, receded, names, maxPasses } = groundReadings(CLIENT_LABEL_HALO, SHIPPED);
  assert.ok(names > 0, 'names are shown: something to measure');
  assert.ok(Number.isFinite(subject.contrast) && Number.isFinite(receded.contrast), 'both inks are read');
  assert.ok(subject.contrast >= 4.5, `the subject's name reads ${subject.contrast.toFixed(2)}:1, at ${subject.where}`);
  assert.ok(receded.contrast >= 4.5, `a receded name reads ${receded.contrast.toFixed(2)}:1, at ${receded.where}`);
  assert.ok(maxPasses >= 1, `some name sits on the ribbon: the nebula is in the ground (${maxPasses} passes at most)`);
});

test('the composited check bites: ink-label (the old receded ink) fails it, and so does a name with no halo', () => {
  assert.ok(groundReadings(CLIENT_LABEL_HALO, { ...SHIPPED, receded: tokens.colors['ink-label-dark'] }).receded.contrast < 4.5, 'ink-label in a near glow fails half a pixel out');
  assert.ok(groundReadings('0 0 0.01px #000000', SHIPPED).receded.contrast < 4.5, 'with no halo the glow takes the floor');
});

test('the halo model: two layers cover a 1px stroke about 0.66 at its edge, and fall off within a pixel', () => {
  const blurs = haloBlurs(CLIENT_LABEL_HALO);
  assert.deepEqual(blurs, [1, 2]);
  assert.ok(Math.abs(haloCoverage(blurs, 0) - 0.66) < 0.01, String(haloCoverage(blurs, 0)));
  assert.ok(haloCoverage(blurs, 0.5) < haloCoverage(blurs, 0) && haloCoverage(blurs, 1) < 0.2, 'the halo hugs the glyph');
});
