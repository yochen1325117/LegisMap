import { existsSync, writeFileSync } from 'node:fs';
import { listManifests, loadVersion, readJson, root } from './workflow-utils.mjs';

const roster = readJson('data/research/ly11-2026.json'); const current = readJson(`${root}/research-status-2026.json`);
const shared = existsSync('data/research/shared-events-2026.json') ? readJson('data/research/shared-events-2026.json') : { memberReviews:[] };
const legacyDates = new Map(shared.memberReviews.map(item => [item.memberId, item.reviewedAt]));
const explicit = new Map(current.members.map(item => [item.memberId,item])); const byMember = new Map();
for (const manifest of listManifests()) for (const id of manifest.memberIds) byMember.set(id, manifest);
const members = roster.members.map(member => {
  const manifest = byMember.get(member.id); const saved = explicit.get(member.id);
  if (!manifest) return saved ?? { memberId:member.id, status:current.defaultStatus, legacyReviewedAt:legacyDates.get(member.id) ?? null, primaryReviewedAt:null, independentReviewedAt:null, completedAt:null };
  const primary = loadVersion('primary', manifest); const independent = loadVersion('independent', manifest);
  const recheckPath = `${root}/source-rechecks/${manifest.batchId}.json`;
  const recheck = existsSync(recheckPath) ? readJson(recheckPath) : null;
  const comparisonPath = `${root}/comparisons/${manifest.batchId}.json`; const adjudicationPath = `${root}/adjudications/${manifest.batchId}.json`;
  let status = manifest.status;
  if (!primary) status = status === 'not_started' ? 'stale' : status;
  else if (!primary.lockedAt) status = 'primary_in_progress';
  else if (!independent) status = 'awaiting_independent_review';
  else if (!independent.lockedAt) status = 'independent_in_progress';
  else if (!existsSync(comparisonPath)) status = 'awaiting_adjudication';
  else if (!existsSync(adjudicationPath)) status = 'awaiting_adjudication';
  else {
    const comparison = readJson(comparisonPath); const adjudication = readJson(adjudicationPath); const decided = new Set(adjudication.records.flatMap(item => item.comparisonIds));
    const unresolved = comparison.comparisons.some(item => (item.matchStatus !== 'matched' || item.differenceTypes.length) && !decided.has(item.id));
    const evidenceGap = adjudication.records.some(item => item.decision === 'needs_more_evidence');
    status = evidenceGap ? 'needs_followup' : unresolved ? 'awaiting_adjudication' : 'complete';
    const staleRecheck = recheck?.staleCount > 0;
    if (staleRecheck && status === 'complete') status = 'needs_followup';
  }
  return { memberId:member.id, status, legacyReviewedAt:saved?.legacyReviewedAt ?? legacyDates.get(member.id) ?? null, primaryReviewedAt:primary?.researchedAt ?? null, independentReviewedAt:independent?.researchedAt ?? null, completedAt:status==='complete' ? readJson(adjudicationPath).decidedAt : null };
});
const output={ schemaVersion:'1.0.0', generatedAt:new Date().toISOString().slice(0,10), defaultStatus:'stale', members };
writeFileSync(`${root}/research-status-2026.json`, `${JSON.stringify(output,null,2)}\n`); console.log(`Reported workflow status for ${members.length} members.`);
