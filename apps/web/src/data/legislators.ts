import snapshot from '../../../../data/research/ly11-2026.json';

export interface SourceRecord {
  id: string; title: string; publisher: string; url: string; accessedAt: string; evidenceLocator: string;
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
