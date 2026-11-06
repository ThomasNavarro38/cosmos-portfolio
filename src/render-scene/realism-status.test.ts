/**
 * Realism's owner (7.5): every row of the story's matrix over fake ports, then
 * the source audits that hold what the runner cannot load: the mount, its one
 * place in `scene.tsx`, the suspension scan and the gate words. Each audit is
 * driven over mutations. The reach of the realism directory is audited in
 * `scripts/bundle-assertion.test.ts`, outside the tree the budgets audit walks,
 * because its mutation rows name the budgets.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { filesUnder, isTestFile, SOURCE_MODULE, stripComments, stripCommentsAndStrings } from '../../scripts/source-scan.ts';
import { createRealismOwner, moveStatus, type DocumentStatus, type RealismArtifact, type RealismChunk, type RealismDraw, type RealismLayer } from './realism-status.ts';

const ORIGIN = { x: 0, y: 0, z: 0 };
const ARTIFACT: RealismArtifact = {
  clients: [{ id: 'client:a', position: ORIGIN, projects: [{ id: 'project:a/one', clientId: 'client:a', position: { x: 10, y: 0, z: 0 }, appearance: { map: 'moon', meanLuminance: 0.3, tilt: 0, spinRate: 0.05, spinPhase: 0 } }] }],
};
const DRAW: RealismDraw = { scene: 'scene', camera: 'camera', delta: 0.5, reduced: false, pace: 1, subject: () => null };
const BASE = '/base/';
const IMAGES: ReadonlyMap<string, string> = new Map([['moon', 'image']]);

/** Lets every settled promise's reactions run. */
const settled = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

/** A layer recording what it was asked, with each method's failure chosen by the row. */
function fakeLayer(calls: string[], fails: { attach?: boolean; frame?: boolean; dispose?: boolean } = {}): RealismLayer {
  return {
    attach(scene) {
      calls.push(`attach ${String(scene)}`);
      if (fails.attach) throw new Error('attach');
    },
    frame(camera, delta, reduced) {
      calls.push(`frame ${String(camera)} ${delta} ${reduced}`);
      if (fails.frame) throw new Error('frame');
    },
    dispose() {
      calls.push('dispose');
      if (fails.dispose) throw new Error('dispose');
    },
  };
}

/** An owner over counted ports, whose decode result the row chooses. */
function ownerOver(decode: () => Promise<ReadonlyMap<string, string>> = () => Promise.resolve(IMAGES), build: () => RealismLayer = () => fakeLayer([])) {
  const counts = { imports: 0, decodes: 0, builds: 0, args: [] as unknown[][], builtWith: [] as unknown[][] };
  const owner = createRealismOwner<string>(() => {
    counts.imports += 1;
    return Promise.resolve({
      decodeMaps(...args) {
        counts.decodes += 1;
        counts.args.push(args);
        return decode();
      },
      createFillLayer(...args) {
        counts.builds += 1;
        counts.builtWith.push(args);
        return build();
      },
    } satisfies RealismChunk<string>);
  });
  return { owner, counts };
}

/** Runs `frames` frames, then lets everything settle. */
async function frames(owner: { frame(artifact: RealismArtifact, base: string, draw: RealismDraw): void }, count: number): Promise<void> {
  for (let at = 0; at < count; at += 1) owner.frame(ARTIFACT, BASE, DRAW);
  await settled();
}

test('the first frame leaves the status idle, with no import', async () => {
  const { owner, counts } = ownerOver();
  await frames(owner, 1);
  assert.deepEqual(owner.status(), { document: 'idle', uploaded: false });
  assert.equal(counts.imports, 0);
  assert.equal(owner.images(), null);
});

test('the second frame moves to fetching at once, with one import and one decode, handed the artifact and base', async () => {
  const { owner, counts } = ownerOver(() => new Promise(() => undefined));
  owner.frame(ARTIFACT, BASE, DRAW);
  owner.frame(ARTIFACT, BASE, DRAW);
  assert.equal(owner.status().document, 'fetching');
  assert.equal(counts.imports, 1);
  await settled();
  assert.equal(counts.decodes, 1);
  assert.deepEqual(counts.args, [[ARTIFACT, BASE]]);
});

test('later frames, while fetching and after, make no second import or decode', async () => {
  const { owner, counts } = ownerOver(() => new Promise(() => undefined));
  await frames(owner, 12);
  assert.deepEqual([counts.imports, counts.decodes], [1, 1]);
  const done = ownerOver();
  await frames(done.owner, 2);
  await frames(done.owner, 12);
  assert.deepEqual([done.counts.imports, done.counts.decodes], [1, 1]);
  assert.equal(done.owner.status().document, 'shown');
});

test('every map decoding moves to decoded, with the images held by map id', async () => {
  const { owner } = ownerOver();
  await frames(owner, 2);
  assert.equal(owner.status().document, 'decoded');
  assert.equal(owner.images(), IMAGES);
});

