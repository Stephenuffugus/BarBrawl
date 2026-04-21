# BarBrawl — Complete Handoff Specification

**Version:** 1.0 (from v6 prototype)
**Date:** 2026
**For:** Claude Code (or any dev team)
**Status:** Design locked, ready to build

---

## 0. How to Use This Document

This is the complete build spec for **BarBrawl**, a location-based mobile RPG. Read sections 1–4 to understand the vision. Read sections 5–7 for systems. Read sections 8–11 for technical implementation. Read section 12 for the prioritized build order — **start there and work top to bottom**.

If anything in this doc conflicts with later tasks, the design principles in Section 1 win. Those are the non-negotiables.

---

## 1. Vision & Non-Negotiable Principles

### What BarBrawl Is
A location-based mobile RPG where every real-world bar is a mini-dungeon. Players walk to real bars (verified via GPS), fight through procedurally generated rooms filled with regulars and a Bar Boss, claim the bar, and optionally station a character there as a defender who earns rewards while the player is offline.

### Core Fantasy
"I walked to my local bar tonight, conquered it with my Level 47 Brewer, left him to defend it, and woke up with 50 coins and some XP because three people tried to take it from me overnight."

### Non-Negotiable Principles (THESE DO NOT CHANGE)

1. **Zero pay-to-win.** No XP boosts, no stat increases, no loot boxes with gameplay items, no extra defender slots, no "premium" skills, no energy systems. Fortnite model: cosmetics only.
2. **Drinking is optional.** The Steady class (sober archetype) is balanced equally with the drinking classes. Never require, promote, or reward real-world alcohol purchases. Never use receipt scanning or any system that incentivizes drinking.
3. **Any character can attempt any bar.** No level gates. A Level 5 can walk into a Level 50 nightclub and try. They'll probably lose, but they get to try. Underdog victories are rewarded with bonus XP.
4. **Bars are fixed identities, not random scaling.** Each bar has a personality (ATK/DEF modifiers, boss, rating). Enemies scale to player level within that personality. A Dive Bar is always gritty and glass-cannon; a Brewery is always tanky. Players never face "glass-armor bandits" (the Oblivion trap).
5. **Your character's power comes from depth, not advantage.** Skill tree depth, gear, mastery stacks, consumables, and class specialty — not from having enemies be underleveled. A Level 500 player crushes a Level 500 bar because of 500 levels of accumulated advantages, not because the bar is weak.
6. **Daily refresh keeps the world alive.** All bars reset at local midnight. Room layouts regenerate. Defenders heal. First clear each day = full rewards, second = 50%, third+ = 25%.
7. **Cheating must be hard.** GPS verification, server-authoritative combat, perceptual image hashing for defender states, rate limiting. Assume players will try to cheat.

---

## 2. Target Platforms & Scope

- **iOS and Android.** Single codebase via React Native + Expo SDK 52+.
- **Mobile first, always.** No web version, no desktop. This is a game you play at bars.
- **Minimum specs:** iPhone 11 / Pixel 4a or equivalent. 2GB RAM target.
- **Internet required.** GPS required. Background location permission requested but not required (defender notifications work without it).
- **Global launch intent.** English first, localization-ready architecture from day one.

---

## 3. Target Players

- Primary: 21–40 year olds who go out to bars regularly.
- Secondary: Location-based game enthusiasts (Pokémon GO, Ingress, Orna players).
- Tertiary: RPG players who want a fresh take on Diablo-style builds.

The Steady class exists specifically to make this accessible to designated drivers, sober players, pregnant players, recovering addicts, and anyone who doesn't drink. They are first-class citizens of the game.

---

## 4. Monetization Model

### What We Sell
- **Character skins** (cosmetic appearance changes)
- **Emotes** (victory dances, taunts)
- **Map trails** (visual effects when walking on the map)
- **Profile frames and titles**
- **Crawl Pass** (seasonal battle pass with cosmetic-only rewards, ~$9.50/season, earns back its coin cost if completed)
- **Coin packs** (the in-game currency — but coins only buy cosmetics)

### What We Absolutely Do Not Sell
- XP boosts, stat increases, gear, consumables, respec tokens, level skips, extra defender slots, premium classes/skills, energy refills, or anything that provides a gameplay advantage.

### Benchmark
Fortnite: 77% conversion rate, $84/player/year. We target 30% conversion at $25/player/year for Year 1 with 100K MAU (~$750K revenue). Year 3 target: 5M MAU, 40% conversion, $40 avg = ~$80M revenue.

### B2B Revenue (Separate)
Bar Dashboard Pro for bar owners: $29/month. Custom loot drops, analytics, happy hour events, featured placement. This is a tool for bars, NOT a player-facing monetization. Keep it completely separate.

---

## 5. Core Game Systems

