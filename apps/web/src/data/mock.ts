import type { ElectoralDistrict, Legislator, LegislatorEvent, LegisMapRepository, Source } from '@legismap/shared-types';

const polygon = (west: number, south: number, east: number, north: number) => ({
  type: 'Polygon' as const,
  coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]],
});

/** Shapes and people below are fictional UI fixtures, not electoral data. */
export const mockDistricts: ElectoralDistrict[] = [
  {
    id: 'TPE-DEMO-01', name: '台北示範選區一', term: 11,
    geometry: polygon(121.535, 25.025, 121.595, 25.077),
    regionNodeIds: ['63000', '63000010', '63000020'],
    legislatorIds: ['demo-a'], mock: true,
  },
  {
    id: 'TPE-DEMO-02', name: '台北示範選區二', term: 11,
    geometry: polygon(121.49, 25.047, 121.548, 25.105),
    regionNodeIds: ['63000', '63000040', '63000060'],
    legislatorIds: ['demo-b'], mock: true,
  },
  {
    id: 'KHH-DEMO-01', name: '高雄示範選區一', term: 11,
    geometry: polygon(120.27, 22.64, 120.335, 22.705),
    regionNodeIds: ['64000', '64000030'],
    legislatorIds: ['demo-c'], mock: true,
  },
];

export const mockLegislators: Legislator[] = [
  { id: 'demo-a', term: 11, name: '示範代表 甲', party: '虛構政團', electoralDistrictId: 'TPE-DEMO-01', areaName: '台北示範選區一', committees: ['示範公共建設委員會'], education: ['示範大學公共政策系'], experience: ['示範社區協會成員'], tookOfficeAt: '2024-02-01', sourceRefs: ['profile-a'], mock: true },
  { id: 'demo-b', term: 11, name: '示範代表 乙', party: '虛構政團', electoralDistrictId: 'TPE-DEMO-02', areaName: '台北示範選區二', committees: ['示範社會福利委員會'], education: ['示範學院社會學系'], experience: ['示範公益計畫召集人'], tookOfficeAt: '2024-02-01', sourceRefs: ['profile-b'], mock: true },
  { id: 'demo-c', term: 11, name: '示範代表 丙', party: '無黨籍（示範）', electoralDistrictId: 'KHH-DEMO-01', areaName: '高雄示範選區一', committees: ['示範交通委員會'], education: ['示範科技大學都市研究所'], experience: ['示範公共交通工作者'], tookOfficeAt: '2024-02-01', sourceRefs: ['profile-c'], mock: true },
];

const demoSource = (id: string, title: string): Source => ({
  id, title, publisher: 'LegisMap 虛構示範資料',
  url: `${import.meta.env.BASE_URL}mock-sources/index.html#${id}`,
  publishedAt: '2026-09-01', retrievedAt: '2026-09-16', sourceType: 'other', mock: true,
});

export const mockEvents: LegislatorEvent[] = [
  { id: 'event-a1', legislatorId: 'demo-a', title: '提出示範交通資料公開提案', summary: '以虛構案例展示提案紀錄、摘要與來源的呈現方式。', occurredAt: '2026-08-12', category: 'legislation', status: 'not_applicable', sources: [demoSource('event-a1', '示範提案紀錄 A1')], aiGenerated: false, reviewStatus: 'verified', mock: true },
  { id: 'event-a2', legislatorId: 'demo-a', title: '進行示範公共建設質詢', summary: '以虛構質詢展示時間軸排序與來源連結。', occurredAt: '2026-05-20', category: 'speech', status: 'not_applicable', sources: [demoSource('event-a2', '示範質詢紀錄 A2')], aiGenerated: false, reviewStatus: 'verified', mock: true },
  { id: 'event-b1', legislatorId: 'demo-b', title: '發布示範社福政策說明', summary: '此為測試版政策事件，不代表任何真實人物或政策立場。', occurredAt: '2026-07-09', category: 'policy', status: 'not_applicable', sources: [demoSource('event-b1', '示範政策說明 B1')], aiGenerated: false, reviewStatus: 'verified', mock: true },
  { id: 'event-b2', legislatorId: 'demo-b', title: '參與示範審查會議', summary: '以虛構會議展示事件與人物的對應。', occurredAt: '2026-03-14', category: 'other', status: 'not_applicable', sources: [demoSource('event-b2', '示範會議紀錄 B2')], aiGenerated: false, reviewStatus: 'verified', mock: true },
  { id: 'event-c1', legislatorId: 'demo-c', title: '提出示範公車路線改善建議', summary: '此示範紀錄用於驗證高雄選區與事件介面。', occurredAt: '2026-06-18', category: 'policy', status: 'not_applicable', sources: [demoSource('event-c1', '示範建議紀錄 C1')], aiGenerated: false, reviewStatus: 'verified', mock: true },
  { id: 'event-c2', legislatorId: 'demo-c', title: '參與示範交通議題表決', summary: '以虛構表決呈現事件類別與來源。', occurredAt: '2026-02-26', category: 'vote', status: 'not_applicable', sources: [demoSource('event-c2', '示範表決紀錄 C2')], aiGenerated: false, reviewStatus: 'verified', mock: true },
];

export const mockRepository: LegisMapRepository = {
  async listDistricts() { return mockDistricts; },
  async listLegislators() { return mockLegislators; },
  async listEvents(legislatorId) { return mockEvents.filter(event => event.legislatorId === legislatorId); },
};
