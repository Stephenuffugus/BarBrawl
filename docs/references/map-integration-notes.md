# Map Integration Reference — from Lucid Winds (Leaflet)

Notes shared by the user from their production game **Lucid Winds**
(mobile web, Leaflet + CartoDB Voyager tiles). These are patterns and
math worth stealing, but **the stacks are different**:

| | Lucid Winds (source) | BarBrawl (this project) |
|---|---|---|
| Platform | Mobile web | Native iOS + Android |
| Framework | Vanilla JS + HTML | React Native + Expo |
| Map lib | Leaflet 1.9.4 | `react-native-maps` w/ Mapbox GL provider |
| Tiles | CartoDB Voyager | Mapbox |
| Marker styling | DivIcon + CSS | React components as Marker children |
| Tile tinting | `filter:` on `.leaflet-tile-pane` | Mapbox style JSON layers |

Treat this file as **inspiration, not import**. The library-specific
code does not run in RN. The *math* and *patterns* do.

---

## Directly reusable (copy the logic, framework-agnostic)

### Haversine distance in meters
Drop-in for BarBrawl's **100m bar-proximity check** and the
**200mph teleport detector** (spec §8 Anti-Cheat). Server AND client.

```js
function haversineMeters(aLat, aLng, bLat, bLng) {
  const R = 6371000; // Earth radius, m
  const dLat = (bLat - aLat) * Math.PI / 180;
  const dLng = (bLng - aLng) * Math.PI / 180;
  const a = Math.sin(dLat/2) ** 2 +
            Math.cos(aLat * Math.PI/180) * Math.cos(bLat * Math.PI/180) *
            Math.sin(dLng/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
```

### GPS sanity range for velocity / anti-cheat
Lucid Winds rejects deltas outside `0.7m < d < 50m` between ticks
(ignores jitter AND impossible teleports). BarBrawl can do the same
server-side when validating attack location: if the delta between
last-seen and now implies >200mph, flag.

### GPS options tradeoffs
- `enableHighAccuracy: true` — needed for ≤5m resolution (BarBrawl's
  100m bar check is forgiving, but mastery/defender placement wants
  sharper fixes). Roughly halves battery.
- `maximumAge: 5000` — reuse recent fixes during active play.
- `timeout: 8000` — don't hang the UI waiting for GPS.
- When app is backgrounded: drop `enableHighAccuracy` to save battery.
  In RN, use `AppState` to toggle.

### GPS-before-map race
The #1 bug in Lucid Winds. Same shape in RN: `expo-location` often
resolves before `react-native-maps` finishes mounting. Pattern:

1. Store last known `lat/lng` in state as soon as GPS returns.
2. Guard every `mapRef.current?.*` call.
3. In the map's `onMapReady` callback, do a one-shot catch-up
   `animateToRegion` if GPS has already landed.

---

## Conceptually useful (patterns, adapted implementation)

### Trail polyline with memory cap
Not core to BarBrawl's loop (you walk TO a bar, not around one), but
nice-to-have for "night out recap" views or defender patrol paths. Cap
at N recent points (Lucid Winds uses 500) to keep render cheap.

### Time-of-day theming
Lucid Winds swaps CSS filters on the tile pane for dawn/dusk/night
moods. In RN/Mapbox, the equivalent is:
- Multiple Mapbox styles (a day style + a night style), swap via the
  `customMapStyle` prop or Mapbox style URL.
- Or, overlay a translucent `<View>` over the map with a tint color
  that shifts by hour. Cheaper, works across any base style.

BarBrawl plays heavily at night, so a **night style** is higher-value
than the full dawn/dusk/night cycle.

### Tap-through overlays
Fog/vignette/frame visuals that don't block map gestures. In RN,
achieve with `pointerEvents="none"` on an overlay `<View>`. Useful
for: "bar scanner" radial effect, low-HP red vignette in defender
alerts, bar-claimed territory tinting.

### Zoom-responsive UI
Lucid Winds uses `data-zoom` attribute on the container + CSS
selectors. In RN, subscribe to `onRegionChange` and read zoom from the
region's `latitudeDelta` (smaller = more zoomed). Use it to toggle
what bar markers show (icon only at low zoom, full card at high zoom).

---

## Not reusable in RN

- Leaflet library itself (spec locks Mapbox GL)
- CartoDB tile URLs (Mapbox serves its own)
- CSS `filter:` on `.leaflet-tile-pane` (no CSS in RN; use Mapbox
  style layers or overlay `<View>`)
- `L.divIcon` custom markers (RN uses `<Marker>` with React children)
- `contain: layout` warning (no CSS `contain` in RN)
- Hostinger / static-host notes (BarBrawl ships native, not web)

---

## If Lucid Winds is relevant beyond maps

The user mentioned Lucid Winds runs a live player base. Any of these
would also transfer if you ask the other session:
- Step-counting / movement-reward balance (what distance feels
  rewarding without encouraging reckless walking?)
- Battery budget in practice (what % drain per hour of active play?)
- Crash/regression rates on iOS vs Android for `watchPosition`
- How often GPS spoofing comes up in support tickets (informs
  BarBrawl's anti-cheat investment)
