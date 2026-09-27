import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const roster = JSON.parse(readFileSync('data/research/ly11-2026.json', 'utf8'));
const data = JSON.parse(readFileSync('data/research/shared-events-2026.json', 'utf8'));
const memberIds = new Set(roster.members.map(member => member.id));
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
const required = (value, label) => assert.ok(typeof value === 'string' && value.trim(), `${label} is required`);
const roles = new Set(['lead_proposer','co_proposer','cosigner','questioner','amendment_mover','budget_mover','negotiator','voter','coordinator','donor','subject','participant']);
const eventTypes = new Set(['bill','budget_oversight','questioning','administrative_oversight','local_coordination','constitutional_duty','named_vote','public_service','accountability','profile']);
const outcomeStatuses = new Set(['passed','implemented','completed','resolved','final']);

assert.equal(data.documentType, 'sharedLegislatorResearch');
assert.equal(data.schemaVersion, '2.0.0');
assert.ok(validDate(data.generatedAt) && validDate(data.periodStart));
const sources = new Map();
const sourceUrls = new Set();
for (const source of data.sources) {
  required(source.id, 'source id'); required(source.title, 'source title'); required(source.publisher, 'source publisher');
  assert.ok(!sources.has(source.id), `duplicate source ${source.id}`);
  assert.ok(!sourceUrls.has(source.url), `duplicate source URL ${source.url}`);
  assert.equal(new URL(source.url).protocol, 'https:');
  assert.ok(validDate(source.accessedAt) && validDate(source.lastVerifiedAt) && source.lastVerifiedAt >= source.accessedAt);
  sources.set(source.id, source); sourceUrls.add(source.url);
}

const events = new Map();
const officialIds = new Map();
const citedSources = new Set();
for (const event of data.events) {
  required(event.id, 'event id'); required(event.title, 'event title'); required(event.outcome, 'event outcome');
  assert.ok(!events.has(event.id), `duplicate event ${event.id}`);
  assert.ok(eventTypes.has(event.type), `${event.id} invalid type`);
  assert.ok(validDate(event.occurredAt) && event.occurredAt >= data.periodStart && event.occurredAt <= data.generatedAt);
  if (event.officialId) {
    assert.ok(!officialIds.has(event.officialId), `official event duplicated: ${event.officialId}`);
    officialIds.set(event.officialId, event.id);
  }
  for (const id of event.sourceIds) { assert.ok(sources.has(id), `${event.id} unknown source ${id}`); citedSources.add(id); }
  events.set(event.id, event);
}

const participationIds = new Set();
const memberEventRoles = new Set();
for (const participation of data.participations) {
  required(participation.id, 'participation id'); required(participation.actionSummary, 'action summary'); required(participation.roleDescription, 'role description');
  assert.ok(!participationIds.has(participation.id), `duplicate participation ${participation.id}`);
  assert.ok(memberIds.has(participation.memberId), `${participation.id} unknown member`);
  assert.ok(events.has(participation.eventId), `${participation.id} unknown event`);
  assert.ok(roles.has(participation.roleType), `${participation.id} invalid role`);
  const uniqueRole = `${participation.eventId}|${participation.memberId}|${participation.roleType}`;
  assert.ok(!memberEventRoles.has(uniqueRole), `duplicate member event role ${uniqueRole}`);
  memberEventRoles.add(uniqueRole);
  const event = events.get(participation.eventId);
  if (event.type === 'named_vote') {
    assert.equal(participation.roleType, 'voter');
    assert.ok(['for','against','abstain','not_voting'].includes(participation.voteChoice));
    required(participation.voteChoiceLabel, `${participation.id} vote label`);
  } else assert.equal(participation.voteChoice, null, `${participation.id} must not infer a vote`);
  if (['cosigner','voter','participant'].includes(participation.roleType)) {
    assert.ok(!(event.category === 'contribution' && outcomeStatuses.has(event.resultStatus) && participation.actionSummary.includes('個人成果')), `${participation.id} overstates participation`);
  }
  for (const id of participation.sourceIds) { assert.ok(sources.has(id), `${participation.id} unknown source ${id}`); citedSources.add(id); }
  participationIds.add(participation.id);
}

const reviewMembers = new Set();
for (const review of data.memberReviews) {
  assert.ok(memberIds.has(review.memberId) && !reviewMembers.has(review.memberId), `invalid review ${review.memberId}`);
  assert.ok(validDate(review.periodStart) && validDate(review.reviewedAt));
  assert.deepEqual([...review.categories].sort(), ['anecdote','concern','contribution','good_deed']);
  assert.deepEqual([...review.sourceTypes].sort(), ['government','independent_news','legislative','oversight_and_judicial','statements']);
  for (const record of review.backgroundRecords) for (const id of record.sourceIds) { assert.ok(sources.has(id)); citedSources.add(id); }
  reviewMembers.add(review.memberId);
}
assert.deepEqual([...reviewMembers].sort(), [...memberIds].sort(), 'research reviews must cover all roster members');
assert.deepEqual([...citedSources].sort(), [...sources.keys()].sort(), 'all sources must be cited');
console.log(`Validated ${events.size} shared events, ${participationIds.size} participations, ${reviewMembers.size} member reviews, and ${sources.size} sources.`);
