const arrivalPattern = /遞補|就職|宣誓|到任|接任|succession|sworn.?in|assumed office/i;

export function draftSuggestion(comparison, candidates) {
  if (comparison.matchStatus === 'possible_match') return {
    suggestedDecision: 'merge_or_publish', reason: '兩軌候選可能描述同一事件；須人工確認事件邊界、來源及最終事件 ID。'
  };
  if (candidates.some(candidate => arrivalPattern.test(`${candidate.title ?? ''} ${candidate.summary ?? ''}`))) return {
    suggestedDecision: 'out_of_scope', reason: '候選內容看似僅為遞補、就職或到任紀錄；須人工確認沒有其他公共事件內容。'
  };
  if (candidates.some(candidate => ['needs_sources','needs_response'].includes(candidate.status))) return {
    suggestedDecision: 'reject', reason: '候選仍缺來源或當事人回應；須人工確認補查結果後才能採用。'
  };
  if (candidates.length && candidates.every(candidate => candidate.status === 'verified' && candidate.publicationDecision === 'publish')) return {
    suggestedDecision: 'publish', reason: '候選已標記 verified 且達發布門檻；仍須人工確認角色、結果、來源及事件 ID。'
  };
  return { suggestedDecision: 'manual_review', reason: '沒有符合自動建議規則，須由裁決者完整審查。' };
}

export function buildAdjudicationDraft({ manifest, primary, independent, comparison, generatedAt }) {
  const candidateById=new Map([...primary.candidates,...independent.candidates].map(item=>[item.id,item]));
  return {
    schemaVersion:'1.0.0', documentType:'adjudicationDraft', draft:true, manualReviewRequired:true,
    batchId:manifest.batchId, primaryVersionId:manifest.primaryVersionId, independentVersionId:manifest.independentVersionId,
    generatedAt, records:comparison.comparisons.map(item=>{
      const candidateIds=[item.primaryCandidateId,item.independentCandidateId].filter(Boolean);
      const candidates=candidateIds.map(id=>candidateById.get(id)).filter(Boolean);
      return {
        id:`draft-${item.id}`, comparisonIds:[item.id], candidateIds,
        ...draftSuggestion(item,candidates), finalEventId:null, additionalSourceIds:[], manualReviewRequired:true
      };
    })
  };
}

export function validateAdjudicationDraft(draft, manifest, comparison) {
  if(manifest.status==='complete') throw new Error(`${manifest.batchId} complete while adjudication draft still exists`);
  if(draft.documentType!=='adjudicationDraft'||draft.draft!==true||draft.manualReviewRequired!==true) throw new Error(`${manifest.batchId} invalid adjudication draft identity`);
  if(draft.batchId!==manifest.batchId||draft.primaryVersionId!==manifest.primaryVersionId||draft.independentVersionId!==manifest.independentVersionId) throw new Error(`${manifest.batchId} adjudication draft uses obsolete versions`);
  const comparisonIds=new Set(comparison.comparisons.map(item=>item.id)); const draftedIds=new Set();
  for(const record of draft.records??[]) {
    if(record.manualReviewRequired!==true||!['publish','reject','out_of_scope','merge_or_publish','manual_review'].includes(record.suggestedDecision)) throw new Error(`${record.id??manifest.batchId} invalid draft suggestion`);
    if('decision' in record||record.finalEventId) throw new Error(`${record.id} draft must not contain a final decision or event ID`);
    for(const id of record.comparisonIds??[]) { if(!comparisonIds.has(id)||draftedIds.has(id)) throw new Error(`${record.id} has invalid or duplicate draft comparison ${id}`); draftedIds.add(id); }
  }
  for(const id of comparisonIds) if(!draftedIds.has(id)) throw new Error(`${manifest.batchId} draft omits comparison ${id}`);
}
