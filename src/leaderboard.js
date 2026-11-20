const NAME = /^[A-Za-z0-9_]{3,12}$/;
const ISO = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?(?:Z|[+-]\d\d:\d\d)$/;
export function validateEntry(entry) {
  if (!entry || typeof entry !== 'object' || !NAME.test(entry.name) || typeof entry.name !== 'string') throw new Error('Tên cần 3–12 ký tự A–Z, a–z, 0–9 hoặc _.');
  if (!Number.isSafeInteger(entry.score) || entry.score < 0 || !Number.isInteger(entry.nights_won) || entry.nights_won < 0 || entry.nights_won > 3 || !Number.isSafeInteger(entry.seed)) throw new Error('Điểm, số đêm hoặc seed không hợp lệ.');
  if (typeof entry.achieved_at !== 'string' || !ISO.test(entry.achieved_at) || !Number.isFinite(Date.parse(entry.achieved_at))) throw new Error('Ngày đạt điểm cần ISO 8601 có múi giờ.');
  return { name: entry.name, score: entry.score, nights_won: entry.nights_won, achieved_at: entry.achieved_at, seed: entry.seed };
}
export function topTen(entries) {
  if (!Array.isArray(entries)) throw new Error('Leaderboard entries must be an array');
  return entries.map(validateEntry).sort((a, b) => b.score - a.score || Date.parse(a.achieved_at) - Date.parse(b.achieved_at)).slice(0, 10);
}
export async function loadScores(storage, request = globalThis.fetch) {
  let response; try { response = await request('/api/leaderboard'); } catch {}
  if (response?.ok) return { entries: topTen((await response.json()).entries), disk: true };
  if (response?.status && ![404, 405].includes(response.status)) throw new Error('Không đọc được bảng điểm trên đĩa; dữ liệu cũ được giữ nguyên.');
  try { return { entries: topTen(JSON.parse(storage.getItem('lantern-leaderboard') ?? '[]')), disk: false }; }
  catch { return { entries: [], disk: false }; }
}
export async function saveScore(entry, storage, request = globalThis.fetch) {
  entry = validateEntry(entry);
  try {
    const response = await request('/api/leaderboard', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry) });
    if (response.ok) return { entries: topTen((await response.json()).entries), disk: true };
    if (response.status !== 404 && response.status !== 405) throw new Error('Không ghi được bảng điểm trên đĩa.');
  } catch (error) { if (error.message === 'Không ghi được bảng điểm trên đĩa.') throw error; }
  const current = await loadScores(storage, async () => ({ ok: false }));
  const entries = topTen([...current.entries, entry]); storage.setItem('lantern-leaderboard', JSON.stringify(entries)); return { entries, disk: false };
}
