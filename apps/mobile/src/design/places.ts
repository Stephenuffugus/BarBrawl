// Demo "places" for the real-world map. Each garden is anchored by a small
// offset from the map center (the player's GPS fix, or DEFAULT_CENTER as a
// fallback) so the overgrown places are always nearby and tappable — the
// Pokémon-GO "stuff around you" feel without needing a live venue database.
//
// barId / theme / tier / label match what preview.tsx + battle expect. The
// four original tile-grid doors keep their barIds; three more showcase the
// remaining venue themes so all seven gardens appear on the map.

import type { BarThemeId } from './palette';

export interface DemoPlace {
  barId: string;
  label: string;
  theme: BarThemeId;
  tier: number;
  /** Offset from the map center in degrees. ~0.003 deg ≈ 300m. */
  dLat: number;
  dLng: number;
}

/** Fallback center when geolocation is unavailable (a leafy spot: Central Park). */
export const DEFAULT_CENTER = { lat: 40.7829, lng: -73.9654 } as const;

export const DEMO_PLACES: readonly DemoPlace[] = [
  { barId: 'b-rusty-nail',       label: 'The Tangled Lot',    theme: 'dive',      tier: 1, dLat:  0.0016, dLng: -0.0020 },
  { barId: 'b-commons-green',    label: 'The Commons Green',  theme: 'sports',    tier: 2, dLat: -0.0012, dLng:  0.0024 },
  { barId: 'b-greens',           label: 'Foxglove Cottage',   theme: 'pub',       tier: 3, dLat:  0.0028, dLng:  0.0012 },
  { barId: 'b-rose-court',       label: 'Old Rose Garden',    theme: 'cocktail',  tier: 3, dLat: -0.0026, dLng: -0.0014 },
  { barId: 'b-hop-yard',         label: 'The Old Greenhouse', theme: 'brewery',   tier: 4, dLat:  0.0008, dLng:  0.0034 },
  { barId: 'b-eldertree',        label: 'The Elder Orchard',  theme: 'wine',      tier: 4, dLat: -0.0034, dLng:  0.0006 },
  { barId: 'b-mission-blackout', label: 'Moonlit Grove',      theme: 'nightclub', tier: 5, dLat:  0.0036, dLng: -0.0030 },
];
