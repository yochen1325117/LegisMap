import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { readJson, root } from './workflow-utils.mjs';

const [sourceFile, batchId] = process.argv.slice(2);
if (!sourceFile || !batchId) {
  throw new Error('Usage: npm run data:import:independent -- <source-file> <batch-id>');
}

const manifestFile = path.join(root, 'batches', batchId, 'manifest.json');
if (!existsSync(manifestFile)) throw new Error(`Unknown batch ${batchId}`);
const manifest = readJson(manifestFile);
if (manifest.independentVersionId) throw new Error(`${batchId} already references an independent version`);

const version = JSON.parse(readFileSync(path.resolve(sourceFile), 'utf8'));
if (version.track !== 'independent' || version.batchId !== batchId) throw new Error('Imported version has invalid track or batch');
if (!/^independent-[a-z0-9-]+-r\d+$/.test(version.versionId ?? '')) throw new Error('Imported versionId is invalid');
if (version.lockedAt || version.contentHash) throw new Error('Imported version must be unlocked so the receiving workflow can validate and lock it');
if (!version.performedBy || version.performedBy === 'primary-research') throw new Error('Independent version must identify an independent performer');
if (/primaryCandidateId|primary-candidate/i.test(JSON.stringify(version))) throw new Error('Independent version references primary candidates');

const destinationDirectory = path.join(root, 'independent', batchId);
const destinationFile = path.join(destinationDirectory, `${version.versionId}.json`);
if (existsSync(destinationFile)) throw new Error(`Refusing to overwrite ${destinationFile}`);
mkdirSync(destinationDirectory, { recursive: true });
writeFileSync(destinationFile, `${JSON.stringify(version, null, 2)}\n`);
console.log(`Imported independent version to ${destinationFile}`);
