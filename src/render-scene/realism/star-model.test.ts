/**
 * Stars that glow (7.7): the pure model, the shaders' pinned source, the rows over
 * real three objects with no GL, and the source audits that hold what no test can see
 * move, each driven over mutations. The real pixels are in
 * `_bmad-output/implementation-artifacts/realism-glow-7-7.md`.
 */

import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { AdditiveBlending, Color, FrontSide, Group, type Mesh, NormalBlending, type Object3D, PerspectiveCamera, Quaternion, Scene, type ShaderMaterial, SphereGeometry, type WebGLRenderer } from 'three';
import { filesUnder, isTestFile, SOURCE_MODULE, stripComments, stripCommentsAndStrings } from '../../../scripts/source-scan.ts';
import { REDUCED_MOTION_PACE } from '../../shell/motion-preference.ts';
import { tokens } from '../../tokens/tokens.ts';
import { createRealismOwner, type RealismArtifact } from '../realism-status.ts';
import { FILL_RENDER_ORDER, GLOW_RENDER_ORDER } from '../scene-model.ts';
import { STAR_RADIUS } from '../stroke-model.ts';
import { DUST_DRAWS_BUDGET, PLANET_DRAWS_BUDGET, STAR_DRAWS_BUDGET } from './budgets.ts';
import { createFillLayer } from './fill-layer.ts';
import { addedDraws, FILL_CEILING_LUMINANCE, FILL_RADIUS_RATIO, fillPlans } from './fill-model.ts';
import { FILL_VERTEX_SHADER } from './fill-shader.ts';
import { createStarRows, STAR_TINT_TOKENS } from './star-layer.ts';
import {
  bandPeak,
  coreCentreLuminance,
  GLOW_BAND_PEAK,
  GLOW_RADIUS_RATIO,
  GLOW_SUBJECT_PEAK,
  nextClock,
  RISE_MAX_FRAME_SECONDS,
  RISE_SECONDS,
  nextRise,
  riseShape,
  seedRise,
  STAR_BAND_LUMINANCE,
  STAR_CLOCK_WRAP_SECONDS,
  STAR_CORE_ALPHA_FLOOR,
  STAR_CORE_EDGE,
  STAR_CORE_LIMB,
  STAR_GRAIN_DEPTH,
  STAR_GRAIN_DRIFT,
  STAR_GRAIN_SCALE,
  STAR_PULSE_SECONDS,
  STAR_REST_CEILING_LUMINANCE,
  STAR_SUBJECT_CEILING_LUMINANCE,
  STAR_SUBJECT_DIP,
  STAR_TINT_NAMES,
  starPlans,
  starPulse,
  type StarBand,
  type StarTint,
  GLOW_94_LUMINANCE,
  TINT_ORDER,
} from './star-model.ts';
import { GLOW_FRAGMENT_SHADER, GLOW_VERTEX_SHADER, glslFloat, STAR_FILL_FRAGMENT_SHADER, STAR_FILL_VERTEX_SHADER } from './star-shader.ts';

/** Each tint's token (9.5), as the layer's record must name it. */
const TINT_TOKEN = (tint: StarTint): keyof typeof tokens.colors => `realism-star-${tint}-dark` as keyof typeof tokens.colors;
/** 9.4's one glow colour, retired in 9.5: the glow peaks are its shares, times its luminance. */
const GLOW_94_HEX = '#B09468';
const APPEARANCE = { map: 'moon', meanLuminance: 0.324, tilt: 0.25, spinRate: 0.05, spinPhase: 1.5 };
const ARTIFACT: RealismArtifact = {
  clients: [
    { id: 'client:a', position: { x: 1, y: 2, z: 3 }, luminanceBand: 'stroke-near', appearance: { tint: 'red', pulsePhase: 1.5 }, projects: [{ id: 'project:a/one', clientId: 'client:a', position: { x: 11, y: 2, z: 3 }, appearance: APPEARANCE }] },
    { id: 'client:b', position: { x: 100, y: 0, z: 0 }, luminanceBand: 'stroke-rest', appearance: { tint: 'blue', pulsePhase: 0 }, projects: [] },
  ],
};
const IMAGES: ReadonlyMap<string, ImageBitmap> = new Map([['moon', {} as ImageBitmap]]);
const DELTA = 1 / 60;

/** An sRGB hex's linear relative luminance, by the sRGB transfer and Rec. 709 weights. */
const toLinear = (value: number): number => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
const toSrgb = (value: number): number => (value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055);
const WEIGHTS = [0.2126, 0.7152, 0.0722] as const;
function channels(hex: string): [number, number, number] {
  return [1, 3, 5].map((at) => toLinear(parseInt(hex.slice(at, at + 2), 16) / 255)) as [number, number, number];
}
const luminanceOf = (rgb: readonly number[]): number => rgb.reduce((sum, value, at) => sum + value * WEIGHTS[at]!, 0);
const linearLuminance = (hex: string): number => luminanceOf(channels(hex));

// --- The model -----------------------------------------------------------------------------------

test('the plans are one per Client, by id, position, band, tint and pulse phase, in the artifact\'s order', () => {
  assert.deepEqual(starPlans(ARTIFACT), [
    { id: 'client:a', position: { x: 1, y: 2, z: 3 }, band: 'stroke-near', tint: 'red', pulsePhase: 1.5 },
    { id: 'client:b', position: { x: 100, y: 0, z: 0 }, band: 'stroke-rest', tint: 'blue', pulsePhase: 0 },
  ]);
  assert.deepEqual(starPlans({ clients: [] }), [], 'no Clients, no Stars');
});

test('a Star with a non-finite position throws, naming it', () => {
  for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    for (const axis of ['x', 'y', 'z'] as const) {
      const bad: RealismArtifact = { clients: [{ id: 'client:bad', position: { x: 0, y: 0, z: 0, [axis]: value }, luminanceBand: 'stroke-rest', appearance: { tint: 'white', pulsePhase: 0 }, projects: [] }] };
      assert.throws(() => starPlans(bad), /client:bad/, `${axis} ${value}`);
    }
  }
});

test('an unknown band, or a pulse phase that is not finite, throws naming the Client (9.4)', () => {
  const star = (luminanceBand: string, pulsePhase: number): RealismArtifact => ({ clients: [{ id: 'client:bad', position: { x: 0, y: 0, z: 0 }, luminanceBand, appearance: { tint: 'white', pulsePhase }, projects: [] }] });
  for (const band of ['stroke-active', 'stroke-focus', 'stroke-dust', '', 'toString', 'constructor', '__proto__']) {
    assert.throws(() => starPlans(star(band, 0)), /client:bad has no usable band/, band);
  }
  for (const phase of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, undefined as unknown as number]) {
    assert.throws(() => starPlans(star('stroke-rest', phase)), /client:bad has no usable pulsePhase/, String(phase));
  }
  assert.doesNotThrow(() => starPlans(star('stroke-near', 6.2832)));
  const bare = { clients: [{ id: 'client:bare', position: { x: 0, y: 0, z: 0 }, luminanceBand: 'stroke-rest', projects: [] }] } as unknown as RealismArtifact;
  assert.throws(() => starPlans(bare), /client:bare has no usable pulsePhase/, 'a missing appearance names the Client');
});

test('a tint that is unknown or missing throws naming the Client (9.5)', () => {
  const star = (appearance: unknown): RealismArtifact => ({ clients: [{ id: 'client:hue', position: { x: 0, y: 0, z: 0 }, luminanceBand: 'stroke-rest', appearance, projects: [] }] } as unknown as RealismArtifact);
  for (const tint of ['green', 'realism-star-blue', 'realism-star-blue-dark', 'Blue', '', 'toString', '__proto__', 0, null]) {
    assert.throws(() => starPlans(star({ tint, pulsePhase: 0 })), /client:hue has no usable tint/, String(tint));
  }
  assert.throws(() => starPlans(star({ pulsePhase: 0 })), /client:hue has no usable tint: undefined/, 'a missing tint names the Client');
  for (const tint of STAR_TINT_NAMES) assert.equal(starPlans(star({ tint, pulsePhase: 0 }))[0]?.tint, tint);
});

// --- The tints (9.5) -------------------------------------------------------------------------------

/**
 * derive's `STAR_TINTS`, `TINT_ORDER` and whether the list is frozen, read from the module itself in a
 * child process: `src/render-scene/` imports nothing of `src/derive/`, its tests included (the boundary
 * scan holds them too), so this is the `done.test.ts` idiom rather than an import or a source scrape.
 */
function deriveTints(): { readonly tints: string[]; readonly order: Record<string, number>; readonly frozen: boolean } {
  const script = 'const m = await import(process.env.APPEARANCE_URL); process.stdout.write(JSON.stringify({ tints: m.STAR_TINTS, order: m.TINT_ORDER, frozen: Object.isFrozen(m.STAR_TINTS) }));';
  const url = pathToFileURL(fileURLToPath(new URL('../../derive/appearance.ts', import.meta.url))).href;
  const run = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8', env: { ...process.env, APPEARANCE_URL: url }, timeout: 60_000 });
  assert.equal(run.status, 0, `reading derive's tints exited ${String(run.status)}:\n${run.stderr}`);
  return JSON.parse(run.stdout) as { tints: string[]; order: Record<string, number>; frozen: boolean };
}
const DERIVE = deriveTints();
const STAR_TINTS = DERIVE.tints;
const DERIVE_TINT_ORDER = DERIVE.order;

test('the tint names are derive\'s STAR_TINTS, in order: blue, white, yellow, orange, red, and both lists are frozen', () => {
  assert.deepEqual([...STAR_TINT_NAMES], ['blue', 'white', 'yellow', 'orange', 'red']);
  assert.deepEqual([...STAR_TINT_NAMES], [...STAR_TINTS]);
  assert.ok(Object.isFrozen(STAR_TINT_NAMES) && DERIVE.frozen, 'neither list can be reordered at run time');
});

test('each TINT_ORDER value is its key\'s index, here and in derive, so the numbers cannot read as an order they are not', () => {
  for (const [name, order] of [['realism', TINT_ORDER], ['derive', DERIVE_TINT_ORDER]] as const) {
    Object.entries(order).forEach(([tint, value], index) => assert.equal(value, index, `${name}: ${tint} is at ${index}`));
  }
  const swapped = { blue: 1, white: 0, yellow: 2, orange: 3, red: 4 };
  assert.ok(Object.entries(swapped).some(([, value], index) => value !== index), 'a swap of the numbers is caught');
});

test('the layer throws naming the Star on a plan whose tint has no token, before it adds a draw (9.5)', () => {
  const group = new Group();
  const plans = starPlans(ARTIFACT);
  for (const tint of ['green', 'realism-star-blue-dark', '__proto__', 'toString', undefined]) {
    const bad = [...plans, { ...plans[0]!, id: 'client:off', tint: tint as unknown as StarTint }];
    assert.throws(() => createStarRows(bad, new SphereGeometry(1, 8, 4), { value: 0 }, group), /client:off has no usable tint/, String(tint));
    assert.equal(group.children.length, 0, `${String(tint)}: nothing was added`);
  }
});

