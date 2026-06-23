# Wild Wardens — Art Drop-In Spec

> The exact brief for externally-made art (Midjourney / ChatGPT / a pixel
> artist) so it integrates with **zero code changes beyond one registry line
> per file**. The game runs entirely on procedural placeholders until you drop
> real art in — every asset below is optional to *build*, required to *finish*.

**Theme:** family-friendly caretaker / nature-guardian. Real places are
overgrown and wild; the warden **soothes and tames** them, never fights. Voice
is gentle, botanical, hopeful. No alcohol, gambling, weapons, or violence.

---

## 1. How the pipeline works

```
assets/sprites/<name>.png      ← you drop a transparent PNG here
        │
        ▼
src/design/spriteAssets.ts     ← you add ONE line registering it
        │
        ▼
<PixelGrid spriteKey="..."/>   ← already wired; prefers the image,
<ImageSprite spriteKey="..."/>    else shows the procedural placeholder
```

### Three steps to add art

1. **Make** a transparent PNG at the size in the tables below.
2. **Drop** it into `apps/mobile/assets/sprites/` using the file name in the
   tables (always lowercase, `snake_case`, `.png`).
3. **Register** it in `apps/mobile/src/design/spriteAssets.ts`:

   ```ts
   export const SPRITE_ASSETS = {
     bramble_idle: require('../../assets/sprites/bramble_idle.png'),
   };
   ```

That's it. Any `<PixelGrid>` / `<ImageSprite>` whose `spriteKey` matches the
registered key now renders the image with crisp pixelated scaling. Remove the
line (or never add it) to fall straight back to the placeholder.

---

## 2. Format & rendering rules

| Rule | Value |
|---|---|
| Format | **PNG, 32-bit RGBA, transparent background** (no baked-in bg color). |
| Color | Indexed/limited palette fine; alpha must be 0 or 255 (no soft edges — they blur when upscaled). |
| Source size | The **base** pixel grid in the tables. Do NOT pre-scale; the app upscales to integer multiples at runtime. |
| Aspect | Square unless a table says otherwise. The frame is drawn into a square box. |
| Pixel grid | Author at 1×. The renderer does nearest-neighbour (web: `imageRendering: pixelated`; native: integer stretch). |
| Naming | `lowercase_snake_case.png`, matching the file-name column exactly. |
| Multi-frame | One PNG per frame (no spritesheets in this pipeline yet). Suffix frames `_f0`, `_f1`, … |

If a file is malformed or missing, the game silently uses the placeholder — it
never crashes on art.

---

## 3. File-naming convention

```
<subject>_<state>[_<dir>][_f<frame>].png
```

- `<subject>` — what it is: a class id, an enemy/boss key, or a tile key.
- `<state>` — `idle`, `walk`, `attack`, `hit`, `portrait`, or a tile name.
- `<dir>` — only for overworld walk frames: `down` `up` `left` `right`.
- `_f<frame>` — frame index for animations, starting at `0`.

Examples:

```
steady_idle.png                 class "steady" battle idle
steady_attack_f0.png            attack swing, frame 0
steady_walk_down_f1.png         overworld walk, facing down, frame 1
meadow_critter_idle.png         dive-venue rank-and-file enemy
meadow_boss_idle.png            dive-venue boss
tile_meadow_floor.png           dungeon floor tile for the Wild Meadow
```

---

## 4. Class sprites (7 classes)

Class ids are **stable** (left column — never rename). Display names are the new
caretaker titles.

| Class id | Display name |
|---|---|
| `steady` | The Operator |
| `brewer` | The Bulwark |
| `vintner` | The Hexwright |
| `shaker` | The Duelist |
| `orchardist` | The Medic |
| `drifter` | The Ghost |
| `gambler` | The Forager |

Per class, in priority order:

| Asset | Sprite key / file | Size | Tier | Notes |
|---|---|---|---|---|
| Battle idle | `<id>_idle` | 32×32 | MUST | Standing pose, centred low. The default battle frame. |
| Overworld walk | `<id>_walk_<dir>_f0`, `<id>_walk_<dir>_f1` | 16×16 | MUST | 4 directions × 2 frames = 8 files. Dirs: `down up left right`. |
| Attack frame | `<id>_attack_f0` (+ `_f1` optional) | 32×32 | SHOULD | Shown ~250 ms during a soothing action. |
| Hit frame | `<id>_hit` | 32×32 | SHOULD | Shown ~200 ms when struck. |
| Portrait | `<id>_portrait` | 48×48 | SHOULD | Roster card / keeper chip. |

