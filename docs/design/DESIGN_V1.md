# BarBrawl — Design Proposal v1

> **Status:** Draft for user review. Do NOT start implementing content
> changes until user signs off on (a) class list, (b) affix system, (c)
> raid model, (d) blockchain position. The research and synthesis
> behind this doc is archived in this session's transcript.

This is a **diff against `docs/BARBRAWL_SPEC.md`**, not a replacement.
Keep everything the spec says; only the sections below change.

## 0. TL;DR

- Kill the drink-themed class names and resource vocabulary. Keep the
  stat spreads, skill tree shape, and damage math. Reskin to combat
  archetypes with distinct **resources** and **action economies**, not
  just stat weights.
- Replace §5.9's 2-paragraph loot section with a real
  PoE/D2/Borderlands-hybrid **affix generator**: base item × rarity ×
  tiered affix pool × class-synergy "anointment" × optional corrupted
  implicit. Drops are readable via color + sound + AR beam.
- Add **Metroidvania gating** via **resistance keys** and
  **item-flagged bar tiers** — not literal movement abilities.
  Harder bars are blocked until you earn the resistance/key that
  makes them survivable.
- Add an **open-raid system** for shared bar-dungeons: geofenced
  Helldivers-style SOS beacon, personal loot, no leader hierarchy, no
  paid raid passes.
- Account-bound by default. **Do not put gear on a blockchain for
  launch.** Use an in-game "Back Bar Market" for soft trading with
  game currency. Revisit chain later if/when it actually solves a
  problem the game has.

---

## 1. The Class Roster — Reskin + Resource Split

### 1.1 What we keep

- 6 classes. Every account owns all 6 characters day one.
- Stat spreads from spec §5.1 are good — keep them, re-attach to new
  archetypes.
- 3 trees × 9 nodes × 6 classes = 162 nodes. The **shape** is good.
  **Names and flavor text get rewritten.** Node effects mostly survive.
- Keystones, synergies, and tier structure from spec §5.2.

### 1.2 What changes — archetypal combatants, not drink archetypes

| ID (keeps DB PK) | New Name | Archetype | Stat spread (unchanged) | Unique resource | Action economy twist |
|---|---|---|---|---|---|
| `steady`   | **The Operator**  | Calm specialist / crit precision | 110/11/11/11/11 | **Focus** (builds passively, spent for guaranteed-hit skills) | 1 action/turn, crits convert to Focus |
| `brewer`   | **The Bouncer**   | Heavy enforcer / tank-striker    | 130/12/14/7/6   | **Grit** (gained when taking damage, spent on retaliation skills) | 1 action/turn; can "absorb" to bank a 2-action turn |
| `vintner`  | **The Hexwright** | Debuff caster / curse compounder | 85/8/6/12/15    | **Curse stacks** (applied to enemy, detonated by finishers) | 1 action/turn; some skills cost enemy stacks instead of player resource |
| `shaker`   | **The Duelist**   | Burst hybrid / mixup chains      | 95/11/8/13/13   | **Tempo** (gained on rhythm-perfect hits, spent on combo extenders) | 1 action/turn, perfect-chain triggers free bonus action |
| `orchardist` | **The Medic**   | Sustain healer / DoT applicator  | 115/9/10/10/11  | **Reserve** (stored HP, healed from overheals) | 1 action/turn; can bank heals as Reserve |
| `drifter`  | **The Ghost**     | Evasion / chaos / mobility       | 100/10/8/14/13  | **Momentum** (gained by dodging/moving, spent on blitz skills) | 1 action/turn; can trade SPD for a 2nd half-action |

**Why this roster makes classes distinct** (per FF5/FFT research):
stat spreads are the weakest differentiator. The *resources* and
*action economies* are the strong levers. No two classes here spend
or generate the same resource.

Tree names get reskinned to match. Quick sketch:

- **Operator:** Precision / Analysis / Composure
- **Bouncer:** Impact / Bulwark / Intimidate
- **Hexwright:** Mark / Wither / Echo
- **Duelist:** Flourish / Feint / Riposte
- **Medic:** Mend / Bitter Root / Triage
- **Ghost:** Drift / Blur / Slip

Bar-type mastery bonuses (§5.7) re-map:

