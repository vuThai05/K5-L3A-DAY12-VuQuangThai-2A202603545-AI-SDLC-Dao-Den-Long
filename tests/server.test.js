import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

test('web server serves the built game and local Three.js modules', { timeout: 10000 }, async () => {
  // Build is required for the HTTP smoke check, just as documented for a clean checkout.
  const build = spawn(process.execPath, ['scripts/build.js'], { stdio: 'pipe' });
  const [code] = await once(build, 'exit'); assert.equal(code, 0);
  const dir = await mkdtemp(join(tmpdir(), 'lantern-http-')), env = { ...process.env, PORT: '0', LANTERN_DATA_DIR: dir };
  const server = spawn(process.execPath, ['scripts/serve.js'], { env, stdio: 'pipe' });
  try {
    const [chunk] = await once(server.stdout, 'data');
    const port = chunk.toString().match(/localhost:(\d+)/)?.[1]; assert.ok(port);
    const root = `http://127.0.0.1:${port}`;
    for (const path of ['/', '/benchmark.html', '/style.css', '/src/main.js', '/src/scene.js', '/src/audio.js', '/src/game.js', '/src/levels.js', '/src/validation.js', '/src/controls.js', '/src/leaderboard.js', '/src/benchmark.js', '/src/benchmark-client.js', '/src/config.js', '/vendor/three.module.js', '/vendor/three.core.js']) {
      const response = await fetch(root + path); assert.equal(response.status, 200, path);
      const text = await response.text(); assert.ok(text.length > 20, path);
      if (path.endsWith('.js')) assert.match(response.headers.get('content-type'), /javascript/);
      if (path === '/src/config.js') assert.doesNotMatch(text, /node:fs/);
    }
    assert.equal((await fetch(root + '/missing')).status, 404);
    assert.equal((await fetch(root + '/..%2fpackage.json')).status, 403);
    const data = { name: 'Thai_001', score: 1234, nights_won: 2, seed: 12 };
    const options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) };
    let response = await fetch(root + '/api/leaderboard', options); assert.equal(response.status, 200); const board = await response.json(); assert.equal(board.entries[0].score, 1234);
    assert.equal((await fetch(root + '/api/leaderboard', { ...options, headers: { ...options.headers, Origin: 'https://example.com' } })).status, 403);
    assert.equal((await fetch(root + '/api/leaderboard', { ...options, body: JSON.stringify({ ...data, name: '<script>' }) })).status, 400);
    assert.equal((await fetch(root + '/api/leaderboard', { ...options, body: '{' })).status, 400);
    const out = join(dir, 'export.json'), exported = spawnSync(process.execPath, ['scripts/serve.js', '--export-leaderboard', out], { env, encoding: 'utf8' });
    assert.equal(exported.status, 0, exported.stderr); assert.deepEqual(JSON.parse(await readFile(out, 'utf8')), board);
  } finally { server.kill(); await rm(dir, { recursive: true, force: true }); }
});
