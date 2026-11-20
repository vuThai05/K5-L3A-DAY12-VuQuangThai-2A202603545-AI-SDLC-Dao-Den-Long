import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
mkdirSync('release', { recursive: true });
const archive = 'release/dao-den-long-v1.0.0.zip';
const code = `from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
roots=['dist','src','scripts','tests','docs']
files=[Path(n) for n in ['package.json','package-lock.json','game.contract.json','README.md','AGENTS.md','CHANGELOG.md','CREDITS.md','LICENSE']]
for root in roots:
 files.extend(p for p in Path(root).rglob('*') if p.is_file() and '__pycache__' not in p.parts)
with ZipFile('${archive}','w',ZIP_DEFLATED) as z:
 for p in sorted(files): z.write(p,'dao-den-long-v1.0.0/'+p.as_posix())
print('Packaged '+str(len(files))+' files')`;
const result = spawnSync(process.platform === 'win32' ? 'python' : 'python3', ['-c', code], { encoding: 'utf8' });
if (result.status !== 0) { console.error(result.stderr || result.error?.message); process.exit(1); }
const bytes = readFileSync(archive), sha256 = createHash('sha256').update(bytes).digest('hex');
writeFileSync('release/manifest.json', JSON.stringify({ version: '1.0.0', archive, bytes: bytes.length, sha256 }, null, 2) + '\n');
console.log(result.stdout.trim()); console.log(`${archive} (${bytes.length} bytes, SHA256 ${sha256})`);