for (const [name, chunkPort] of [
  ['the import rejects', () => Promise.reject(new Error('404'))],
  ['the import throws synchronously', () => { throw new Error('sync'); }],
  ['the import returns no promise', () => undefined as never],
  ['the chunk has no decodeMaps', () => Promise.resolve({} as never)],
  ['decodeMaps throws synchronously', () => Promise.resolve({ decodeMaps() { throw new Error('sync'); } })],
  ['decodeMaps rejects, as a missing, corrupt or single failed map does', () => Promise.resolve({ decodeMaps: () => Promise.reject(new Error('decode')) })],
  ['decodeMaps resolves no images', () => Promise.resolve({ decodeMaps: () => Promise.resolve(new Map<string, string>()) })],
  ['decodeMaps resolves nothing', () => Promise.resolve({ decodeMaps: () => Promise.resolve(undefined as never) })],
] as const) {
  test(`${name}: failed, silently, with nothing held, and no retry`, async () => {
    const consoleCalls: unknown[] = [];
    const saved = { error: console.error, warn: console.warn, log: console.log };
    for (const key of ['error', 'warn', 'log'] as const) console[key] = (...args: unknown[]) => void consoleCalls.push(args);
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown): void => void unhandled.push(reason);
    process.on('unhandledRejection', onUnhandled);
    try {
      let imports = 0;
      const owner = createRealismOwner<string>(() => {
        imports += 1;
        return (chunkPort as unknown as () => Promise<RealismChunk<string>>)();
      });
      assert.doesNotThrow(() => owner.frame(ARTIFACT, BASE, DRAW));
      assert.doesNotThrow(() => owner.frame(ARTIFACT, BASE, DRAW));
      await settled();
      assert.equal(owner.status().document, 'failed');
      assert.equal(owner.images(), null);
      await frames(owner, 20);
      owner.enterCanvas();
      await frames(owner, 20);
      assert.equal(owner.status().document, 'failed', 'stays failed across frames and a new Canvas');
      assert.equal(imports, 1, 'no retry');
      assert.deepEqual(consoleCalls, [], 'nothing logged');
      await settled();
      assert.deepEqual(unhandled, [], 'nothing rethrown');
    } finally {
      process.off('unhandledRejection', onUnhandled);
      Object.assign(console, saved);
    }
  });
}

test('a frame callback whose port throws does not propagate into R3F', () => {
  const owner = createRealismOwner<string>(() => {
    throw new TypeError('a port threw');
  });
  owner.frame(ARTIFACT, BASE, DRAW);
  assert.doesNotThrow(() => owner.frame(ARTIFACT, BASE, DRAW));
  assert.equal(owner.status().document, 'failed');
});

test('the status table: every legal move, and every other ignored, with failed terminal', () => {
  const all: readonly DocumentStatus[] = ['idle', 'fetching', 'decoded', 'shown', 'failed'];
  const legal = new Set(['idle>fetching', 'idle>failed', 'fetching>decoded', 'fetching>failed', 'decoded>shown', 'decoded>failed', 'shown>failed']);
  for (const from of all) {
    for (const to of all) {
      assert.equal(moveStatus(from, to), legal.has(`${from}>${to}`) ? to : from, `${from} → ${to}`);
    }
  }
});

test('illegal marks are ignored: shown before decoded, uploaded with nothing held, and any mark after failed', async () => {
  const { owner } = ownerOver(() => new Promise(() => undefined));
  owner.markShown();
  owner.markUploaded();
  assert.deepEqual(owner.status(), { document: 'idle', uploaded: false });
  await frames(owner, 2);
  owner.markShown();
  owner.markUploaded();
  assert.deepEqual(owner.status(), { document: 'fetching', uploaded: false });
  const failed = ownerOver(() => Promise.reject(new Error('x')));
  await frames(failed.owner, 2);
  failed.owner.markShown();
  failed.owner.markUploaded();
  assert.deepEqual(failed.owner.status(), { document: 'failed', uploaded: false });
});

test('decoded moves to shown only once uploaded, and stays there', async () => {
  const { owner } = ownerOver();
  await frames(owner, 2);
  owner.markShown();
  assert.equal(owner.status().document, 'decoded', 'not uploaded, so not shown');
  owner.markUploaded();
  owner.markShown();
  owner.markShown();
  assert.deepEqual(owner.status(), { document: 'shown', uploaded: true });
  assert.equal(owner.images(), IMAGES);
});

test('a later Canvas over a shown document stays shown, with uploaded false until it uploads again', async () => {
  const { owner, counts } = ownerOver();
  await frames(owner, 2);
  owner.markUploaded();
  owner.markShown();
  owner.enterCanvas();
  assert.deepEqual(owner.status(), { document: 'shown', uploaded: false });
  owner.markShown();
  assert.deepEqual(owner.status(), { document: 'shown', uploaded: false });
  owner.markUploaded();
  assert.deepEqual(owner.status(), { document: 'shown', uploaded: true });
  assert.deepEqual([counts.imports, counts.decodes], [1, 1]);
});

test('a new Canvas before the upload: decoded stays decoded, and marking shown waits for its upload', async () => {
  const { owner } = ownerOver();
  await frames(owner, 2);
  owner.markUploaded();
  owner.enterCanvas();
  owner.markShown();
  assert.deepEqual(owner.status(), { document: 'decoded', uploaded: false });
  owner.markUploaded();
  owner.markShown();
  assert.equal(owner.status().document, 'shown');
});

for (const reached of ['idle', 'fetching', 'decoded', 'shown'] as const) {
  test(`markFailed from ${reached}: failed, terminal, nothing usable and no request after it`, async () => {
    const { owner, counts } = ownerOver(reached === 'fetching' ? () => new Promise(() => undefined) : undefined);
    if (reached !== 'idle') await frames(owner, 2);
    if (reached === 'shown') {
      owner.markUploaded();
      owner.markShown();
    }
    assert.equal(owner.status().document, reached);
    const imports = counts.imports;
    assert.doesNotThrow(() => owner.markFailed());
    assert.deepEqual(owner.status(), { document: 'failed', uploaded: false });
    assert.equal(owner.images(), null);
    await frames(owner, 5);
    owner.enterCanvas();
    owner.markUploaded();
    owner.markShown();
    assert.deepEqual(owner.status(), { document: 'failed', uploaded: false });
    assert.equal(counts.imports, imports);
  });
}

