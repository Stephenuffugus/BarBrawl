import { useState, useEffect, useRef } from "react";

// ═══════════════════════════════════════════════════════════════
// BARBRAWL v6 — Full Skill Trees + Rhythm Combat + Procedural Bars
// ═══════════════════════════════════════════════════════════════

const T = {
  bg: "#07070c", bg2: "#0e0e16", card: "#111119",
  accent: "#ff6b35", gold: "#ffd700", hp: "#e63946", mp: "#4895ef",
  xp: "#06d6a0", shield: "#8338ec", text: "#e8e6e3", dim: "#6b6b7b",
  faint: "#2a2a3a", border: "#1a1a28", success: "#06d6a0", danger: "#ef476f",
};
const RC = { common: "#9ca3af", uncommon: "#22c55e", rare: "#3b82f6", epic: "#a855f7", legendary: "#f59e0b" };
const NODE_COLORS = { small: "#6b6b7b", notable: "#ff6b35", keystone: "#ffd700", active: "#8338ec" };

// ═══════════════ 6 CLASSES ═══════════════
const CLASSES = [
  { id: "steady", name: "The Steady", icon: "💧", color: "#4895ef",
    desc: "Clear-eyed. Balanced in all things.",
    base: { hp: 110, atk: 11, def: 11, spd: 11, luck: 11 },
    trees: ["focus", "clarity", "resolve"],
    treeNames: { focus: "Focus (Precision)", clarity: "Clarity (Utility)", resolve: "Resolve (Defense)" },
  },
  { id: "brewer", name: "The Brewer", icon: "🍺", color: "#DAA520",
    desc: "Heavy hitter. Slow and steady.",
    base: { hp: 130, atk: 12, def: 14, spd: 7, luck: 6 },
    trees: ["hops", "barley", "foam"],
    treeNames: { hops: "Hops (Damage)", barley: "Barley (Defense)", foam: "Foam (Control)" },
  },
  { id: "vintner", name: "The Vintner", icon: "🍷", color: "#722f37",
    desc: "Curse-based magic DPS.",
    base: { hp: 85, atk: 8, def: 6, spd: 12, luck: 15 },
    trees: ["tannin", "vintage", "aeration"],
    treeNames: { tannin: "Tannin (Curse)", vintage: "Vintage (Scaling)", aeration: "Aeration (Support)" },
  },
  { id: "shaker", name: "The Shaker", icon: "🍸", color: "#8338ec",
    desc: "Versatile hybrid. Shaken or stirred.",
    base: { hp: 95, atk: 11, def: 8, spd: 13, luck: 13 },
    trees: ["shaken", "stirred", "garnish"],
    treeNames: { shaken: "Shaken (Burst)", stirred: "Stirred (Crit)", garnish: "Garnish (Utility)" },
  },
  { id: "orchardist", name: "The Orchardist", icon: "🍎", color: "#ff8c00",
    desc: "Healer. Regeneration and sustain.",
    base: { hp: 115, atk: 9, def: 10, spd: 10, luck: 11 },
    trees: ["orchard", "ferment", "harvest"],
    treeNames: { orchard: "Orchard (Heal)", ferment: "Ferment (DoT)", harvest: "Harvest (Survival)" },
  },
  { id: "drifter", name: "The Drifter", icon: "🌿", color: "#06d6a0",
    desc: "Speed and perception. Slips through.",
    base: { hp: 100, atk: 10, def: 8, spd: 14, luck: 13 },
    trees: ["indica", "sativa", "hybrid"],
    treeNames: { indica: "Indica (Slow)", sativa: "Sativa (Speed)", hybrid: "Hybrid (Chaos)" },
  },
];

// ═══════════════ SKILL TREES (9 nodes per tree × 18 trees) ═══════════════
// Each tree: 9 nodes in a structured layout
// Tiers: 1,1 | 2,2 | 3 | 4,4 | 5 | 6 (keystone)
function makeTree(prefix, config) {
  const [n1, n2, n3, n4, n5, n6, n7, n8, n9] = config;
  return [
    { id: `${prefix}_1`, name: n1[0], type: "small", tier: 1, x: 60, y: 50, effect: n1[1], desc: n1[2] },
    { id: `${prefix}_2`, name: n2[0], type: "small", tier: 1, x: 160, y: 50, effect: n2[1], desc: n2[2] },
    { id: `${prefix}_3`, name: n3[0], type: "active", tier: 2, x: 110, y: 130, effect: n3[1], desc: n3[2], req: [`${prefix}_1`, `${prefix}_2`] },
    { id: `${prefix}_4`, name: n4[0], type: "small", tier: 2, x: 30, y: 140, effect: n4[1], desc: n4[2], req: [`${prefix}_1`] },
    { id: `${prefix}_5`, name: n5[0], type: "notable", tier: 3, x: 110, y: 220, effect: n5[1], desc: n5[2], req: [`${prefix}_3`] },
    { id: `${prefix}_6`, name: n6[0], type: "active", tier: 4, x: 60, y: 310, effect: n6[1], desc: n6[2], req: [`${prefix}_5`] },
    { id: `${prefix}_7`, name: n7[0], type: "small", tier: 4, x: 170, y: 310, effect: n7[1], desc: n7[2], req: [`${prefix}_5`] },
    { id: `${prefix}_8`, name: n8[0], type: "notable", tier: 5, x: 110, y: 400, effect: n8[1], desc: n8[2], req: [`${prefix}_6`, `${prefix}_7`] },
    { id: `${prefix}_9`, name: n9[0], type: "keystone", tier: 6, x: 110, y: 500, effect: n9[1], desc: n9[2], req: [`${prefix}_8`] },
  ];
}

