// POST /battle-start
// Begin a bar run. Validates GPS proximity + spoof score, generates a
// deterministic seed, builds the initial BattleState, persists it, and
// returns the state to the client.
//
// Requires: HMAC-signed envelope + Supabase JWT.

// @ts-expect-error — Deno std import.
import { serve } from 'https://deno.land/std/http/server.ts';
import { prelude, jsonResponse, errorResponse, scoreClientGps, type GpsFix } from '../_shared/auth.ts';
// @ts-expect-error — resolved by import_map.json.
import { initBattle, toRuntime, isWithinRadius, DEFAULT_BAR_PROXIMITY_METERS } from '../_shared/game-core.ts';

export interface BattleStartRequest {
  barId: string;
  characterId: string;
  gpsFix: GpsFix;
}

serve(async (req: Request) => {
  const pre = await prelude(req, 'battle.start');
  if (!pre.ok) return pre.res;
  const { user, body, supabase } = pre.ctx;

  const { barId, characterId, gpsFix } = (body ?? {}) as Partial<BattleStartRequest>;
  if (!barId || !characterId || !gpsFix) {
    return errorResponse('missing_fields', 400);
  }

  // 1. GPS spoof score. Reject hard fakes; allow real fixes through.
  const gps = scoreClientGps(body);
  if (gps && !gps.ok) {
    return errorResponse(`gps_rejected:${gps.flags.join(',')}`, 403);
  }

  // 2. Load character + verify ownership.
  const { data: charRow, error: charErr } = await supabase
    .from('characters')
    .select('*')
    .eq('id', characterId)
    .eq('user_id', user.id)
    .single();
  if (charErr || !charRow) return errorResponse('character_not_found', 404);

  // 3. Load bar (need location for proximity check + modifiers for scaling).
  const { data: barRow, error: barErr } = await supabase
    .from('bars')
    .select('id, name, type, atk_modifier, def_modifier, boss, location')
    .eq('id', barId)
    .single();
  if (barErr || !barRow) return errorResponse('bar_not_found', 404);

  // 4. Proximity check.
  // Postgis geography → { coordinates: [lng, lat] }. Adjust if your
  // RPC returns it differently.
  const barLatLng = parseGeographyPoint(barRow.location);
  if (!barLatLng) return errorResponse('bar_location_corrupt', 500);
  if (!isWithinRadius(gpsFix, barLatLng, DEFAULT_BAR_PROXIMITY_METERS)) {
    return errorResponse('out_of_range', 403);
  }

  // 5. Deterministic seed: bar + date + character. Same player visiting
  // same bar same day gets the same room layout.
  const today = new Date().toISOString().slice(0, 10);
  const seed = `${barId}:${today}:${characterId}`;

  // 6. Build runtime + initial state.
  const runtime = toRuntime(charRow as Parameters<typeof toRuntime>[0]);
  const enemyTemplates = enemyTemplatesForBar(barRow);
  const initialState = initBattle({
    battleId: crypto.randomUUID(),
    seed,
    player: runtime,
    enemyTemplates,
  });

  // 7. Persist battle row.
  const { data: battle, error: insertErr } = await supabase
    .from('battles')
    .insert({
      id: initialState.id,
      attacker_character_id: characterId,
      bar_id: barId,
      seed,
      status: 'in_progress',
      state_json: initialState,
      initial_state_json: initialState,
      action_log: [],
      result: 'flee', // placeholder; CHECK constraint requires non-null. Updated on battle-end.
    })
    .select('id')
    .single();
  if (insertErr || !battle) return errorResponse(`battle_insert_failed:${insertErr?.message}`, 500);

  return jsonResponse({ battleState: initialState });
});

/**
 * Build EnemyTemplate[] for a bar. 2 normal rooms + 1 boss is the
 * simplest stable layout; the deterministic room procgen in
 * Bars/rooms.ts can supply richer arrangements once wired.
 */
function enemyTemplatesForBar(barRow: { name: string; atk_modifier: number; def_modifier: number; boss: { name?: string } }) {
  return [
    { id: 'r1e1', name: `${barRow.name} Patron`, barAtkMod: barRow.atk_modifier, barDefMod: barRow.def_modifier },
    { id: 'r2e1', name: `${barRow.name} Regular`, barAtkMod: barRow.atk_modifier, barDefMod: barRow.def_modifier },
    {
      id: 'boss',
      name: barRow.boss?.name ?? `${barRow.name} Owner`,
      isBoss: true,
      barAtkMod: barRow.atk_modifier,
      barDefMod: barRow.def_modifier,
    },
  ];
}

function parseGeographyPoint(loc: unknown): { lat: number; lng: number } | null {
  if (typeof loc === 'string') {
    // PostGIS returns 'POINT(lng lat)' as text via to_text or similar.
    const m = loc.match(/POINT\(([^ ]+) ([^)]+)\)/);
    if (m) return { lng: parseFloat(m[1]!), lat: parseFloat(m[2]!) };
  }
  if (typeof loc === 'object' && loc) {
    const g = loc as { coordinates?: [number, number] };
    if (Array.isArray(g.coordinates)) return { lng: g.coordinates[0], lat: g.coordinates[1] };
  }
  return null;
}