test('markFailed mid-fetch: the decode settling later does not bring the document back', async () => {
  let settle: (images: ReadonlyMap<string, string>) => void = () => undefined;
  const { owner } = ownerOver(() => new Promise((resolve) => { settle = resolve; }));
  await frames(owner, 2);
  owner.markFailed();
  settle(IMAGES);
  await settled();
  assert.equal(owner.status().document, 'failed');
  assert.equal(owner.images(), null);
});

test('Canvas A runs one frame and goes, then Canvas B\'s first frame starts the import: the count is the document\'s, so it still follows a first frame', async () => {
  const { owner, counts } = ownerOver();
  owner.frame(ARTIFACT, BASE, DRAW);
  assert.equal(counts.imports, 0, 'Canvas A\'s first frame only counts, and queued the mark');
  owner.enterCanvas();
  assert.equal(counts.imports, 0, 'entering a Canvas does not start anything, or reset the count');
  owner.frame(ARTIFACT, BASE, DRAW);
  assert.equal(counts.imports, 1, 'the document\'s second frame, Canvas B\'s first');
  assert.equal(owner.status().document, 'fetching');
  await settled();
  assert.equal(owner.status().document, 'decoded');
});

test('a new Canvas resets uploaded and nothing else, with no network', async () => {
  for (const shown of [false, true]) {
    const { owner, counts } = ownerOver();
    await frames(owner, 2);
    owner.markUploaded();
    if (shown) owner.markShown();
    const document = owner.status().document;
    assert.equal(owner.status().uploaded, true);
    owner.enterCanvas();
    assert.deepEqual(owner.status(), { document, uploaded: false });
    assert.equal(owner.images(), IMAGES);
    await frames(owner, 5);
    assert.deepEqual([counts.imports, counts.decodes], [1, 1]);
    assert.deepEqual(owner.status(), { document: 'shown', uploaded: true }, 'the frames of the new Canvas build its layer, and request nothing');
  }
});

test('a Canvas gone mid-fetch: the status still advances when the promise settles, and nothing throws', async () => {
  let settle: (images: ReadonlyMap<string, string>) => void = () => undefined;
  const { owner } = ownerOver(() => new Promise((resolve) => { settle = resolve; }));
  await frames(owner, 2);
  owner.enterCanvas();
  settle(IMAGES);
  await settled();
  assert.equal(owner.status().document, 'decoded');
});

test('nothing is closed: the owner holds the very images it was given', async () => {
  let closed = 0;
  const image = { close: () => { closed += 1; } };
  const owner = createRealismOwner<typeof image>(() => Promise.resolve({ decodeMaps: () => Promise.resolve(new Map([['moon', image]])), createFillLayer: () => fakeLayer([]) }));
  await frames(owner, 2);
  owner.enterCanvas();
  await frames(owner, 2);
  owner.enterCanvas()();
  assert.equal(owner.images()?.get('moon'), image);
  assert.equal(closed, 0);
});

// --- The layer (7.6) ------------------------------------------------------------------------------

/** An owner with the maps decoded, and the frame that follows not yet run. */
async function decodedOwner(build: () => RealismLayer) {
  const made = ownerOver(undefined, build);
  await frames(made.owner, 2);
  assert.equal(made.owner.status().document, 'decoded');
  return made;
}

test('before decode there is no layer, whatever the frames', async () => {
  const { owner, counts } = ownerOver(() => new Promise(() => undefined));
  await frames(owner, 10);
  assert.equal(owner.status().document, 'fetching');
  assert.equal(counts.builds, 0);
});

test('the first frame at decoded builds the layer from the held images, attaches it, draws it, and marks uploaded then shown, that same frame', async () => {
  const calls: string[] = [];
  const { owner, counts } = await decodedOwner(() => fakeLayer(calls));
  owner.frame(ARTIFACT, BASE, DRAW);
  assert.deepEqual(calls, ['attach scene', 'frame camera 0.5 false']);
  assert.deepEqual(counts.builtWith, [[ARTIFACT, IMAGES]]);
  assert.deepEqual(owner.status(), { document: 'shown', uploaded: true });
});

test('later frames update the one layer, handing it the delta, the camera and reduced as given', async () => {
  const calls: string[] = [];
  const { owner, counts } = await decodedOwner(() => fakeLayer(calls));
  owner.frame(ARTIFACT, BASE, DRAW);
  owner.frame(ARTIFACT, BASE, { ...DRAW, camera: 'moved', delta: 0.25, reduced: true });
  assert.equal(counts.builds, 1);
  assert.deepEqual(calls, ['attach scene', 'frame camera 0.5 false', 'frame moved 0.25 true']);
});

test('a decode that failed builds no layer', async () => {
  const { owner, counts } = ownerOver(() => Promise.reject(new Error('x')));
  await frames(owner, 2);
  await frames(owner, 5);
  assert.equal(owner.status().document, 'failed');
  assert.equal(counts.builds, 0);
});

for (const [name, fails, expected] of [
  ['attaching throws', { attach: true }, ['attach scene', 'dispose']],
  ['the first update throws', { frame: true }, ['attach scene', 'frame camera 0.5 false', 'dispose']],
] as const) {
  test(`${name}: failed, silently, everything removed, and no second build`, async () => {
    const calls: string[] = [];
    const { owner, counts } = await decodedOwner(() => fakeLayer(calls, fails));
    assert.doesNotThrow(() => owner.frame(ARTIFACT, BASE, DRAW));
    assert.deepEqual(owner.status(), { document: 'failed', uploaded: false });
    assert.deepEqual(calls, expected);
    await frames(owner, 5);
    owner.enterCanvas();
    await frames(owner, 5);
    assert.equal(counts.builds, 1);
    assert.deepEqual(calls, expected);
  });
}

