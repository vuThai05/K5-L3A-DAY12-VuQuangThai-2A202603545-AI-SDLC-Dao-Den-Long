import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, mkdtemp, rm, access } from 'node:fs/promises';
import { resolve, join, dirname, extname, sep, basename } from 'node:path';
import { tmpdir, platform, release } from 'node:os';
import { spawn, spawnSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { randomUUID } from 'node:crypto';

const started = Date.now(); let args;
try {
  args = parseArgs({ options: Object.fromEntries(['seed', 'duration', 'out', 'browser'].map(k => [k, { type: 'string' }])) }).values;
  if (!/^-?\d+$/.test(args.seed ?? '') || !Number.isSafeInteger(Number(args.seed)) || !Number.isFinite(Number(args.duration)) || Number(args.duration) <= 0 || Number(args.duration) > 3600 || !args.out) throw new Error('Use --seed <int> --duration <seconds> --out <bench.json> [--browser <Chrome/Edge executable>]');
} catch (error) { console.error(error.message); process.exit(2); }
let browser, server, profile, timeout;
try {
  const candidates = args.browser ? [args.browser] : platform() === 'win32' ? [
    join(process.env.PROGRAMFILES || 'C:/Program Files', 'Google/Chrome/Application/chrome.exe'),
    join(process.env['PROGRAMFILES(X86)'] || 'C:/Program Files (x86)', 'Microsoft/Edge/Application/msedge.exe'),
    join(process.env.LOCALAPPDATA || '', 'Google/Chrome/Application/chrome.exe')
  ] : platform() === 'darwin' ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'] : ['chromium', 'chromium-browser', 'google-chrome', 'microsoft-edge'].map(name => spawnSync('which', [name], { encoding: 'utf8' }).stdout?.trim()).filter(Boolean);
  let executable;
  for (const path of candidates) { try { await access(path); executable = path; break; } catch {} }
  if (!executable) throw new Error('Chrome/Edge not found. Pass --browser <executable>. This benchmark needs a visible GPU-backed window.');
  const root = resolve('dist'); await access(join(root, 'benchmark.html'));
  const token = randomUUID(); let fulfill, reject;
  const completed = new Promise((yes, no) => { fulfill = yes; reject = no; });
  server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (req.method === 'POST' && url.pathname === `/benchmark-result/${token}`) {
        let text = ''; for await (const chunk of req) { text += chunk; if (text.length > 65536) throw new Error('Report too large'); }
        const report = JSON.parse(text); res.writeHead(200); res.end('OK');
        if (report.error) reject(new Error(report.error));
        else if (report.contract_version !== '1.3' || !Number.isInteger(report.frames) || report.frames < 1 || ['avg_fps', 'p1_low_fps', 'frame_ms_p95', 'load_ms'].some(k => !Number.isFinite(report[k]) || report[k] < 0)) reject(new Error('Invalid benchmark report'));
        else fulfill(report); return;
      }
      if (req.method !== 'GET') { res.writeHead(405); return res.end(); }
      const path = resolve(root, '.' + decodeURIComponent(url.pathname));
      if (!path.startsWith(root + sep)) { res.writeHead(403); return res.end(); }
      const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
      const body = await readFile(path); res.writeHead(200, { 'Content-Type': mime[extname(path)] ?? 'application/octet-stream' }); res.end(body);
    } catch { if (!res.headersSent) res.writeHead(400); res.end(); }
  });
  await new Promise((yes, no) => { server.once('error', no); server.listen(0, '127.0.0.1', yes); });
  profile = await mkdtemp(join(tmpdir(), 'lantern-bench-'));
  const query = new URLSearchParams({ seed: args.seed, duration: args.duration, token, started: String(started), os: `${platform()} ${release()}` });
  const url = `http://127.0.0.1:${server.address().port}/benchmark.html?${query}`;
  console.log(`Benchmark 1280×720: warmup 3s + ${args.duration}s measurement. Keep its window visible; vsync remains browser controlled.`);
  browser = spawn(executable, [`--app=${url}`, '--window-size=1280,720', '--force-device-scale-factor=1', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check'], { stdio: 'ignore' });
  browser.once('error', reject); browser.once('exit', () => reject(new Error('Benchmark window closed before completion')));
  timeout = setTimeout(() => reject(new Error('Benchmark timed out; no report written')), (Number(args.duration) + 45) * 1000);
  const report = await completed; await mkdir(dirname(resolve(args.out)), { recursive: true }); await writeFile(args.out, JSON.stringify(report, null, 2) + '\n'); console.log(`Saved ${args.out}`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally {
  clearTimeout(timeout); browser?.kill(); server?.closeAllConnections(); if (server) await new Promise(yes => server.close(yes));
  if (profile && resolve(profile).startsWith(resolve(tmpdir()) + sep) && basename(profile).startsWith('lantern-bench-')) await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }).catch(() => {});
}
