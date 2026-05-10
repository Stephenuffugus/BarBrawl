# BarBrawl — Complete Art Asset List

> **One-stop inventory of every visual + audio asset BarBrawl needs.**
> Every count comes from auditing `packages/game-core/` and
> `apps/mobile/src/design/`. This is the manifest your art pipeline
> works against — content is the *contract*, not a wishlist.

## How to read this doc

- **Count** = how many distinct files at this size
- **Size** = recommended source-pixel dimensions
  (everything renders at integer multiples; 16×16 is the base unit)
- **Tier**:
  - **MUST** — game looks wrong without it
  - **SHOULD** — playable but obviously placeholder
  - **NICE** — polish, can ship without
- Where data already exists in code, the source file is cited so you
  can pull the canonical name list rather than re-typing.

---

## 1. Player character sprites (7 classes)

DB IDs on the left (preserved across all stable references — never
rename). Display names per `packages/game-core/src/classes.ts`.

| ID | Display name | Accent color | Resource |
|---|---|---|---|
| `steady` | The Operator | `#f8c020` (gold) | Focus |
| `brewer` | The Bouncer | `#a07040` (leather) | Grit |
| `vintner` | The Hexwright | `#a040c0` (purple) | Curse Stacks |
| `shaker` | The Duelist | `#e8e8e8` (silver) | Tempo |
| `orchardist` | The Medic | `#60c870` (emerald) | Reserve |
| `drifter` | The Ghost | `#5870b0` (slate) | Momentum |
| `gambler` | The Gambler | `#e04050` (red felt) | Chips |

For each of the 7 classes, you need:

| Asset | Count | Size | Tier | Notes |
|---|---|---|---|---|
| **Overworld walk cycle** | 7 × 4 dir × 2 frames = 56 | 16×16 | MUST | Pokemon Red trainer style. Direction order: down, up, left, right. |
| **Battle stand pose** | 7 | 32×32 | MUST | Center-low of battle screen ("attacker pose" in PS battles). |
| **Battle attack frame** | 7 | 32×32 | SHOULD | Replaces stand for ~250ms during attack swing. |
| **Battle hit frame** | 7 | 32×32 | SHOULD | Brief frame when struck (replaces stand for 200ms). |
| **Portrait / avatar** | 7 | 48×48 | SHOULD | Roster card, defender chip, rewards. Class icon is fallback today. |
| **Class banner / select-screen art** | 7 | 96×128 | NICE | Title-card art for "PICK YOUR CLASS" if we add it later. |
| **Defender idle** | 7 | 32×32 | NICE | Subtle "stationed" pose (could reuse stand). |

**Total class sprite count: 91 must-have / 91 should / 14 nice = 196 frames**

---

## 2. Enemies — 7 bar themes × 3 enemy types

Per `apps/mobile/src/battle/setup.ts` lineups:

| Theme | Patron | Tough | Boss |
|---|---|---|---|
| dive | Drunken Patron | Pool Cue Bruiser | Bar Owner |
| pub | Regular | Old Timer | Publican |
| sports | Loud Fan | Bookie | Coach |
| cocktail | Mixologist | Bottle Service | Sommelier |
| wine | Vineyard Snob | Cellar Master | Vintner |
| brewery | Hop Head | Cooper | Brewmaster |
| nightclub | Doorman | Promoter | DJ |

| Asset | Count | Size | Tier | Notes |
|---|---|---|---|---|
| **Patron sprite (stand)** | 7 | 32×32 | MUST | One per theme; the rank-and-file enemy. |
| **Patron hit frame** | 7 | 32×32 | SHOULD | Briefly shown on damage. |
| **Tough sprite (stand)** | 7 | 32×32 | MUST | Mid-tier; appears in dungeon room 2. |
| **Tough hit frame** | 7 | 32×32 | SHOULD | |
| **Boss sprite (stand)** | 7 | 48×48 | MUST | Big presence; final room. |
| **Boss attack wind-up** | 7 | 48×48 | SHOULD | Foreshadow telegraph (Phase 14 polish). |
| **Boss attack frame** | 7 | 48×48 | NICE | Strike pose. |
| **Boss hit / staggered frame** | 7 | 48×48 | SHOULD | Damage feedback. |
| **Patrol overworld sprite** | 7 | 16×16 | MUST | Stand-still patron blocking dungeon tile. Currently a red rim. |

