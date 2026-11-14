import { describe, expect, it, vi } from 'vitest';
import { createSnapshot, refreshSnapshot } from './refresh-donki-snapshot.mjs';

const validCme = {
  activityID: '2026-11-13T04:00:00-CME-001',
  startTime: '2026-11-13T04:00Z',
  sourceLocation: 'S10W20',
  activeRegionNum: 14200,
  link: 'https://ccmc.gsfc.nasa.gov/DONKI/view/CME/12345/-1',
  cmeAnalyses: [{ isMostAccurate: true, speed: 750, type: 'C', halfAngle: 60 }],
};

describe('DONKI snapshot refresh', () => {
  it('selects the newest analyzed CME while retaining the complete raw response', () => {
    const older = { ...validCme, activityID: '2026-11-12-CME', startTime: '2026-11-12T04:00Z' };
    const snapshot = createSnapshot(
      [validCme, older],
      { startDate: '2026-11-07', endDate: '2026-11-14' },
      '2026-11-14T05:40:00Z',
    );

    expect(snapshot.observation.activityID).toBe(validCme.activityID);
    expect(snapshot.observation.speedKmPerSecond).toBe(750);
    expect(snapshot.metadata.queryUrl).toContain('startDate=2026-11-07&endDate=2026-11-14');
    expect(snapshot.metadata.queryUrl).not.toContain('api_key');
    expect(snapshot.rawResponse).toEqual([validCme, older]);
  });

  it('rejects empty or unusable responses before a snapshot can be written', () => {
    expect(() => createSnapshot([], {
      startDate: '2026-11-07',
      endDate: '2026-11-14',
    }, '2026-11-14T05:40:00Z')).toThrow(/no CME records/);

    expect(() => createSnapshot([{ activityID: 'missing-analysis' }], {
      startDate: '2026-11-07',
      endDate: '2026-11-14',
    }, '2026-11-14T05:40:00Z')).toThrow(/no CME with a usable speed analysis/);

    expect(() => createSnapshot([validCme], {
      startDate: '2026-02-31',
      endDate: '2026-03-01',
    }, '2026-11-14T05:40:00Z')).toThrow(/date range/);
  });

  it('does not replace the existing snapshot when the API request fails', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
    });

    await expect(refreshSnapshot({
      startDate: '2026-11-07',
      endDate: '2026-11-14',
      fetchImpl,
      destination: '/tmp/unused-donki-snapshot.json',
    })).rejects.toThrow(/HTTP 503/);
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(String(fetchImpl.mock.calls[0][0])).toContain('api_key=DEMO_KEY');
  });
});
