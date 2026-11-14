import donkiArchive from './data/donki-cme-snapshot.json';
import insightArchive from './data/insight-mars-weather-raw.json';

export type FeedStatus = 'fresh' | 'archive' | 'empty' | 'unavailable';
export type FeedError = 'offline' | 'timeout' | 'rate-limit' | 'http' | 'invalid' | 'aborted';
export interface CmeObservation {
  id: string;
  observedAt: string;
  speedKmPerSecond: number;
  instrument: string;
  catalogUrl: string;
}
export interface MarsImage {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  thumbnailUrl: string;
  catalogUrl: string;
  credit: string;
}
export interface ScienceFeed<T> {
  status: FeedStatus;
  data: T;
  fetchedAt: string | null;
  queryUrl: string;
  error: FeedError | null;
}
export interface ScienceSnapshot {
  solar: ScienceFeed<CmeObservation | null>;
  imagery: ScienceFeed<readonly MarsImage[]>;
  weather: {
    status: 'archive';
    sol: number;
    pressurePa: number;
    temperatureC: number;
    windMS: number;
    sourceUrl: string;
  };
}

const DONKI_ENDPOINT = 'https://api.nasa.gov/DONKI/CME';
const IMAGE_QUERY = 'https://images-api.nasa.gov/search?q=Mars%20sand%20Curiosity&media_type=image&page_size=8';
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const clean = (value: unknown, max = 180): string => typeof value === 'string'
  ? value.replace(/<[^>]*>/g, '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max)
  : '';
const timestamp = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value));

/** Only official HTTPS source links and thumbnail hosts can enter the rendered result. */
function nasaUrl(value: unknown, hosts: readonly string[]): string {
  if (typeof value !== 'string') return '';
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || !hosts.includes(url.hostname)) return '';
    return url.href;
  } catch { return ''; }
}

/** Latest usable analysis, not a Mars arrival forecast or a human radiation measurement. */
export function parseDonkiCmes(raw: unknown): CmeObservation | null {
  if (!Array.isArray(raw)) throw new Error('invalid');
  const usable = raw.flatMap(item => {
    if (!record(item) || !clean(item.activityID) || !timestamp(item.startTime) || !Array.isArray(item.cmeAnalyses)) return [];
    const analyses = item.cmeAnalyses.filter((analysis): analysis is Record<string, unknown> => record(analysis)
      && typeof analysis.speed === 'number' && Number.isFinite(analysis.speed) && analysis.speed > 0);
    const best = analyses.find(analysis => analysis.isMostAccurate === true) ?? analyses[0];
    if (!best) return [];
    const instruments = Array.isArray(item.instruments) ? item.instruments.flatMap(instrument => record(instrument) ? [clean(instrument.displayName, 70)] : []).filter(Boolean) : [];
    return [{
      id: clean(item.activityID),
      observedAt: item.startTime,
      speedKmPerSecond: best.speed as number,
      instrument: instruments.slice(0, 2).join(' · ') || 'Instrument not listed',
      catalogUrl: nasaUrl(item.link, ['ccmc.gsfc.nasa.gov']) || 'https://ccmc.gsfc.nasa.gov/tools/DONKI/',
    }];
  }).sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt));
  if (raw.length && !usable.length) throw new Error('invalid');
  return usable[0] ?? null;
}

export function parseMarsImages(raw: unknown): MarsImage[] {
  if (!record(raw) || !record(raw.collection) || !Array.isArray(raw.collection.items)) throw new Error('invalid');
  const seen = new Set<string>();
  const images = raw.collection.items.flatMap(item => {
    if (!record(item) || !Array.isArray(item.data) || !Array.isArray(item.links)) return [];
    const entry = item.data.find(data => record(data) && data.media_type === 'image');
    if (!record(entry) || !timestamp(entry.date_created)) return [];
    const id = clean(entry.nasa_id, 100), title = clean(entry.title, 160);
    const thumbnail = item.links.find(link => record(link) && link.rel === 'preview' && !!nasaUrl(link.href, ['images-assets.nasa.gov']));
    if (!id || !title || seen.has(id) || !record(thumbnail)) return [];
    const credit = clean(entry.secondary_creator || entry.photographer || entry.center, 180) || 'NASA';
    seen.add(id);
    return [{
      id, title, description: clean(entry.description, 350), createdAt: entry.date_created,
      thumbnailUrl: nasaUrl(thumbnail.href, ['images-assets.nasa.gov']),
      catalogUrl: `https://images.nasa.gov/details/${encodeURIComponent(id)}`,
      credit,
    }];
  }).slice(0, 4);
  if (raw.collection.items.length && !images.length) throw new Error('invalid');
  return images;
}

export function donkiDateRange(now: Date): { startDate: string; endDate: string; queryUrl: string } {
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - 7);
  const startDate = start.toISOString().slice(0, 10), endDate = now.toISOString().slice(0, 10);
  return { startDate, endDate, queryUrl: `${DONKI_ENDPOINT}?startDate=${startDate}&endDate=${endDate}` };
}