**Total enemy sprite count: 35 must / 28 should / 7 nice = 70 frames**

---

## 3. Bosses — VIP / world boss tier (post-launch art)

When VIP rooms ship art (`gating.VIP_KEYS` → 7 keys, one per theme),
you'll want a "VIP boss" variant per theme. World bosses (Titans) get
their own scaled-up boss art too.

| Asset | Count | Size | Tier | Notes |
|---|---|---|---|---|
| **VIP boss sprite** | 7 | 64×64 | NICE | Tougher version of the regular boss; only seen on VIP runs. |
| **World boss / Titan** | 7 | 96×96 | NICE | One per region. 48-hour event, animated. |

**Total: 14 nice frames**

---

## 4. Item bases — 26 unique inventory icons

From `packages/game-core/src/loot/bases.ts`. Each has an implicit
that defines its identity and should be visually obvious.

### Weapons (10) — slot: `weapon`
1. **Brass Knuckles** — `+15% unarmed damage` — melee_light
2. **Bar Stool** — `+20% stagger chance` — melee_heavy
3. **Broken Bottle** — `+10% bleed on hit` — melee_light
4. **Cue Stick** — `+12% damage at long reach` — melee_long
5. **Pool Ball Sock** — `+25% crit damage` — thrown
6. **Switchblade** — `+15% crit chance` — melee_light
7. **Heavy Flask** — `+15% blunt damage` — melee_heavy
8. **Mic Stand** — `+10% multi-hit damage` — melee_long
9. **Coiled Chain** — `+15% AoE damage` — melee_long
10. **Crowbar** — `+20% damage to bosses` — melee_heavy

### Outfits (6) — slot: `outfit`
1. **Leather Jacket** — `+15 HP`
2. **Flannel Shirt** — `+10% damage reduction at HP > 80%`
3. **Hoodie** — `+5% dodge`
4. **Bar Apron** — `+10% gold from drops`
5. **Trench Coat** — `+10% status duration`
6. **Pressed Shirt** — `+8% crit chance`

### Footwear (5) — slot: `footwear`
1. **Work Boots** — `+5 DEF, -1 SPD`
2. **Sneakers** — `+2 SPD`
3. **Combat Boots** — `+10% kick damage`
4. **Dress Shoes** — `+5% crit chance, +5% gold`
5. **Loafers** — `+8% rhythm window`

### Trinkets (5) — slot: `trinket`
1. **Pocket Watch** — `+5% rhythm lenience`
2. **Zippo Lighter** — `+10% burn damage applied`
3. **Dog Tags** — `+15 HP, +5% damage reduction below 30%`
4. **Medallion** — `+10% XP gained`
5. **Keychain** — `+1 inventory slot` (cosmetic-equivalent)

### Lucky-mark slot (1) — slot: `mark` (filler — Resistance Marks fill this slot live)
1. **Lucky Ring** — `+5% crit chance` (default trinket variant for the mark slot)

| Asset | Count | Size | Tier | Notes |
|---|---|---|---|---|
| **Item icon (per base)** | 26 | 16×16 | MUST | Inventory + equip slot; needs to read at 1× and 2× scale. |
| **Item icon — large display** | 26 | 32×32 | SHOULD | Rewards screen + tooltip view. Can be 2× upscale of 16×16. |
| **Rarity frame** | 5 | 18×18 (border) | MUST | One per rarity (common/uncommon/rare/epic/legendary). Wraps the item icon. |

**Total item assets: 26 must + 5 frames + 26 should = 57 icons**

---

## 5. Consumables — 7 from `packages/game-core/src/consumables/catalog.ts`

| ID | Name | Rarity | Effect |
|---|---|---|---|
| `small_brew` | Small Brew | common | Heal 30% HP |
| `house_special` | House Special | uncommon | Heal 70% HP |
| `shot_of_courage` | Shot of Courage | uncommon | +40% ATK 3 turns |
| `iron_tonic` | Iron Tonic | uncommon | +50% DEF 3 turns |
| `focus_vial` | Focus Vial | rare | +30% crit 3 turns |
| `emergency_elixir` | Emergency Elixir | rare | Auto-revive at 50% HP |
| `palette_cleanser` | Palette Cleanser | uncommon | Remove all debuffs |

