import React from 'react';
import { Pressable, View } from 'react-native';
import { NODE_BY_ID } from '@barbrawl/game-core';
import type { Combat } from '@barbrawl/game-core';
import { UI } from '@/design/palette';
import { PIXEL } from '@/design/scale';
import { PixelText } from './PixelText';
import { Panel } from './Panel';

export interface SkillPanelProps {
  player: Combat.Combatant;
  /** Up to 3 active node IDs the player has equipped. */
  equipped: readonly string[];
  onPick: (nodeId: string) => void;
  onCancel: () => void;
}

/**
 * PS-style sub-menu listing equipped skills with cooldown badges. Disabled
 * rows render dim. Tap a row → onPick(nodeId). Bottom row is "BACK".
 */
export function SkillPanel({ player, equipped, onPick, onCancel }: SkillPanelProps) {
  return (
    <Panel style={{ minHeight: 132 }}>
      <PixelText size={11} color={UI.textDim} style={{ marginBottom: 4 }}>
        Pick a skill
      </PixelText>
      {equipped.length === 0 ? (
        <PixelText size={11} color={UI.textDim}>
          (No actives equipped — allocate from skill tree.)
        </PixelText>
      ) : null}
      {equipped.map((nodeId) => {
        const def = NODE_BY_ID.get(nodeId);
        const cd = player.cooldowns?.[nodeId] ?? 0;
        const onCooldown = cd > 0;
        const label = def?.name ?? nodeId;
        return (
          <Pressable
            key={nodeId}
            onPress={() => { if (!onCooldown) onPick(nodeId); }}
            style={{ flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 4 }}
          >
            <PixelText size={14} color={onCooldown ? 'transparent' : UI.cursor} style={{ width: 16 }}>
              ▶
            </PixelText>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <PixelText size={13} color={onCooldown ? UI.textDim : UI.text}>
                  {label}
                </PixelText>
                {onCooldown ? (
                  <PixelText size={10} color={UI.hpHalf} style={{ marginLeft: 8 }}>
                    CD {cd}
                  </PixelText>
                ) : null}
              </View>
              {def?.effect ? (
                <PixelText size={9} color={onCooldown ? UI.textDim : UI.cursor} style={{ marginTop: 1 }}>
                  {def.effect}
                </PixelText>
              ) : null}
              {def?.desc ? (
                <PixelText size={8} color={UI.textDim} style={{ marginTop: 1 }}>
                  {def.desc}
                </PixelText>
              ) : null}
            </View>
          </Pressable>
        );
      })}
      <View style={{ height: 1, backgroundColor: UI.borderDark, marginVertical: 6 }} />
      <Pressable onPress={onCancel} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4 }}>
        <PixelText size={14} color={UI.textDim} style={{ width: 16 }}>◀</PixelText>
        <PixelText size={13} color={UI.textDim}>BACK</PixelText>
      </Pressable>
      {/* spacer to keep panel height stable across skill counts */}
      <View style={{ minHeight: PIXEL * 2 }} />
    </Panel>
  );
}