test('the layer\'s record maps exactly the five tints, each to its own realism-star-<tint>-dark token, which is declared', () => {
  assert.deepEqual(Object.keys(STAR_TINT_TOKENS).sort(), [...STAR_TINT_NAMES].sort());
  for (const tint of STAR_TINT_NAMES) {
    assert.equal(STAR_TINT_TOKENS[tint], TINT_TOKEN(tint), tint);
    assert.match(tokens.colors[STAR_TINT_TOKENS[tint]], /^#[0-9A-F]{6}$/i, `${tint} is a declared token`);
  }
  assert.equal(new Set(Object.values(STAR_TINT_TOKENS)).size, 5, 'five distinct tokens');
  assert.ok(!Object.keys(tokens.colors).some((key) => key.startsWith('realism-star-glow')), 'realism-star-glow is retired');
});

// --- The pulse, the clock and the bands (9.4) ------------------------------------------------------

const BANDS: readonly StarBand[] = ['stroke-rest', 'stroke-near'];
/** Clocks across several pulses, and phases across a turn. */
const CLOCKS = Array.from({ length: 241 }, (_, at) => (at * STAR_PULSE_SECONDS * 3) / 240);
const PHASES = [0, 0.7, 1.5, Math.PI, 4.9, 6.2832];

test('the clock advances by the delta, holds while reduced, and holds on a bad delta', () => {
  assert.equal(nextClock(2, DELTA, false), 2 + DELTA);
  assert.equal(nextClock(2, 10, false), 2 + RISE_MAX_FRAME_SECONDS, 'a ten second stall is clamped, as the rise is');
  assert.equal(nextClock(2, DELTA, true), 2, 'reduced: it holds');
  assert.equal(nextClock(nextClock(2, DELTA, true), DELTA, false), 2 + DELTA, 'and resumes from there');
  for (const delta of [Number.NaN, Number.POSITIVE_INFINITY, -1, 0]) assert.equal(nextClock(2, delta, false), 2, `delta ${delta}`);
});

test('the clock wraps at STAR_CLOCK_WRAP_SECONDS, a whole number of pulses, so the pulse is continuous across it', () => {
  assert.equal(STAR_CLOCK_WRAP_SECONDS, 3600);
  assert.ok(Number.isInteger(STAR_CLOCK_WRAP_SECONDS / STAR_PULSE_SECONDS), 'a whole number of pulses');
  const before = STAR_CLOCK_WRAP_SECONDS - DELTA / 2;
  const after = nextClock(before, DELTA, false);
  assert.ok(after >= 0 && after < DELTA, `wrapped to ${after}`);
  for (const phase of PHASES) assert.ok(Math.abs(starPulse(after, phase) - starPulse(before + DELTA, phase)) < 1e-9, 'no pulse jump at the wrap');
  let clock = 0;
  for (let at = 0; at < 80_000; at += 1) {
    clock = nextClock(clock, RISE_MAX_FRAME_SECONDS, false);
    assert.ok(clock >= 0 && clock < STAR_CLOCK_WRAP_SECONDS);
  }
});

test('the pulse is in [0, 1], one slow sine of STAR_PULSE_SECONDS, phased', () => {
  assert.ok(STAR_PULSE_SECONDS >= 4, 'slow: no faster than one pulse in four seconds');
  for (const phase of PHASES) {
    for (const clock of CLOCKS) {
      const pulse = starPulse(clock, phase);
      assert.ok(pulse >= 0 && pulse <= 1, `${clock} ${phase}`);
      assert.ok(Math.abs(starPulse(clock + STAR_PULSE_SECONDS, phase) - pulse) < 1e-9, 'periodic');
    }
  }
  assert.ok(Math.abs(starPulse(0, Math.PI / 2) - 1) < 1e-12, 'its peak');
  assert.notEqual(starPulse(0, 0), starPulse(0, 1.5), 'the phase moves it');
});

test('the band ranges are disjoint and ordered, dimmest first, and under the rest ceiling', () => {
  const [restLow, restHigh] = STAR_BAND_LUMINANCE['stroke-rest'];
  const [nearLow, nearHigh] = STAR_BAND_LUMINANCE['stroke-near'];
  assert.deepEqual(Object.keys(STAR_BAND_LUMINANCE), ['stroke-rest', 'stroke-near'], 'the resting bands, dimmest first');
  assert.ok(restLow > 0 && restLow < restHigh, 'rest is a range');
  assert.ok(nearLow < nearHigh, 'near is a range');
  assert.ok(restHigh < nearLow, 'disjoint and ordered');
  assert.ok(nearHigh < STAR_REST_CEILING_LUMINANCE, 'under stroke-active');
  assert.ok(GLOW_BAND_PEAK['stroke-rest'] < GLOW_BAND_PEAK['stroke-near'] && GLOW_BAND_PEAK['stroke-near'] < GLOW_SUBJECT_PEAK, 'the glow keeps the ladder');
});

test('at rest, at any clock and phase, the centre stays within its band, and a near Star\'s lowest is above a rest Star\'s highest', () => {
  for (const band of BANDS) {
    const [low, high] = STAR_BAND_LUMINANCE[band];
    for (const phase of PHASES) {
      for (const clock of CLOCKS) {
        const centre = coreCentreLuminance(band, starPulse(clock, phase), 0);
        assert.ok(centre >= low - 1e-12 && centre <= high + 1e-12, `${band} ${clock} ${phase}: ${centre}`);
      }
    }
  }
  const nearLowest = Math.min(...PHASES.flatMap((phase) => CLOCKS.map((clock) => coreCentreLuminance('stroke-near', starPulse(clock, phase), 0))));
  const restHighest = Math.max(...PHASES.flatMap((phase) => CLOCKS.map((clock) => coreCentreLuminance('stroke-rest', starPulse(clock, phase), 0))));
  assert.ok(nearLowest > restHighest, `${nearLowest} over ${restHighest}`);
});

test('as the subject the centre is in [ceiling × (1 − dip), ceiling], its peak exactly stroke-focus', () => {
  assert.ok(STAR_SUBJECT_DIP > 0 && STAR_SUBJECT_DIP < 0.2);
  const ceiling = STAR_SUBJECT_CEILING_LUMINANCE;
  for (const band of BANDS) {
    for (const phase of PHASES) {
      for (const clock of CLOCKS) {
        const centre = coreCentreLuminance(band, starPulse(clock, phase), 1);
        assert.ok(centre >= ceiling * (1 - STAR_SUBJECT_DIP) - 1e-12 && centre <= ceiling, `${band} ${clock}: ${centre}`);
      }
    }
    assert.equal(coreCentreLuminance(band, 1, 1), ceiling, 'the pulse only dims: at its peak, the ceiling');
    assert.ok(Math.abs(coreCentreLuminance(band, 0, 1) - ceiling * (1 - STAR_SUBJECT_DIP)) < 1e-12);
  }
});

test('the glow peaks are absolute luminance: 9.4\'s shares × the linear luminance of #B09468 (9.5)', () => {
  assert.ok(Math.abs(GLOW_94_LUMINANCE - linearLuminance(GLOW_94_HEX)) < 1e-12, `GLOW_94_LUMINANCE is L(${GLOW_94_HEX})`);
  assert.ok(Math.abs(GLOW_BAND_PEAK['stroke-rest'] - 0.16 * linearLuminance(GLOW_94_HEX)) < 1e-12);
  assert.ok(Math.abs(GLOW_BAND_PEAK['stroke-near'] - 0.22 * linearLuminance(GLOW_94_HEX)) < 1e-12);
  assert.ok(Math.abs(GLOW_SUBJECT_PEAK - 0.6 * linearLuminance(GLOW_94_HEX)) < 1e-12);
});

test('the glow\'s peak is its band\'s at rest and the subject\'s risen, between them as it rises', () => {
  for (const band of BANDS) {
    assert.equal(bandPeak(band, 0), GLOW_BAND_PEAK[band]);
    assert.ok(Math.abs(bandPeak(band, 1) - GLOW_SUBJECT_PEAK) < 1e-12);
    assert.ok(bandPeak(band, 0.5) > GLOW_BAND_PEAK[band] && bandPeak(band, 0.5) < GLOW_SUBJECT_PEAK);
  }
});

test('the first frame seeds the rise with no ramp: the subject at 1, every other at 0', () => {
  assert.equal(seedRise(true), 1);
  assert.equal(seedRise(false), 0);
});

test('the subject rises and any other falls, by delta over RISE_SECONDS × pace, stopping at the ends', () => {
  assert.ok(Math.abs(nextRise(0, true, DELTA, 1) - DELTA / RISE_SECONDS) < 1e-12);
  assert.ok(Math.abs(nextRise(1, false, DELTA, 1) - (1 - DELTA / RISE_SECONDS)) < 1e-12);
  assert.ok(Math.abs(nextRise(0, true, DELTA, 0.25) - DELTA / (RISE_SECONDS * 0.25)) < 1e-12, 'pace shortens it');
  assert.equal(nextRise(1, true, DELTA, 1), 1);
  assert.equal(nextRise(0, false, DELTA, 1), 0);
  assert.equal(nextRise(0.999, true, DELTA, 1), 1);
  assert.equal(nextRise(0.001, false, DELTA, 1), 0);
});

for (const [name, pace] of [['full motion', 1], ['reduced motion', 0.25]] as const) {
  test(`at ${name} the rise completes in RISE_SECONDS × pace, in more than one step, with no cut`, () => {
    const steps = Math.ceil((RISE_SECONDS * pace) / DELTA);
    let rise = 0;
    let largest = 0;
    for (let at = 0; at < steps; at += 1) {
      const next = nextRise(rise, true, DELTA, pace);
      largest = Math.max(largest, next - rise);
      rise = next;
      if (at < steps - 1) assert.ok(rise < 1, `step ${at + 1} of ${steps} has not arrived`);
    }
    assert.equal(rise, 1);
    assert.ok(steps > 1);
    assert.ok(largest < 1, 'no one step is the whole move');
  });
}

test('a stall moves the rise by the clamped step at most, at any pace', () => {
  assert.ok(RISE_MAX_FRAME_SECONDS > 0 && RISE_MAX_FRAME_SECONDS < RISE_SECONDS * REDUCED_MOTION_PACE, 'even reduced, a stall is less than the whole move');
  for (const pace of [1, REDUCED_MOTION_PACE]) {
    const clamped = RISE_MAX_FRAME_SECONDS / (RISE_SECONDS * pace);
    assert.ok(Math.abs(nextRise(0, true, 10, pace) - clamped) < 1e-12, `pace ${pace}`);
    assert.ok(Math.abs(nextRise(1, false, 10, pace) - (1 - clamped)) < 1e-12, `pace ${pace}`);
    assert.ok(clamped < 1, 'a stall cannot cut');
  }
});

test('a bad delta holds the rise', () => {
  for (const delta of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -1, 0]) {
    assert.equal(nextRise(0.5, true, delta, 1), 0.5, `delta ${delta}`);
    assert.equal(nextRise(0.5, false, delta, 1), 0.5, `delta ${delta}`);
  }
});

test('a pace that could not divide steps at full motion, so a falling Star still reaches rest', () => {
  for (const pace of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(nextRise(0.5, true, DELTA, pace), nextRise(0.5, true, DELTA, 1), `pace ${pace}`);
    assert.equal(nextRise(0.5, false, DELTA, pace), nextRise(0.5, false, DELTA, 1), `pace ${pace}`);
  }
});

test('the shape eases from 0 to 1, monotone with no slope at either end, and holds a value out of range', () => {
  assert.equal(riseShape(0), 0);
  assert.equal(riseShape(1), 1);
  assert.equal(riseShape(0.5), 0.5);
  assert.equal(riseShape(-1), 0);
  assert.equal(riseShape(2), 1);
  let previous = 0;
  for (let at = 1; at <= 100; at += 1) {
    const value = riseShape(at / 100);
    assert.ok(value > previous, `${at}`);
    previous = value;
  }
  assert.ok(riseShape(0.001) < 0.001 && riseShape(0.999) > 0.999, 'it leaves and arrives flat');
});

test('added draws are Planets + 2 × Stars and 0 for Dust, within the budgets', () => {
  assert.equal(STAR_DRAWS_BUDGET, 2);
  assert.equal(DUST_DRAWS_BUDGET, 0);
  assert.equal(addedDraws(8, 6), 8 * PLANET_DRAWS_BUDGET + 6 * STAR_DRAWS_BUDGET + DUST_DRAWS_BUDGET);
  assert.equal(addedDraws(8, 6), 20);
  assert.equal(addedDraws(0, 3), 6);
  assert.equal(addedDraws(5, 0), 5, 'no Clients, no Star draw');
});

