import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import polygonClipping from 'polygon-clipping';

const root = resolve(import.meta.dirname, '..');
const sourceDir = resolve(root, 'data/electoral-districts/source');
const villageSourceDir = resolve(sourceDir, 'nlsc-counties');
const outputDir = resolve(root, 'apps/web/src/data/district-geometry');
const metadataPath = resolve(root, 'apps/web/src/data/electoral-districts.json');
const sourceManifest = JSON.parse(await readFile(resolve(sourceDir, 'manifest.json'), 'utf8'));
const roster = JSON.parse(await readFile(resolve(root, 'data/research/ly11-2026.json'), 'utf8'));
const csvBytes = await readFile(resolve(sourceDir, 'cec-term-11.csv'));
const csvHash = createHash('sha256').update(csvBytes).digest('hex');
if (csvHash !== sourceManifest.districtScope.sha256) throw new Error(`CEC CSV checksum mismatch: ${csvHash}`);

function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') { field += '"'; index += 1; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(field); field = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      row.push(field); field = '';
      if (row.some(value => value.length)) rows.push(row);
      row = [];
    } else field += char;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  const [header, ...values] = rows;
  return values.map(columns => Object.fromEntries(header.map((key, index) => [key.replace(/^\uFEFF/, ''), columns[index] ?? ''])));
}

const normalize = value => value.replace(/[\s　\[\]〔〕]/g, '');
const countyIdByName = new Map(Object.entries({
  宜蘭縣: '10002', 新竹縣: '10004', 苗栗縣: '10005', 彰化縣: '10007', 南投縣: '10008', 雲林縣: '10009',
  嘉義縣: '10010', 屏東縣: '10013', 臺東縣: '10014', 花蓮縣: '10015', 澎湖縣: '10016', 基隆市: '10017',
  新竹市: '10018', 嘉義市: '10020', 連江縣: '09007', 金門縣: '09020', 臺北市: '63000', 高雄市: '64000',
  新北市: '65000', 臺中市: '66000', 臺南市: '67000', 桃園市: '68000',
}));
const cecRows = parseCsv(csvBytes.toString('utf8'));
if (cecRows.length !== 73) throw new Error(`Expected 73 CEC districts, received ${cecRows.length}`);

const districtMembers = roster.members.filter(member => member.seatType === 'district');
const memberByLabel = new Map(districtMembers.map(member => [normalize(member.districtLabel), member]));
const countyIds = new Map();
for (const member of districtMembers) {
  const source = cecRows.find(row => normalize(row['選舉區']) === normalize(member.districtLabel));
  if (!source) throw new Error(`CEC district missing for ${member.districtLabel}`);
}

const serviceBase = sourceManifest.villageGeometry.mirrorServiceUrl;
async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.json();
}

let serviceVerified = false;
async function verifyService() {
  if (serviceVerified) return;
  const serviceMeta = await fetchJson(`${serviceBase}?f=json`);
  if (serviceMeta.editingInfo?.dataLastEditDate !== sourceManifest.villageGeometry.mirrorLastEditEpochMs) {
    throw new Error('Village geometry mirror changed; review and update the pinned source manifest before rebuilding.');
  }
  const countResult = await fetchJson(`${serviceBase}/query?where=1%3D1&returnCountOnly=true&f=json`);
  if (countResult.count !== sourceManifest.villageGeometry.expectedFeatureCount) {
    throw new Error(`Expected ${sourceManifest.villageGeometry.expectedFeatureCount} village features, received ${countResult.count}`);
  }
  serviceVerified = true;
}

