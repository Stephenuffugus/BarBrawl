// Web overworld: a real-world map (Leaflet + CartoDB Voyager, no API key).
// Mirrors the Lucid Winds stack. Leaflet is loaded from CDN at runtime so the
// static GitHub Pages bundle needs no extra dependency or bundler config.
//
// Native keeps the tile-grid overworld (app/map.tsx) via platform resolution.
// All DOM/window/navigator access is inside effects/handlers, so static export
// (which renders without a DOM) stays safe.

import React, { useEffect, useRef, useState } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { PixelText } from '@/components/PixelText';
import { UI, BAR_PALETTES } from '@/design/palette';
import { PIXEL } from '@/design/scale';
import { DEMO_PLACES, DEFAULT_CENTER } from '@/design/places';
import { useGameStore } from '@/state/game-store';

const LEAFLET_VER = '1.9.4';
const LEAFLET_CSS = `https://unpkg.com/leaflet@${LEAFLET_VER}/dist/leaflet.css`;
const LEAFLET_JS = `https://unpkg.com/leaflet@${LEAFLET_VER}/dist/leaflet.js`;
const VOYAGER = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const MAP_DOM_ID = 'ww-leaflet-map';

let leafletPromise: Promise<unknown> | null = null;
function loadLeaflet(): Promise<unknown> {
  const w = window as unknown as { L?: unknown };
  if (w.L) return Promise.resolve(w.L);
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }
    const script = document.createElement('script');
    script.src = LEAFLET_JS;
    script.async = true;
    script.onload = () => resolve((window as unknown as { L: unknown }).L);
    script.onerror = () => reject(new Error('Failed to load Leaflet'));
    document.head.appendChild(script);
  });
  return leafletPromise;
}

type LatLng = { lat: number; lng: number };

export default function MapScreenWeb() {
  const claimedBars = useGameStore((s) => s.claimedBars);
  // Read claimed ids via a ref so marker styling reflects the latest set
  // without re-running the init effect.
  const claimedIds = useRef<Set<string>>(new Set());
  claimedIds.current = new Set(claimedBars.map((b) => b.barId));

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [locating, setLocating] = useState(false);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then((L: any) => {
        if (cancelled) return;
        const el = document.getElementById(MAP_DOM_ID);
        if (!el || (el as any)._leaflet_id) return;
        const map = L.map(el, { zoomControl: true, attributionControl: true });
        mapRef.current = map;
        map.setView([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], 15);
        L.tileLayer(VOYAGER, {
          maxZoom: 20,
          subdomains: 'abcd',
          attribution: '&copy; OpenStreetMap &copy; CARTO',
        }).addTo(map);
        addPlaceMarkers(L, map, DEFAULT_CENTER);
        // Leaflet needs a layout pass before it knows its size in flexbox.
        setTimeout(() => map.invalidateSize(), 0);
        setStatus('ready');
        locate(L, map);
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hoisted function declarations — referenced by the effect above.
  function addPlaceMarkers(L: any, map: any, center: LatLng) {
    for (const p of DEMO_PLACES) {
      const lat = center.lat + p.dLat;
      const lng = center.lng + p.dLng;
      const fill = BAR_PALETTES[p.theme][3];
      const claimed = claimedIds.current.has(p.barId);
      const marker = L.circleMarker([lat, lng], {
        radius: 11,
        color: claimed ? '#f8b800' : '#0b1f12',
        weight: claimed ? 3 : 2,
        fillColor: fill,
        fillOpacity: 0.95,
      });
      marker.bindTooltip(`${p.label} · T${p.tier}${claimed ? ' · YOURS' : ''}`, {
        direction: 'top',
        offset: [0, -8],
      });
      marker.on('click', () => {
        router.push({
          pathname: '/preview',
          params: { barId: p.barId, theme: p.theme, label: p.label, tier: String(p.tier) },
        });
      });
      marker.addTo(map);
    }
  }

  function locate(L: any, map: any) {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const here: LatLng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        map.setView([here.lat, here.lng], 15);
        L.circleMarker([here.lat, here.lng], {
          radius: 8,
          color: '#ffffff',
          weight: 3,
          fillColor: '#4895ef',
          fillOpacity: 1,
        })
          .addTo(map)
          .bindTooltip('You', { direction: 'top', offset: [0, -8] });
        // Re-anchor the gardens around the player's real position.
        addPlaceMarkers(L, map, here);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  }

  const recenter = () => {
    const w = window as unknown as { L?: any };
    if (w.L && mapRef.current) locate(w.L, mapRef.current);
  };

  return (
    <View style={{ flex: 1, backgroundColor: UI.bg }}>
      {/* Leaflet renders into this div (nativeID → DOM id on web). */}
      <View nativeID={MAP_DOM_ID} style={{ flex: 1, backgroundColor: '#0b1f12' }} />

      {/* Header overlay */}
      <View style={headerRow}>
        <Pressable onPress={() => router.back()} style={chip}>
          <PixelText size={12} color={UI.cursor}>◀ BACK</PixelText>
        </Pressable>
        <View style={chip}>
          <PixelText size={13} color={UI.text}>WALK THE WILD</PixelText>
        </View>
        <Pressable onPress={recenter} style={chip}>
          <PixelText size={11} color={UI.cursor}>{locating ? '…' : '◎ ME'}</PixelText>
        </Pressable>
      </View>

      {/* Footer status / hint */}
      <View style={footer}>
        <View style={{ backgroundColor: UI.panelFill, borderColor: UI.border, borderWidth: PIXEL, padding: 8 }}>
          <PixelText size={10} color={UI.textDim}>
            {status === 'loading'
              ? 'Loading the wild…'
              : status === 'error'
                ? 'Map failed to load — check your connection.'
                : 'Tap a marker to visit an overgrown place and tend it. ◎ ME centers on you.'}
          </PixelText>
        </View>
      </View>
    </View>
  );
}

const headerRow: ViewStyle = {
  position: 'absolute',
  top: 24,
  left: 0,
  right: 0,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingHorizontal: 12,
};

const chip: ViewStyle = {
  backgroundColor: UI.panelFill,
  borderColor: UI.border,
  borderWidth: PIXEL,
  paddingHorizontal: 10,
  paddingVertical: 6,
};

const footer: ViewStyle = {
  position: 'absolute',
  bottom: 24,
  left: 12,
  right: 12,
};
