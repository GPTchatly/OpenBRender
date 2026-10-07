import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname, sep } from 'node:path';

const directory = fileURLToPath(new URL('../app/dist/', import.meta.url));
const port = Number(process.env.OPENRENDER_PORT ?? 4173);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid local port.');
const config = JSON.parse(await readFile(new URL('../app/vercel.json', import.meta.url), 'utf8'));
const headers = Object.fromEntries(config.headers[0].headers.map(({key,value}) => [key,value]));
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.woff2':'font/woff2',
  '.json':'application/json','.txt':'text/plain; charset=utf-8','.png':'image/png'};
const server = createServer(async (request, response) => {
  for (const [name,value] of Object.entries(headers)) response.setHeader(name,value);
  if (!['127.0.0.1:'+port,'localhost:'+port].includes(request.headers.host)) {
    response.writeHead(403).end('Local host required.'); return;
  }
  if (!['GET','HEAD'].includes(request.method)) {
    response.setHeader('Allow','GET, HEAD'); response.writeHead(405).end(); return;
  }
  try {
    const url = new URL(request.url, 'http://127.0.0.1:'+port);
    const path = decodeURIComponent(url.pathname);
    if (path.length > 2048 || /[\\\x00-\x1f]/.test(path)) throw new Error('Invalid path.');
    const file = resolve(directory, '.' + (path === '/' ? '/index.html' : path));
    if (!file.startsWith(directory.replace(/[\\/]$/, '') + sep)) throw new Error('Invalid path.');
    const info = await stat(file);
    if (!info.isFile()) throw new Error('Not a file.');
    response.setHeader('Content-Type',types[extname(file)] ?? 'application/octet-stream');
    response.setHeader('Content-Length',info.size);
    if (path.startsWith('/assets/') || /^\/artwork\/[a-f0-9]{64}\.svg$/.test(path)) response.setHeader('Cache-Control','public, max-age=31536000, immutable');
    response.writeHead(200);
    response.end(request.method === 'HEAD' ? undefined : await readFile(file));
  } catch {
    response.setHeader('Cache-Control','no-store');
    response.writeHead(404, {'Content-Type':'text/plain; charset=utf-8'}).end('Not found.');
  }
});
server.on('error',error => { console.error('Local server failed:',error.code); process.exitCode=1; });
server.listen(port,'127.0.0.1', () => console.log('OpenBRender: http://127.0.0.1:'+port));
process.on('SIGINT',()=>server.close());
process.on('SIGTERM',()=>server.close());
