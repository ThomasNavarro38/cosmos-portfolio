/**
 * The token generator (AD-12): DESIGN.md's YAML frontmatter in, two committed
 * files out.
 *
 * - `node scripts/tokens.ts` (`npm run tokens`) parses the frontmatter, resolves
 *   its `{group.key}` aliases, validates what is emitted, and writes
 *   `src/tokens/tokens.css` (CSS custom properties, for the DOM) and
 *   `src/tokens/tokens.ts` (a typed `as const` object, for scene materials).
 * - `node scripts/tokens.ts --check` (part of `npm run gate`) regenerates in
 *   memory and fails when either committed file differs by one byte or has lost
 *   its banner, or when `src/tokens/` holds any other file (the directory is
 *   exempt from the literal scan, so nothing unreviewed may live there), then
 *   runs the literal-colour scan over `src/`. It never writes. Every failure is
 *   reported: a broken source does not hide a literal colour, or the reverse.
 *
 * **Why it lives outside `src/`.** `src/tokens/` is a leaf that imports nothing
 * (`src/derive/boundaries.ts`, the `tokens` row), and a generator has to read and
 * write files. The generator is tooling; its output is the leaf.
 *
 * **What is emitted, and only that.** `colors` (every bare/`-dark` pair),
 * `typography` (the font families and the eleven ramp roles, aliases resolved),
 * `spacing`, `rounded`, and `components.stroke-weight`. The other `components.*`
 * blocks are parsed — the whole frontmatter must be well-formed — but not emitted:
 * they are applied by the stories that draw them. No motion constants: DESIGN.md
 * carries none, and `FOCUS_SECONDS` and its kin stay in `src/shell/`.
 *
 * **Why no YAML dependency.** The repo pins a deliberately closed dependency set
 * (the same call `boundaries.ts` makes against ESLint). The parser below accepts
 * the subset DESIGN.md is written in — comments, nested block maps, single- and
 * double-quoted and plain scalars, a `>` folded scalar, a `- ` list of scalars —
 * and rejects everything else by name. A subset parser that refuses what it does
 * not understand is safer than a general one quietly misreading it.
 *
 * **Deterministic.** Source order in, source order out; no clock, no
 * environment, no randomness. The same DESIGN.md gives the same bytes.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkColourLiterals, checkSiteColourLiterals } from './colour-literals.ts';

// --- Paths ------------------------------------------------------------------

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));

/** The token source, as the banner and failures name it. */
export const DESIGN_DISPLAY =
  '_bmad-output/planning-artifacts/ux-designs/ux-cosmos-portfolio-2026-09-01/DESIGN.md';

export const DESIGN_PATH = join(REPO_ROOT, ...DESIGN_DISPLAY.split('/'));
export const TOKENS_DIR = join(REPO_ROOT, 'src', 'tokens');
export const SRC_DIR = join(REPO_ROOT, 'src');
/** The repository root, the colour scan's second root: `index.html` and `public/`. */
export const SITE_DIR = REPO_ROOT;

/** The two outputs, by file name under the tokens directory. */
export const CSS_FILE = 'tokens.css';
export const TS_FILE = 'tokens.ts';

/** The warning both outputs carry on line one, wrapped in each file's comment syntax. */
export const BANNER_TEXT =
  `GENERATED FILE — do not edit by hand. Produced by scripts/tokens.ts from ${DESIGN_DISPLAY}; ` +
  'run `npm run tokens` to regenerate.';

export const CSS_BANNER = `/* ${BANNER_TEXT} */`;
export const TS_BANNER = `// ${BANNER_TEXT}`;

// --- Errors -----------------------------------------------------------------

/** A generation failure. The message always names the key (or line) at fault. */
export class TokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TokenError';
  }
}

// --- The YAML subset --------------------------------------------------------

/**
 * A plain scalar that looks numeric but is not a canonical decimal — `1.50`,
 * `007`, `1e3`, `+1`, `.5`, `2.0`. Converting it would silently change the value
 * as written (`1.50` → `1.5`), so it is kept as its text and fails the moment it
 * reaches an emitted group, naming the key. Outside the emitted groups it is
 * inert: DESIGN.md's `components.moon-notable.orbitOffsetRatio: 2.0` parses.
 */
export class LooseNumber {
  readonly text: string;
  constructor(text: string) {
    this.text = text;
  }
}