- Operator: universal (no bonus bar type — same as spec's Steady)
- Bouncer: dive bars (+20%) — "the Bouncer belongs at the Rusty Nail"
- Hexwright: cocktail lounges / speakeasies
- Duelist: sports bars (proving ground)
- Medic: breweries (communal rooms, patient sustain plays)
- Ghost: nightclubs (low-light, high-crowd)

**Migration note:** DB `class_id` column values stay
`steady/brewer/vintner/shaker/orchardist/drifter` (spec §8). Renaming
is display-only. If a later migration renames the IDs, it's one SQL
update + a content rewrite — not a schema break.

### 1.3 Where drinking still lives

- The **world** is bars. Bar TYPES, bar NAMES, venue owners, enemy
  "regulars" — all still drink-flavored. That's the setting.
- **Consumables** (spec §5.8) can still be drink-themed items you pick
  up in your inventory. That's in-world props, not class identity.
- The **Steady-class ethical posture** from spec §3 transfers
  cleanly: the Operator is the non-drinking archetype, equally
  viable, same first-class-citizen status.

---

## 2. Equipment & Loot — The Real Generator

Spec §5.9 is ~6 lines. This is where we add real depth. Borrowing:
**PoE tiered affixes + D2 base-item identity + Borderlands class
anointments + Destiny 2 focusing.**

### 2.1 Item anatomy

Every item has five layers:

1. **Base item** (determines slot, base stats, implicit).
   Weapon bases: Brass Knuckles, Bar Stool, Bottle, Cue Stick, Pool
   Ball Sock, Switchblade, Flask, Mic Stand, Hammer, etc. Each base
   has one implicit mod (Brass Knuckles: "+X% unarmed damage"; Cue
   Stick: "+X% damage at long reach", etc.). **Base item identity
   matters** — you farm "a T3 Bar Stool base" separately from rolls.
2. **Rarity tier** — Common / Uncommon / Rare / Epic / Legendary
   (spec §5.9). Tier caps number of affix slots:
   - Common: 0 affixes
   - Uncommon: 1 affix
   - Rare: 2 affixes
   - Epic: 3 affixes
   - Legendary: 3 affixes + 1 guaranteed class-anointment
3. **Explicit affixes** rolled from a **tiered pool gated by item
   level** (D2/PoE). An affix like "of the Street Fighter" (+X ATK)
   has 6 tiers; T1 only rolls on ilvl 80+. Players farming a specific
   tier farm specific bar tiers.
4. **Class anointment** (Legendary-only, guaranteed): one affix that
   references a specific class's skill or resource. Same gun feels
   different on different classes. E.g., "Operator's Focus generates
   +20% faster on crit" on a pistol. **This is what makes a
   legendary a BUILD ITEM instead of a stat bump** (Borderlands BL3).
5. **Corruption (optional endgame)** — at endgame, players can burn
   a rare consumable on any item to add an **implicit corrupted
   mod** at the risk of locking it from further modification. PoE's
   Vaal Orb pattern. High reward, high drama. Post-launch feature;
   design the schema for it now, enable in a later season.

### 2.2 Gear slots

Spec says 3 slots (Weapon / Armor / Accessory). Expand to **5**:

- Weapon (the item you hit with — drives ATK scaling)
- Outfit (jacket, hoodie, shirt — drives DEF + HP)
- Footwear (SPD, crit chance)
- Trinket (pocket item — LUCK, situational mods)
- Mark (invisible — unlocks keystones/resistances, see §3 Metroid gating)

Three slots at launch is fine; spec already says "post-launch
expand." Design the item generator for 5 now so we don't refactor.

### 2.3 Affix tiers and drop gating

- 6 tiers per affix. Higher tiers only roll on higher-ilvl drops.
- Boss kill drops scale to (bar_tier × 15) ilvl. Early bars drop up
  to T3-T4; endgame bars drop T1.
- **Focusing** (Destiny 2 pattern): each bar has a **"House Spec"** —
  a narrower affix pool it favors. Farm the Rusty Nail for Bouncer-
  friendly rolls; farm Neon Drip for Ghost rolls. Geography becomes
  affix targeting.

### 2.4 Drop readability

- Rarity = color + sound + AR effect on the map after a bar clear.
  Legendary = gold beam visible from nearby bars in the AR overlay.
  PoE-style drop filter settings ("hide Commons after Lv 50") in
  settings.
- In-inventory: is-this-an-upgrade auto-compare vs currently
  equipped, highlighted in HUD. Old-game RPGs died on this UX — we
  won't.

### 2.5 Rarity drop rates

Spec's rates (60/27/9/3/1) are fine. Add:

- First-conquer bonus: guaranteed Rare or better.
- Epic/Legendary have a **pity timer** — 50 bar clears without a
  Legendary guarantees the next is Legendary (rolls hidden). Stops
  "I've cleared 200 bars and still no legendary" rage.

### 2.6 Economy stance

- **Account-bound on pickup by default.** Nothing is tradeable.
- **"Back Bar Market"** (post-launch): a limited soft-trade window
  where a single Uncommon or Rare item can be listed for in-game
  gold at any bar you've conquered. 7-day expiry. Buyer must be
  physically at that bar. Item becomes bound on pickup. Creates
  local-economy flavor without real-money exposure.
- Legendaries and Epics **never** trade. Keeps the chase pure.
- Rerolling: "Focusing" currency earned from play (not sold) lets
  players spend to re-roll a specific affix slot on an existing
  item. Destiny 2's model. Avoids the D2 "only lottery" trap.

See §6 for why this is recommended over blockchain.

---

## 3. Metroid-Style Gear Gating for Bar Progression

Movement abilities don't literally transfer to a geo-game (can't
double-jump to a bar). But the **logic** does: gate harder bars
behind earned items, and layer the world so that the act of
progressing visibly opens new areas on the map.

