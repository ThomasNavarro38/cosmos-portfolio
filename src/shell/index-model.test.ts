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
  // *Local* state, specifically. Subscribing to the navigation store is this
  // renderer's job — `useStore` is deliberately absent from this list. What is
  // banned is the renderer keeping a copy of anything, because a second home for
  // "where the visitor is" is how the canvas and the index start disagreeing.
  assert.doesNotMatch(code, /\buseState\b|\buseEffect\b|\buseReducer\b|\buseMemo\b/, 'no local state in the renderer');
  // The one ref (2.9) is to the `overview` element, so the return button can hand
  // DOM focus to it as it unmounts; it holds no copy of anything, and
  // `auditDoors` pins its shape. Any other ref, or a write to one, is a finding.
  assert.equal((code.match(/\buseRef\s*[<(]/g) ?? []).length, 1, 'exactly one ref');
  assert.doesNotMatch(code, /\.current\s*=(?!=)/, 'no ref is written — a ref here is an element, not state');
  assert.doesNotMatch(code, /\bisDeep\b|\bduration\b|\bnotable\b|\btimeAxis\b/, 'no re-derivation of a Body property');
  assert.doesNotMatch(code, /\bwindow\b|\bdocument\b|\bcamera\b|innerWidth/, 'no render, camera, or viewport state');

  // `aria-labelledby` and `aria-describedby` redirect the accessible name at
  // another element, so neither may appear here in any form. `aria-label` is
  // handled separately below, because this file has exactly one legitimate use of
  // it and a blanket ban would reject that too.
  assert.doesNotMatch(
    code,
    /aria-(?:labelledby|describedby)=/,
    'no ARIA attribute may point the accessible name at another element',
  );

  // The regression this ban was written for: depth moved onto a button as
  // `aria-label={project.depth}` satisfied every other check here, and
  // `aria-label` *replaces* the accessible name — so the Project title was lost
  // along with the Deep/Shallow text.
  //
  // The ban is the name-replacing family rather than all ARIA, because
  // `aria-pressed` is a different kind of attribute: it adds state and touches the
  // accessible name not at all. But narrowing it to `=\{` was too far in the other
  // direction: `aria-label="Deep"` is a literal, matches no `=\{` pattern, and
  // destroys the accessible name exactly as the interpolated form did. **So the
  // ban is on the attribute, not on its value syntax** — counted rather than
  // pattern-matched, which is the only form that cannot be walked around by a
  // value shape nobody thought of.
  //
  // The `<nav>`'s landmark label is the single exemption: a landmark has no text
  // of its own to lose, so naming it is the correct use of the attribute. Exactly
  // one `aria-label=` may appear in this file, and it must be that one.
  //
  // Delegated to `auditAria` rather than restated here. The previous inline copy
  // and the fixture-driven checker below disagreed on four of six probe inputs
  // while a comment asserted they could not diverge — two copies of a rule are
  // two rules. This is the one call site for the real file; the test below drives
  // the same function over reconstructed bad forms.
  assert.deepEqual(auditAria(code), [], 'the renderer must carry no name-affecting ARIA beyond the landmark label');
});

/**
 * The narrowed ARIA ban, run against reconstructed forms rather than against the
 * file.
 *
 * A negative scan over a file that no longer contains the bad form cannot show
 * the pattern still catches it — the pattern can rot into vacuity and the scan
 * keeps passing. So the forms are rebuilt here and the real checker is run over
 * them.
 *
 * It is the *same* checker the scan above uses — literally, by call, not by
 * restatement. An earlier version claimed that while the scan kept its own inline
 * copy of the rule, and the two drifted apart: the copy here passed a file with
 * *zero* `aria-label=` and passed a *renamed* landmark, both of which the inline
 * assertions caught, while rejecting a `<nav>` whose attributes were wrapped
 * across lines, which the inline form accepted. A fixture-driven test over a
 * second copy of the logic proves things about the copy.
 */
