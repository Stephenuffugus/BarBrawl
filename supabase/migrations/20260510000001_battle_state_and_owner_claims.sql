-- Two changes here, both needed by the live edge functions:
--
-- 1. Extend public.battles with the columns the engine + validator need:
--    seed (replay key), status (in_progress/complete), state_json (latest
--    snapshot for resume + serve-as-spectator), action_log (append-only,
--    used by the battle validator).
--
-- 2. Add public.bar_owner_claims to support the spec §5.11 owner-claim
--    workflow. bar_nominations is already in 20260421000002 and stays
--    untouched; an owner *claims* an existing or nominated bar by
--    submitting evidence + a one-time challenge token.

-- ─── battles extension ────────────────────────────────────────────
alter table public.battles
  add column if not exists seed text,
  add column if not exists status text not null default 'complete'
    check (status in ('in_progress', 'complete', 'abandoned')),
  add column if not exists state_json jsonb,
  add column if not exists initial_state_json jsonb,
  add column if not exists action_log jsonb not null default '[]'::jsonb,
  add column if not exists updated_at timestamptz default now();

create index if not exists battles_status_idx
  on public.battles(status)
  where status = 'in_progress';

-- ─── bar_owner_claims ────────────────────────────────────────────
-- An owner submits (1) bar id, (2) ownership evidence (link/text/file
-- path), (3) accepts a one-time challenge_token they must echo back
-- via a verification step (email or phone). Admin or automated reviewer
-- promotes status from 'pending' → 'approved' / 'rejected'.
create table if not exists public.bar_owner_claims (
  id uuid primary key default gen_random_uuid(),
  bar_id uuid not null references public.bars(id) on delete cascade,
  claimant_id uuid not null references public.user_profiles(id) on delete cascade,
  evidence_url text,
  evidence_text text,
  challenge_token text not null,
  challenge_method text not null check (challenge_method in ('email','phone','postcard','manual')),
  status text not null default 'pending'
    check (status in ('pending','verified','approved','rejected','expired')),
  created_at timestamptz default now(),
  verified_at timestamptz,
  reviewed_at timestamptz,
  reviewer_id uuid references public.user_profiles(id),
  unique (bar_id, claimant_id)
);
create index if not exists bar_owner_claims_status_idx on public.bar_owner_claims(status);
create index if not exists bar_owner_claims_bar_idx on public.bar_owner_claims(bar_id);

-- RLS — claimants see their own claims; everyone sees approved owner per bar
-- (which is already exposed via bars.verified_owner_id).
alter table public.bar_owner_claims enable row level security;
create policy "owner_claims_select_self"
  on public.bar_owner_claims for select
  using (auth.uid() = claimant_id);
create policy "owner_claims_insert_self"
  on public.bar_owner_claims for insert
  with check (auth.uid() = claimant_id);