test('a build that throws synchronously, as the model does: failed, silently, nothing to remove', async () => {
  const { owner, counts } = await decodedOwner(() => {
    throw new Error('the model threw');
  });
  assert.doesNotThrow(() => owner.frame(ARTIFACT, BASE, DRAW));
  assert.deepEqual(owner.status(), { document: 'failed', uploaded: false });
  await frames(owner, 5);
  assert.equal(counts.builds, 1);
});

test('a chunk with no layer builder ends the same way', async () => {
  const owner = createRealismOwner<string>(() => Promise.resolve({ decodeMaps: () => Promise.resolve(IMAGES) } as unknown as RealismChunk<string>));
  await frames(owner, 2);
  assert.doesNotThrow(() => owner.frame(ARTIFACT, BASE, DRAW));
  assert.equal(owner.status().document, 'failed');
});

test('an update throwing on a later frame: failed, fills removed, and the loop goes on', async () => {
  const calls: string[] = [];
  let throwing = false;
  const { owner } = await decodedOwner(() => ({
    ...fakeLayer(calls),
    frame() {
      if (throwing) throw new Error('later');
    },
  }));
  owner.frame(ARTIFACT, BASE, DRAW);
  assert.equal(owner.status().document, 'shown');
  throwing = true;
  assert.doesNotThrow(() => owner.frame(ARTIFACT, BASE, DRAW));
  assert.deepEqual(owner.status(), { document: 'failed', uploaded: false });
  assert.deepEqual(calls, ['attach scene', 'dispose']);
  assert.equal(owner.images(), null);
  assert.doesNotThrow(() => owner.frame(ARTIFACT, BASE, DRAW));
});

test('markFailed removes a built layer, and a dispose that throws stays silent', async () => {
  const calls: string[] = [];
  const { owner } = await decodedOwner(() => fakeLayer(calls, { dispose: true }));
  owner.frame(ARTIFACT, BASE, DRAW);
  assert.doesNotThrow(() => owner.markFailed());
  assert.deepEqual(calls, ['attach scene', 'frame camera 0.5 false', 'dispose']);
  assert.equal(owner.status().document, 'failed');
});

test('a new Canvas over shown builds a new layer from the held images, with no request; leaving disposes it and keeps the images', async () => {
  const calls: string[] = [];
  const { owner, counts } = await decodedOwner(() => fakeLayer(calls));
  const leaveFirst = owner.enterCanvas();
  owner.frame(ARTIFACT, BASE, DRAW);
  leaveFirst();
  assert.deepEqual(calls, ['attach scene', 'frame camera 0.5 false', 'dispose']);
  assert.deepEqual(owner.status(), { document: 'shown', uploaded: false });
  assert.equal(owner.images(), IMAGES);
  const leaveSecond = owner.enterCanvas();
  owner.frame(ARTIFACT, BASE, { ...DRAW, scene: 'second' });
  assert.deepEqual(owner.status(), { document: 'shown', uploaded: true });
  assert.equal(calls.at(-2), 'attach second');
  assert.deepEqual(counts.builtWith, [[ARTIFACT, IMAGES], [ARTIFACT, IMAGES]]);
  assert.deepEqual([counts.imports, counts.decodes], [1, 1]);
  leaveSecond();
  assert.equal(calls.at(-1), 'dispose');
});

test('a Canvas leaving late, after the next has entered, leaves the new layer alone', async () => {
  const calls: string[] = [];
  const { owner } = await decodedOwner(() => fakeLayer(calls));
  const leaveOld = owner.enterCanvas();
  owner.frame(ARTIFACT, BASE, DRAW);
  owner.enterCanvas();
  owner.frame(ARTIFACT, BASE, { ...DRAW, scene: 'new' });
  const before = [...calls];
  leaveOld();
  assert.deepEqual(calls, before);
  assert.deepEqual(owner.status(), { document: 'shown', uploaded: true });
});

test('a frame that runs before the passive effect builds exactly once: entering keeps the layer, and resets uploaded until the next frame', async () => {
  const calls: string[] = [];
  const { owner, counts } = await decodedOwner(() => fakeLayer(calls));
  owner.frame(ARTIFACT, BASE, DRAW);
  assert.deepEqual(owner.status(), { document: 'shown', uploaded: true });
  const leave = owner.enterCanvas();
  assert.deepEqual(owner.status(), { document: 'shown', uploaded: false });
  assert.ok(!calls.includes('dispose'), 'entering disposes nothing');
  owner.frame(ARTIFACT, BASE, DRAW);
  assert.equal(counts.builds, 1);
  assert.deepEqual(calls, ['attach scene', 'frame camera 0.5 false', 'frame camera 0.5 false']);
  assert.deepEqual(owner.status(), { document: 'shown', uploaded: true });
  leave();
  assert.equal(calls.at(-1), 'dispose', 'this Canvas left, and nothing has entered since');
});

test('entering a new Canvas with the old layer still attached: its first frame moves the layer, one dispose and one new build', async () => {
  const calls: string[] = [];
  const { owner, counts } = await decodedOwner(() => fakeLayer(calls));
  const leaveOld = owner.enterCanvas();
  owner.frame(ARTIFACT, BASE, DRAW);
  owner.enterCanvas();
  assert.deepEqual(owner.status(), { document: 'shown', uploaded: false });
  assert.ok(!calls.includes('dispose'), 'not until a frame from the new scene');
  owner.frame(ARTIFACT, BASE, { ...DRAW, scene: 'new' });
  assert.equal(counts.builds, 2);
  assert.deepEqual(calls, ['attach scene', 'frame camera 0.5 false', 'dispose', 'attach new', 'frame camera 0.5 false']);
  leaveOld();
  assert.equal(calls.filter((call) => call === 'dispose').length, 1, 'a stale leave disposes nothing');
});