const TREES = {
  // STEADY - Focus (precision/crit)
  focus: makeTree("fo", [
    ["Fixed Gaze", "+4% crit", "Nothing escapes your eye."],
    ["Still Hands", "+3 ATK", "No shake, no waste."],
    ["Clean Strike", "Active: 130% ATK, always hits", "Precision over power."],
    ["Calibrate", "+6% crit", "Zero in."],
    ["Laser Focus", "Crits deal +25% more", "Compound precision."],
    ["Perfect Read", "Active: Predict + dodge next attack", "You saw it coming."],
    ["Analyze", "+10% dmg to marked enemies", "Studied them already."],
    ["Bullseye", "Crits ignore 50% DEF", "Nothing stops clean hits."],
    ["CLARITY ABSOLUTE", "KEYSTONE: All hits crit. -40% base ATK.", "When you see everything, you miss nothing."],
  ]),
  // STEADY - Clarity (utility/XP)
  clarity: makeTree("cl", [
    ["Sharp Memory", "+5% XP earned", "Every lesson sticks."],
    ["Read Room", "+5% all stats vs more enemies", "The more, the clearer."],
    ["Lucid Moment", "Active: Skip enemy turn", "Time slows."],
    ["Study Habit", "+10% XP", "Compounding knowledge."],
    ["Sober Vision", "Immune to debuffs", "Nothing clouds you."],
    ["Know Thyself", "Active: Restore 50% HP + cleanse", "Centered."],
    ["Patience", "Each unused turn: +5% next hit", "Wait for it."],
    ["Muscle Memory", "+25% active skill effectiveness", "Trained to reflex."],
    ["PERFECT RECALL", "KEYSTONE: Earn 2x XP. Cannot use consumables.", "You don't need shortcuts."],
  ]),
  // STEADY - Resolve (defense)
  resolve: makeTree("re", [
    ["Grounded", "+5 DEF", "Rooted stance."],
    ["Stoic", "-5% dmg taken", "Pain is noise."],
    ["Hold Line", "Active: +100% DEF for 2 turns", "Nothing past."],
    ["Breathe Deep", "+15 HP", "Capacity increases."],
    ["Unshakeable", "+20% DEF, immune to knockback", "Foundation solid."],
    ["Second Wind", "Active: Heal 40% HP when below 30%", "Not done yet."],
    ["Steady Breathing", "Regen 2% HP/turn", "Constant recovery."],
    ["Iron Will", "Cannot be reduced below 1 HP once/battle", "Force of will."],
    ["IMMOVABLE", "KEYSTONE: Take 50% less dmg. Cannot deal crits.", "Be the mountain."],
  ]),

  // BREWER - Hops
  hops: makeTree("ho", [
    ["Bitter Bite", "+3 ATK", "The bitterness builds."],
    ["Hop Sting", "+5% crit", "Sharp on the tongue."],
    ["Citra Punch", "Active: 140% ATK + citrus splash", "Juicy haze punch."],
    ["Dry Hop", "+8% ATK", "Late-addition aromatics."],
    ["Resin Rage", "+20% ATK when HP > 80%", "Sticky green fury."],
    ["IBU Overload", "Active: 200% ATK + bitter DoT 3 turns", "Overwhelming bitterness."],
    ["Double IPA", "Active skills -10% cooldown", "Twice the hops."],
    ["Triple Dry Hop", "Bitter DoT +50% dmg", "Stacked aroma."],
    ["HAZE", "KEYSTONE: All hits apply Bitter. -20% DEF.", "Lost in the haze."],
  ]),
  // BREWER - Barley
  barley: makeTree("ba", [
    ["Malt Shield", "+4 DEF", "Toasted grain."],
    ["Grain Weight", "+8 HP", "Full-bodied."],
    ["Barrel Block", "Active: Block next 2 hits", "Oak-staved."],
    ["Heavy Body", "+15 HP", "Full stance."],
    ["Oak-Aged", "+25% DEF, +10% max HP", "Seasoned."],
    ["Cask Strength", "Active: +100% DEF 3 turns, reflect 40%", "Undiluted."],
    ["Imperial Stout", "+20% HP regen", "Heavy and healing."],
    ["Barleywine", "At HP<30%, +50% DEF, heal 5%/turn", "Survive."],
    ["LAST BARREL", "KEYSTONE: Revive once at 30% HP. -30% ATK.", "One more barrel."],
  ]),
  // BREWER - Foam
  foam: makeTree("fm", [
    ["Head Form", "+5% dodge", "Crown of foam."],
    ["Lacing", "+5% enemy miss", "Slippery glass."],
    ["Foam Toss", "Active: Blind enemy 2 turns", "In their eyes."],
    ["Carbonation", "+2 SPD", "Effervescent."],
    ["Nitro Pour", "+15% dodge, +10% crit dodging", "Silky cascade."],
    ["Beer Shower", "Active: AoE 80% ATK, 20% stun", "Celebration."],
    ["Cloud Cover", "-15% enemy accuracy", "Where did you go?"],
    ["Krausen Storm", "After dodge, next crit", "Fermentation peaks."],
    ["FOAM GHOST", "KEYSTONE: 50% dodge. HP capped 50%.", "Can't hit what isn't there."],
  ]),

  // VINTNER - Tannin
  tannin: makeTree("tn", [
    ["Dry Finish", "+4 magic dmg", "Mouth puckers."],
    ["Astringent", "+5% status chance", "Cutting edge."],
    ["Tannin Curse", "Active: -30% DEF 3 turns", "They wither."],
    ["Bold Body", "+10% magic dmg", "Deep, unrelenting."],
    ["Cabernet Strike", "Cursed enemies +25% dmg taken", "Weakened prey."],
    ["Decanter Blast", "Active: 180% magic dmg, all curses", "Full pour."],
    ["Dry Cellar", "+1 turn on all debuffs", "Curses linger."],
    ["Terroir", "+10% crit per curse", "Land shapes drink."],
    ["CORKED", "KEYSTONE: Curses spread to defenders. -25% HP.", "Whole bottle ruined."],
  ]),
  // VINTNER - Vintage
  vintage: makeTree("vn", [
    ["Aging", "+1% ATK/min in battle", "Time improves it."],
    ["Cellar", "+5% crit", "Quiet, dark."],
    ["Slow Pour", "Active: Skip turn, +50% next", "Let it breathe."],
    ["Old Vines", "+3% stats per 10 levels", "Rooted in time."],
    ["Reserve", "Store 3 turn bonuses", "Special occasions."],
    ["Grand Cru", "Active: Unleash all Reserve", "All at once."],
    ["Oxidation", "Each turn +2% crit (resets)", "Slowly..."],
    ["First Growth", "Reserve unlimited", "No ceiling."],
    ["1945 BORDEAUX", "KEYSTONE: First attack 10x dmg. Once/battle.", "A vintage unmatched."],
  ]),
  // VINTNER - Aeration
  aeration: makeTree("ar", [
    ["Breathe", "+10% heals received", "Flavors open."],
    ["Swirl", "+5% all stats 1 turn on skill", "Circular motion."],
    ["Decant", "Active: Heal 30% + cleanse", "Pour out bad."],
    ["Open Notes", "+10% buff duration", "Extended finish."],
    ["Bouquet", "Heals also +10% ATK 3 turns", "Heal to power."],
    ["Sommelier's Gift", "Active: Heal allies 25%", "Pour for table."],
    ["Pairing", "Allies +15% all stats", "Food and wine."],
    ["Perfect Pour", "Heals +50%", "Nothing wasted."],
    ["ETERNAL CELLAR", "KEYSTONE: Heal 3% HP/turn. Max 100% ATK.", "Healer first."],
  ]),

  // SHAKER - Shaken
  shaken: makeTree("sh", [
    ["Ice Snap", "+4 cold dmg", "Crisp, sharp."],
    ["Vigorous", "+8% atk speed", "Shake hard."],
    ["Cocktail Shake", "Active: 3 hits at 60% ATK", "Bang bang bang."],
    ["Frost Strain", "5% freeze chance", "Cold as crystal."],
    ["Double Shake", "Multi-hits +30% crit", "Chill twice."],
    ["Flaming Shot", "Active: 200% ATK + burn", "Fire over ice."],
    ["Dry Shake", "+20% skill dmg", "Pure impact."],
    ["Hard Shake", "Bursts ignore 30% DEF", "Cuts through."],
    ["MOLOTOV", "KEYSTONE: AoE everything. -40% single target.", "Everyone gets some."],
  ]),
  // SHAKER - Stirred
  stirred: makeTree("st", [
    ["Steady Hand", "+5% crit", "Zero wobble."],
    ["Bar Spoon", "+3 ATK, +3 SPD", "Twirl intent."],
    ["Martini Strike", "Active: Guaranteed crit 130%", "Clean, lethal."],
    ["Dilution", "+5% crit dmg", "Melt adds depth."],
    ["Proper Dilution", "Crits deal 2.5x not 1.8x", "Balance."],
    ["Old Fashioned", "Active: 3-turn charge, massive crit", "Timeless."],
    ["Rinse", "After crit +10% ATK next", "Echoes."],
    ["Perfect Build", "+15% crit per unused turn", "Patience pays."],
    ["NEGRONI", "KEYSTONE: Every 3rd attack crits. Non-crits -50%.", "Bitter. Sweet. Final."],
  ]),
  // SHAKER - Garnish
  garnish: makeTree("gn", [
    ["Lemon Twist", "+5% luck", "Little flair."],
    ["Sugar Rim", "+10% gold", "Sweet touch."],
    ["Flair Show", "Active: Enemy miss + your crit", "Distract."],
    ["Herb Sprig", "Heal 2% on skill use", "Aromatic."],
    ["Presentation", "Skills buff you +15%", "Look good."],
    ["Dealer's Choice", "Active: Random major effect", "Trust the bar."],
    ["Signature Drink", "Cooldowns -15%", "Know your craft."],
    ["Tip Jar", "+25% gold, +10% XP", "They love you."],
    ["MASTER MIXOLOGIST", "KEYSTONE: All 3 skills per turn. Cooldowns 2x.", "Full kit, always."],
  ]),

  // ORCHARDIST - Orchard
  orchard: makeTree("or", [
    ["Apple Seed", "+6 HP", "Growth from nothing."],
    ["Morning Dew", "Heal 1% HP/turn", "Gentle renewal."],
    ["Cider Tonic", "Active: Heal 40% HP", "Sweet recovery."],
    ["Sapling", "+15 HP", "Growing strong."],
    ["Fruit Tree", "Heals +30%", "Bountiful."],
    ["Harvest Feast", "Active: Heal + cleanse + buff", "Everything at once."],
    ["Pollinate", "Heals allies 15%", "Spread love."],
    ["Full Grove", "Regen +100%", "Wait, grow."],
    ["WORLD TREE", "KEYSTONE: 5% HP/turn. Cannot crit.", "Endurance over impact."],
  ]),
  // ORCHARDIST - Ferment
  ferment: makeTree("fe", [
    ["Yeast Spores", "+3 DoT dmg", "Start of something."],
    ["Sugar Feed", "+1 turn DoT", "Keep it going."],
    ["Fermenting Rot", "Active: 5% HP/turn for 5 turns", "It spreads."],
    ["Wild Yeast", "DoTs 20% spread", "Uncontrolled."],
    ["Sour Mash", "DoT enemies -25% DEF", "They crumble."],
    ["Funk", "Active: Apply all DoTs stacking", "The funk."],
    ["Barrel Age", "DoTs +25% dmg", "Time deepens."],
    ["Brettanomyces", "DoTs last forever until dead", "Finds a way."],
    ["PLAGUE CIDER", "KEYSTONE: All attacks DoT. Direct halved.", "Slow death."],
  ]),
  // ORCHARDIST - Harvest
  harvest: makeTree("hr", [
    ["Hardy Root", "-5% dmg taken", "Deep anchor."],
    ["Stored Grain", "+10 HP", "For winter."],
    ["Root Shield", "Active: Immune DoT 3 turns", "Plant yourself."],
    ["Preserves", "+3 potion slots", "For later."],
    ["Stockpile", "+20% HP each battle start", "Prepared."],
    ["Harvest Moon", "Active: +50% HP + cleanse + 3t immune", "Full moon."],
    ["Root Cellar", "Potions +50%", "Stored strong."],
    ["Farmer's Luck", "50% negate killing blow", "Land provides."],
    ["ETERNAL HARVEST", "KEYSTONE: Revive 1/day full HP. -50% gold.", "Land always returns."],
  ]),

  // DRIFTER - Indica
  indica: makeTree("in", [
    ["Body Buzz", "-3% enemy SPD", "Heavy limbs."],
    ["Couch Lock", "+5% stun", "Can't get up."],
    ["Slow Sedation", "Active: -50% SPD 3 turns", "Softens."],
    ["Kush Cloud", "+10% debuff duration", "Lingers."],
    ["Muscle Relax", "Slowed +20% dmg", "Sitting ducks."],
    ["Purple Haze", "Active: AoE skip turn 50%", "Heavy vibes."],
    ["Grandaddy Purp", "Stunned can't regen", "Lockout."],
    ["Deep Couch", "Slowed -30% ATK", "Can't lift glass."],
    ["COUCH LOCKED", "KEYSTONE: All enemies slowed. You -50% SPD.", "Nobody moves."],
  ]),
  // DRIFTER - Sativa
  sativa: makeTree("sa", [
    ["Head High", "+4 SPD", "Lifted."],
    ["Focus", "+5% crit", "Surprisingly sharp."],
    ["Creative Burst", "Active: +100% SPD/crit 2 turns", "Ideas flow."],
    ["Giggly", "+15% luck", "Everything funnier."],
    ["Pure Energy", "+25% dodge on high SPD", "Too quick."],
    ["Rocket Fuel", "Active: Attack 3x, -50% DEF", "No brakes."],
    ["Sour Diesel", "First hit each battle crits", "Fast start."],
    ["Motivated", "Cooldowns -1 per kill", "Chain energy."],
    ["HIGHER GROUND", "KEYSTONE: +100% SPD. No rest turns.", "Always forward."],
  ]),
  // DRIFTER - Hybrid
  hybrid: makeTree("hy", [
    ["Blend", "+2 all stats", "Bit of everything."],
    ["Tolerance", "-10% dmg taken", "Built up."],
    ["Balance", "Active: Swap HP% with enemy", "Equalizer."],
    ["Terpene Profile", "+5% random bonuses", "Nuanced."],
    ["Entourage", "Cooldowns -20%", "Synergy."],
    ["Chaos Blend", "Active: Random effect any tree", "Anything happens."],
    ["Adaptive", "Resist last element", "Learn the drink."],
    ["Full Spectrum", "+1 to other trees effects", "Everything works."],
    ["ENLIGHTENMENT", "KEYSTONE: Random keystone per battle.", "You are the drink."],
  ]),
};