// --- The ceilings --------------------------------------------------------------------------------

test("both ceilings equal their tokens' linear luminance, and the shader carries each", () => {
  assert.ok(Math.abs(STAR_SUBJECT_CEILING_LUMINANCE - linearLuminance(tokens.colors['stroke-focus-dark'])) < 1e-12);
  assert.ok(Math.abs(FILL_CEILING_LUMINANCE - linearLuminance(tokens.colors['stroke-active-dark'])) < 1e-12);
  assert.equal(STAR_REST_CEILING_LUMINANCE, FILL_CEILING_LUMINANCE, 'the Star model restates the rest ceiling, and the two agree');
  assert.ok(STAR_FILL_FRAGMENT_SHADER.includes(`const float REST_CEILING = ${FILL_CEILING_LUMINANCE};`));
  assert.ok(STAR_FILL_FRAGMENT_SHADER.includes(`const float SUBJECT_CEILING = ${STAR_SUBJECT_CEILING_LUMINANCE};`));
  assert.notEqual(STAR_SUBJECT_CEILING_LUMINANCE, FILL_CEILING_LUMINANCE, 'the check can tell the tokens apart');
});

/** A row for each way a ceiling could stop being the token's: the check above, as a function over values. */
function auditCeilings(rest: number, subject: number): string[] {
  const failures: string[] = [];
  if (Math.abs(rest - linearLuminance(tokens.colors['stroke-active-dark'])) >= 1e-12) failures.push('the rest ceiling is not stroke-active');
  if (Math.abs(subject - linearLuminance(tokens.colors['stroke-focus-dark'])) >= 1e-12) failures.push('the subject ceiling is not stroke-focus');
  return failures;
}

test('the ceiling check rejects a rest ceiling and a subject ceiling that are not the tokens\'', () => {
  assert.deepEqual(auditCeilings(FILL_CEILING_LUMINANCE, STAR_SUBJECT_CEILING_LUMINANCE), []);
  assert.match(auditCeilings(FILL_CEILING_LUMINANCE + 0.001, STAR_SUBJECT_CEILING_LUMINANCE).join(), /rest ceiling/);
  assert.match(auditCeilings(FILL_CEILING_LUMINANCE, 1).join(), /subject ceiling/);
  assert.match(auditCeilings(STAR_SUBJECT_CEILING_LUMINANCE, FILL_CEILING_LUMINANCE).join(), /rest ceiling.*subject ceiling/);
});

test('every tint has a luminance to divide by', () => {
  for (const tint of STAR_TINT_NAMES) assert.ok(luminanceOf(channels(tokens.colors[TINT_TOKEN(tint)])) > 0, `${tint}: the shaders divide by this`);
});

const TINT_COLORS: readonly (readonly [StarTint, number[]])[] = STAR_TINT_NAMES.map((tint) => [tint, channels(tokens.colors[TINT_TOKEN(tint)])] as const);

/**
 * The core's fragment, mirrored in numbers, line for line, so the matrix's luminance rows
 * run without a GPU. `auditStarFill` holds the shader to these same lines.
 */
function coreFragment(disc: readonly [number, number], uniforms: { low: number; high: number; pulse: number; rise: number; time: number }, color: readonly number[] = channels(tokens.colors[TINT_TOKEN('white')])): { alpha: number | null; luminance: number; rgb: number[]; clamped: boolean } {
  const smoothstep = (edge0: number, edge1: number, x: number): number => {
    const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1);
    return t * t * (3 - 2 * t);
  };
  const mix = (a: number, b: number, t: number): number => a * (1 - t) + b * t;
  const r = Math.min(Math.hypot(disc[0], disc[1]), 1);
  const edge = smoothstep(0, STAR_CORE_EDGE, 1 - r);
  const mu = Math.sqrt(Math.max(1 - r * r, 0));
  const centre = mix(mix(uniforms.low, uniforms.high, uniforms.pulse), STAR_SUBJECT_CEILING_LUMINANCE * (1 - STAR_SUBJECT_DIP * (1 - uniforms.pulse)), uniforms.rise);
  const limb = 1 - (1 - STAR_CORE_LIMB) * (1 - mu);
  const p = [disc[0] * STAR_GRAIN_SCALE, disc[1] * STAR_GRAIN_SCALE] as const;
  const t = uniforms.time * STAR_GRAIN_DRIFT;
  const cells = Math.min(Math.max(0.5 + 0.25 * (Math.sin(p[0] + t) * Math.sin(p[1] - 0.7 * t) + Math.sin(0.6 * (p[0] + p[1]) - 1.3 * t)), 0), 1);
  const grain = 1 - STAR_GRAIN_DEPTH * r * cells;
  const target = centre * limb * grain;
  const hue = color.map((value) => mix(value / luminanceOf(color), 1, uniforms.rise));
  const lit = hue.map((value) => Math.min(value * target, 1));
  const y = luminanceOf(lit);
  const clamped = hue.some((value) => value * target > 1);
  const limit = mix(STAR_REST_CEILING_LUMINANCE, STAR_SUBJECT_CEILING_LUMINANCE, uniforms.rise);
  const rgb = y > limit ? lit.map((value) => value * (limit / y)) : lit;
  return { alpha: edge < STAR_CORE_ALPHA_FLOOR ? null : edge, luminance: luminanceOf(rgb), rgb, clamped };
}

const DISC = Array.from({ length: 21 }, (_, i) => Array.from({ length: 21 }, (_, j) => [(i - 10) / 10, (j - 10) / 10] as const)).flat();

test('for every tint, no resting fragment passes stroke-active, and no subject fragment passes stroke-focus, at any clock; no channel passes 1', () => {
  for (const [tint, color] of TINT_COLORS) {
    for (const band of BANDS) {
      const [low, high] = STAR_BAND_LUMINANCE[band];
      for (const rise of [0, 0.25, 0.5, 0.75, 1]) {
        for (const clock of CLOCKS.filter((_, at) => at % 40 === 0)) {
          const pulse = starPulse(clock, 1.5);
          const limit = STAR_REST_CEILING_LUMINANCE + (STAR_SUBJECT_CEILING_LUMINANCE - STAR_REST_CEILING_LUMINANCE) * rise;
          for (const disc of DISC) {
            const fragment = coreFragment(disc, { low, high, pulse, rise, time: clock }, color);
            if (fragment.alpha === null) continue;
            assert.ok(fragment.luminance <= limit + 1e-12, `${tint} ${band} rise ${rise} at ${disc}: ${fragment.luminance}`);
            assert.ok(fragment.rgb.every((value) => value <= 1), `${tint} ${band} rise ${rise} at ${disc}: a channel passes 1`);
            if (rise === 0) assert.ok(fragment.luminance <= STAR_REST_CEILING_LUMINANCE, `${tint} ${band} at rest`);
          }
        }
      }
    }
  }
});

/** The worst share of a core's centre luminance the channel clamp takes, over every tint, band, pulse and rise, measured on the grid below. */
const WORST_CLAMP_LOSS = 0.0024;

test('at rest no channel clamps, for any tint, band, pulse or fragment, so "colour encodes nothing" is exact at rest; nor as the risen subject (9.5)', () => {
  for (const [tint, color] of TINT_COLORS) {
    for (const band of BANDS) {
      const [low, high] = STAR_BAND_LUMINANCE[band];
      for (let step = 0; step <= 20; step += 1) {
        const pulse = step / 20;
        for (const rise of [0, 1]) {
          for (const disc of DISC) {
            const fragment = coreFragment(disc, { low, high, pulse, rise, time: 3 }, color);
            if (fragment.alpha !== null) assert.equal(fragment.clamped, false, `${tint} ${band} pulse ${pulse} rise ${rise} at ${disc}`);
          }
        }
      }
    }
  }
});

test('mid-rise, the clamp takes at most WORST_CLAMP_LOSS of the centre luminance: a transient, only while a subject rises or falls (≤ RISE_SECONDS)', () => {
  let worst = 0;
  for (const [, color] of TINT_COLORS) {
    for (const band of BANDS) {
      const [low, high] = STAR_BAND_LUMINANCE[band];
      for (let p = 0; p <= 40; p += 1) {
        for (let r = 0; r <= 400; r += 1) {
          const pulse = p / 40;
          const rise = r / 400;
          const expected = coreCentreLuminance(band, pulse, rise);
          const centre = coreFragment([0, 0], { low, high, pulse, rise, time: 0 }, color);
          worst = Math.max(worst, (expected - centre.luminance) / expected);
        }
      }
    }
  }
  assert.ok(worst > 0, 'some tint clamps mid-rise, or the bound measures nothing');
  assert.ok(worst <= WORST_CLAMP_LOSS, `the worst loss is ${worst}, over the stated ${WORST_CLAMP_LOSS}`);
  assert.ok(worst > WORST_CLAMP_LOSS / 2, `the bound is tight: ${worst} of ${WORST_CLAMP_LOSS}`);
  assert.ok(RISE_SECONDS <= 1, 'the window is short');
});

test('colour encodes nothing (9.5): at the same band, pulse and rise every tint\'s centre luminance is the same, wherever no channel clamps, and a clamp only lowers it', () => {
  for (const band of BANDS) {
    const [low, high] = STAR_BAND_LUMINANCE[band];
    for (const rise of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
      for (const pulse of [0, 0.3, 0.5, 0.8, 1]) {
        const expected = coreCentreLuminance(band, pulse, rise);
        for (const [tint, color] of TINT_COLORS) {
          const centre = coreFragment([0, 0], { low, high, pulse, rise, time: 0 }, color);
          if (centre.clamped) assert.ok(centre.luminance <= expected + 1e-9, `${tint} ${band} pulse ${pulse} rise ${rise}: a clamp only lowers`);
          else assert.ok(Math.abs(centre.luminance - expected) < 1e-9, `${tint} ${band} pulse ${pulse} rise ${rise}: ${centre.luminance} vs ${expected}`);
        }
      }
    }
  }
  // At rest no tint clamps at its centre, so there the luminance is exactly the same for all five.
  for (const band of BANDS) {
    const [low, high] = STAR_BAND_LUMINANCE[band];
    for (const [tint, color] of TINT_COLORS) assert.equal(coreFragment([0, 0], { low, high, pulse: 1, rise: 0, time: 0 }, color).clamped, false, `${tint} ${band} at rest does not clamp`);
  }
});

test('a saturated tint never clips past 1 and never passes either ceiling: each channel is clamped (9.5\'s tints)', () => {
  // Built from numbers, not a token: a linear colour as warm as 9.5's reddest tint, whose red reaches 1 at a luminance well under stroke-focus.
  const saturated = [1, 0.2, 0.05];
  const redAt = (rise: number): number => ((saturated[0]! / luminanceOf(saturated)) * (1 - rise) + rise) * coreCentreLuminance('stroke-near', 1, rise);
  assert.ok(redAt(0.5) > 1, `the colour is saturated enough to clip unclamped mid-rise: ${redAt(0.5)}`);
  for (const band of BANDS) {
    const [low, high] = STAR_BAND_LUMINANCE[band];
    for (let step = 0; step <= 40; step += 1) {
      const rise = step / 40;
      const limit = STAR_REST_CEILING_LUMINANCE + (STAR_SUBJECT_CEILING_LUMINANCE - STAR_REST_CEILING_LUMINANCE) * rise;
      for (const pulse of [0, 0.5, 1]) {
        for (const disc of DISC) {
          const fragment = coreFragment(disc, { low, high, pulse, rise, time: 3 }, saturated);
          if (fragment.alpha === null) continue;
          assert.ok(fragment.rgb.every((value) => value <= 1), `${band} rise ${rise} at ${disc}: a channel passes 1`);
          assert.ok(fragment.luminance <= limit + 1e-12, `${band} rise ${rise} at ${disc}: ${fragment.luminance}`);
          assert.ok(fragment.luminance <= STAR_SUBJECT_CEILING_LUMINANCE + 1e-12);
          if (rise === 0) assert.ok(fragment.luminance <= STAR_REST_CEILING_LUMINANCE + 1e-12);
        }
      }
    }
  }
});

