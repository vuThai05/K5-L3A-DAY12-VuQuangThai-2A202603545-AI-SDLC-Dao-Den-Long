import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

test('web server serves the built game and local Three.js modules', { timeout: 10000 }, async () => {
  // Build is required for the HTTP smoke check, just as documented for a clean checkout.
  const build = spawn(process.execPath, ['scripts/build.js'], { stdio: 'pipe' });
  const [code] = await once(build, 'exit'); assert.equal(code, 0);
  const server = spawn(process.execPath, ['scripts/serve.js'], { env: { ...process.env, PORT: '0' }, stdio: 'pipe' });
  try {
    const [chunk] = await once(server.stdout, 'data');
    const port = chunk.toString().match(/localhost:(\d+)/)?.[1]; assert.ok(port);
    const root = `http://127.0.0.1:${port}`;
    for (const path of ['/', '/style.css', '/src/main.js', '/src/scene.js', '/src/audio.js', '/src/game.js', '/src/levels.js', '/src/validation.js', '/src/config.js', '/vendor/three.module.js', '/vendor/three.core.js']) {
      const response = await fetch(root + path); assert.equal(response.status, 200, path);
      const text = await response.text(); assert.ok(text.length > 20, path);
      if (path.endsWith('.js')) assert.match(response.headers.get('content-type'), /javascript/);
      if (path === '/src/config.js') assert.doesNotMatch(text, /node:fs/);
    }
    assert.equal((await fetch(root + '/missing')).status, 404);
    assert.equal((await fetch(root + '/..%2fpackage.json')).status, 403);
  } finally { server.kill(); }
});
