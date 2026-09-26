/**
 * Every AC-bearing rule of the DOM destination index, over the artifact shapes
 * that can tell one ordering from another.
 *
 * The committed data holds one Client with one Project, so every ordering the
 * artifact carries is degenerate over it: Rail order, its reverse, `clients[]`
 * order and ID order all emit the same one-element walk. Only a multi-Client
 * fixture whose Rail order opposes both the emitted `clients` order and ID order
 * can pin which of them the index actually walks — the same reason
 * `artifact.test.ts` and `rail.test.ts` each fix an opposing set.
 *
 * The fixtures are built in memory rather than read off `generated/`, so a
 * change to the committed data cannot make an assertion here vacuous, and so
 * this suite tests the model rather than the artifact.
 *
 * No DOM, no React, no Three is imported here — the model is pure, and that is
 * exactly what lets it be tested at all: `node --test` under Node 24's built-in
 * type stripping cannot load a `.tsx` file in any position.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  DEPTH_LABELS,
  buildDestinationIndex,
  type IndexArtifact,
  type IndexArtifactClient,
} from './index-model.ts';

const MODEL_TS = fileURLToPath(new URL('./index-model.ts', import.meta.url));
const NAV_TSX = fileURLToPath(new URL('./index-nav.tsx', import.meta.url));

// --- Fixtures ---------------------------------------------------------------

function project(id: string, title: string, isDeep = false) {
  return { id, isDeep, content: { project: title } };
}

function client(id: string, name: string, ...projects: ReturnType<typeof project>[]): IndexArtifactClient {
  return { id, name, projects };
}

/**
 * An artifact whose Rail order opposes both its `clients[]` order and ID order.
 *
 * The shape `artifact.test.ts`'s opposing fixture emits, extended to a third
 * stop. Zulu ran 2010-01 → 2025-01, Alpha ran 2012-01 → 2013-01, and Mid ran
 * 2015-01 → 2020-01. So Zulu **began** first and the Rail reaches it first,
 * while Alpha **ended** first and the `clients` array — `timeAxis` order,
 * oldest-first — puts Alpha first.
 *
 * **Three stops, not two, and that is load-bearing.** Over two elements there
 * are only two possible orderings, so the reverse of any list is necessarily the
 * other one: a two-Client fixture cannot separate "the Rail read backwards" from
 * "the emitted array read forwards", and an index walking the tree would pass.
 * Three makes the four candidate orderings — `rail`, its reverse, `clients`, and
 * `clients` reversed — genuinely distinct, which is what the guard below asserts
 * before anything else runs.
 *
 * Present → past is therefore Mid → Alpha → Zulu.
 *
 * Stated as literals rather than derived, because the model must read these
 * fields and never compute them; deriving the fixture would put the rule under
 * test into the test.
 */
function opposedArtifact(): IndexArtifact {
  return {
    rail: ['client:zulu', 'client:alpha', 'client:mid'],
    clients: [
      client('client:alpha', 'Alpha', project('project:alpha/a', 'A work')),
      client('client:mid', 'Mid', project('project:mid/m', 'M work')),
      client('client:zulu', 'Zulu', project('project:zulu/z', 'Z work', true)),
    ],
  };
}

const idsOf = (artifact: IndexArtifact): string[] =>
  buildDestinationIndex(artifact).clients.map((entry) => entry.id);

// --- The fixture guard ------------------------------------------------------

