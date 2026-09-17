import { readFileSync, writeFileSync } from 'node:fs';

const captured = JSON.parse(readFileSync('data/research/profile-capture.json', 'utf8'));
const asOfDate = '2026-09-17';
const rosterUrl = 'https://www.ly.gov.tw/Pages/List.aspx?nodeid=109';
const rocDate = value => {
  if (value === null) return null;
  const match = /^(\d+)年(\d+)月(\d+)日$/.exec(value);
  if (!match) throw new Error(`Unrecognized ROC date: ${value}`);
  return `${Number(match[1]) + 1911}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
};

const sources = [{
  id: 'ly11-roster', title: '第11屆立法委員名單與離職立法委員名單',
  publisher: '立法院', url: rosterUrl, accessedAt: asOfDate,
  evidenceLocator: '第11屆立法委員名單／離職立法委員名單',
}];
const roster = { active: [], former: [] };
const members = [];
for (const person of captured) {
  const nodeId = new URL(person.url).searchParams.get('nodeid');
  const id = `ly11-${nodeId}`;
  const serviceStart = rocDate(person.start);
  const serviceEnd = rocDate(person.end);
  if (!person.name || !person.district || !serviceStart || !nodeId || person.error) throw new Error(`Incomplete profile: ${person.name}`);
  roster[person.status].push(id);
  if (serviceStart > asOfDate || (serviceEnd && serviceEnd < '2026-01-01')) continue;
  const sourceId = `ly11-profile-${nodeId}`;
  sources.push({
    id: sourceId, title: `${person.name}委員`, publisher: '立法院',
    url: person.url, accessedAt: asOfDate,
    evidenceLocator: '委員個人頁：姓名、選區、到職日期及備註',
  });
  const seatType = person.district === '全國不分區及僑居國外國民' ? 'party_list'
    : person.district === '平地原住民選舉區' ? 'plains_indigenous'
    : person.district === '山地原住民選舉區' ? 'mountain_indigenous' : 'district';
  const regionName = seatType === 'district' ? person.district.match(/^[^縣市]+[縣市]/)?.[0] : null;
  if (seatType === 'district' && !regionName) throw new Error(`No county for ${person.name}: ${person.district}`);
  members.push({
    id, name: person.name, districtLabel: person.district, seatType, regionName,
    mandateStatus: person.status, serviceStart, serviceEnd,
    fieldSourceIds: {
      name: ['ly11-roster', sourceId], districtLabel: [sourceId],
      mandateStatus: ['ly11-roster', sourceId], serviceStart: [sourceId],
      ...(serviceEnd ? { serviceEnd: [sourceId] } : {}),
    },
  });
}

const data = {
  documentType: 'legislatorSnapshot', schemaVersion: '2.0.0', term: 11,
  periodStart: '2026-01-01', asOfDate, rosterSourceId: 'ly11-roster',
  roster, sources, members,
  researchNotes: [
    '官方頁面同時列出現任及所有離職委員；公開人物限 2026-01-01 至基準日曾在職者。',
    '選區文字照錄立法院個人頁；縣市只作清單分類，不代表真實選區邊界。',
  ],
};
writeFileSync('data/research/ly11-2026.json', JSON.stringify(data, null, 2) + '\n');
console.log(`${roster.active.length} active, ${roster.former.length} former; ${members.length} in 2026`);