| Asset | Count | Size | Tier | Notes |
|---|---|---|---|---|
| **Consumable icon** | 7 | 16×16 | MUST | Inventory + battle ITEM panel. |
| **Use-effect particle** | 4 | 32×32 (animated 4 frames) | SHOULD | One per effect kind: heal_pct, buff_self, cleanse, auto_revive. |

---

## 6. Resistance Marks — 7 (one per damage type)

From `packages/game-core/src/gating/marks.ts`. Tier-3+ wins drop them.

| ID | Name | Damage type | Bar theme |
|---|---|---|---|
| `mark_blunt` | Hardwood Ward | blunt | dive |
| `mark_edged` | Thick Skin Ward | edged | pub |
| `mark_impact` | Bulwark Ward | impact | sports |
| `mark_toxic` | Filter Ward | toxic | cocktail |
| `mark_shadow` | Lucid Ward | shadow | wine |
| `mark_heat` | Kiln Ward | heat | brewery |
| `mark_sonic` | Dampened Ward | sonic | nightclub |

| Asset | Count | Size | Tier | Notes |
|---|---|---|---|---|
| **Mark icon** | 7 | 16×16 | MUST | Inventory + preview-screen "you have this mark" indicator. Symbolic — wood for blunt, fang for edged, etc. |

---

## 7. VIP Keys — 7 (one per bar theme)

From `packages/game-core/src/gating/marks.ts`. Cross-theme rewards.

| ID | Name | Theme |
|---|---|---|
| `key_dive` | Back-Door Key | dive |
| `key_pub` | Local's Nod | pub |
| `key_sports` | Owner's Token | sports |
| `key_cocktail` | Unmarked Menu | cocktail |
| `key_wine` | Reserve Card | wine |
| `key_brewery` | Brewer's Cask | brewery |
| `key_nightclub` | VIP Wristband | nightclub |

| Asset | Count | Size | Tier | Notes |
|---|---|---|---|---|
| **VIP key icon** | 7 | 16×16 | MUST | Inventory + preview "USE VIP KEY" button. Per-theme stylization (a literal key for dive, a wristband shape for nightclub, etc.). |

---

## 8. Skill tree node icons — 189 nodes total

**Per-tree breakdown** (3 trees × 7 classes = 21 trees, 9 nodes each):

| Class | Tree 1 | Tree 2 | Tree 3 |
|---|---|---|---|
| Operator | Precision (`focus`) | Analysis (`clarity`) | Composure (`resolve`) |
| Bouncer | Impact (`hops`) | Bulwark (`barley`) | Intimidate (`foam`) |
| Hexwright | Mark (`tannin`) | Wither (`vintage`) | Echo (`aeration`) |
| Duelist | Flourish (`shaken`) | Counter (`stirred`) | Showmanship (`garnish`) |
| Medic | Sustain (`orchard`) | Sap (`ferment`) | Triage (`harvest`) |
| Ghost | Slip (`indica`) | Speed (`sativa`) | Subterfuge (`hybrid`) |
| Gambler | Dice (`dice`) | Cards (`cards`) | House (`house`) |

**Per-tree shape** (uniform for all 21):
- T1: 2 small nodes (no prereqs)
- T2: 1 active + 1 small
- T3: 1 notable
- T4: 1 active + 1 small
- T5: 1 notable
- T6: 1 keystone

Per `packages/game-core/src/types.ts`, node types map to icon styles:

| Node type | Count per tree | Total | Size | Tier | Style |
|---|---|---|---|---|---|
| **Small** | 6 | 126 | 16×16 | SHOULD | Generic "stat bump" — could share icons across categories (4 generic icons cover all smalls). |
| **Notable** | 2 | 42 | 24×24 | MUST | Distinctive per node — these define your build. |
| **Active** | 2 | 42 | 24×24 | MUST | Distinctive per node — these are battle skills. |
| **Keystone** | 1 | 21 | 32×32 | MUST | One-of-a-kind per tree. Borderlands-style "build defining" icon. |

**Pragmatic minimum (cost-efficient):**
- 7 generic stat-bump icons (HP, ATK, DEF, SPD, LUCK, crit, dodge) — reused for the 126 smalls
- 42 active skill icons (one per active node)
- 42 notable icons (one per notable)
- 21 keystone icons
= **112 unique skill icons** instead of 189

