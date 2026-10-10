/**
 * The Skill list (Story 3.5): ranked by share count, tiered, and held by the
 * gate. The matrix rows Rank order, Tiers and Gate drift are pinned here; the
 * gate check is pinned by mutation, so a `checkSkills` returning `[]` cannot
 * pass.
 */

import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { CareerSchema } from '../data/schema.ts';
import { buildArtifact, serializeArtifact, stripBanner } from './artifact.ts';
import type { Artifact } from './artifact-schema.ts';
import { deriveEntities } from './entities.ts';
import { SKILL_TIERS } from './rules.ts';
import { ARTIFACT_PATH, checkEmittedArtifact, checkSkills } from './index.ts';
import { buildSkills, rankSkills, shareCounts } from './skills.ts';
import { solveLayout } from './solve.ts';

const AS_OF = '2026-09';
const INDEX_TS = fileURLToPath(new URL('./index.ts', import.meta.url));

function entry(client: string, project: string, skills: string[]): Record<string, unknown> {
  return {
    client,
    project,
    company: null,
    role: 'Developer',
    built: 'Built a thing.',
    team_size: 4,
    duration: { start: '2019-01', end: '2021-01' },
    notable: '',
    skills,
  };
}

function seededRandom(): () => number {
  let state = 1;
  return () => (state = (1664525 * state + 1013904223) % 4294967296) / 4294967296;
}

/** Four Projects: Java ×4, Kafka ×2 (one Project listing it twice), the rest once. */
function entries(): Record<string, unknown>[] {
  return [
    entry('Alpha', 'A', ['Kafka', 'Java', 'Kafka', 'Zig']),
    entry('Alpha', 'B', ['Java', 'Kafka']),
    entry('Beta', 'C', ['Java', 'Ada']),
    entry('Beta', 'D', ['Java']),
  ];
}

function graphOf(list: Record<string, unknown>[]) {
  return deriveEntities(CareerSchema.parse({ asOf: AS_OF, projects: list }), { asOf: AS_OF });
}

function artifactOf(list: Record<string, unknown>[]): Artifact {
  const graph = graphOf(list);
  return buildArtifact(graph, solveLayout(graph, { randomSource: seededRandom() }), AS_OF);
}

test('rank order: shares descending, then name ascending by codepoint', () => {
  // The matrix row: Java (7), PostgreSQL (5), Spring Boot (5) → Java, PostgreSQL, Spring Boot.
  const ranked = rankSkills(new Map([['Spring Boot', 5], ['Java', 7], ['PostgreSQL', 5], ['angular', 1], ['Ada', 1]]));
  assert.deepEqual(
    ranked.map((skill) => skill.name),
    ['Java', 'PostgreSQL', 'Spring Boot', 'Ada', 'angular'],
    'ties break by codepoint, so an upper-case name precedes a lower-case one',
  );
});

test('tiers: shares 4 / 2 / 1 → inner / middle / outer, through the graph', () => {
  assert.deepEqual(buildSkills(graphOf(entries())), [
    { name: 'Java', tier: 'mote-inner' },
    { name: 'Kafka', tier: 'mote-middle' },
    { name: 'Ada', tier: 'mote-outer' },
    { name: 'Zig', tier: 'mote-outer' },
  ]);
});

test('a Project listing a Skill twice shares it once', () => {
  assert.equal(shareCounts([{ skills: ['Kafka', 'Kafka'] }]).get('Kafka'), 1);
});

test('the list is independent of authored order', () => {
  assert.deepEqual(buildSkills(graphOf([...entries()].reverse())), buildSkills(graphOf(entries())));
});

test('the emitted artifact carries the list, and the gate check accepts it', () => {
  const artifact = artifactOf(entries());
  assert.deepEqual(artifact.skills, buildSkills(graphOf(entries())));
  assert.deepEqual(checkSkills(artifact), []);
  assert.deepEqual(checkEmittedArtifact(artifact), []);
});