function auditAria(code: string): string[] {
  const failures: string[] = [];
  if (/aria-(?:labelledby|describedby)=/.test(code)) failures.push('redirects the accessible name');

  // The name-*affecting* family, not only the name-replacing one. `aria-hidden`
  // on the depth `<span>` removes Deep/Shallow from the accessible name while
  // leaving `{project.depth}` in text position, so the positive text-node scan
  // still passes and nothing else here objects — that mutation was proven green
  // against the whole suite. `aria-roledescription` overrides the announced role
  // and can carry a model field the same way. The blanket `aria-(?!label\b)` ban
  // these replaced caught both; narrowing to the label family gave that away.
  if (/aria-(?:hidden|roledescription|valuetext|details|owns)=/.test(code)) {
    failures.push('suppresses or overrides part of the accessible name');
  }

  // No model field in any ARIA attribute except `aria-pressed`, the one state
  // attribute this renderer legitimately binds. Without this clause
  // `aria-roledescription={project.depth}` walks back in through another door.
  if (/aria-(?!pressed)[a-z-]+=\{\s*(?:project|client)\./.test(code)) {
    failures.push('carries a model field in an ARIA attribute');
  }

  // Counted, not pattern-matched: exactly one `aria-label=` may appear and it must
  // be the landmark's. The two halves are asserted separately so a *missing* or
  // *renamed* landmark fails too — a `labels.length > (landmark ? 1 : 0)` form
  // passes zero labels and passes any landmark name, which is how this checker
  // and the inline scan came to disagree on four of six probe inputs while the
  // comment below claimed they could not diverge.
  const labels = [...code.matchAll(/aria-label=/g)];
  if (labels.length !== 1) failures.push(`exactly one aria-label= belongs here — found ${labels.length}`);
  // Attribute-order- and whitespace-tolerant, so reformatting the `<nav>` across
  // lines is not a finding: the single-line `/<nav aria-label="Destinations">/`
  // form reported a false failure on exactly that.
  if (!/<nav[^>]*\saria-label="Destinations"/.test(code)) {
    failures.push('the one aria-label= must be the landmark\'s, naming it "Destinations"');
  }
  return failures;
}

test('the ARIA ban rejects a label on a button whether the value is a model field or a literal', () => {
  // The five forms that must fail. The literal `aria-label="Deep"` is the one the
  // `=\{`-keyed narrowing let through: it replaces the announced name with the
  // depth word alone, losing the Project title, which is precisely the regression
  // the original blanket ban was written for.
  //
  // Each fixture carries the legitimate landmark, so what is being tested is the
  // *button's* attribute rather than the absence of the landmark label — without
  // it every fixture would fail for the wrong reason and the test would prove
  // nothing about the form it names.
  const LANDMARK = '<nav aria-label="Destinations">';
  const banned: readonly string[] = [
    '<button aria-label={project.depth}>',
    '<button aria-label={project.title}>',
    '<button aria-label="Deep">',
    '<button aria-labelledby={client.id}>',
    '<button aria-describedby="depth-hint">',
    // The name-*suppressing* forms the narrowing had let back in. The first was
    // proven green against the whole suite: it strips Deep/Shallow from the
    // accessible name while leaving `{project.depth}` in text position, so the
    // positive text-node scan cannot see it either.
    '<span aria-hidden="true">{project.depth}</span>',
    '<button aria-roledescription={project.depth}>',
    '<button aria-roledescription="deep work">',
    '<button aria-valuetext={project.depth}>',
  ];
  for (const form of banned) {
    assert.notDeepEqual(
      auditAria(LANDMARK + form),
      [],
      `${form} must be rejected — it replaces, redirects, or suppresses the name`,
    );
  }

  // A *missing* or *renamed* landmark is a finding too. The earlier
  // `labels.length > (landmark ? 1 : 0)` form passed both, so a deleted label —
  // the regression the positive assertion exists for — read as clean.
  assert.notDeepEqual(auditAria('<nav><button/></nav>'), [], 'a deleted landmark label must be rejected');
  assert.notDeepEqual(
    auditAria('<nav aria-label="Anything"><button/></nav>'),
    [],
    'a renamed landmark must be rejected',
  );

  // A button label is rejected even when the landmark's own legitimate label is
  // present, so the exemption is one attribute wide rather than a blanket pass.
  assert.notDeepEqual(
    auditAria('<nav aria-label="Destinations"><button aria-label="Deep"></nav>'),
    [],
    'the landmark exemption must not cover a second label',
  );

  // And the state attributes the narrowing exists to permit must pass — including
  // `aria-pressed` bound to a model field, the one such binding this renderer
  // legitimately makes, which the model-field clause must therefore exempt.
  for (const form of [
    '<button aria-pressed={isFocused}>',
    '<button aria-pressed={project.id === focusedProjectId}>',
    '<button aria-current="true">',
    '',
  ]) {
    assert.deepEqual(auditAria(LANDMARK + form), [], `${form} carries state only — it must pass`);
  }

  // A `<nav>` whose attributes are wrapped across lines is not a finding. The
  // single-line `/<nav aria-label="Destinations">/` form rejected it, so a
  // formatter touching this file would have failed the build and the rule would
  // have been loosened to make it green again.
  assert.deepEqual(
    auditAria('<nav\n  aria-label="Destinations"\n  id="x"\n>\n<button/></nav>'),
    [],
    'reformatting the landmark across lines must not be a finding',
  );
});

// --- What the renderer newly does, pinned positively -------------------------

test('each handler is tied to its own element, so a transposition cannot pass', () => {
  // This is the mutation that passed the entire verification path green: swap the
  // two handlers and `selectClient(project.id)` writes a ProjectId into
  // `railPosition` — the one thing AD-4a forbids. Both IDs are unbranded `string`,
  // so `tsc` cannot see it either, and every negative scan in this file stays
  // happy because nothing bad was *added*.
  //
  // A negative scan cannot observe a correct form going missing, so the correct
  // form is pinned positively, the same idiom the text-node scan below uses. Both
  // directions are asserted: the right pairing present, and the transposed pairing
  // absent — because a file containing both would satisfy the positive half alone.
  //
  // Since 2.9 every button is a door in `activate.ts`, so the pins are on the
  // doors: `auditDoors` below, driven over the transpositions as well as the file.
  // `selectClient` is no longer called from here — or anywhere: the Client button
  // flies (`activateClient`), so `railPosition` has no shipped writer.
  assert.deepEqual(auditDoors(readFileSync(NAV_TSX, 'utf8')), []);
});

/**
 * The index's four doors, as a pure function over the renderer's source.
 *
 * Each handler is pinned to its own element and its own arguments: the Client
 * button activates `client.id`, the Project button activates `project.id` with its
 * own `client.id`, `overview` pulls back, and the return button returns — and
 * exists only while `mode === 'freeflight'`. As it unmounts, on a click or on
 * `Escape` (2.10), a stable ref cleanup hands DOM focus to `overview` through the
 * one `useRef`, exactly when the button still holds it. Exactly four `onClick`s, and no
 * store event called directly: a door composed by hand here would agree with the
 * scene's until the first time one of them changed.
 */
function auditDoors(source: string): string[] {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const failures: string[] = [];
  const button = (handler: string, text: string): RegExp =>
    new RegExp(`<button\\s+type="button"\\s+onClick=\\{\\(\\)\\s*=>\\s*${handler}\\}\\s*>\\s*${text}\\s*</button>`);
  if (!button('activateClient\\(\\s*client\\.id\\s*\\)', '\\{client\\.name\\}').test(code)) {
    failures.push('the Client button does not activate its own Client');
  }
  if (!/onClick=\{\(\)\s*=>\s*activateProject\(\s*project\.id\s*,\s*client\.id\s*\)\}/.test(code)) {
    failures.push('the Project button does not activate its own Project with its own Client');
  }
  if (!/<button\s+type="button"\s+ref=\{overview\}\s+onClick=\{\(\)\s*=>\s*pullBack\(\)\}\s*>\s*overview\s*<\/button>/.test(code)) {
    failures.push('no overview button, carrying the ref, pulling back');
  }
  if (!/const\s+overview\s*=\s*useRef<HTMLButtonElement>\(\s*null\s*\)/.test(code)) failures.push('the overview ref is not an empty button ref');
  if ((code.match(/\bref=\{/g) ?? []).length !== 2) failures.push('a ref other than the overview button’s and the return’s hand-back');
  const ret =
    /<button\s+type="button"\s+ref=\{handBack\}\s+onClick=\{\(\)\s*=>\s*returnToRail\(\)\}\s*>\s*↩ resume the journey\s*<\/button>/.exec(code);
  if (ret === null) failures.push('no return button that returns, carrying the hand-back ref');
  else if (!/\{\s*mode\s*===\s*'freeflight'\s*\?\s*\(\s*$/.test(code.slice(0, ret.index))) {
    failures.push('the return button is not conditional on free flight');
  }
  // 2.10: DOM focus is handed to `overview` where the unmount is — a ref cleanup —
  // so a click and Escape are covered alike, and only while the button holds focus.
  // Stable (`useCallback`, no dependencies): an inline callback is cleaned up on
  // every re-render, and would move focus while the button stays.
  if (
    !/const\s+handBack\s*=\s*useCallback\(\s*\(\s*button\s*:\s*HTMLButtonElement\s*\|\s*null\s*\)\s*=>\s*\(\)\s*=>\s*\{\s*if\s*\(\s*button\?\.matches\(\s*':focus'\s*\)\s*===\s*true\s*\)\s*overview\.current\?\.focus\(\)\s*;\s*\}\s*,\s*\[\s*\]\s*,?\s*\)/.test(
      code,
    )
  ) {
    failures.push('the return button’s unmount does not hand DOM focus to overview, exactly when it holds focus, from a stable ref cleanup');
  }
  if ((code.match(/\.focus\(/g) ?? []).length !== 1) failures.push('DOM focus is moved other than once, in the hand-back');
  if (!/const\s+mode\s*=\s*useStore\(\s*navigationStore\s*,\s*\(\s*(\w+)\s*\)\s*=>\s*\1\.mode\s*\)/.test(code)) {
    failures.push('the mode is not read through its own selector');
  }
  if (/activateClient\(\s*project\.|activateProject\(\s*client\.|activateProject\(\s*project\.id\s*,\s*project\./.test(code)) {
    failures.push('a door is handed the other entity’s ID — a ProjectId where a ClientId belongs is AD-4a');
  }
  // 3.4: the keyboard's approach — exactly one focus and one blur handler, on the
  // Project button, each a door handed its own Project's ID; the focus gate is
  // `:focus-visible`, read off the button itself, never a bare `:focus`.
  if ((code.match(/onFocus=\{/g) ?? []).length !== 1) failures.push('other than exactly one focus handler');
  if ((code.match(/onBlur=\{/g) ?? []).length !== 1) failures.push('other than exactly one blur handler');
  if (
    !/onFocus=\{\(event\)\s*=>\s*approachByKeyboard\(\s*project\.id\s*,\s*event\.currentTarget\.matches\(\s*':focus-visible'\s*\)\s*\)\}/.test(code)
  ) {
    failures.push('the Project button’s focus does not approach its own Project, gated on :focus-visible');
  }
  if (!/onBlur=\{\(\)\s*=>\s*leaveByKeyboard\(\s*project\.id\s*\)\}/.test(code)) {
    failures.push('the Project button’s blur does not leave its own Project');
  }
  if (!/activateProject\(\s*project\.id\s*,\s*client\.id\s*\)\}\s*onFocus=/.test(code)) {
    failures.push('the focus handler is not on the Project button');
  }
  if (/\b(?:selectClient|focusProject|enterFreeFlight|enterRail|releaseFocus|advanceScroll|hoverProject|keyboardApproach)\b/.test(code)) {
    failures.push('a store event called directly — every button is a door in activate.ts');
  }
  const clicks = (code.match(/onClick=\{/g) ?? []).length;
  if (clicks !== 4) failures.push(`exactly four buttons carry a handler — found ${clicks}`);
  return failures;
}

test('the door audit rejects the real renderer with any one door miswired', () => {
  const real = readFileSync(NAV_TSX, 'utf8');
  const mutations: readonly (readonly [string, (source: string) => string])[] = [
    ['the Client door handed a Project', (s) => s.replace('activateClient(client.id)', 'activateClient(project.id)')],
    ['the Project door handed a Client', (s) => s.replace('activateProject(project.id, client.id)', 'activateProject(client.id, client.id)')],
    ['the Project’s Client dropped', (s) => s.replace('activateProject(project.id, client.id)', 'activateProject(project.id, project.id)')],
    ['the store called directly', (s) => s.replace('activateClient(client.id)', 'selectClient(client.id)')],
    ['Focus called directly', (s) => s.replace('activateProject(project.id, client.id)', 'focusProject(project.id)')],
    ['the overview dropped', (s) => s.replace('onClick={() => pullBack()}', '')],
    ['the overview returns instead', (s) => s.replace('onClick={() => pullBack()}', 'onClick={() => returnToRail()}')],
    ['the return always rendered', (s) => s.replace("{mode === 'freeflight' ? (", '{true ? (')],
    ['the return on the Rail', (s) => s.replace("{mode === 'freeflight' ? (", "{mode === 'rail' ? (")],
    ['the return pulls back', (s) => s.replace('onClick={() => returnToRail()}', 'onClick={() => pullBack()}')],
    ['focus left on the unmounted button', (s) => s.replace(/\s*if \(button\?\.matches\(':focus'\) === true\) overview\.current\?\.focus\(\);/, '')],
    ['the hand-back dropped from the button', (s) => s.replace(' ref={handBack}', '')],
    ['focus taken whether or not the button held it', (s) => s.replace("if (button?.matches(':focus') === true) overview", 'overview')],
    ['focus moved on mount, not on unmount', (s) => s.replace(/\(\) => \{\s*if \(button\?\.matches/, '{\n      if (button?.matches')],
    ['an inline hand-back, cleaned up every render', (s) => s.replace('ref={handBack}', "ref={(button) => () => { if (button?.matches(':focus') === true) overview.current?.focus(); }}")],
    ['a hand-back with dependencies', (s) => s.replace(/\},\s*\[\],\s*\);/, '},\n    [mode],\n  );')],
    ['focus moved by the click as well', (s) => s.replace('onClick={() => returnToRail()}', 'onClick={() => { returnToRail(); overview.current?.focus(); }}')],
    ['the ref dropped from overview', (s) => s.replace(' ref={overview}', '')],
    ['the ref on the Client button', (s) => s.replace(' ref={overview}', '').replace('<button type="button" onClick={() => activateClient', '<button type="button" ref={overview} onClick={() => activateClient')],
    ['the mode read off the wrong field', (s) => s.replace('(state) => state.mode)', '(state) => state.focusOrigin)')],
    ['a Client button with no handler', (s) => s.replace(' onClick={() => activateClient(client.id)}', '')],
    // 3.4: the keyboard's approach.
    ['a mouse focus approaches too', (s) => s.replace("event.currentTarget.matches(':focus-visible')", 'true')],
    ['a bare :focus gate', (s) => s.replace("matches(':focus-visible')", "matches(':focus')")],
    ['the focus handed a Client', (s) => s.replace('approachByKeyboard(project.id,', 'approachByKeyboard(client.id,')],
    ['the blur dropped', (s) => s.replace(/\s*onBlur=\{\(\) => leaveByKeyboard\(project\.id\)\}/, '')],
    ['the blur writes the store directly', (s) => s.replace('leaveByKeyboard(project.id)', 'keyboardApproach(null)')],
    ['a hover written from the index', (s) => s.replace('leaveByKeyboard(project.id)', 'hoverProject(project.id)')],
    ['a second focus handler', (s) => s.replace('<button type="button" onClick={() => activateClient(client.id)}>', '<button type="button" onClick={() => activateClient(client.id)} onFocus={() => pullBack()}>')],
  ];
  for (const [name, mutate] of mutations) {
    const mutated = mutate(real.replace(/\r\n/g, '\n'));
    assert.notEqual(mutated, real.replace(/\r\n/g, '\n'), `the mutation "${name}" must apply`);
    assert.notDeepEqual(auditDoors(mutated), [], `"${name}" must be rejected`);
  }
});

test('aria-pressed is an equality against the focused Project, never a negation', () => {
  // Inverting it to `!==` made every *unfocused* Project announce "pressed" — a
  // screen reader told the opposite of the truth about every entry but one — and
  // the whole suite stayed green. The comparison is pinned exactly, and the
  // negated form banned, because `!==` is a one-character edit away and reads as
  // plausible.
  const code = readFileSync(NAV_TSX, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  assert.match(
    code,
    /aria-pressed=\{\s*project\.id === focusedProjectId\s*\}/,
    'aria-pressed is true exactly when this Project is the focused one',
  );
  assert.doesNotMatch(
    code,
    /aria-pressed=\{[^}]*!==?[^}]*\}/,
    'never a negation — that reports every unfocused entry as pressed',
  );
  assert.doesNotMatch(code, /aria-pressed=\{\s*(?:true|false)\s*\}/, 'nor a constant');
});

test('the renderer subscribes with a selector rather than the whole store', () => {
  // A whole-store subscription re-renders every Project when the camera writes
  // `scrollProgress`, sixty times a second, and nothing else in this suite would
  // notice. Pinned positively because the selector is the correct form and a
  // negative scan cannot see it go missing.
  const code = readFileSync(NAV_TSX, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  assert.match(
    code,
    /useStore\(\s*navigationStore\s*,\s*\(\s*\w+\s*\)\s*=>/,
    'useStore is given a selector, never the store alone',
  );
  assert.doesNotMatch(code, /useStore\(\s*navigationStore\s*\)/, 'never the whole store');

  // And the selector must read the field the binding is named for. The pattern above
  // stops at the arrow, so it accepts a selector reading *any* field: binding
  // `focusedProjectId` to `(state) => state.railPosition` passed this test, the
  // `aria-pressed` equality pin, and the whole suite — while making
  // `project.id === focusedProjectId` compare a ProjectId against a ClientId, so it
  // is always false and no Project can ever announce itself pressed. AC 6 fails at
  // runtime with every check green. The two pins agreed with each other and with
  // broken code, which is what a shape-only ratchet buys.
  assert.match(
    code,
    /const\s+focusedProjectId\s*=\s*useStore\(\s*navigationStore\s*,\s*\(\s*(\w+)\s*\)\s*=>\s*\1\.focusedProjectId\s*\)/,
    'the focusedProjectId binding must select focusedProjectId, not another field',
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
      // `overview`, then the return button (rendered only in free flight).
      '<button',
      '</button',
      '<button',
      '</button',
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
