import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { topTen, validateEntry } from '../src/leaderboard.js';

export function leaderboardStore(path = resolve(process.env.LANTERN_DATA_DIR || 'data', 'leaderboard.json')) {
  let pending = Promise.resolve();
  async function read() {
    try { return { entries: topTen(JSON.parse(await readFile(path, 'utf8')).entries) }; }
    catch (error) { if (error.code === 'ENOENT') return { entries: [] }; throw error; }
  }
  function add(input) {
    const entry = validateEntry({ ...input, achieved_at: new Date().toISOString() });
    const operation = pending.catch(() => {}).then(async () => {
      const entries = topTen([...(await read()).entries, entry]); await mkdir(dirname(path), { recursive: true });
      await writeFile(path + '.tmp', JSON.stringify({ entries }, null, 2) + '\n'); await rename(path + '.tmp', path); return { entries };
    });
    pending = operation; return operation;
  }
  return { read: async () => { await pending.catch(() => {}); return read(); }, add };
}
