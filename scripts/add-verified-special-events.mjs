import { readFileSync, writeFileSync } from 'node:fs';

const file = 'data/research/events-party-list-2026.json';
const batch = JSON.parse(readFileSync(file, 'utf8'));
const proposals = [
  {
    sourceId: 'special-bill-national-security-2024', url: 'https://ppg.ly.gov.tw/ppg/bills/202110073810000/details',
    title: '國家安全法第三條、第八條及第十八條條文修正草案', occurredAt: '2024-11-01', resultStatus: 'under_review', outcome: '已交內政委員會審查；官方頁面記載後續委員會審查至 2026-04-30。',
    members: [['ly11-46775', '沈伯洋', 'lead_proposer'], ['ly11-46786', '林楚茵', 'co_proposer'], ['ly11-46807', '莊瑞雄', 'co_proposer'], ['ly11-46858', '羅美玲', 'co_proposer']],
  },
  {
    sourceId: 'special-bill-criminal-procedure-2024', url: 'https://ppg.ly.gov.tw/ppg/bills/202110050100000/details',
    title: '刑事訴訟法增訂部分條文草案', occurredAt: '2024-05-31', resultStatus: 'passed', outcome: '官方議案頁標示審查完畢（三讀）。',
    members: [['ly11-46767', '吳宗憲', 'lead_proposer'], ['ly11-46806', '張嘉郡', 'co_proposer']],
  },
  {
    sourceId: 'special-bill-civil-service-protection-2025', url: 'https://ppg.ly.gov.tw/ppg/bills/202110132360000/details',
    title: '公務人員保障法部分條文修正草案', occurredAt: '2025-06-13', resultStatus: 'under_review', outcome: '已交司法及法制委員會審查。',
    members: [['ly11-46776', '沈發惠', 'lead_proposer'], ['ly11-55855', '王義川', 'co_proposer']],
  },
];

for (const proposal of proposals) {
  if (!batch.sources.some(source => source.id === proposal.sourceId)) batch.sources.push({
    id: proposal.sourceId, title: proposal.title, publisher: '立法院議事暨公報資訊網', url: proposal.url,
    sourceType: 'official', publishedAt: proposal.occurredAt, accessedAt: '2026-09-22', lastVerifiedAt: '2026-09-22',
    evidenceLocator: '議案頁「提案人」及「審議進度」欄',
  });
  for (const [memberId, name, roleType] of proposal.members) {
    const member = batch.members.find(item => item.memberId === memberId);
    const id = `${memberId}-${proposal.sourceId.replace('special-bill-', '')}`;
    if (!member.events.some(event => event.id === id)) member.events.push({
      id, category: 'contribution', occurredAt: proposal.occurredAt, title: `提出${proposal.title}`,
      summary: `${name}列於官方議案頁的提案人名單；本紀錄僅陳述提案角色及官方所載審議進度。`,
      role: roleType === 'lead_proposer' ? '領銜提案人' : '共同提案人', outcome: proposal.outcome,
      processStatus: 'documented', personResponse: null, resolution: null, sourceIds: [proposal.sourceId],
      evidenceLevel: 'official_confirmed', roleType, mandateRelation: 'current_term', resultStatus: proposal.resultStatus, visibility: 'public',
    });
  }
}

writeFileSync(file, `${JSON.stringify(batch, null, 2)}\n`);
