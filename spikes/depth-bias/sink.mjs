// Optional helper for the depth spike: saves what the page POSTs (results JSON, canvas
// PNGs) into one directory, since a page cannot write to disk.
//   node spikes/depth-bias/sink.mjs <directory> [port=5198]
// Listens on 127.0.0.1 only. A name is one path component; anything else is refused.
import { mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';

const dir = process.argv[2];
const port = Number(process.argv[3] ?? 5198);
if (!dir) throw new Error('usage: node sink.mjs <directory> [port]');
mkdirSync(dir, { recursive: true });

createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5199');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') return void res.writeHead(204).end();
  let name = '';
  try {
    name = decodeURIComponent((req.url ?? '').replace(/^\//, ''));
  } catch {
    return void res.writeHead(400).end();
  }
  if (req.method !== 'POST' || !/^[\w][\w.-]*$/.test(name)) return void res.writeHead(400).end();
  const chunks = [];
  req.on('data', (chunk) => chunks.push(chunk));
  req.on('end', () => {
    try {
      writeFileSync(join(dir, name), Buffer.concat(chunks));
      res.writeHead(200).end('saved');
    } catch (error) {
      res.writeHead(500).end(String(error));
    }
  });
}).listen(port, '127.0.0.1', () => console.log(`sink: ${dir} on 127.0.0.1:${port}`));
