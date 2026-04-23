import {
  canSurviveTier,
  canEnterVIPRoom,
  barThemeUnlocked,
  BAR_THEME_DAMAGE,
  RESISTANCE_MARKS,
  RESISTANCE_MARK_BY_ID,
  VIP_KEYS,
  VIP_KEY_BY_BAR_THEME,
  SURVIVAL_THRESHOLD,
  GATING_BEGINS_AT_TIER,
  MASTERY_TIER_FOR_THEME_UNLOCK,
  type CharacterGatingLoadout,
  type ResistanceMark,
  type VIPKey,
} from '../gating';
import type { BarType } from '../types';

function loadout(partial: Partial<CharacterGatingLoadout> = {}): CharacterGatingLoadout {
  return {
    equippedMarks: partial.equippedMarks ?? [],
    inventoryKeys: partial.inventoryKeys ?? [],
    barMasteryTiers: partial.barMasteryTiers ?? {
      dive: 0, pub: 0, sports: 0, cocktail: 0,
      wine: 0, brewery: 0, nightclub: 0,
    },
  };
}

describe('BAR_THEME_DAMAGE', () => {
  it('maps every bar theme to exactly one damage type', () => {
    const themes: readonly BarType[] = [
      'dive', 'pub', 'sports', 'cocktail', 'wine', 'brewery', 'nightclub',
    ];
    for (const t of themes) {
      expect(BAR_THEME_DAMAGE[t]).toBeTruthy();
    }
  });
});

describe('RESISTANCE_MARKS', () => {
  it('covers every damage type used by BAR_THEME_DAMAGE', () => {
    const covered = new Set(RESISTANCE_MARKS.map((m) => m.against));
    for (const dmg of Object.values(BAR_THEME_DAMAGE)) {
      expect(covered.has(dmg)).toBe(true);
    }
  });

  it('every mark meets the survival threshold', () => {
    for (const m of RESISTANCE_MARKS) {
      expect(m.strength).toBeGreaterThanOrEqual(SURVIVAL_THRESHOLD);
    }
  });

  it('lookup by id works', () => {
    expect(RESISTANCE_MARK_BY_ID['mark_blunt']).toBeDefined();
  });
});

describe('VIP_KEYS', () => {
  it('has one key per bar theme', () => {
    const themes: readonly BarType[] = [
      'dive', 'pub', 'sports', 'cocktail', 'wine', 'brewery', 'nightclub',
    ];
    for (const t of themes) {
      expect(VIP_KEY_BY_BAR_THEME[t]).toBeDefined();
    }
    expect(VIP_KEYS.length).toBe(themes.length);
  });
});

describe('canSurviveTier (Metroid resistance gate)', () => {
  it(`lets anyone enter below tier ${GATING_BEGINS_AT_TIER}`, () => {
    for (let tier = 1; tier < GATING_BEGINS_AT_TIER; tier++) {
      const check = canSurviveTier(loadout(), 'dive', tier);
      expect(check.canEnter).toBe(true);
      expect(check.reason).toBe('tier_below_gate');
    }
  });

  it('blocks tier 4+ with no resistance', () => {
    const check = canSurviveTier(loadout(), 'dive', 4);
    expect(check.canEnter).toBe(false);
    expect(check.reason).toBe('no_resistance');
    expect(check.requiredMark?.against).toBe('blunt');
  });

  it('passes tier 4+ with the matching mark', () => {
    const mark = RESISTANCE_MARKS.find((m) => m.against === 'blunt')!;
    const check = canSurviveTier(loadout({ equippedMarks: [mark] }), 'dive', 4);
    expect(check.canEnter).toBe(true);
    expect(check.reason).toBe('has_resistance');
  });

  it('blocks tier 4+ with the wrong mark', () => {
    const wrong = RESISTANCE_MARKS.find((m) => m.against === 'sonic')!;
    const check = canSurviveTier(loadout({ equippedMarks: [wrong] }), 'dive', 4);
    expect(check.canEnter).toBe(false);
  });

  it('flags weak resistance distinctly from missing resistance', () => {
    const weak: ResistanceMark = {
      id: 'weak', name: 'Test', against: 'blunt', strength: 0.1, description: '',
    };
    const check = canSurviveTier(loadout({ equippedMarks: [weak] }), 'dive', 4);
    expect(check.canEnter).toBe(false);
    expect(check.reason).toBe('weak_resistance');
  });
});

describe('canEnterVIPRoom', () => {
  it('denies entry without a key', () => {
    const check = canEnterVIPRoom(loadout(), 'nightclub');
    expect(check.canEnter).toBe(false);
    expect(check.requiredKeyTheme).toBe('nightclub');
  });

  it('permits entry with the matching key', () => {
    const key: VIPKey = VIP_KEY_BY_BAR_THEME['nightclub'];
    const check = canEnterVIPRoom(loadout({ inventoryKeys: [key] }), 'nightclub');
    expect(check.canEnter).toBe(true);
  });

  it('denies entry with the wrong key', () => {
    const key: VIPKey = VIP_KEY_BY_BAR_THEME['cocktail'];
    const check = canEnterVIPRoom(loadout({ inventoryKeys: [key] }), 'dive');
    expect(check.canEnter).toBe(false);
  });
});

describe('barThemeUnlocked (mastery gate)', () => {
  it(`unlocks at mastery tier ${MASTERY_TIER_FOR_THEME_UNLOCK}`, () => {
    const at = loadout({
      barMasteryTiers: {
        dive: MASTERY_TIER_FOR_THEME_UNLOCK, pub: 0, sports: 0,
        cocktail: 0, wine: 0, brewery: 0, nightclub: 0,
      },
    });
    expect(barThemeUnlocked(at, 'dive')).toBe(true);
  });

  it('stays locked below mastery threshold', () => {
    const below = loadout({
      barMasteryTiers: {
        dive: MASTERY_TIER_FOR_THEME_UNLOCK - 1, pub: 0, sports: 0,
        cocktail: 0, wine: 0, brewery: 0, nightclub: 0,
      },
    });
    expect(barThemeUnlocked(below, 'dive')).toBe(false);
  });
});
