import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { nextUnassignedMembers } from './research-queue.mjs';
import { root, validDate } from './workflow-utils.mjs';

const args = process.argv.slice(2); const value = flag => { const index=args.indexOf(flag); return index >= 0 ? args[index+1] : undefined; };
const periodEnd = value('--date') ?? new Date().toISOString().slice(0,10);
const size = Number(value('--size') ?? 4); const requestedId = value('--batch-id');
if (!validDate(periodEnd)) throw new Error('--date must use YYYY-MM-DD');
if (!Number.isInteger(size) || size < 1 || size > 4) throw new Error('--size must be an integer from 1 to 4');
const members = nextUnassignedMembers(size); if (!members.length) throw new Error('No unassigned members remain');
const compactDate = periodEnd.replaceAll('-','');
const dryRun=args.includes('--dry-run');
const batchId = requestedId ?? `research-${compactDate}-${members[0].memberId.replace('ly11-','')}`;
if (!/^[a-z0-9-]+$/.test(batchId)) throw new Error('--batch-id may contain lowercase letters, numbers, and hyphens');
const path = `${root}/batches/${batchId}/manifest.json`; if (existsSync(path)) throw new Error(`Batch ${batchId} already exists`);
const start = new Date(`${periodEnd}T00:00:00Z`); start.setUTCFullYear(start.getUTCFullYear()-5);
const baselineCommit = execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const manifest = { schemaVersion:'1.0.0', batchId, memberIds:members.map(item => item.memberId), periodStart:start.toISOString().slice(0,10), periodEnd, baselineCommit, primaryVersionId:null, independentVersionId:null, status:'not_started' };
if(!dryRun){ mkdirSync(`${root}/batches/${batchId}`,{recursive:true}); writeFileSync(path,`${JSON.stringify(manifest,null,2)}\n`); }
console.log(`${dryRun?'Preview':'Created'} ${batchId}: ${members.map(item => item.name).join('、')}`);