Per-class file count: 1 idle + 8 walk + 1–2 attack + 1 hit + 1 portrait.
All 7 classes use identical keys with the id swapped.

---

## 5. Enemies & bosses (7 venues × tiers)

Venue **keys are stable** (internal); only the display names change to the
nature theme. Enemies are **wild, untamed nature spirits** the warden soothes —
keep them mischievous, never menacing.

| Venue key | Display name | Subject prefix |
|---|---|---|
| `dive` | Wild Meadow | `meadow` |
| `pub` | Cottage Garden | `cottage` |
| `sports` | Community Park | `park` |
| `cocktail` | Rose Garden | `rose` |
| `wine` | Old Orchard | `orchard` |
| `brewery` | Greenhouse | `greenhouse` |
| `nightclub` | Moonlit Grove | `grove` |

Per venue:

| Asset | Sprite key / file | Size | Tier | Notes |
|---|---|---|---|---|
| Critter (rank-and-file) idle | `<prefix>_critter_idle` | 32×32 | MUST | The common wild thing of the venue. |
| Critter hit | `<prefix>_critter_hit` | 32×32 | SHOULD | |
| Elder (mid-tier) idle | `<prefix>_elder_idle` | 32×32 | MUST | Tougher wild spirit, room 2. |
| Elder hit | `<prefix>_elder_hit` | 32×32 | SHOULD | |
| Boss (guardian) idle | `<prefix>_boss_idle` | 48×48 | MUST | The venue's wild keeper; final room. |
| Boss attack | `<prefix>_boss_attack` | 48×48 | SHOULD | Telegraph / windup pose. |
| Boss hit | `<prefix>_boss_hit` | 48×48 | SHOULD | Staggered, about to be soothed. |
| Overworld patrol | `<prefix>_patrol` | 16×16 | SHOULD | Wild thing blocking a dungeon tile. |

7 venues × the above. MUST per venue: 3 (critter, elder, boss idle).

---

## 6. Tiles

### Overworld

| Tile | Sprite key / file | Size | Tier |
|---|---|---|---|
| Grass | `tile_grass` | 16×16 | MUST |
| Path | `tile_path` | 16×16 | MUST |
| Edge / verge | `tile_verge` | 16×16 | MUST |
| Hedge / wall | `tile_hedge` | 16×16 | MUST |
| Venue face (per venue) | `tile_<prefix>_face` | 32×32 | MUST |
| Venue gate (per venue) | `tile_<prefix>_gate` | 16×16 | SHOULD |

### Dungeon interior (per venue)

For each venue prefix (`meadow`, `cottage`, `park`, `rose`, `orchard`,
`greenhouse`, `grove`):

| Tile | Sprite key / file | Size | Tier |
|---|---|---|---|
| Floor | `tile_<prefix>_floor` | 16×16 | MUST |
| Wall | `tile_<prefix>_wall` | 16×16 | MUST |
| Entry | `tile_<prefix>_entry` | 16×16 | SHOULD |
| Exit | `tile_<prefix>_exit` | 16×16 | SHOULD |
| Boss dais | `tile_<prefix>_dais` | 16×16 | MUST |
| Feature (planter/bench/etc.) | `tile_<prefix>_feature` | 16×16 | NICE |

---

## 7. Minimum viable art set (MUST only)

To replace the most jarring placeholders first:

- 7 class idle (`<id>_idle`, 32×32)
- 56 class walk frames (`<id>_walk_<dir>_f{0,1}`, 16×16)
- 7 venue critter idle + 7 elder idle + 7 boss idle
- 4 overworld base tiles + 7 venue faces
- 14 dungeon floor + wall (2 × 7 venues) + 7 boss dais

Everything else is SHOULD / NICE and the placeholder covers it indefinitely.

---

## 8. Where things live

| Thing | Path |
|---|---|
| Drop PNGs here | `apps/mobile/assets/sprites/` |
| Register each file | `apps/mobile/src/design/spriteAssets.ts` |
| Image renderer | `apps/mobile/src/components/ImageSprite.tsx` |
| Placeholder grid (auto-prefers art) | `apps/mobile/src/components/PixelGrid.tsx` |
| Procedural placeholder shapes | `apps/mobile/src/design/sprites.ts` |
| Canonical name lists (don't re-type) | see `docs/ART_ASSET_LIST.md` §17 |