/** The shipped record is kept byte-for-byte; failed refreshes never claim it is current. */
export function archivedScienceSnapshot(): ScienceSnapshot {
  const source = donkiArchive.observation;
  const sol = insightArchive['675'];
  return {
    solar: {
      status: 'archive',
      data: {
        id: source.activityID, observedAt: source.startTime, speedKmPerSecond: source.speedKmPerSecond,
        instrument: 'NASA CCMC / DONKI archive', catalogUrl: source.catalogUrl,
      },
      fetchedAt: donkiArchive.metadata.retrievedAt,
      queryUrl: donkiArchive.metadata.queryUrl,
      error: null,
    },
    imagery: { status: 'unavailable', data: [], fetchedAt: null, queryUrl: IMAGE_QUERY, error: null },
    weather: {
      status: 'archive', sol: 675, pressurePa: sol.PRE.av, temperatureC: sol.AT.av, windMS: sol.HWS.av,
      sourceUrl: 'https://api.nasa.gov/insight_weather/?feedtype=json&ver=1.0',
    },
  };
}

class ScienceRequestError extends Error {
  constructor(readonly kind: FeedError) { super(kind); }
}
interface ScienceClientOptions {
  fetchImpl?: typeof fetch;
  now?: () => Date;
  timeoutMs?: number;
  cacheMs?: number;
}

export function createScienceClient(options: ScienceClientOptions = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? (() => new Date());
  const timeoutMs = Math.max(1, options.timeoutMs ?? 8000);
  const cacheMs = Math.max(0, options.cacheMs ?? 5 * 60_000);
  let cached: { at: number; snapshot: ScienceSnapshot } | undefined;

  async function json(url: string, external?: AbortSignal): Promise<unknown> {
    const controller = new AbortController();
    let timedOut = false;
    const cancel = () => controller.abort();
    if (external?.aborted) throw new ScienceRequestError('aborted');
    external?.addEventListener('abort', cancel, { once: true });
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
    try {
      const response = await fetchImpl(url, { signal: controller.signal, credentials: 'omit', headers: { Accept: 'application/json' } });
      if (!response.ok) throw new ScienceRequestError(response.status === 429 ? 'rate-limit' : 'http');
      try { return await response.json(); } catch { throw new ScienceRequestError('invalid'); }
    } catch (error) {
      if (timedOut) throw new ScienceRequestError('timeout');
      if (external?.aborted) throw new ScienceRequestError('aborted');
      if (error instanceof ScienceRequestError) throw error;
      throw new ScienceRequestError('offline');
    } finally {
      clearTimeout(timer);
      external?.removeEventListener('abort', cancel);
    }
  }

  return {
    async load({ signal, force = false }: { signal?: AbortSignal; force?: boolean } = {}): Promise<ScienceSnapshot> {
      const requested = now();
      if (!force && cached && requested.getTime() - cached.at < cacheMs) return cached.snapshot;
      const snapshot = archivedScienceSnapshot();
      const dates = donkiDateRange(requested);
      const solarUrl = `${dates.queryUrl}&api_key=DEMO_KEY`; // NASA's public demo key, never a private browser credential.
      snapshot.solar.queryUrl = dates.queryUrl;
      const fetchedAt = requested.toISOString();
      await Promise.all([
        (async () => {
          try {
            let observation: CmeObservation | null;
            try { observation = parseDonkiCmes(await json(solarUrl, signal)); }
            catch (error) { if (error instanceof ScienceRequestError) throw error; throw new ScienceRequestError('invalid'); }
            snapshot.solar = { status: observation ? 'fresh' : 'empty', data: observation, fetchedAt, queryUrl: dates.queryUrl, error: null };
          } catch (error) {
            snapshot.solar.error = error instanceof ScienceRequestError ? error.kind : 'invalid';
            // Preserve archive provenance; attempted query belongs in the separate requested-query metadata.
            snapshot.solar.queryUrl = donkiArchive.metadata.queryUrl;
          }
        })(),
        (async () => {
          try {
            let images: MarsImage[];
            try { images = parseMarsImages(await json(IMAGE_QUERY, signal)); }
            catch (error) { if (error instanceof ScienceRequestError) throw error; throw new ScienceRequestError('invalid'); }
            snapshot.imagery = { status: images.length ? 'fresh' : 'empty', data: images, fetchedAt, queryUrl: IMAGE_QUERY, error: null };
          } catch (error) { snapshot.imagery.error = error instanceof ScienceRequestError ? error.kind : 'invalid'; }
        })(),
      ]);
      if (!signal?.aborted && snapshot.solar.error === null && snapshot.imagery.error === null) cached = { at: requested.getTime(), snapshot };
      return snapshot;
    },
    clearCache() { cached = undefined; },
  };
}
