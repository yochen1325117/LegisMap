import snapshot from '../../../../data/research/ly11-2026.json';

export interface SourceRecord {
  id: string; title: string; publisher: string; url: string; accessedAt: string; lastVerifiedAt?: string; evidenceLocator: string;
}
export type EventCategory = 'contribution' | 'good_deed' | 'concern' | 'anecdote';
export type EvidenceLevel = 'official_confirmed' | 'independently_corroborated' | 'attributed_claim';
export type RoleType = 'lead_proposer' | 'co_proposer' | 'cosigner' | 'questioner' | 'coordinator' | 'donor' | 'subject' | 'participant';
export type MandateRelation = 'current_term' | 'prior_public_role' | 'before_legislative_service';
export type ResultStatus = 'proposed' | 'under_review' | 'passed' | 'implemented' | 'completed' | 'recorded' | 'alleged' | 'under_investigation' | 'indicted' | 'appealable' | 'final' | 'resolved';
export interface EventRecord {
  id: string; category: EventCategory; occurredAt: string; title: string; summary: string;
  role: string; outcome: string; processStatus: string; personResponse: string | null;
  resolution: string | null; sourceIds: string[];
  evidenceLevel: EvidenceLevel; roleType: RoleType; mandateRelation: MandateRelation;
  resultStatus: ResultStatus; visibility: 'public' | 'withheld';
}
export interface BackgroundRecord { id: string; title: string; summary: string; role: string; sourceIds: string[] }
export interface EventBatchMember { memberId: string; reviewedAt: string; reviewedCategories: EventCategory[]; reviewedSourceTypes: string[]; backgroundRecords?: BackgroundRecord[]; events: EventRecord[] }
const eventBatches = Object.values(import.meta.glob('../../../../data/research/events-*.json', { eager: true, import: 'default' })) as Array<{ members: EventBatchMember[]; sources: SourceRecord[] }>;
export const eventMembers = new Map(eventBatches.flatMap(batch => batch.members as EventBatchMember[]).map(member => [member.memberId, member]));
export const eventSources = new Map(eventBatches.flatMap(batch => batch.sources as SourceRecord[]).map(source => [source.id, source]));
export function sourcesForEvent(event: EventRecord): SourceRecord[] {
  return event.sourceIds.map(id => eventSources.get(id)).filter((source): source is SourceRecord => Boolean(source));
}
export function sourcesForIds(ids: string[]): SourceRecord[] {
  return ids.map(id => eventSources.get(id)).filter((source): source is SourceRecord => Boolean(source));
}
export interface MemberRecord {
  id: string; name: string; districtLabel: string;
  seatType: 'district' | 'party_list' | 'plains_indigenous' | 'mountain_indigenous';
  regionName: string | null; mandateStatus: 'active' | 'former';
  serviceStart: string; serviceEnd: string | null; fieldSourceIds: Record<string, string[]>;
}
export const dataAsOfDate = snapshot.asOfDate;
export const members = snapshot.members as MemberRecord[];
export const sources = new Map((snapshot.sources as SourceRecord[]).map(source => [source.id, source]));
export const rosterSource = sources.get(snapshot.rosterSourceId)!;
export function fieldSources(member: MemberRecord, field: string): SourceRecord[] {
  return (member.fieldSourceIds[field] ?? []).map(id => sources.get(id)).filter((source): source is SourceRecord => Boolean(source));
}
export function membersForRegion(regionName: string): MemberRecord[] {
  return members.filter(member => member.regionName === regionName);
}
