// A bundle-assertion fixture: one of two entries sharing `three`, so the bundler hoists it into a shared static chunk.
import { Vector3 } from 'three';

console.log(new Vector3(1, 0, 0).length());
