-- Row Level Security — every table locked by default per spec §1 principle 7
-- and §8 RLS examples. Server-side Edge Functions use the service role key
-- and bypass RLS; client-side reads/writes must satisfy these policies.

-- ─────────────────────────────────────────────────────────────
-- user_profiles
-- ─────────────────────────────────────────────────────────────
alter table public.user_profiles enable row level security;

create policy "Users read their own profile"
  on public.user_profiles for select
  using (id = auth.uid());

create policy "Users update their own profile"
  on public.user_profiles for update
  using (id = auth.uid());

-- Public read of display_name + avatar for social features; restrict to a
-- view layer later when we actually ship that feature.

-- ─────────────────────────────────────────────────────────────
-- characters
-- ─────────────────────────────────────────────────────────────
alter table public.characters enable row level security;

create policy "Users own their characters"
  on public.characters for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- bars
-- ─────────────────────────────────────────────────────────────
alter table public.bars enable row level security;

create policy "Bars are publicly readable"
  on public.bars for select
  using (true);

create policy "Verified owners update their bars"
  on public.bars for update
  using (verified_owner_id = auth.uid());

-- Inserts happen server-side (Edge Functions with service role).

-- ─────────────────────────────────────────────────────────────
-- defenders
-- ─────────────────────────────────────────────────────────────
alter table public.defenders enable row level security;

create policy "Defenders visible to everyone (public threat info)"
  on public.defenders for select
  using (true);

create policy "Character owners mutate their defenders"
  on public.defenders for all
  using (
    character_id in (
      select id from public.characters where user_id = auth.uid()
    )
  )
  with check (
    character_id in (
      select id from public.characters where user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────
-- battles
-- ─────────────────────────────────────────────────────────────
alter table public.battles enable row level security;

create policy "Users see their battles"
  on public.battles for select
  using (
    attacker_character_id in (
      select id from public.characters where user_id = auth.uid()
    )
  );

-- Inserts are server-side only (Edge Functions).

-- ─────────────────────────────────────────────────────────────
-- bar_daily_state
-- ─────────────────────────────────────────────────────────────
alter table public.bar_daily_state enable row level security;

create policy "Daily state is publicly readable"
  on public.bar_daily_state for select
  using (true);

-- Writes are server-side only.

-- ─────────────────────────────────────────────────────────────
-- bar_nominations
-- ─────────────────────────────────────────────────────────────
alter table public.bar_nominations enable row level security;

create policy "Nominations are publicly readable"
  on public.bar_nominations for select
  using (true);

create policy "Users submit their own nominations"
  on public.bar_nominations for insert
  with check (nominated_by = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- user_cosmetics
-- ─────────────────────────────────────────────────────────────
alter table public.user_cosmetics enable row level security;

create policy "Users read their cosmetics"
  on public.user_cosmetics for select
  using (user_id = auth.uid());

-- Inserts are server-side (purchase flow validates coins server-side).

-- ─────────────────────────────────────────────────────────────
-- global_events
-- ─────────────────────────────────────────────────────────────
alter table public.global_events enable row level security;

create policy "Events are publicly readable"
  on public.global_events for select
  using (true);
