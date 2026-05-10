// POST /character-create
// Bootstraps the 7-character starter roster for a newly authenticated user.
// Idempotent: if any characters already exist, returns them without re-creating.
//
// Requires: HMAC-signed envelope + Supabase JWT.
// Rate limit: route 'character.create' (1 per 30s per user).

// @ts-expect-error — Deno std import resolved at runtime.
import { serve } from 'https://deno.land/std/http/server.ts';
import { prelude, jsonResponse, errorResponse } from '../_shared/auth.ts';
// @ts-expect-error — resolved by import_map.json.
import { createStarterRoster } from '../_shared/game-core.ts';

export interface CharacterCreateResponse {
  characters: Array<{ id: string; class_id: string; name: string }>;
}

serve(async (req: Request) => {
  const pre = await prelude(req, 'character.create');
  if (!pre.ok) return pre.res;
  const { user, supabase } = pre.ctx;

  // Already-bootstrapped → idempotent return.
  const { data: existing, error: existingErr } = await supabase
    .from('characters')
    .select('id, class_id, name')
    .eq('user_id', user.id);
  if (existingErr) return errorResponse('db_read_failed', 500);
  if (existing && existing.length === 7) {
    return jsonResponse({ characters: existing } satisfies CharacterCreateResponse);
  }

  // First-time signup → ensure user_profile exists, then upsert the roster.
  const { error: profileErr } = await supabase
    .from('user_profiles')
    .upsert({ id: user.id, display_name: user.email ?? `player-${user.id.slice(0, 8)}` }, { onConflict: 'id' });
  if (profileErr) return errorResponse('profile_create_failed', 500);

  const roster = createStarterRoster(user.id);
  const { data: inserted, error } = await supabase
    .from('characters')
    .upsert(roster, { onConflict: 'user_id,class_id' })
    .select('id, class_id, name');
  if (error) return errorResponse(`db_write_failed:${error.message}`, 500);

  return jsonResponse({ characters: inserted } satisfies CharacterCreateResponse);
});