### 3.1 Three gating mechanics

**A. Resistance gates (the Varia Suit pattern):**
Bars have an "environmental theme" (Dive, Speakeasy, Nightclub,
Sports Bar, Brewery, Craft, Cocktail). At Tier 3+, each theme deals
a specific damage type:

- Dive: Blunt (chairs, fists)
- Nightclub: Sonic (sound blasts, strobe)
- Cocktail: Toxic (burn DoTs)
- Sports Bar: Impact (projectiles)
- Speakeasy: Shadow (debuffs)
- Brewery: Heat (fermenter hazards)
- Craft: Edged (glass-cut)

To survive Tier 4+ of a theme, you need the matching **Resistance
Mark** (trinket/mark slot item), dropped from a Tier 3 clear of that
theme. Pure Varia Suit logic: area always visible on map, always
**enterable but unsurvivable** until you have the mark. Tier 3 and
below don't gate — it's a soft difficulty signal.

**B. Key item gates (the red-door pattern):**
Some bars have a **sealed "VIP room"** behind the boss — an extra
dungeon floor with better loot tables. Entering requires a **Key**
(rare drop from a DIFFERENT bar of the same theme). Keys are
consumed on use. One key → one VIP run. Creates cross-bar
dependencies: to fully clear the Rusty Nail, you need a key from
Neon Drip. Bars become nodes in a graph.

**C. Faction-tier gates (the soft progression pattern):**
Bar-type mastery (spec §5.7) already gives stat bonuses. Extend it:
mastery Tier 3 (15 clears) of a theme **unlocks** that theme's Tier
4+ bars on the map at all. Before that, Tier 4 bars render as
**grayed silhouettes with the required theme icon** (Metroidvania's
"glimpse rule"). You can see them; you can't enter them. Maps
become a to-do list.

### 3.2 Why this works for a geo-RPG

- Resistance marks travel with the player, so gating works
  regardless of physical location.
- Keys create cross-bar progression puzzles without requiring
  specific geography — any two bars of the same theme suffice.
