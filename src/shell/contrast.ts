/**
 * WCAG 2.x contrast arithmetic — test support, shared by every audit that holds
 * a contrast floor (`chrome-model.test.ts`, `identity-audit.test.ts`), so the
 * floor is computed one way rather than once per suite. No shipped module
 * imports it; it imports nothing.
 *
 * It reads a colour as the generated tokens write one, `#rrggbb`, and throws on
 * anything else rather than guessing.
 */

/** The three sRGB channels of a `#rrggbb` colour, each `0..1`. Throws on any other form. */
export function channels(hex: string): readonly [number, number, number] {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (match === null) throw new Error(`${hex} is not a #rrggbb colour`);
  return match.slice(1).map((pair) => Number.parseInt(pair, 16) / 255) as unknown as readonly [number, number, number];
}

/** One sRGB channel, decoded to linear light. */
export function linear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG 2.x relative luminance of a `#rrggbb` colour. */
export function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map(linear) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.x contrast ratio, lighter over darker. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}
