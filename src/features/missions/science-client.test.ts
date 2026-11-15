import { describe, it, expect, vi } from 'vitest';
import { archivedScienceSnapshot, createScienceClient, donkiDateRange, parseDonkiCmes, parseMarsImages } from './science-client';
const now = () => new Date('2026-11-15T01:00:00.000Z');
const cme = (date = '2026-11-14T12:00Z') => ({
  activityID: `${date}-CME-001`, startTime: date,
  link: 'https://ccmc.gsfc.nasa.gov/DONKI/view/CME/123/-1',
  instruments: [{ displayName: 'SOHO: LASCO/C2' }],
  cmeAnalyses: [{ isMostAccurate: false, speed: 500 }, { isMostAccurate: true, speed: 650 }],
});
const imageItem = (id = 'PIA-test', thumbnail = 'https://images-assets.nasa.gov/image/PIA-test/PIA-test~thumb.jpg') => ({
  data: [{ nasa_id: id, title: '<b>Martian dune</b>', description: 'A rover view of <em>sand</em>.', media_type: 'image', date_created: '2020-03-12T00:00:00Z', secondary_creator: 'NASA/JPL-Caltech/MSSS' }],
  links: [{ rel: 'preview', href: thumbnail }],
});
const images = (...items: unknown[]) => ({ collection: { items } });
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
function scienceFetch() {
  return vi.fn<typeof fetch>(async input => String(input).includes('/DONKI/') ? response([cme()]) : response(images(imageItem())));
}