### 5.1 The Six Classes (Roster System)

Every player account has **all 6 classes unlocked from day one**. One character per class. Each character levels independently, has its own skill tree, its own inventory, its own bar-type mastery stacks. Gold is shared across all characters (account-wide wallet).

| ID | Name | Icon | Base HP/ATK/DEF/SPD/LUCK | Theme |
|---|---|---|---|---|
| steady | The Steady | 💧 | 110/11/11/11/11 | Balanced, no specialty, works everywhere. The sober/clearheaded archetype. |
| brewer | The Brewer | 🍺 | 130/12/14/7/6 | Heavy hitter, slow tank. Beer archetype. |
| vintner | The Vintner | 🍷 | 85/8/6/12/15 | Magic DPS with curses. Wine archetype. |
| shaker | The Shaker | 🍸 | 95/11/8/13/13 | Versatile hybrid. Cocktail archetype. |
| orchardist | The Orchardist | 🍎 | 115/9/10/10/11 | Healer with DoTs. Cider archetype. |
| drifter | The Drifter | 🌿 | 100/10/8/14/13 | Speed/chaos. THC beverage archetype. |

Each class has a specialty bar type where they get passive bonuses (Brewer +20% in Dive/Brewery, Vintner +20% in Wine/Cocktail, etc.), except the Steady who is equally effective everywhere.

### 5.2 Skill Trees

- Each class has **3 trees × 9 nodes = 27 nodes per class**.
- Total: **162 skill nodes across the game**.
- Point allocation: 1 point per character level.
- Level cap: **1000**. Designed to take ~10 years at casual pace. End-game goal is not maxing — it's building diverse characters across your roster.

**Four node types** (visual + functional):

- **Small** (circle, +): Minor stats. +3 ATK, +5% crit, +8 HP. Prerequisites for other nodes.
- **Notable** (circle, ●): Build-defining cluster payoffs. "+20% ATK when HP > 80%"
- **Active** (square, ⚔): Usable combat skills. Allocated active nodes become your combat buttons. Max 3 skills equipped at a time (one per tree typically).
- **Keystone** (diamond, ★): Game-changing trade-offs. Powerful effects with real downsides. "HAZE: All attacks apply Bitter damage. Bitter stacks infinitely. -20% DEF." Only 1 keystone per tree.

**Tree structure** (same shape for all 18 trees for UI consistency):
```
Tier 1:  [Small] [Small]        (starters, no prereqs)
Tier 2:  [Small] [Active]        (requires Tier 1)
Tier 3:      [Notable]           (requires Tier 2 active)
Tier 4:  [Small] [Active]        (requires Notable)
Tier 5:      [Notable]           (requires Tier 4)
Tier 6:      [Keystone]          (requires Tier 5)
```

**Synergies (D2-style):** Some nodes boost other nodes in the same tree. Example: "Each point in Bitter Bite adds 5% damage to Citra Punch." Create ~2-3 synergy pairs per tree for build depth.

**Respecs:** Cost gold, scales with level. Lv 10 = 100 gold, Lv 100 = 10,000 gold. Free respec tokens from major patches and every 10 levels (5 tokens granted). Never sold for real money.

The full node data for all 162 nodes exists in the v6 prototype — `TREES` object in `barbrawl-v6.jsx`. Copy that data directly as the source of truth for skill tree content.

### 5.3 Combat System

**Mode: Turn-based with optional rhythm input.**

Each turn, the player selects one of their 3 equipped active skills. When the skill fires, a rhythm timing bar appears:
- Marker slides left-to-right over ~1.2 seconds
- **Green zone** (40%-60% of bar): +50% damage (Good hit)
- **Gold zone** (47%-53% of bar): +100% damage (PERFECT)
- **Outside green zone:** 50% damage (miss timing)

The player taps a big TAP button to lock in their hit. Rhythm is optional — if they don't tap, it auto-resolves as a timing miss. Accessibility is preserved; skill expression is rewarded.

**AFK mode:** Same combat math, no rhythm input, auto-resolves. Used for:
1. Defenders fighting while their player is offline
2. Players who toggle "Auto-fight" mode
3. Battle replays

The AFK resolver uses the same damage formulas but treats every rhythm input as "Ok" (100% damage). This makes active play meaningfully stronger than AFK but doesn't invalidate AFK as a viable mode.

**Damage formula (server-side):**
```
baseDamage = (player.atk + player.level * 2) * skill.multiplier
rhythmBonus = { perfect: 2.0, good: 1.5, ok: 1.0, miss: 0.5 }
critRoll = random < (player.luck / 80 + buffs.crit)
final = max(1, baseDamage * rhythmBonus + variance - enemyDefense)
if crit: final *= 1.8 (or 2.5 with Drifter crit passive)
```

### 5.4 Procedurally Generated Bar Runs