// ═══════════════ BARS ═══════════════
const BAR_TYPES = [
  { type: "dive", name: "Dive Bar", icon: "🍺", color: "#8B4513", mult: 0.9 },
  { type: "pub", name: "Irish Pub", icon: "☘️", color: "#228B22", mult: 1.0 },
  { type: "sports", name: "Sports Bar", icon: "🏈", color: "#2563eb", mult: 1.0 },
  { type: "cocktail", name: "Cocktail Lounge", icon: "🍸", color: "#8338ec", mult: 1.3 },
  { type: "wine", name: "Wine Bar", icon: "🍷", color: "#722f37", mult: 1.3 },
  { type: "brewery", name: "Craft Brewery", icon: "🍻", color: "#DAA520", mult: 1.5 },
  { type: "nightclub", name: "Nightclub", icon: "🪩", color: "#ff006e", mult: 2.0 },
];

// Bar "personalities" — fixed traits, scale with player
const BARS = [
  { id: 1, name: "The Rusty Nail", type: "dive", rating: 3.2, boss: { n: "One-Eyed Pete", i: "🏴‍☠️", l: "You don't belong here." }, atkMod: 1.1, defMod: 0.8 },
  { id: 2, name: "Murphy's Pub", type: "pub", rating: 4.2, boss: { n: "Old Murphy", i: "🍀", l: "Sláinte, then trouble." }, atkMod: 1.0, defMod: 1.1 },
  { id: 3, name: "Fourth & Goal", type: "sports", rating: 4.1, boss: { n: "Big Mike", i: "🏈", l: "Defense wins!" }, atkMod: 1.0, defMod: 1.0 },
  { id: 4, name: "The Velvet Sour", type: "cocktail", rating: 4.6, boss: { n: "Madame Absinthe", i: "🧪", l: "One sip changes everything." }, atkMod: 1.3, defMod: 0.9 },
  { id: 5, name: "Corkscrew", type: "wine", rating: 4.7, boss: { n: "Sommelier Sebastien", i: "🎩", l: "Your palate disappoints." }, atkMod: 1.2, defMod: 1.0 },
  { id: 6, name: "Hopscotch Brewing", type: "brewery", rating: 4.8, boss: { n: "The Brewmaster", i: "⚗️", l: "You haven't earned your hops." }, atkMod: 1.1, defMod: 1.2 },
  { id: 7, name: "Club Neon", type: "nightclub", rating: 4.3, boss: { n: "DJ Havoc", i: "🎧", l: "Drop the beat and your HP." }, atkMod: 1.4, defMod: 0.9 },
];