test('only the centre reaches stroke-focus, in linear terms, for every tint: the limb and the granulation dim everywhere else, and their darkening is 0 at the centre', () => {
  const [low, high] = STAR_BAND_LUMINANCE['stroke-near'];
  for (const [tint, color] of TINT_COLORS) {
    for (const clock of CLOCKS.filter((_, at) => at % 20 === 0)) {
      const uniforms = { low, high, pulse: 1, rise: 1, time: clock };
      const centre = coreFragment([0, 0], uniforms, color);
      assert.ok(Math.abs(centre.luminance - STAR_SUBJECT_CEILING_LUMINANCE) < 1e-9, `${tint}: the centre is the ceiling at ${clock}, white whatever the tint`);
      assert.ok(Math.abs(coreFragment([0, 0], { ...uniforms, rise: 0, pulse: 0.3 }, color).luminance - coreCentreLuminance('stroke-near', 0.3, 0)) < 1e-9, `${tint}: the centre pixel is the model\'s centre`);
      for (const disc of DISC) {
        if (disc[0] === 0 && disc[1] === 0) continue;
        const fragment = coreFragment(disc, uniforms, color);
        if (fragment.alpha !== null) assert.ok(fragment.luminance < STAR_SUBJECT_CEILING_LUMINANCE, `${tint} ${disc} at ${clock}`);
      }
    }
  }
});

test('the edge constants feed smoothstep in order: 0 < STAR_CORE_EDGE < 1, so edge0 < edge1', () => {
  assert.ok(STAR_CORE_EDGE > 0 && STAR_CORE_EDGE < 1, `STAR_CORE_EDGE ${STAR_CORE_EDGE}`);
  assert.ok(STAR_FILL_FRAGMENT_SHADER.includes('smoothstep(0.0, EDGE, 1.0 - r)'), 'edge0 is 0.0 and edge1 is EDGE');
});

test('no fragment under alpha 0.5 draws or writes depth: the floor is 0.5, in the shader and in the copy', () => {
  assert.equal(STAR_CORE_ALPHA_FLOOR, 0.5);
  assert.ok(STAR_FILL_FRAGMENT_SHADER.includes('const float ALPHA_FLOOR = 0.5;'));
  assert.ok(STAR_FILL_FRAGMENT_SHADER.includes('if (edge < ALPHA_FLOOR) discard;'));
  const [low, high] = STAR_BAND_LUMINANCE['stroke-rest'];
  for (let step = 0; step <= 1000; step += 1) {
    const fragment = coreFragment([step / 1000, 0], { low, high, pulse: 0.5, rise: 0, time: 0 });
    if (fragment.alpha !== null) assert.ok(fragment.alpha >= 0.5, `r ${step / 1000}: alpha ${fragment.alpha} is drawn`);
  }
});

test('the core is limb-darkened into its glow: darker toward the edge, its alpha ramping down there, and the rim discarded below the floor', () => {
  assert.ok(STAR_CORE_LIMB > 0 && STAR_CORE_LIMB < 1);
  assert.ok(STAR_GRAIN_DEPTH > 0 && STAR_GRAIN_DEPTH < 0.5, 'granulation only dims, and gently');
  assert.ok(STAR_GRAIN_DRIFT > 0 && STAR_GRAIN_DRIFT < 1, 'slow');
  const [low, high] = STAR_BAND_LUMINANCE['stroke-rest'];
  const along = (r: number) => coreFragment([r, 0], { low, high, pulse: 0.5, rise: 0, time: 0 });
  assert.equal(along(0).alpha, 1);
  assert.equal(along(1).alpha, null, 'the very edge is discarded');
  assert.equal(along(0.9).alpha, null, 'and so is the rim under the floor');
  let previous = along(0);
  for (let at = 1; at <= 8; at += 1) {
    const now = along(at / 10);
    assert.ok(now.alpha !== null && now.alpha <= (previous.alpha as number), `alpha at ${at / 10}`);
    assert.ok(now.luminance < previous.luminance, `darker at ${at / 10}`);
    previous = now;
  }
  assert.ok((along(0.8).alpha as number) < 1, 'the soft ramp above the floor stays');
});

test('the granulation drifts with the clock, and holds with it', () => {
  const [low, high] = STAR_BAND_LUMINANCE['stroke-near'];
  const at = (time: number) => coreFragment([0.6, 0.3], { low, high, pulse: 0.5, rise: 0, time }).luminance;
  assert.notEqual(at(0), at(10), 'it moves as the clock moves');
  const held = nextClock(10, DELTA, true);
  assert.equal(at(held), at(10), 'and holds while the clock holds');
});

/** The glow's centre, mirrored: the tint divided by its own luminance, by the peak, each channel clamped to 1. */
const glowCentre = (color: readonly number[], peak: number): number[] => color.map((value) => Math.min((value / luminanceOf(color)) * peak, 1));

test("for every tint, a glow's own peak is well under each ceiling, and at rest two near ones summed on encoded values still are", () => {
  // Additive blending is on encoded values and a shader cannot read the destination, so this bounds the glow alone. The rest is on real pixels.
  const decoded = (values: readonly number[]): number => luminanceOf(values.map((value) => toLinear(Math.min(value, 1))));
  const near = GLOW_BAND_PEAK['stroke-near'];
  assert.ok(GLOW_BAND_PEAK['stroke-rest'] > 0 && near < GLOW_SUBJECT_PEAK);
  for (const [tint, color] of TINT_COLORS) {
    const encoded = (peak: number): number[] => glowCentre(color, peak).map(toSrgb);
    assert.ok(decoded(encoded(near)) < FILL_CEILING_LUMINANCE / 2, `${tint}: one near peak`);
    const two = encoded(near).map((value) => value * 2);
    assert.ok(decoded(two) < FILL_CEILING_LUMINANCE, `${tint}: two near peaks read ${decoded(two)}`);
    const withSubject = encoded(GLOW_SUBJECT_PEAK).map((value, at) => value + encoded(near)[at]!);
    assert.ok(decoded(withSubject) < STAR_SUBJECT_CEILING_LUMINANCE, `${tint}: a subject's peak over a near peak reads ${decoded(withSubject)}`);
    assert.ok(glowCentre(color, GLOW_SUBJECT_PEAK).every((value) => value < 1), `${tint}: no channel clamps even at the subject's peak`);
  }
});

test("colour encodes nothing (9.5): every tint's glow peak has the same luminance, and is exactly 9.4's glow", () => {
  const glow94 = channels(GLOW_94_HEX);
  for (const peak of [GLOW_BAND_PEAK['stroke-rest'], GLOW_BAND_PEAK['stroke-near'], GLOW_SUBJECT_PEAK]) {
    const share = peak / GLOW_94_LUMINANCE;
    const was = luminanceOf(glow94.map((value) => value * share));
    for (const [tint, color] of TINT_COLORS) {
      assert.ok(Math.abs(luminanceOf(glowCentre(color, peak)) - peak) < 1e-12, `${tint}: the peak is its luminance`);
      assert.ok(Math.abs(luminanceOf(glowCentre(color, peak)) - was) < 1e-12, `${tint}: as bright as 9.4's glow at ${share}`);
    }
  }
});

// --- The shaders, by their source ----------------------------------------------------------------

/** `<colorspace_fragment>` encodes what `gl_FragColor` already holds, so it must come after the assignment. */
const encodesAfterAssigning = (fragment: string): boolean => {
  const assigned = fragment.indexOf('gl_FragColor = ');
  return assigned !== -1 && assigned < fragment.indexOf('#include <colorspace_fragment>');
};

const varyingsOf = (source: string): string[] => [...source.matchAll(/\bvarying\s+\w+\s+(\w+)\s*;/g)].map((match) => match[1] as string).sort();

/** The core's lines `coreFragment` mirrors, as the shader must write them. */
const CORE_LINES: readonly (readonly [string, string])[] = [
  ['the radius', 'float r = min(length(vDisc), 1.0);'],
  ['the alpha does not fall to 0 at the edge', 'float edge = smoothstep(0.0, EDGE, 1.0 - r);'],
  ['the rim is not discarded below the floor', 'if (edge < ALPHA_FLOOR) discard;'],
  ['the limb is not from mu', 'float mu = sqrt(max(1.0 - r * r, 0.0));'],
  ['the centre is not the band by the pulse, and the dipped ceiling by the rise', 'float centre = mix(mix(uLow, uHigh, uPulse), SUBJECT_CEILING * (1.0 - SUBJECT_DIP * (1.0 - uPulse)), uRise);'],
  ['the limb does not darken toward the edge', 'float limb = 1.0 - (1.0 - LIMB) * (1.0 - mu);'],
  ['the granulation does not drift with uTime', 'float t = uTime * GRAIN_DRIFT;'],
  ['the granulation is not the mirrored cells', 'float cells = clamp(0.5 + 0.25 * (sin(p.x + t) * sin(p.y - 0.7 * t) + sin(0.6 * (p.x + p.y) - 1.3 * t)), 0.0, 1.0);'],
  ['the granulation does not dim only, by radius', 'float grain = 1.0 - GRAIN_DEPTH * r * cells;'],
  ['the target is not centre, limb and granulation', 'float target = centre * limb * grain;'],
  ['the hue does not go white with the rise', 'vec3 hue = mix(uColor / dot(uColor, WEIGHTS), vec3(1.0), uRise);'],
  ['a channel is not clamped to 1', 'vec3 lit = min(hue * target, vec3(1.0));'],
  ['the ceiling does not follow the rise', 'float limit = mix(REST_CEILING, SUBJECT_CEILING, uRise);'],
  ['the alpha is not the edge by the fade', 'gl_FragColor = vec4(y > limit ? lit * (limit / y) : lit, edge * uFade);'],
];