export type YamlScalar = string | number | boolean | LooseNumber;
export type YamlNode = YamlScalar | YamlMap | readonly YamlScalar[];
export type YamlMap = Map<string, YamlNode>;

interface Line {
  /** 1-based, in the whole DESIGN.md file, so an error points an editor at it. */
  readonly number: number;
  readonly indent: number;
  /** The line with its indentation removed. */
  readonly text: string;
}

/**
 * The frontmatter's text, between the opening `---` on line one and the next
 * `---` line. CRLF is normalised first, so a checkout with `autocrlf` generates
 * the same bytes.
 */
export function extractFrontmatter(markdown: string): string {
  // A leading UTF-8 BOM is an editor artefact, not content: without this a file
  // saved "with BOM" would fail the fence check for an invisible reason.
  const text = (markdown.startsWith('\uFEFF') ? markdown.slice(1) : markdown).replace(/\r\n/g, '\n');
  if (!text.startsWith('---\n')) {
    throw new TokenError('DESIGN.md does not open with a `---` frontmatter fence on line one.');
  }
  const close = text.indexOf('\n---', 3);
  if (close === -1 || (text[close + 4] !== '\n' && text[close + 4] !== undefined)) {
    throw new TokenError('DESIGN.md has no closing `---` frontmatter fence.');
  }
  return text.slice(4, close + 1);
}

const KEY = /^([A-Za-z0-9_][A-Za-z0-9_-]*):(?=\s|$)(.*)$/;

/** Characters that open a YAML construct outside the subset when they start a value. */
const UNSUPPORTED_INDICATORS: Record<string, string> = {
  '[': 'a flow sequence',
  '{': 'a flow mapping (quote an alias: "{group.key}")',
  '&': 'an anchor',
  '*': 'an alias node',
  '!': 'a tag',
  '|': 'a literal block scalar',
  '@': 'a reserved indicator',
  '`': 'a reserved indicator',
  '%': 'a directive',
  '?': 'a complex key',
};

function isSkippable(text: string): boolean {
  return text === '' || text.startsWith('#');
}

function toLines(frontmatter: string): Line[] {
  return frontmatter
    .split('\n')
    .slice(0, -1)
    .map((raw, index) => {
      const number = index + 2;
      const indentation = /^[ \t]*/.exec(raw)?.[0] ?? '';
      if (indentation.includes('\t')) {
        throw new TokenError(`DESIGN.md:${number}: a tab in indentation is outside the supported YAML subset.`);
      }
      return { number, indent: indentation.length, text: raw.slice(indentation.length).trimEnd() };
    });
}

/**
 * One scalar, from the text after `key:` or `- `. `where` names the key for the
 * error message.
 */
