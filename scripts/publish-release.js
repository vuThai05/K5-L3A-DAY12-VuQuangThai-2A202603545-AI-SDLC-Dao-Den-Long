// Explicitly run this after reviewing release/manifest.json and docs/release-notes.md.
// Git credentials stay only in memory; interactive sign-in is disabled.
import { spawnSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { createHash } from 'node:crypto';

try {
  const manifest = JSON.parse(await readFile('release/manifest.json', 'utf8')), bytes = await readFile(manifest.archive);
  if (createHash('sha256').update(bytes).digest('hex') !== manifest.sha256) throw new Error('Release archive differs from manifest; rebuild and review first.');
  const git = args => { const r = spawnSync('git', args, { encoding: 'utf8', env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'Never' } }); if (r.status !== 0) throw new Error(`Git failed: ${args[0]}`); return r.stdout.trim(); };
  const remote = git(['remote', 'get-url', 'origin']), repo = remote.match(/github\.com[:/]([\w.-]+\/[\w.-]+?)(?:\.git)?$/)?.[1];
  if (!repo) throw new Error('origin must identify the intended GitHub repository');
  const credential = spawnSync('git', ['credential', 'fill'], { input: 'protocol=https\nhost=github.com\n\n', encoding: 'utf8', env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'Never' } });
  const token = credential.status === 0 && credential.stdout.split('\n').find(line => line.startsWith('password='))?.slice(9).trim();
  if (!token) throw new Error('No stored GitHub credential is available. Sign in with Git Credential Manager, then rerun this command.');
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2026-03-10', 'User-Agent': 'dao-den-long-release' };
  async function api(path, method = 'GET', body) {
    const response = await fetch(`https://api.github.com/repos/${repo}${path}`, { method, headers: { ...headers, 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) });
    if (response.status === 404) return null; const result = await response.json(); if (!response.ok) throw new Error(`GitHub ${response.status}: ${result.message}`); return result;
  }
  const repository = await api(''); if (!repository) throw new Error('Repository unavailable');
  for (const tag of ['phase-1', 'phase-2', 'phase-3', 'phase-4', 'v1.0.0']) git(['rev-parse', '--verify', `refs/tags/${tag}`]);
  git(['push', 'origin', 'HEAD:refs/heads/main', 'refs/tags/phase-1', 'refs/tags/phase-2', 'refs/tags/phase-3', 'refs/tags/phase-4', 'refs/tags/v1.0.0']);
  const releases = await api('/releases?per_page=100');
  let release = releases?.find(r => r.tag_name === 'v1.0.0') ?? await api('/releases/tags/v1.0.0');
  if (!release) release = await api('/releases', 'POST', { tag_name: 'v1.0.0', name: 'Đảo Đèn Lồng v1.0.0', body: await readFile('docs/release-notes.md', 'utf8'), draft: true, prerelease: false });
  if (!release.draft) throw new Error('A published v1.0.0 already exists; left it unchanged.');
  const name = basename(manifest.archive), existing = release.assets.find(a => a.name === name);
  if (existing) {
    const response = await fetch(`https://api.github.com/repos/${repo}/releases/assets/${existing.id}`, { headers: { ...headers, Accept: 'application/octet-stream' } });
    if (!response.ok || createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex') !== manifest.sha256) throw new Error('An existing release asset differs; no asset was deleted.');
  } else {
    const url = new URL(release.upload_url.replace(/\{.*$/, '')); if (url.hostname !== 'uploads.github.com') throw new Error('Unexpected upload host'); url.searchParams.set('name', name);
    const response = await fetch(url, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/zip' }, body: bytes }); if (!response.ok) throw new Error(`Release asset upload failed: ${response.status}`);
  }
  const result = { draft: true, repository_public: !repository.private, release_url: release.html_url, release_id: release.id, asset: name, sha256: manifest.sha256 };
  await writeFile('release/published-draft.json', JSON.stringify(result, null, 2) + '\n'); console.log(JSON.stringify(result));
} catch (error) { console.error(error.message); process.exitCode = 1; }