test('the opposing fixture separates Rail order from the orders beside it, or every assertion is vacuous', () => {
  // Asserted first and separately. If a future edit made `rail` agree with the
  // `clients` array or with ID order, every ordering assertion below would still
  // pass while pinning nothing about which one the index walks.
  const artifact = opposedArtifact();
  const emitted = artifact.clients.map((entry) => entry.id);
  const walk = [...artifact.rail].reverse();

  assert.equal(artifact.rail.length, 3, 'the fixture must carry three stops — two cannot separate the four');
  assert.notDeepEqual([...artifact.rail], [...emitted].sort(), 'Rail order must differ from ID order');
  assert.notDeepEqual([...artifact.rail], emitted, 'and from the emitted clients order');
  // Both directions, because an index that walked the tree would land on one of
  // these two answers — and if either coincided with the expected walk, the
  // ordering assertions below would pass on the wrong reason.
  assert.notDeepEqual(walk, emitted, 'the expected walk is not the emitted order');
  assert.notDeepEqual(walk, [...emitted].reverse(), 'nor the emitted order reversed');
});

// --- Matrix row: index order ------------------------------------------------

test('the index walks the Rail present to past — the reverse of the emitted rail list', () => {
  // The story's second acceptance criterion. The artifact emits `rail`
  // oldest-first because that is the direction the camera travels; a reader
  // arriving at a portfolio wants the current work first, so the index reads the
  // same ordering the other way.
  assert.deepEqual(
    idsOf(opposedArtifact()),
    ['client:mid', 'client:alpha', 'client:zulu'],
    'the most recently begun engagement is reached first',
  );
});

test('the order is the Rail’s and demonstrably not the clients[] array’s', () => {
  // The AC states this as a contrast, so it is asserted as one. An index that
  // simply walked `clients` backwards would land on the same answer whenever the
  // two orderings coincide — which they do on the committed data — and on a
  // different one here.
  const artifact = opposedArtifact();
  const emitted = artifact.clients.map((entry) => entry.id);
  assert.notDeepEqual(idsOf(artifact), [...emitted].reverse(), 'not the emitted array reversed');
  assert.notDeepEqual(idsOf(artifact), emitted, 'and not the emitted array as it stands');
});

test('the index order follows rail, not the position of a Client in the tree', () => {
  // Pins the walk on the field it claims to read. Re-ordering the `clients` array
  // without touching `rail` must change nothing — the tree is a lookup table
  // here, never a sequence.
  const artifact = opposedArtifact();
  const shuffled: IndexArtifact = { ...artifact, clients: [...artifact.clients].reverse() };
  assert.deepEqual(idsOf(shuffled), idsOf(artifact), 'the tree’s own order must not reach the walk');
});

test('re-ordering rail re-orders the index, so the field is genuinely read', () => {
  // The inverse of the test above, and the one that keeps it honest: an index
  // ignoring `rail` entirely would pass "the tree order does not matter" by
  // walking something else.
  const artifact = opposedArtifact();
  const flipped: IndexArtifact = { ...artifact, rail: [...artifact.rail].reverse() };
  assert.deepEqual(idsOf(flipped), [...idsOf(artifact)].reverse(), 'the Rail decides the walk');
});

// --- Matrix row: nesting ----------------------------------------------------

test('each Client’s Projects are nested directly beneath it, never flattened', () => {
  // The structure is the information: a Project belongs to a Client, and a flat
  // list would make a reader infer the grouping from adjacency. It also matches
  // the scene — a Project orbits its own Star.
  const artifact: IndexArtifact = {
    rail: ['client:zulu', 'client:alpha'],
    clients: [
      client(
        'client:zulu',
        'Zulu',
        project('project:zulu/one', 'One'),
        project('project:zulu/two', 'Two', true),
      ),
      client('client:alpha', 'Alpha', project('project:alpha/a', 'A work')),
    ],
  };

  const index = buildDestinationIndex(artifact);
  const [first, second] = index.clients;
  assert.ok(first !== undefined && second !== undefined);

  assert.equal(first.id, 'client:alpha', 'present first');
  assert.deepEqual(first.projects.map((p) => p.id), ['project:alpha/a']);
  assert.equal(second.id, 'client:zulu');
  assert.deepEqual(
    second.projects.map((p) => p.id),
    ['project:zulu/one', 'project:zulu/two'],
    'a Client’s own Projects, and only its own',
  );
});

