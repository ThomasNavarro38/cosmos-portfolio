/**
 * What every realism shader shares when it writes a number into its source (9.x
 * hardening, Epic 9 retro item 5). Its own module, so the fill shader can take it
 * without importing `star-shader.ts`, which imports the fill's vertex stage.
 */

/**
 * A number as a GLSL float literal, so a tuning value of 1 does not write `const float X = 1;`,
 * which GLSL ES refuses.
 *
 * @throws on a value that is not finite, which has no literal.
 */
export function glslFloat(value: number): string {
  if (!Number.isFinite(value)) throw new Error(`${value} has no GLSL literal`);
  return Number.isInteger(value) ? value.toFixed(1) : String(value);
}