Tree node names (full list): see source files
`packages/game-core/src/trees/{operator,bouncer,hexwright,duelist,medic,ghost,gambler}.ts`.

---

## 9. Class anointments — 21 (one per Legendary "build item")

From `packages/game-core/src/loot/anointments.ts`. These appear as a
gold halo / glow on Legendary items + a label in the tooltip.

| Class | Anointments |
|---|---|
| Operator | Sniper's Drift, Cold Analysis, Continuous Memory |
| Bouncer | Last Call, Broken Bottle Shards, Counterweight |
| Hexwright | Scarring Hex, Whispered Binding, Shared Wound |
| Duelist | Open Bout, Pointed Response, Two-Step |
| Medic | Dark Practice, Field Reinforcement, Lingering Remedy |
| Ghost | Silk Skin, Ghost's Edge, Weightless |
| Gambler | House Bones, Dealer's Grace, Loaded Edge |

| Asset | Count | Size | Tier | Notes |
|---|---|---|---|---|
| **Anointment glow** | 1 | 32×32 (animated, 4 frames) | SHOULD | Generic gold halo around the item icon — same for all anointments. |
| **Anointment label-icon** | 21 | 12×12 | NICE | Tiny stylized symbol next to the anointment name. Optional — text alone works. |

---

## 10. Tiles — overworld + 7 themed dungeon interiors

### Overworld map (`apps/mobile/src/design/tiles.ts`)

| Tile | Asset | Count | Size | Tier |
|---|---|---|---|---|
| `grass` | Grass tile | 1 | 16×16 | MUST |
| `street` | Street/asphalt tile | 1 | 16×16 | MUST |
| `sidewalk` | Sidewalk tile | 1 | 16×16 | MUST |
| `wall` | Building exterior wall | 1 | 16×16 | MUST |
| `bar_dive` | Building face — dive | 1 | 32×32 | MUST |
| `bar_pub` | Building face — pub | 1 | 32×32 | MUST |
| `bar_sports` | Building face — sports | 1 | 32×32 | SHOULD |
| `bar_cocktail` | Building face — cocktail | 1 | 32×32 | SHOULD |
| `bar_wine` | Building face — wine | 1 | 32×32 | SHOULD |
| `bar_brewery` | Building face — brewery | 1 | 32×32 | MUST |
| `bar_nightclub` | Building face — nightclub | 1 | 32×32 | MUST |
| `door_*` | Neon-trim door per theme | 7 | 16×16 | MUST |
| `sign` | Bar sign / lamppost | 1 | 16×16 | NICE |

**Plus environmental detail (Phase 14):**
- Streetlight, fire hydrant, parked car, trash can, bus stop = 5 × 16×16 NICE
- Animated neon flicker for nightclub door = 1 × 16×16, 2 frames NICE

### Dungeon interior tiles per theme (`apps/mobile/src/design/dungeon.ts`)

For each of 7 bar themes:

| Tile | Asset | Count per theme | Size | Tier |
|---|---|---|---|---|
| `floor` | Themed floor | 1 | 16×16 | MUST |
| `wall` | Themed wall | 1 | 16×16 | MUST |
| `entry` | Themed entry door | 1 | 16×16 | SHOULD |
| `exit` | Themed exit door | 1 | 16×16 | SHOULD |
| `boss` | Boss tile (gold dais) | 1 | 16×16 | MUST |
| `table` | Themed table | 1 | 16×16 | SHOULD |
| `bar` (counter) | Themed bar counter | 1 | 16×16 | SHOULD |
| `patrol` (defeated) | Same as floor | (reuse floor) | — | — |

7 themes × 7 unique tiles = **49 dungeon tile sprites**

**Total tile count: 13 overworld must + 7 nice + 49 dungeon = 69**

---

## 11. UI chrome

The PS1-literal aesthetic uses simple borders + flat fills, but a few
custom assets level it up:

