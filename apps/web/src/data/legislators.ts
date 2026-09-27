import snapshot from '../../../../data/research/ly11-2026.json';
import sharedResearch from '../../../../data/research/shared-events-2026.json';
import electoralSnapshot from './electoral-districts.json';
import type { MultiPolygon, Polygon } from 'geojson';

export interface SourceRecord {
  id: string; title: string; publisher: string; url: string; accessedAt: string; lastVerifiedAt?: string; evidenceLocator: string;
}
export type EventCategory = 'contribution' | 'good_deed' | 'concern' | 'anecdote';
export type EvidenceLevel = 'official_confirmed' | 'independently_corroborated' | 'attributed_claim';
export type RoleType = 'lead_proposer' | 'co_proposer' | 'cosigner' | 'questioner' | 'amendment_mover' | 'budget_mover' | 'negotiator' | 'voter' | 'coordinator' | 'donor' | 'subject' | 'participant';
export type MandateRelation = 'current_term' | 'prior_public_role' | 'before_legislative_service';
export type ResultStatus = 'proposed' | 'under_review' | 'passed' | 'implemented' | 'completed' | 'recorded' | 'alleged' | 'under_investigation' | 'indicted' | 'appealable' | 'final' | 'resolved';
export interface EventRecord {
  id: string; category: EventCategory; occurredAt: string; title: string; summary: string;
  role: string; outcome: string; processStatus: string; personResponse: string | null;
  resolution: string | null; sourceIds: string[];
  evidenceLevel: EvidenceLevel; roleType: RoleType; mandateRelation: MandateRelation;
  resultStatus: ResultStatus; visibility: 'public' | 'withheld';
  officialId?: string | null; type?: ResearchEventType; topic?: string; voteChoice?: VoteChoice | null; voteChoiceLabel?: string | null;
}
export interface BackgroundRecord { id: string; title: string; summary: string; role: string; sourceIds: string[] }
export interface EventBatchMember { memberId: string; reviewedAt: string; reviewedCategories: EventCategory[]; reviewedSourceTypes: string[]; backgroundRecords?: BackgroundRecord[]; events: EventRecord[] }
export type ResearchEventType = 'bill' | 'budget_oversight' | 'questioning' | 'administrative_oversight' | 'local_coordination' | 'constitutional_duty' | 'named_vote' | 'public_service' | 'accountability' | 'profile';
export type VoteChoice = 'for' | 'against' | 'abstain' | 'not_voting';
export interface LegislativeEvent {
  id: string; officialId: string | null; type: ResearchEventType; category: EventCategory; title: string; occurredAt: string; topic: string;
  outcome: string; processStatus: string; resultStatus: ResultStatus; evidenceLevel: EvidenceLevel; visibility: 'public' | 'withheld';
  personResponse: string | null; resolution: string | null; sourceIds: string[];
}
export interface MemberParticipation {
  id: string; eventId: string; memberId: string; roleType: RoleType; roleDescription: string; actionSummary: string;
  mandateRelation: MandateRelation; sourceIds: string[]; voteChoice: VoteChoice | null; voteChoiceLabel: string | null;
}
export interface MemberResearchReview {
  memberId: string; periodStart: string; reviewedAt: string; categories: EventCategory[]; sourceTypes: string[]; status: 'complete' | 'in_progress'; backgroundRecords: BackgroundRecord[];
}
const research = sharedResearch as unknown as { sources: SourceRecord[]; events: LegislativeEvent[]; participations: MemberParticipation[]; memberReviews: MemberResearchReview[] };
export const sharedEvents = new Map(research.events.map(event => [event.id, event]));
export const eventSources = new Map(research.sources.map(source => [source.id, source]));
export const memberParticipations = research.participations;
export const memberReviews = new Map(research.memberReviews.map(review => [review.memberId, review]));
function resolveParticipation(participation: MemberParticipation): EventRecord {
  const event = sharedEvents.get(participation.eventId)!;
  return {
    ...event, summary: participation.actionSummary, role: participation.roleDescription, roleType: participation.roleType,
    mandateRelation: participation.mandateRelation, sourceIds: [...new Set([...event.sourceIds, ...participation.sourceIds])],
    voteChoice: participation.voteChoice, voteChoiceLabel: participation.voteChoiceLabel,
  } as EventRecord;
}
export const eventMembers = new Map(research.memberReviews.map(review => {
  const events = research.participations.filter(item => item.memberId === review.memberId && sharedEvents.get(item.eventId)?.type !== 'named_vote').map(resolveParticipation);
  return [review.memberId, { memberId: review.memberId, reviewedAt: review.reviewedAt, reviewedCategories: review.categories, reviewedSourceTypes: review.sourceTypes, backgroundRecords: review.backgroundRecords, events } satisfies EventBatchMember];
}));
export function sourcesForEvent(event: EventRecord): SourceRecord[] {
  return event.sourceIds.map(id => eventSources.get(id)).filter((source): source is SourceRecord => Boolean(source));
}
export function eventIsOutcome(event: EventRecord): boolean {
  return event.category === 'contribution' && event.type !== 'named_vote'
    && ['passed', 'implemented', 'completed', 'resolved', 'final'].includes(event.resultStatus)
    && !['cosigner', 'voter', 'participant'].includes(event.roleType);
}
export function namedVotesForMember(memberId: string): EventRecord[] {
  return research.participations.filter(item => item.memberId === memberId && sharedEvents.get(item.eventId)?.type === 'named_vote')
    .map(resolveParticipation).filter(event => event.visibility === 'public');
}
export function sourcesForIds(ids: string[]): SourceRecord[] {
  return ids.map(id => eventSources.get(id)).filter((source): source is SourceRecord => Boolean(source));
}
export interface MemberRecord {
  id: string; name: string; districtLabel: string;
  seatType: 'district' | 'party_list' | 'plains_indigenous' | 'mountain_indigenous';
  regionName: string | null; electoralDistrictId: string | null; mandateStatus: 'active' | 'former';
  serviceStart: string; serviceEnd: string | null; fieldSourceIds: Record<string, string[]>;
}
export interface ElectoralDistrictMeta {
  id: string; term: number; name: string; countyId: string; countyName: string; districtNumber: number;
  scopeText: string; memberId: string; sourceIds: string[];
  units: Array<{ townName: string; villageNames: string[] | null }>;
}
export interface ElectoralDistrictFeature {
  id: string; geometry: Polygon | MultiPolygon; sourceFeatureCount: number;
}
export const dataAsOfDate = snapshot.asOfDate;
export const members = snapshot.members as MemberRecord[];
export const electoralDistricts = electoralSnapshot.districts as ElectoralDistrictMeta[];
export const electoralDistrictById = new Map(electoralDistricts.map(district => [district.id, district]));
export const sources = new Map((snapshot.sources as SourceRecord[]).map(source => [source.id, source]));
export const rosterSource = sources.get(snapshot.rosterSourceId)!;
export function fieldSources(member: MemberRecord, field: string): SourceRecord[] {
  return (member.fieldSourceIds[field] ?? []).map(id => sources.get(id)).filter((source): source is SourceRecord => Boolean(source));
}
export function membersForRegion(regionName: string): MemberRecord[] {
  return members.filter(member => member.regionName === regionName);
}
export function districtsForCounty(countyId: string): ElectoralDistrictMeta[] {
  return electoralDistricts.filter(district => district.countyId === countyId).sort((a, b) => a.districtNumber - b.districtNumber);
}
export function membersForDistrict(districtId: string): MemberRecord[] {
  return members.filter(member => member.electoralDistrictId === districtId);
}

const geometryModules = import.meta.glob('./district-geometry/*.json', { import: 'default' });
export async function loadDistrictFeatures(countyId: string): Promise<ElectoralDistrictFeature[]> {
  const loader = geometryModules[`./district-geometry/${countyId}.json`];
  if (!loader) return [];
  const data = await loader() as { countyId: string; districts: ElectoralDistrictFeature[] };
  return data.districts;
}
