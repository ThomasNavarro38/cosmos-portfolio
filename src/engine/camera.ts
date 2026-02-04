import * as THREE from 'three';
import { catmullRom } from '../utils/spline';

let railPoints: THREE.Vector3[] = [];

const DEFAULT_POINTS = [
  new THREE.Vector3(0, 0, 50),     // Intro - far out
  new THREE.Vector3(10, 5, 20),    // Transition 1
  new THREE.Vector3(-15, -10, 0),  // Skills
  new THREE.Vector3(20, 15, -30),  // Impact
  new THREE.Vector3(-25, 5, -70),  // Projects
  new THREE.Vector3(0, 0, -120),   // Finale
];

/**
 * Initializes or updates the camera rail with a set of control points.
 */
export function setRailPoints(points: THREE.Vector3[]) {
  railPoints = points;
}

/**
 * Returns the camera position and look-at target for a normalized progress t.
 * @param t Progress between 0 and 1
 */
export function getCameraPose(t: number): { position: THREE.Vector3; target: THREE.Vector3 } {
  if (railPoints.length === 0) {
    setRailPoints(DEFAULT_POINTS);
  }

  const clampedT = Math.max(0, Math.min(1, t));
  
  // Find which segment we are in
  // For n points, we have n-1 segments.
  const numPoints = railPoints.length;
  const numSegments = numPoints - 1;
  const segmentFloat = clampedT * numSegments;
  let index = Math.floor(segmentFloat);
  let localT = segmentFloat - index;

  // Handle t=1 boundary
  if (index >= numSegments) {
    index = numSegments - 1;
    localT = 1;
  }

  // Get points for Catmull-Rom (p0, p1, p2, p3)
  // p1 and p2 are the knots of the current segment.
  const p1 = railPoints[index];
  const p2 = railPoints[index + 1];
  
  // p0 and p3 are control points. Clamp to ends for simplicity.
  const p0 = railPoints[Math.max(0, index - 1)];
  const p3 = railPoints[Math.min(numPoints - 1, index + 2)];

  const position = catmullRom(p0, p1, p2, p3, localT);
  
  // Look-ahead for target
  const lookAheadDelta = 0.01;
  const targetGlobalT = Math.min(1, clampedT + lookAheadDelta);
  
  // Repeat segment calculation for target
  const targetSegmentFloat = targetGlobalT * numSegments;
  let tIndex = Math.floor(targetSegmentFloat);
  let tLocalT = targetSegmentFloat - tIndex;
  
  if (tIndex >= numSegments) {
    tIndex = numSegments - 1;
    tLocalT = 1;
  }
  
  const tp1 = railPoints[tIndex];
  const tp2 = railPoints[tIndex + 1];
  const tp0 = railPoints[Math.max(0, tIndex - 1)];
  const tp3 = railPoints[Math.min(numPoints - 1, tIndex + 2)];
  
  let target = catmullRom(tp0, tp1, tp2, tp3, tLocalT);

  // If we are at the very end or near it, project target ahead
  if (clampedT >= 1 - lookAheadDelta) {
    const tangent = target.clone().sub(position).normalize();
    target = position.clone().add(tangent);
  }

  return { position, target };
}

// Initialize with defaults
setRailPoints(DEFAULT_POINTS);