test('a Client’s Projects keep the order the artifact carries them in', () => {
  // The derive layer owns every ordering rule (AD-3): `artifact.ts` emits each
  // Client's Projects in ID order, and the model reads that order rather than
  // sorting again. A sort here would be a second ordering rule in the one
  // directory that is forbidden to hold any.
  const artifact: IndexArtifact = {
    rail: ['client:solo'],
    clients: [
      client(
        'client:solo',
        'Solo',
        project('project:solo/zzz', 'Last authored'),
        project('project:solo/aaa', 'First authored'),
      ),
    ],
  };
  assert.deepEqual(
    buildDestinationIndex(artifact).clients[0]?.projects.map((p) => p.id),
    ['project:solo/zzz', 'project:solo/aaa'],
    'the model must not re-sort what the artifact already ordered',
  );
});

// --- Matrix row: Deep and Shallow -------------------------------------------

test('a Deep and a Shallow Project carry distinct text naming the state', () => {
  // The AC: a screen-reader user must be able to answer "which of these is worth
  // reading?" from the index alone. That is answered by words inside the entry,
  // never by an ARIA attribute and never by a visual marker.
  const artifact: IndexArtifact = {
    rail: ['client:solo'],
    clients: [
      client(
        'client:solo',
        'Solo',
        project('project:solo/deep', 'Has prose', true),
        project('project:solo/shallow', 'Has none', false),
      ),
    ],
  };
  const projects = buildDestinationIndex(artifact).clients[0]?.projects ?? [];
  const [deep, shallow] = projects;
  assert.ok(deep !== undefined && shallow !== undefined);

  assert.equal(deep.depth, DEPTH_LABELS.deep);
  assert.equal(shallow.depth, DEPTH_LABELS.shallow);
  assert.notEqual(deep.depth, shallow.depth, 'the two states must be distinguishable');
  for (const entry of [deep, shallow]) {
    assert.equal(typeof entry.depth, 'string', 'the state is text');
    assert.notEqual(entry.depth.trim(), '', 'and non-blank, or it names nothing');
  }
});

test('the depth labels are the vocabulary the project uses, with no synonyms', () => {
  // Deep and Shallow are load-bearing terms. Pinned as literals so they cannot
  // drift into "detailed"/"brief" or "expanded"/"collapsed", which would leave a
  // reader unable to map the index onto anything else the product says.
  assert.deepEqual(DEPTH_LABELS, { deep: 'Deep', shallow: 'Shallow' });
});

test('depth is read off isDeep and never re-classified from the authored prose', () => {
  // `entities.ts` is the single derivation point for Deep/Shallow. A second
  // classifier in the shell is exactly the divergence AD-3 exists to prevent —
  // and it would be invisible until the two disagreed. So the model is handed an
  // `isDeep` that contradicts what a re-classifier would conclude, and must
  // follow the field.
  const artifact: IndexArtifact = {
    rail: ['client:solo'],
    clients: [
      {
        id: 'client:solo',
        name: 'Solo',
        projects: [{ id: 'project:solo/a', isDeep: true, content: { project: 'No prose anywhere' } }],
      },
    ],
  };
  assert.equal(
    buildDestinationIndex(artifact).clients[0]?.projects[0]?.depth,
    DEPTH_LABELS.deep,
    'the artifact’s classification wins, because it is the only one',
  );
});

// --- Accessible names -------------------------------------------------------

test('a Client entry is named by its Client name and a Project entry by its title', () => {
  // The AC on the accessible name. The name is the authored label, not the ID —
  // an ID is a handle for code, and "project:zulu/z" is not what anyone calls the
  // work.
  const index = buildDestinationIndex(opposedArtifact());
  const zulu = index.clients.find((entry) => entry.id === 'client:zulu');
  assert.ok(zulu !== undefined);
  assert.equal(zulu.name, 'Zulu');
  assert.equal(zulu.projects[0]?.title, 'Z work');
});

