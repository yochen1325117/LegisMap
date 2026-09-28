import assert from 'node:assert/strict';
import { canonicalUrl, validateDraftVersion, validateVersion, versionHash } from './workflow-utils.mjs';
import { buildResearchQueue } from './research-queue.mjs';
import { buildAdjudicationDraft, draftSuggestion, validateAdjudicationDraft } from './adjudication-draft-utils.mjs';

const test = (name, run) => { run(); console.log(`ok - ${name}`); };

test('canonicalUrl removes tracking data but keeps meaningful parameters', () => {
  assert.equal(canonicalUrl('https://example.test/story?id=7&utm_source=x#part'), 'https://example.test/story?id=7');
});

test('version hash detects locked content changes', () => {
  const version = { versionId:'v1', lockedAt:'2026-09-27T00:00:00.000Z', contentHash:null, candidates:[] };
  version.contentHash = versionHash(version);
  assert.equal(version.contentHash, versionHash(version));
  version.candidates.push({ id:'changed' });
  assert.notEqual(version.contentHash, versionHash(version));
});

test('complete search matrix is required for every member', () => {
  const matrix={ minimumResultsPerQuery:20, maximumResultsPerQuery:50, tracks:{ primary:{ sourceScopes:['news'], queryFamilies:['accountability'] } } };
  const manifest={ batchId:'sample', memberIds:['m1'], periodStart:'2021-09-27', periodEnd:'2026-09-27', primaryVersionId:'v1' };
  const version={ track:'primary', batchId:'sample', versionId:'v1', performedBy:'researcher', researchedAt:'2026-09-27', lockedAt:'2026-09-27T00:00:00.000Z', contentHash:null, candidates:[], searchRuns:[] };
  version.contentHash=versionHash(version);
  assert.throws(() => validateVersion(version,'primary',manifest,matrix,new Set(['m1'])), /missing source scope news/);
  version.searchRuns.push({ id:'run-1', track:'primary', versionId:'v1', memberId:'m1', query:'name concern', queryFamily:'accountability', sourceScope:'news', resultCountReviewed:20, stopReason:'exhausted', candidateIds:[], performedBy:'researcher' });
  version.contentHash=versionHash(version);
  assert.doesNotThrow(() => validateVersion(version,'primary',manifest,matrix,new Set(['m1'])));
});

test('independent version cannot reference primary candidates', () => {
  const matrix={ minimumResultsPerQuery:20, maximumResultsPerQuery:50, tracks:{ independent:{ sourceScopes:['archives'], queryFamilies:['source_led'] } } };
  const manifest={ batchId:'sample', memberIds:['m1'], periodStart:'2021-09-27', periodEnd:'2026-09-27', independentVersionId:'v2' };
  const version={ track:'independent', batchId:'sample', versionId:'v2', performedBy:'verifier', researchedAt:'2026-09-27', lockedAt:'2026-09-27T00:00:00.000Z', contentHash:null, primaryCandidateId:'primary-candidate-1', candidates:[], searchRuns:[{ id:'run-2', track:'independent', versionId:'v2', memberId:'m1', query:'archive', queryFamily:'source_led', sourceScope:'archives', resultCountReviewed:20, stopReason:'exhausted', candidateIds:[], performedBy:'verifier' }] };
  version.contentHash=versionHash(version);
  assert.throws(() => validateVersion(version,'independent',manifest,matrix,new Set(['m1'])), /references primary candidates/);
});

test('research queue includes every member once and places unfinished work first', () => {
  const queue=buildResearchQueue().members;
  assert.equal(queue.length,120);
  assert.equal(new Set(queue.map(item=>item.memberId)).size,120);
  const firstComplete=queue.findIndex(item=>item.status==='complete');
  assert.ok(firstComplete === -1 || queue.slice(firstComplete).every(item=>item.status==='complete'));
  for(const item of queue){
    assert.ok(item.priority>=1&&item.priority<=5);
    assert.ok(Number.isInteger(item.publicEventCount));
    assert.ok(Number.isInteger(item.unresolvedCount));
  }
});