// ═══════════════ PROCEDURAL ROOM GENERATION ═══════════════
const ROOMS_BY_TYPE = {
  dive: [
    { name: "Sticky Floor", modifier: "Enemies -10% SPD", enemies: 1, icon: "🍺" },
    { name: "Dart Corner", modifier: "+15% crit for everyone", enemies: 2, icon: "🎯" },
    { name: "Pool Table", modifier: "Random knockback", enemies: 2, icon: "🎱" },
    { name: "Bathroom Brawl", modifier: "Tight space, +20% dmg all", enemies: 1, icon: "🚽" },
    { name: "Back Alley", modifier: "Surprise attack advantage", enemies: 3, icon: "🗑️" },
    { name: "Boss: Main Bar", modifier: "All-out final fight", enemies: 0, boss: true, icon: "💀" },
  ],
  pub: [
    { name: "Snug", modifier: "Cramped, +15% dmg", enemies: 1, icon: "🪑" },
    { name: "Fireplace", modifier: "Warm buffs, +10% HP", enemies: 2, icon: "🔥" },
    { name: "Dart Board", modifier: "Precision zone, +20% crit", enemies: 2, icon: "🎯" },
    { name: "Trad Music Corner", modifier: "Rhythm-based bonus", enemies: 2, icon: "🎻" },
    { name: "Boss: The Bar", modifier: "Showdown at the bar", enemies: 0, boss: true, icon: "💀" },
  ],
  sports: [
    { name: "TV Corner", modifier: "Distracted enemies -10% acc", enemies: 2, icon: "📺" },
    { name: "Wing Station", modifier: "Greasy floor, -5% SPD all", enemies: 2, icon: "🍗" },
    { name: "Bar", modifier: "Crowded, AoE bonus", enemies: 3, icon: "🍻" },
    { name: "Patio", modifier: "Open space, +10% SPD", enemies: 2, icon: "☀️" },
    { name: "Boss: Owner's Booth", modifier: "Boss has entourage", enemies: 0, boss: true, icon: "💀" },
  ],
  cocktail: [
    { name: "Main Bar", modifier: "Status effects +1 turn", enemies: 2, icon: "🍸" },
    { name: "Speakeasy Room", modifier: "Hidden bonuses random", enemies: 2, icon: "🚪" },
    { name: "Tasting Corner", modifier: "Debuffs +25% effect", enemies: 1, icon: "🥃" },
    { name: "VIP Booth", modifier: "Elite enemies, better loot", enemies: 2, icon: "💎" },
    { name: "Boss: The Lounge", modifier: "Boss crafts drinks mid-fight", enemies: 0, boss: true, icon: "💀" },
  ],
  wine: [
    { name: "Tasting Bar", modifier: "Slow turns, +20% skill dmg", enemies: 2, icon: "🍷" },
    { name: "Cellar", modifier: "Dark, -10% acc for all", enemies: 2, icon: "🕯️" },
    { name: "Reserve Vault", modifier: "Buffs last +2 turns", enemies: 1, icon: "🔐" },
    { name: "Boss: Grand Cellar", modifier: "Aged boss, scales with turns", enemies: 0, boss: true, icon: "💀" },
  ],
  brewery: [
    { name: "Taproom", modifier: "Sample enemies, many regulars", enemies: 3, icon: "🍺" },
    { name: "Brewing Floor", modifier: "Hot + humid, -5% DEF all", enemies: 2, icon: "🌡️" },
    { name: "Cold Storage", modifier: "Cold slows, +10% SPD for movers", enemies: 2, icon: "❄️" },
    { name: "Barrel Room", modifier: "Stacked barrels, cover", enemies: 2, icon: "🛢️" },
    { name: "Bottling Line", modifier: "Conveyor moves all", enemies: 2, icon: "⚙️" },
    { name: "Boss: Brewmaster's Office", modifier: "Boss + 2 senior brewers", enemies: 0, boss: true, icon: "💀" },
  ],
  nightclub: [
    { name: "Entry Line", modifier: "Bouncer enemies", enemies: 2, icon: "🚪" },
    { name: "Dance Floor", modifier: "Strobe, random miss chance", enemies: 3, icon: "🪩" },
    { name: "Bar", modifier: "Loud, skills cost +1 turn", enemies: 2, icon: "🍾" },
    { name: "VIP Section", modifier: "High-level defenders", enemies: 2, icon: "💎" },
    { name: "Bathroom Fight", modifier: "Tight, no dodge", enemies: 1, icon: "🚽" },
    { name: "DJ Booth", modifier: "Bass waves, rhythm matters", enemies: 2, icon: "🎧" },
    { name: "Boss: DJ Booth Top", modifier: "Boss drops beats (AoE)", enemies: 0, boss: true, icon: "💀" },
  ],
};

// Procedurally generate a bar's rooms for the day
function generateBarRun(bar, charLevel, seed) {
  const allRooms = ROOMS_BY_TYPE[bar.type] || ROOMS_BY_TYPE.dive;
  const normalRooms = allRooms.filter(r => !r.boss);
  const bossRoom = allRooms.find(r => r.boss);
  // Pick 3-5 normal rooms pseudorandomly based on seed
  const numRooms = 3 + (seed % 3);
  const shuffled = [...normalRooms].sort(() => ((seed * 9301 + 49297) % 233280) / 233280 - 0.5);
  const picked = shuffled.slice(0, Math.min(numRooms, normalRooms.length));
  return [...picked, bossRoom];
}

// Scale enemy stats to player level with bar personality modifiers
function scaleEnemy(charLevel, bar, isBoss, barRoom) {
  const basePower = Math.max(1, charLevel - 2 + Math.floor(Math.random() * 5));
  const hp = Math.floor((isBoss ? 300 : 60) + basePower * (isBoss ? 35 : 12));
  const atk = Math.floor((isBoss ? 14 : 6) + basePower * (isBoss ? 1.2 : 0.7) * bar.atkMod);
  const def = Math.floor((isBoss ? 8 : 4) + basePower * (isBoss ? 0.5 : 0.3) * bar.defMod);
  return { hp, maxHp: hp, atk, def, level: basePower };
}

// ═══════════════ CONSUMABLES ═══════════════
const CONSUMABLES = [
  { id: "hp_small", name: "Small Brew", icon: "🥃", type: "heal", effect: "Heal 30% HP", rarity: "common" },
  { id: "hp_large", name: "House Special", icon: "🍹", type: "heal", effect: "Heal 70% HP", rarity: "uncommon" },
  { id: "atk_buff", name: "Shot of Courage", icon: "🔥", type: "buff", effect: "+40% ATK 3 turns", rarity: "uncommon" },
  { id: "def_buff", name: "Iron Tonic", icon: "🛡️", type: "buff", effect: "+50% DEF 3 turns", rarity: "uncommon" },
  { id: "revive", name: "Emergency Elixir", icon: "💎", type: "revive", effect: "Revive at 50% HP", rarity: "rare" },
  { id: "crit_buff", name: "Focus Vial", icon: "🎯", type: "buff", effect: "+30% crit 3 turns", rarity: "rare" },
];

// ═══════════════ HELPERS ═══════════════
function Card({ children, glow, gc = T.accent, style = {} }) {
  return <div style={{ background: T.card, border: `1px solid ${glow ? gc + "44" : T.border}`, borderRadius: 14, padding: 16, boxShadow: glow ? `0 0 24px ${gc}15` : `0 2px 12px rgba(0,0,0,0.3)`, ...style }}>{children}</div>;
}
function Btn({ children, onClick, color = T.accent, disabled, small, style = {} }) {
  const [h, setH] = useState(false);
  return <button onClick={disabled ? undefined : onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{ padding: small ? "5px 12px" : "9px 20px", fontSize: small ? 11 : 13, background: disabled ? T.faint : h ? color : `${color}18`, color: disabled ? T.dim : h ? T.bg : color, border: `1px solid ${disabled ? T.faint : color}`, borderRadius: 10, cursor: disabled ? "not-allowed" : "pointer", fontWeight: 700, letterSpacing: 0.4, transition: "all 0.2s", textTransform: "uppercase", whiteSpace: "nowrap", ...style }}>{children}</button>;
}
function Pill({ children, color = T.accent }) {
  return <span style={{ fontSize: 9, padding: "2px 8px", background: `${color}15`, border: `1px solid ${color}33`, borderRadius: 20, color, fontWeight: 600, whiteSpace: "nowrap" }}>{children}</span>;
}
function HP({ c, m, color, label, h = 8 }) {
  const p = Math.max(0, Math.min(100, (c / m) * 100));
  return <div style={{ width: "100%" }}>{label && <div style={{ fontSize: 10, color: T.dim, marginBottom: 2, display: "flex", justifyContent: "space-between" }}><span>{label}</span><span style={{ fontFamily: "monospace" }}>{c}/{m}</span></div>}<div style={{ width: "100%", height: h, background: T.faint, borderRadius: h, overflow: "hidden" }}><div style={{ width: `${p}%`, height: "100%", background: `linear-gradient(90deg,${color},${color}cc)`, borderRadius: h, transition: "width 0.4s", boxShadow: `0 0 6px ${color}44` }} /></div></div>;
}

