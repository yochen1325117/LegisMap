import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

export const root = 'data/research/workflow';
export const statuses = new Set(['not_started','primary_in_progress','awaiting_independent_review','independent_in_progress','awaiting_adjudication','needs_followup','complete','stale']);
export const candidateStatuses = new Set(['discovered','needs_sources','needs_response','verified','merged','rejected','out_of_scope']);
export const decisions = new Set(['publish','needs_more_evidence','merge','reject','out_of_scope']);
export const readJson = file => JSON.parse(readFileSync(file, 'utf8'));
export const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value ?? '') && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
export const required = (value, label) => { if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required`); };
export const canonicalUrl = value => { const url = new URL(value); url.hash = ''; ['utm_source','utm_medium','utm_campaign','fbclid'].forEach(key => url.searchParams.delete(key)); return url.toString(); };
export const versionHash = version => createHash('sha256').update(JSON.stringify({ ...version, contentHash: undefined })).digest('hex');
export const listManifests = () => {
  const dir = path.join(root, 'batches');
  return existsSync(dir) ? readdirSync(dir).map(name => path.join(dir, name, 'manifest.json')).filter(existsSync).map(readJson) : [];
};
export const versionPath = (track, batchId, versionId) => path.join(root, track, batchId, `${versionId}.json`);
export function loadVersion(track, manifest) {
  const versionId = manifest[`${track}VersionId`];
  return versionId ? readJson(versionPath(track, manifest.batchId, versionId)) : null;
}
export function validateDraftVersion(version, track, manifest) {
  if (version.track !== track || version.batchId !== manifest.batchId || version.versionId !== manifest[`${track}VersionId`]) throw new Error(`${manifest.batchId} ${track} draft identity mismatch`);
  required(version.performedBy, `${track} performedBy`);
  if (!validDate(version.researchedAt)) throw new Error(`${track} researchedAt is invalid`);
  if (version.lockedAt || version.contentHash) throw new Error(`${manifest.batchId} ${track} draft has partial lock metadata`);
  const allowedStatus = track === 'primary' ? 'primary_in_progress' : 'independent_in_progress';
  if (manifest.status !== allowedStatus) throw new Error(`${manifest.batchId} has unlocked ${track} version outside ${allowedStatus}`);
}
export function validateVersion(version, track, manifest, matrix, rosterIds) {
  if (version.track !== track || version.batchId !== manifest.batchId || version.versionId !== manifest[`${track}VersionId`]) throw new Error(`${manifest.batchId} ${track} version identity mismatch`);
  required(version.performedBy, `${track} performedBy`); required(version.lockedAt, `${track} lockedAt`);
  if (!validDate(version.researchedAt)) throw new Error(`${track} researchedAt is invalid`);
  if (version.contentHash !== versionHash(version)) throw new Error(`${track} locked version hash mismatch`);
  const candidateIds = new Set((version.candidates ?? []).map(candidate => candidate.id));
  const requirements = matrix.tracks[track];
  for (const memberId of manifest.memberIds) {
    if (!rosterIds.has(memberId)) throw new Error(`${manifest.batchId} unknown member ${memberId}`);
    const runs = (version.searchRuns ?? []).filter(run => run.memberId === memberId);
    for (const scope of requirements.sourceScopes) if (!runs.some(run => run.sourceScope === scope)) throw new Error(`${track} ${memberId} missing source scope ${scope}`);
    for (const family of requirements.queryFamilies) if (!runs.some(run => run.queryFamily === family)) throw new Error(`${track} ${memberId} missing query family ${family}`);
  }
  for (const run of version.searchRuns ?? []) {
    required(run.id, 'search run id'); required(run.query, `${run.id} query`); required(run.performedBy, `${run.id} performedBy`);
    if (run.track !== track || run.versionId !== version.versionId || !manifest.memberIds.includes(run.memberId)) throw new Error(`${run.id} has invalid ownership`);
    if (run.resultCountReviewed < matrix.minimumResultsPerQuery && run.stopReason !== 'fewer_results_available') throw new Error(`${run.id} reviewed fewer than ${matrix.minimumResultsPerQuery} results`);
    if (run.resultCountReviewed > matrix.maximumResultsPerQuery) throw new Error(`${run.id} exceeds maximum result depth`);
    for (const id of run.candidateIds) if (!candidateIds.has(id)) throw new Error(`${run.id} references unknown candidate ${id}`);
  }
  for (const candidate of version.candidates ?? []) {
    required(candidate.id, 'candidate id'); required(candidate.title, `${candidate.id} title`); required(candidate.summary, `${candidate.id} summary`);
    if (candidate.track !== track || candidate.versionId !== version.versionId || !candidateStatuses.has(candidate.status)) throw new Error(`${candidate.id} has invalid track, version, or status`);
    if (!validDate(candidate.occurredAt) || candidate.occurredAt < manifest.periodStart || candidate.occurredAt > manifest.periodEnd) throw new Error(`${candidate.id} date outside batch period`);
    if (!candidate.memberIds.length || candidate.memberIds.some(id => !manifest.memberIds.includes(id))) throw new Error(`${candidate.id} has invalid members`);
    if (!Array.isArray(candidate.roleClaims)) throw new Error(`${candidate.id} roleClaims must be an array`);
    for (const claim of candidate.roleClaims) {
      if (typeof claim === 'string') required(claim, `${candidate.id} role claim`);
      else if (!claim || typeof claim !== 'object' || !candidate.memberIds.includes(claim.memberId) || typeof claim.role !== 'string' || !claim.role.trim()) throw new Error(`${candidate.id} has invalid structured role claim`);
    }
    if (candidate.status === 'merged' && !candidate.possibleDuplicateOf) throw new Error(`${candidate.id} merged without target`);
    if (['rejected','out_of_scope'].includes(candidate.status) && !candidate.rejectionReason) throw new Error(`${candidate.id} missing rejection reason`);
    if (['needs_sources','needs_response'].includes(candidate.status) && !candidate.missingEvidence?.length) throw new Error(`${candidate.id} missing evidence list`);
    for (const value of candidate.canonicalSourceUrls ?? []) canonicalUrl(value);
  }
  if (track === 'independent') {
    const serialized = JSON.stringify(version);
    if (/primaryCandidateId|primary-candidate/i.test(serialized)) throw new Error(`${manifest.batchId} independent version references primary candidates`);
  }
}
