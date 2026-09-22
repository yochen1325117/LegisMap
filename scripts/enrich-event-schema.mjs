import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const root = 'data/research';
const roster = JSON.parse(readFileSync(`${root}/ly11-2026.json`, 'utf8'));
const rosterById = new Map(roster.members.map(member => [member.id, member]));
const files = readdirSync(root).filter(name => /^events-.*\.json$/.test(name));
const reviewSources = ['legislative', 'government', 'oversight_and_judicial', 'independent_news', 'statements'];

function roleType(role) {
  if (/共同提案/.test(role)) return 'co_proposer';
  if (/提案/.test(role)) return 'lead_proposer';
  if (/連署/.test(role)) return 'cosigner';
  if (/質詢/.test(role)) return 'questioner';
  if (/協調|媒合|號召|爭取/.test(role)) return 'coordinator';
  if (/捐贈|捐款/.test(role)) return 'donor';
  if (/受偵查|被指控|遭質疑|被發起|被告/.test(role)) return 'subject';
  return 'participant';
}

function resultStatus(event) {
  if (event.processStatus === 'under_investigation' || event.processStatus === 'investigation') return 'under_investigation';
  if (event.processStatus === 'indicted') return 'indicted';
  if (event.processStatus === 'judgment_appealable' || event.processStatus === 'remanded') return 'appealable';
  if (event.processStatus === 'resolved') return 'resolved';
  if (event.processStatus === 'disputed') return 'alleged';
  if (/三讀|通過/.test(event.outcome)) return 'passed';
  if (/交付|審查|排入|協商|撤回|撤案/.test(event.outcome)) return 'under_review';
  if (/完成|舉行|捐贈|募得|核定|和解|已作成/.test(event.outcome)) return 'completed';
  return event.category === 'contribution' ? 'proposed' : 'recorded';
}

for (const file of files) {
  const path = `${root}/${file}`;
  const batch = JSON.parse(readFileSync(path, 'utf8'));
  batch.schemaVersion = '1.1.0';
  for (const source of batch.sources) source.lastVerifiedAt ??= source.accessedAt;
  const sourceMap = new Map(batch.sources.map(source => [source.id, source]));
  for (const entry of batch.members) {
    entry.reviewedSourceTypes = reviewSources;
    const member = rosterById.get(entry.memberId);
    for (const event of entry.events) {
      const cited = event.sourceIds.map(id => sourceMap.get(id));
      const publishers = new Set(cited.map(source => source.publisher));
      const hasPrimary = cited.some(source => ['official', 'court', 'statement'].includes(source.sourceType));
      event.evidenceLevel = hasPrimary ? 'official_confirmed' : publishers.size >= 2 ? 'independently_corroborated' : 'attributed_claim';
      event.roleType = roleType(event.role);
      event.mandateRelation = event.occurredAt < member.serviceStart ? 'before_legislative_service' : 'current_term';
      event.resultStatus = resultStatus(event);
      event.visibility = hasPrimary || publishers.size >= 2 ? 'public' : 'withheld';
    }
  }
  writeFileSync(path, `${JSON.stringify(batch, null, 2)}\n`);
}

console.log(`Enriched ${files.length} event batches.`);
