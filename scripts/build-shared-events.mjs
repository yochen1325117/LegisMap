import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

const root = 'data/research';
const roster = JSON.parse(readFileSync(`${root}/ly11-2026.json`, 'utf8'));
const batchFiles = readdirSync(root).filter(name => /^events-.*\.json$/.test(name)).sort();
const batches = batchFiles.map(name => JSON.parse(readFileSync(`${root}/${name}`, 'utf8')));
const memberByName = new Map(roster.members.map(member => [member.name.replaceAll('　', '').replaceAll(' ', ''), member]));
const sources = [];
const sourceByUrl = new Map();
const sourceIdMap = new Map();
const events = new Map();
const participations = [];
const reviews = [];

const normalizeName = value => value.replaceAll('　', '').replaceAll(' ', '').replace('SaidhaiTahovecahe', 'Saidhai‧Tahovecahe');
const mergeSource = source => {
  const existing = sourceByUrl.get(source.url);
  if (existing) {
    sourceIdMap.set(source.id, existing.id);
    if (source.lastVerifiedAt > existing.lastVerifiedAt) existing.lastVerifiedAt = source.lastVerifiedAt;
    return existing.id;
  }
  const copy = { ...source };
  sources.push(copy); sourceByUrl.set(copy.url, copy); sourceIdMap.set(copy.id, copy.id);
  return copy.id;
};
for (const batch of batches) for (const source of batch.sources) mergeSource(source);

const billId = event => event.sourceIds.map(id => {
  const source = batches.flatMap(batch => batch.sources).find(item => item.id === id);
  return source?.url.match(/\/bills\/(?:deliver-and-negotiation\/)?(\d+)\/details/)?.[1];
}).find(Boolean) ?? null;
const eventType = event => {
  if (event.category !== 'contribution') return event.category === 'concern' ? 'accountability' : event.category === 'good_deed' ? 'public_service' : 'profile';
  if (/預算|決算|凍結|主決議/.test(event.title)) return 'budget_oversight';
  if (/質詢/.test(event.title)) return 'questioning';
  if (/協調|會勘|考察|爭取/.test(event.title)) return 'local_coordination';
  if (/法案|條例|修正草案|修法/.test(event.title)) return 'bill';
  return 'administrative_oversight';
};
const resultRank = new Map(['recorded','proposed','under_review','alleged','under_investigation','indicted','appealable','passed','implemented','completed','resolved','final'].map((value, index) => [value, index]));

for (const batch of batches) {
  for (const member of batch.members) {
    reviews.push({
      memberId: member.memberId, periodStart: batch.periodStart, reviewedAt: member.reviewedAt,
      categories: member.reviewedCategories, sourceTypes: member.reviewedSourceTypes,
      status: 'complete', backgroundRecords: (member.backgroundRecords ?? []).map(record => ({ ...record, sourceIds: record.sourceIds.map(id => sourceIdMap.get(id)) })),
    });
    for (const legacy of member.events) {
      const officialId = legacy.category === 'contribution' && eventType(legacy) === 'bill' ? billId(legacy) : null;
      const sharedId = officialId ? `bill-${officialId}` : `event-${legacy.id}`;
      const sourceIds = [...new Set(legacy.sourceIds.map(id => sourceIdMap.get(id)))];
      const existing = events.get(sharedId);
      if (!existing) events.set(sharedId, {
        id: sharedId, officialId, type: eventType(legacy), category: legacy.category,
        title: legacy.title, occurredAt: legacy.occurredAt, topic: legacy.title,
        outcome: legacy.outcome, processStatus: legacy.processStatus, resultStatus: legacy.resultStatus,
        evidenceLevel: legacy.evidenceLevel, visibility: legacy.visibility,
        personResponse: legacy.personResponse, resolution: legacy.resolution, sourceIds,
      });
      else {
        existing.sourceIds = [...new Set([...existing.sourceIds, ...sourceIds])];
        if ((resultRank.get(legacy.resultStatus) ?? 0) > (resultRank.get(existing.resultStatus) ?? 0)) {
          existing.resultStatus = legacy.resultStatus; existing.outcome = legacy.outcome; existing.processStatus = legacy.processStatus;
        }
        if (legacy.visibility === 'public') existing.visibility = 'public';
      }
      const participationId = `${sharedId}:${member.memberId}:${legacy.roleType}`;
      if (!participations.some(item => item.id === participationId)) participations.push({
        id: participationId, eventId: sharedId, memberId: member.memberId,
        roleType: legacy.roleType, roleDescription: legacy.role, actionSummary: legacy.summary,
        mandateRelation: legacy.mandateRelation, sourceIds, voteChoice: null, voteChoiceLabel: null,
      });
    }
  }
}