// ═══════════════ SKILL TREE VIEWER ═══════════════
function SkillTreeView({ char, classData, allocated, onToggle }) {
  const [activeTree, setActiveTree] = useState(classData.trees[0]);
  const pointsSpent = allocated.length;
  const maxPoints = char.level;
  const pointsLeft = maxPoints - pointsSpent;
  const nodes = TREES[activeTree] || [];
  const [hover, setHover] = useState(null);

  function canAllocate(node) {
    if (allocated.includes(node.id)) return true;
    if (pointsLeft <= 0) return false;
    if (!node.req) return true;
    return node.req.some(r => allocated.includes(r));
  }

  const hoveredNode = nodes.find(n => n.id === hover);

  return (
    <div style={{ padding: 16 }}>
      <Card glow gc={classData.color} style={{ marginBottom: 12, padding: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 20 }}>{classData.icon}</span>
            <div><div style={{ fontSize: 12, fontWeight: 800 }}>{classData.name}</div><div style={{ fontSize: 10, color: classData.color }}>Lv.{char.level}</div></div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 9, color: T.dim }}>Skill Points</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: pointsLeft > 0 ? T.gold : T.dim, fontFamily: "monospace" }}>{pointsLeft}/{maxPoints}</div>
          </div>
        </div>
      </Card>

      <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
        {classData.trees.map(t => {
          const count = (TREES[t] || []).filter(n => allocated.includes(n.id)).length;
          return (
            <button key={t} onClick={() => setActiveTree(t)} style={{
              flex: 1, padding: "6px 3px", fontSize: 9, fontWeight: 700,
              background: activeTree === t ? classData.color + "22" : T.bg2,
              color: activeTree === t ? classData.color : T.dim,
              border: `1px solid ${activeTree === t ? classData.color + "66" : T.border}`,
              borderRadius: 8, cursor: "pointer", textTransform: "uppercase", letterSpacing: 0.3,
            }}>{classData.treeNames[t]}<br/><span style={{ fontSize: 9, opacity: 0.7 }}>{count}/{(TREES[t] || []).length}</span></button>
          );
        })}
      </div>

      <div style={{ position: "relative", width: "100%", height: 560, background: T.bg2, borderRadius: 12, overflow: "hidden", border: `1px solid ${T.border}` }}>
        <svg viewBox="0 0 220 580" style={{ width: "100%", height: "100%" }}>
          {nodes.map(node => (node.req || []).map(rid => {
            const pNode = nodes.find(n => n.id === rid);
            if (!pNode) return null;
            const active = allocated.includes(node.id) && allocated.includes(rid);
            const avail = allocated.includes(rid) && !allocated.includes(node.id);
            return <line key={`${rid}-${node.id}`} x1={pNode.x} y1={pNode.y} x2={node.x} y2={node.y} stroke={active ? classData.color : avail ? "#444" : "#222"} strokeWidth={active ? 2.5 : 1.5} strokeDasharray={avail ? "4 3" : "none"} />;
          }))}
          {nodes.map(node => {
            const isAlloc = allocated.includes(node.id);
            const canAlloc = canAllocate(node);
            const size = node.type === "keystone" ? 34 : node.type === "notable" ? 26 : node.type === "active" ? 28 : 18;
            const color = isAlloc ? classData.color : canAlloc ? NODE_COLORS[node.type] : "#2a2a3a";
            return (
              <g key={node.id} style={{ cursor: canAlloc || isAlloc ? "pointer" : "default" }} onClick={() => (canAlloc || isAlloc) && onToggle(node)} onMouseEnter={() => setHover(node.id)} onMouseLeave={() => setHover(null)}>
                {node.type === "keystone" && <polygon points={`${node.x},${node.y - size/2} ${node.x + size/2},${node.y} ${node.x},${node.y + size/2} ${node.x - size/2},${node.y}`} fill={isAlloc ? color : T.bg} stroke={color} strokeWidth={3} style={{ filter: isAlloc ? `drop-shadow(0 0 8px ${color})` : "none" }} />}
                {node.type === "active" && <rect x={node.x - size/2} y={node.y - size/2} width={size} height={size} rx={4} fill={isAlloc ? color : T.bg} stroke={color} strokeWidth={2.5} style={{ filter: isAlloc ? `drop-shadow(0 0 6px ${color})` : "none" }} />}
                {(node.type === "notable" || node.type === "small") && <circle cx={node.x} cy={node.y} r={size/2} fill={isAlloc ? color : T.bg} stroke={color} strokeWidth={node.type === "notable" ? 2.5 : 1.5} style={{ filter: isAlloc ? `drop-shadow(0 0 6px ${color})` : "none" }} />}
                <text x={node.x} y={node.y + 3} textAnchor="middle" fontSize={node.type === "small" ? 9 : 11} fill={isAlloc ? T.bg : color} fontWeight={700}>{node.type === "keystone" ? "★" : node.type === "active" ? "⚔" : node.type === "notable" ? "●" : "+"}</text>
              </g>
            );
          })}
        </svg>
        {hoveredNode && (
          <div style={{ position: "absolute", left: 8, bottom: 8, right: 8, background: T.card, border: `1px solid ${NODE_COLORS[hoveredNode.type]}66`, borderRadius: 10, padding: 8, fontSize: 10, pointerEvents: "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
              <span style={{ fontWeight: 800, color: NODE_COLORS[hoveredNode.type], fontSize: 11 }}>{hoveredNode.name}</span>
              <Pill color={NODE_COLORS[hoveredNode.type]}>{hoveredNode.type}</Pill>
            </div>
            <div style={{ color: T.text }}>{hoveredNode.effect}</div>
            <div style={{ color: T.dim, fontStyle: "italic", fontSize: 9, marginTop: 2 }}>"{hoveredNode.desc}"</div>
          </div>
        )}
      </div>

      <Card style={{ marginTop: 10, padding: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, fontSize: 10, color: T.dim }}>
          <div><span style={{ color: NODE_COLORS.small }}>+</span> <b>Small:</b> minor stat</div>
          <div><span style={{ color: NODE_COLORS.active }}>⚔</span> <b>Active:</b> usable skill</div>
          <div><span style={{ color: NODE_COLORS.notable }}>●</span> <b>Notable:</b> build-defining</div>
          <div><span style={{ color: NODE_COLORS.keystone }}>★</span> <b>Keystone:</b> game-changer</div>
        </div>
      </Card>
    </div>
  );
}

// ═══════════════ RHYTHM COMBAT ═══════════════
function RhythmPrompt({ onResult, active }) {
  const [phase, setPhase] = useState("wait");
  const [pos, setPos] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!active) return;
    setPhase("active");
    setPos(0);
    const start = Date.now();
    const duration = 1200;
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const p = (elapsed / duration) * 100;
      if (p >= 100) {
        clearInterval(timerRef.current);
        setPhase("done");
        onResult("miss");
      } else {
        setPos(p);
      }
    }, 16);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [active]);

  function hit() {
    if (phase !== "active") return;
    clearInterval(timerRef.current);
    const dist = Math.abs(pos - 50);
    const result = dist < 8 ? "perfect" : dist < 20 ? "good" : "ok";
    setPhase("done");
    onResult(result);
  }

  if (!active) return null;
  return (
    <div style={{ padding: 8, background: T.bg2, borderRadius: 8, marginBottom: 8 }}>
      <div style={{ fontSize: 10, color: T.dim, textAlign: "center", marginBottom: 4 }}>TAP WHEN IN THE GREEN ZONE!</div>
      <div style={{ position: "relative", height: 24, background: T.bg, borderRadius: 12, overflow: "hidden", border: `1px solid ${T.border}` }}>
        <div style={{ position: "absolute", left: "40%", width: "20%", height: "100%", background: T.success + "33", borderLeft: `2px solid ${T.success}`, borderRight: `2px solid ${T.success}` }} />
        <div style={{ position: "absolute", left: "47%", width: "6%", height: "100%", background: T.gold + "55" }} />
        <div style={{ position: "absolute", left: `${pos}%`, top: 0, width: 3, height: "100%", background: T.accent, boxShadow: `0 0 8px ${T.accent}` }} />
      </div>
      <button onClick={hit} style={{ width: "100%", marginTop: 6, padding: "10px", background: T.accent, color: T.bg, border: "none", borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: "pointer" }}>TAP!</button>
    </div>
  );
}

