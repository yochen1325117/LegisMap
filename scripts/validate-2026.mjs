import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const data = JSON.parse(readFileSync('data/research/ly11-2026.json', 'utf8'));
const captured = JSON.parse(readFileSync('data/research/profile-capture.json', 'utf8'));
const electoral = JSON.parse(readFileSync('apps/web/src/data/electoral-districts.json', 'utf8'));
const electoralById = new Map(electoral.districts.map(district => [district.id, district]));
const date = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
const rocDate = value => {
  if (value === null) return null;
  const match = /^(\d+)年(\d+)月(\d+)日$/.exec(value);
  assert.ok(match, `Invalid captured ROC date: ${value}`);
  return `${Number(match[1]) + 1911}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
};
assert.equal(data.documentType, 'legislatorSnapshot');
assert.equal(data.schemaVersion, '2.0.0');
assert.equal(data.term, 11);
assert.equal(data.periodStart, '2026-01-01');
assert.ok(date(data.asOfDate));
assert.ok(data.asOfDate >= data.periodStart);
assert.equal(captured.length, data.roster.active.length + data.roster.former.length);

const byId = new Map();
for (const source of data.sources) {
  assert.ok(!byId.has(source.id), `Duplicate source ${source.id}`);
  assert.ok(source.title && source.publisher && source.evidenceLocator);
  assert.ok(date(source.accessedAt) && source.accessedAt <= data.asOfDate);
  assert.ok(/^https:\/\/www\.ly\.gov\.tw\/Pages\/List\.aspx\?nodeid=\d+$/.test(source.url));
  byId.set(source.id, source);
}
assert.ok(byId.has(data.rosterSourceId));
const rosterIds = new Set([...data.roster.active, ...data.roster.former]);
assert.equal(rosterIds.size, captured.length, 'Roster IDs must be unique');
const included = captured.filter(person => rocDate(person.start) <= data.asOfDate && (!person.end || rocDate(person.end) >= data.periodStart));
assert.equal(data.members.length, included.length, 'All 2026 officeholders must be included');
const memberIds = new Set();
for (const person of captured) {
  assert.ok(!person.error && person.name && person.district && person.start, `Incomplete captured profile: ${person.name}`);
  const id = `ly11-${new URL(person.url).searchParams.get('nodeid')}`;
  assert.ok(data.roster[person.status].includes(id), `Missing roster entry ${person.name}`);
}
for (const member of data.members) {
  assert.ok(!memberIds.has(member.id), `Duplicate member ${member.id}`);
  memberIds.add(member.id);
  assert.ok(rosterIds.has(member.id));
  const person = captured.find(item => item.url.endsWith(`nodeid=${member.id.slice(5)}`));
  assert.ok(person, `No captured profile for ${member.id}`);
  assert.equal(member.name, person.name);
  assert.equal(member.districtLabel, person.district);
  assert.equal(member.mandateStatus, person.status);
  assert.equal(member.serviceStart, rocDate(person.start));
  assert.equal(member.serviceEnd, rocDate(person.end));
  assert.ok(date(member.serviceStart) && member.serviceStart <= data.asOfDate);
  assert.ok(member.serviceEnd === null || (date(member.serviceEnd) && member.serviceEnd >= data.periodStart && member.serviceEnd <= data.asOfDate));
  assert.ok(member.seatType === 'district' ? member.regionName && member.districtLabel.startsWith(member.regionName) : member.regionName === null);
  if (member.seatType === 'district') {
    const district = electoralById.get(member.electoralDistrictId);
    assert.ok(district, `Unknown electoral district ${member.electoralDistrictId}`);
    assert.equal(district.memberId, member.id);
    assert.equal(district.name, member.districtLabel);
  } else assert.equal(member.electoralDistrictId, null);
  for (const field of ['name', 'districtLabel', 'mandateStatus', 'serviceStart', ...(member.serviceEnd ? ['serviceEnd'] : [])]) {
    const refs = member.fieldSourceIds[field];
    assert.ok(Array.isArray(refs) && refs.length, `${member.name}.${field} needs a source`);
    for (const ref of refs) assert.ok(byId.has(ref), `Unknown source ${ref}`);
  }
  const profileSource = byId.get(member.fieldSourceIds.districtLabel[0]);
  assert.equal(profileSource.url, person.url, `District source must be ${member.name}'s official page`);
}
console.log(`Validated ${data.members.length} public members, ${data.roster.active.length} active and ${data.roster.former.length} former roster entries, ${data.sources.length} sources.`);