test('every entry carries the ID the artifact minted, unchanged', () => {
  // The one handle a consumer holds. Story 2.2 wires selection to it, and a
  // re-slugified or prefixed ID here would be a second identity derivation.
  const artifact = opposedArtifact();
  const index = buildDestinationIndex(artifact);
  const emitted = new Set([
    ...artifact.clients.map((entry) => entry.id),
    ...artifact.clients.flatMap((entry) => entry.projects.map((p) => p.id)),
  ]);
  const walked = [
    ...index.clients.map((entry) => entry.id),
    ...index.clients.flatMap((entry) => entry.projects.map((p) => p.id)),
  ];
  assert.deepEqual([...walked].sort(), [...emitted].sort(), 'the index addresses exactly what the artifact carries');
  assert.equal(new Set(walked).size, walked.length, 'and names nothing twice');
});

// --- Matrix row: single Client ----------------------------------------------

test('a one-Client, one-Project artifact yields one entry with one nested entry', () => {
  // `career.json`'s shape today. The ordering is degenerate but the structure is
  // not, and a model keyed on there being more than one of anything would only
  // fail once a second entry landed.
  const index = buildDestinationIndex({
    rail: ['client:sncf'],
    clients: [client('client:sncf', 'SNCF', project('project:sncf/mdm', 'MDM replacement', true))],
  });
  assert.equal(index.clients.length, 1);
  const only = index.clients[0];
  assert.ok(only !== undefined);
  assert.equal(only.name, 'SNCF');
  assert.equal(only.projects.length, 1);
  assert.equal(only.projects[0]?.depth, DEPTH_LABELS.deep);
});

// --- Matrix row: cardinality drift the gate would already have caught --------

test('a rail naming a Client the tree does not carry yields no entry for it', () => {
  // The gate rejects this document naming the offending ID, so reaching here
  // means it was hand-edited past the build. An entry whose button resolves to
  // nothing is worse than one absent, so the model skips it rather than
  // rendering a stop the reader cannot reach.
  const artifact = opposedArtifact();
  const index = buildDestinationIndex({ ...artifact, rail: [...artifact.rail, 'client:nobody'] });
  assert.deepEqual(
    index.clients.map((entry) => entry.id),
    ['client:mid', 'client:alpha', 'client:zulu'],
    'the unresolvable stop is skipped, and the rest of the walk is undisturbed',
  );
});

test('a Client the rail omits is absent from the index, not appended', () => {
  // The mirror case, and the reason it is not "fixed" by falling back to the
  // tree: an index that silently appended un-railed Clients would make the gate's
  // cardinality check unobservable at the surface it protects.
  const artifact = opposedArtifact();
  const index = buildDestinationIndex({ ...artifact, rail: ['client:alpha'] });
  assert.deepEqual(index.clients.map((entry) => entry.id), ['client:alpha']);
});

test('a Client the rail names twice is walked once, not entered twice', () => {
  // The third drift mode the I/O matrix names alongside the unknown ID and the
  // omitted Client, and the one the walk did not handle: `byId.get` resolves a
  // repeated ID both times, so the Client was pushed once per mention. The two
  // entries then carry the same `id`, which is what `index-nav.tsx` keys its
  // `<li>` on — so a duplicate reached React as two siblings sharing one key, and
  // reached a reader as the same destination announced twice.
  //
  // Gated at build like its siblings; guarded here for the same reason they are.
  const artifact = opposedArtifact();
  const index = buildDestinationIndex({
    ...artifact,
    rail: [artifact.rail[0]!, ...artifact.rail],
  });
  assert.deepEqual(
    index.clients.map((entry) => entry.id),
    ['client:mid', 'client:alpha', 'client:zulu'],
    'the repeated stop is walked at one position only',
  );
});

test('an empty artifact yields an empty index rather than throwing', () => {
  // Not a shape the pipeline emits, but the model is what a renderer calls on
  // every render: throwing here would take the whole shell down for a document
  // problem the gate already reports.
  assert.deepEqual(buildDestinationIndex({ rail: [], clients: [] }), { clients: [] });
});

