// POST /character-create
// Bootstraps the 7-character starter roster for a newly authenticated user.
// Idempotent: if any characters already exist, returns them without re-creating.
//
// Called once on signup (or on first login if signup didn't run this).
//
// Request body: (none required — user comes from JWT)
// Response: { characters: { id: string; class_id: string; name: string }[] }

// NOTE: Runtime = Deno. The imports below are how this will wire up once
// the import_map is set. Until then, this file is a typed contract stub.

// import { createStarterRoster } from '@barbrawl/game-core';
// import { serve } from 'https://deno.land/std/http/server.ts';
// import { createClient } from 'https://esm.sh/@supabase/supabase-js';

export interface CharacterCreateResponse {
  characters: Array<{
    id: string;
    class_id: string;
    name: string;
  }>;
}

// Shape of the intended implementation:
//
// serve(async (req) => {
//   const authHeader = req.headers.get('Authorization');
//   if (!authHeader) return new Response('Unauthorized', { status: 401 });
//
//   const supabase = createClient(
//     Deno.env.get('SUPABASE_URL')!,
//     Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
//   );
//   const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
//   if (!user) return new Response('Unauthorized', { status: 401 });
//
//   // Check if roster already exists.
//   const { data: existing } = await supabase
//     .from('characters')
//     .select('id, class_id, name')
//     .eq('user_id', user.id);
//   if (existing && existing.length === 7) {
//     return Response.json({ characters: existing });
//   }
//
//   // Create missing characters using game-core's bootstrap.
//   const roster = createStarterRoster(user.id);
//   const { data: inserted, error } = await supabase
//     .from('characters')
//     .upsert(roster, { onConflict: 'user_id,class_id' })
//     .select('id, class_id, name');
//   if (error) return Response.json({ error: error.message }, { status: 500 });
//
//   return Response.json({ characters: inserted } satisfies CharacterCreateResponse);
// });
