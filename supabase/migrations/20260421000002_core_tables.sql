-- Core tables — verbatim from BARBRAWL_SPEC.md §8.
-- Keep this migration in lockstep with the spec; if you change shape here,
-- also update the spec.

-- ─────────────────────────────────────────────────────────────
-- user_profiles: Supabase Auth extension
-- ─────────────────────────────────────────────────────────────
create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text unique not null,
  gold int not null default 250,
  total_xp_all_chars bigint default 0,
  created_at timestamptz default now(),
  last_active_at timestamptz default now(),
  home_location geography(Point, 4326),
  settings jsonb default '{}'::jsonb
);

-- ─────────────────────────────────────────────────────────────
-- characters: 6 per user (one per class), auto-created on signup
-- ─────────────────────────────────────────────────────────────
create table public.characters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  class_id text not null check (class_id in ('steady','brewer','vintner','shaker','orchardist','drifter')),
  name text not null,
  level int not null default 1,
  xp int not null default 0,
  allocated_nodes text[] not null default '{}',
  bars_won int not null default 0,
  mastery jsonb not null default '{}'::jsonb, -- { "dive": 3, "pub": 7, ... }
  inventory jsonb not null default '[]'::jsonb,
  equipped jsonb not null default '{}'::jsonb,
  consumables jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  unique (user_id, class_id)
);
create index characters_user_idx on public.characters(user_id);

-- ─────────────────────────────────────────────────────────────
-- bars: auto-populated from Google Places, extended by nominations
-- ─────────────────────────────────────────────────────────────
create table public.bars (
  id uuid primary key default gen_random_uuid(),
  google_place_id text unique,
  name text not null,
  type text not null check (type in ('dive','pub','sports','cocktail','wine','brewery','nightclub')),
  location geography(Point, 4326) not null,
  address text,
  rating numeric(2,1),
  atk_modifier numeric(3,2) default 1.0,
  def_modifier numeric(3,2) default 1.0,
  boss jsonb not null, -- { name, icon, catchphrase, move_set }
  verified_owner_id uuid references public.user_profiles(id),
  is_auto_generated boolean default true,
  nomination_count int default 0,
  custom_loot jsonb, -- Pro tier
  custom_difficulty text default 'normal',
  created_at timestamptz default now()
);
create index bars_location_idx on public.bars using gist(location);
create index bars_type_idx on public.bars(type);

-- ─────────────────────────────────────────────────────────────
-- defenders: characters currently stationed at bars
-- ─────────────────────────────────────────────────────────────
create table public.defenders (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters(id) on delete cascade,
  bar_id uuid not null references public.bars(id) on delete cascade,
  stationed_at timestamptz not null default now(),
  current_hp int not null,
  max_hp int not null,
  stats_snapshot jsonb not null,    -- full stats at placement
  loadout_snapshot jsonb not null,  -- skill allocation at placement
  coins_accrued int default 0,
  xp_accrued int default 0,
  unique (character_id, bar_id)
);
create index defenders_bar_idx on public.defenders(bar_id);
create index defenders_character_idx on public.defenders(character_id);

-- ─────────────────────────────────────────────────────────────
-- battles: history of every fight
-- ─────────────────────────────────────────────────────────────
create table public.battles (
  id uuid primary key default gen_random_uuid(),
  attacker_character_id uuid not null references public.characters(id),
  bar_id uuid not null references public.bars(id),
  result text not null check (result in ('win','loss','flee')),
  xp_earned int default 0,
  gold_earned int default 0,
  loot_earned jsonb,
  defenders_fought int default 0,
  duration_seconds int,
  rooms_cleared int default 0,
  consumables_used text[],
  rhythm_stats jsonb, -- { perfect, good, ok, miss }
  created_at timestamptz default now()
);
create index battles_char_idx on public.battles(attacker_character_id);
create index battles_bar_idx on public.battles(bar_id);

-- ─────────────────────────────────────────────────────────────
-- bar_daily_state: per-bar daily seed + telemetry
-- ─────────────────────────────────────────────────────────────
create table public.bar_daily_state (
  bar_id uuid not null references public.bars(id) on delete cascade,
  date date not null,
  room_seed bigint not null,    -- deterministic room generation
  total_attempts int default 0,
  total_wins int default 0,
  primary key (bar_id, date)
);

-- ─────────────────────────────────────────────────────────────
-- bar_nominations: community-submitted bars (pop-ups, speakeasies)
-- ─────────────────────────────────────────────────────────────
create table public.bar_nominations (
  id uuid primary key default gen_random_uuid(),
  nominated_by uuid not null references public.user_profiles(id),
  bar_name text not null,
  address text not null,
  bar_type text not null,
  photo_url text,
  location geography(Point, 4326) not null,
  vote_count int default 1,
  status text default 'pending' check (status in ('pending','approved','rejected','duplicate')),
  created_at timestamptz default now()
);
create index bar_nominations_status_idx on public.bar_nominations(status);

-- ─────────────────────────────────────────────────────────────
-- user_cosmetics: ownership of cosmetic items
-- ─────────────────────────────────────────────────────────────
create table public.user_cosmetics (
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  cosmetic_id text not null,
  acquired_at timestamptz default now(),
  primary key (user_id, cosmetic_id)
);

-- ─────────────────────────────────────────────────────────────
-- global_events: world bosses, seasons, tournaments
-- ─────────────────────────────────────────────────────────────
create table public.global_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null, -- 'world_boss' | 'seasonal' | 'tournament'
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  target_bar_id uuid references public.bars(id),
  config jsonb not null
);
create index global_events_active_idx on public.global_events(starts_at, ends_at);
