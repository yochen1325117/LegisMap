import snapshot from '../../../../data/research/ly11-2026.json';

export interface SourceRecord {
  id: string; title: string; publisher: string; url: string; accessedAt: string; evidenceLocator: string;
}
export type EventCategory = 'contribution' | 'good_deed' | 'concern' | 'anecdote';
export interface EventRecord {
  id: string; category: EventCategory; occurredAt: string; title: string; summary: string;
  role: string; outcome: string; processStatus: string; personResponse: string | null;
  resolution: string | null; sourceIds: string[];
}
export interface EventBatchMember { memberId: string; reviewedAt: string; reviewedCategories: EventCategory[]; events: EventRecord[] }
const eventBatches = Object.values(import.meta.glob('../../../../data/research/events-*.json', { eager: true, import: 'default' })) as Array<{ members: EventBatchMember[]; sources: SourceRecord[] }>;
export const eventMembers = new Map(eventBatches.flatMap(batch => batch.members as EventBatchMember[]).map(member => [member.memberId, member]));
export const eventSources = new Map(eventBatches.flatMap(batch => batch.sources as SourceRecord[]).map(source => [source.id, source]));
export function sourcesForEvent(event: EventRecord): SourceRecord[] {
  return event.sourceIds.map(id => eventSources.get(id)).filter((source): source is SourceRecord => Boolean(source));
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
