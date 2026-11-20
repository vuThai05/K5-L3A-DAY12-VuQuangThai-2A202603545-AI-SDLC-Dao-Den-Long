import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { parseArgs } from 'node:util';
import { leaderboardStore } from './leaderboard-store.js';

let args;
try { args = parseArgs({ options: { 'export-leaderboard': { type: 'string' } } }).values; }
catch (error) { console.error(error.message); process.exit(2); }
const store = leaderboardStore();
if (args['export-leaderboard']) {
  try { await writeFile(args['export-leaderboard'], JSON.stringify(await store.read(), null, 2) + '\n'); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
} else {
  const root = resolve('dist'), mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
  const server = createServer(async (req, res) => {
    const json = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(body)); };
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname === '/api/leaderboard') {
        if (req.method === 'GET') return json(200, await store.read());
        if (req.method !== 'POST') return json(405, { error: 'Use GET or POST' });
        const origin = req.headers.origin && new URL(req.headers.origin), port = String(server.address().port);
        const host = new URL(`http://${req.headers.host}`);
        if (!['127.0.0.1', 'localhost'].includes(host.hostname) || host.port !== port || origin && (!['127.0.0.1', 'localhost'].includes(origin.hostname) || origin.port !== port)) return json(403, { error: 'Only same-origin local writes' });
        if (!req.headers['content-type']?.startsWith('application/json')) return json(415, { error: 'JSON required' });
        let body = '', size = 0;
        for await (const chunk of req) { size += chunk.length; if (size > 16384) return json(413, { error: 'Body too large' }); body += chunk; }
        try { return json(200, await store.add(JSON.parse(body))); }
        catch (error) { return json(error.code ? 500 : 400, { error: error.message }); }
      }
      if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); return res.end(); }
      const path = resolve(root, '.' + decodeURIComponent(url.pathname.replace(/\/$/, '/index.html')));
      if (!path.startsWith(root + sep)) { res.writeHead(403); return res.end(); }
      const body = await readFile(path); res.writeHead(200, { 'Content-Type': mime[extname(path)] ?? 'application/octet-stream' }); res.end(req.method === 'HEAD' ? undefined : body);
    } catch (error) { res.writeHead(error.code === 'ENOENT' ? 404 : 500); res.end('Unable to serve request. Run npm run build first.'); }
  });
  server.listen(Number(process.env.PORT || 5173), '127.0.0.1', () => console.log(`Đảo Đèn Lồng: http://localhost:${server.address().port}`));
}