test('the gate check names the Skill for every kind of drift, mutation by mutation', () => {
  const base = artifactOf(entries());
  const mutations: [string, string, (doc: Artifact) => Artifact][] = [
    ['a missing Skill', 'Zig', (d) => ({ ...d, skills: d.skills.filter((s) => s.name !== 'Zig') })],
    ['an extra Skill', 'Cobol', (d) => ({ ...d, skills: [...d.skills, { name: 'Cobol', tier: 'mote-outer' }] })],
    ['a duplicated Skill', 'Ada', (d) => ({ ...d, skills: [...d.skills, { name: 'Ada', tier: 'mote-outer' }] })],
    ['a hand-edited tier', 'Kafka', (d) => ({
      ...d,
      skills: d.skills.map((s) => (s.name === 'Kafka' ? { ...s, tier: 'mote-inner' as const } : s)),
    })],
    ['a misordered pair', 'Kafka', (d) => ({ ...d, skills: [d.skills[1]!, d.skills[0]!, ...d.skills.slice(2)] })],
    ['a misordered tie', 'Zig', (d) => ({ ...d, skills: [...d.skills.slice(0, 2), d.skills[3]!, d.skills[2]!] })],
  ];
  for (const [label, name, mutate] of mutations) {
    const failures = checkSkills(mutate(base));
    assert.ok(
      failures.some((line) => line.includes(`"${name}"`)),
      `${label} must be rejected naming "${name}": ${failures.join('; ')}`,
    );
    assert.ok(
      checkEmittedArtifact(mutate(base)).some((line) => /Skill list disagrees/.test(line)),
      `${label} must not reach serialization`,
    );
  }
});

test('a Skill moved several places, either way, is reported by its own name and no other', () => {
  const list = ['A', 'B', 'C', 'D', 'E', 'F'];
  // Six Skills, shared 6..1 times, so the rank is A..F.
  const entriesOf = list.map((_, i) =>
    entry(`Client${String(i)}`, `P${String(i)}`, list.slice(0, i + 1)),
  );
  const base = artifactOf(entriesOf);
  assert.deepEqual(base.skills.map((s) => s.name), list);
  const names = (failures: string[]) => [...new Set(failures.flatMap((line) => [...line.matchAll(/"([A-F])" is out of rank order/g)].map((m) => m[1])))];
  const down = { ...base, skills: [...base.skills.slice(1, 5), base.skills[0]!, base.skills[5]!] };
  assert.deepEqual(names(checkSkills(down)), ['A'], 'moved down four places');
  const up = { ...base, skills: [base.skills[4]!, ...base.skills.slice(0, 4), base.skills[5]!] };
  assert.deepEqual(names(checkSkills(up)), ['E'], 'moved up four places');
});

test('gate drift: npm run gate exits 1 naming the Skill on a hand-edited tier', () => {
  const doc = stripBanner(JSON.parse(readFileSync(ARTIFACT_PATH, 'utf8'))) as Artifact;
  const victim = doc.skills[0];
  assert.ok(victim !== undefined);
  const other = SKILL_TIERS.find((tier) => tier !== victim.tier);
  assert.ok(other !== undefined);
  const drifted: Artifact = {
    ...doc,
    skills: doc.skills.map((s, index) => (index === 0 ? { ...s, tier: other } : s)),
  };
  const dir = mkdtempSync(join(tmpdir(), 'skills-'));
  try {
    const path = join(dir, 'drifted.json');
    writeFileSync(path, serializeArtifact(drifted));
    let status = 0;
    let stderr = '';
    try {
      execFileSync(process.execPath, [INDEX_TS, '--check', path], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60_000 });
    } catch (error) {
      const e = error as { status?: number; stderr?: string };
      status = e.status ?? -1;
      stderr = e.stderr ?? '';
    }
    assert.equal(status, 1, `expected exit 1\n${stderr}`);
    assert.ok(stderr.includes(`"${victim.name}"`), `the failure must name the Skill: ${stderr}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the Skill check never solves', () => {
  const source = readFileSync(INDEX_TS, 'utf8');
  const start = source.indexOf('export function checkSkills');
  const end = source.indexOf('export function checkArtifact');
  assert.ok(start >= 0 && end > start, 'the scan must find checkSkills, and checkArtifact after it');
  const body = source.slice(start, end);
  assert.doesNotMatch(body, /runPipeline|writeFileSync|solveLayout|buildArtifact|deriveEntities|buildSkills/);
});