// ═══════════════ BATTLE ═══════════════
function BattleScreen({ char, classData, bar, rooms, allocated, onWin, onLose, onFlee }) {
  const bt = BAR_TYPES.find(b => b.type === bar.type);
  const [roomIdx, setRoomIdx] = useState(0);
  const [enemies, setEnemies] = useState(null);
  const [enemyIdx, setEnemyIdx] = useState(0);
  const [pHp, setPHp] = useState(classData.base.hp + char.level * 6);
  const [pMax] = useState(classData.base.hp + char.level * 6);
  const [log, setLog] = useState([]);
  const [turn, setTurn] = useState("player");
  const [phase, setPhase] = useState("fight");
  const [rhythmActive, setRhythmActive] = useState(false);
  const [pendingSkillIdx, setPendingSkillIdx] = useState(null);
  const logRef = useRef(null);

  const currentRoom = rooms[roomIdx];

  // Initialize enemies when room changes
  useEffect(() => {
    if (!currentRoom) return;
    const newEnemies = [];
    if (currentRoom.boss) {
      const b = scaleEnemy(char.level, bar, true, currentRoom);
      newEnemies.push({ ...b, name: bar.boss.n, icon: bar.boss.i, type: "boss" });
    } else {
      for (let i = 0; i < currentRoom.enemies; i++) {
        const e = scaleEnemy(char.level, bar, false, currentRoom);
        newEnemies.push({ ...e, name: `Regular ${i + 1}`, icon: "🍺", type: "reg" });
      }
    }
    setEnemies(newEnemies);
    setEnemyIdx(0);
    setLog(prev => [...prev, `═══ ${currentRoom.icon} ${currentRoom.name} ═══`, `💫 ${currentRoom.modifier}`]);
  }, [roomIdx]);

  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [log]);

  if (!enemies || enemies.length === 0) return null;
  const cur = enemies[enemyIdx];
  const add = m => setLog(p => [...p, m]);

  // Active skills from tree
  const activeSkills = allocated.map(id => Object.values(TREES).flat().find(n => n.id === id)).filter(n => n && n.type === "active").slice(0, 3);
  // Fallback skills if no actives allocated
  const skillsToUse = activeSkills.length >= 3 ? activeSkills.slice(0, 3) : [
    ...activeSkills,
    ...Array.from({ length: 3 - activeSkills.length }, (_, i) => ({ name: ["Basic Attack", "Heavy Strike", "Wild Swing"][i], effect: "100% ATK" })),
  ];

  function startAttack(idx) {
    if (turn !== "player" || phase !== "fight") return;
    setPendingSkillIdx(idx);
    setRhythmActive(true);
  }

  function onRhythmResult(result) {
    setRhythmActive(false);
    const skill = skillsToUse[pendingSkillIdx];
    const base = classData.base.atk + char.level * 2;
    const mult = { perfect: 2.0, good: 1.5, ok: 1.0, miss: 0.5 }[result];
    const crit = Math.random() < (classData.base.luck / 80);
    let dmg = Math.max(1, Math.floor(base * 1.2 * mult + Math.random() * 6 - 3 - (cur.type === "boss" ? cur.def : cur.def * 0.8)));
    if (crit) dmg = Math.floor(dmg * 1.8);
    const rhythmText = { perfect: " 🎯PERFECT!", good: " ✓Good", ok: " ·ok", miss: " ✗miss" }[result];
    const newHp = Math.max(0, cur.hp - dmg);
    setEnemies(enemies.map((e, i) => i === enemyIdx ? { ...e, hp: newHp } : e));
    add(`⚔️ ${skill.name}!${rhythmText}${crit ? " 💥CRIT!" : ""} ${dmg} dmg`);

    setPendingSkillIdx(null);
    if (newHp <= 0) {
      add(`✅ ${cur.name} down!`);
      if (cur.type === "boss") {
        add(`🏆🏆 ${bar.boss.n} DEFEATED! ${bar.name} conquered!`);
        setPhase("victory");
        return;
      }
      const nextE = enemyIdx + 1;
      if (nextE < enemies.length) {
        setTimeout(() => { setEnemyIdx(nextE); setTurn("player"); add(`${enemies[nextE].icon} ${enemies[nextE].name} steps up!`); }, 600);
      } else {
        // Room cleared, advance
        setTimeout(() => {
          if (roomIdx + 1 < rooms.length) {
            setRoomIdx(roomIdx + 1);
            add(`🚪 Moving to next room...`);
            setTurn("player");
          } else {
            setPhase("victory");
          }
        }, 800);
      }
      return;
    }
    setTurn("enemy");
    setTimeout(() => enemyTurn(newHp), 700);
  }

  function enemyTurn(curEHp) {
    if ((curEHp ?? cur.hp) <= 0) return;
    const dmg = Math.max(1, Math.floor(cur.atk + Math.random() * 4 - classData.base.def * 0.5));
    const np = Math.max(0, pHp - dmg);
    setPHp(np);
    add(`💢 ${cur.name} hits you for ${dmg}!`);
    if (np <= 0) { add("💀 Defeated..."); setPhase("defeat"); return; }
    setTurn("player");
  }

  return (
    <div style={{ padding: 16, maxWidth: 550, margin: "0 auto" }}>
      {/* Room progress */}
      <Card style={{ marginBottom: 8, padding: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <span style={{ fontSize: 10, color: T.dim }}>Room {roomIdx + 1} / {rooms.length}</span>
          <span style={{ fontSize: 10, color: bt.color }}>{bt.icon} {bar.name}</span>
        </div>
        <div style={{ display: "flex", gap: 3 }}>
          {rooms.map((r, i) => (
            <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < roomIdx ? T.success : i === roomIdx ? T.accent : T.faint }} />
          ))}
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.text, marginTop: 6 }}>{currentRoom?.icon} {currentRoom?.name}</div>
        <div style={{ fontSize: 10, color: T.dim, fontStyle: "italic" }}>{currentRoom?.modifier}</div>
      </Card>

      {/* Enemy */}
      <Card glow gc={cur.type === "boss" ? T.danger : bt.color} style={{ marginBottom: 8, textAlign: "center", padding: 12 }}>
        <div style={{ fontSize: 9, color: T.dim, textTransform: "uppercase", letterSpacing: 2 }}>{cur.type === "boss" ? "⚠️ BOSS" : "Regular"}</div>
        <div style={{ fontSize: cur.type === "boss" ? 40 : 30 }}>{cur.icon}</div>
        <div style={{ fontSize: 14, fontWeight: 800 }}>{cur.name}</div>
        {cur.type === "boss" && <div style={{ fontSize: 9, color: T.dim, fontStyle: "italic" }}>"{bar.boss.l}"</div>}
        <HP c={cur.hp} m={cur.maxHp} color={cur.type === "boss" ? T.danger : T.hp} label="HP" />
      </Card>

      {/* Log */}
      <div ref={logRef} style={{ height: 70, overflowY: "auto", background: T.bg, borderRadius: 8, padding: 6, marginBottom: 8, border: `1px solid ${T.border}` }}>
        {log.slice(-15).map((l, i) => <div key={i} style={{ fontSize: 10, color: i === 14 || i === log.slice(-15).length - 1 ? T.text : T.dim, fontFamily: "monospace", lineHeight: 1.4 }}>{l}</div>)}
      </div>

      {/* Rhythm bar */}
      <RhythmPrompt onResult={onRhythmResult} active={rhythmActive} />

      {/* Player */}
      <Card style={{ padding: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <div style={{ fontSize: 22 }}>{classData.icon}</div>
          <div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 800 }}>{char.name} <span style={{ color: T.dim, fontSize: 10 }}>Lv.{char.level}</span></div><HP c={pHp} m={pMax} color={T.success} label="HP" /></div>
        </div>
        {phase === "fight" && !rhythmActive && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 5 }}>
            {skillsToUse.map((s, i) => <Btn key={i} small onClick={() => startAttack(i)} disabled={turn !== "player"} color={[T.accent, T.shield, T.gold][i]}>{s.name}</Btn>)}
          </div>
        )}
        {phase === "victory" && <div style={{ textAlign: "center" }}><div style={{ fontSize: 24 }}>🏆</div><div style={{ fontSize: 16, fontWeight: 800, color: T.gold }}>VICTORY!</div><Btn onClick={onWin} color={T.gold} style={{ marginTop: 8 }}>Claim Rewards</Btn></div>}
        {phase === "defeat" && <div style={{ textAlign: "center" }}><div style={{ fontSize: 24 }}>💀</div><div style={{ fontSize: 16, fontWeight: 800, color: T.danger }}>DEFEATED</div><Btn onClick={onLose} color={T.danger} style={{ marginTop: 8 }}>Return</Btn></div>}
      </Card>
      {phase === "fight" && <div style={{ textAlign: "center", marginTop: 6 }}><button onClick={onFlee} style={{ background: "none", border: "none", color: T.dim, fontSize: 10, cursor: "pointer", textDecoration: "underline" }}>🏃 Flee</button></div>}
    </div>
  );
}

