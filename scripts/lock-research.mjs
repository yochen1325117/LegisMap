import { readFileSync, writeFileSync } from 'node:fs';
import { versionHash, versionPath } from './workflow-utils.mjs';

const [track, batchId, versionId] = process.argv.slice(2);
if (!['primary','independent'].includes(track) || !batchId || !versionId) throw new Error('Usage: npm run data:lock:research -- <primary|independent> <batchId> <versionId>');
const file = versionPath(track, batchId, versionId); const version = JSON.parse(readFileSync(file, 'utf8'));
if (version.lockedAt) throw new Error(`${file} is already locked; create a new version instead`);
version.lockedAt = new Date().toISOString(); version.contentHash = versionHash(version);
writeFileSync(file, `${JSON.stringify(version,null,2)}\n`); console.log(`Locked ${track} ${batchId} ${versionId}: ${version.contentHash}`);