// --- Invariance: no render state reaches the index --------------------------

test('the index is identical across repeated builds and never mutates the artifact', () => {
  // The AC on invariance under re-render: the model is called on every render,
  // so two calls must agree and neither may disturb what it was handed. A model
  // that sorted the artifact's own arrays in place would re-order the document
  // for every later reader, including the scene.
  const artifact = opposedArtifact();
  const before = JSON.stringify(artifact);
  const first = buildDestinationIndex(artifact);
  const second = buildDestinationIndex(artifact);

  assert.deepEqual(second, first, 'two builds of one artifact must agree exactly');
  assert.equal(JSON.stringify(artifact), before, 'and the artifact must come back unchanged');
  assert.notEqual(second, first, 'each call returns a fresh structure, never a shared cache');
});

test('the model reads no camera, viewport, canvas, clock, or DOM', () => {
  // The AC states that no code path derives an entry from camera or viewport
  // state. Behavioural tests cannot show the absence of a branch they do not
  // reach, so it is read off the source — the same idiom the derive layer's
  // purity tests use.
  const code = readFileSync(MODEL_TS, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  assert.doesNotMatch(code, /\bwindow\b|\bdocument\b|\bnavigator\b/, 'no DOM global');
  assert.doesNotMatch(code, /innerWidth|innerHeight|getBoundingClientRect|matchMedia/, 'no viewport read');
  assert.doesNotMatch(code, /\bcamera\b|raycast|\bcanvas\b|WebGL/i, 'no camera or canvas state');
  assert.doesNotMatch(code, /new\s+Date\b|Date\s*\.\s*now|Math\s*\.\s*random/, 'no clock, no randomness');
  assert.doesNotMatch(code, /node:fs|readFileSync|process\s*\./, 'no I/O, no environment');
  assert.doesNotMatch(code, /from ['"](three|react|@react-three)/, 'no React, no Three');
});

test('the model derives no ordering of its own', () => {
  // AD-3, read off the source: the renderer reads and never derives. A `.sort(`
  // here would be an ordering rule living in the one directory forbidden to hold
  // any — and it would keep passing every assertion above for as long as it
  // happened to agree with the artifact's.
  const code = readFileSync(MODEL_TS, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  assert.doesNotMatch(code, /\.sort\s*\(/, 'the shell must not sort — the derive layer owns every ordering');
  assert.doesNotMatch(code, /\bduration\b|\btimeAxis\b|\bnotable\b/, 'nor re-derive from an authored field');
  assert.doesNotMatch(code, /\bposition\b|\bmass\b|railDistance/, 'nor read a coordinate or a solved value');
});

// --- The renderer stays thin ------------------------------------------------

test('the renderer holds no logic the model could own', () => {
  // The residual risk the model/renderer split accepts: `index-nav.tsx` cannot be
  // loaded by this runner at all, so the JSX mapping is unasserted and is kept
  // trivial enough that reading it suffices. This is the ratchet on "trivial" —
  // it fails the moment the renderer grows a rule of its own rather than when
  // someone notices.
  const source = readFileSync(NAV_TSX, 'utf8');
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  assert.doesNotMatch(code, /\.sort\s*\(|\.filter\s*\(|\.reverse\s*\(/, 'no ordering or selection in the renderer');
  assert.doesNotMatch(code, /\buseState\b|\buseEffect\b|\buseRef\b/, 'no state — Story 2.2 owns navigation state');
  assert.doesNotMatch(code, /\bisDeep\b|\bduration\b|\bnotable\b|\btimeAxis\b/, 'no re-derivation of a Body property');
  assert.doesNotMatch(code, /\bwindow\b|\bdocument\b|\bcamera\b|innerWidth/, 'no render, camera, or viewport state');
  assert.doesNotMatch(code, /aria-(?!label\b)/, 'no ARIA attribute standing in for the Deep/Shallow text');

  // The ban above exempts `aria-label`, because the `<nav>` legitimately carries
  // one — and that exemption is a hole exactly the width of the regression the ban
  // exists to stop. Moving depth onto a button as `aria-label={project.depth}`
  // satisfies every check above, and `aria-label` *replaces* the accessible name,
  // so the Project title is lost along with the text. No ARIA attribute may carry
  // a model field, labels included.
  assert.doesNotMatch(
    code,
    /aria-[a-z]+=\{\s*(?:project|client)\./,
    'no ARIA attribute may carry a model field — the text is the accessible name',
  );
});

test('the title and the depth word reach the reader as text, not as attribute values', () => {
  // The AC this file cannot reach by mounting: "its accessible name is the Client
  // name or Project title and its Deep/Shallow state is available as text". Every
  // other renderer scan here is negative — each forbids a bad form — and a negative
  // scan cannot observe the good form going missing. So this one is positive: each
  // model field must appear between a `>` and a `<`, which is the only position
  // where JSX emits a text node.
  const code = readFileSync(NAV_TSX, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  for (const field of ['client.name', 'project.title', 'project.depth']) {
    assert.match(
      code,
      new RegExp(`>[^<>]*\\{\\s*${field.replace('.', '\\.')}\\s*\\}`),
      `${field} must be rendered as text a screen reader announces, never as an attribute`,
    );
  }
});

test('the renderer emits a nav, a nested list, and a button per entry', () => {
  // The AC's DOM shape, asserted against the source because the runner cannot
  // load the module. Crude, and deliberately so — it pins the four element
  // choices the accessibility of the whole index rests on, and nothing more.
  const source = readFileSync(NAV_TSX, 'utf8');
  assert.match(source, /<nav\b/, 'a nav landmark');
  assert.match(source, /<ul\b/, 'a list');
  assert.match(source, /<li\b/, 'with items');
  assert.match(source, /<button\b/, 'and a button per entry, focusable by default');
  assert.doesNotMatch(source, /<div\s+role=["']button/, 'never a div wearing a role');
  assert.doesNotMatch(source, /tabIndex=\{-1\}/, 'and nothing removed from the tab order');
});

test('each Client’s Projects are nested inside its own list item, not beside it', () => {
  // Tag presence — what the test above checks — cannot see nesting: hoisting the
  // Projects' `<ul>` out of the Client `<li>` to a sibling leaves every tag in the
  // file and passes all six of those assertions. But the nesting *is* the
  // information (a Project belongs to a Client), and a flat list would make a
  // reader infer the grouping from adjacency. The model pins it on the object; this
  // pins the one hop the model cannot see, from that object into markup.
  //
  // Tag order in the source is the check: within the Client's `<li>`, the Client
  // `<button>` must be followed by the nested `<ul>` before that `<li>` closes.
  const code = readFileSync(NAV_TSX, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  const tags = code.match(/<\/?(?:nav|ul|li|button)\b/g) ?? [];
  assert.deepEqual(
    tags,
    [
      '<nav',
      '<ul',
      '<li',
      '<button',
      '</button',
      '<ul',
      '<li',
      '<button',
      '</button',
      '</li',
      '</ul',
      '</li',
      '</ul',
      '</nav',
    ],
    'the Projects’ list must open inside the Client’s own list item, after its button',
  );
});

test('the renderer imports the model rather than the artifact', () => {
  // The split's whole point: the rules live where they can be tested. A renderer
  // reading the artifact directly would put the ordering back in the `.tsx`,
  // where this runner cannot reach it.
  const source = readFileSync(NAV_TSX, 'utf8');
  assert.match(source, /from '\.\/index-model\.ts'/, 'the renderer builds on the model');
  assert.doesNotMatch(source, /layout\.generated\.json/, 'and never reads the artifact itself');
});