/** What a Star's core requires of its source. These rows read text and compile nothing; the numbers are `coreFragment`'s. */
function auditStarFill(vertex: string, fragment: string): string[] {
  const failures: string[] = [];
  if (vertex !== FILL_VERTEX_SHADER) failures.push("the vertex stage is not the Planet fill's own");
  if (varyingsOf(fragment).length === 0 || !varyingsOf(fragment).every((name) => varyingsOf(vertex).includes(name))) failures.push('the fragment reads a varying the vertex stage does not write');
  if (/\bsampler\w*\b|\btexture\w*\s*\(|\buMap\b/.test(fragment)) failures.push('a Star has a map');
  if (/\buLight\b|\buAmbient\b|\bdot\s*\(\s*N\b/.test(fragment)) failures.push('a Star is lit');
  if (!fragment.includes('#include <colorspace_fragment>')) failures.push('no colorspace_fragment');
  if (fragment.includes('#include <colorspace_fragment>') && !encodesAfterAssigning(fragment)) failures.push('the colour is encoded before it is assigned');
  if (!fragment.includes(`const float REST_CEILING = ${FILL_CEILING_LUMINANCE};`)) failures.push("the rest ceiling is not stroke-active's");
  if (!fragment.includes(`const float SUBJECT_CEILING = ${STAR_SUBJECT_CEILING_LUMINANCE};`)) failures.push("the subject ceiling is not stroke-focus's");
  for (const [name, value] of [['SUBJECT_DIP', STAR_SUBJECT_DIP], ['LIMB', STAR_CORE_LIMB], ['GRAIN_DEPTH', STAR_GRAIN_DEPTH], ['GRAIN_SCALE', STAR_GRAIN_SCALE], ['GRAIN_DRIFT', STAR_GRAIN_DRIFT], ['EDGE', STAR_CORE_EDGE], ['ALPHA_FLOOR', STAR_CORE_ALPHA_FLOOR]] as const) {
    if (!fragment.includes(`const float ${name} = ${glslFloat(value)};`)) failures.push(`${name} is not the model's`);
  }
  for (const uniform of ['uLow', 'uHigh', 'uPulse', 'uTime', 'uRise', 'uFade']) {
    if (!fragment.includes(`uniform float ${uniform};`)) failures.push(`no ${uniform}`);
  }
  for (const [message, line] of CORE_LINES) {
    if (!fragment.includes(line)) failures.push(message);
  }
  if (!fragment.includes('y > limit ? lit * (limit / y) : lit')) failures.push('the ceiling does not hold the luminance');
  if ((fragment.match(/\bdiscard\b/g) ?? []).length !== 1) failures.push('a fragment is discarded other than below the floor');
  if (!/#include <colorspace_fragment>\s*if \(y > limit \* NEAR_CEILING\) gl_FragColor\.rgb = floor\(gl_FragColor\.rgb \* 255\.0\) \/ 255\.0;/.test(fragment)) failures.push('rounding can pass the ceiling');
  return failures;
}

test("a Star's core is the Planet's vertex stage, with no map and no light, held by both ceilings, and is the mirrored fragment", () => {
  assert.equal(STAR_FILL_VERTEX_SHADER, FILL_VERTEX_SHADER);
  assert.ok(STAR_FILL_VERTEX_SHADER.includes('gl_Position.z += 1e-6 * gl_Position.w;'));
  assert.deepEqual(auditStarFill(STAR_FILL_VERTEX_SHADER, STAR_FILL_FRAGMENT_SHADER), []);
});

test('the Star core audit rejects a map, a light, a removed colorspace_fragment and each other departure', () => {
  const V = STAR_FILL_VERTEX_SHADER;
  const F = STAR_FILL_FRAGMENT_SHADER;
  for (const [name, vertex, fragment, message] of [
    ['a changed bias', V.replace('1e-6', '2e-6'), F, /not the Planet fill's own/],
    ['a map, by uniform', V, F.replace('uniform float uRise;', 'uniform float uRise;\nuniform sampler2D uSurface;'), /has a map/],
    ['a map, by sampling', V, F.replace('void main() {', 'void main() {\n vec4 s = texture2D(other, vDisc);'), /has a map/],
    ['a light', V, F.replace('uniform float uRise;', 'uniform float uRise;\nuniform vec3 uLight;'), /is lit/],
    ['a removed colorspace_fragment', V, F.replace('#include <colorspace_fragment>', ''), /no colorspace_fragment/],
    ['encoding before assigning', V, F.replace('    #include <colorspace_fragment>\n', '').replace('void main() {', 'void main() {\n    #include <colorspace_fragment>'), /encoded before/],
    ['a varying the vertex stage does not write', V, F.replace('varying vec2 vDisc;', 'varying vec2 vDisc;\n  varying vec3 vNormal;'), /does not write/],
    ['a rest ceiling that is not the token', V, F.replace(`const float REST_CEILING = ${FILL_CEILING_LUMINANCE};`, 'const float REST_CEILING = 0.5;'), /rest ceiling is not/],
    ['a subject ceiling that is not the token', V, F.replace(`const float SUBJECT_CEILING = ${STAR_SUBJECT_CEILING_LUMINANCE};`, 'const float SUBJECT_CEILING = 1.0;'), /subject ceiling is not/],
    ['the ceiling fixed at rest', V, F.replace('mix(REST_CEILING, SUBJECT_CEILING, uRise)', 'REST_CEILING'), /follow the rise/],
    ['no ceiling', V, F.replace('y > limit ? lit * (limit / y) : lit', 'lit'), /hold the luminance/],
    ['a centre with no rise', V, F.replace('(1.0 - uPulse)), uRise);', '(1.0 - uPulse)), 0.0);'), /the centre is not/],
    ['a centre outside its band', V, F.replace('mix(uLow, uHigh, uPulse)', 'mix(uLow, uHigh * 1.5, uPulse)'), /the centre is not/],
    ['a subject pulse that brightens', V, F.replace('(1.0 - SUBJECT_DIP * (1.0 - uPulse))', '(1.0 + SUBJECT_DIP * uPulse)'), /the centre is not/],
    ['no limb', V, F.replace('float target = centre * limb * grain;', 'float target = centre * grain;'), /target is not/],
    ['a limb that brightens', V, F.replace('1.0 - (1.0 - LIMB) * (1.0 - mu)', '1.0 + (1.0 - LIMB) * (1.0 - mu)'), /limb does not darken/],
    ['a granulation that brightens', V, F.replace('1.0 - GRAIN_DEPTH * r * cells', '1.0 + GRAIN_DEPTH * r * cells'), /dim only, by radius/],
    ['a granulation at the centre', V, F.replace('1.0 - GRAIN_DEPTH * r * cells', '1.0 - GRAIN_DEPTH * cells'), /dim only, by radius/],
    ['a still granulation', V, F.replace('float t = uTime * GRAIN_DRIFT;', 'float t = 0.0;'), /drift with uTime/],
    ['a hue that stays saturated', V, F.replace('mix(uColor / dot(uColor, WEIGHTS), vec3(1.0), uRise)', 'uColor / dot(uColor, WEIGHTS)'), /go white/],
    ['a hard edge', V, F.replace('smoothstep(0.0, EDGE, 1.0 - r)', '1.0'), /fall to 0 at the edge/],
    ['a channel left unclamped', V, F.replace('min(hue * target, vec3(1.0))', 'hue * target'), /not clamped/],
    ['a floor back near 0', V, F.replace('const float ALPHA_FLOOR = 0.5;', 'const float ALPHA_FLOOR = 0.02;'), /ALPHA_FLOOR is not/],
    ['no discard', V, F.replace('if (edge < ALPHA_FLOOR) discard;', ''), /not discarded/],
    ['a second discard', V, F.replace('float mu =', 'if (r > 0.5) discard;\n    float mu ='), /discarded other than/],
    ['rounding left to the output', V, F.replace('floor(gl_FragColor.rgb * 255.0) / 255.0', 'gl_FragColor.rgb'), /rounding/],
    ['an opaque alpha, so no fade', V, F.replace('lit * (limit / y) : lit, edge * uFade);', 'lit * (limit / y) : lit, edge);'), /edge by the fade/],
    ['no fade uniform', V, F.replace('uniform float uFade;', ''), /no uFade/],
    ['no clock', V, F.replace('uniform float uTime;', ''), /no uTime/],
    ['a dip that is not the model\'s', V, F.replace(`const float SUBJECT_DIP = ${glslFloat(STAR_SUBJECT_DIP)};`, 'const float SUBJECT_DIP = 0.5;'), /SUBJECT_DIP is not/],
  ] as const) {
    assert.notEqual(`${vertex}${fragment}`, `${V}${F}`, `"${name}" must apply`);
    assert.match(auditStarFill(vertex, fragment).join('\n'), message, name);
  }
});

/** What a glow requires of its source. */
function auditGlow(vertex: string, fragment: string): string[] {
  const failures: string[] = [];
  if (varyingsOf(vertex).length === 0 || varyingsOf(vertex).join() !== varyingsOf(fragment).join()) failures.push('the stages declare different varyings');
  if (!vertex.includes('modelViewMatrix * vec4(position.xy, 0, 1)')) failures.push('the disc is not flattened through modelViewMatrix');
  if (/gl_Position\.z/.test(vertex)) failures.push('a glow has a bias');
  if (/\bposition\.z\b|position\.xyz|vec4\(\s*position\s*,/.test(vertex)) failures.push('the sphere keeps its relief');
  if (!fragment.includes('float edge = max(1.0 - dot(vDisc, vDisc), 0.0);')) failures.push('the falloff does not reach 0 at the edge');
  if (!fragment.includes('float falloff = edge * edge;')) failures.push('the falloff has a slope at the edge');
  if (!fragment.includes('vec3 glow = uColor / dot(uColor, WEIGHTS) * uPeak * falloff * uFade;')) failures.push('the colour is not the tint by its own luminance, by the peak, the falloff and the fade');
  if (!fragment.includes('const vec3 WEIGHTS = vec3(0.2126, 0.7152, 0.0722);')) failures.push('the glow does not weigh by Rec. 709');
  if (!fragment.includes('gl_FragColor = vec4(min(glow, vec3(1.0)), 1.0);')) failures.push('a glow channel is not clamped to 1, or the fade is the alpha');
  if (!fragment.includes('uniform float uPeak;')) failures.push('no peak uniform');
  if (!fragment.includes('uniform float uFade;')) failures.push('no fade uniform');
  if (!fragment.includes('#include <colorspace_fragment>')) failures.push('no colorspace_fragment');
  if (fragment.includes('#include <colorspace_fragment>') && !encodesAfterAssigning(fragment)) failures.push('the colour is encoded before it is assigned');
  if (/\bsampler\w*\b|\btexture\w*\s*\(/.test(fragment)) failures.push('a glow has a map');
  if (/\bdiscard\b/.test(fragment)) failures.push('a glow cuts a shape out');
  return failures;
}

test('a glow is flattened with no bias, and falls to exactly 0 at its own edge', () => {
  assert.deepEqual(auditGlow(GLOW_VERTEX_SHADER, GLOW_FRAGMENT_SHADER), []);
  const falloff = (r: number): number => Math.max(1 - r * r, 0) ** 2;
  assert.equal(falloff(1), 0);
  assert.equal(falloff(1.1), 0);
  assert.ok((falloff(1) - falloff(0.999)) / 0.001 > -0.01, 'no slope on arriving');
});

test('the glow shader audit rejects each departure', () => {
  const V = GLOW_VERTEX_SHADER;
  const F = GLOW_FRAGMENT_SHADER;
  const FLAT = 'vec4(position.xy, 0, 1)';
  const MAIN = 'uColor / dot(uColor, WEIGHTS) * uPeak * falloff * uFade;';
  for (const [name, vertex, fragment, message] of [
    ['relief', V.replace(FLAT, 'vec4(position, 1)'), F, /flattened/],
    ['a bias', V.replace(/\}\s*$/, 'gl_Position.z += 1e-6 * gl_Position.w; }'), F, /has a bias/],
    ['a renamed varying', V.replaceAll('vDisc', 'vDisk'), F, /different varyings/],
    ['a floor at the edge', V, F.replace('max(1.0 - dot(vDisc, vDisc), 0.0)', 'max(1.0 - dot(vDisc, vDisc), 0.1)'), /reach 0/],
    ['a linear falloff, with a slope at the edge', V, F.replace('edge * edge', 'edge'), /slope/],
    ['no falloff', V, F.replace(MAIN, MAIN.replace(' * falloff', '')), /by the peak, the falloff/],
    ['no normalisation, so a tint carries brightness', V, F.replace(MAIN, 'uColor * uPeak * falloff * uFade;'), /by its own luminance/],
    ['other weights', V, F.replace('const vec3 WEIGHTS = vec3(0.2126, 0.7152, 0.0722);', 'const vec3 WEIGHTS = vec3(0.3, 0.6, 0.1);'), /Rec\. 709/],
    ['no clamp', V, F.replace('vec4(min(glow, vec3(1.0)), 1.0)', 'vec4(glow, 1.0)'), /not clamped/],
    ['another colour', V, F.replace(MAIN, MAIN.replaceAll('uColor', 'vec3(1.0)')), /by its own luminance/],
    ['no peak', V, F.replace(MAIN, MAIN.replace('uPeak', '0.22')), /by its own luminance, by the peak/],
    ['no peak uniform', V, F.replace('uniform float uPeak;', ''), /no peak uniform/],
    ['no fade, so a glow pops in', V, F.replace(MAIN, MAIN.replace(' * uFade', '')), /the falloff and the fade/],
    ['the fade as the alpha, which additive blending would ignore at 1', V, F.replace(MAIN, MAIN.replace(' * uFade', '')).replace('vec4(min(glow, vec3(1.0)), 1.0)', 'vec4(min(glow, vec3(1.0)), uFade)'), /the falloff and the fade/],
    ['no fade uniform', V, F.replace('uniform float uFade;', ''), /no fade uniform/],
    ['a removed colorspace_fragment', V, F.replace('#include <colorspace_fragment>', ''), /no colorspace_fragment/],
    ['encoding before assigning', V, F.replace('    #include <colorspace_fragment>\n', '').replace('void main() {', 'void main() {\n    #include <colorspace_fragment>'), /encoded before/],
    ['a map', V, F.replace('void main() {', 'uniform sampler2D uSprite;\nvoid main() {'), /has a map/],
    ['a discard', V, F.replace('void main() {', 'void main() {\n if (vDisc.x > 1.0) discard;'), /cuts a shape/],
  ] as const) {
    assert.notEqual(`${vertex}${fragment}`, `${V}${F}`, `"${name}" must apply`);
    assert.match(auditGlow(vertex, fragment).join('\n'), message, name);
  }
});

test('a number is written as a GLSL float: a whole tuning value still compiles, and a value with no literal throws', () => {
  assert.equal(glslFloat(1), '1.0');
  assert.equal(glslFloat(0), '0.0');
  assert.equal(glslFloat(3), '3.0');
  assert.equal(glslFloat(0.22), '0.22');
  assert.equal(glslFloat(1e-7), '1e-7');
  for (const value of [Number.NaN, Number.POSITIVE_INFINITY]) assert.throws(() => glslFloat(value), /no GLSL literal/);
  for (const [name, source] of [['the fill', STAR_FILL_FRAGMENT_SHADER], ['the glow', GLOW_FRAGMENT_SHADER]] as const) {
    for (const match of source.matchAll(/const float \w+ = ([^;]+);/g)) assert.match(match[1]!, /\./, `${name}: ${match[0]}`);
  }
});

// --- The rows, over real three objects ------------------------------------------------------------

const planOf = () => starPlans(ARTIFACT);
const riseOf = (mesh: Mesh): number => (mesh.material as ShaderMaterial).uniforms.uRise!.value as number;
const peakOf = (mesh: Mesh): number => (mesh.material as ShaderMaterial).uniforms.uPeak!.value as number;
const uniformOf = (mesh: Mesh, name: string): unknown => (mesh.material as ShaderMaterial).uniforms[name]?.value;
const materialOf = (mesh: Mesh): ShaderMaterial => mesh.material as ShaderMaterial;
const isGlow = (mesh: Mesh): boolean => mesh.renderOrder === GLOW_RENDER_ORDER;

function rowsOver(plans = planOf()) {
  const scene = new Group();
  const geometry = new SphereGeometry(1, 64, 32);
  const fade = { value: 0 };
  const rows = createStarRows(plans, geometry, fade, scene);
  const meshes = [...scene.children] as Mesh[];
  return { scene, geometry, fade, rows, meshes, fills: meshes.filter((mesh) => !isGlow(mesh)), glows: meshes.filter(isGlow) };
}
/** Every Mesh under an object: the layer's draws all sit in its one group (7.8). */
function drawsOf(root: Object3D): Mesh[] {
  const found: Mesh[] = [];
  root.traverse((object) => {
    if ((object as Mesh).isMesh) found.push(object as Mesh);
  });
  return found;
}
const FACING = new Quaternion();

test('two draws per Star over the geometry it is given, and no new geometry', () => {
  const { meshes, geometry, fills, glows, scene } = rowsOver();
  assert.equal(meshes.length, 2 * planOf().length);
  assert.ok(meshes.every((mesh) => mesh.geometry === geometry));
  assert.equal(fills.length, 2);
  assert.equal(glows.length, 2);
  const plans = planOf();
  const at = (index: number): number[] => [plans[index]!.position.x, plans[index]!.position.y, plans[index]!.position.z];
  fills.forEach((mesh, index) => assert.deepEqual(mesh.position.toArray(), at(index)));
  glows.forEach((mesh, index) => assert.deepEqual(mesh.position.toArray(), at(index)));
  assert.equal(scene.children.length, 4);
});

test('the rows go into the group they are handed and nowhere else, and no Clients adds nothing', () => {
  const scene = new Scene();
  const group = new Group();
  createStarRows(planOf(), new SphereGeometry(1, 64, 32), { value: 0 }, group);
  assert.equal(scene.children.length, 0);
  assert.equal(group.children.length, 4);
  assert.equal(rowsOver([]).meshes.length, 0);
});

test('every draw reads the fade object it is handed, and a Star fill follows the depth switch while a glow never writes depth', () => {
  const { fade, rows, fills, glows } = rowsOver();
  for (const mesh of [...fills, ...glows]) assert.equal(materialOf(mesh).uniforms.uFade, fade);
  assert.equal(rows.materials.length, 4);
  assert.ok(fills.every((mesh) => !materialOf(mesh).depthWrite), 'off at build');
  rows.writeDepth(true);
  assert.ok(fills.every((mesh) => materialOf(mesh).depthWrite), 'on, every one at once');
  assert.ok(glows.every((mesh) => !materialOf(mesh).depthWrite), 'a glow never');
  rows.writeDepth(false);
  assert.ok(fills.every((mesh) => !materialOf(mesh).depthWrite));
});

test("a Star's fill is the 7.6 mechanism, at the ratio of its own radius, with no map", () => {
  const { fills } = rowsOver();
  for (const mesh of fills) {
    const material = materialOf(mesh);
    assert.equal(mesh.renderOrder, FILL_RENDER_ORDER);
    assert.deepEqual([material.transparent, material.opacity, material.depthWrite, material.depthTest, material.side, material.blending], [true, 1, false, true, FrontSide, NormalBlending], 'no depth write until the fade has arrived (7.8)');
    assert.equal(material.uniforms.radius!.value, FILL_RADIUS_RATIO * STAR_RADIUS);
    assert.equal(material.vertexShader, FILL_VERTEX_SHADER);
    assert.deepEqual(Object.keys(material.uniforms).sort(), ['radius', 'uColor', 'uFade', 'uHigh', 'uLow', 'uPulse', 'uRise', 'uTime'], 'no texture uniform');
    assert.equal(mesh.scale.x, 1, 'it fits the unit sphere three culls by');
  }
  // Unscaled, the fill culls by the shared sphere's own bound, so its radius must fit inside it.
  assert.ok(FILL_RADIUS_RATIO * STAR_RADIUS <= 1, `a Star's fill of radius ${FILL_RADIUS_RATIO * STAR_RADIUS} would be culled at the frame's edge`);
});

test('a glow is additive, tests depth, writes none, draws at its own step, and is coloured by its own Star\'s tint alone', () => {
  const { glows } = rowsOver();
  const plans = planOf();
  glows.forEach((mesh, index) => {
    const material = materialOf(mesh);
    assert.equal(mesh.renderOrder, GLOW_RENDER_ORDER);
    assert.deepEqual([material.transparent, material.blending, material.depthTest, material.depthWrite, material.side], [true, AdditiveBlending, true, false, FrontSide]);
    assert.ok((material.uniforms.uColor!.value as Color).equals(new Color(tokens.colors[TINT_TOKEN(plans[index]!.tint)])), plans[index]!.tint);
    assert.deepEqual(Object.keys(material.uniforms).sort(), ['uColor', 'uFade', 'uPeak']);
  });
  assert.ok(GLOW_RENDER_ORDER < FILL_RENDER_ORDER, 'a glow is beneath every fill');
});

test('each Star\'s core and glow read its own tint, and the tint never changes in time or with the rise (9.5)', () => {
  const { rows, fills, glows } = rowsOver();
  const plans = planOf();
  assert.notEqual(plans[0]!.tint, plans[1]!.tint, 'the fixture has two tints');
  const colorOf = (mesh: Mesh): Color => materialOf(mesh).uniforms.uColor!.value as Color;
  const before = [...fills, ...glows].map((mesh) => colorOf(mesh).getHex());
  fills.forEach((mesh, index) => {
    assert.ok(colorOf(mesh).equals(new Color(tokens.colors[TINT_TOKEN(plans[index]!.tint)])), `core ${index}`);
    assert.equal(colorOf(mesh), colorOf(glows[index]!), 'core and glow share one colour');
  });
  assert.ok(!colorOf(fills[0]!).equals(colorOf(fills[1]!)), 'two tints, two colours');
  for (let at = 0; at < 40; at += 1) rows.frame(FACING, at < 20 ? 'client:a' : 'client:b', DELTA, 1, false);
  assert.deepEqual([...fills, ...glows].map((mesh) => colorOf(mesh).getHex()), before, 'no frame writes a colour');
});

test('a glow reaches GLOW_RADIUS_RATIO × the Star by its scale, so three culls it by what it covers', () => {
  const { glows, geometry } = rowsOver();
  geometry.computeBoundingSphere();
  assert.ok(GLOW_RADIUS_RATIO > 1, 'it reaches past the outline');
  for (const mesh of glows) {
    assert.deepEqual(mesh.scale.toArray(), [GLOW_RADIUS_RATIO * STAR_RADIUS, GLOW_RADIUS_RATIO * STAR_RADIUS, GLOW_RADIUS_RATIO * STAR_RADIUS]);
    assert.ok(mesh.scale.x * geometry.boundingSphere!.radius >= GLOW_RADIUS_RATIO * STAR_RADIUS);
  }
});

test('the first frame seeds the rise, with the subject at 1 and no ramp; a glow\'s peak is its core\'s rise, by its band', () => {
  const { rows, fills, glows } = rowsOver();
  rows.frame(FACING, 'client:b', DELTA, 1, false);
  assert.deepEqual(fills.map(riseOf), [0, 1]);
  assert.deepEqual(glows.map(peakOf), [GLOW_BAND_PEAK['stroke-near'], GLOW_SUBJECT_PEAK]);
});

test('each core carries its own band\'s range, and its pulse from its phase; every core shares one clock', () => {
  const { rows, fills } = rowsOver();
  assert.deepEqual(fills.map((mesh) => [uniformOf(mesh, 'uLow'), uniformOf(mesh, 'uHigh')]), [[...STAR_BAND_LUMINANCE['stroke-near']], [...STAR_BAND_LUMINANCE['stroke-rest']]]);
  assert.equal((fills[0]!.material as ShaderMaterial).uniforms.uTime, (fills[1]!.material as ShaderMaterial).uniforms.uTime, 'one clock object');
  let clock = 0;
  for (let at = 0; at < 30; at += 1) {
    rows.frame(FACING, null, DELTA, 1, false);
    clock = nextClock(clock, DELTA, false);
  }
  assert.equal(uniformOf(fills[0]!, 'uTime'), clock);
  assert.equal(uniformOf(fills[0]!, 'uPulse'), starPulse(clock, 1.5));
  assert.equal(uniformOf(fills[1]!, 'uPulse'), starPulse(clock, 0));
  assert.notEqual(uniformOf(fills[0]!, 'uPulse'), uniformOf(fills[1]!, 'uPulse'), 'each by its own phase');
});

test('under reduced motion the clock, so the pulse and the granulation, hold, and the rise still steps', () => {
  const { rows, fills } = rowsOver();
  rows.frame(FACING, 'client:a', DELTA, 1, false);
  rows.frame(FACING, 'client:a', DELTA, 1, false);
  const time = uniformOf(fills[0]!, 'uTime');
  const pulses = fills.map((mesh) => uniformOf(mesh, 'uPulse'));
  for (let at = 0; at < 5; at += 1) rows.frame(FACING, 'client:b', DELTA, 0.25, true);
  assert.equal(uniformOf(fills[0]!, 'uTime'), time, 'the clock holds');
  assert.deepEqual(fills.map((mesh) => uniformOf(mesh, 'uPulse')), pulses, 'the pulse holds');
  assert.ok(riseOf(fills[1]!) > 0 && riseOf(fills[0]!) < 1, 'the rise still steps');
  rows.frame(FACING, 'client:b', DELTA, 1, false);
  assert.equal(uniformOf(fills[0]!, 'uTime'), (time as number) + DELTA, 'and resumes from where it held');
});

test('when the subject moves from Star A to Star B, A falls and B rises, each stepping by delta, neither jumping', () => {
  const { rows, fills, glows } = rowsOver();
  rows.frame(FACING, 'client:a', DELTA, 1, false);
  assert.deepEqual(fills.map(riseOf), [1, 0]);
  let previous = fills.map(riseOf);
  const limit = 1.5 * (DELTA / RISE_SECONDS) + 1e-9;
  let steps = 0;
  while (riseOf(fills[1]!) < 1) {
    rows.frame(FACING, 'client:b', DELTA, 1, false);
    const now = fills.map(riseOf);
    assert.ok(now[0]! <= previous[0]! && now[1]! >= previous[1]!);
    assert.ok(previous[0]! - now[0]! <= limit && now[1]! - previous[1]! <= limit, `step ${steps}: ${previous} to ${now}`);
    assert.deepEqual(glows.map(peakOf), now.map((rise, at) => bandPeak(at === 0 ? 'stroke-near' : 'stroke-rest', rise)));
    previous = now;
    steps += 1;
    assert.ok(steps < 1000);
  }
  assert.ok(steps > 1);
  assert.deepEqual(fills.map(riseOf), [0, 1]);
});

test('after a mid-rise frame the uniform is the shape of the stepped value, not the raw value', () => {
  const { rows, fills } = rowsOver();
  rows.frame(FACING, 'client:a', DELTA, 1, false);
  let rising = seedRise(false);
  for (let at = 0; at < 9; at += 1) {
    rows.frame(FACING, 'client:b', DELTA, 1, false);
    rising = nextRise(rising, true, DELTA, 1);
    assert.equal(riseOf(fills[1]!), riseShape(rising), `frame ${at}`);
  }
  assert.notEqual(riseShape(rising), rising, 'the two differ here, so writing the raw value fails');
});

test('an interrupted move, A to B and back to A partway, turns with no jump', () => {
  const { rows, fills } = rowsOver();
  rows.frame(FACING, 'client:a', DELTA, 1, false);
  const limit = 1.5 * (DELTA / RISE_SECONDS) + 1e-9;
  let previous = fills.map(riseOf);
  const steps = [...Array<string>(12).fill('client:b'), ...Array<string>(60).fill('client:a')];
  for (const subject of steps) {
    rows.frame(FACING, subject, DELTA, 1, false);
    const now = fills.map(riseOf);
    assert.ok(Math.abs(now[0]! - previous[0]!) <= limit && Math.abs(now[1]! - previous[1]!) <= limit, `${previous} to ${now}`);
    previous = now;
  }
  assert.deepEqual(fills.map(riseOf), [1, 0], 'it arrives back where it began');
});

for (const [name, subject] of [['a Planet, as in Focus', 'project:a/one'], ['null, as in the overview', null], ['an ID that is no Star here', 'client:gone']] as const) {
  test(`with the subject ${name}, every Star falls to rest and nothing throws`, () => {
    const { rows, fills } = rowsOver();
    rows.frame(FACING, 'client:a', DELTA, 1, false);
    assert.equal(riseOf(fills[0]!), 1);
    for (let at = 0; at < 100; at += 1) assert.doesNotThrow(() => rows.frame(FACING, subject, DELTA, 1, false));
    assert.deepEqual(fills.map(riseOf), [0, 0]);
    const seeded = rowsOver();
    seeded.rows.frame(FACING, subject, DELTA, 1, false);
    assert.deepEqual(seeded.fills.map(riseOf), [0, 0], 'seeded at rest');
  });
}

test('a stall and a bad delta do not cut', () => {
  const { rows, fills } = rowsOver();
  rows.frame(FACING, 'client:a', DELTA, 1, false);
  rows.frame(FACING, 'client:b', 10, 1, false);
  assert.ok(riseOf(fills[1]!) < 0.5, `a ten second frame reached ${riseOf(fills[1]!)}`);
  const held = fills.map(riseOf);
  rows.frame(FACING, 'client:a', Number.NaN, 1, false);
  rows.frame(FACING, 'client:a', -1, 1, false);
  rows.frame(FACING, 'client:a', Number.POSITIVE_INFINITY, 1, false);
  assert.deepEqual(fills.map(riseOf), held);
});

test('a frame turns both draws of every Star to the facing it is given', () => {
  const { rows, meshes } = rowsOver();
  const facing = new Quaternion().setFromAxisAngle({ x: 0, y: 1, z: 0 } as never, 0.7);
  rows.frame(facing, null, DELTA, 1, false);
  for (const mesh of meshes) assert.ok(mesh.quaternion.angleTo(facing) < 1e-7);
});

test('dispose removes the rows and their materials, leaves the geometry it was given, and is safe twice', () => {
  const { rows, meshes, scene, geometry } = rowsOver();
  let materials = 0;
  let geometries = 0;
  for (const mesh of [...meshes]) materialOf(mesh).addEventListener('dispose', () => { materials += 1; });
  geometry.addEventListener('dispose', () => { geometries += 1; });
  rows.dispose();
  assert.equal(scene.children.length, 0);
  assert.equal(materials, 4);
  assert.equal(geometries, 0);
  assert.doesNotThrow(() => rows.dispose());
  assert.equal(materials, 4);
});

// --- Through the layer and the owner --------------------------------------------------------------

test('the layer draws the Stars over its one geometry, and on going disposes Star materials with the fills, and the geometry once', () => {
  const scene = new Scene();
  let closed = 0;
  const layer = createFillLayer(ARTIFACT, new Map([['moon', { close() { closed += 1; } } as unknown as ImageBitmap]]));
  layer.attach(scene);
  const meshes = drawsOf(scene);
  assert.equal(meshes.length, addedDraws(fillPlans(ARTIFACT).length, starPlans(ARTIFACT).length));
  assert.equal(new Set(meshes.map((mesh) => mesh.geometry)).size, 1);
  layer.frame(new PerspectiveCamera(), DELTA, false, 1, 'client:a');
  const counts = { material: 0, geometry: 0 };
  for (const mesh of meshes) materialOf(mesh).addEventListener('dispose', () => { counts.material += 1; });
  meshes[0]!.geometry.addEventListener('dispose', () => { counts.geometry += 1; });
  layer.dispose();
  layer.dispose();
  assert.deepEqual(counts, { material: meshes.length, geometry: 1 });
  assert.equal(scene.children.length, 0);
  assert.equal(closed, 0, 'the images are kept');
});

test('the layer hands the Stars the camera, the subject and the pace, and the spin takes no pace', () => {
  const scene = new Scene();
  const layer = createFillLayer(ARTIFACT, IMAGES);
  layer.attach(scene);
  const camera = new PerspectiveCamera();
  camera.rotation.set(0.2, 0.1, 0);
  layer.frame(camera, DELTA, false, 1, 'client:a');
  const stars = drawsOf(scene).filter((mesh) => materialOf(mesh).uniforms.uRise !== undefined || materialOf(mesh).uniforms.uPeak !== undefined);
  const expected = camera.getWorldQuaternion(new Quaternion());
  for (const mesh of stars) assert.ok(mesh.quaternion.angleTo(expected) < 1e-7);
  const fills = stars.filter((mesh) => !isGlow(mesh));
  assert.deepEqual(fills.map(riseOf), [1, 0]);
  const time = uniformOf(fills[0]!, 'uTime');
  layer.frame(camera, DELTA, true, 1, 'client:a');
  assert.equal(uniformOf(fills[0]!, 'uTime'), time, 'the layer hands the Stars reduced, so their clock holds');
  layer.frame(camera, DELTA, false, 0.25, 'client:b');
  const reduced = riseOf(fills[1]!);
  const full = createFillLayer(ARTIFACT, IMAGES);
  const fullScene = new Scene();
  full.attach(fullScene);
  full.frame(camera, DELTA, false, 1, 'client:a');
  full.frame(camera, DELTA, false, 1, 'client:b');
  const fullFills = drawsOf(fullScene).filter((mesh) => materialOf(mesh).uniforms.uRise !== undefined && !isGlow(mesh));
  assert.ok(reduced > riseOf(fullFills[1]!), 'a pace below 1 moves it further per frame');
  const planets = drawsOf(scene).filter((mesh) => materialOf(mesh).uniforms.uMapFromWorld !== undefined);
  const fullPlanets = drawsOf(fullScene).filter((mesh) => materialOf(mesh).uniforms.uMapFromWorld !== undefined);
  assert.deepEqual([...(materialOf(planets[0]!).uniforms.uMapFromWorld!.value as { elements: number[] }).elements], [...(materialOf(fullPlanets[0]!).uniforms.uMapFromWorld!.value as { elements: number[] }).elements], 'the pace does not reach the spin');
  const code = stripCommentsAndStrings(readFileSync(new URL('./fill-layer.ts', import.meta.url), 'utf8'));
  assert.match(code, /nextSpinSeconds\(seconds, delta, reduced\)/);
  assert.doesNotMatch(code, /nextSpinSeconds\([^)]*pace/);
});

/** A renderer whose every program links, for the owner rows: the warm-up itself is in `arrival-model.test.ts`. */
function linkingRenderer(): WebGLRenderer {
  const LINK_STATUS = 0x8b82;
  return {
    initTexture() {},
    compileAsync: (root: Object3D) => Promise.resolve(root),
    properties: { get: () => ({ currentProgram: { program: {} } }) },
    getContext: () => ({ LINK_STATUS, isContextLost: () => false, getProgramParameter: () => true }),
  } as unknown as WebGLRenderer;
}

for (const [name, artifact] of [
  ['a Star with a non-finite position', { clients: [{ id: 'client:bad', position: { x: Number.NaN, y: 0, z: 0 }, luminanceBand: 'stroke-rest', appearance: { tint: 'white', pulsePhase: 0 }, projects: [] }, ...ARTIFACT.clients] }],
] as const) {
  test(`under the real owner, ${name} fails the document with nothing added`, async () => {
    const scene = new Scene();
    const owner = createRealismOwner<ImageBitmap, Scene, PerspectiveCamera, WebGLRenderer>(() => Promise.resolve({ decodeMaps: () => Promise.resolve(IMAGES), createFillLayer }), () => undefined);
    const draw = { scene, camera: new PerspectiveCamera(), renderer: linkingRenderer(), delta: DELTA, reduced: false, pace: 1, subject: () => null };
    owner.frame(artifact as RealismArtifact, '/', draw);
    owner.frame(artifact as RealismArtifact, '/', draw);
    await new Promise((resolve) => setImmediate(resolve));
    assert.doesNotThrow(() => owner.frame(artifact as RealismArtifact, '/', draw));
    assert.equal(owner.status().document, 'failed');
    assert.deepEqual(scene.children, []);
  });
}

test('under the real owner, a subject that throws removes every fill and glow, with the loop alive', async () => {
  const scene = new Scene();
  const owner = createRealismOwner<ImageBitmap, Scene, PerspectiveCamera, WebGLRenderer>(() => Promise.resolve({ decodeMaps: () => Promise.resolve(IMAGES), createFillLayer }), () => undefined);
  const draw = { scene, camera: new PerspectiveCamera(), renderer: linkingRenderer(), delta: DELTA, reduced: false, pace: 1, subject: (): string | null => 'client:a' };
  owner.frame(ARTIFACT, '/', draw);
  owner.frame(ARTIFACT, '/', draw);
  await new Promise((resolve) => setImmediate(resolve));
  owner.frame(ARTIFACT, '/', draw);
  await new Promise((resolve) => setImmediate(resolve));
  owner.frame(ARTIFACT, '/', draw);
  owner.frame(ARTIFACT, '/', draw);
  assert.equal(drawsOf(scene).length, addedDraws(1, 2));
  assert.doesNotThrow(() => owner.frame(ARTIFACT, '/', { ...draw, subject: () => { throw new Error('the store threw'); } }));
  assert.equal(owner.status().document, 'failed');
  assert.deepEqual(scene.children, []);
  assert.doesNotThrow(() => owner.frame(ARTIFACT, '/', draw));
});

test('a new layer from the held images seeds the rise again, with no ramp', () => {
  const first = new Scene();
  const layer = createFillLayer(ARTIFACT, IMAGES);
  layer.attach(first);
  layer.frame(new PerspectiveCamera(), DELTA, false, 1, 'client:a');
  layer.dispose();
  const second = new Scene();
  const again = createFillLayer(ARTIFACT, IMAGES);
  again.attach(second);
  again.frame(new PerspectiveCamera(), DELTA, false, 1, 'client:b');
  const fills = drawsOf(second).filter((mesh) => materialOf(mesh).uniforms.uRise !== undefined && !isGlow(mesh));
  assert.deepEqual(fills.map(riseOf), [0, 1]);
});

test('the committed artifact: one Star plan per Star of the layout, each with finite position', () => {
  const layout = JSON.parse(readFileSync(new URL('../../../generated/layout.generated.json', import.meta.url), 'utf8')) as RealismArtifact;
  const plans = starPlans(layout);
  assert.ok(plans.length > 0);
  assert.deepEqual(plans.map((plan) => plan.id), layout.clients.map((client) => client.id));
});

// --- The source audits ----------------------------------------------------------------------------

/** Two draws per plan over a geometry it is given, in the one colour, by the rules of each draw. */
function auditStarLayer(source: string): string[] {
  const code = stripCommentsAndStrings(source);
  const kept = stripComments(source);
  const failures: string[] = [];
  if ((code.match(/\bnew\s+Mesh\b/g) ?? []).length !== 2) failures.push('not exactly two Mesh: a third construction is a third draw');
  if (!/plans\.map\(\(plan\)\s*=>\s*\{[\s\S]*?\bnew\s+Mesh\b[\s\S]*?\bnew\s+Mesh\b/.test(code)) failures.push('the two Mesh are not built per plan');
  if (/\bnew\s+\w*Geometry\b/.test(code)) failures.push('a new geometry');
  if (/\b(?:Line2?|LineSegments|Points|Sprite|InstancedMesh)\b/.test(code)) failures.push('another kind of draw');
  if (/\.clone\s*\(/.test(code)) failures.push('a clone is another draw');
  if (!/\bblending:\s*AdditiveBlending\b/.test(code)) failures.push('the glow is not additive');
  if (!/\bglow\.renderOrder = GLOW_RENDER_ORDER;/.test(code)) failures.push('the glow is not at its own step');
  if (!/\bfill\.renderOrder = FILL_RENDER_ORDER;/.test(code)) failures.push('the fill is not at its own step');
  const glowMaterial = /new\s+Mesh\(geometry,\s*new\s+ShaderMaterial\(\{[^}]*?fragmentShader:\s*GLOW_FRAGMENT_SHADER[\s\S]*?\}\)\)/.exec(code)?.[0] ?? '';
  if (glowMaterial === '') failures.push('no glow material found');
  if (!/\bdepthTest:\s*true\b/.test(glowMaterial)) failures.push('the glow does not test depth');
  if (!/\bdepthWrite:\s*false\b/.test(glowMaterial)) failures.push('the glow writes depth');
  const fillMaterial = /new\s+Mesh\(geometry,\s*new\s+ShaderMaterial\(\{[^}]*?fragmentShader:\s*STAR_FILL_FRAGMENT_SHADER[\s\S]*?\}\)\)/.exec(code)?.[0] ?? '';
  if (fillMaterial === '') failures.push('no Star fill material found');
  if (!/\bdepthWrite:\s*false\b/.test(fillMaterial)) failures.push('a Star fill writes depth at build');
  if (/\bdepthWrite\s*=\s*(?:true|false)\b/.test(code) || !/\bfill\.material\.depthWrite = on;/.test(code)) failures.push('the fill does not follow the layer\'s one switch');
  if ((code.match(/\buFade:\s*fade\b/g) ?? []).length !== 2 || /\buFade:\s*\{/.test(code)) failures.push('not every draw reads the fade it is handed');
  if (/\bscene\b|\bScene\b/.test(code)) failures.push('the rows reach a scene, not the group they are handed');
  const names = [...kept.matchAll(/\btokens\.colors\[\s*'([^']+)'\s*\]/g)].map((match) => match[1]);
  if (names.length > 0) failures.push(`a colour is not a tint alone: ${names.join()}`);
  const reads = [...code.matchAll(/\btokens\.colors\[([^\]]*\]?)\]/g)].map((match) => match[1]);
  if (reads.join() !== 'STAR_TINT_TOKENS[plan.tint]') failures.push(`the colour is not each plan's tint alone: ${reads.join() || 'none'}`);
  const record = /STAR_TINT_TOKENS:[^=]*=\s*\{([^}]*)\}/.exec(kept)?.[1] ?? '';
  const entries = [...record.matchAll(/(\w+):\s*'([^']+)'/g)].map((match) => `${match[1]}=${match[2]}`).sort();
  const expected = STAR_TINT_NAMES.map((tint) => `${tint}=realism-star-${tint}-dark`).sort();
  if (entries.join() !== expected.join()) failures.push(`the tint record is not the five realism-star-<tint>-dark tokens: ${entries.join() || 'none'}`);
  if (/\.tint\b/.test(code.replace('STAR_TINT_TOKENS[plan.tint]', ''))) failures.push('a tint is read other than for its colour');
  if (/\bappearance\b|\bTexture\b|\buMap\b/.test(code)) failures.push("a Star reads a Planet's surface");
  return failures;
}

test('star-layer.ts ties each plan to exactly two Mesh, no new geometry, and each draw to its rules', () => {
  assert.deepEqual(auditStarLayer(readFileSync(new URL('./star-layer.ts', import.meta.url), 'utf8')), []);
});

test('the Star layer audit rejects a third draw, a new geometry, a map and each glow rule broken', () => {
  const real = readFileSync(new URL('./star-layer.ts', import.meta.url), 'utf8');
  const STEP = 'glow.renderOrder = GLOW_RENDER_ORDER;';
  assert.ok(real.includes(STEP));
  for (const [name, mutated, message] of [
    ['a third draw', real.replace(STEP, `const halo = new Mesh(geometry, fill.material);\n    ${STEP}`), /third construction/],
    ['one draw', real.replace('const glow = new Mesh(', 'const glow = makeMesh('), /third construction/],
    ['a new geometry', real.replace(STEP, `const plane = new PlaneGeometry(1, 1);\n    ${STEP}`), /a new geometry/],
    ['a second sphere', real.replace(STEP, `const plane = new SphereGeometry(1, 8, 8);\n    ${STEP}`), /a new geometry/],
    ['a sprite', real.replace(STEP, `const s = new Sprite();\n    ${STEP}`), /another kind of draw/],
    ['a clone', real.replace(STEP, `const s = fill.clone();\n    ${STEP}`), /a clone/],
    ['normal blending', real.replace('blending: AdditiveBlending', 'blending: NormalBlending'), /not additive/],
    ['no depth test', real.replace(/depthTest: true,(\s*depthWrite: false)/, 'depthTest: false,$1'), /does not test depth/],
    ['the glow writing depth', real.replace(/(blending: AdditiveBlending,\s*depthTest: true,\s*)depthWrite: false/, '$1depthWrite: true'), /the glow writes depth/],
    ['a Star fill writing depth at build', real.replace('depthWrite: false,\n      depthTest: true,\n      side: FrontSide,\n    }));\n    const glow', 'depthWrite: true,\n      depthTest: true,\n      side: FrontSide,\n    }));\n    const glow'), /Star fill writes depth at build/],
    ['a fill pinned on by itself', real.replace('fill.material.depthWrite = on;', 'fill.material.depthWrite = true;'), /one switch/],
    ['a second fade object', real.replace('uColor: { value: color }, uFade: fade },\n      transparent: true,\n      blending', 'uColor: { value: color }, uFade: { value: 1 } },\n      transparent: true,\n      blending'), /reads the fade it is handed/],
    ['a draw with no fade', real.replace('uColor: { value: color }, uFade: fade, uLow:', 'uColor: { value: color }, uLow:'), /reads the fade it is handed/],
    ['the rows added to a scene', real.replace('group.add(fill, glow);', 'scene.add(fill, glow);'), /reach a scene/],
    ['the wrong step', real.replace(STEP, 'glow.renderOrder = FILL_RENDER_ORDER;'), /not at its own step/],
    ['another token', real.replace('tokens.colors[STAR_TINT_TOKENS[plan.tint]]', "tokens.colors['realism-ambient-floor-dark']"), /alone/],
    ['one colour for every Star', real.replace('STAR_TINT_TOKENS[plan.tint]', "STAR_TINT_TOKENS['white']"), /tint alone/],
    ['a record missing a tint', real.replace("  red: 'realism-star-red-dark',\n", ''), /tint record/],
    ['a record naming the wrong token', real.replace("orange: 'realism-star-orange-dark'", "orange: 'realism-star-red-dark'"), /tint record/],
    ['a tint read for something else', real.replace(STEP, `glow.visible = plan.tint !== 'red';\n    ${STEP}`), /other than for its colour/],
    ['a second token', real.replace(STEP, `const other = new Color(tokens.colors['stroke-focus-dark']);\n    ${STEP}`), /alone/],
    ['a map', real.replace(STEP, `const t = new Texture();\n    ${STEP}`), /surface/],
    ['the appearance', real.replace(STEP, `const a = plan.appearance;\n    ${STEP}`), /surface/],
  ] as const) {
    assert.notEqual(mutated, real, `"${name}" must apply`);
    assert.match(auditStarLayer(mutated).join('\n'), message, name);
  }
});

/** The chunk draws no Dust: 0 added draws has nothing to measure, so what holds it is that no module here names any. `budgets.ts` declares the limit. */
function dustNames(modules: readonly { readonly path: string; readonly text: string }[]): string[] {
  return modules.filter(({ path, text }) => !path.endsWith('budgets.ts') && /\bDUST_\w*|dust-model|\bdust\b/i.test(stripComments(text))).map(({ path }) => path);
}

test('no module of the chunk names the Dust, and the row fails on one that does', () => {
  const modules = filesUnder(fileURLToPath(new URL('./', import.meta.url))).filter((path) => SOURCE_MODULE.test(path) && !isTestFile(path)).map((path) => ({ path, text: readFileSync(path, 'utf8') }));
  assert.ok(modules.length >= 9, 'the walk reads the chunk');
  assert.deepEqual(dustNames(modules), []);
  assert.deepEqual(dustNames([{ path: 'star-layer.ts', text: 'mesh.renderOrder = DUST_RENDER_ORDER;' }]), ['star-layer.ts']);
  assert.deepEqual(dustNames([{ path: 'x.ts', text: "import { buildDust } from '../dust-model.ts';" }]), ['x.ts']);
  assert.deepEqual(dustNames([{ path: 'x.ts', text: '// no Dust here' }]), []);
});

test('the Star model imports types only, and reads its band, its pulse phase and its tint, and nothing else derived', () => {
  const code = stripCommentsAndStrings(readFileSync(new URL('./star-model.ts', import.meta.url), 'utf8'));
  assert.deepEqual([...code.matchAll(/^\s*import\b(?!\s+type\b)/gm)].map((match) => match[0]), []);
  assert.doesNotMatch(code, /\bimport\s*\(/);
  assert.doesNotMatch(code, /\bexport\s+(?:\*|\{)/);
  assert.deepEqual([...code.matchAll(/\bappearance\??\.\w+/g)].map((match) => match[0]), ['appearance?.pulsePhase', 'appearance?.tint'], 'of a Star\'s appearance, its phase and its tint alone');
  assert.doesNotMatch(code, /\b(?:meanLuminance|tilt|spinRate|spinPhase|mass|isDeep|moteTier)\b/);
});
