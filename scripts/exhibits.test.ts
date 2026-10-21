/**
 * The exhibits plugin (5.1, AD-17): the two published paths and their sources;
 * the dev handler — an exhibit's path answered with its file's exact bytes as
 * `application/json`, a missing source with a 404, any other request passed
 * on; and the plugin's own dev wiring, the handler registered over the root
 * `configResolved` gave. The build's emission is asserted on the real build in
 * `bundle-assertion.test.ts`.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { EXHIBITS, EXHIBIT_PATHS, exhibitHandler, exhibits, type ExhibitRequest } from './exhibits.ts';

const REPO = fileURLToPath(new URL('..', import.meta.url));

test('the exhibits: /career.json from src/data/career.json, then /layout.generated.json from generated/layout.generated.json', () => {
  assert.deepEqual(EXHIBITS, [
    { path: '/career.json', source: 'src/data/career.json' },
    { path: '/layout.generated.json', source: 'generated/layout.generated.json' },
  ]);
  assert.deepEqual(EXHIBIT_PATHS, ['/career.json', '/layout.generated.json']);
  assert.equal(exhibits().name, 'exhibits');
});

interface Served {
  readonly passed: boolean;
  readonly status: number;
  readonly headers: Readonly<Record<string, string | number>>;
  readonly body: Buffer | undefined;
}

/** One request through the dev handler, recorded. */
function serve(request: ExhibitRequest): Served {
  let passed = false;
  let body: Buffer | undefined;
  const headers: Record<string, string | number> = {};
  const response = {
    statusCode: 0,
    setHeader: (name: string, value: string | number) => void (headers[name.toLowerCase()] = value),
    end: (chunk?: Buffer) => void (body = chunk),
  };
  exhibitHandler(REPO)(request, response, () => void (passed = true));
  return { passed, status: response.statusCode, headers, body };
}

test('in dev, each exhibit’s path is served as its file’s exact bytes, as application/json', () => {
  for (const exhibit of EXHIBITS) {
    const bytes = readFileSync(join(REPO, exhibit.source));
    for (const url of [exhibit.path, `${exhibit.path}?v=1`]) {
      const served = serve({ url, method: 'GET' });
      assert.equal(served.passed, false, `${url} is answered, not passed on`);
      assert.equal(served.status, 200);
      assert.equal(served.headers['content-type'], 'application/json');
      assert.equal(served.headers['content-length'], bytes.length);
      assert.ok(served.body !== undefined && served.body.equals(bytes), `${url} is ${exhibit.source}, byte for byte`);
    }
    const head = serve({ url: exhibit.path, method: 'HEAD' });
    assert.equal(head.status, 200);
    assert.equal(head.body, undefined, 'a HEAD carries no body');
  }
});

test('in dev, any other request is passed on untouched', () => {
  for (const request of [
    { url: '/', method: 'GET' },
    { url: '/colophon', method: 'GET' },
    { url: '/src/data/career.json', method: 'GET' },
    { url: '/generated/layout.generated.json', method: 'GET' },
    { url: '/career.json/', method: 'GET' },
    { url: '/career.json', method: 'POST' },
    { method: 'GET' },
  ]) {
    const served = serve(request);
    assert.equal(served.passed, true, `${JSON.stringify(request)} is passed on`);
    assert.equal(served.status, 0);
    assert.deepEqual(served.headers, {});
    assert.equal(served.body, undefined);
  }
});

test('the byte check is red against a body that is not the file’s bytes', () => {
  const bytes = readFileSync(join(REPO, 'src/data/career.json'));
  const reserialised = Buffer.from(`${JSON.stringify(JSON.parse(bytes.toString('utf8')))}`);
  assert.ok(!reserialised.equals(bytes), 'a parsed and re-serialised file is not the file');
  const crlf = Buffer.from(bytes.toString('utf8').replace(/\n/g, '\r\n'));
  assert.ok(!crlf.equals(bytes), 'nor is one with its line endings changed');
});

/**
 * The plugin's own dev wiring: `configResolved` hands it the config's root, and
 * `configureServer` registers the handler over that root — driven through the
 * hooks the shipped plugin returns, with a stub server recording the middleware.
 */
function devMiddleware(plugin: Partial<ReturnType<typeof exhibits>>, root: string) {
  const used: unknown[] = [];
  const call = (hook: unknown, arg: unknown): void => {
    const fn = typeof hook === 'function' ? hook : (hook as { handler?: unknown } | undefined)?.handler;
    if (typeof fn === 'function') (fn as (arg: unknown) => void).call({}, arg);
  };
  call(plugin.configResolved, { root, command: 'serve' });
  call(plugin.configureServer, { middlewares: { use: (handler: unknown) => used.push(handler) } });
  return used;
}

test('in dev, the plugin registers the handler over the resolved root: /career.json is served from it', () => {
  const used = devMiddleware(exhibits(), REPO);
  assert.equal(used.length, 1, 'one middleware');
  const bytes = readFileSync(join(REPO, 'src/data/career.json'));
  let body: Buffer | undefined;
  let passed = false;
  const response = { statusCode: 0, setHeader: () => undefined, end: (chunk?: Buffer) => void (body = chunk) };
  (used[0] as ReturnType<typeof exhibitHandler>)({ url: '/career.json', method: 'GET' }, response, () => void (passed = true));
  assert.equal(passed, false);
  assert.equal(response.statusCode, 200);
  assert.ok(body !== undefined && body.equals(bytes), 'the bytes are read from the root configResolved gave');
});

test('the wiring check is red when the root is not the resolved one, or no middleware is registered', () => {
  const used = devMiddleware(exhibits(), join(REPO, 'nowhere'));
  let body: Buffer | undefined;
  const response = { statusCode: 0, setHeader: () => undefined, end: (chunk?: Buffer) => void (body = chunk) };
  (used[0] as ReturnType<typeof exhibitHandler>)({ url: '/career.json', method: 'GET' }, response, () => undefined);
  assert.equal(response.statusCode, 404, 'a root without the file answers 404, not the bytes');
  assert.equal(body, undefined);
  const { configureServer: _dropped, ...silent } = exhibits();
  assert.deepEqual(devMiddleware(silent, REPO), [], 'a plugin without the hook registers nothing');
});
