import { describe, it, expect, beforeEach } from 'vitest';
import { getCameraPose, setRailPoints } from './camera';
import * as THREE from 'three';

describe('Camera Rail Engine', () => {
  const mockPoints = [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(10, 0, 0),
    new THREE.Vector3(20, 10, 0),
    new THREE.Vector3(30, 0, 0),
  ];

  beforeEach(() => {
    setRailPoints(mockPoints);
  });

  it('should return a pose at t=0', () => {
    const pose = getCameraPose(0);
    expect(pose.position).toBeInstanceOf(THREE.Vector3);
    expect(pose.target).toBeInstanceOf(THREE.Vector3);
    // At t=0 it should be at the first point (or near it depending on spline implementation)
    // For Catmull-Rom with 4 points, t=0 typically starts at the second point if they are control points,
    // but THREE.CatmullRomCurve3 uses all points as knots.
    expect(pose.position.x).toBeCloseTo(0);
  });

  it('should return a pose at t=1', () => {
    const pose = getCameraPose(1);
    expect(pose.position.x).toBeCloseTo(30);
  });

  it('should interpolate between points', () => {
    const poseMid = getCameraPose(0.5);
    expect(poseMid.position.x).toBeGreaterThan(0);
    expect(poseMid.position.x).toBeLessThan(30);
  });

  it('should return a stable target (look-ahead)', () => {
    const pose0 = getCameraPose(0);
    getCameraPose(0.1);
// Target should be different from position
    expect(pose0.target.equals(pose0.position)).toBe(false);
  });
});