Each bar has a **fixed personality** but the **room sequence regenerates daily**.

**Bar personality (static):** Name, type, rating, boss identity, ATK modifier (0.8–1.4), DEF modifier (0.8–1.2).

**Room pool per bar type:** 5–7 possible rooms with unique environmental modifiers. E.g., Dive Bar has Sticky Floor (-10% enemy SPD), Dart Corner (+15% crit for all), Pool Table (random knockback), Bathroom Brawl (+20% damage, tight space), Back Alley (3 enemies, surprise advantage), Boss: Main Bar.

**Daily generation:** At midnight local time, the server picks 3–5 rooms from the bar's pool using a seed derived from `(bar_id, date)` — deterministic, so all players challenging the same bar that day get the same layout. The boss room is always last. Room enemies are generated at battle start based on the player's level, scaled by bar's ATK/DEF modifiers.

**Why this works:** Bars feel consistent (Rusty Nail is always a dive, always gritty). But the *experience* is fresh daily. You can go to your local bar every day for months without getting bored.

### 5.5 Defender System

After conquering a bar, the player can choose to station the character they used. The character stays at that bar as a defender.

**Defender limits (account-wide across all 6 characters):**
- **Max 7 stationed defenders at once.** Choose wisely.
- **2 coins/hour per bar, capped at 75 coins/day** (across all defenders combined).
- **Passive XP:** Every time someone challenges a bar you're defending, ALL your defenders there earn 15% of the attacker's XP (win or lose). Popular bars = free XP.
- **Decay:** Defenders lose 5% max HP per day. At 0 HP, they return home with their accrued coins. Remotely feedable with consumables to restore HP.
- **Recall cooldown:** 1 hour between recalling a defender and stationing them elsewhere.

**Combat vs defenders:** When a player attacks a bar, they fight regulars → then player-defenders (in order of placement) → then the Bar Boss. Defenders use AFK combat with their skill tree and equipped actives at time of stationing. Their stats are snapshotted on placement — can't retroactively buff them.

### 5.6 XP and Leveling

XP curve: `XP_to_next_level(L) = floor(80 * L^1.45)`
- Level 1 → 2: 80 XP
- Level 10 → 11: ~2,240 XP
- Level 100 → 101: ~130,000 XP
- Level 500 → 501: ~2,800,000 XP
- Level 1000 (cap): ~17,800,000 XP total lifetime

XP sources:
- Bar fights: 50–500+ XP based on bar level × type multiplier
- Boss kills: +100 bonus first-time per bar
- Defender passive: 15% of attacker XP (offline)
- Daily quests: 25–150 XP each (3 rotating daily quests)
- Bar crawl events (weekly): 2× XP
- First-conquer bonus: 2× XP the first time you beat each unique bar
- Underdog bonus: 2× XP for beating a bar 10+ levels above yours
- Bar-type mastery: Achievement-based permanent stat boosts (see 5.7)

Per-level gains: +6 HP, +2 ATK, +1 DEF, +0.5 SPD. 1 skill point.
Every 10 levels: new title rank and cosmetic unlock.
Level 25+: Prestige system unlock (reset for permanent multipliers — TBD for post-launch).

### 5.7 Bar-Type Mastery

