// Geospatial math. Pure — no network, no GPS access. Caller supplies
// the lat/lng pair (from Expo Location or browser geolocation) and the
// bar's location (from the bars table).
//
// Haversine is the standard great-circle distance formula. Accurate to
// within a few meters at bar-scale distances — well within spec tolerance.
//
// Pattern source: Lucid Winds (user's sibling project) uses the same
// formula for step-tracking. This port is kept identical.

const EARTH_RADIUS_METERS = 6_371_000;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Great-circle distance between two lat/lng points in meters.
 */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

/**
 * Proximity check: is `player` within `meters` of `bar`?
 * Default 100m per spec §8.2 ("BAR_PROXIMITY_METERS = 100").
 */
export const DEFAULT_BAR_PROXIMITY_METERS = 100;

export function isWithinRadius(
  player: LatLng,
  target: LatLng,
  meters: number = DEFAULT_BAR_PROXIMITY_METERS,
): boolean {
  return haversineMeters(player, target) <= meters;
}

/**
 * Among a list of bars, return those within radius of the player, sorted
 * ascending by distance. Useful for the "nearby bars" list on the map.
 */
export interface GeoBar {
  id: string;
  name: string;
  location: LatLng;
}

export interface BarWithDistance extends GeoBar {
  distanceMeters: number;
}

export function nearbyBars(
  player: LatLng,
  bars: readonly GeoBar[],
  radiusMeters: number = DEFAULT_BAR_PROXIMITY_METERS,
): readonly BarWithDistance[] {
  return bars
    .map((b) => ({ ...b, distanceMeters: haversineMeters(player, b.location) }))
    .filter((b) => b.distanceMeters <= radiusMeters)
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
}

/**
 * Sanity check on a GPS fix. Common Lucid Winds pattern: reject readings
 * with null, NaN, or locations outside earth's valid range.
 */
export function isValidFix(loc: Partial<LatLng> | null | undefined): loc is LatLng {
  if (!loc) return false;
  const { lat, lng } = loc;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat! < -90 || lat! > 90) return false;
  if (lng! < -180 || lng! > 180) return false;
  return true;
}
