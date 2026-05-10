import React from 'react';
import { View } from 'react-native';
import type { Combat } from '@barbrawl/game-core';
import { UI } from '@/design/palette';
import { PixelText } from './PixelText';

/**
 * Visual style per status tag. The combat engine's StatusEffect.tag is
 * 'buff_atk'|'buff_def'|'debuff_def'|'bleed'|'burn'|'poison'|'stun'|'mark'
 * and the schema layer adds curse/slow/blind/dodge_up/block/charge/etc.
 *
 * We render each effect as a tiny chip (icon + turns left). Color hints
 * good (green) vs bad (red) vs neutral (gold) so a glance at a combatant
 * tells you the threat / advantage level.
 */
const STATUS_STYLE: Record<string, { color: string; icon: string }> = {
  // DoTs (red — incoming damage)
  bleed:       { color: '#e63946', icon: '🩸' },
  burn:        { color: '#ff6b35', icon: '🔥' },
  poison:      { color: '#74e070', icon: '☠' },
  // Skip-actions (red)
  stun:        { color: '#ffd700', icon: '⚡' },
  blind:       { color: '#888098', icon: '◍' },
  // Markers (yellow — opportunistic)
  mark:        { color: '#f8b800', icon: '✦' },
  curse:       { color: '#a855f7', icon: '✺' },
  slow:        { color: '#5870b0', icon: '⫷' },
  // Buffs (green — beneficial)
  buff_atk:    { color: '#74e070', icon: '⚔+' },
  buff_def:    { color: '#74e070', icon: '🛡+' },
  buff_crit:   { color: '#74e070', icon: '★+' },
  // Debuffs (red — applied to enemy)
  debuff_atk:  { color: '#e63946', icon: '⚔−' },
  debuff_def:  { color: '#e63946', icon: '🛡−' },
  debuff_crit: { color: '#e63946', icon: '★−' },
  // Misc
  dodge_up:    { color: '#06d6a0', icon: '⤴' },
  block:       { color: '#a0c8f8', icon: '🛡' },
  immune_dot:  { color: '#74e070', icon: '⊘' },
  reflect:     { color: '#ff6b35', icon: '↩' },
  charge:      { color: '#ffd700', icon: '⚡⚡' },
};

const FALLBACK = { color: UI.textDim, icon: '?' };

export interface StatusRowProps {
  effects: readonly Combat.StatusEffect[];
  /** Compact — used over enemy sprite (less label real estate). */
  compact?: boolean;
}

export function StatusRow({ effects, compact = false }: StatusRowProps) {
  if (effects.length === 0) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
      {effects.map((effect, i) => {
        const style = STATUS_STYLE[effect.tag] ?? FALLBACK;
        return (
          <View
            key={`${effect.tag}-${i}`}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 4,
              paddingVertical: 2,
              borderColor: style.color,
              borderWidth: 1,
              backgroundColor: UI.bg,
            }}
          >
            <PixelText size={compact ? 9 : 10} color={style.color}>
              {style.icon}
            </PixelText>
            <PixelText size={compact ? 8 : 9} color={style.color} style={{ marginLeft: 2 }}>
              {effect.turnsLeft}
            </PixelText>
          </View>
        );
      })}
    </View>
  );
}
