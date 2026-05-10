import React from 'react';
import { Pressable, View } from 'react-native';
import type { SkillNode } from '@barbrawl/game-core';
import { UI } from '@/design/palette';
import { PIXEL } from '@/design/scale';
import { PixelText } from './PixelText';
import { Panel } from './Panel';

export interface NodeDetailPanelProps {
  node: SkillNode | null;
  status: 'allocated' | 'available' | 'locked';
  onAllocate: () => void;
  onClose: () => void;
}

const TYPE_LABEL = {
  small: 'PASSIVE',
  notable: 'NOTABLE',
  active: 'ACTIVE',
  keystone: 'KEYSTONE',
} as const;

const TYPE_COLOR = {
  small: UI.textDim,
  notable: '#ff6b35',
  active: '#a875e8',
  keystone: UI.cursor,
} as const;

/**
 * Bottom sheet for a tapped node. Shows name + type + effect + desc + a
 * single ALLOCATE / ALLOCATED / LOCKED button.
 */
export function NodeDetailPanel({ node, status, onAllocate, onClose }: NodeDetailPanelProps) {
  if (!node) return null;

  const buttonLabel = status === 'allocated' ? 'ALLOCATED'
                    : status === 'available' ? '▶ ALLOCATE'
                                              : 'LOCKED';
  const buttonColor = status === 'allocated' ? UI.hpFull
                    : status === 'available' ? UI.cursor
                                              : UI.textDim;
  const disabled = status !== 'available';

  return (
    <Panel style={{ marginHorizontal: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <PixelText size={12} color={TYPE_COLOR[node.type]}>
          {TYPE_LABEL[node.type]} · TIER {node.tier}
        </PixelText>
        <Pressable onPress={onClose}>
          <PixelText size={12} color={UI.textDim}>CLOSE</PixelText>
        </Pressable>
      </View>

      <PixelText size={16} color={UI.text} style={{ marginBottom: 4 }}>
        {node.name}
      </PixelText>
      <PixelText size={11} color={UI.cursor} style={{ marginBottom: 6 }}>
        {node.effect}
      </PixelText>
      <PixelText size={10} color={UI.textDim} style={{ marginBottom: 12 }}>
        {node.desc}
      </PixelText>

      <Pressable
        onPress={() => { if (!disabled) onAllocate(); }}
        style={{
          alignItems: 'center', paddingVertical: 8,
          borderColor: buttonColor, borderWidth: PIXEL,
          backgroundColor: status === 'allocated' ? '#0a2a14' : UI.bg,
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <PixelText size={14} color={buttonColor}>{buttonLabel}</PixelText>
      </Pressable>
    </Panel>
  );
}