test('draft versions are accepted only in their matching in-progress state', () => {
  const manifest={ batchId:'sample', memberIds:['m1'], primaryVersionId:'v1', status:'primary_in_progress' };
  const draft={ track:'primary', batchId:'sample', versionId:'v1', performedBy:'researcher', researchedAt:'2026-09-28', lockedAt:null, contentHash:null };
  assert.doesNotThrow(()=>validateDraftVersion(draft,'primary',manifest));
  assert.throws(()=>validateDraftVersion(draft,'primary',{...manifest,status:'awaiting_independent_review'}),/outside primary_in_progress/);
});
test('structured role claims must belong to a candidate member', () => {
  const matrix={ minimumResultsPerQuery:20, maximumResultsPerQuery:50, tracks:{ primary:{ sourceScopes:['news'], queryFamilies:['accountability'] } } };
  const manifest={ batchId:'sample', memberIds:['m1'], periodStart:'2021-09-28', periodEnd:'2026-09-28', primaryVersionId:'v1' };
  const candidate={ id:'c1', track:'primary', versionId:'v1', memberIds:['m1'], provisionalCategory:'concern', title:'title', summary:'summary', occurredAt:'2026-09-28', roleClaims:[{memberId:'m2',role:'subject'}], status:'verified', canonicalSourceUrls:[] };
  const version={ track:'primary', batchId:'sample', versionId:'v1', performedBy:'researcher', researchedAt:'2026-09-28', lockedAt:'2026-09-28T00:00:00.000Z', contentHash:null, candidates:[candidate], searchRuns:[{ id:'r1', track:'primary', versionId:'v1', memberId:'m1', query:'query', queryFamily:'accountability', sourceScope:'news', resultCountReviewed:20, stopReason:'exhausted', candidateIds:['c1'], performedBy:'researcher' }] };
  version.contentHash=versionHash(version);
  assert.throws(()=>validateVersion(version,'primary',manifest,matrix,new Set(['m1'])),/invalid structured role claim/);
  candidate.roleClaims=[{memberId:'m1',role:'subject'}]; version.contentHash=versionHash(version);
  assert.doesNotThrow(()=>validateVersion(version,'primary',manifest,matrix,new Set(['m1'])));
});

test('adjudication drafts make conservative suggestions and remain manual', () => {
  assert.equal(draftSuggestion({matchStatus:'possible_match'},[]).suggestedDecision,'merge_or_publish');
  assert.equal(draftSuggestion({matchStatus:'primary_only'},[{title:'遞補宣誓就職',summary:'',status:'verified',publicationDecision:'publish'}]).suggestedDecision,'out_of_scope');
  assert.equal(draftSuggestion({matchStatus:'primary_only'},[{title:'事件',summary:'',status:'needs_sources'}]).suggestedDecision,'reject');
  assert.equal(draftSuggestion({matchStatus:'primary_only'},[{title:'事件',summary:'',status:'verified',publicationDecision:'publish'}]).suggestedDecision,'publish');
  const candidate={id:'c1',title:'事件',summary:'摘要',status:'verified',publicationDecision:'publish'};
  const draft=buildAdjudicationDraft({manifest:{batchId:'b1',primaryVersionId:'p1',independentVersionId:'i1'},primary:{candidates:[candidate]},independent:{candidates:[]},comparison:{comparisons:[{id:'x1',matchStatus:'primary_only',primaryCandidateId:'c1',independentCandidateId:null}]},generatedAt:'2026-09-28T00:00:00.000Z'});
  assert.equal(draft.draft,true); assert.equal(draft.manualReviewRequired,true);
  assert.equal(draft.records[0].suggestedDecision,'publish'); assert.equal('decision' in draft.records[0],false); assert.equal(draft.records[0].finalEventId,null);
  const manifest={batchId:'b1',primaryVersionId:'p1',independentVersionId:'i1',status:'awaiting_adjudication'};
  const comparison={comparisons:[{id:'x1'}]};
  assert.doesNotThrow(()=>validateAdjudicationDraft(draft,manifest,comparison));
  assert.throws(()=>validateAdjudicationDraft(draft,{...manifest,status:'complete'},comparison),/complete while adjudication draft/);
});
