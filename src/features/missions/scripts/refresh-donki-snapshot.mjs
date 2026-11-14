import { randomUUID } from 'node:crypto';
import { rename, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const endpoint = 'https://api.nasa.gov/DONKI/CME';
const snapshotPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../data/donki-cme-snapshot.json',
);

function isDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function getAnalysis(record) {
  if (!Array.isArray(record.cmeAnalyses)) return undefined;
  const analyses = record.cmeAnalyses.filter(
    analysis => isRecord(analysis) && Number.isFinite(analysis.speed) && analysis.speed > 0,
  );
  return analyses.find(analysis => analysis.isMostAccurate === true) ?? analyses[0];
}

export function createSnapshot(rawResponse, { startDate, endDate }, retrievedAt) {
  if (!Array.isArray(rawResponse) || rawResponse.length === 0) {
    throw new Error('NASA DONKI returned no CME records; the existing snapshot was not changed.');
  }
  if (!isDate(startDate) || !isDate(endDate) || startDate > endDate) {
    throw new Error('The DONKI date range must use YYYY-MM-DD dates with startDate <= endDate.');
  }
  if (Number.isNaN(Date.parse(retrievedAt))) {
    throw new Error('Snapshot retrieval time must be a valid timestamp.');
  }

  const candidates = rawResponse
    .filter(record => isRecord(record)
      && typeof record.activityID === 'string'
      && typeof record.startTime === 'string'
      && !Number.isNaN(Date.parse(record.startTime))
      && getAnalysis(record) !== undefined)
    .sort((left, right) => Date.parse(right.startTime) - Date.parse(left.startTime));
  const selected = candidates[0];
  if (!selected) {
    throw new Error('NASA DONKI returned no CME with a usable speed analysis; the existing snapshot was not changed.');
  }

  const analysis = getAnalysis(selected);
  return {
    metadata: {
      endpoint,
      queryParameters: { startDate, endDate },
      queryUrl: `${endpoint}?startDate=${startDate}&endDate=${endDate}`,
      apiKey: 'NASA_API_KEY or DEMO_KEY; key omitted from archived metadata',
      retrievedAt,
      observationAt: selected.startTime,
      observationId: selected.activityID,
      units: 'CME analysis speed in km/s',
      attribution: 'NASA CCMC Space Weather Database Of Notifications, Knowledge, Information (DONKI). NASA data, imagery, and technical information may not be used to state or imply the endorsement by NASA or by any NASA employee of a commercial product, service, or activity, or used in any manner that might mislead.',
    },
    observation: {
      activityID: selected.activityID,
      startTime: selected.startTime,
      sourceLocation: typeof selected.sourceLocation === 'string' ? selected.sourceLocation : '',
      activeRegionNum: Number.isInteger(selected.activeRegionNum) ? selected.activeRegionNum : null,
      speedKmPerSecond: analysis.speed,
      analysisType: typeof analysis.type === 'string' ? analysis.type : 'unspecified',
      halfAngleDegrees: Number.isFinite(analysis.halfAngle) ? analysis.halfAngle : null,
      catalogUrl: typeof selected.link === 'string' ? selected.link : '',
    },
    rawResponse,
  };
}

function defaultDateRange(now = new Date()) {
  const endDate = now.toISOString().slice(0, 10);
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - 7);
  return { startDate: start.toISOString().slice(0, 10), endDate };
}

export async function refreshSnapshot({
  startDate,
  endDate,
  apiKey = process.env.NASA_API_KEY || 'DEMO_KEY',
  fetchImpl = fetch,
  destination = snapshotPath,
  now = new Date(),
}) {
  const dates = startDate && endDate ? { startDate, endDate } : defaultDateRange(now);
  if (!isDate(dates.startDate) || !isDate(dates.endDate) || dates.startDate > dates.endDate) {
    throw new Error('Usage: provide a valid START_DATE and END_DATE in YYYY-MM-DD format.');
  }

  const requestUrl = new URL(endpoint);
  requestUrl.search = new URLSearchParams({
    startDate: dates.startDate,
    endDate: dates.endDate,
    api_key: apiKey,
  });
  const response = await fetchImpl(requestUrl, { signal: AbortSignal.timeout(20_000) });
  if (!response.ok) {
    throw new Error(`NASA DONKI request failed with HTTP ${response.status}; the existing snapshot was not changed.`);
  }

  let rawResponse;
  try {
    rawResponse = await response.json();
  } catch {
    throw new Error('NASA DONKI returned invalid JSON; the existing snapshot was not changed.');
  }

  const snapshot = createSnapshot(rawResponse, dates, now.toISOString());
  const temporaryPath = `${destination}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporaryPath, `${JSON.stringify(snapshot, null, 2)}\n`, { flag: 'wx' });
    await rename(temporaryPath, destination);
  } finally {
    await rm(temporaryPath, { force: true });
  }
  return snapshot;
}

async function main() {
  const [, , startDate, endDate] = process.argv;
  if ((startDate && !endDate) || (!startDate && endDate)) {
    throw new Error('Usage: node refresh-donki-snapshot.mjs [START_DATE END_DATE]');
  }
  const snapshot = await refreshSnapshot({ startDate, endDate });
  console.log(`Saved ${snapshot.rawResponse.length} DONKI CME records.`);
  console.log(`Selected ${snapshot.observation.activityID} (${snapshot.observation.speedKmPerSecond} km/s).`);
  console.log(`Snapshot: ${snapshotPath}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => {
    console.error(`DONKI snapshot refresh failed: ${error.message}`);
    process.exitCode = 1;
  });
}
