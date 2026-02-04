import { describe, it, expect } from 'vitest';
import { catmullRom, catmullRomTangent } from './spline';
import * as THREE from 'three';

describe('Spline Utilities', () => {
  const p0 = new THREE.Vector3(-10, 0, 0);
  const p1 = new THREE.Vector3(0, 0, 0);
  const p2 = new THREE.Vector3(10, 0, 0);
  const p3 = new THREE.Vector3(20, 0, 0);

  it('should return p1 at t=0', () => {
    const res = catmullRom(p0, p1, p2, p3, 0);
    expect(res.x).toBeCloseTo(0);
    expect(res.y).toBeCloseTo(0);
  });

  it('should return p2 at t=1', () => {
    const res = catmullRom(p0, p1, p2, p3, 1);
    expect(res.x).toBeCloseTo(10);
    expect(res.y).toBeCloseTo(0);
  });

  it('should interpolate mid-point', () => {
    const res = catmullRom(p0, p1, p2, p3, 0.5);
    expect(res.x).toBeGreaterThan(0);
    expect(res.x).toBeLessThan(10);
  });

  it('should handle non-linear points (avoiding cusps check)', () => {
    const p1_nl = new THREE.Vector3(0, 0, 0);
    const p2_nl = new THREE.Vector3(1, 10, 0); // Sharp turn
    const res = catmullRom(p0, p1_nl, p2_nl, p3, 0.5);
    expect(res.y).toBeGreaterThan(0);
  });

  it('should return a valid tangent', () => {
    const tangent = catmullRomTangent(p0, p1, p2, p3, 0.5);
    expect(tangent.length()).toBeCloseTo(1);
    // For collinear points on X, tangent should be (1,0,0)
    expect(tangent.x).toBeCloseTo(1);
    expect(tangent.y).toBeCloseTo(0);
  });
});