describe('NASA response validation', () => {
  it('selects the latest valid CME and its preferred analysis, preserving observed date and instrument', () => {
    const parsed = parseDonkiCmes([cme('2026-11-10T00:00Z'), cme()]);
    expect(parsed?.speedKmPerSecond).toBe(650);
    expect(parsed?.observedAt).toBe('2026-11-14T12:00Z');
    expect(parsed?.instrument).toContain('SOHO');
    expect(parsed?.catalogUrl).toMatch(/^https:\/\/ccmc\.gsfc\.nasa\.gov\//);
  });
  it('does not turn empty searches or unusable data into invented measurements', () => {
    expect(parseDonkiCmes([])).toBeNull();
    expect(() => parseDonkiCmes({ error: 'rate limit' })).toThrow('invalid');
    expect(() => parseDonkiCmes([{ ...cme(), cmeAnalyses: [{ speed: -1 }] }])).toThrow('invalid');
    expect(() => parseDonkiCmes([{ ...cme(), startTime: 'unknown' }])).toThrow('invalid');
  });
  it('rejects hostile catalog destinations', () => {
    const observation = parseDonkiCmes([{ ...cme(), link: 'javascript:alert(1)' }]);
    expect(observation?.catalogUrl).toBe('https://ccmc.gsfc.nasa.gov/tools/DONKI/');
  });
  it('keeps per-image credit and date, strips markup, and deduplicates results', () => {
    const parsed = parseMarsImages(images(imageItem(), imageItem()));
    expect(parsed).toHaveLength(1);
    expect(parsed[0].title).toBe('Martian dune');
    expect(parsed[0].description).toBe('A rover view of sand.');
    expect(parsed[0].credit).toBe('NASA/JPL-Caltech/MSSS');
    expect(parsed[0].createdAt).toBe('2020-03-12T00:00:00Z');
    expect(parsed[0].catalogUrl).toBe('https://images.nasa.gov/details/PIA-test');
  });
  it('accepts only official HTTPS thumbnail URLs and distinguishes valid zero matches', () => {
    expect(parseMarsImages(images())).toEqual([]);
    for (const url of ['http://images-assets.nasa.gov/a.jpg', 'https://evil.example/a.jpg', 'https://images-assets.nasa.gov@evil.example/a.jpg']) {
      expect(() => parseMarsImages(images(imageItem('unsafe', url)))).toThrow('invalid');
    }
    expect(() => parseMarsImages({ collection: { items: 'invalid' } })).toThrow('invalid');
  });
  it('uses a seven-day UTC date range across year boundaries', () => {
    expect(donkiDateRange(new Date('2027-01-02T23:00:00Z'))).toMatchObject({ startDate: '2026-12-26', endDate: '2027-01-02' });
  });
});

describe('NASA science client lifecycle', () => {
  it('requests actual public endpoints and labels newly retrieved older observations as a response, not live conditions', async () => {
    const fetchImpl = scienceFetch(), client = createScienceClient({ fetchImpl, now });
    const snapshot = await client.load();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(String(fetchImpl.mock.calls[0][0])).toContain('https://api.nasa.gov/DONKI/CME?startDate=2026-11-08&endDate=2026-11-15&api_key=DEMO_KEY');
    expect(String(fetchImpl.mock.calls[1][0])).toContain('https://images-api.nasa.gov/search?');
    expect(snapshot.solar.status).toBe('fresh');
    expect(snapshot.solar.fetchedAt).toBe(now().toISOString());
    expect(snapshot.solar.data?.observedAt).toBe('2026-11-14T12:00Z');
    expect(JSON.stringify(snapshot)).not.toContain('api_key=');
    expect(snapshot.weather.status).toBe('archive');
  });
  it('caches complete successful responses and provides an explicit refresh', async () => {
    const fetchImpl = scienceFetch(), client = createScienceClient({ fetchImpl, now });
    const first = await client.load(), second = await client.load();
    expect(second).toBe(first); expect(fetchImpl).toHaveBeenCalledTimes(2);
    await client.load({ force: true }); expect(fetchImpl).toHaveBeenCalledTimes(4);
    client.clearCache(); await client.load(); expect(fetchImpl).toHaveBeenCalledTimes(6);
  });
  it('preserves exact archive date/record on rate limits while independent imagery succeeds', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async input => String(input).includes('/DONKI/') ? response({ error: 'limit' }, 429) : response(images(imageItem())));
    const snapshot = await createScienceClient({ fetchImpl, now }).load();
    expect(snapshot.solar.status).toBe('archive'); expect(snapshot.solar.error).toBe('rate-limit');
    expect(snapshot.solar.data).toEqual(archivedScienceSnapshot().solar.data);
    expect(snapshot.solar.fetchedAt).toBe(archivedScienceSnapshot().solar.fetchedAt);
    expect(snapshot.imagery.status).toBe('fresh');
  });
  it('does not replace legitimate empty NASA responses with archived events', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async input => String(input).includes('/DONKI/') ? response([]) : response(images()));
    const snapshot = await createScienceClient({ fetchImpl, now }).load();
    expect(snapshot.solar).toMatchObject({ status: 'empty', data: null, error: null });
    expect(snapshot.imagery).toMatchObject({ status: 'empty', data: [], error: null });
  });
  it('uses distinct offline and invalid-response states without inventing a fallback image', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async input => {
      if (String(input).includes('/DONKI/')) return response({ malformed: true });
      throw new TypeError('network failed');
    });
    const snapshot = await createScienceClient({ fetchImpl, now }).load();
    expect(snapshot.solar.error).toBe('invalid'); expect(snapshot.solar.status).toBe('archive');
    expect(snapshot.imagery).toMatchObject({ status: 'unavailable', data: [], error: 'offline' });
  });
  it('does not cache failures, so the next deliberate refresh can recover', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockRejectedValueOnce(new TypeError('offline')).mockRejectedValueOnce(new TypeError('offline'));
    const client = createScienceClient({ fetchImpl, now }); await client.load();
    fetchImpl.mockImplementation(async input => String(input).includes('/DONKI/') ? response([cme()]) : response(images(imageItem())));
    expect((await client.load()).solar.status).toBe('fresh'); expect(fetchImpl).toHaveBeenCalledTimes(4);
  });
  it('classifies a timeout and cancels both requests', async () => {
    const signals: AbortSignal[] = [];
    const fetchImpl = vi.fn<typeof fetch>(async (_input, init) => new Promise((_resolve, reject) => {
      const signal = init!.signal!; signals.push(signal);
      signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
    }));
    const snapshot = await createScienceClient({ fetchImpl, now, timeoutMs: 5 }).load();
    expect(snapshot.solar.error).toBe('timeout'); expect(snapshot.imagery.error).toBe('timeout');
    expect(signals.every(signal => signal.aborted)).toBe(true);
  });
  it('respects cancellation before and during requests', async () => {
    const early = new AbortController(); early.abort(); const unused = scienceFetch();
    const skipped = await createScienceClient({ fetchImpl: unused, now }).load({ signal: early.signal });
    expect(unused).not.toHaveBeenCalled(); expect(skipped.solar.error).toBe('aborted');
    const controller = new AbortController();
    const fetchImpl = vi.fn<typeof fetch>(async (_input, init) => new Promise((_resolve, reject) => {
      init!.signal!.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
    }));
    const pending = createScienceClient({ fetchImpl, now }).load({ signal: controller.signal });
    controller.abort(); const snapshot = await pending;
    expect(snapshot.solar.error).toBe('aborted'); expect(snapshot.imagery.error).toBe('aborted');
  });
});
