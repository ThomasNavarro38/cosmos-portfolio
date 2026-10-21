/**
 * The Colophon's JSON setting (5.3, DESIGN.md `components.colophon-json`):
 * the text of a file split into runs to be set by luminance alone — keys,
 * scalar values, and everything else (structure). Pure and import-free.
 *
 * **Every byte, in order.** The runs mark spans over the original text; they
 * never parse it. Their concatenation is the input, for any input string,
 * valid JSON or not: nothing is trimmed, reformatted or re-stringified, so the
 * visitor reads the bytes the build published, not a re-serialisation of them.
 *
 * - A **string** runs from its opening `"` to the next unescaped `"` (a `\`
 *   takes the character after it), or to the end of the text if unterminated.
 *   It is a **key** when the next character past JSON whitespace is `:`, and a
 *   **value** otherwise.
 * - A **number** (`-?int frac? exp?`) and `true`, `false` and `null` are
 *   **values**.
 * - Everything else — `{}[]:,`, whitespace, anything unrecognised — is
 *   **structure**, adjacent structure merged into one run.
 */

export type JsonRunKind = 'key' | 'value' | 'structure';

export interface JsonRun {
  readonly kind: JsonRunKind;
  readonly text: string;
}

const NUMBER = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;
const LITERAL = /true|false|null/y;
const WHITESPACE = /[ \t\n\r]*/y;

/** The match of the sticky `pattern` at `at`, or an empty string. */
function matchAt(pattern: RegExp, text: string, at: number): string {
  pattern.lastIndex = at;
  return pattern.exec(text)?.[0] ?? '';
}

/** The index just past the string opening at `at`: its closing quote, or the end of the text. */
function stringEnd(text: string, at: number): number {
  let index = at + 1;
  while (index < text.length) {
    const char = text[index];
    if (char === '\\') index += 2;
    else if (char === '"') return index + 1;
    else index += 1;
  }
  return text.length;
}

/** `text` as luminance-set runs; their concatenation is `text`. */
export function jsonRuns(text: string): readonly JsonRun[] {
  const runs: JsonRun[] = [];
  let structure = '';
  const flush = (): void => {
    if (structure !== '') runs.push({ kind: 'structure', text: structure });
    structure = '';
  };
  let index = 0;
  while (index < text.length) {
    if (text[index] === '"') {
      const end = stringEnd(text, index);
      const after = end + matchAt(WHITESPACE, text, end).length;
      flush();
      runs.push({ kind: text[after] === ':' ? 'key' : 'value', text: text.slice(index, end) });
      index = end;
      continue;
    }
    const scalar = matchAt(NUMBER, text, index) || matchAt(LITERAL, text, index);
    if (scalar !== '') {
      flush();
      runs.push({ kind: 'value', text: scalar });
      index += scalar.length;
      continue;
    }
    structure += text.charAt(index);
    index += 1;
  }
  flush();
  return runs;
}