test('a frame from another scene moves the layer there: the old is disposed, a new one attached', async () => {
  const calls: string[] = [];
  const { owner, counts } = await decodedOwner(() => fakeLayer(calls));
  owner.frame(ARTIFACT, BASE, DRAW);
  owner.frame(ARTIFACT, BASE, { ...DRAW, scene: 'other' });
  assert.equal(counts.builds, 2);
  assert.deepEqual(calls, ['attach scene', 'frame camera 0.5 false', 'dispose', 'attach other', 'frame camera 0.5 false']);
});

test('leaving a Canvas mid-fetch, then the maps arriving, draws nothing until a Canvas has a frame', async () => {
  let settle: (images: ReadonlyMap<string, string>) => void = () => undefined;
  const { owner, counts } = ownerOver(() => new Promise((resolve) => { settle = resolve; }));
  const leave = owner.enterCanvas();
  await frames(owner, 2);
  leave();
  settle(IMAGES);
  await settled();
  assert.deepEqual(owner.status(), { document: 'decoded', uploaded: false });
  assert.equal(counts.builds, 0);
});

test('under one Canvas the owner sees no context event: same layer, uploaded stays true', async () => {
  const { owner, counts } = await decodedOwner(() => fakeLayer([]));
  await frames(owner, 3);
  assert.deepEqual(owner.status(), { document: 'shown', uploaded: true });
  await frames(owner, 3);
  assert.equal(counts.builds, 1);
});

// --- The subject and the pace (7.7) ---------------------------------------------------------------

/** A layer recording only what the owner resolved for it. */
function recordingLayer(seen: unknown[][]): RealismLayer {
  return {
    attach() {},
    frame(_camera, _delta, _reduced, pace, subject) {
      seen.push([pace, subject]);
    },
    dispose() {},
  };
}

test('before decode, and after a failed decode, the subject is not called', async () => {
  let calls = 0;
  const draw: RealismDraw = { ...DRAW, subject: () => { calls += 1; return 'client:a'; } };
  const fetching = ownerOver(() => new Promise(() => undefined));
  for (let at = 0; at < 6; at += 1) fetching.owner.frame(ARTIFACT, BASE, draw);
  await settled();
  assert.equal(fetching.owner.status().document, 'fetching');
  assert.equal(calls, 0, 'idle and fetching');
  const failed = ownerOver(() => Promise.reject(new Error('x')));
  for (let at = 0; at < 6; at += 1) failed.owner.frame(ARTIFACT, BASE, draw);
  await settled();
  for (let at = 0; at < 6; at += 1) failed.owner.frame(ARTIFACT, BASE, draw);
  assert.equal(failed.owner.status().document, 'failed');
  assert.equal(calls, 0, 'failed');
});

test('with a layer, the subject is resolved once a frame, inside the owner, and handed on with the pace', async () => {
  const seen: unknown[][] = [];
  const { owner } = await decodedOwner(() => recordingLayer(seen));
  let calls = 0;
  owner.frame(ARTIFACT, BASE, { ...DRAW, pace: 0.25, subject: () => { calls += 1; return 'client:a'; } });
  owner.frame(ARTIFACT, BASE, { ...DRAW, pace: 1, subject: () => { calls += 1; return null; } });
  owner.frame(ARTIFACT, BASE, { ...DRAW, pace: 1, subject: () => { calls += 1; return 'client:gone'; } });
  assert.equal(calls, 3);
  assert.deepEqual(seen, [[0.25, 'client:a'], [1, null], [1, 'client:gone']]);
});

test('a subject that throws: failed, silently, everything removed, and the loop goes on', async () => {
  const calls: string[] = [];
  const { owner } = await decodedOwner(() => fakeLayer(calls));
  owner.frame(ARTIFACT, BASE, DRAW);
  assert.doesNotThrow(() => owner.frame(ARTIFACT, BASE, { ...DRAW, subject: () => { throw new Error('the store threw'); } }));
  assert.deepEqual(owner.status(), { document: 'failed', uploaded: false });
  assert.equal(calls.at(-1), 'dispose');
  assert.doesNotThrow(() => owner.frame(ARTIFACT, BASE, DRAW));
});

test('a subject that throws on the very first frame at decoded: failed, and the built layer is removed', async () => {
  const calls: string[] = [];
  const { owner } = await decodedOwner(() => fakeLayer(calls));
  assert.doesNotThrow(() => owner.frame(ARTIFACT, BASE, { ...DRAW, subject: () => { throw new Error('the store threw'); } }));
  assert.equal(owner.status().document, 'failed');
  assert.deepEqual(calls, ['attach scene', 'dispose']);
});

// --- The source audits ----------------------------------------------------------------------------

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const STATUS_PATH = 'src/render-scene/realism-status.ts';
const MOUNT_PATH = 'src/render-scene/realism-mount.tsx';
const SCENE_DIR = 'src/render-scene/';
const REALISM_DIR = 'src/render-scene/realism/';
const THE_IMPORT = "import('./realism/index.ts')";

const read = (path: string): string => readFileSync(join(REPO_ROOT, path), 'utf8');
const toRepoPath = (path: string): string => relative(REPO_ROOT, path).split(sep).join('/');