async function loadCounty(countyName) {
  const countyId = countyIdByName.get(countyName);
  const cachedPath = resolve(villageSourceDir, `${countyId}.geojson`);
  try {
    const bytes = await readFile(cachedPath);
    const collection = JSON.parse(bytes.toString('utf8'));
    if (!collection.features?.length) throw new Error(`Empty cached village geometry for ${countyName}`);
    return { features: collection.features, bytes, cachedPath };
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  await verifyService();
  const params = new URLSearchParams({
    where: `COUNTYNAME='${countyName.replaceAll("'", "''")}'`,
    outFields: 'VILLCODE,COUNTYNAME,TOWNNAME,VILLNAME,COUNTYCODE,TOWNID',
    returnGeometry: 'true', outSR: '4326', f: 'geojson',
  });
  const collection = await fetchJson(`${serviceBase}/query?${params}`);
  if (!collection.features?.length) throw new Error(`No village geometry for ${countyName}`);
  const bytes = Buffer.from(`${JSON.stringify(collection)}\n`);
  await mkdir(villageSourceDir, { recursive: true });
  await writeFile(cachedPath, bytes);
  return { features: collection.features, bytes, cachedPath };
}

function parseScope(scopeText, countyName, features) {
  const scope = normalize(scopeText);
  const allTownNames = new Set(features.map(feature => normalize(feature.properties.TOWNNAME)));
  if (scope === normalize(countyName)) return [{ townName: '*', villageNames: null }];
  const [wholePart, villagePart] = scope.split('－');
  const townTokens = wholePart.split('、').filter(Boolean);
  let partialTown = null;
  if (villagePart !== undefined) partialTown = townTokens.pop();
  for (const town of townTokens) if (!allTownNames.has(town)) throw new Error(`${countyName}: unknown town ${town} in ${scopeText}`);
  const units = townTokens.map(townName => ({ townName, villageNames: null }));
  if (partialTown) {
    if (!allTownNames.has(partialTown)) throw new Error(`${countyName}: unknown partial town ${partialTown}`);
    const villageNames = villagePart.replace(/等\d+[里村]$/, '').split('、').filter(Boolean);
    const available = new Set(features.filter(feature => normalize(feature.properties.TOWNNAME) === partialTown).map(feature => normalize(feature.properties.VILLNAME)));
    for (const village of villageNames) if (!available.has(village)) throw new Error(`${countyName}${partialTown}: unknown village ${village}`);
    units.push({ townName: partialTown, villageNames });
  }
  return units;
}

function selectFeatures(features, units) {
  if (units[0]?.townName === '*') return features;
  return features.filter(feature => units.some(unit => {
    if (normalize(feature.properties.TOWNNAME) !== unit.townName) return false;
    return unit.villageNames === null || unit.villageNames.includes(normalize(feature.properties.VILLNAME));
  }));
}

function toMultiPolygon(geometry) {
  if (geometry.type === 'Polygon') return [geometry.coordinates];
  if (geometry.type === 'MultiPolygon') return geometry.coordinates;
  throw new Error(`Unsupported geometry ${geometry.type}`);
}

function quantize(value) {
  if (typeof value === 'number') return Number(value.toFixed(5));
  return value.map(quantize);
}

function mergeGeometry(features, districtName) {
  if (!features.length) throw new Error(`No source polygons selected for ${districtName}`);
  const polygons = features.map(feature => toMultiPolygon(feature.geometry));
  const coordinates = polygonClipping.union(...polygons);
  if (!coordinates.length) throw new Error(`Polygon union returned no geometry for ${districtName}`);
  return { type: 'MultiPolygon', coordinates: quantize(coordinates) };
}

function featureCenter(feature) {
  const points = [];
  const collect = value => {
    if (Array.isArray(value) && typeof value[0] === 'number') points.push(value);
    else if (Array.isArray(value)) value.forEach(collect);
  };
  collect(feature.geometry.coordinates);
  const xs = points.map(point => point[0]);
  const ys = points.map(point => point[1]);
  return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
}

function distanceSquared(left, right) {
  const [leftX, leftY] = featureCenter(left);
  const [rightX, rightY] = featureCenter(right);
  return (leftX - rightX) ** 2 + (leftY - rightY) ** 2;
}

await mkdir(outputDir, { recursive: true });
const metadata = [];
const sourceFiles = [];
const rowsByCounty = Map.groupBy(cecRows, row => memberByLabel.get(normalize(row['選舉區']))?.regionName);
for (const [countyName, rows] of rowsByCounty) {
  if (!countyName) throw new Error('CEC row could not be matched to a roster county');
  const countyId = countyIdByName.get(countyName);
  if (!countyId) throw new Error(`County ID missing for ${countyName}`);
  const source = rows.length > 1 ? await loadCounty(countyName) : null;
  const features = source?.features ?? [];
  if (source) sourceFiles.push({
    countyId, countyName,
    file: `data/electoral-districts/source/nlsc-counties/${countyId}.geojson`,
    sha256: createHash('sha256').update(source.bytes).digest('hex'),
    featureCount: features.length,
  });
  countyIds.set(countyName, countyId);
  const countyOutput = [];
  const assignedSourceIds = new Set();
  const selectionRecords = [];
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const member = memberByLabel.get(normalize(row['選舉區']));
    if (!member) throw new Error(`Roster member missing for ${row['選舉區']}`);
    const numberMatch = normalize(row['選舉區']).match(/第(\d+)選舉區$/);
    const districtNumber = numberMatch ? Number(numberMatch[1]) : 1;
    const id = `ly11-${countyId}-${String(districtNumber).padStart(2, '0')}`;
    const units = rows.length === 1 ? [{ townName: '*', villageNames: null }] : parseScope(row['選舉區範圍'], countyName, features);
    const selected = rows.length === 1 ? [] : selectFeatures(features, units);
    for (const feature of selected) {
      const sourceId = feature.properties.VILLCODE;
      if (assignedSourceIds.has(sourceId)) throw new Error(`${countyName}: village ${sourceId} assigned to more than one district`);
      assignedSourceIds.add(sourceId);
    }
    metadata.push({
      id, term: 11, name: member.districtLabel, countyId, countyName, districtNumber,
      scopeText: row['選舉區範圍'], memberId: member.id,
      sourceIds: ['cec-term-11-scope', 'nlsc-village-1120928'], units,
    });
    if (rows.length > 1) selectionRecords.push({ id, row, units, selected });
  }
  for (const feature of features.filter(item => !assignedSourceIds.has(item.properties.VILLCODE))) {
    if (normalize(feature.properties.VILLNAME)) continue;
    const townName = normalize(feature.properties.TOWNNAME);
    const candidates = selectionRecords.filter(record => record.units.some(unit => unit.townName === townName));
    if (!candidates.length) continue;
    const target = candidates.map(record => ({
      record,
      distance: Math.min(...record.selected.filter(item => normalize(item.properties.TOWNNAME) === townName).map(item => distanceSquared(feature, item))),
    })).sort((left, right) => left.distance - right.distance)[0]?.record;
    if (target) {
      target.selected.push(feature);
      assignedSourceIds.add(feature.properties.VILLCODE);
    }
  }
  if (rows.length > 1 && assignedSourceIds.size !== features.length) {
    const missing = features.filter(feature => !assignedSourceIds.has(feature.properties.VILLCODE)).map(feature => `${feature.properties.TOWNNAME}${feature.properties.VILLNAME}`);
    throw new Error(`${countyName}: ${missing.length} village polygons are not assigned: ${missing.slice(0, 10).join('、')}`);
  }
  for (const record of selectionRecords) countyOutput.push({
    id: record.id,
    geometry: mergeGeometry(record.selected, record.row['選舉區']),
    sourceFeatureCount: record.selected.length,
  });
  countyOutput.sort((a, b) => a.id.localeCompare(b.id));
  await writeFile(resolve(outputDir, `${countyId}.json`), `${JSON.stringify({ countyId, districts: countyOutput })}\n`);
  process.stdout.write(`${countyName} ${countyId}: ${countyOutput.length} districts\n`);
}

metadata.sort((a, b) => a.countyId.localeCompare(b.countyId) || a.districtNumber - b.districtNumber);
if (metadata.length !== 73 || new Set(metadata.map(item => item.memberId)).size !== 73) throw new Error('District/member mapping is not one-to-one');
await writeFile(metadataPath, `${JSON.stringify({
  schemaVersion: '1.0.0', term: 11, geometrySnapshot: sourceManifest.villageGeometry.snapshot,
  sources: [
    { id: 'cec-term-11-scope', license: sourceManifest.license, licenseUrl: sourceManifest.licenseUrl, ...sourceManifest.districtScope },
    { id: 'nlsc-village-1120928', license: sourceManifest.license, licenseUrl: sourceManifest.licenseUrl, ...sourceManifest.villageGeometry, rawCountyFiles: sourceFiles },
  ],
  districts: metadata,
}, null, 2)}\n`);
process.stdout.write(`Generated ${metadata.length} electoral districts.\n`);
