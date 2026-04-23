import {
  haversineMeters,
  isWithinRadius,
  nearbyBars,
  isValidFix,
  DEFAULT_BAR_PROXIMITY_METERS,
} from '../geo';

// Known fixtures: NYC Times Square vs Grand Central ≈ 530m walking.
// Great-circle is a little less. Let's use real-ish coordinates.
const TIMES_SQ = { lat: 40.7580, lng: -73.9855 };
const GRAND_CENTRAL = { lat: 40.7527, lng: -73.9772 };
const SF_UNION_SQ = { lat: 37.7879, lng: -122.4075 };

describe('haversineMeters', () => {
  it('returns 0 for the same point', () => {
    expect(haversineMeters(TIMES_SQ, TIMES_SQ)).toBeCloseTo(0, 1);
  });

  it('Times Square → Grand Central is a few hundred meters', () => {
    const d = haversineMeters(TIMES_SQ, GRAND_CENTRAL);
    expect(d).toBeGreaterThan(400);
    expect(d).toBeLessThan(1000);
  });

  it('NYC → SF is ~4100km', () => {
    const d = haversineMeters(TIMES_SQ, SF_UNION_SQ);
    expect(d).toBeGreaterThan(4_000_000);
    expect(d).toBeLessThan(4_200_000);
  });

  it('symmetric', () => {
    expect(haversineMeters(TIMES_SQ, GRAND_CENTRAL))
      .toBeCloseTo(haversineMeters(GRAND_CENTRAL, TIMES_SQ), 2);
  });
});

describe('isWithinRadius (spec §8.2, 100m default)', () => {
  it('default radius constant matches spec', () => {
    expect(DEFAULT_BAR_PROXIMITY_METERS).toBe(100);
  });

  it('10m away = within radius', () => {
    const close = { lat: TIMES_SQ.lat + 0.00009, lng: TIMES_SQ.lng }; // ~10m north
    expect(isWithinRadius(TIMES_SQ, close)).toBe(true);
  });

  it('500m away = out of default radius', () => {
    expect(isWithinRadius(TIMES_SQ, GRAND_CENTRAL)).toBe(false);
  });

  it('honors custom radius', () => {
    expect(isWithinRadius(TIMES_SQ, GRAND_CENTRAL, 1000)).toBe(true);
  });
});

describe('nearbyBars', () => {
  const bars = [
    { id: 'b1', name: 'Close',  location: { lat: TIMES_SQ.lat + 0.0001, lng: TIMES_SQ.lng } },      // ~11m
    { id: 'b2', name: 'Medium', location: { lat: TIMES_SQ.lat + 0.001,  lng: TIMES_SQ.lng } },      // ~111m
    { id: 'b3', name: 'Far',    location: { lat: TIMES_SQ.lat + 0.01,   lng: TIMES_SQ.lng } },      // ~1110m
  ];

  it('filters to radius and sorts ascending', () => {
    const list = nearbyBars(TIMES_SQ, bars, 200);
    expect(list.map((b) => b.id)).toEqual(['b1', 'b2']);
    expect(list[0]!.distanceMeters).toBeLessThan(list[1]!.distanceMeters);
  });

  it('empty when nothing in range', () => {
    expect(nearbyBars(SF_UNION_SQ, bars, 500)).toEqual([]);
  });
});

describe('isValidFix', () => {
  it('rejects null and undefined', () => {
    expect(isValidFix(null)).toBe(false);
    expect(isValidFix(undefined)).toBe(false);
  });
  it('rejects NaN', () => {
    expect(isValidFix({ lat: NaN, lng: 0 })).toBe(false);
  });
  it('rejects out-of-range', () => {
    expect(isValidFix({ lat: 91, lng: 0 })).toBe(false);
    expect(isValidFix({ lat: 0, lng: 181 })).toBe(false);
  });
  it('accepts a valid fix', () => {
    expect(isValidFix(TIMES_SQ)).toBe(true);
  });
});
