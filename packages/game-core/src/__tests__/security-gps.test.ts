import { scoreFix, scoreWindow, type GpsFix } from '../security';

const NOW_MS = Date.parse('2026-05-10T12:00:00.000Z');
const now = () => NOW_MS;

const NYC = { lat: 40.7128, lng: -74.0060 };
const SF  = { lat: 37.7749, lng: -122.4194 };

describe('scoreFix', () => {
  it('passes a clean fix', () => {
    const fix: GpsFix = { ...NYC, accuracyMeters: 12, timestampMs: NOW_MS - 1_000 };
    const r = scoreFix(fix, { now });
    expect(r.ok).toBe(true);
    expect(r.flags).toEqual([]);
  });

  it('flags invalid coordinates', () => {
    const fix: GpsFix = { lat: 91, lng: 0, timestampMs: NOW_MS };
    const r = scoreFix(fix, { now });
    expect(r.ok).toBe(false);
    expect(r.flags).toContain('invalid_coords');
  });

  it('flags low-accuracy fixes', () => {
    const fix: GpsFix = { ...NYC, accuracyMeters: 500, timestampMs: NOW_MS };
    const r = scoreFix(fix, { now });
    expect(r.flags).toContain('low_accuracy');
  });

  it('flags future-dated timestamps', () => {
    const fix: GpsFix = { ...NYC, timestampMs: NOW_MS + 5 * 60 * 1000 };
    const r = scoreFix(fix, { now });
    expect(r.flags).toContain('future_timestamp');
  });

  it('flags stale timestamps', () => {
    const fix: GpsFix = { ...NYC, timestampMs: NOW_MS - 5 * 60 * 1000 };
    const r = scoreFix(fix, { now });
    expect(r.flags).toContain('stale_timestamp');
  });

  it('flags teleport', () => {
    const previous: GpsFix = { ...NYC, timestampMs: NOW_MS - 1000 };
    const fix: GpsFix = { ...SF, timestampMs: NOW_MS };
    const r = scoreFix(fix, { now, previous });
    expect(r.flags).toContain('teleport');
    expect(r.ok).toBe(false);
  });

  it('flags speed exceeded (driving across town in 1s)', () => {
    const previous: GpsFix = { ...NYC, timestampMs: NOW_MS - 1000 };
    // ~500m away, 1 second apart = 500 m/s, well above 200 m/s ceiling.
    const fix: GpsFix = {
      lat: NYC.lat + 0.0045, lng: NYC.lng,
      timestampMs: NOW_MS,
    };
    const r = scoreFix(fix, { now, previous });
    expect(r.flags).toContain('speed_exceeded');
  });

  it('does not flag a normal walking-pace movement', () => {
    const previous: GpsFix = { ...NYC, timestampMs: NOW_MS - 30_000 };
    // ~50m in 30s = ~1.7 m/s, normal walking pace.
    const fix: GpsFix = {
      lat: NYC.lat + 0.00045, lng: NYC.lng,
      timestampMs: NOW_MS,
    };
    const r = scoreFix(fix, { now, previous });
    expect(r.ok).toBe(true);
    expect(r.flags).toEqual([]);
  });
});

describe('scoreWindow', () => {
  it('passes a series of clean fixes', () => {
    const fixes: GpsFix[] = [
      { ...NYC, timestampMs: NOW_MS - 60_000 },
      { lat: NYC.lat + 0.00045, lng: NYC.lng, timestampMs: NOW_MS - 30_000 },
      { lat: NYC.lat + 0.00090, lng: NYC.lng, timestampMs: NOW_MS },
    ];
    const r = scoreWindow(fixes, { now });
    expect(r.ok).toBe(true);
  });

  it('catches sustained spoofing across the window', () => {
    const fixes: GpsFix[] = [
      { ...NYC, timestampMs: NOW_MS - 30_000 },
      { ...SF,  timestampMs: NOW_MS - 20_000 },
      { ...NYC, timestampMs: NOW_MS - 10_000 },
      { ...SF,  timestampMs: NOW_MS },
    ];
    const r = scoreWindow(fixes, { now });
    expect(r.ok).toBe(false);
    expect(r.flags).toContain('teleport');
  });

  it('handles single-fix window safely', () => {
    const r = scoreWindow([{ ...NYC, timestampMs: NOW_MS }], { now });
    expect(r.ok).toBe(true);
  });
});
