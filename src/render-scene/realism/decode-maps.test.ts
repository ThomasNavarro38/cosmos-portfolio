/**
 * The real `decodeMaps` (7.5), three's real class, over a faked `fetch` and
 * `createImageBitmap`: the two ports the browser supplies.
 */

import { strict as assert } from 'node:assert';
import { afterEach, test } from 'node:test';
import type { RealismArtifact } from '../realism-status.ts';
import { decodeMaps } from './decode-maps.ts';

const BASE = '/cosmos-portfolio/';

function artifactWearing(...maps: readonly string[]): RealismArtifact {
  const position = { x: 0, y: 0, z: 0 };
  return {
    railLine: [],
    clients: [{
      id: 'client:a',
      position,
      luminanceBand: 'stroke-rest',
      appearance: { tint: 'white', pulsePhase: 0 },
      projects: maps.map((map, at) => ({ id: `project:a/${at}`, clientId: 'client:a', position, luminanceBand: 'stroke-rest', orbitNormal: { x: 0, y: 0, z: 1 }, appearance: { map, meanLuminance: 0.3, tilt: 0, spinRate: 0.05, spinPhase: 0 } })),
    }],
  };
}

interface FakeBitmap {
  readonly url: string;
  closed: boolean;
  close(): void;
}

interface Ports {
  readonly fetched: string[];
  readonly options: ImageBitmapOptions[];
  readonly bitmaps: FakeBitmap[];
}

const SAVED = { fetch: globalThis.fetch, createImageBitmap: (globalThis as { createImageBitmap?: unknown }).createImageBitmap };

afterEach(() => {
  globalThis.fetch = SAVED.fetch;
  (globalThis as { createImageBitmap?: unknown }).createImageBitmap = SAVED.createImageBitmap;
});

/** Installs the two ports. A map named in `failing` serves a body that will not decode. */
function installPorts({ failing = [], status = 200 }: { readonly failing?: readonly string[]; readonly status?: number } = {}): Ports {
  const ports: Ports = { fetched: [], options: [], bitmaps: [] };
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    ports.fetched.push(url);
    const bad = failing.some((id) => url.endsWith(`/${id}.webp`));
    return new Response(new Blob([bad ? '<!doctype html>' : url]), { status: bad ? 404 : status });
  }) as typeof fetch;
  (globalThis as { createImageBitmap?: unknown }).createImageBitmap = async (blob: Blob, options: ImageBitmapOptions) => {
    const text = await blob.text();
    ports.options.push(options);
    if (text.startsWith('<!doctype')) throw new Error('the source image could not be decoded');
    const bitmap: FakeBitmap = { url: text, closed: false, close() { this.closed = true; } };
    ports.bitmaps.push(bitmap);
    return bitmap;
  };
  return ports;
}

test('each distinct URL is fetched once, sorted, and resolves from map id to image', async () => {
  const ports = installPorts();
  const images = await decodeMaps(artifactWearing('moon', 'mars', 'moon', 'io', 'mars', 'moon', 'io', 'io'), BASE);
  assert.deepEqual(ports.fetched, ['/cosmos-portfolio/textures/io.webp', '/cosmos-portfolio/textures/mars.webp', '/cosmos-portfolio/textures/moon.webp']);
  assert.deepEqual([...images.keys()], ['io', 'mars', 'moon']);
  for (const [id, image] of images) assert.equal((image as unknown as FakeBitmap).url, `/cosmos-portfolio/textures/${id}.webp`, 'each id holds its own image');
});

test('createImageBitmap receives flipY, premultiplyAlpha none, and three\'s forced colour conversion', async () => {
  const ports = installPorts();
  await decodeMaps(artifactWearing('moon', 'io'), BASE);
  assert.equal(ports.options.length, 2);
  for (const options of ports.options) {
    assert.equal(options.imageOrientation, 'flipY');
    assert.equal(options.premultiplyAlpha, 'none');
    assert.equal(options.colorSpaceConversion, 'none');
  }
});

test('no image is closed', async () => {
  const ports = installPorts();
  await decodeMaps(artifactWearing('moon', 'io'), BASE);
  assert.equal(ports.bitmaps.length, 2);
  assert.ok(ports.bitmaps.every((bitmap) => !bitmap.closed));
});

test('a rejecting decode rejects the whole, and closes nothing that had decoded', async () => {
  const ports = installPorts({ failing: ['mars'] });
  await assert.rejects(decodeMaps(artifactWearing('moon', 'mars', 'io'), BASE));
  for (let turn = 0; turn < 200 && ports.bitmaps.length < 2; turn += 1) await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(ports.bitmaps.map((bitmap) => bitmap.url).sort(), ['/cosmos-portfolio/textures/io.webp', '/cosmos-portfolio/textures/moon.webp'], 'the other two did decode');
  assert.ok(ports.bitmaps.every((bitmap) => !bitmap.closed));
});

test('accepted: an image body served under a 404 status decodes and is used, as the class does not read the status', async () => {
  installPorts({ status: 404 });
  const images = await decodeMaps(artifactWearing('moon'), BASE);
  assert.deepEqual([...images.keys()], ['moon']);
  assert.equal((images.get('moon') as unknown as FakeBitmap).url, '/cosmos-portfolio/textures/moon.webp');
});

test("with no createImageBitmap: rejects, requests nothing and logs nothing, three's constructor warning included", async () => {
  const ports = installPorts();
  delete (globalThis as { createImageBitmap?: unknown }).createImageBitmap;
  const lines: unknown[] = [];
  const saved = { error: console.error, warn: console.warn, log: console.log };
  for (const key of ['error', 'warn', 'log'] as const) console[key] = (...args: unknown[]) => void lines.push(args);
  try {
    await assert.rejects(decodeMaps(artifactWearing('moon'), BASE), /cannot decode a map/);
  } finally {
    Object.assign(console, saved);
  }
  assert.deepEqual(lines, []);
  assert.deepEqual(ports.fetched, []);
});

test('a rejecting fetch rejects the whole', async () => {
  installPorts();
  globalThis.fetch = (() => Promise.reject(new TypeError('offline'))) as typeof fetch;
  await assert.rejects(decodeMaps(artifactWearing('moon'), BASE));
});

test('no map named rejects, and asks for nothing', async () => {
  const ports = installPorts();
  await assert.rejects(decodeMaps({ railLine: [], clients: [] }, BASE), /names no map/);
  await assert.rejects(decodeMaps(artifactWearing(), BASE), /names no map/);
  assert.deepEqual(ports.fetched, []);
});

test('a second call requests again: three\'s Cache is off, so memoising is the owner\'s alone', async () => {
  const ports = installPorts();
  await decodeMaps(artifactWearing('moon'), BASE);
  await decodeMaps(artifactWearing('moon'), BASE);
  assert.equal(ports.fetched.length, 2);
});