// ═══════════════ MAP ═══════════════
function MapView({ char, classData, onFight }) {
  return (
    <div style={{ padding: 16 }}>
      <Card glow gc={classData.color} style={{ marginBottom: 12, padding: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>{classData.icon}</span>
          <div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 800 }}>Playing as {classData.name}</div><div style={{ fontSize: 10, color: classData.color }}>Lv.{char.level}</div></div>
        </div>
      </Card>
      <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Nearby Bars</h2>
      <p style={{ fontSize: 10, color: T.dim, marginBottom: 14 }}>Bars scale to your level. Layout regenerates daily.</p>
      <div style={{ display: "grid", gap: 10 }}>
        {BARS.map(bar => {
          const b = BAR_TYPES.find(x => x.type === bar.type);
          return (
            <Card key={bar.id} style={{ cursor: "pointer" }}>
              <div onClick={() => onFight(bar)}>
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: `${b.color}22`, border: `2px solid ${b.color}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{b.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontSize: 13, fontWeight: 800 }}>{bar.name}</div>
                      <Pill color={b.color}>{b.name}</Pill>
                    </div>
                    <div style={{ fontSize: 10, color: T.dim, margin: "2px 0" }}>⭐{bar.rating} · Boss: {bar.boss.i} {bar.boss.n}</div>
                    <div style={{ fontSize: 10, color: T.accent, marginTop: 2 }}>→ Scales to Lv.{char.level} · Procedurally generated rooms</div>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════ ROSTER ═══════════════
function RosterView({ roster, active, onSelect }) {
  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Roster</h2>
      <p style={{ fontSize: 11, color: T.dim, marginBottom: 16 }}>All 6 classes unlocked. Each levels separately. Shared gold.</p>
      <div style={{ display: "grid", gap: 8 }}>
        {CLASSES.map(c => {
          const char = roster[c.id];
          const isActive = active === c.id;
          return (
            <Card key={c.id} glow={isActive} gc={c.color} style={{ padding: 12 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ fontSize: 24, width: 40, height: 40, borderRadius: 10, background: `${c.color}22`, border: `2px solid ${c.color}55`, display: "flex", alignItems: "center", justifyContent: "center" }}>{c.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: c.color }}>{c.name}</div>
                    {isActive ? <Pill color={T.success}>ACTIVE</Pill> : <Btn small color={c.color} onClick={() => onSelect(c.id)}>Switch</Btn>}
                  </div>
                  <div style={{ fontSize: 10, color: T.dim }}>{c.desc}</div>
                  <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                    <Pill color={c.color}>Lv.{char.level}</Pill>
                    <Pill color={T.xp}>{char.xp} XP</Pill>
                    <Pill color={T.gold}>{char.barsWon || 0} 🏆</Pill>
                    <Pill color={T.shield}>{(char.allocated || []).length} nodes</Pill>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════ DESIGN DOC ═══════════════
function DesignView() {
  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 14 }}>v6 Design Bible</h2>
      <div style={{ display: "grid", gap: 10 }}>
        <Card><div style={{ fontSize: 13, fontWeight: 700, color: T.accent, marginBottom: 8 }}>⚔️ Combat System</div>
          <div style={{ fontSize: 11, color: T.dim, lineHeight: 1.7 }}>
            <b style={{ color: T.text }}>Turn-based + rhythm prompts.</b> Pick a skill → timing bar appears → tap in the green zone for +50% damage, gold zone for +100% (PERFECT). Miss timing = 50% damage.<br/><br/>
            <b style={{ color: T.text }}>AFK mode.</b> Same combat system, no rhythm input, auto-resolves. Used for defenders fighting offline, or when you want to play passively.<br/><br/>
            <b style={{ color: T.text }}>Same math, different surface.</b> All combat uses the same underlying damage formulas. Active play adds skill expression. Defenders fight with the same stats whether you're watching or not.
          </div>
        </Card>

        <Card><div style={{ fontSize: 13, fontWeight: 700, color: T.accent, marginBottom: 8 }}>🌳 Skill Trees (D2 + PoE Hybrid)</div>
          <div style={{ fontSize: 11, color: T.dim, lineHeight: 1.7 }}>
            <b style={{ color: T.text }}>18 trees total</b> (6 classes × 3 trees each), <b style={{ color: T.text }}>9 nodes per tree</b>, <b style={{ color: T.text }}>162 nodes across the game</b>.<br/><br/>
            Node types: <b style={{ color: NODE_COLORS.small }}>Small</b> (minor stats, starter), <b style={{ color: NODE_COLORS.notable }}>Notable</b> (build-defining cluster payoff), <b style={{ color: NODE_COLORS.active }}>Active</b> (usable skill in combat), <b style={{ color: NODE_COLORS.keystone }}>Keystone</b> (game-changing trade-offs).<br/><br/>
            Each tree follows the same shape: 2 starters → 1 active + 1 small → 1 notable → 1 active + 1 small → 1 notable → 1 keystone. Predictable structure = easier for mobile UI, no less depth.<br/><br/>
            <b style={{ color: T.gold }}>Active skills from trees become your combat buttons.</b> Allocate active nodes = unlock those as battle skills. No active nodes allocated = fall back to basic attacks.
          </div>
        </Card>

        <Card><div style={{ fontSize: 13, fontWeight: 700, color: T.accent, marginBottom: 8 }}>🏙️ Procedural Bars</div>
          <div style={{ fontSize: 11, color: T.dim, lineHeight: 1.7 }}>
            Every bar has a fixed <b style={{ color: T.text }}>personality</b> (name, type, boss, ATK/DEF modifiers). The <b style={{ color: T.text }}>room sequence</b> is procedurally generated each 24hrs.<br/><br/>
            A Dive Bar always has rooms like Sticky Floor, Dart Corner, Pool Table, Bathroom Brawl, Back Alley — but you get 3-5 of them in a random order each day, with different enemies and modifiers. The final room is always the boss.<br/><br/>
            <b style={{ color: T.text }}>Environmental modifiers</b> per room: "Sticky Floor" slows enemies, "Dart Corner" boosts everyone's crit, "Bathroom Brawl" increases all damage (tight space). Creates tactical choices within a familiar location.
          </div>
        </Card>

        <Card><div style={{ fontSize: 13, fontWeight: 700, color: T.accent, marginBottom: 8 }}>📈 Scaling (The Hard Problem)</div>
          <div style={{ fontSize: 11, color: T.dim, lineHeight: 1.7 }}>
            Enemies scale to the player's level, <b style={{ color: T.text }}>but bar personality modifies stats</b>. A Dive Bar has +10% ATK, -20% DEF — always a glass cannon. A Cocktail Lounge has +30% ATK from status effects. The bar's "feel" is consistent even at Level 500.<br/><br/>
            <b style={{ color: T.text }}>Your power comes from depth, not level advantage.</b> A Level 500 player has maxed-out skill trees (81 nodes), legendary gear, high bar-type mastery stacks. A Level 500 bar is just a scaled version of itself. You have 500 levels of accumulated advantages. You crush it.<br/><br/>
            <b style={{ color: T.text }}>Consumables help, but don't carry you.</b> Healing restores a % of HP, not flat. Buffs are temporary. A Level 10 with perfect consumables can beat a Level 15 bar, not a Level 50 one. Pokémon-style balance.
          </div>
        </Card>

        <Card><div style={{ fontSize: 13, fontWeight: 700, color: T.accent, marginBottom: 8 }}>🔄 Daily Reset</div>
          <div style={{ fontSize: 11, color: T.dim, lineHeight: 1.7 }}>
            All bars reset at local midnight. First clear of the day = full rewards. Second clear = 50%. Third+ = 25%. Mastery counts preserved (first clear only).<br/><br/>
            Room layouts regenerate. Defenders refresh (they've been knocked around by other players all day — HP replenishes). The whole world cycles daily, keeping it fresh even if you go to the same bar every night.
          </div>
        </Card>

        <Card><div style={{ fontSize: 13, fontWeight: 700, color: T.accent, marginBottom: 8 }}>🌍 Global Events</div>
          <div style={{ fontSize: 11, color: T.dim, lineHeight: 1.7 }}>
            <b style={{ color: T.text }}>Weekly world bosses:</b> A random bar becomes a "Titan" bar for 48 hours. HP is massive (player community collectively chips it down). Everyone who participates gets rewards based on damage contribution.<br/><br/>
            <b style={{ color: T.text }}>Seasonal challenges:</b> "Pub Crawl Week" — 2x XP at Irish Pubs. "Craft Beer Festival" — breweries drop exclusive cosmetics.<br/><br/>
            <b style={{ color: T.text }}>City tournaments:</b> Your city's top 100 players by defender coins earned each month get unique frames and titles.
          </div>
        </Card>

        <Card glow gc={T.success}><div style={{ fontSize: 13, fontWeight: 700, color: T.success, marginBottom: 8 }}>✅ Ready for Claude Code</div>
          <div style={{ fontSize: 11, color: T.dim, lineHeight: 1.7 }}>
            All core systems are now designed and playable in prototype form. Claude Code can now build the production version with:<br/><br/>
            • React Native + Expo mobile app<br/>
            • Supabase backend with PostGIS geospatial queries<br/>
            • Google Places API for real bar discovery<br/>
            • Mapbox for the world map<br/>
            • RevenueCat for cosmetics-only IAP<br/>
            • Edge Functions for battle resolution & anti-cheat<br/>
            • Realtime subscriptions for defender updates<br/><br/>
            The design is locked enough to build, loose enough to iterate. Let's ship it.
          </div>
        </Card>
      </div>
    </div>
  );
}

// ═══════════════ MAIN ═══════════════
function initRoster() {
  const r = {};
  CLASSES.forEach((c, i) => {
    r[c.id] = {
      classId: c.id,
      name: c.name.replace("The ", ""),
      level: i === 0 ? 12 : 5 + Math.floor(Math.random() * 10),
      xp: 0,
      barsWon: 0,
      allocated: [],
    };
  });
  return r;
}

export default function BarBrawl() {
  const [screen, setScreen] = useState("title");
  const [roster, setRoster] = useState(initRoster);
  const [activeId, setActiveId] = useState("steady");
  const [gold, setGold] = useState(250);
  const [selBar, setSelBar] = useState(null);
  const [barRooms, setBarRooms] = useState([]);
  const [tab, setTab] = useState("map");

  const activeChar = roster[activeId];
  const activeClass = CLASSES.find(c => c.id === activeId);

  function startFight(bar) {
    const seed = (bar.id * 7919 + Date.now() % 10000) % 100000;
    const rooms = generateBarRun(bar, activeChar.level, seed);
    setSelBar(bar);
    setBarRooms(rooms);
    setScreen("battle");
  }

  function onWin() {
    const xp = 50 + activeChar.level * 10;
    const g = 20 + activeChar.level * 5;
    setRoster(r => ({ ...r, [activeId]: { ...r[activeId], xp: r[activeId].xp + xp, barsWon: (r[activeId].barsWon || 0) + 1, level: r[activeId].xp + xp >= r[activeId].level * 100 ? r[activeId].level + 1 : r[activeId].level } }));
    setGold(g2 => g2 + g);
    setScreen("game");
    setTab("map");
  }

  function toggleNode(node) {
    setRoster(r => {
      const alloc = r[activeId].allocated || [];
      if (alloc.includes(node.id)) {
        // Unallocate - remove this node and any dependents that have no other parent
        const removed = new Set([node.id]);
        let changed = true;
        while (changed) {
          changed = false;
          for (const id of alloc) {
            if (removed.has(id)) continue;
            const n = Object.values(TREES).flat().find(x => x.id === id);
            if (!n) continue;
            if (n.req && n.req.every(rid => removed.has(rid))) {
              removed.add(id);
              changed = true;
            }
          }
        }
        return { ...r, [activeId]: { ...r[activeId], allocated: alloc.filter(id => !removed.has(id)) } };
      } else {
        return { ...r, [activeId]: { ...r[activeId], allocated: [...alloc, node.id] } };
      }
    });
  }

  const TABS = [
    { id: "map", i: "🗺️", l: "Map" },
    { id: "roster", i: "👥", l: "Roster" },
    { id: "tree", i: "🌳", l: "Tree" },
    { id: "design", i: "📋", l: "Design" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "-apple-system, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet" />
      {screen === "title" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", textAlign: "center", padding: 24 }}>
          <div style={{ fontSize: 56, marginBottom: 4 }}>🍺⚔️</div>
          <h1 style={{ fontSize: 48, fontWeight: 900, margin: 0, background: `linear-gradient(135deg,${T.accent},${T.gold})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: -2 }}>BARBRAWL</h1>
          <p style={{ fontSize: 13, color: T.accent, fontWeight: 700, letterSpacing: 4, textTransform: "uppercase", margin: "6px 0 0" }}>V6 · READY FOR CLAUDE CODE</p>
          <p style={{ fontSize: 13, color: T.dim, maxWidth: 340, lineHeight: 1.7, margin: "20px 0 28px" }}>
            6 classes. 162 skill nodes. Turn-based + rhythm combat. Procedural bar layouts. Daily resets. Scaling personalities. Cosmetics only.
          </p>
          <Btn onClick={() => setScreen("game")} style={{ padding: "14px 36px", fontSize: 15 }}>Begin</Btn>
        </div>
      )}
      {screen === "battle" && selBar && (
        <BattleScreen char={activeChar} classData={activeClass} bar={selBar} rooms={barRooms} allocated={activeChar.allocated || []} onWin={onWin} onLose={() => { setScreen("game"); setSelBar(null); }} onFlee={() => { setScreen("game"); setSelBar(null); }} />
      )}
      {screen === "game" && (
        <>
          <div style={{ padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${T.border}`, background: `${T.card}ee`, position: "sticky", top: 0, zIndex: 100 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 18 }}>{activeClass.icon}</span>
              <div><div style={{ fontSize: 12, fontWeight: 800 }}>{activeChar.name}</div><div style={{ fontSize: 9, color: activeClass.color }}>{activeClass.name} · Lv.{activeChar.level}</div></div>
            </div>
            <div style={{ display: "flex", gap: 6, fontSize: 10, fontFamily: "monospace" }}>
              <span style={{ color: T.xp }}>{activeChar.xp} XP</span>
              <span style={{ color: T.gold }}>{gold} 🪙</span>
              <span style={{ color: T.shield }}>{(activeChar.allocated || []).length}📜</span>
            </div>
          </div>
          <div style={{ paddingBottom: 60 }}>
            {tab === "map" && <MapView char={activeChar} classData={activeClass} onFight={startFight} />}
            {tab === "roster" && <RosterView roster={roster} active={activeId} onSelect={setActiveId} />}
            {tab === "tree" && <SkillTreeView char={activeChar} classData={activeClass} allocated={activeChar.allocated || []} onToggle={toggleNode} />}
            {tab === "design" && <DesignView />}
          </div>
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, display: "flex", background: `${T.card}f0`, borderTop: `1px solid ${T.border}`, zIndex: 100 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: "8px 0 6px", background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 1, opacity: tab === t.id ? 1 : 0.4 }}>
                <span style={{ fontSize: 16 }}>{t.i}</span>
                <span style={{ fontSize: 9, color: tab === t.id ? T.accent : T.dim, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{t.l}</span>
                {tab === t.id && <div style={{ width: 16, height: 2, background: T.accent, borderRadius: 1 }} />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
