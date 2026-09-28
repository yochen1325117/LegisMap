import { readFileSync, writeFileSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { listManifests, loadVersion, readJson, root } from './workflow-utils.mjs';

const roster = JSON.parse(readFileSync('data/research/ly11-2026.json', 'utf8'));
const data = JSON.parse(readFileSync('data/research/shared-events-2026.json', 'utf8'));
const workflow = JSON.parse(readFileSync('data/research/workflow/research-status-2026.json', 'utf8'));
const events = new Map(data.events.map(event => [event.id, event]));
const sources = new Map(data.sources.map(source => [source.id, source]));
const workflowByMember = new Map(workflow.members.map(item => [item.memberId, item]));
const rows = roster.members.map(member => {
  const links = data.participations.filter(item => item.memberId === member.id);
  const count = type => links.filter(item => events.get(item.eventId)?.type === type).length;
  const sourceIds = new Set(links.flatMap(item => [...(item.sourceIds ?? []), ...(events.get(item.eventId)?.sourceIds ?? [])]));
  return {
    memberId: member.id, name: member.name, seatType: member.seatType, regionName: member.regionName,
    bills: count('bill'), budgets: count('budget_oversight'), questions: count('questioning'),
    oversight: count('administrative_oversight'), namedVotes: count('named_vote'),
    publicEvents: links.filter(item => events.get(item.eventId)?.visibility === 'public').length,
    newsSources: [...sourceIds].filter(id => sources.get(id)?.sourceType === 'news').length,
    researchStatus: workflowByMember.get(member.id)?.status ?? workflow.defaultStatus,
  };
});
const coverage = key => rows.filter(row => row[key] > 0).length;
const manifests = listManifests(); let primaryLocked=0, independentLocked=0, candidateTotal=0, matched=0, unilateral=0, differences=0, decisions=0, comparisonTotal=0;
for (const manifest of manifests) {
  const primary=loadVersion('primary',manifest), independent=loadVersion('independent',manifest);
  if(primary?.lockedAt) primaryLocked += manifest.memberIds.length;
  if(independent?.lockedAt) independentLocked += manifest.memberIds.length;
  candidateTotal += (primary?.candidates?.length ?? 0) + (independent?.candidates?.length ?? 0);
  const comparisonPath=`${root}/comparisons/${manifest.batchId}.json`, adjudicationPath=`${root}/adjudications/${manifest.batchId}.json`;
  if(existsSync(comparisonPath)) for(const item of readJson(comparisonPath).comparisons ?? []) { comparisonTotal++; if(item.matchStatus==='matched') matched++; if(['primary_only','independent_only'].includes(item.matchStatus)) unilateral++; if(item.matchStatus!=='matched'||item.differenceTypes?.length) differences++; }
  if(existsSync(adjudicationPath)) decisions += new Set((readJson(adjudicationPath).records ?? []).flatMap(item=>item.comparisonIds)).size;
}
const freshnessCutoff=new Date(); freshnessCutoff.setUTCDate(freshnessCutoff.getUTCDate()-30);
const staleSources=data.sources.filter(source=>!source.lastVerifiedAt || source.lastVerifiedAt < freshnessCutoff.toISOString().slice(0,10)).length;
const rechecks=manifests.map(manifest=>`${root}/source-rechecks/${manifest.batchId}.json`).filter(existsSync).map(readJson);
const output = {
  generatedAt: data.generatedAt, memberCount: rows.length,
  coverage: { bills: coverage('bills'), budgets: coverage('budgets'), questions: coverage('questions'), namedVotes: coverage('namedVotes'), newsSources: coverage('newsSources') },
  workflow: {
    complete: rows.filter(row => row.researchStatus === 'complete').length,
    stale: rows.filter(row => row.researchStatus === 'stale').length,
    inProgress: rows.filter(row => !['complete', 'stale', 'not_started'].includes(row.researchStatus)).length,
    notStarted: rows.filter(row => row.researchStatus === 'not_started').length,
    primaryCompletionRate: primaryLocked / rows.length,
    independentCompletionRate: independentLocked / rows.length,
    candidateOverlapRate: comparisonTotal ? matched / comparisonTotal : 0,
    unilateralDiscoveryRate: comparisonTotal ? unilateral / comparisonTotal : 0,
    adjudicationCompletionRate: differences ? Math.min(1, decisions / differences) : 1,
    candidateCount: candidateTotal,
    staleSourceCount: staleSources,
    confirmedStaleSourceCount: rechecks.reduce((sum,item)=>sum+(item.staleCount??0),0),
    indeterminateSourceCount: rechecks.reduce((sum,item)=>sum+(item.indeterminateCount??0),0)
  },
  members: rows,
};
writeFileSync('data/research/coverage-2026.json', `${JSON.stringify(output, null, 2)}\n`);
console.log(`Coverage — bills ${output.coverage.bills}/120, budgets ${output.coverage.budgets}/120, questions ${output.coverage.questions}/120, named votes ${output.coverage.namedVotes}/120.`);
