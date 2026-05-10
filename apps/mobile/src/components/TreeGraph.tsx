import React, { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import type { SkillNode, Tree } from '@barbrawl/game-core';
import { UI } from '@/design/palette';
import { PIXEL } from '@/design/scale';
import { PixelText } from './PixelText';

const NODE_SIZE = 40;            // logical px
const SCALE = 1.5;                // 200x550 source → ~320x830
const VIEW_W = Math.ceil(220 * SCALE);
const VIEW_H = Math.ceil(560 * SCALE);

export type AllocationStatus = 'allocated' | 'available' | 'locked';

export interface TreeGraphProps {
  tree: Tree;
  allocated: ReadonlySet<string>;
  selectedId?: string;
  onSelect: (nodeId: string) => void;
}

/**
 * Renders a 9-node skill tree as a node graph. Each node is a Pressable
 * positioned at scaled (x, y) coordinates from the SkillNode. Prereq lines
 * draw as SVG segments between dependent and dependency nodes, colored by
 * whether the dependency is allocated.
 *
 * D2 vibe: black background, gold for allocated, white for available,
 * grey for locked. Keystone gets an extra ring.
 */
export function TreeGraph({ tree, allocated, selectedId, onSelect }: TreeGraphProps) {
  const status = useMemo(() => deriveStatus(tree, allocated), [tree, allocated]);

  return (
    <View style={{ width: VIEW_W, height: VIEW_H, backgroundColor: UI.bg }}>
      {/* prereq lines */}
      <Svg
        width={VIEW_W}
        height={VIEW_H}
        style={{ position: 'absolute', left: 0, top: 0 }}
      >
        {tree.flatMap((node) =>
          (node.req ?? []).map((prereqId) => {
            const prereq = tree.find((n) => n.id === prereqId);
            if (!prereq) return null;
            const allocBoth = allocated.has(node.id) && allocated.has(prereqId);
            const stroke = allocBoth ? UI.cursor
                         : allocated.has(prereqId) ? UI.text
                         : UI.borderDark;
            return (
              <Line
                key={`${prereqId}->${node.id}`}
                x1={(prereq.x + 10) * SCALE}
                y1={(prereq.y + 10) * SCALE}
                x2={(node.x + 10) * SCALE}
                y2={(node.y + 10) * SCALE}
                stroke={stroke}
                strokeWidth={allocBoth ? 4 : 2}
              />
            );
          }),
        )}
      </Svg>

      {/* nodes */}
      {tree.map((node) => {
        const s = status.get(node.id) ?? 'locked';
        const isSelected = selectedId === node.id;
        return (
          <NodeBlock
            key={node.id}
            node={node}
            status={s}
            selected={isSelected}
            onPress={() => onSelect(node.id)}
          />
        );
      })}
    </View>
  );
}

function NodeBlock({
  node, status, selected, onPress,
}: {
  node: SkillNode;
  status: AllocationStatus;
  selected: boolean;
  onPress: () => void;
}) {
  const left = node.x * SCALE - NODE_SIZE / 2 + 10 * SCALE;
  const top = node.y * SCALE - NODE_SIZE / 2 + 10 * SCALE;

  const bg = node.type === 'keystone' ? UI.cursor
           : node.type === 'notable'  ? '#ff6b35'
           : node.type === 'active'   ? '#8338ec'
                                       : UI.textDim;

  const fill = status === 'allocated' ? bg
             : status === 'available' ? UI.panelFill
                                       : UI.bg;
  const ringColor = status === 'allocated' ? UI.cursor
                  : status === 'available' ? UI.text
                                            : UI.borderDark;
  const textColor = status === 'allocated' ? UI.bg
                  : status === 'available' ? UI.text
                                            : UI.textDim;

  // Symbol per node type — quick legibility without full art.
  const symbol = node.type === 'keystone' ? '★'
               : node.type === 'notable'  ? '◆'
               : node.type === 'active'   ? '▶'
                                            : '●';

  const size = node.type === 'keystone' ? NODE_SIZE + 8
             : node.type === 'notable'  ? NODE_SIZE + 4
                                          : NODE_SIZE;

  return (
    <Pressable
      onPress={onPress}
      style={{
        position: 'absolute',
        left: left - (size - NODE_SIZE) / 2,
        top: top - (size - NODE_SIZE) / 2,
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: fill,
        borderColor: selected ? UI.cursor : ringColor,
        borderWidth: selected ? PIXEL : 2,
        // Square for active, otherwise rounded.
        borderRadius: node.type === 'active' ? 0 : size / 2,
      }}
      accessibilityRole="button"
      accessibilityLabel={node.name}
    >
      <PixelText
        size={node.type === 'keystone' ? 18 : 14}
        color={textColor}
      >
        {symbol}
      </PixelText>
    </Pressable>
  );
}

/** Allocation status: allocated / prereqs met but not allocated / locked. */
function deriveStatus(
  tree: Tree,
  allocated: ReadonlySet<string>,
): Map<string, AllocationStatus> {
  const out = new Map<string, AllocationStatus>();
  for (const n of tree) {
    if (allocated.has(n.id)) { out.set(n.id, 'allocated'); continue; }
    const prereqs = n.req ?? [];
    const ok = prereqs.length === 0 || prereqs.every((p) => allocated.has(p));
    out.set(n.id, ok ? 'available' : 'locked');
  }
  return out;
}