- Grayed bars on the map create pull ("what do I need to open
  that?") while never blocking exploration — you can still visit
  every bar, just can't fight the hard one yet.

### 3.3 Class-gated pathways (optional stretch)

Post-launch: some gated bars allow multiple entry keys depending on
class. A Ghost class can "slip past" a bouncer-gated VIP room that a
Bouncer class has to brute-force. Different class = different
dungeon route. FF Tactics / SaGa energy.

---

## 4. Open-Raid System (Bar-Dungeons with Strangers)

Spec has **no multiplayer combat** currently — only async defender
vs. attacker. This adds synchronous multiplayer. Scope: post-Phase-7.

### 4.1 Beacon-style lobby

Model: **Helldivers 2 SOS beacon + Pokémon GO geofence**.

- Any player at a bar can **ignite a raid** — promotes the bar's
  normal run into a "Raid Run" variant (boss HP ×N, harder enemies,
  better loot).
- Igniting broadcasts a push to **all logged-in players within 200m
  of the bar** ("Raid forming at The Rusty Nail — 90s to join, 4/6
  slots"). Also visible as a pulsing icon on the map for anyone
  panned there.
- 90-second join window. Auto-start when full or on timer.
- Party size: 2-6 players. Boss HP and loot table scale.
- **No leader role, no kick-voting.** Igniter gets no special
  powers. (Kick-votes are a griefing vector among strangers —
  confirmed across open-raid research.)
- **Silent-join toggle:** join without chat/voice. Text/voice
  opt-in only. Critical for stranger lobbies.

### 4.2 Raid combat

- Same turn-based rhythm combat as solo (spec §5.3). Turns cycle
  through all players + enemies.
- **Cooperative mechanics:** some skills become Combination Skills
  (PS4 pattern) when two players target the same enemy on the same
  turn. E.g., Bouncer's Stagger + Ghost's Blitz → "Pinned Down"
  (target loses next turn).
- **Revival:** dead players can be revived by a Medic or at the
  cost of a consumable. Full wipe = raid fails, all alive players
  lose the bonus.
- **Rhythm amplification:** when 2+ players hit "Perfect" on the
  same round, party-wide +10% damage for one turn.

### 4.3 Loot distribution

**Personal loot, always.** (Modern WoW / Destiny / Helldivers
converged here for clear reasons.)

- Every player independently rolls against the raid drop table on
  boss kill.
- Roll quality scales with **contribution** (damage + healing +
  support cleanses). Low-contribution = still gets common/uncommon;
  top carry = better odds at Rare+. No one leaves empty-handed; no
  one can kill-steal.
- Raid XP, gold, faction rep: fully shared, identical for all.

### 4.4 Griefing & integrity

- **Raid-ignite requires GPS + a venue-verification signal:**
  either a bar BLE beacon (post-launch), a bar-posted QR at tables,
  OR 3+ minutes of sustained GPS dwell inside the geofence. Stops
  remote-spoof ignition.
- **Soft reputation:** repeat AFKers and early-leavers get matched
  together. No public shaming — matchmaking just pools the
  offenders.
- **Daily raid passes:** 3 raids/day for free, refilled at local
  midnight. Bonus raids earned via quest completion, never sold
  for real money. Mirrors spec §3's "zero pay-to-win."

### 4.5 Scope warning

This is the largest new system in this doc. It is **not** required
for launch. Solo bar runs + async defender PvP (spec's current
model) are enough for v1. Raids are a v1.5 headline feature.

---

## 5. Skill-Tree ↔ Gear Synergy Matrix

Classes must synergize with gear to feel distinct. Design rule:
**every Legendary has a class-anointment that references one skill
tree node.**

Examples:

| Item | Base | Class-anointment | Shape of build |
|---|---|---|---|
| "Last Call" brass knuckles | Brass Knuckles (unarmed implicit) | Bouncer Grit generation +50% below 30% HP | Low-HP berserker Bouncer |
| "The Corkscrew" switchblade | Switchblade (bleed implicit) | Hexwright Wither stacks detonate for 2x on crit | Crit-curse Hexwright |
| "Bottomless Tumbler" flask | Flask (throw implicit) | Medic overheal converts to +2 Reserve/turn | Stacking-heal tank Medic |
| "Silent Bell" mic stand | Mic Stand (stun implicit) | Ghost dodge grants +20% Momentum vs next target | Dodge-chain Ghost |
| "Cold Read" cue stick | Cue Stick (long-reach implicit) | Operator Focus hits ignore 100% DEF vs marked | Sniper Operator |
| "Fighter's Pride" pool ball sock | Pool Ball (variance implicit) | Duelist Tempo caps raised from 3 to 5 | Long-combo Duelist |

Every class has ~5-8 "chase" legendaries at launch that *define*
builds. Stat-bump legendaries (a Bouncer sword that just adds +ATK)
are rare and forgettable on purpose.

---

## 6. Blockchain Position (Answering the Ask)

**Recommendation: do not put gear on a blockchain for launch.**

### Why not

1. **Legal/regulatory exposure.** Tokenized in-game items with real
   trade value attract securities questions in the US (Howey test),
   VAT/consumption-tax complexity in EU, and gambling-adjacent
   scrutiny globally. For a solo-dev side project awaiting capital,
   this is a distraction-magnet.
2. **Onboarding tax.** Requiring a wallet (or even an embedded
   wallet) to trade gear adds steps that nuke the casual-user
   funnel. The geo-game audience is not the crypto-native audience.
3. **Bot-farming economics.** Once items have dollar-denominated
   resale value, GPS-spoofing bot farms become profitable. You
   spend your engineering budget on anti-cheat, not content.
4. **Gas costs wreck micro-trades.** A Rare gear trade isn't worth
   $2 in gas on L1, and L2 UX still requires bridging. You end up
   with an ecosystem-gated system no one uses.
5. **Crypto UX is exhausting.** Seed phrases, wallet connects,
   chain switches — none of that matches a phone geo-game's
   mood. Lucid Winds runs without any of this.
6. **It doesn't solve a problem BarBrawl has.** BarBrawl's identity
   is IRL social bar-raiding. "Provable scarcity" is not part of
   what makes that fun.

### What to build instead

- **Account-bound by default** (spec is right).
- **"Back Bar Market"** (see §2.6) — soft in-game trading for
  common/uncommon items at bars, priced in gold. Gives ~80% of the
  "trade the sword I found" feeling without any of the infra.
- **Focusing currency** to re-roll affixes — gives the "spend to
  upgrade" loop that PoE's currency economy provides, but purely
  in-game and inflation-controlled.

### If blockchain must happen later

Put it behind a feature flag. Design hook: our `items` table's
`bound_to_user_id` column can carry null ("unbound") or a
`chain_asset_id` later. Schema-forward without commitment. Revisit
only after launch PMF and only if a specific problem emerges that
blockchain actually solves (probably: verifiable rare-drop claims
for tournament events, if that becomes a thing).

**If user insists on launch-day chain support:** reply to this doc
with "chain yes" and I'll propose a minimal architecture — but I'll
argue against it one more time first.

---

## 7. What stays the same (do not rebuild)

- Damage formula (spec §5.3) — correct.
- XP curve (§5.6) — correct.
- Rhythm combat + AFK mode (§5.3) — correct.
- Bar run procgen (§5.4) — correct.
- Defender system (§5.5) — correct.
- Bar-type mastery skeleton (§5.7) — correct.
- Google Places bar auto-listing + verification (§5.11) — correct.
- Monetization stance: cosmetics + bar owner tier only (§3, §4).
- Postgres + Supabase + Expo + Mapbox/Leaflet (pending dist. decision).

---

## 8. Open questions for user (answer these to unlock implementation)

1. **Class names OK?** Operator / Bouncer / Hexwright / Duelist /
   Medic / Ghost. Or pick your own from the archetype brief.
2. **Resource split OK?** Focus / Grit / Curse stacks / Tempo /
   Reserve / Momentum — each class a distinct meter.
3. **Affix system OK?** PoE-style tiered affixes + Borderlands class
   anointments + Destiny 2 focusing re-rolls. Account-bound.
4. **Metroid gating OK?** Resistance marks, VIP keys, grayed
   locked bars.
5. **Open raids — build or defer?** Real design cost. v1.5 is safer.
6. **Blockchain: confirm NO for launch, soft-market in-game only.**
7. **Any class you want added or swapped?** Room for a 7th if there's
   an itch — e.g., a **Summoner** (party of regulars), a **Gambler**
   (high-variance crits), a **Barkeep** (buff/debuff specialist).

---

## 9. Recommended execution order (if sign-off received)

All of this fits the STATUS "Path A — distribution-agnostic" bucket.
No native deps, no real-money accounts needed.

1. Extract `packages/game-core` (already recommended in STATUS).
2. Port v6 `CLASSES` and `TREES` arrays into game-core with the new
   names/flavor but same IDs and same effects.
3. Build the **item generator** as a pure function:
   `rollItem({barTier, houseSpec, classContext, rng}) → Item`.
4. Build **affix pools** as typed data. Start with 20 affixes × 4
   tiers each. Expand later.
5. Build **resistance/key/mark** data model — tables for Marks,
   Keys, Resistance mappings. Stub the combat-side damage-type
   resolver.
6. Write unit tests per spec §10 — 80%+ coverage on:
   damage formula, XP curve, affix-roll distribution, loot rarity
   distribution across 100k simulated drops, Metroid gate
   eligibility.
7. *Pause* before any UI work to reconfirm distribution target.

Everything here is portable regardless of native/web decision.