test('realism-status.ts imports nothing, reads no store, logs nothing, throws nothing and closes nothing', () => {
  const audit = (source: string): string[] => {
    const code = stripCommentsAndStrings(source);
    return ([
      ['an import', /\bimport\b/],
      ['a re-export', /\bexport\s*(?:type\s*)?(?:\*|\{)/],
      ['a require', /\brequire\s*\(/],
      ['the store', /\bnavigationStore\b/],
      ['a log', /\bconsole\b/],
      ['a close', /\.\s*close\s*\(/],
      ['a timer, so a retry', /\b(?:setTimeout|setInterval|requestAnimationFrame)\b/],
    ] as const).flatMap(([label, pattern]) => (pattern.test(code) ? [label] : []));
  };
  const source = read(STATUS_PATH);
  assert.deepEqual(audit(source), []);
  for (const addition of [
    "import { x } from './x.ts';",
    "const y = await import('./x.ts');",
    "export * from './x.ts';",
    "const y = require('./x.ts');",
    'const y = navigationStore.getState();',
    'console.warn(1);',
    'image.close();',
    'setTimeout(start, 1000);',
  ]) {
    assert.ok(audit(`${source}\n${addition}\n`).length > 0, addition);
  }
  assert.deepEqual(audit(`${source}\n// import x; console.warn; image.close();\n`), [], 'a comment is prose');
});

/** The mount, whole, as its comment-stripped lines: anything else in the file is a departure. */
const MOUNT_LINES: readonly string[] = [
  "import { useFrame } from '@react-three/fiber';",
  "import { useEffect } from 'react';",
  "import { motionPace, reducedMotion } from '../shell/motion-preference.ts';",
  "import { BASE } from '../shell/route.ts';",
  "import { navigationStore } from '../shell/state.ts';",
  "import type { Rail } from './rail-model.ts';",
  "import { createRealismOwner, type RealismArtifact } from './realism-status.ts';",
  "import { sceneSubject } from './stroke-model.ts';",
  `const owner = createRealismOwner(() => ${THE_IMPORT});`,
  'export interface RealismMountProps {',
  '  readonly artifact: RealismArtifact;',
  '  readonly rail: Rail;',
  '}',
  'export function RealismMount({ artifact, rail }: RealismMountProps) {',
  '  useEffect(() => owner.enterCanvas(), []);',
  '  useFrame(({ scene, camera }, delta) => {',
  '    const reduced = reducedMotion();',
  '    owner.frame(artifact, BASE, { scene, camera, delta, reduced, pace: motionPace(reduced), subject: () => sceneSubject(navigationStore.getState(), rail) });',
  '  });',
  '  return null;',
  '}',
];

/** The whole comment-stripped source against the expected text, reporting the first line that differs. */
function auditRealismMount(source: string): string[] {
  const lines = stripComments(source).split('\n').map((line) => line.trimEnd()).filter((line) => line !== '');
  const at = Math.max(lines.length, MOUNT_LINES.length);
  for (let index = 0; index < at; index += 1) {
    if (lines[index] !== MOUNT_LINES[index]) return [`the mount departs at line ${index + 1} of its code: ${JSON.stringify(lines[index] ?? null)}, expected ${JSON.stringify(MOUNT_LINES[index] ?? null)}`];
  }
  return [];
}

test('the mount is one owner at module scope, one effect, one frame callback and null', () => {
  assert.deepEqual(auditRealismMount(read(MOUNT_PATH)), []);
});

test('the mount audit rejects each departure, and a comment is not one', () => {
  const real = read(MOUNT_PATH).replaceAll('\r\n', '\n');
  const READ = '    const reduced = reducedMotion();\n';
  const FRAME = '    owner.frame(artifact, BASE, { scene, camera, delta, reduced, pace: motionPace(reduced), subject: () => sceneSubject(navigationStore.getState(), rail) });\n';
  const USE = `  useFrame(({ scene, camera }, delta) => {\n${READ}${FRAME}  });\n`;
  for (const [name, mutate] of [
    ['an owner per mount', (s: string) => s.replace(USE, `  const owner = createRealismOwner(() => ${THE_IMPORT});\n${USE}`)],
    ['a resource read', (s: string) => s.replace(USE, `  use(${THE_IMPORT});\n${USE}`)],
    ['a guarded frame', (s: string) => s.replace(FRAME, `    if (artifact) ${FRAME.trimStart()}`)],
    ['reduced held at a fixed value', (s: string) => s.replace('const reduced = reducedMotion();', 'const reduced = false;')],
    ['a second read of the preference', (s: string) => s.replace(USE, `  const held = reducedMotion();\n${USE}`)],
    ['a second read, as the pace', (s: string) => s.replace('motionPace(reduced)', 'motionPace(reducedMotion())')],
    ['the pace held at a fixed value', (s: string) => s.replace('pace: motionPace(reduced)', 'pace: 1')],
    ['the subject resolved outside the owner', (s: string) => s.replace('subject: () => sceneSubject(navigationStore.getState(), rail)', 'subject: ((value) => () => value)(sceneSubject(navigationStore.getState(), rail))')],
    ['the subject fixed', (s: string) => s.replace('sceneSubject(navigationStore.getState(), rail)', 'null')],
    ['writing the store', (s: string) => s.replace(READ, `${READ}    navigationStore.setState({ focusedProjectId: null });\n`)],
    ['no rail prop', (s: string) => s.replace('  readonly rail: Rail;\n', '')],
    ['no cleanup: the effect drops what entering returns', (s: string) => s.replace('useEffect(() => owner.enterCanvas(), [])', 'useEffect(() => { owner.enterCanvas(); }, [])')],
    ['no effect', (s: string) => s.replace('  useEffect(() => owner.enterCanvas(), []);\n', '')],
    ['something rendered', (s: string) => s.replace('return null;', 'return <group />;')],
    ['a built import', (s: string) => s.replace(THE_IMPORT, "import('./real' + 'ism/index.ts')")],
    ['a second chunk', (s: string) => s.replace(THE_IMPORT, "import('./realism/other.ts')")],
    ['the owner exported', (s: string) => `${s}\nexport { owner };\n`],
    ['the owner exported where it is bound', (s: string) => s.replace('const owner =', 'export const owner =')],
    ['a second component', (s: string) => `${s}\nexport function Other() {\n  return null;\n}\n`],
    ['a module-scope call', (s: string) => `${s}\nowner.enterCanvas();\n`],
    ['a module-scope call, before the owner is used', (s: string) => s.replace('export interface RealismMountProps {', 'void BASE.length;\nexport interface RealismMountProps {')],
  ] as const) {
    const mutated = mutate(real);
    assert.notEqual(mutated, real, `"${name}" must apply`);
    assert.match(auditRealismMount(mutated).join('\n'), /the mount departs/, name);
  }
  assert.deepEqual(auditRealismMount(`${real}\n// a comment\n/* another */\n`), []);
});

/**
 * The mount's place in `scene.tsx`: once, and the Canvas's direct last child,
 * immediately after the mark and immediately before `</Canvas>`, with only blanked
 * comments between. So nothing can wrap it, gate it or follow it.
 */
function auditRealismInScene(source: string): string[] {
  const code = stripCommentsAndStrings(source);
  const failures: string[] = [];
  const inside = /<Canvas\b[\s\S]*<\/Canvas>/.exec(code)?.[0] ?? '';
  if (!/<RealismMount artifact=\{artifact\} rail=\{rail\} \/>/.test(inside)) failures.push('the mount is not inside the Canvas as <RealismMount artifact={artifact} rail={rail} />');
  if ((code.match(/<RealismMount\b/g) ?? []).length !== 1) failures.push('the mount appears other than once');
  if (/(?:&&|\|\||\?|:|\{|\[|=>|,)\s*(?:\(\s*)*<RealismMount\b/.test(code)) failures.push('the mount is conditional');
  const mark = inside.search(/<FirstFrameMark\b/);
  const mount = inside.search(/<RealismMount\b/);
  if (mark === -1 || mount === -1 || mount < mark) failures.push('the mount is not after <FirstFrameMark />');
  if (!/<FirstFrameMark\s*\/>\s*(?:\{\s*\}\s*)*<RealismMount artifact=\{artifact\} rail=\{rail\} \/>\s*(?:\{\s*\}\s*)*<\/Canvas>/.test(code)) failures.push('the mount is not the direct last child of the Canvas, immediately after <FirstFrameMark />');
  return failures;
}

test('scene.tsx mounts the owner once, inside the Canvas, after the mark, with no conditional', () => {
  assert.deepEqual(auditRealismInScene(read('src/render-scene/scene.tsx')), []);
});

test('the scene mount audit rejects each departure', () => {
  const real = read('src/render-scene/scene.tsx');
  const MOUNT = '<RealismMount artifact={artifact} rail={rail} />';
  const MARK = '<FirstFrameMark />';
  for (const [name, mutate, message] of [
    ['missing', (s: string) => s.replace(MOUNT, ''), /not inside/],
    ['twice', (s: string) => s.replace(MOUNT, `${MOUNT}\n${MOUNT}`), /other than once/],
    ['conditional, &&', (s: string) => s.replace(MOUNT, `{artifact && ${MOUNT}}`), /conditional/],
    ['conditional, a ternary', (s: string) => s.replace(MOUNT, `{artifact ? ${MOUNT} : null}`), /conditional/],
    ['before the mark', (s: string) => s.replace(MOUNT, '').replace(MARK, `${MOUNT}\n${MARK}`), /not after/],
    ['outside the Canvas', (s: string) => s.replace(MOUNT, '').replace('</Canvas>', `</Canvas>\n${MOUNT}`), /not inside/],
    ['no prop', (s: string) => s.replace(MOUNT, '<RealismMount />'), /not inside/],
    ['no rail', (s: string) => s.replace(MOUNT, '<RealismMount artifact={artifact} />'), /not inside/],
    ['wrapped in a group', (s: string) => s.replace(MOUNT, `<group>${MOUNT}</group>`), /direct last child/],
    ['wrapped in a Suspense', (s: string) => s.replace(MOUNT, `<Suspense fallback={null}>${MOUNT}</Suspense>`), /direct last child/],
    ['wrapped in a group, on its own lines', (s: string) => s.replace(MOUNT, `<group>\n          ${MOUNT}\n        </group>`), /direct last child/],
    ['a child after it', (s: string) => s.replace(MOUNT, `${MOUNT}\n        <mesh />`), /direct last child/],
    ['a child between it and the mark', (s: string) => s.replace(MOUNT, `<mesh />\n        ${MOUNT}`), /direct last child/],
    ['an expression after it', (s: string) => s.replace(MOUNT, `${MOUNT}\n        {extra}`), /direct last child/],
  ] as const) {
    const mutated = mutate(real);
    assert.notEqual(mutated, real, `"${name}" must apply`);
    assert.match(auditRealismInScene(mutated).join('\n'), message, name);
  }
});

interface Source {
  readonly path: string;
  readonly text: string;
}

// --- Nothing suspends, nothing throws, and no gate word ------------------------------------------

const SUSPENDERS: readonly (readonly [string, RegExp])[] = [
  ['lazy', /\blazy\b/],
  ['use', /\buse\b/],
  ['useLoader', /\buseLoader\b/],
  ['useTexture', /\buseTexture\b/],
  ['useGLTF', /\buseGLTF\b/],
  ['useFont', /\buseFont\b/],
  ['useKTX2', /\buseKTX2\b/],
  ['useCubeTexture', /\buseCubeTexture\b/],
  ['useEnvironment', /\buseEnvironment\b/],
  ['useVideoTexture', /\buseVideoTexture\b/],
  ['suspend', /\bsuspend\b/],
];
const THROW_FREE: readonly string[] = [STATUS_PATH, MOUNT_PATH];

function auditSuspension(files: readonly Source[]): string[] {
  const failures: string[] = [];
  for (const { path, text } of files) {
    const code = stripCommentsAndStrings(text);
    for (const [name, pattern] of SUSPENDERS) {
      if (pattern.test(code)) failures.push(`suspension: ${path} uses ${name}`);
    }
    if (THROW_FREE.includes(path) && /\bthrow\b/.test(code)) failures.push(`suspension: ${path} throws`);
  }
  return failures;
}

function sceneModules(): Source[] {
  return filesUnder(join(REPO_ROOT, SCENE_DIR)).filter((path) => SOURCE_MODULE.test(path) && !isTestFile(path)).map((path) => ({ path: toRepoPath(path), text: readFileSync(path, 'utf8') }));
}

test('nothing under the scene can suspend, and neither the owner nor the mount throws', () => {
  const modules = sceneModules();
  for (const path of [MOUNT_PATH, STATUS_PATH, 'src/render-scene/scene.tsx', `${REALISM_DIR}decode-maps.ts`]) {
    assert.ok(modules.some((module) => module.path === path), `the walk reads ${path}`);
  }
  assert.deepEqual(auditSuspension(modules), []);
});

test('the suspension scan rejects each form, and useFrame, useState and a comment pass', () => {
  const path = 'src/render-scene/x.tsx';
  for (const [line, message] of [
    ["import { lazy } from 'react';", /lazy/],
    ["const C = lazy(() => import('./c.tsx'));", /lazy/],
    ["const C = React.lazy(() => import('./c.tsx'));", /lazy/],
    ["import { use } from 'react';", /uses use/],
    ['const v = use(promise);', /uses use/],
    ['const v = React.use(promise);', /uses use/],
    ["import { useLoader } from '@react-three/fiber';", /useLoader/],
    ['const v = useLoader(TextureLoader, url);', /useLoader/],
    ['const v = Fiber.useLoader(TextureLoader, url);', /useLoader/],
    ["import { useTexture } from '@react-three/drei';", /useTexture/],
    ['const v = useTexture(url);', /useTexture/],
    ['const v = drei.useTexture(url);', /useTexture/],
    ["import { useGLTF } from '@react-three/drei';", /useGLTF/],
    ['const v = useGLTF(url);', /useGLTF/],
    ["import { useFont } from '@react-three/drei';", /useFont/],
    ['const v = drei.useFont(url);', /useFont/],
    ['const v = useKTX2(url);', /useKTX2/],
    ['const v = useCubeTexture(files, options);', /useCubeTexture/],
    ['const v = useEnvironment({ preset });', /useEnvironment/],
    ['const v = useVideoTexture(url);', /useVideoTexture/],
    ["import { suspend } from 'suspend-react';", /suspend/],
    ['const v = suspend(work, keys);', /suspend/],
  ] as const) {
    assert.match(auditSuspension([{ path, text: line }]).join('\n'), message, line);
  }
  for (const line of [
    "import { useFrame } from '@react-three/fiber';",
    'useFrame(() => undefined);',
    'const [a, b] = useState(0);',
    "import { useState } from 'react';",
    '// lazy, use, useLoader, useTexture, useGLTF and suspend are banned',
    "const word = 'suspend';",
    'const suspended = false;',
    '/* a word: use */',
    "const word = 'use';",
  ]) {
    assert.deepEqual(auditSuspension([{ path, text: line }]), [], line);
  }
  for (const owned of THROW_FREE) {
    assert.match(auditSuspension([{ path: owned, text: "throw new Error('x');" }]).join('\n'), /throws/, owned);
    assert.deepEqual(auditSuspension([{ path: owned, text: "// throw new Error('x');" }]), [], `${owned}: a comment`);
  }
  assert.deepEqual(auditSuspension([{ path: `${REALISM_DIR}decode-maps.ts`, text: "throw new Error('x');" }]), [], 'the chunk may reject');
});

/** No status or identifier names the gate words, three's class alone excepted. */
function auditGateFree(files: readonly Source[]): string[] {
  return files.flatMap(({ path, text }) => (/load(?:ing|er)/i.test(stripComments(text).replace(/\bImageBitmapLoader\b/g, '')) ? [`gate word: ${path}`] : []));
}

test('no status or identifier in the owner, the mount or the chunk contains a gate word, three\'s class excepted', () => {
  const modules = sceneModules().filter(({ path }) => path === STATUS_PATH || path === MOUNT_PATH || path.startsWith(REALISM_DIR));
  assert.ok(modules.length >= 6, 'the walk reads the owner, the mount and the chunk');
  assert.deepEqual(auditGateFree(modules), []);
  const path = 'src/render-scene/realism-status.ts';
  for (const line of ["const status = 'loading';", 'const isLoading = false;', "const s = 'LOADER';", 'const mapLoader = 1;', 'let loaded_or_loading = 1;', 'class MyImageBitmapLoaderish {}']) {
    assert.deepEqual(auditGateFree([{ path, text: line }]), [`gate word: ${path}`], line);
  }
  for (const line of ['const d = new ImageBitmapLoader();', 'decoder.loadAsync(url);', '// the loader, loading', 'const loaded = true;']) {
    assert.deepEqual(auditGateFree([{ path, text: line }]), [], line);
  }
});
