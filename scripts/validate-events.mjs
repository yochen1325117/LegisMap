import { readFileSync, readdirSync } from 'node:fs';
import assert from 'node:assert/strict';

const roster = JSON.parse(readFileSync('data/research/ly11-2026.json', 'utf8'));
const batchFiles = readdirSync('data/research').filter(name => /^events-.*\.json$/.test(name));
const categories = ['contribution', 'good_deed', 'concern', 'anecdote'];
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
const required = (value, label) => assert.ok(typeof value === 'string' && value.trim(), `${label} is required`);

for (const file of batchFiles) {
const batch = JSON.parse(readFileSync(`data/research/${file}`, 'utf8'));
assert.equal(batch.documentType, 'legislatorEventBatch');
assert.equal(batch.schemaVersion, '1.0.0');
assert.equal(batch.reviewStatus, 'verified');
assert.ok(validDate(batch.researchedAt) && validDate(batch.periodStart));
const cutoff = new Date(`${batch.researchedAt}T00:00:00Z`);
cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 5);
assert.equal(batch.periodStart, cutoff.toISOString().slice(0, 10));
const expected = roster.members.filter(member => member.regionName === batch.regionName).map(member => member.id).sort();
assert.deepEqual([...batch.memberIds].sort(), expected, 'Batch must cover the complete region');
assert.deepEqual(batch.members.map(member => member.memberId).sort(), expected);

const sources = new Map();
for (const source of batch.sources) {
  required(source.id, 'source id'); required(source.title, 'source title');
  required(source.publisher, 'source publisher'); required(source.evidenceLocator, 'source locator');
  assert.ok(!sources.has(source.id), `Duplicate source: ${source.id}`);
  assert.ok(new URL(source.url).protocol === 'https:');
  assert.ok(validDate(source.accessedAt) && source.accessedAt <= batch.researchedAt);
  assert.ok(source.publishedAt === null || validDate(source.publishedAt));
  assert.ok(['official', 'court', 'news', 'statement', 'other'].includes(source.sourceType));
  sources.set(source.id, source);
}

const eventIds = new Set();
for (const member of batch.members) {
  assert.equal(member.reviewedAt, batch.researchedAt);
  assert.deepEqual([...member.reviewedCategories].sort(), [...categories].sort());
  for (const event of member.events) {
    required(event.id, 'event id'); required(event.title, 'event title');
    required(event.summary, 'event summary'); required(event.role, 'event role');
    required(event.outcome, 'event outcome'); required(event.processStatus, 'event status');
    assert.ok(!eventIds.has(event.id), `Duplicate event: ${event.id}`);
    eventIds.add(event.id);
    assert.ok(categories.includes(event.category));
    assert.ok(validDate(event.occurredAt) && event.occurredAt >= batch.periodStart && event.occurredAt <= batch.researchedAt);
    assert.ok(Array.isArray(event.sourceIds) && event.sourceIds.length, `${event.id} needs sources`);
    for (const id of event.sourceIds) assert.ok(sources.has(id), `${event.id} unknown source ${id}`);
    if (event.category === 'concern') {
      required(event.personResponse, `${event.id} person response`);
      required(event.resolution, `${event.id} resolution`);
      assert.ok(event.sourceIds.some(id => sources.get(id).sourceType === 'official'));
    }
  }
}
console.log(`Validated ${batch.regionName}: ${batch.members.length} members, ${eventIds.size} events, ${sources.size} sources.`);
}
