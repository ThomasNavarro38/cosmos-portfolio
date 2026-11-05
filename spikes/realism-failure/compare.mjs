// Pixel-compares two PNG captures for the failure check (story 7.5), with no
// dependency: 8-bit RGB or RGBA, non-interlaced, as Chrome's screenshots are.
//
//   node spikes/realism-failure/compare.mjs <a.png> <b.png>
//
// Prints the size of each, the count of pixels differing in any channel, the
// largest channel difference, and the bounding box of what differs.

import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

function decode(path) {
  const file = readFileSync(path);
  if (file.toString('latin1', 1, 4) !== 'PNG') throw new Error(`${path} is not a PNG`);
  let width = 0;
  let height = 0;
  let channels = 0;
  const idat = [];
  for (let at = 8; at < file.length; ) {
    const length = file.readUInt32BE(at);
    const type = file.toString('latin1', at + 4, at + 8);
    const body = file.subarray(at + 8, at + 8 + length);
    if (type === 'IHDR') {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      const [depth, colour, , , interlace] = [body[8], body[9], body[10], body[11], body[12]];
      if (depth !== 8 || interlace !== 0 || (colour !== 2 && colour !== 6)) throw new Error(`${path}: depth ${depth}, colour ${colour}, interlace ${interlace} is not read here`);
      channels = colour === 6 ? 4 : 3;
    }
    if (type === 'IDAT') idat.push(body);
    at += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const pixels = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)];
    const line = y * (stride + 1) + 1;
    for (let x = 0; x < stride; x += 1) {
      const left = x >= channels ? pixels[y * stride + x - channels] : 0;
      const up = y > 0 ? pixels[(y - 1) * stride + x] : 0;
      const corner = y > 0 && x >= channels ? pixels[(y - 1) * stride + x - channels] : 0;
      let predicted = 0;
      if (filter === 1) predicted = left;
      else if (filter === 2) predicted = up;
      else if (filter === 3) predicted = (left + up) >> 1;
      else if (filter === 4) {
        const p = left + up - corner;
        const [a, b, c] = [Math.abs(p - left), Math.abs(p - up), Math.abs(p - corner)];
        predicted = a <= b && a <= c ? left : b <= c ? up : corner;
      }
      pixels[y * stride + x] = (raw[line + x] + predicted) & 255;
    }
  }
  return { width, height, channels, pixels };
}

const [pathA, pathB] = process.argv.slice(2);
const a = decode(pathA);
const b = decode(pathB);
if (a.width !== b.width || a.height !== b.height) {
  console.log(JSON.stringify({ a: [a.width, a.height], b: [b.width, b.height], comparable: false }));
  process.exit(1);
}
let differing = 0;
let largest = 0;
let box = null;
for (let y = 0; y < a.height; y += 1) {
  for (let x = 0; x < a.width; x += 1) {
    let any = false;
    for (let c = 0; c < 3; c += 1) {
      const delta = Math.abs(a.pixels[(y * a.width + x) * a.channels + c] - b.pixels[(y * b.width + x) * b.channels + c]);
      if (delta > 0) any = true;
      if (delta > largest) largest = delta;
    }
    if (any) {
      differing += 1;
      box = box === null ? [x, y, x, y] : [Math.min(box[0], x), Math.min(box[1], y), Math.max(box[2], x), Math.max(box[3], y)];
    }
  }
}
console.log(JSON.stringify({ size: [a.width, a.height], pixels: a.width * a.height, differing, largestChannelDelta: largest, box }));
