import { readFileSync, readdirSync } from 'node:fs';
import assert from 'node:assert/strict';

const roster = JSON.parse(readFileSync('data/research/ly11-2026.json', 'utf8'));
const batchFiles = readdirSync('data/research').filter(name => /^events-.*\.json$/.test(name));
const categories = ['contribution', 'good_deed', 'concern', 'anecdote'];
const processStatuses = new Set(['documented', 'reported', 'disputed', 'investigation', 'under_investigation', 'indicted', 'judgment_appealable', 'remanded', 'resolved']);
const evidenceLevels = new Set(['official_confirmed', 'independently_corroborated', 'attributed_claim']);
const roleTypes = new Set(['lead_proposer', 'co_proposer', 'cosigner', 'questioner', 'coordinator', 'donor', 'subject', 'participant']);
const mandateRelations = new Set(['current_term', 'prior_public_role', 'before_legislative_service']);
const resultStatuses = new Set(['proposed', 'under_review', 'passed', 'implemented', 'completed', 'recorded', 'alleged', 'under_investigation', 'indicted', 'appealable', 'final', 'resolved']);
const reviewSourceTypes = ['legislative', 'government', 'oversight_and_judicial', 'independent_news', 'statements'];
const allMemberIds = new Set();
const allSourceIds = new Set();
const allEventIds = new Set();
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
const required = (value, label) => assert.ok(typeof value === 'string' && value.trim(), `${label} is required`);

for (const file of batchFiles) {
const batch = JSON.parse(readFileSync(`data/research/${file}`, 'utf8'));
assert.equal(batch.documentType, 'legislatorEventBatch');
assert.equal(batch.schemaVersion, '1.1.0');
assert.equal(batch.reviewStatus, 'verified');
assert.ok(validDate(batch.researchedAt) && validDate(batch.periodStart));
const cutoff = new Date(`${batch.researchedAt}T00:00:00Z`);
cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 5);
assert.equal(batch.periodStart, cutoff.toISOString().slice(0, 10));
assert.ok(Boolean(batch.regionName) !== Boolean(batch.seatType), `${file} must identify exactly one region or seat type`);
const expected = roster.members.filter(member => batch.seatType ? member.seatType === batch.seatType : member.regionName === batch.regionName).map(member => member.id).sort();
assert.deepEqual([...batch.memberIds].sort(), expected, 'Batch must cover the complete region');
assert.deepEqual(batch.members.map(member => member.memberId).sort(), expected);

const sources = new Map();
for (const source of batch.sources) {
  required(source.id, 'source id'); required(source.title, 'source title');
  required(source.publisher, 'source publisher'); required(source.evidenceLocator, 'source locator');
  assert.ok(!sources.has(source.id), `Duplicate source: ${source.id}`);
  assert.ok(!allSourceIds.has(source.id), `Source reused across batches: ${source.id}`);
  allSourceIds.add(source.id);
  assert.ok(new URL(source.url).protocol === 'https:');
  assert.ok(validDate(source.accessedAt) && source.accessedAt <= batch.researchedAt);
  assert.ok(source.publishedAt === null || validDate(source.publishedAt));
  assert.ok(source.publishedAt === null || source.publishedAt <= source.accessedAt, `${source.id} publication follows access date`);
  required(source.lastVerifiedAt, `${source.id} last verification date`);
  assert.ok(validDate(source.lastVerifiedAt) && source.lastVerifiedAt >= source.accessedAt, `${source.id} invalid last verification date`);
  assert.ok(['official', 'court', 'news', 'statement', 'other'].includes(source.sourceType));
  sources.set(source.id, source);
}

const eventIds = new Set();
const citedSourceIds = new Set();
for (const member of batch.members) {
  assert.ok(!allMemberIds.has(member.memberId), `Member reused across batches: ${member.memberId}`);
  allMemberIds.add(member.memberId);
  assert.equal(member.reviewedAt, batch.researchedAt);
  assert.deepEqual([...member.reviewedCategories].sort(), [...categories].sort());
  assert.deepEqual([...member.reviewedSourceTypes].sort(), [...reviewSourceTypes].sort());
  for (const record of member.backgroundRecords ?? []) {
    required(record.id, 'background id'); required(record.title, 'background title');
    required(record.summary, 'background summary'); required(record.role, 'background role');
    assert.ok(Array.isArray(record.sourceIds) && record.sourceIds.length, `${record.id} needs sources`);
    for (const id of record.sourceIds) {
      assert.ok(sources.has(id), `${record.id} unknown source ${id}`);
      citedSourceIds.add(id);
    }
  }
  for (const event of member.events) {
    required(event.id, 'event id'); required(event.title, 'event title');
    required(event.summary, 'event summary'); required(event.role, 'event role');
    required(event.outcome, 'event outcome'); required(event.processStatus, 'event status');
    assert.ok(processStatuses.has(event.processStatus), `${event.id} has unknown process status`);
    assert.ok(evidenceLevels.has(event.evidenceLevel), `${event.id} has unknown evidence level`);
    assert.ok(roleTypes.has(event.roleType), `${event.id} has unknown role type`);
    assert.ok(mandateRelations.has(event.mandateRelation), `${event.id} has unknown mandate relation`);
    assert.ok(resultStatuses.has(event.resultStatus), `${event.id} has unknown result status`);
    assert.ok(['public', 'withheld'].includes(event.visibility), `${event.id} has unknown visibility`);
    assert.ok(!eventIds.has(event.id), `Duplicate event: ${event.id}`);
    assert.ok(!allEventIds.has(event.id), `Event reused across batches: ${event.id}`);
    allEventIds.add(event.id);
    eventIds.add(event.id);
    assert.ok(categories.includes(event.category));
    assert.ok(validDate(event.occurredAt) && event.occurredAt >= batch.periodStart && event.occurredAt <= batch.researchedAt);
    assert.ok(Array.isArray(event.sourceIds) && event.sourceIds.length, `${event.id} needs sources`);
    for (const id of event.sourceIds) {
      assert.ok(sources.has(id), `${event.id} unknown source ${id}`);
      citedSourceIds.add(id);
    }
    const cited = event.sourceIds.map(id => sources.get(id));
    const hasPrimary = cited.some(source => ['official', 'court', 'statement'].includes(source.sourceType));
    const hasIndependentCorroboration = new Set(cited.map(source => source.publisher)).size >= 2;
    if (event.visibility === 'public') assert.ok(hasPrimary || hasIndependentCorroboration, `${event.id} does not meet publication threshold`);
    if (event.category === 'concern') {
      required(event.personResponse, `${event.id} person response`);
      required(event.resolution, `${event.id} resolution`);
      assert.ok(cited.some(source => ['official', 'court'].includes(source.sourceType)) || new Set(cited.map(source => source.publisher)).size >= 2, `${event.id} needs a formal record or independent corroboration`);
    }
  }
}
assert.deepEqual([...citedSourceIds].sort(), [...sources.keys()].sort(), `${file} has unused sources`);
console.log(`Validated ${batch.regionName ?? batch.seatLabel}: ${batch.members.length} members, ${eventIds.size} events, ${sources.size} sources.`);
}
assert.deepEqual([...allMemberIds].sort(), roster.members.map(member => member.id).sort(), 'Event batches must cover every public roster member');
console.log(`Validated complete event coverage for ${allMemberIds.size} public members.`);
