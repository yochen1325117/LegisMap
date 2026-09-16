import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const files = process.argv.slice(2).flatMap(input => {
  const filename = resolve(input);
  try { return statSync(filename).isDirectory() ? readdirSync(filename).filter(name => name.endsWith('.json')).map(name => join(input, name)) : [input]; }
  catch { return [input]; }
});
if (!files.length) {
  console.error('Usage: npm run data:validate -- data/research/ly11-001.json [...] (or data/research directory)');
  process.exit(2);
}

let errors = 0;
let activeRosterIds = null;
const researchedMemberIds = new Set();
let batchFiles = 0;
const fail = (path, message) => { console.error(`${path}: ${message}`); errors++; };
const requiredString = (value, path) => {
  if (typeof value !== 'string' || !value.trim() || /REPLACE|請填|YYYY-MM-DD/.test(value)) fail(path, '需要已查證的非佔位文字');
};
const nullableString = (value, path) => { if (value !== null) requiredString(value, path); };
const date = (value, path, nullable = false) => {
  if (nullable && value === null) return;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value)) || new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value) fail(path, '日期必須為真實的 YYYY-MM-DD');
};
const url = (value, path) => {
  try { if (!['http:', 'https:'].includes(new URL(value).protocol) || /REPLACE|example\.com/.test(value)) throw new Error(); }
  catch { fail(path, '需要直接且非佔位的 http(s) URL'); }
};
const array = (value, path) => { if (!Array.isArray(value)) { fail(path, '必須是陣列'); return []; } return value; };
const oneOf = (value, choices, path) => { if (!choices.includes(value)) fail(path, `只接受 ${choices.join(' / ')}`); };

