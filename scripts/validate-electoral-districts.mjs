import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const metadata = JSON.parse(await readFile(resolve(root, 'apps/web/src/data/electoral-districts.json'), 'utf8'));
const roster = JSON.parse(await readFile(resolve(root, 'data/research/ly11-2026.json'), 'utf8'));
const expectedSeats = new Map(Object.entries({
  '09007': 1, '09020': 1, '10002': 1, '10004': 2, '10005': 2, '10007': 4, '10008': 2, '10009': 2, '10010': 2,
  '10013': 2, '10014': 1, '10015': 1, '10016': 1, '10017': 1, '10018': 1, '10020': 1, '63000': 8, '64000': 8,
  '65000': 12, '66000': 8, '67000': 6, '68000': 6,
}));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function validateCoordinates(value, districtId) {
  if (Array.isArray(value) && typeof value[0] === 'number') {
    assert(value.length >= 2 && Number.isFinite(value[0]) && Number.isFinite(value[1]), `${districtId}: invalid coordinate`);
    assert(value[0] >= 118 && value[0] <= 123 && value[1] >= 21 && value[1] <= 27, `${districtId}: coordinate is outside Taiwan WGS84 bounds`);
    return;
  }
  assert(Array.isArray(value), `${districtId}: invalid coordinate nesting`);
  value.forEach(item => validateCoordinates(item, districtId));
}

assert(metadata.term === 11 && metadata.geometrySnapshot === '1120928', 'Unexpected electoral dataset version');
assert(metadata.districts.length === 73, `Expected 73 districts, received ${metadata.districts.length}`);
assert(new Set(metadata.districts.map(district => district.id)).size === 73, 'District IDs must be unique');
assert(new Set(metadata.districts.map(district => district.memberId)).size === 73, 'District representatives must be one-to-one');

const districtMembers = roster.members.filter(member => member.seatType === 'district');
const specialMembers = roster.members.filter(member => member.seatType !== 'district');
assert(districtMembers.length === 73, `Expected 73 district members, received ${districtMembers.length}`);
assert(districtMembers.every(member => member.electoralDistrictId), 'Every district member must reference an electoral district');
assert(specialMembers.every(member => member.electoralDistrictId === null), 'Special-seat members must not reference a geographic district');
for (const district of metadata.districts) {
  const matched = districtMembers.filter(member => member.id === district.memberId && member.electoralDistrictId === district.id);
  assert(matched.length === 1, `${district.id}: representative mapping is not one-to-one`);
  assert(/^ly11-\d{5}-\d{2}$/.test(district.id), `${district.id}: unstable ID format`);
  assert(district.term === 11 && district.sourceIds.length === 2, `${district.id}: missing term or source provenance`);
}

for (const [countyId, expected] of expectedSeats) {
  const districts = metadata.districts.filter(district => district.countyId === countyId);
  assert(districts.length === expected, `${countyId}: expected ${expected} seats, received ${districts.length}`);
  const geometry = JSON.parse(await readFile(resolve(root, `apps/web/src/data/district-geometry/${countyId}.json`), 'utf8'));
  assert(geometry.countyId === countyId, `${countyId}: geometry county mismatch`);
  assert(geometry.districts.length === (expected > 1 ? expected : 0), `${countyId}: unexpected geometry count`);
  for (const feature of geometry.districts) {
    assert(feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon', `${feature.id}: invalid geometry type`);
    validateCoordinates(feature.geometry.coordinates, feature.id);
  }
}

const villageSource = metadata.sources.find(source => source.id === 'nlsc-village-1120928');
assert(villageSource?.license && villageSource?.releaseUrl, 'NLSC license or source URL missing');
for (const rawFile of villageSource.rawCountyFiles) {
  const bytes = await readFile(resolve(root, rawFile.file));
  assert(createHash('sha256').update(bytes).digest('hex') === rawFile.sha256, `${rawFile.countyId}: raw source checksum mismatch`);
  const raw = JSON.parse(bytes.toString('utf8'));
  assert(raw.features.length === rawFile.featureCount, `${rawFile.countyId}: raw feature count mismatch`);
  const generated = JSON.parse(await readFile(resolve(root, `apps/web/src/data/district-geometry/${rawFile.countyId}.json`), 'utf8'));
  assert(generated.districts.reduce((sum, district) => sum + district.sourceFeatureCount, 0) === raw.features.length, `${rawFile.countyId}: districts do not completely partition the source polygons`);
}

const splitCases = [
  ['臺北市', '士林區'], ['新北市', '三重區'], ['桃園市', '桃園區'], ['臺南市', '東區'],
];
for (const [countyName, townName] of splitCases) {
  const parts = metadata.districts.flatMap(district => district.countyName === countyName ? district.units.filter(unit => unit.townName === townName) : []);
  assert(parts.length >= 2 && parts.every(unit => Array.isArray(unit.villageNames) && unit.villageNames.length > 0), `${countyName}${townName}: village-level split was degraded`);
}

process.stdout.write(`Validated ${metadata.districts.length} electoral districts across ${expectedSeats.size} counties/cities.\n`);