| Asset | Count | Size | Tier | Notes |
|---|---|---|---|---|
| **Panel corners (4)** | 4 | 4×4 each | SHOULD | Optional rounded/decorated corners; current is solid 1px. |
| **Menu cursor / chevron** | 1 | 8×8 | MUST | The yellow `▶` triangle currently uses a Unicode glyph. Crisp pixel sprite would land better. |
| **HP/Resource bar segments** | 8 (filled, empty per state) | 4×8 | SHOULD | Replaces flat color blocks with gradient segments. |
| **Pixel font** | 1 family | 8×8 cell | MUST | We use Courier as fallback. A proper bitmap font (PressStart2P, Public Pixel) makes everything pop. |
| **Status effect chips** | 17 | 12×12 | MUST | One per `StatusEffectTag`: bleed, burn, poison, stun, blind, mark, curse, slow, buff_atk, buff_def, buff_crit, debuff_atk, debuff_def, debuff_crit, dodge_up, block, immune_dot, reflect, charge. |
| **Damage type icons** | 7 | 16×16 | SHOULD | blunt/edged/impact/toxic/shadow/heat/sonic — for the gating screen. |
| **Class accent icon ring** | 7 | 32×32 (border ring) | NICE | Replaces the flat colored square behind class icons in roster. |
| **Mute toggle / settings icon** | 4 | 12×12 | NICE | Title chrome. |

---

## 12. Particle / juice FX

These layer over the existing ShakeFlash + VictoryFlash + LevelUpFlash
to make hits / casts / wins feel more alive.

| Effect | Count | Size | Tier | Notes |
|---|---|---|---|---|
| **Hit spark** | 1 (4 frames) | 24×24 | SHOULD | Generic strike spark. |
| **Crit burst** | 1 (6 frames) | 48×48 | SHOULD | Bigger spark, gold. Replaces the white tint flash. |
| **Miss puff** | 1 (4 frames) | 24×24 | NICE | Little dust. |
| **Bleed drip** | 1 (4 frames) | 12×12 | SHOULD | Loops while bleed status is active. |
| **Burn flame** | 1 (4 frames) | 12×12 | SHOULD | Loops while burn is active. |
| **Poison bubble** | 1 (4 frames) | 12×12 | SHOULD | Loops while poison is active. |
| **Stun stars** | 1 (4 frames) | 16×16 | SHOULD | Above stunned combatant. |
| **Heal sparkle** | 1 (5 frames) | 32×32 | SHOULD | Plays on consumable / heal skill. |
| **Buff aura** | 1 (4 frames, looping) | 32×32 | NICE | Subtle glow around buffed combatant. |
| **Defender pulse** | 1 (looping) | 16×16 | NICE | Replaces the current rectangle ring on claimed bars. |
| **Mark drop sparkle** | 1 (8 frames) | 32×32 | NICE | When a Resistance Mark drops post-battle. |
| **VIP key drop sparkle** | 1 (8 frames) | 32×32 | NICE | Purple / magical. |
| **Loot rarity beam** | 5 | 16×64 (vertical light cone) | NICE | One color per rarity for the rewards screen. |

---

## 13. Background / environment art

| Asset | Count | Size | Tier | Notes |
|---|---|---|---|---|
| **Title screen logo** | 1 | 480×320 (or pixel-art version) | MUST | "BARBRAWL" wordmark. Currently text-only. |
| **Title screen ambient** | 1 (animated) | 480×800 | SHOULD | Looping background scene (city at night, neon flickering). |
| **Battle backdrop per theme** | 7 | 480×280 | SHOULD | Subtle theme-tinted parallax behind enemy sprite. Current implementation is a flat color rectangle. |
| **Map "city" backdrop** | 1 | 480×320 (parallax) | NICE | Above/below the playable map area. |
| **Loading splash** | 1 | 480×800 | NICE | Brief logo on app boot. |

---

## 14. Audio

We have a Web Audio synth fallback (`apps/mobile/src/audio/sfx.ts`)
generating 11 patches inline. Real audio elevates this to "professional":

### SFX — 11 patches need .wav versions for native build

| ID | Description | Tier |
|---|---|---|
| `menu_move` | Cursor reposition blip | SHOULD |
| `menu_select` | Menu confirm / commit | SHOULD |
| `hit` | Generic damage thud | MUST |
| `crit` | Triple-tone sting | MUST |
| `miss` | Whiff sound | SHOULD |
| `perfect` | Rising rhythm chime | MUST |
| `good` | Single-tone rhythm hit | SHOULD |
| `victory` | 4-note fanfare | MUST |
| `level_up` | Rising arpeggio | MUST |
| `footstep` | Soft thud (throttled) | NICE |
| `defeat` | Descending sad-trombone | SHOULD |

