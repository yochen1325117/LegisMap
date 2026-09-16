import type { Geometry, Polygon, MultiPolygon } from 'geojson';

export interface MapNode {
  id: string;
  name: string;
  type: 'country' | 'county' | 'district' | 'village' | 'road' | 'custom';
  parentId?: string;
  children?: string[];
  geometry?: Geometry;
  metadata?: Record<string, unknown>;
}

export interface ElectoralDistrict {
  id: string;
  name: string;
  term: number;
  geometry: Polygon | MultiPolygon;
  regionNodeIds: string[];
  legislatorIds: string[];
  mock: true;
}

export interface Legislator {
  id: string;
  term: number;
  name: string;
  party?: string;
  electoralDistrictId: string;
  areaName: string;
  education?: string[];
  experience?: string[];
  committees?: string[];
  tookOfficeAt?: string;
  sourceRefs: string[];
  mock: true;
}

export type EventCategory = 'legislation' | 'speech' | 'vote' | 'policy' | 'controversy' | 'legal' | 'other';
export type EventStatus = 'reported' | 'investigated' | 'indicted' | 'judgment' | 'resolved' | 'not_applicable';

export interface Source {
  id: string;
  title: string;
  publisher: string;
  url: string;
  publishedAt?: string;
  sourceType: 'official' | 'court' | 'news' | 'statement' | 'other';
  retrievedAt: string;
  mock: true;
}

export interface LegislatorEvent {
  id: string;
  legislatorId: string;
  title: string;
  summary: string;
  occurredAt: string;
  category: EventCategory;
  status: EventStatus;
  sources: Source[];
  aiGenerated: boolean;
  reviewStatus: 'pending' | 'verified' | 'rejected';
  mock: true;
}

export interface LegisMapRepository {
  listDistricts(): Promise<ElectoralDistrict[]>;
  listLegislators(): Promise<Legislator[]>;
  listEvents(legislatorId: string): Promise<LegislatorEvent[]>;
}
