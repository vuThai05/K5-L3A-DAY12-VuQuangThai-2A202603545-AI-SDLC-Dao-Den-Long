import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve('dist');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const server = createServer(async (req, res) => {
  try {
    const path = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname.replace(/\/$/, '/index.html')));
    if (!path.startsWith(root + sep)) { res.writeHead(403); return res.end(); }
    const body = await readFile(path);
    res.writeHead(200, { 'Content-Type': mime[extname(path)] ?? 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end('Not found. Run npm run build first.'); }
});
server.listen(Number(process.env.PORT || 5173), '127.0.0.1', () => console.log(`Đảo Đèn Lồng: http://localhost:${server.address().port}`));