for (const input of files) {
  const filename = resolve(input);
  let data;
  try { data = JSON.parse(readFileSync(filename, 'utf8')); }
  catch (cause) { fail(filename, `無法讀取 JSON：${cause.message}`); continue; }
  const path = input;
  if (!data || typeof data !== 'object' || Array.isArray(data)) { fail(path, '根節點必須是物件'); continue; }
  if (data.schemaVersion !== '1.0.0') fail(`${path}.schemaVersion`, '目前只支援 1.0.0');
  if (!Number.isInteger(data.term) || data.term < 1) fail(`${path}.term`, '需為正整數');
  date(data.asOfDate, `${path}.asOfDate`);
  if (data.documentType === 'roster') {
    if (!data.source || typeof data.source !== 'object') fail(`${path}.source`, '需要官方名單來源');
    else {
      requiredString(data.source.title, `${path}.source.title`);
      requiredString(data.source.publisher, `${path}.source.publisher`);
      url(data.source.url, `${path}.source.url`);
      date(data.source.accessedAt, `${path}.source.accessedAt`);
    }
    const seen = new Set();
    for (const section of ['active', 'former']) {
      for (const [i, member] of array(data[section], `${path}.${section}`).entries()) {
        const p = `${path}.${section}[${i}]`;
        if (!member || typeof member !== 'object') { fail(p, '必須是物件'); continue; }
        if (!new RegExp(`^ly${data.term}-\\d+$`).test(member.id)) fail(`${p}.id`, `應使用 ly${data.term}-官方個人頁nodeid`);
        if (seen.has(member.id)) fail(`${p}.id`, '現任／離職名單間有重複 ID');
        seen.add(member.id);
        requiredString(member.name, `${p}.name`);
        url(member.officialProfileUrl, `${p}.officialProfileUrl`);
        const nodeId = /[?&]nodeid=(\d+)/.exec(member.officialProfileUrl ?? '')?.[1];
        if (member.id !== `ly${data.term}-${nodeId}`) fail(`${p}.id`, 'ID 與官方個人頁 nodeid 不一致');
      }
    }
    if (!seen.size) fail(path, '名單不可為空');
    if (activeRosterIds !== null) fail(path, '同一次檢查只能提供一份官方名單');
    activeRosterIds = new Set(data.active.map(member => member.id));
    array(data.researchNotes, `${path}.researchNotes`).forEach((note, i) => requiredString(note, `${path}.researchNotes[${i}]`));
    console.log(`${input}: ${data.active?.length ?? 0} active, ${data.former?.length ?? 0} former, ${errors ? 'see errors above' : 'structure OK'}`);
    continue;
  }
  if (data.documentType !== 'batch') fail(`${path}.documentType`, '必須是 roster 或 batch');
  batchFiles++;
  requiredString(data.batchId, `${path}.batchId`);
  requiredString(data.rosterSourceId, `${path}.rosterSourceId`);
  oneOf(data.reviewStatus, ['pending', 'approved'], `${path}.reviewStatus`);
  if (data.reviewStatus === 'approved') {
    requiredString(data.reviewedBy, `${path}.reviewedBy`);
    date(data.reviewedAt, `${path}.reviewedAt`);
  } else if (data.reviewedBy !== null || data.reviewedAt !== null) fail(path, 'pending 批次的審核者與日期應為 null');
  array(data.researchNotes, `${path}.researchNotes`).forEach((note, i) => requiredString(note, `${path}.researchNotes[${i}]`));

  const sources = array(data.sources, `${path}.sources`);
  const sourceById = new Map();
  for (const [i, source] of sources.entries()) {
    const p = `${path}.sources[${i}]`;
    if (!source || typeof source !== 'object') { fail(p, '必須是物件'); continue; }
    requiredString(source.id, `${p}.id`);
    if (sourceById.has(source.id)) fail(`${p}.id`, '來源 ID 重複');
    sourceById.set(source.id, source);
    requiredString(source.title, `${p}.title`);
    requiredString(source.publisher, `${p}.publisher`);
    url(source.url, `${p}.url`);
    oneOf(source.sourceType, ['official', 'court', 'news', 'statement', 'other'], `${p}.sourceType`);
    date(source.publishedAt, `${p}.publishedAt`, true);
    date(source.accessedAt, `${p}.accessedAt`);
    requiredString(source.evidenceLocator, `${p}.evidenceLocator`);
  }
  if (!sourceById.has(data.rosterSourceId)) fail(`${path}.rosterSourceId`, '找不到來源 ID');
  const checkRefs = (ids, p) => {
    for (const [i, id] of array(ids, p).entries()) if (!sourceById.has(id)) fail(`${p}[${i}]`, `找不到來源 ID ${id}`);
  };

  const members = array(data.members, `${path}.members`);
  if (!members.length) fail(`${path}.members`, '至少需要一位委員');
  const memberIds = new Set();
  const recordIds = new Set();
  for (const [i, member] of members.entries()) {
    const p = `${path}.members[${i}]`;
    if (!member || typeof member !== 'object') { fail(p, '必須是物件'); continue; }
    if (!new RegExp(`^ly${data.term}-\\d+$`).test(member.id)) fail(`${p}.id`, `應使用 ly${data.term}-官方個人頁nodeid`);
    if (memberIds.has(member.id)) fail(`${p}.id`, '委員 ID 重複');
    if (researchedMemberIds.has(member.id)) fail(`${p}.id`, '不同批次重複研究同一委員');
    memberIds.add(member.id);
    researchedMemberIds.add(member.id);
    requiredString(member.name, `${p}.name`);
    url(member.officialProfileUrl, `${p}.officialProfileUrl`);
    if (!member.officialProfileUrl?.includes('ly.gov.tw/Pages/List.aspx?nodeid=')) fail(`${p}.officialProfileUrl`, '應使用立法院委員個人頁');
    oneOf(member.mandateStatus, ['active', 'former'], `${p}.mandateStatus`);
    oneOf(member.seatType, ['district', 'plains_indigenous', 'mountain_indigenous', 'party_list'], `${p}.seatType`);
    nullableString(member.districtLabel, `${p}.districtLabel`);
    nullableString(member.electoralDistrictId, `${p}.electoralDistrictId`);
    const regions = array(member.regionNodeIds, `${p}.regionNodeIds`);
    regions.forEach((id, j) => { if (typeof id !== 'string' || !/^\d{5}(\d{3})?$/.test(id)) fail(`${p}.regionNodeIds[${j}]`, '應為 Taiwan-Atlas 5 或 8 位行政區 ID'); });
    if (member.seatType !== 'district' && (member.electoralDistrictId !== null || regions.length)) fail(p, '原住民及不分區席次不得指定縣市 polygon 或行政區 ID');
    nullableString(member.party, `${p}.party`);
    date(member.serviceStart, `${p}.serviceStart`, true);
    date(member.serviceEnd, `${p}.serviceEnd`, true);
    if (member.mandateStatus === 'active' && member.serviceEnd !== null) fail(`${p}.serviceEnd`, '現任委員的離職日期應為 null');
    for (const field of ['education', 'experience', 'committees']) array(member[field], `${p}.${field}`).forEach((value, j) => requiredString(value, `${p}.${field}[${j}]`));
    if (!member.fieldSourceIds || typeof member.fieldSourceIds !== 'object' || Array.isArray(member.fieldSourceIds)) fail(`${p}.fieldSourceIds`, '需要基本欄位來源對照');
    else {
      for (const field of ['name', 'mandateStatus', 'seatType', 'districtLabel', 'electoralDistrictId', 'regionNodeIds', 'party', 'serviceStart', 'serviceEnd', 'education', 'experience', 'committees']) {
        const value = member[field];
        if (value !== null && (!Array.isArray(value) || value.length)) {
          const refs = member.fieldSourceIds[field];
          if (!Array.isArray(refs) || !refs.length) fail(`${p}.fieldSourceIds.${field}`, '有資料的欄位需要來源 ID');
          else checkRefs(refs, `${p}.fieldSourceIds.${field}`);
        }
      }
    }
    array(member.researchNotes, `${p}.researchNotes`).forEach((note, j) => requiredString(note, `${p}.researchNotes[${j}]`));
    for (const section of ['actions', 'concerns']) {
      for (const [j, record] of array(member[section], `${p}.${section}`).entries()) {
        const q = `${p}.${section}[${j}]`;
        if (!record || typeof record !== 'object') { fail(q, '必須是物件'); continue; }
        requiredString(record.id, `${q}.id`);
        if (recordIds.has(record.id)) fail(`${q}.id`, '事件 ID 重複');
        recordIds.add(record.id);
        date(record.occurredAt, `${q}.occurredAt`);
        requiredString(record.title, `${q}.title`);
        requiredString(record.summary, `${q}.summary`);
        requiredString(record.evidenceLocator, `${q}.evidenceLocator`);
        if (!Array.isArray(record.sourceIds) || !record.sourceIds.length) fail(`${q}.sourceIds`, '事件至少需要一個具體來源');
        else checkRefs(record.sourceIds, `${q}.sourceIds`);
        if (section === 'actions') {
          oneOf(record.kind, ['proposal', 'co_sign', 'speech', 'vote', 'public_service', 'other'], `${q}.kind`);
          requiredString(record.role, `${q}.role`);
          nullableString(record.outcome, `${q}.outcome`);
        } else {
          oneOf(record.processStatus, ['reported', 'investigation', 'indictment', 'trial', 'judgment_nonfinal', 'judgment_final', 'dismissed', 'acquitted', 'corrected', 'resolved'], `${q}.processStatus`);
          nullableString(record.personResponse, `${q}.personResponse`);
          nullableString(record.resolution, `${q}.resolution`);
          const cited = record.sourceIds.map(id => sourceById.get(id)).filter(Boolean);
          if (record.processStatus === 'reported' && new Set(cited.map(source => source.publisher)).size < 2) fail(q, '僅有媒體指控時，需要至少兩個不同發布者的來源');
          if (record.processStatus !== 'reported' && !cited.some(source => ['official', 'court'].includes(source.sourceType))) fail(q, '正式程序或結果需要官方／法院第一手來源');
        }
      }
    }
  }
  console.log(`${input}: ${members.length} members, ${sources.length} sources, ${errors ? 'see errors above' : 'structure OK'}`);
}

if (activeRosterIds && batchFiles) {
  const missing = [...activeRosterIds].filter(id => !researchedMemberIds.has(id));
  if (missing.length) fail('coverage', `有 ${missing.length} 位現任委員尚無人物批次：${missing.join(', ')}`);
  const outside = [...researchedMemberIds].filter(id => !activeRosterIds.has(id));
  if (outside.length) console.warn(`提醒：${outside.length} 位批次人物不在現任名單，請確認是否為離職委員：${outside.join(', ')}`);
}

if (errors) { console.error(`${errors} validation error(s)`); process.exitCode = 1; }
else console.log('結構檢查通過。仍須人工核實每個事實與來源連結。');
