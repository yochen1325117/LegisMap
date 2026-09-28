import { existsSync } from 'node:fs';
import { listManifests, loadVersion, readJson, root } from './workflow-utils.mjs';

const northToSouth = ['基隆市','臺北市','新北市','桃園市','新竹縣','新竹市','宜蘭縣','苗栗縣','臺中市','彰化縣','花蓮縣','南投縣','雲林縣','嘉義縣','嘉義市','臺南市','臺東縣','高雄市','屏東縣','澎湖縣','金門縣','連江縣'];
const specialOrder = { party_list: 100, plains_indigenous: 101, mountain_indigenous: 102 };

export function buildResearchQueue() {
  const roster = readJson('data/research/ly11-2026.json');
  const shared = readJson('data/research/shared-events-2026.json');
  const status = readJson(`${root}/research-status-2026.json`);
  const manifests = listManifests();
  const eventById = new Map(shared.events.map(event => [event.id, event]));
  const sourceById = new Map(shared.sources.map(source => [source.id, source]));
  const statusByMember = new Map(status.members.map(item => [item.memberId, item]));
  const batchByMember = new Map(manifests.flatMap(manifest => manifest.memberIds.map(id => [id, manifest])));

  const members = roster.members.map(member => {
    const links = shared.participations.filter(link => link.memberId === member.id && eventById.get(link.eventId)?.visibility === 'public');
    const sourceIds = new Set(links.flatMap(link => [...(link.sourceIds ?? []), ...(eventById.get(link.eventId)?.sourceIds ?? [])]));
    const hasNews = [...sourceIds].some(id => sourceById.get(id)?.sourceType === 'news');
    const hasAccountability = links.some(link => eventById.get(link.eventId)?.category === 'accountability');
    const workflow = statusByMember.get(member.id) ?? { status: status.defaultStatus };
    const manifest = batchByMember.get(member.id);
    const primary = manifest ? loadVersion('primary', manifest) : null;
    const independent = manifest ? loadVersion('independent', manifest) : null;
    const comparisonPath = manifest ? `${root}/comparisons/${manifest.batchId}.json` : '';
    const adjudicationPath = manifest ? `${root}/adjudications/${manifest.batchId}.json` : '';
    const comparison = comparisonPath && existsSync(comparisonPath) ? readJson(comparisonPath) : null;
    const adjudication = adjudicationPath && existsSync(adjudicationPath) ? readJson(adjudicationPath) : null;
    const sourceRecheckPath = manifest ? `${root}/source-rechecks/${manifest.batchId}.json` : '';
    const sourceRecheck = sourceRecheckPath && existsSync(sourceRecheckPath) ? readJson(sourceRecheckPath) : null;
    const decided = new Set(adjudication?.records?.flatMap(record => record.comparisonIds) ?? []);
    const unresolved = comparison?.comparisons?.filter(item => (item.matchStatus !== 'matched' || item.differenceTypes?.length) && !decided.has(item.id)).length ?? 0;
    const pendingEvidence = adjudication?.records?.filter(item => item.decision === 'needs_more_evidence').length ?? 0;
    const priority = links.length === 0 ? 1 : !hasNews ? 2 : !hasAccountability ? 3 : links.length < 3 ? 4 : 5;
    const regionOrder = member.seatType === 'district' ? Math.max(0, northToSouth.indexOf(member.regionName)) : (specialOrder[member.seatType] ?? 103);
    return {
      memberId: member.id, name: member.name, seatType: member.seatType, regionName: member.regionName,
      status: workflow.status, batchId: manifest?.batchId ?? null, priority, publicEventCount: links.length,
      hasNews, hasAccountability, primaryLocked: Boolean(primary?.lockedAt), independentLocked: Boolean(independent?.lockedAt),
      candidateCount: (primary?.candidates?.length ?? 0) + (independent?.candidates?.length ?? 0),
      differenceCount: comparison?.comparisons?.filter(item => item.matchStatus !== 'matched' || item.differenceTypes?.length).length ?? 0,
      unresolvedCount: unresolved + pendingEvidence, sourceVerifiedCount:sourceRecheck?.verifiedCount ?? null,
      sourceStaleCount:sourceRecheck?.staleCount ?? null, sourceIndeterminateCount:sourceRecheck?.indeterminateCount ?? null,
      completedAt: workflow.completedAt ?? null, regionOrder
    };
  });
  members.sort((a,b) => Number(a.status === 'complete') - Number(b.status === 'complete') || a.priority-b.priority || a.regionOrder-b.regionOrder || a.name.localeCompare(b.name,'zh-Hant'));
  return { members, manifests };
}

export function nextUnassignedMembers(limit = 4) {
  return buildResearchQueue().members.filter(item => item.status !== 'complete' && !item.batchId).slice(0, limit);
}
