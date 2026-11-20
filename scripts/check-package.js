import { spawnSync, spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import { resolve, join, sep, basename } from 'node:path';
import assert from 'node:assert/strict';
await mkdir('tmp', { recursive: true }); const tempRoot = resolve('tmp'), dir = await mkdtemp(join(tempRoot, 'release-check-'));
let server;
try {
  const script = 'import sys,zipfile; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])';
  const result = spawnSync(process.platform === 'win32' ? 'python' : 'python3', ['-c', script, resolve('release/dao-den-long-v1.0.0.zip'), dir], { encoding: 'utf8' }); assert.equal(result.status, 0, result.stderr);
  const cwd = join(dir, 'dao-den-long-v1.0.0');
  const run = spawnSync(process.execPath, ['src/headless.js', '--seed', '12', '--night', '1', '--ticks', '60', '--out', 'out.jsonl'], { cwd, encoding: 'utf8' }); assert.equal(run.status, 0, run.stderr);
  const end = JSON.parse((await readFile(join(cwd, 'out.jsonl'), 'utf8')).trim().split('\n').at(-1)); assert.equal(end.ticks, 60);
  server = spawn(process.execPath, ['scripts/serve.js'], { cwd, env: { ...process.env, PORT: '0', LANTERN_DATA_DIR: join(dir, 'data') }, stdio: 'pipe' });
  const [chunk] = await once(server.stdout, 'data'), port = chunk.toString().match(/localhost:(\d+)/)?.[1]; assert.ok(port);
  for (const path of ['/', '/benchmark.html', '/src/scene.js', '/src/leaderboard.js', '/src/controls.js', '/vendor/three.module.js']) assert.equal((await fetch(`http://127.0.0.1:${port}${path}`)).status, 200, path);
  const report = { verified_at: new Date().toISOString(), package: 'dao-den-long-v1.0.0.zip', dependencies_installed_in_extracted_folder: false, headless: 'passed', static_http_modules: 'passed', browser_opened: false };
  await writeFile('docs/proof/phase-4/package-check.json', JSON.stringify(report, null, 2) + '\n'); console.log('Extracted release runs headless and serves all modules without npm install.');
} finally {
  if (server) { const stopped = once(server, 'exit'); server.kill(); await stopped; }
  if (dir.startsWith(tempRoot + sep) && basename(dir).startsWith('release-check-')) await rm(dir, { recursive: true, force: true });
}
