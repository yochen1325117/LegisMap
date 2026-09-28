import { writeFileSync } from 'node:fs';
import { buildResearchQueue } from './research-queue.mjs';
import { root } from './workflow-utils.mjs';

const { members } = buildResearchQueue();
const output = {
  schemaVersion: '1.0.0', generatedAt: new Date().toISOString(),
  summary: {
    complete: members.filter(item => item.status === 'complete').length,
    remaining: members.filter(item => item.status !== 'complete').length,
    unassigned: members.filter(item => item.status !== 'complete' && !item.batchId).length,
    unresolved: members.reduce((sum,item) => sum + item.unresolvedCount, 0)
  },
  members: members.map(({ regionOrder, ...item }) => item)
};
writeFileSync(`${root}/research-queue-2026.json`, `${JSON.stringify(output,null,2)}\n`);
console.log(`Research queue — ${output.summary.complete} complete, ${output.summary.remaining} remaining, ${output.summary.unassigned} unassigned.`);
