import { mkdirSync, writeFileSync } from 'node:fs';
import { canonicalUrl, listManifests, loadVersion, root } from './workflow-utils.mjs';

const differences = ['provisionalCategory','memberIds','roleClaims','occurredAt','processStatus','resultStatus','evidenceLevel','publicationDecision','personResponse'];
const same = (a, b) => JSON.stringify(Array.isArray(a) ? [...a].sort() : a) === JSON.stringify(Array.isArray(b) ? [...b].sort() : b);
for (const manifest of listManifests()) {
  const primary = loadVersion('primary', manifest); const independent = loadVersion('independent', manifest);
  if (!primary || !independent) continue;
  if (!primary.lockedAt || !independent.lockedAt) throw new Error(`${manifest.batchId} versions must be locked before comparison`);
  const unused = new Set(independent.candidates.map(item => item.id)); const comparisons = [];
  for (const left of primary.candidates) {
    const right = independent.candidates.find(item => unused.has(item.id) && left.officialId && item.officialId === left.officialId)
      ?? independent.candidates.find(item => unused.has(item.id) && item.occurredAt === left.occurredAt && item.memberIds.some(id => left.memberIds.includes(id)) && item.canonicalSourceUrls.some(url => new Set(left.canonicalSourceUrls.map(canonicalUrl)).has(canonicalUrl(url))));
    if (right) { unused.delete(right.id); const diff = differences.filter(key => !same(left[key], right[key])); comparisons.push({ id:`comparison-${left.id}-${right.id}`, primaryCandidateId:left.id, independentCandidateId:right.id, matchStatus:diff.length?'possible_match':'matched', differenceTypes:diff, comparedAt:new Date().toISOString().slice(0,10) }); }
    else comparisons.push({ id:`comparison-${left.id}`, primaryCandidateId:left.id, independentCandidateId:null, matchStatus:'primary_only', differenceTypes:[], comparedAt:new Date().toISOString().slice(0,10) });
  }
  for (const id of unused) comparisons.push({ id:`comparison-${id}`, primaryCandidateId:null, independentCandidateId:id, matchStatus:'independent_only', differenceTypes:[], comparedAt:new Date().toISOString().slice(0,10) });
  const output = { schemaVersion:'1.0.0', batchId:manifest.batchId, primaryVersionId:primary.versionId, independentVersionId:independent.versionId, comparisons };
  mkdirSync(`${root}/comparisons`, { recursive:true }); writeFileSync(`${root}/comparisons/${manifest.batchId}.json`, `${JSON.stringify(output,null,2)}\n`);
  console.log(`Compared ${manifest.batchId}: ${comparisons.length} results.`);
}
