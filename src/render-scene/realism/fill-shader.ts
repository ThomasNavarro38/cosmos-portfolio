/**
 * A Planet's fill, as GLSL (7.6). Strings only, so a test reads them as written.
 *
 * **The vertex shader is the 7.1 mechanism.** It flattens the sphere to z = 0 in
 * the marks' plane, then biases it behind them, because `1e-6` was measured only on
 * that disc: a sphere keeping its relief would stand a radius toward the camera.
 * The flattened far hemisphere winds backward, so `FrontSide` culls it.
 *
 * **The fragment shader uses the exact normal,** from the disc coordinate, so the
 * sphere's facets never show. `mat3(modelMatrix)` takes it to world space, and is
 * handed over as a varying because three declares `modelMatrix` only for vertices.
 * Longitude is computed per fragment, so its derivative jumps at each candidate's
 * seam. Two candidates with their seams opposite, the smoother taken, and
 * `RepeatWrapping` on S, keep a one-pixel mip line off the disc. At the exact pole
 * `atan` is undefined, so longitude is taken as 0 there. Neither the seam nor the
 * pole has been measured on screen.
 *
 * **Nothing is tone-mapped.** `<colorspace_fragment>` is the output's sRGB, and
 * `flat` on the Canvas stays.
 *
 * **Rounding must not pass the ceiling.** The output is rounded to 8 bits per
 * channel, which read back up to 0.5% above the ceiling on a saturated pixel. So a
 * pixel at or near it is floored to its 8-bit step, and the read-back holds.
 */

import { FILL_CEILING_LUMINANCE, FILL_CLIP_OFFSET, FILL_NEAR_CEILING, FILL_TARGET_LUMINANCE } from './fill-model.ts';

export const FILL_VERTEX_SHADER = /* glsl */ `
  uniform float radius;
  varying vec2 vDisc;
  varying mat3 vWorld;
  void main() {
    vDisc = position.xy;
    vWorld = mat3(modelMatrix);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position.xy * radius, 0, 1);
    gl_Position.z += ${FILL_CLIP_OFFSET.toExponential()} * gl_Position.w;
  }
`;

export const FILL_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uMeanLuminance;
  uniform vec3 uLight;
  uniform vec3 uAmbient;
  uniform mat3 uMapFromWorld;
  varying vec2 vDisc;
  varying mat3 vWorld;
  const float FILL_TARGET_LUMINANCE = ${FILL_TARGET_LUMINANCE};
  const float CEILING = ${FILL_CEILING_LUMINANCE};
  const float NEAR_CEILING = ${FILL_NEAR_CEILING};
  const float PI = 3.141592653589793;
  void main() {
    vec3 n = vec3(vDisc, sqrt(max(1.0 - dot(vDisc, vDisc), 0.0)));
    vec3 N = normalize(vWorld * n);
    vec3 m = uMapFromWorld * N;
    float longitude = (abs(m.x) + abs(m.z) < 1e-6 ? 0.0 : atan(m.x, m.z)) / (2.0 * PI);
    float seamBehind = fract(longitude);
    float seamAhead = fract(longitude + 0.5) - 0.5;
    float u = (fwidth(seamBehind) <= fwidth(seamAhead) ? seamBehind : seamAhead) + 0.5;
    float v = asin(clamp(m.y, -1.0, 1.0)) / PI + 0.5;
    vec3 albedo = texture2D(uMap, vec2(u, v)).rgb * (FILL_TARGET_LUMINANCE / uMeanLuminance);
    vec3 lit = albedo * max(dot(N, uLight), 0.0) + uAmbient;
    float y = dot(lit, vec3(0.2126, 0.7152, 0.0722));
    gl_FragColor = vec4(y > CEILING ? lit * (CEILING / y) : lit, 1.0);
    #include <colorspace_fragment>
    if (y > CEILING * NEAR_CEILING) gl_FragColor.rgb = floor(gl_FragColor.rgb * 255.0) / 255.0;
  }
`;