// First official named-vote import. Further sittings use the same structure.
const voteSource = {
  id: 'ppg-sitting-2025030582', title: '立法院第11屆第3會期第4次會議', publisher: '立法院議事暨公報資訊網',
  url: 'https://ppg.ly.gov.tw/ppg/sittings/2025030582/details?meetingDate=114%2F03%2F12', sourceType: 'official',
  publishedAt: '2025-03-12', accessedAt: '2026-09-27', lastVerifiedAt: '2026-09-27',
  evidenceLocator: '財政收支劃分法覆議案之記名投票表決結果名單',
};
const voteSourceId = mergeSource(voteSource);
const voteEvent = {
  id: 'vote-11-03-04-finance-allocation-reconsideration', officialId: 'sitting-2025030582-finance-allocation-reconsideration',
  type: 'named_vote', category: 'contribution', title: '財政收支劃分法修正條文覆議案記名表決', occurredAt: '2025-03-12',
  topic: '財政收支劃分法覆議案', outcome: '院會以61票贊成維持原決議、51票反對維持原決議，原決議予以維持。',
  processStatus: 'documented', resultStatus: 'passed', evidenceLevel: 'official_confirmed', visibility: 'public',
  personResponse: null, resolution: '投票立場依官方記名投票名單；未列名者不推定立場。', sourceIds: [voteSourceId],
};
events.set(voteEvent.id, voteEvent);
const voteFor = '丁學忠、牛煦庭、王育敏、王鴻薇、江啟臣、吳宗憲、呂玉玲、李彥秀、林沛祥、林思銘、林倩綺、林國成、林德福、林憶君、邱若華、邱鎮軍、柯志恩、洪孟楷、徐巧芯、徐欣瑩、涂權吉、翁曉玲、馬文君、高金素梅、張啓楷、張智倫、張嘉郡、許宇甄、陳永康、陳玉珍、陳昭姿、陳雪生、陳菁徽、陳超明、麥玉珍、傅崐萁、游顥、黃仁、黃建賓、黃珊珊、黃健豪、楊瓊瓔、萬美玲、葉元之、葛如鈞、廖先翔、廖偉翔、鄭天財Sra Kacaw、鄭正鈐、魯明哲、盧縣一、賴士葆、謝衣鳯、謝龍介、韓國瑜、顏寬恒、羅廷瑋、羅明才、羅智強、蘇清泉'.split('、');
const voteAgainst = '王世堅、王正旭、王定宇、王美惠、王義川、伍麗華Saidhai‧Tahovecahe、何欣純、吳沛憶、吳秉叡、吳思瑤、吳琪銘、李坤城、李昆澤、李柏毅、沈伯洋、沈發惠、林月琴、林宜瑾、林岱樺、林俊憲、林淑芬、林楚茵、邱志偉、邱議瑩、柯建銘、范雲、徐富癸、張宏陸、張雅琳、莊瑞雄、許智傑、郭昱晴、郭國文、陳秀寳、陳亭妃、陳俊宇、陳冠廷、陳素月、陳培瑜、陳瑩、黃秀芳、黃捷、楊曜、劉建國、蔡其昌、蔡易餘、賴惠員、賴瑞隆、鍾佳濱、羅美玲、蘇巧慧'.split('、');
for (const [names, choice, label] of [[voteFor, 'for', '贊成維持原決議（反對覆議）'], [voteAgainst, 'against', '反對維持原決議（贊成覆議）']]) {
  for (const name of names) {
    const member = memberByName.get(normalizeName(name));
    if (!member) throw new Error(`Named-vote member not found: ${name}`);
    participations.push({ id: `${voteEvent.id}:${member.id}:voter`, eventId: voteEvent.id, memberId: member.id, roleType: 'voter',
      roleDescription: '記名投票委員', actionSummary: `官方記名表決紀錄列為「${label}」。`, mandateRelation: 'current_term',
      sourceIds: [voteSourceId], voteChoice: choice, voteChoiceLabel: label });
  }
}

const output = {
  documentType: 'sharedLegislatorResearch', schemaVersion: '2.0.0', generatedAt: '2026-09-27', periodStart: '2021-09-27',
  sources, events: [...events.values()], participations, memberReviews: reviews,
};
writeFileSync(`${root}/shared-events-2026.json`, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Built ${output.events.length} shared events, ${participations.length} participations, ${sources.length} sources.`);
