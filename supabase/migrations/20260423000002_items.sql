-- items: rolled gear — one row per Item in the player's account.
--
-- Design contract (DESIGN_V1.md §2):
--   - owner_user_id is the account-bound owner. Set once at roll and never
--     changes unless the item enters the Back Bar Market (soft trading,
--     post-launch).
--   - equipped_character_id + equipped_slot track if/where the item is
--     currently worn. NULL = in the stash.
--   - chain_asset_id is schema-forward for a future blockchain integration.
--     Always NULL at launch; a tradeable "Legendary" never sets this for v1.
--
-- Columns mirror the `Item` type in @barbrawl/game-core/src/loot/types.ts.
-- Keep these in sync; a type-data drift will crash the loot roller silently.

create table public.items (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.user_profiles(id) on delete cascade,
  equipped_character_id uuid references public.characters(id) on delete set null,
  equipped_slot text
    check (equipped_slot is null or equipped_slot in ('weapon','outfit','footwear','trinket','mark')),
  base_id text not null,
  slot text not null
    check (slot in ('weapon','outfit','footwear','trinket','mark')),
  rarity text not null
    check (rarity in ('common','uncommon','rare','epic','legendary')),
  ilvl int not null check (ilvl >= 1),
  display_name text not null,
  implicit_text text not null,
  implicit jsonb not null,       -- EffectPayload
  prefixes jsonb not null default '[]'::jsonb,  -- RolledAffix[]
  suffixes jsonb not null default '[]'::jsonb,  -- RolledAffix[]
  anointment jsonb,              -- AnointmentDef or null
  chain_asset_id text unique,    -- NULL at launch; reserved for later
  created_at timestamptz not null default now()
);

create index items_owner_idx on public.items(owner_user_id);
create index items_equipped_char_idx on public.items(equipped_character_id);
-- A single slot per character can only hold one item equipped at a time.
create unique index items_one_equipped_per_slot
  on public.items(equipped_character_id, equipped_slot)
  where equipped_character_id is not null and equipped_slot is not null;

alter table public.items enable row level security;

create policy "Users read their own items"
  on public.items for select
  using (owner_user_id = auth.uid());

create policy "Users modify their own items"
  on public.items for all
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

-- Edge functions using the service role bypass RLS when rolling drops.
