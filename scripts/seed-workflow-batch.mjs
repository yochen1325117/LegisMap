import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { listManifests, root } from './workflow-utils.mjs';

const [batchId, versionId, performedBy = 'primary-research'] = process.argv.slice(2);
if (!batchId || !versionId) throw new Error('Usage: npm run data:seed:research -- <batchId> <versionId> [performedBy]');
const manifest = listManifests().find(item => item.batchId === batchId);
if (!manifest) throw new Error(`Unknown workflow batch ${batchId}`);
const shared = JSON.parse(readFileSync('data/research/shared-events-2026.json','utf8'));
const events = new Map(shared.events.map(event => [event.id,event])); const sources = new Map(shared.sources.map(source => [source.id,source]));
const candidates = shared.participations.filter(item => manifest.memberIds.includes(item.memberId) && events.get(item.eventId)?.type !== 'named_vote').map(participation => {
  const event = events.get(participation.eventId); const sourceIds = [...new Set([...event.sourceIds,...participation.sourceIds])];
  return {
    id:`primary-${event.id}-${participation.memberId}`, track:'primary', memberIds:[participation.memberId], provisionalCategory:event.category,
    title:event.title, summary:participation.actionSummary, occurredAt:event.occurredAt, officialId:event.officialId,
    sourceIds, canonicalSourceUrls:sourceIds.map(id => sources.get(id)?.url).filter(Boolean), roleClaims:[participation.roleType],
    status:'verified', missingEvidence:[], personResponse:event.personResponse, processStatus:event.processStatus,
    resultStatus:event.resultStatus, evidenceLevel:event.evidenceLevel, publicationDecision:event.visibility === 'public' ? 'publish' : 'withhold',
    possibleDuplicateOf:null, rejectionReason:null, versionId
  };
});
const output={ schemaVersion:'1.0.0', track:'primary', batchId, versionId, performedBy, researchedAt:new Date().toISOString().slice(0,10), lockedAt:null, contentHash:null, searchRuns:[], candidates,
  sources:[...new Set(candidates.flatMap(item => item.sourceIds))].map(id => sources.get(id)).filter(Boolean) };
const dir=`${root}/primary/${batchId}`; mkdirSync(dir,{recursive:true}); writeFileSync(`${dir}/${versionId}.json`,`${JSON.stringify(output,null,2)}\n`);
console.log(`Seeded ${candidates.length} existing candidates for ${batchId} in ${versionId}.`);
