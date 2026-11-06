// Where Bodies fall on screen by the shipped models (stories 7.7), in CSS pixels. Throwaway.
//
//   node spikes/realism-fills/screen-positions.ts <width> <height> <progress>      each Planet a Star's fill or glow reaches
//   node spikes/realism-fills/screen-positions.ts all <width> <height> <progress>  every Star in front of the camera
//   node spikes/realism-fills/screen-positions.ts scan <width> <height> [step]     the first form across the whole Rail
//
// The first picks where a trusted click lands, the second where a capture reads a Star's disc, and the third
// is the overlap count the record quotes, at 1440×900 and a step of 0.02. It covers the Rail only, not Focus.
import { readFileSync } from 'node:fs';
import { PerspectiveCamera, Vector3 } from 'three';
import { buildRail, railPose, railStopCount } from '../../src/render-scene/rail-model.ts';
import { buildScene, frameBodies, type SceneArtifact } from '../../src/render-scene/scene-model.ts';
import { bodyRadius } from '../../src/render-scene/stroke-model.ts';

/** `GLOW_RADIUS_RATIO`, restated: this only picks where a click lands, and the reach audit admits this directory the facade alone. */
const GLOW_RADIUS_RATIO = 3;

const artifact = JSON.parse(readFileSync(new URL('../../generated/layout.generated.json', import.meta.url), 'utf8')) as SceneArtifact;
const { bodies } = buildScene(artifact);
const rail = buildRail(artifact, bodies);
const framing = frameBodies(bodies);

function placedAt(width: number, height: number, progress: number) {
  const pose = railPose(rail, progress, width / height);
  const camera = new PerspectiveCamera(framing.fov, width / height, framing.near, 1e6);
  camera.position.set(pose.position.x, pose.position.y, pose.position.z);
  camera.lookAt(pose.target.x, pose.target.y, pose.target.z);
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  return bodies.map((body) => {
    const view = new Vector3(body.position.x, body.position.y, body.position.z).applyMatrix4(camera.matrixWorldInverse);
    const depth = -view.z;
    const clip = view.clone().applyMatrix4(camera.projectionMatrix);
    const perUnit = height / 2 / (Math.tan((camera.fov * Math.PI) / 360) * depth);
    return { id: body.id, kind: body.kind, depth, x: ((clip.x + 1) / 2) * width, y: ((1 - clip.y) / 2) * height, radius: bodyRadius(body) * perUnit };
  });
}

function overlaps(width: number, height: number, progress: number) {
  const placed = placedAt(width, height, progress);
  const rows: object[] = [];
  for (const planet of placed.filter((body) => body.kind === 'planet' && body.depth > 0 && body.x > 0 && body.x < width && body.y > 0 && body.y < height)) {
    for (const star of placed.filter((body) => body.kind === 'star' && body.depth > 0)) {
      const gap = Math.hypot(planet.x - star.x, planet.y - star.y);
      const glow = GLOW_RADIUS_RATIO * star.radius;
      if (gap > glow + planet.radius) continue;
      rows.push({ progress, planet: planet.id, x: +planet.x.toFixed(1), y: +planet.y.toFixed(1), radius: +planet.radius.toFixed(1), star: star.id, gap: +gap.toFixed(1), starFill: +star.radius.toFixed(1), glow: +glow.toFixed(1), planetIsNearer: planet.depth < star.depth, inFill: gap < star.radius });
    }
  }
  return rows;
}

const [first, ...rest] = process.argv.slice(2);
if (first === 'all') {
  const [width, height, progress] = rest.map(Number) as [number, number, number];
  for (const star of placedAt(width, height, progress).filter((body) => body.kind === 'star' && body.depth > 0)) {
    console.log(JSON.stringify({ id: star.id, x: +star.x.toFixed(1), y: +star.y.toFixed(1), radius: +star.radius.toFixed(2) }));
  }
} else if (first === 'scan') {
  const [width, height, step = 0.02] = rest.map(Number) as [number, number, number?];
  const rows = [];
  const stops = railStopCount(rail);
  for (let at = 0; at * step <= stops + 1e-9; at += 1) rows.push(...overlaps(width, height, Math.min(at * step, stops)));
  for (const row of rows) console.log(JSON.stringify(row));
  console.log(JSON.stringify({ scope: `${width}x${height}, Rail only, step ${step}`, overlaps: rows.length, onAFill: rows.filter((row) => (row as { inFill: boolean }).inFill).length, withThePlanetNearer: rows.filter((row) => (row as { planetIsNearer: boolean }).planetIsNearer).length }));
} else {
  for (const row of overlaps(Number(first), Number(rest[0]), Number(rest[1]))) console.log(JSON.stringify(row));
}
