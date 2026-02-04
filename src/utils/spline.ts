import * as THREE from 'three';

/**
 * Centripetal Catmull-Rom interpolation for a single segment.
 * @param p0 Control point 0
 * @param p1 Knot point 1 (starts at t=0)
 * @param p2 Knot point 2 (ends at t=1)
 * @param p3 Control point 3
 * @param t Normalized progress [0, 1] between p1 and p2
 * @returns Interpolated Vector3
 */
export function catmullRom(
  p0: THREE.Vector3,
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  p3: THREE.Vector3,
  t: number
): THREE.Vector3 {
  const alpha = 0.5; // Centripetal
  
  function getT(tPrev: number, pPrev: THREE.Vector3, pCurr: THREE.Vector3): number {
    const d = pPrev.distanceTo(pCurr);
    return tPrev + (Math.pow(d, alpha) || 0.0001); // Avoid division by zero
  }

  const t0 = 0;
  const t1 = getT(t0, p0, p1);
  const t2 = getT(t1, p1, p2);
  const t3 = getT(t2, p2, p3);

  // Map normalized t [0,1] to [t1, t2]
  const globalT = t1 + t * (t2 - t1);

  function lerpVec(v1: THREE.Vector3, v2: THREE.Vector3, alpha: number): THREE.Vector3 {
    return new THREE.Vector3().lerpVectors(v1, v2, alpha);
  }

  const A1 = lerpVec(p0, p1, (globalT - t0) / (t1 - t0));
  const A2 = lerpVec(p1, p2, (globalT - t1) / (t2 - t1));
  const A3 = lerpVec(p2, p3, (globalT - t2) / (t3 - t2));
  
  const B1 = lerpVec(A1, A2, (globalT - t0) / (t2 - t0));
  const B2 = lerpVec(A2, A3, (globalT - t1) / (t3 - t1));
  
  const C = lerpVec(B1, B2, (globalT - t1) / (t2 - t1));
  
  return C;
}

/**
 * Returns the tangent (derivative) for centripetal Catmull-Rom at t.
 * Approximated via small delta for stability and simplicity.
 */
export function catmullRomTangent(
  p0: THREE.Vector3,
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  p3: THREE.Vector3,
  t: number
): THREE.Vector3 {
  const h = 0.001;
  const t1 = Math.max(0, t - h);
  const t2 = Math.min(1, t + h);
  
  const v1 = catmullRom(p0, p1, p2, p3, t1);
  const v2 = catmullRom(p0, p1, p2, p3, t2);
  
  return v2.sub(v1).normalize();
}