export function parseScalar(raw: string, where: string): YamlScalar {
  const text = raw.trim();
  const quote = text[0];

  if (quote === '"' || quote === "'") {
    let value = '';
    let index = 1;
    let closed = false;
    while (index < text.length) {
      const char = text[index] as string;
      if (quote === "'" && char === "'") {
        if (text[index + 1] === "'") {
          value += "'";
          index += 2;
          continue;
        }
        closed = true;
        break;
      }
      if (quote === '"' && char === '\\') {
        const escaped = text[index + 1];
        if (escaped !== '"' && escaped !== '\\') {
          throw new TokenError(`${where}: the escape \\${escaped ?? ''} is outside the supported YAML subset.`);
        }
        value += escaped;
        index += 2;
        continue;
      }
      if (quote === '"' && char === '"') {
        closed = true;
        break;
      }
      value += char;
      index += 1;
    }
    if (!closed) throw new TokenError(`${where}: unterminated ${quote === '"' ? 'double' : 'single'}-quoted scalar.`);
    const rest = text.slice(index + 1);
    if (rest.trim() !== '' && !/^\s+#/.test(rest)) {
      throw new TokenError(`${where}: unexpected text after the closing quote: ${rest.trim()}`);
    }
    return value;
  }

  // A plain scalar: a trailing ` #` starts a comment.
  const plain = text.replace(/\s+#.*$/, '').trim();
  if (plain === '') throw new TokenError(`${where}: empty value — null is outside the supported YAML subset.`);
  const indicator = UNSUPPORTED_INDICATORS[plain[0] as string];
  if (indicator !== undefined) throw new TokenError(`${where}: ${indicator} is outside the supported YAML subset.`);
  if (plain === '>' || plain.startsWith('>')) {
    throw new TokenError(`${where}: only a bare \`>\` folded scalar is supported.`);
  }
  if (/:(\s|$)/.test(plain)) throw new TokenError(`${where}: a plain scalar may not contain ": " — quote it.`);
  if (plain === 'null' || plain === '~') throw new TokenError(`${where}: null is outside the supported YAML subset.`);
  if (plain === 'true') return true;
  if (plain === 'false') return false;
  // Only a canonical decimal becomes a number: its text is exactly what
  // `String(Number(text))` would print back, so conversion loses nothing.
  if (/^-?(?:0|[1-9]\d*)(?:\.\d*[1-9])?$/.test(plain)) return Number(plain);
  if (/^[+-]?(?:\d[\d_]*(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$|^[+-]?0[xXoObB]|^[+-]?\.?(?:inf|nan)$/i.test(plain)) {
    return new LooseNumber(plain);
  }
  return plain;
}

/** A `>` folded scalar: lines joined by spaces, a blank line kept as a newline, one final newline. */
function parseFolded(lines: readonly Line[], start: number, parentIndent: number, where: string): [string, number] {
  let index = start;
  let contentIndent = -1;
  const body: string[] = [];
  while (index < lines.length) {
    const line = lines[index] as Line;
    if (line.text === '') {
      body.push('');
      index += 1;
      continue;
    }
    if (line.indent <= parentIndent) break;
    if (contentIndent === -1) contentIndent = line.indent;
    if (line.indent !== contentIndent) {
      throw new TokenError(`DESIGN.md:${line.number}: ${where}: a more-indented line in a folded scalar is outside the supported YAML subset.`);
    }
    body.push(line.text);
    index += 1;
  }
  // Trailing blank lines belong to whatever follows, not to the scalar.
  while (body.length > 0 && body[body.length - 1] === '') {
    body.pop();
    index -= 1;
  }
  if (body.length === 0) throw new TokenError(`${where}: an empty folded scalar.`);
  let folded = '';
  for (let i = 0; i < body.length; i += 1) {
    const part = body[i] as string;
    if (part === '') folded += '\n';
    else folded += (i > 0 && body[i - 1] !== '' ? ' ' : '') + part;
  }
  return [`${folded}\n`, index];
}

/** A `- ` list of scalars at exactly `indent`. */
function parseList(lines: readonly Line[], start: number, indent: number, where: string): [YamlScalar[], number] {
  const items: YamlScalar[] = [];
  let index = start;
  while (index < lines.length) {
    const line = lines[index] as Line;
    if (isSkippable(line.text)) {
      index += 1;
      continue;
    }
    if (line.indent < indent) break;
    if (line.indent > indent || !(line.text === '-' || line.text.startsWith('- '))) {
      throw new TokenError(`DESIGN.md:${line.number}: ${where}: only a flat list of scalars is supported.`);
    }
    const value = line.text.slice(1);
    if (KEY.test(value.trim())) {
      throw new TokenError(`DESIGN.md:${line.number}: ${where}: a map inside a list is outside the supported YAML subset.`);
    }
    items.push(parseScalar(value, `${where}[${items.length}]`));
    index += 1;
  }
  return [items, index];
}

/** A block map whose keys sit at exactly `indent`. */
function parseMap(lines: readonly Line[], start: number, indent: number, prefix: string): [YamlMap, number] {
  const map: YamlMap = new Map();
  let index = start;
  while (index < lines.length) {
    const line = lines[index] as Line;
    if (isSkippable(line.text)) {
      index += 1;
      continue;
    }
    if (line.indent < indent) break;
    if (line.indent > indent) {
      throw new TokenError(`DESIGN.md:${line.number}: unexpected indentation under ${prefix || 'the top level'}.`);
    }
    if (line.text === '---' || line.text === '...') {
      throw new TokenError(`DESIGN.md:${line.number}: a second YAML document is outside the supported subset.`);
    }
    if (line.text.startsWith('- ') || line.text === '-') {
      throw new TokenError(`DESIGN.md:${line.number}: a list item where ${prefix || 'the top level'} expects a key.`);
    }
    const match = KEY.exec(line.text);
    if (match === null) {
      throw new TokenError(`DESIGN.md:${line.number}: expected \`key: value\` under ${prefix || 'the top level'}, found: ${line.text}`);
    }
    const key = match[1] as string;
    const path = prefix === '' ? key : `${prefix}.${key}`;
    if (map.has(key)) throw new TokenError(`DESIGN.md:${line.number}: ${path} is defined twice.`);
    const rest = (match[2] as string).trim();
    index += 1;

    if (rest === '>') {
      const [value, next] = parseFolded(lines, index, indent, path);
      map.set(key, value);
      index = next;
      continue;
    }
    if (rest !== '' && !rest.startsWith('#')) {
      map.set(key, parseScalar(rest, `DESIGN.md:${line.number}: ${path}`));
      continue;
    }

    // `key:` alone opens a nested map or a list on the next content line.
    let peek = index;
    while (peek < lines.length && isSkippable((lines[peek] as Line).text)) peek += 1;
    const child = lines[peek];
    if (child === undefined || child.indent <= indent) {
      throw new TokenError(`DESIGN.md:${line.number}: ${path} has no value — null is outside the supported YAML subset.`);
    }
    if (child.text === '-' || child.text.startsWith('- ')) {
      const [items, next] = parseList(lines, peek, child.indent, path);
      map.set(key, items);
      index = next;
    } else {
      const [nested, next] = parseMap(lines, peek, child.indent, path);
      map.set(key, nested);
      index = next;
    }
  }
  return [map, index];
}

/** The whole frontmatter as a tree of `Map`s, in source order. */
export function parseFrontmatter(frontmatter: string): YamlMap {
  const lines = toLines(frontmatter);
  const [root, next] = parseMap(lines, 0, 0, '');
  const stray = lines.slice(next).find((line) => !isSkippable(line.text));
  if (stray !== undefined) throw new TokenError(`DESIGN.md:${stray.number}: unexpected indentation at the top level.`);
  return root;
}

// --- Aliases ----------------------------------------------------------------

const ALIAS = /\{([A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)+)\}/g;

/** The node at a dotted path, or `undefined`. */
function lookup(root: YamlMap, path: string): YamlNode | undefined {
  let node: YamlNode | undefined = root;
  for (const segment of path.split('.')) {
    if (!(node instanceof Map)) return undefined;
    node = node.get(segment);
  }
  return node;
}

/**
 * A scalar with every `{a.b}` alias resolved. A value that is exactly one alias
 * takes the target's type (a number stays a number); an alias embedded in text
 * is substituted as text. Chains resolve; a cycle or an unresolvable reference
 * fails naming the key that holds it.
 */
export function resolveScalar(root: YamlMap, value: YamlScalar, key: string, seen: readonly string[] = []): YamlScalar {
  if (typeof value !== 'string') return value;
  const target = (path: string): YamlScalar => {
    if (seen.includes(path)) {
      throw new TokenError(`${key}: the alias {${path}} is circular (${[...seen, path].join(' → ')}).`);
    }
    const node = lookup(root, path);
    if (node === undefined) throw new TokenError(`${key}: the alias {${path}} does not resolve to anything in DESIGN.md.`);
    if (node instanceof Map || Array.isArray(node)) {
      throw new TokenError(`${key}: the alias {${path}} names a group, not a value.`);
    }
    return resolveScalar(root, node as YamlScalar, key, [...seen, path]);
  };
  const whole = /^\{([A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)+)\}$/.exec(value);
  if (whole !== null) return target(whole[1] as string);
  const replaced = value.replace(ALIAS, (_match, path: string) => {
    const resolved = target(path);
    if (resolved instanceof LooseNumber) {
      throw new TokenError(`${key}: the alias {${path}} resolves to ${resolved.text}, which is not a canonical number.`);
    }
    return String(resolved);
  });
  if (/[{}]/.test(replaced)) throw new TokenError(`${key}: a malformed alias in ${JSON.stringify(value)}.`);
  return replaced;
}

// --- The token model --------------------------------------------------------

/** The eleven ramp roles, in the order DESIGN.md's type ramp declares them. */
export const RAMP_ROLES = [
  'chrome',
  'scene-label-client',
  'scene-label-project',
  'scene-label-secondary',
  'mote-label',
  'panel-kicker',
  'panel-title',
  'notable-prose',
  'editorial-rule',
  'field-label',
  'field-value',
] as const;

/** The five fields every ramp role carries, and their CSS property suffixes. */
export const ROLE_FIELDS = [
  ['fontFamily', 'font-family'],
  ['fontSize', 'font-size'],
  ['fontWeight', 'font-weight'],
  ['lineHeight', 'line-height'],
  ['letterSpacing', 'letter-spacing'],
] as const;

/**
 * Spacing values the ramp deliberately skips (DESIGN.md: "no 16, no 24"), as
 * numbers of pixels: `16.0px`, `16PX`, `16 px` and a bare `16` are all 16.
 */
const FORBIDDEN_SPACING_PX = new Set([16, 24]);

/** The pixel count of a spacing value written in px or as a bare number, else `undefined`. */
function spacingPx(value: YamlScalar): number | undefined {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return undefined;
  const match = /^\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*(?:px)?\s*$/i.exec(value);
  return match === null ? undefined : Number(match[1]);
}

/**
 * Keys that name the prototype chain. `tokens.ts` emits an object literal, where
 * `__proto__: {...}` sets the prototype instead of defining a key, and a consumer
 * indexing by key would read `constructor` off every object.
 */
const RESERVED_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function checkKey(where: string, key: string): void {
  if (RESERVED_KEYS.has(key)) throw new TokenError(`${where}: "${key}" names the prototype chain and cannot be a token key.`);
}

type Group = ReadonlyArray<readonly [string, YamlScalar]>;

export interface TokenModel {
  readonly colors: Group;
  readonly fontFamily: Group;
  readonly roles: ReadonlyArray<readonly [string, Group]>;
  readonly spacing: Group;
  readonly rounded: Group;
  readonly strokeWeight: Group;
}

function requireMap(root: YamlMap, path: string): YamlMap {
  const node = lookup(root, path);
  if (node === undefined) throw new TokenError(`${path}: missing from DESIGN.md.`);
  if (!(node instanceof Map)) throw new TokenError(`${path}: expected a group of keys.`);
  return node;
}

/** A value that can be written into CSS and a TS literal without escaping into syntax. */
function checkEmittable(key: string, value: YamlScalar): YamlScalar {
  if (typeof value === 'boolean') throw new TokenError(`${key}: a boolean is not a token value.`);
  if (value instanceof LooseNumber) {
    throw new TokenError(
      `${key}: the plain scalar ${value.text} is not a canonical number — write it canonically (1.5, not 1.50) or quote it.`,
    );
  }
  if (
    typeof value === 'string' &&
    (value === '' ||
      /[;{}\n\r\\<>]/.test(value) ||
      value.includes('/*') ||
      value.includes('*/') ||
      /!\s*important/i.test(value) ||
      (value.match(/"/g) ?? []).length % 2 === 1)
  ) {
    throw new TokenError(`${key}: ${JSON.stringify(value)} is not a value a token can carry.`);
  }
  return value;
}

/** Every entry of a flat group, aliases resolved. */
function flatGroup(root: YamlMap, path: string): Group {
  const entries: Array<readonly [string, YamlScalar]> = [];
  for (const [key, node] of requireMap(root, path)) {
    const where = `${path}.${key}`;
    checkKey(where, key);
    if (node instanceof Map || Array.isArray(node)) throw new TokenError(`${where}: expected a value, found a group.`);
    entries.push([key, checkEmittable(where, resolveScalar(root, node as YamlScalar, where))]);
  }
  if (entries.length === 0) throw new TokenError(`${path}: the group is empty.`);
  return entries;
}

/** Validates and resolves everything emitted. Throws `TokenError` naming the key at fault. */
export function buildModel(root: YamlMap): TokenModel {
  const colors = flatGroup(root, 'colors');
  const colorKeys = new Set(colors.map(([key]) => key));
  for (const [key, value] of colors) {
    // `#RRGGBB` only: three's `Color` cannot parse the alpha forms (`#RGBA`,
    // `#RRGGBBAA`), and a colour the scene cannot read is not a shared token.
    if (typeof value !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(value)) {
      throw new TokenError(`colors.${key}: ${JSON.stringify(value)} is not a #RRGGBB colour.`);
    }
    const pair = key.endsWith('-dark') ? key.slice(0, -'-dark'.length) : `${key}-dark`;
    if (!colorKeys.has(pair)) {
      throw new TokenError(
        `colors.${key}: has no colors.${pair} — every colour is a light/dark pair (bare = light, -dark = shipped).`,
      );
    }
  }

  const typography = requireMap(root, 'typography');
  const fontFamily = flatGroup(root, 'typography.fontFamily');
  for (const key of typography.keys()) {
    checkKey(`typography.${key}`, key);
    if (key !== 'fontFamily' && !(RAMP_ROLES as readonly string[]).includes(key)) {
      throw new TokenError(`typography.${key}: not one of the eleven ramp roles the generator emits.`);
    }
  }
  const roles: Array<readonly [string, Group]> = [];
  for (const role of RAMP_ROLES) {
    const node = typography.get(role);
    if (node === undefined) throw new TokenError(`typography.${role}: the ramp role is missing.`);
    if (!(node instanceof Map)) throw new TokenError(`typography.${role}: expected a group of fields.`);
    for (const key of node.keys()) {
      checkKey(`typography.${role}.${key}`, key);
      if (!ROLE_FIELDS.some(([field]) => field === key)) {
        throw new TokenError(`typography.${role}.${key}: not one of the five fields a ramp role carries.`);
      }
    }
    const fields: Array<readonly [string, YamlScalar]> = [];
    for (const [field] of ROLE_FIELDS) {
      const where = `typography.${role}.${field}`;
      const value = node.get(field);
      if (value === undefined) throw new TokenError(`${where}: missing.`);
      if (value instanceof Map || Array.isArray(value)) throw new TokenError(`${where}: expected a value, found a group.`);
      fields.push([field, checkEmittable(where, resolveScalar(root, value as YamlScalar, where))]);
    }
    roles.push([role, fields]);
  }

  const spacing = flatGroup(root, 'spacing');
  for (const [key, value] of spacing) {
    const px = spacingPx(value);
    if (px !== undefined && FORBIDDEN_SPACING_PX.has(px)) {
      throw new TokenError(`spacing.${key}: ${String(value)} is off the ramp — it deliberately has no 16px and no 24px.`);
    }
  }

  return {
    colors,
    fontFamily,
    roles,
    spacing,
    rounded: flatGroup(root, 'rounded'),
    strokeWeight: flatGroup(root, 'components.stroke-weight'),
  };
}

// --- Emitters ---------------------------------------------------------------

export function emitCss(model: TokenModel): string {
  const lines: string[] = [CSS_BANNER, ':root {'];
  const block = (entries: ReadonlyArray<readonly [string, YamlScalar]>): void => {
    if (lines[lines.length - 1] !== ':root {') lines.push('');
    for (const [name, value] of entries) lines.push(`  ${name}: ${String(value)};`);
  };
  block(model.colors.map(([key, value]) => [`--color-${key}`, value]));
  block(model.fontFamily.map(([key, value]) => [`--font-${key}`, value]));
  for (const [role, fields] of model.roles) {
    block(
      fields.map(([field, value]) => {
        const suffix = ROLE_FIELDS.find(([name]) => name === field)?.[1] as string;
        return [`--type-${role}-${suffix}`, value];
      }),
    );
  }
  block(model.spacing.map(([key, value]) => [`--space-${key}`, value]));
  block(model.rounded.map(([key, value]) => [`--radius-${key}`, value]));
  block(model.strokeWeight.map(([key, value]) => [`--stroke-${key}`, value]));
  lines.push('}');
  return `${lines.join('\n')}\n`;
}

function tsKey(key: string): string {
  return /^[A-Za-z_$][\w$]*$/.test(key) ? key : tsString(key);
}

function tsString(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function tsValue(value: YamlScalar): string {
  return typeof value === 'string' ? tsString(value) : String(value);
}

export function emitTs(model: TokenModel): string {
  const lines: string[] = [
    TS_BANNER,
    '',
    '/**',
    ' * The design tokens, for code that cannot read a CSS custom property — scene',
    ' * materials above all. The same values as `tokens.css`, from the same source.',
    ' * Colours are pairs: the bare key is the future light theme, `-dark` the shipped one.',
    ' */',
    'export const tokens = {',
  ];
  const group = (indent: string, name: string, entries: Group): void => {
    lines.push(`${indent}${tsKey(name)}: {`);
    for (const [key, value] of entries) lines.push(`${indent}  ${tsKey(key)}: ${tsValue(value)},`);
    lines.push(`${indent}},`);
  };
  group('  ', 'colors', model.colors);
  lines.push('  typography: {');
  group('    ', 'fontFamily', model.fontFamily);
  for (const [role, fields] of model.roles) group('    ', role, fields);
  lines.push('  },');
  group('  ', 'spacing', model.spacing);
  group('  ', 'rounded', model.rounded);
  lines.push('  components: {');
  group('    ', 'stroke-weight', model.strokeWeight);
  lines.push('  },');
  lines.push('} as const;', '', 'export type Tokens = typeof tokens;');
  return `${lines.join('\n')}\n`;
}

/** DESIGN.md's text in, both outputs' exact bytes out. Throws `TokenError` on any fault. */
export function generate(markdown: string): { readonly css: string; readonly ts: string } {
  const model = buildModel(parseFrontmatter(extractFrontmatter(markdown)));
  return { css: emitCss(model), ts: emitTs(model) };
}

// --- The gate ---------------------------------------------------------------

function display(path: string): string {
  const rel = relative(REPO_ROOT, path);
  return rel.startsWith('..') || isAbsolute(rel) ? path : rel.split(sep).join('/');
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export interface Paths {
  readonly design: string;
  readonly out: string;
  readonly src: string;
  /**
   * The colour scan's second root, holding `index.html` and `public/`. When
   * absent it follows `src` (`siteOf`): the repository root for the real
   * `src/`, and the directory holding a fixture's `src` otherwise — a fixture
   * must never be judged by the real repository's page.
   */
  readonly site?: string;
}

/** The second root for `paths`: `site` when given, else the directory that holds `src`. */
export function siteOf(paths: Paths): string {
  if (paths.site !== undefined) return paths.site;
  return resolve(paths.src) === resolve(SRC_DIR) ? SITE_DIR : dirname(resolve(paths.src));
}

export const DEFAULT_PATHS: Paths = { design: DESIGN_PATH, out: TOKENS_DIR, src: SRC_DIR };

/**
 * The only files `src/tokens/` may hold. The directory is exempt from the
 * literal-colour scan because its generated files *are* the literals; any other
 * file there would inherit that exemption without anyone having reviewed it.
 */
export const TOKENS_DIR_FILES: ReadonlySet<string> = new Set(['README.md', CSS_FILE, TS_FILE]);

/** Printed on a passing `--check`, so a caller can tell the check ran rather than exiting 0 unrun. */
export const CHECK_PASSED = 'the design tokens are fresh, and no component writes a literal colour.';

/** Reads and generates, turning any failure into lines rather than a throw. */
function generateFrom(designPath: string): { css: string; ts: string } | string[] {
  let markdown: string;
  try {
    markdown = readFileSync(designPath, 'utf8');
  } catch (error) {
    return [`could not read ${display(designPath)}: ${messageOf(error)}`];
  }
  try {
    return generate(markdown);
  } catch (error) {
    if (error instanceof TokenError) return [`token generation failed — ${error.message}`];
    throw error;
  }
}

/** Every entry of the tokens directory that is not one of `TOKENS_DIR_FILES`. */
function checkTokensDirectory(out: string): string[] {
  let names: string[];
  try {
    names = readdirSync(out).sort();
  } catch (error) {
    // A missing directory is reported by the output checks, as two missing files.
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    return [`could not list ${display(out)}: ${messageOf(error)}`];
  }
  return names
    .filter((name) => !TOKENS_DIR_FILES.has(name))
    .map(
      (name) =>
        `${display(join(out, name))} is not a generated file. ${display(out)}/ is exempt from the literal-colour ` +
        `scan, so it holds only ${[...TOKENS_DIR_FILES].join(', ')} — move it or delete it.`,
    );
}

/**
 * The gate: the committed outputs match a fresh generation byte for byte and
 * carry their banners, the tokens directory holds nothing else, and no code under
 * `src/` writes a literal colour. Returns failure lines, empty on success.
 *
 * Every check runs whatever the others found: a broken DESIGN.md must not hide a
 * literal colour committed in the same change, or the reverse.
 */
export function checkTokens(paths: Paths = DEFAULT_PATHS): string[] {
  const failures: string[] = [];
  const generated = generateFrom(paths.design);
  if (Array.isArray(generated)) {
    failures.push(...generated);
  } else {
    const outputs = [
      [CSS_FILE, generated.css, CSS_BANNER],
      [TS_FILE, generated.ts, TS_BANNER],
    ] as const;
    for (const [name, expected, banner] of outputs) {
      const path = join(paths.out, name);
      const where = display(path);
      if (!existsSync(path)) {
        failures.push(`${where} is missing. Run \`npm run tokens\` to generate it.`);
        continue;
      }
      let actual: string;
      try {
        actual = readFileSync(path, 'utf8');
      } catch (error) {
        // A directory where the file should be, or a file that cannot be read,
        // is a failure to report — never a crash that hides the other checks.
        failures.push(`could not read ${where}: ${messageOf(error)}. Run \`npm run tokens\` to regenerate it.`);
        continue;
      }
      if (actual.split('\n', 1)[0] !== banner) {
        failures.push(
          `${where} does not carry its generated-file banner on line one. ` +
            'Do not hand-edit it — run `npm run tokens` to regenerate.',
        );
      } else if (actual !== expected) {
        failures.push(
          `${where} is stale or hand-edited: it differs from a fresh generation from ${DESIGN_DISPLAY}. ` +
            'Do not hand-edit it — run `npm run tokens` to regenerate.',
        );
      }
    }
  }
  failures.push(...checkTokensDirectory(paths.out));
  failures.push(...checkColourLiterals(paths.src));
  failures.push(...checkSiteColourLiterals(siteOf(paths)));
  return failures;
}

/**
 * Generates and writes both outputs. Nothing is written unless both generated,
 * and neither target is touched until both are fully on disk: each output goes
 * to a temporary file beside its target, then both are renamed into place. On
 * any failure the temporaries are removed.
 */
export function writeTokens(paths: Paths = DEFAULT_PATHS): string[] {
  const generated = generateFrom(paths.design);
  if (Array.isArray(generated)) return generated;
  const targets = [
    [join(paths.out, CSS_FILE), generated.css],
    [join(paths.out, TS_FILE), generated.ts],
  ] as const;
  const temps: string[] = [];
  try {
    mkdirSync(paths.out, { recursive: true });
    for (const [target, text] of targets) {
      const temp = `${target}.${process.pid}.tmp`;
      temps.push(temp);
      writeFileSync(temp, text);
    }
    targets.forEach(([target], index) => renameSync(temps[index] as string, target));
  } catch (error) {
    for (const temp of temps) {
      try {
        rmSync(temp, { force: true });
      } catch {
        // Something that is not our file sits at the temporary path (a
        // directory, say): not ours to remove, and the failure is reported below.
      }
    }
    return [`could not write the tokens: ${messageOf(error)}`];
  }
  return [];
}

/**
 * The command line: `--check`, and four test seams — `--design=<path>`,
 * `--out=<dir>`, `--src=<dir>`, `--site=<dir>` — defaulting to the repo's own. Anything else is
 * rejected: a typo such as `--chek` must never fall through to a write.
 */
export function parseArgs(argv: readonly string[]): { check: boolean; paths: Paths } | string[] {
  const failures: string[] = [];
  const options = new Map<string, string>();
  let check = false;
  for (const arg of argv) {
    if (arg === '--check') {
      check = true;
      continue;
    }
    const match = /^--(design|out|src|site)=(.+)$/.exec(arg);
    if (match === null) {
      failures.push(
        `unknown argument ${JSON.stringify(arg)} — scripts/tokens.ts takes --check, --design=, --out=, --src= and --site= only.`,
      );
      continue;
    }
    options.set(match[1] as string, match[2] as string);
  }
  if (failures.length > 0) return failures;
  return {
    check,
    paths: {
      design: options.get('design') ?? DEFAULT_PATHS.design,
      out: options.get('out') ?? DEFAULT_PATHS.out,
      src: options.get('src') ?? DEFAULT_PATHS.src,
      // A custom `--src=` with no `--site=` scans the site beside it, not the real repo's.
      site: options.get('site') ?? siteOf({ design: '', out: '', src: options.get('src') ?? DEFAULT_PATHS.src }),
    },
  };
}

function main(): void {
  const parsed = parseArgs(process.argv.slice(2));
  if (Array.isArray(parsed)) {
    for (const line of parsed) console.error(line);
    process.exit(1);
  }
  const { check, paths } = parsed;
  const failures = check ? checkTokens(paths) : writeTokens(paths);
  if (failures.length > 0) {
    for (const line of failures) console.error(line);
    process.exit(1);
  }
  if (check) console.log(CHECK_PASSED);
  else console.log(`wrote ${display(join(paths.out, CSS_FILE))} and ${display(join(paths.out, TS_FILE))}`);
}

/**
 * True when this module is the process entry point.
 *
 * A plain `process.argv[1] === fileURLToPath(import.meta.url)` can disagree on
 * Windows — drive-letter case, a junction, a `subst` drive — and then the gate
 * exits 0 having checked nothing. Both sides are resolved to their real path and
 * compared case-insensitively on win32, whose file system is.
 */
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
