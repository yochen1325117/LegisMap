import { existsSync } from 'node:fs';
import { decisions, readJson, listManifests, loadVersion, required, root, statuses, validateDraftVersion, validateVersion, versionPath, validDate } from './workflow-utils.mjs';
import { validateAdjudicationDraft } from './adjudication-draft-utils.mjs';

const roster = readJson('data/research/ly11-2026.json');
const rosterIds = new Set(roster.members.map(member => member.id));
const matrix = readJson(`${root}/matrix.json`);
const seenMembers = new Set();
for (const manifest of listManifests()) {
  if (!statuses.has(manifest.status) || !validDate(manifest.periodStart) || !validDate(manifest.periodEnd)) throw new Error(`${manifest.batchId} invalid manifest`);
  for (const id of manifest.memberIds) { if (!rosterIds.has(id)) throw new Error(`${manifest.batchId} unknown member ${id}`); if (seenMembers.has(id)) throw new Error(`${id} appears in multiple workflow batches`); seenMembers.add(id); }
  for (const track of ['primary','independent']) {
    const id = manifest[`${track}VersionId`];
    if (id && !existsSync(versionPath(track, manifest.batchId, id))) throw new Error(`${manifest.batchId} missing ${track} version ${id}`);
    const version = loadVersion(track, manifest);
    if (version) version.lockedAt ? validateVersion(version, track, manifest, matrix, rosterIds) : validateDraftVersion(version, track, manifest);
  }
  const comparisonFile = `${root}/comparisons/${manifest.batchId}.json`;
  const draftFile = `${root}/adjudications/${manifest.batchId}.draft.json`;
  if (existsSync(draftFile)) {
    const draft=readJson(draftFile);
    const draftComparisonFile=`${root}/comparisons/${manifest.batchId}.json`;
    if(!existsSync(draftComparisonFile)) throw new Error(`${manifest.batchId} adjudication draft exists without comparisons`);
    validateAdjudicationDraft(draft,manifest,readJson(draftComparisonFile));
  }
  if (existsSync(comparisonFile) && (!loadVersion('primary', manifest)?.lockedAt || !loadVersion('independent', manifest)?.lockedAt)) throw new Error(`${manifest.batchId} comparison exists before both versions are locked`);
  if (existsSync(comparisonFile)) {
    const comparison = readJson(comparisonFile); const primary = loadVersion('primary', manifest); const independent = loadVersion('independent', manifest);
    if (comparison.primaryVersionId !== primary.versionId || comparison.independentVersionId !== independent.versionId) throw new Error(`${manifest.batchId} comparison uses obsolete versions`);
    const primaryIds = new Set(primary.candidates.map(item => item.id)); const independentIds = new Set(independent.candidates.map(item => item.id));
    const comparedPrimary = new Set(); const comparedIndependent = new Set();
    for (const item of comparison.comparisons) {
      if (item.primaryCandidateId && !primaryIds.has(item.primaryCandidateId)) throw new Error(`${item.id} unknown primary candidate`);
      if (item.independentCandidateId && !independentIds.has(item.independentCandidateId)) throw new Error(`${item.id} unknown independent candidate`);
      if (item.primaryCandidateId && comparedPrimary.has(item.primaryCandidateId)) throw new Error(`${item.primaryCandidateId} appears in multiple comparisons`);
      if (item.independentCandidateId && comparedIndependent.has(item.independentCandidateId)) throw new Error(`${item.independentCandidateId} appears in multiple comparisons`);
      if (item.primaryCandidateId) comparedPrimary.add(item.primaryCandidateId);
      if (item.independentCandidateId) comparedIndependent.add(item.independentCandidateId);
      if (!['matched','primary_only','independent_only','possible_match'].includes(item.matchStatus)) throw new Error(`${item.id} invalid match status`);
    }
    for (const id of primaryIds) if (!comparedPrimary.has(id)) throw new Error(`${id} is missing from comparisons`);
    for (const id of independentIds) if (!comparedIndependent.has(id)) throw new Error(`${id} is missing from comparisons`);
    const adjudicationFile = `${root}/adjudications/${manifest.batchId}.json`;
    if (existsSync(adjudicationFile)) {
      const adjudication = readJson(adjudicationFile); const comparisonIds = new Set(comparison.comparisons.map(item => item.id)); const decided = new Set();
      const sourceIds = new Set([...primary.sources, ...independent.sources, ...(adjudication.additionalSources ?? [])].map(item => item.id));
      for (const record of adjudication.records) {
        if (!decisions.has(record.decision)) throw new Error(`${record.id} invalid adjudication decision`);
        required(record.reason, `${record.id} reason`); required(record.decidedBy, `${record.id} decidedBy`);
        if (!validDate(record.decidedAt)) throw new Error(`${record.id} invalid decidedAt`);
        for (const id of new Set(record.comparisonIds)) { if (!comparisonIds.has(id)) throw new Error(`${record.id} unknown comparison ${id}`); if(decided.has(id)) throw new Error(`${id} has multiple adjudication decisions`); decided.add(id); }
        for (const id of record.additionalSourceIds ?? []) if (!sourceIds.has(id)) throw new Error(`${record.id} unknown additional source ${id}`);
        if (['publish','merge'].includes(record.decision) && !record.finalEventId) throw new Error(`${record.id} needs finalEventId`);
      }
      const unresolved = comparison.comparisons.filter(item => item.matchStatus !== 'matched' || item.differenceTypes.length).filter(item => !decided.has(item.id));
      if (manifest.status === 'complete' && unresolved.length) throw new Error(`${manifest.batchId} complete with unresolved comparisons`);
      if (manifest.status === 'complete' && adjudication.records.some(item => item.decision === 'needs_more_evidence')) throw new Error(`${manifest.batchId} complete with evidence gaps`);
    } else if (manifest.status === 'complete') throw new Error(`${manifest.batchId} complete without adjudication record`);
  } else if (manifest.status === 'complete') throw new Error(`${manifest.batchId} complete without comparison`);
}
const status = readJson(`${root}/research-status-2026.json`);
for (const item of status.members) { if (!rosterIds.has(item.memberId) || !statuses.has(item.status)) throw new Error(`invalid research status ${item.memberId}`); }
console.log(`Validated workflow matrix, ${listManifests().length} batch manifests, and ${status.members.length || rosterIds.size} research statuses.`);
