// Pixel-compares two PNG captures outside and inside a disc (story 7.6), with no dependency.
//   node spikes/realism-fills/compare-outside.mjs <a.png> <b.png> <cx> <cy> <r>
// Prints the differing pixels each side of the disc, the largest channel change and the box of each.
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

function decode(path) {
  const file = readFileSync(path);
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
      channels = body[9] === 6 ? 4 : 3;
      if (body[8] !== 8 || body[12] !== 0 || (body[9] !== 2 && body[9] !== 6)) throw new Error(`${path} is not read here`);
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

const [pathA, pathB, cx, cy, r] = process.argv.slice(2);
const a = decode(pathA);
const b = decode(pathB);
if (a.width !== b.width || a.height !== b.height) throw new Error('the captures differ in size');
const side = () => ({ differing: 0, largest: 0, box: null });
const inside = side();
const outside = side();
for (let y = 0; y < a.height; y += 1) {
  for (let x = 0; x < a.width; x += 1) {
    let delta = 0;
    for (let c = 0; c < 3; c += 1) delta = Math.max(delta, Math.abs(a.pixels[(y * a.width + x) * a.channels + c] - b.pixels[(y * b.width + x) * b.channels + c]));
    if (delta === 0) continue;
    const tally = Math.hypot(x + 0.5 - Number(cx), y + 0.5 - Number(cy)) <= Number(r) ? inside : outside;
    tally.differing += 1;
    tally.largest = Math.max(tally.largest, delta);
    tally.box = tally.box === null ? [x, y, x, y] : [Math.min(tally.box[0], x), Math.min(tally.box[1], y), Math.max(tally.box[2], x), Math.max(tally.box[3], y)];
  }
}
console.log(JSON.stringify({ pixels: a.width * a.height, disc: [Number(cx), Number(cy), Number(r)], inside, outside }));