Per character, per bar type (7 types × 6 characters = 42 mastery tracks). Tracks first-clear only (daily resets don't count).

Tier rewards (per type, per character):
- **1 conquered:** +1 HP (common)
- **5 conquered:** +5 HP, +1 DEF (uncommon)
- **15 conquered:** +15 HP, +2 DEF, +1 ATK (rare)
- **30 conquered:** +30 HP, +3 DEF, +2 ATK, Title: "[Bar Type] Master" (epic)
- **50 conquered:** +50 HP, +5 DEF, +3 ATK, Cosmetic crown (legendary)

Total possible bonuses per character: +700 HP, +77 DEF, +42 ATK from mastery alone. Massive late-game progression.

### 5.8 Consumables

**Dark Souls model:** Finite in each fight, fully refill on rest (returning home).

Before each bar run, player packs up to **4 consumables** from their stash. Used during combat (doesn't end turn). Unused consumables go back to stash after the fight. Any used consumables are gone permanently (replenished through gameplay).

Consumable types:
- **Small Brew** (common): Heal 30% HP
- **House Special** (uncommon): Heal 70% HP
- **Shot of Courage** (uncommon): +40% ATK for 3 turns
- **Iron Tonic** (uncommon): +50% DEF for 3 turns
- **Focus Vial** (rare): +30% crit for 3 turns
- **Emergency Elixir** (rare): Auto-revive at 50% HP if killed (one per battle max)
- **Palette Cleanser** (uncommon): Remove all debuffs

Sources: daily login rewards, quest completion, random battle drops, crafting (combine rare loot into consumables). **Never purchasable with real money.**

Balance rule: Consumables let a well-prepared underleveled player survive fights 5–10 levels above them. Cannot carry them through fights 20+ levels above. No amount of healing saves you if your base damage can't crack their armor. (Pokémon balance: Super Potions help in-level; they don't turn a Level 20 into a Level 60.)

### 5.9 Loot & Gear

Per character separate inventory. Shared stash for special items (post-launch).

Rarity tiers: Common (gray), Uncommon (green), Rare (blue), Epic (purple), Legendary (gold).

Gear slots: Weapon, Armor, Accessory (3 slots initially; post-launch expand).

Loot drop rates from boss kills:
- 60% common, 27% uncommon, 9% rare, 3% epic, 1% legendary

Stat rolls: each item has primary stat (ATK or DEF) and 0–2 secondary stats (SPD, LUCK, crit%, HP) based on rarity.

### 5.10 Global Events

**Weekly World Bosses:** Every Saturday 8pm local, a random verified high-tier bar in each region becomes a "Titan" for 48 hours. HP is in the millions — the player community collectively chips it down. Damage contribution determines individual rewards.

**Seasonal Challenges:** Examples — "Pub Crawl Week" (2× XP at Irish Pubs), "Craft Beer Festival" (breweries drop exclusive cosmetics), "Sober October" (2× XP for Steady class).

**City Tournaments:** Monthly leaderboards by defender coins earned. Top 100 in each city get unique frames and titles.

**Monthly Crawl Pass:** Fortnite-style seasonal pass. 50 tiers. All rewards are cosmetic. Earned XP tracks through normal play. ~$9.50 to unlock, returns more coins than it costs if completed.

### 5.11 Bar Nomination & Verification

**Auto-listing:** Every bar with a Google Places entry (types: `bar`, `night_club`, `brewery`, `restaurant` with alcohol) is automatically in the game. Use `place_id` as the canonical identifier.

**Nominations:** Players can nominate unlisted bars (pop-ups, speakeasies, new openings). Required: name, address, type, photo. 10 unique nominations from different accounts auto-adds it. Photo must pass AI moderation (no inappropriate content).

**Auto-generated bosses:** Unclaimed bars get a procedurally generated boss from their type + name + sentiment of their Google reviews. "The Rusty Nail" in a low-rated dive bar might get "Rusty Pete" with poison-themed moves.

**Owner verification (4 methods):**
1. **Google Business Profile link** (HIGH trust, instant) — Use the My Business Verifications API
2. **Video verification** (HIGH trust, 24hr mod review) — owner records inside bar showing signage and saying their username
3. **Phone/email code** (MEDIUM trust, 5 min) — code sent to phone/email on the Google listing
4. **Community vouching** (LOW trust, provisional) — 25+ player check-ins nominate someone as owner

**Owner customization:** Boss name, avatar, catchphrase, abilities, difficulty tier (Easy/Normal/Hard/Nightmare), custom loot drops (Pro tier), happy hour events (Pro tier).

**Abuse prevention:** Claim reports reviewed by human mods. False claims = permanent ban. Ownership transfers require both parties to verify. Multi-bar operators get enterprise bulk verify flow.

---

## 6. UI/UX Requirements

### Navigation
- **Bottom tab bar** (5 tabs max): Map, Roster, Tree, Stash, Social (or similar — see prototype)
- **Top bar** shows active character, gold, XP, and bar-win count
- **Always-present** quick character switcher (swipe header left/right)

### Map View
- **Primary screen.** Mapbox GL-based, dark theme.
- Real-world map centered on user's location
- Bar markers colored by type (color codes below)
- Tap a bar → bottom sheet with details, boss preview, defender list, CHALLENGE button
- Pull-to-refresh for updated bar states

### Skill Tree View
- SVG-based for performance and scalability
- Pinch-to-zoom, pan support
- Tap node = tooltip + allocate option
- Long-press = full node details
- Tree switcher (3 trees per class) at top

### Combat View
- Portrait mode
- Top: enemy card with HP bar and portrait
- Middle: battle log (scrollable, last 15 entries)
- Below log: rhythm bar when active
- Bottom: player card with HP bar and 3 skill buttons
- Quick-slot for 4 packed consumables
- Flee button (bottom, subtle)

### Colors (brand tokens)
```
bg: #07070c
card: #111119
accent: #ff6b35 (orange)
gold: #ffd700
hp: #e63946
xp: #06d6a0
shield: #8338ec
border: #1a1a28
```

Bar type colors: Dive #8B4513, Pub #228B22, Sports #2563eb, Cocktail #8338ec, Wine #722f37, Brewery #DAA520, Nightclub #ff006e.

### Typography
- System font stack (`-apple-system, Segoe UI, sans-serif`)
- Numeric/stat display: JetBrains Mono monospace (already in prototype)
- Heading weights: 800–900
- Body: 400–600

### Haptic Feedback
- Hit confirmation on skill use (light)
- Perfect rhythm (medium)
- Critical hit (heavy)
- Victory/defeat (heavy)

### Sound
- Ambient bar noise in bar fights (type-specific)
- Hit sounds per skill type
- Rhythm "perfect" chime
- Victory fanfare
- All muteable. Default on at low volume.

---

## 7. Social & Community

### Friends & Crews
- Add friends by username
- See friends' active characters, levels, recent conquests
- "Crews" = player groups of up to 12. Shared crew chat. Weekly crew quests.

### Leaderboards
- Global, regional, city-specific
- Categories: total bars won, highest-level character, defender streak, coins earned

### Notifications
- Push: defender knocked out (with rewards summary), bar you conquered was retaken, friend reached new milestone, daily/weekly quests reset, world boss spawn
- In-app: all of above plus activity feed

### Reporting
- Report player (cheating, abusive name, inappropriate cosmetic usage)
- Report bar (incorrect info, closed, duplicate)
- All reports go to mod queue. 24hr SLA for review.

---

## 8. Technical Architecture

### Stack Decisions (Locked)

**Client:**
- React Native 0.76+
- Expo SDK 52+ (managed workflow)
- TypeScript (strict mode)
- React Native Reanimated 3 (animations)
- React Native Gesture Handler
- @gorhom/bottom-sheet (bar detail panels)
- expo-location (GPS, foreground + background)
- expo-notifications (push via Expo servers)
- expo-haptics (feedback)
- expo-av (sound effects)
- expo-secure-store (auth tokens)
- react-native-maps + Mapbox GL provider (map)
- react-native-svg (skill trees)
- zustand (client state management — simpler than Redux)

**Backend:**
- Supabase (managed PostgreSQL 16 + Auth + Realtime + Storage + Edge Functions)
- PostGIS extension (geospatial queries)
- Row Level Security (RLS) on every table
- Edge Functions in TypeScript (Deno runtime)
- Realtime subscriptions for defender state changes

**External APIs:**
- Google Places API (New) — bar discovery, photos, ratings, `place_id`
- Google Business Profile Verifications API — owner verification
- Mapbox GL — map tiles (50K free loads/month)
- RevenueCat — IAP wrapper (iOS + Android)
- Expo Push Notifications
- PostHog — product analytics and A/B testing

**Development:**
- Monorepo: `apps/mobile`, `supabase/` (schema + functions), `docs/`
- pnpm for package management
- EAS Build for native builds
- GitHub Actions for CI

### Data Model (PostgreSQL + PostGIS)

**Core Tables:**

```sql
-- Users (managed by Supabase Auth, extended)
CREATE TABLE user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text UNIQUE NOT NULL,
  gold int NOT NULL DEFAULT 250,
  total_xp_all_chars bigint DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  last_active_at timestamptz DEFAULT now(),
  home_location geography(Point, 4326),
  settings jsonb DEFAULT '{}'::jsonb
);

-- One character per class per user (6 rows per user, created on signup)
CREATE TABLE characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  class_id text NOT NULL CHECK (class_id IN ('steady','brewer','vintner','shaker','orchardist','drifter')),
  name text NOT NULL,
  level int NOT NULL DEFAULT 1,
  xp int NOT NULL DEFAULT 0,
  allocated_nodes text[] NOT NULL DEFAULT '{}',
  bars_won int NOT NULL DEFAULT 0,
  mastery jsonb NOT NULL DEFAULT '{}'::jsonb, -- { "dive": 3, "pub": 7, ... }
  inventory jsonb NOT NULL DEFAULT '[]'::jsonb,
  equipped jsonb NOT NULL DEFAULT '{}'::jsonb,
  consumables jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, class_id)
);

-- Bars (auto-populated from Google Places, extended by nominations)
CREATE TABLE bars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  google_place_id text UNIQUE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('dive','pub','sports','cocktail','wine','brewery','nightclub')),
  location geography(Point, 4326) NOT NULL,
  address text,
  rating numeric(2,1),
  atk_modifier numeric(3,2) DEFAULT 1.0,
  def_modifier numeric(3,2) DEFAULT 1.0,
  boss jsonb NOT NULL, -- { name, icon, catchphrase, move_set }
  verified_owner_id uuid REFERENCES user_profiles(id),
  is_auto_generated boolean DEFAULT true,
  nomination_count int DEFAULT 0,
  custom_loot jsonb, -- Pro tier
  custom_difficulty text DEFAULT 'normal',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX bars_location_idx ON bars USING GIST(location);
CREATE INDEX bars_type_idx ON bars(type);

-- Defenders currently stationed at bars
CREATE TABLE defenders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  bar_id uuid NOT NULL REFERENCES bars(id) ON DELETE CASCADE,
  stationed_at timestamptz NOT NULL DEFAULT now(),
  current_hp int NOT NULL,
  max_hp int NOT NULL,
  stats_snapshot jsonb NOT NULL, -- full character stats at time of placement
  loadout_snapshot jsonb NOT NULL, -- skill tree allocation at time of placement
  coins_accrued int DEFAULT 0,
  xp_accrued int DEFAULT 0,
  UNIQUE (character_id, bar_id)
);
CREATE INDEX defenders_bar_idx ON defenders(bar_id);
CREATE INDEX defenders_character_idx ON defenders(character_id);

-- Battle history
CREATE TABLE battles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attacker_character_id uuid NOT NULL REFERENCES characters(id),
  bar_id uuid NOT NULL REFERENCES bars(id),
  result text NOT NULL CHECK (result IN ('win','loss','flee')),
  xp_earned int DEFAULT 0,
  gold_earned int DEFAULT 0,
  loot_earned jsonb,
  defenders_fought int DEFAULT 0,
  duration_seconds int,
  rooms_cleared int DEFAULT 0,
  consumables_used text[],
  rhythm_stats jsonb, -- { perfect: 3, good: 5, ok: 2, miss: 1 }
  created_at timestamptz DEFAULT now()
);
CREATE INDEX battles_char_idx ON battles(attacker_character_id);
CREATE INDEX battles_bar_idx ON battles(bar_id);

-- Daily bar state (tracks resets)
CREATE TABLE bar_daily_state (
  bar_id uuid NOT NULL REFERENCES bars(id) ON DELETE CASCADE,
  date date NOT NULL,
  room_seed bigint NOT NULL, -- for deterministic generation
  total_attempts int DEFAULT 0,
  total_wins int DEFAULT 0,
  PRIMARY KEY (bar_id, date)
);

-- Nominations
CREATE TABLE bar_nominations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nominated_by uuid NOT NULL REFERENCES user_profiles(id),
  bar_name text NOT NULL,
  address text NOT NULL,
  bar_type text NOT NULL,
  photo_url text,
  location geography(Point, 4326) NOT NULL,
  vote_count int DEFAULT 1,
  status text DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','duplicate')),
  created_at timestamptz DEFAULT now()
);

-- Cosmetics & purchases
CREATE TABLE user_cosmetics (
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  cosmetic_id text NOT NULL,
  acquired_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, cosmetic_id)
);

-- Global events
CREATE TABLE global_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL, -- 'world_boss', 'seasonal', 'tournament'
  name text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  target_bar_id uuid REFERENCES bars(id), -- for world bosses
  config jsonb NOT NULL
);
```

**RLS Policies (examples):**
```sql
-- Users can only see/modify their own characters
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their characters" ON characters
  FOR ALL USING (user_id = auth.uid());

-- Bars are public read
ALTER TABLE bars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Bars are public" ON bars FOR SELECT USING (true);
CREATE POLICY "Owners can update their bars" ON bars
  FOR UPDATE USING (verified_owner_id = auth.uid());

-- Battles are private to the attacker
ALTER TABLE battles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see their battles" ON battles
  FOR SELECT USING (
    attacker_character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
  );
```

### Edge Functions (Server-Side Game Logic)

**Critical rule: All game state changes happen server-side.** The client NEVER calculates damage, XP, or rewards. The client sends intent; the server computes and validates.

**Functions to implement:**

- `POST /battle/start` — Validates GPS proximity to bar, generates room sequence for today, returns room data + enemy stats
- `POST /battle/action` — Player action (skill use, consumable). Returns new state, enemy action, log entries. Rate-limited to 1 per 500ms.
- `POST /battle/end` — Finalizes battle, awards XP/gold/loot, updates mastery, creates battle record
- `POST /bar/nominate` — Submit bar nomination, moderate photo, increment vote
- `POST /bar/claim` — Start owner verification flow
- `POST /bar/verify` — Complete owner verification (varies by method)
- `POST /defender/station` — Place character as defender, snapshot stats
- `POST /defender/recall` — Remove defender, award accrued rewards
- `POST /defender/collect` — Collect accrued coins from all defenders
- `GET /bars/nearby` — Return bars within radius, with current state
- `POST /cosmetics/purchase` — Process cosmetic purchase, validate coins
- `POST /crawl-pass/progress` — Update battle pass progress from battle result
- `CRON /daily/reset` — Midnight local reset per region. Regenerate room seeds, heal defenders 10%, roll daily quests
- `CRON /defender/decay` — Hourly. Reduce defender HP by 5%/24h, award coins up to cap, push notifications on 0-HP

### Anti-Cheat

**GPS verification:**
- Server checks distance from user's reported location to bar's coordinates (must be within 100m)
- Velocity checks: user can't teleport (reject if previous location timestamp + distance implies >200mph)
- Device trust signals (Apple/Google Play Integrity API)
- Location spoofing apps detected via `expo-location` `isMocked` flag

**Combat integrity:**
- All damage calculations server-side
- Rate limit combat actions (1/500ms)
- Server tracks expected battle duration; sub-2-second battles auto-flag for review
- Deterministic random seed per battle — server generates seed, client can verify but not manipulate

**Defender integrity:**
- Stats snapshotted on placement, cannot be modified
- Coin accrual server-calculated on collection, not client-tracked

**Report-based moderation:**
- Suspicious accounts flagged for rapid stat growth
- 3 confirmed cheating reports = permaban
- Human review for all defender leaderboard rankings >99th percentile

---

## 9. Security & Privacy

- **GDPR compliant.** Data export endpoint. Full account deletion (cascade deletes everything).
- **CCPA compliant.** California Do Not Sell.
- **Location data:** Only stored when actively fighting or nominating. Home location opt-in. Never sold to third parties.
- **Age gate at signup:** 13+ (compliance). Feature parity for all ages — no age-restricted content since no drinking is required.
- **Parental controls:** Optional PIN for purchases.
- **No PII in client logs.** All logging sanitized.
- **Secrets management:** All API keys in Supabase secrets, never in client code.

---

## 10. Testing & Quality

- **Unit tests:** 80%+ coverage on damage formulas, reward calculations, skill tree logic, XP/level math
- **Integration tests:** Battle flow end-to-end, defender placement, bar nomination flow
- **E2E tests (Maestro or Detox):** Login, first battle, cosmetic purchase, defender placement
- **Load test:** Simulate 10K concurrent battles, 1M nightly cron jobs
- **Device test matrix:** iPhone SE/11/14/15, Pixel 4a/7/8, Samsung A-series/S-series
- **Playtesting:** Weekly internal playtests from week 1. Closed beta (500 players) starting at week 10.

---

## 11. Analytics & KPIs

Track with PostHog:

**Engagement:**
- DAU/MAU ratio (target >30%)
- Session length (target 12+ min)
- Bars challenged per day per user (target 3+)
- Sessions per day (target 2+)

**Progression:**
- Average level per 30-day cohort
- Skill tree nodes allocated per 7-day cohort
- Characters played per user (target 3+)

**Monetization:**
- Conversion to payer (target 30% by month 6)
- ARPDAU (average revenue per daily active user)
- Crawl Pass completion rate

**Retention:**
- D1, D7, D30 retention (target 50%, 25%, 15%)
- Churn reasons (exit survey)

**Social:**
- Friends per user
- Crew participation rate
- Defender placements per user

---

## 12. Prioritized Build Order

**Start here. Complete each phase before moving to the next.** Each phase is scoped to be buildable in a focused sprint.

### Phase 0: Project Setup (Day 1)
1. Initialize Expo project with TypeScript
2. Set up monorepo structure: `apps/mobile`, `supabase/`, `docs/`
3. Configure EAS Build for iOS and Android
4. Create Supabase project, enable PostGIS extension
5. Deploy initial schema from Section 8
6. Set up GitHub Actions: lint, type-check, test on PR
7. Document: copy this SPEC.md into `docs/` and reference from README

### Phase 1: Auth & Character Creation (Days 2-4)
1. Supabase Auth: email + Google + Apple SSO
2. Signup flow: create user_profile + 6 characters (one per class) automatically
3. Login flow with secure token storage
4. Character roster screen: show all 6 characters, switch active
5. Header bar: active character, gold, XP
6. Bottom nav: Map, Roster (others stubbed)

### Phase 2: Map View with Mock Bars (Days 5-8)
1. Mapbox integration with dark theme
2. GPS permission flow
3. Seed database with 20 mock bars across 3 test cities
4. Bar markers on map, colored by type
5. Tap bar → bottom sheet with details
6. "CHALLENGE" button (stubbed to a coming-soon modal for now)

### Phase 3: Skill Trees (Days 9-12)
1. Skill tree view with SVG rendering
2. Port all 162 nodes from prototype into a seed file
3. Allocation logic: prereq validation, unallocation cascade
4. Tree switcher, hover/tap tooltips
5. Save allocated nodes to database per character
6. Active skill nodes become equipped skills (max 3 per character)

### Phase 4: Single-Player Combat (Days 13-18)
1. Battle screen UI (enemy card, log, player card, skill buttons)
2. Rhythm timing bar with tap detection
3. Server-side damage calculation via Edge Function
4. Procedural room generation from bar type
5. Multi-room battle flow (advance through rooms, final boss)
6. Victory/defeat screens with stubbed rewards
7. Haptic feedback on hits

### Phase 5: Rewards, XP & Loot (Days 19-21)
1. XP award and level-up logic
2. Gold award
3. Loot drop tables by rarity
4. Character inventory view
5. Bar-type mastery tracking
6. Battle history record

### Phase 6: Real Bars via Google Places (Days 22-26)
1. Google Places API integration (Nearby Search, Place Details)
2. Classify bars by type from Google's `types` array
3. Generate default bosses procedurally based on bar name/type
4. Cache bar data in Supabase (bars table)
5. Daily sync job: refresh bar data, mark closed bars inactive
6. GPS proximity verification for battle start

### Phase 7: Defender System (Days 27-32)
1. Station defender flow post-victory
2. Defender snapshot logic (stats, loadout)
3. Defender-vs-attacker AFK combat simulation
4. Battle flow updated: regulars → player defenders → boss
5. Hourly cron: decay defender HP, accrue coins
6. Collect defenders screen
7. Push notification on defender knocked out

### Phase 8: Consumables & Stash (Days 33-36)
1. Consumable database and seed
2. Stash view per character
3. Pre-battle packing screen (select up to 4)
4. In-battle use UI (quick-slot)
5. Drop rates from battles
6. Daily login rewards

### Phase 9: Cosmetics Shop (Days 37-41)
1. Cosmetic catalog (database + admin UI)
2. Shop tab with rotating items
3. Coin packs via RevenueCat
4. Purchase flow with validation
5. Cosmetic equip/preview
6. Inventory view for owned cosmetics
7. Crawl Pass (season 1): 50 tiers with rewards

### Phase 10: Bar Claiming & Owner Dashboard (Days 42-47)
1. Nomination flow
2. Google Business Verifications API integration
3. Video verification flow + moderation queue
4. Bar owner dashboard (web-first, mobile-responsive)
5. Boss customization UI
6. Difficulty settings
7. Analytics for owners

### Phase 11: Social & Leaderboards (Days 48-52)
1. Friend system (add, remove, search by username)
2. Crews (create, join, chat)
3. Global/regional/city leaderboards
4. Profile views (your own, others')
5. Activity feed
6. Reporting system + mod queue

### Phase 12: Global Events (Days 53-56)
1. Weekly world boss system
2. Seasonal challenges (data-driven config)
3. City tournaments
4. Event notifications and banners
5. Event-specific rewards (cosmetics, titles)

### Phase 13: Polish, Balancing & Beta (Days 57-70)
1. Sound design pass (ambient, SFX, music stings)
2. Animation polish (battle, transitions)
3. Tutorial flow for new players
4. Accessibility audit (screen reader, color contrast, motor)
5. Localization scaffold (even if only English at launch)
6. Closed beta (500 players)
7. Balance tuning based on beta telemetry

### Phase 14: Launch (Week 11+)
1. App Store and Play Store submissions
2. Marketing site
3. Launch campaign (10 pilot cities)
4. Bar outreach program (get 500 bars Pro-verified before launch)
5. Influencer partnerships (local content creators in pilot cities)
6. Day-one patch plan

### Post-Launch Roadmap
- Prestige system (level 25+ optional reset for permanent multipliers)
- Shared account stash for legendary items
- Crafting system (combine rare loot into consumables)
- Guild wars (crew vs crew territory control)
- Seasonal rotations (new cosmetics every 3 months)
- New classes (every 6-12 months)
- AR camera battles (long-term R&D)

---

## 13. Reference Prototype

The working React prototype (`barbrawl-v6.jsx`) contains:
- All 6 class definitions with base stats
- All 162 skill tree nodes with effects and flavor text
- All 7 bar types with modifiers
- All 5 procedural room pools
- Full combat system with rhythm input
- Skill tree allocation with prereq logic
- Reward flow and XP curve

**When in doubt, match the prototype's behavior.** It's the source of truth for content and the reference for UX feel. The prototype uses React (web), but all logic translates directly to React Native — mostly swapping `div` for `View`, `button` for `Pressable`, etc.

---

## 14. Final Notes for the Build Team

- **Ship the fun, not the features.** If something isn't fun in the prototype, it won't be fun in production. Cut ruthlessly.
- **Server-authoritative always.** Never trust the client. Every time you're tempted to compute something client-side for "speed," don't. Cache on the client, compute on the server.
- **Cosmetics revenue is the only revenue.** Every time someone suggests "just a small XP boost for $0.99" — the answer is no. This is the thing that keeps players loyal. Don't break it.
- **The Steady class matters.** It's not a gimmick. It's the backbone of the game's ethical posture. Make sure it's equally fun and equally viable.
- **Bars are real places.** Every bar is someone's business, someone's local. Treat the data with care. Never share bar analytics externally without owner consent.

Good luck. Go build it.

— End of Spec —