**Total SFX: 5 must / 5 should / 1 nice = 11 .wav files**

### BGM — looping music tracks

| Track | Length | Tier | Notes |
|---|---|---|---|
| **Title BGM** | 60-90s loop | MUST | Sets the mood. Chiptune ambient. |
| **Map / overworld BGM** | 90-120s loop | SHOULD | Plays while walking the streets. |
| **Battle BGM (per theme)** | 7 × 60-90s loops | SHOULD | One per bar theme — ties combat to atmosphere. |
| **Boss BGM** | 90-120s loop | NICE | Plays only during the boss room (replaces battle BGM). |
| **World boss BGM** | 90-120s loop | NICE | Saturday-Sunday-Monday Titan window. |
| **Victory fanfare** | 5-10s | SHOULD | After victory pulse, before rewards screen. |
| **Defeat sting** | 3-5s | SHOULD | One-shot, plays on loss. |

**Total BGM: 1 must / 9 should / 2 nice = 12 audio loops + 2 stings**

---

## 15. Spritesheet packing recommendations

To keep load fast and webpack/Metro happy, pack into a few atlases:

| Atlas | Contents | Size cap |
|---|---|---|
| `chars.png` | All player/enemy/boss frames | 1024×1024 |
| `tiles_overworld.png` | All overworld tiles + decor | 512×512 |
| `tiles_dungeon.png` | All 49 dungeon interior tiles | 512×512 |
| `items.png` | All 26 bases + 7 consumables + 7 marks + 7 keys | 256×256 |
| `skills.png` | 112 skill icons (small / notable / active / keystone) | 512×512 |
| `ui.png` | Chrome, status chips, fonts | 256×256 |
| `fx.png` | All particles + frames | 512×512 |

Loadable via expo-asset preload to avoid first-frame pop.

---

## 16. Master count by tier

| Tier | Total individual frames |
|---|---|
| **MUST** | ~310 (every screen will look broken without these) |
| **SHOULD** | ~250 (placeholder works but obvious) |
| **NICE** | ~110 (polish — release-after-launch) |
| **GRAND TOTAL** | ~670 sprites + 13 audio loops + 11 SFX |

For a solo art pipeline, MUST takes ~3-5 weeks at one polished sprite
per ~30 minutes (a reasonable cadence for a single artist familiar
with the style). SHOULD adds ~2-3 weeks. NICE is post-launch backlog.

If you commission a pixel artist, this list IS the brief — counts are
exact, source files cited, dimensions specified. They can quote
against it directly.

---

## 17. Where the data lives (don't re-type names)

| Asset family | Source of truth |
|---|---|
| Class names + accents | `packages/game-core/src/classes.ts` + `apps/mobile/src/design/palette.ts` (`CLASS_ACCENT`) |
| Tree node names + flavor | `packages/game-core/src/trees/{class}.ts` |
| Item base names + implicits | `packages/game-core/src/loot/bases.ts` |
| Affixes (no per-item art needed) | `packages/game-core/src/loot/affixes.ts` |
| Anointments | `packages/game-core/src/loot/anointments.ts` |
| Consumables | `packages/game-core/src/consumables/catalog.ts` |
| Marks | `packages/game-core/src/gating/marks.ts` |
| VIP keys | `packages/game-core/src/gating/marks.ts` (`VIP_KEYS`) |
| Bar themes | `packages/game-core/src/types.ts` (`BarType`) + `apps/mobile/src/design/palette.ts` (`BAR_PALETTES`) |
| Damage types | `packages/game-core/src/gating/types.ts` (`DamageType`, `BAR_THEME_DAMAGE`) |
| Status effect tags | `packages/game-core/src/combat/skill-schema.ts` (`StatusEffectTag`) |
| Tile catalog | `apps/mobile/src/design/tiles.ts` |
| Dungeon tile catalog | `apps/mobile/src/design/dungeon.ts` |
| SFX patches | `apps/mobile/src/audio/sfx.ts` |
| Sprite placeholders | `apps/mobile/src/design/sprites.ts` |

Any new content (new class, new bar theme, new item base) is added
here — the art list regenerates from these files.
