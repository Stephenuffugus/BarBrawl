// Shared edge-function helpers: auth, signed-request verification, JSON
// responses, structured errors. Imported by all functions in this folder.
//
// Runtime: Deno (Supabase Edge Functions). Browser-safe code only — no
// Node-specific APIs. WebCrypto is the security primitive of choice.

// @ts-expect-error — Deno-resolved at runtime; ignored by TS typecheck.
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';
// @ts-expect-error — Deno std import.
import { verifyRequest, tryConsumeRoute, scoreFix, InMemoryNonceStore, InMemoryBucketStore } from '../_shared/game-core.ts';
import type { GpsFix, VerifyResult } from '../_shared/game-core.ts';

// ─── shared instances (per-isolate, ephemeral) ────────────────────
// Edge functions are short-lived per region — InMemory stores are
// adequate for v1. Swap to Postgres-backed stores when scaling.
const NONCE_STORE = new InMemoryNonceStore();
const BUCKET_STORE = new InMemoryBucketStore();

// ─── env ──────────────────────────────────────────────────────────
function env(name: string): string {
  // @ts-expect-error — Deno global at runtime.
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

const SUPABASE_URL = env('SUPABASE_URL');
const SERVICE_ROLE_KEY = env('SUPABASE_SERVICE_ROLE_KEY');
const HMAC_SECRET = env('BB_HMAC_SECRET');

// ─── responses ────────────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-bb-timestamp, x-bb-nonce, x-bb-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...CORS },
  });
}

export function errorResponse(reason: string, status = 400): Response {
  return jsonResponse({ error: reason }, status);
}

export function corsPreflight(req: Request): Response | null {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  return null;
}

// ─── auth ─────────────────────────────────────────────────────────
export interface AuthedRequest {
  user: { id: string; email?: string };
  body: unknown;
  rawBody: string;
  supabase: SupabaseClient;
}

/**
 * Compose the standard request prelude: CORS preflight, JWT auth,
 * HMAC verification, rate limit. Returns either a Response (short-circuit
 * to caller) or an AuthedRequest the caller continues with.
 */
export async function prelude(
  req: Request,
  route: string,
): Promise<{ ok: true; ctx: AuthedRequest } | { ok: false; res: Response }> {
  const cors = corsPreflight(req);
  if (cors) return { ok: false, res: cors };

  if (req.method !== 'POST') {
    return { ok: false, res: errorResponse('method_not_allowed', 405) };
  }

  // JWT auth via Supabase.
  const authz = req.headers.get('authorization') ?? '';
  if (!authz.startsWith('Bearer ')) {
    return { ok: false, res: errorResponse('unauthorized', 401) };
  }
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: authz } },
  });
  const { data: { user }, error: authErr } = await supabase.auth.getUser(authz.slice(7));
  if (authErr || !user) {
    return { ok: false, res: errorResponse('unauthorized', 401) };
  }

  // HMAC envelope.
  const ts = req.headers.get('x-bb-timestamp');
  const nonce = req.headers.get('x-bb-nonce');
  const sig = req.headers.get('x-bb-signature');
  if (!ts || !nonce || !sig) {
    return { ok: false, res: errorResponse('missing_signature_headers', 400) };
  }
  const rawBody = await req.text();
  const url = new URL(req.url);

  const verify: VerifyResult = await verifyRequest(
    HMAC_SECRET,
    {
      method: req.method,
      path: url.pathname,
      body: rawBody,
      ts, nonce, sig,
    },
    { nonceStore: NONCE_STORE },
  );
  if (!verify.ok) {
    return { ok: false, res: errorResponse(`signature_${verify.reason}`, 401) };
  }

  // Rate limit.
  const rl = await tryConsumeRoute(BUCKET_STORE, user.id, route);
  if (!rl.allowed) {
    const res = errorResponse('rate_limited', 429);
    res.headers.set('Retry-After', String(Math.ceil(rl.retryAfterMs / 1000)));
    return { ok: false, res };
  }

  let body: unknown = {};
  if (rawBody.length > 0) {
    try { body = JSON.parse(rawBody); }
    catch { return { ok: false, res: errorResponse('malformed_json', 400) }; }
  }

  return { ok: true, ctx: { user: { id: user.id, ...(user.email ? { email: user.email } : {}) }, body, rawBody, supabase } };
}

/**
 * Score a GPS fix from a request body. Caller's choice whether to reject
 * or just log. Returns null if no `gpsFix` was provided (fine for non-
 * geo-gated routes).
 */
export function scoreClientGps(body: unknown, previousFix?: GpsFix): ReturnType<typeof scoreFix> | null {
  if (typeof body !== 'object' || !body) return null;
  const fix = (body as { gpsFix?: GpsFix }).gpsFix;
  if (!fix) return null;
  return scoreFix(fix, previousFix ? { previous: previousFix } : {});
}

export type { GpsFix };
