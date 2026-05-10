// Skill tree viewer. D2-style: 3 trees per class, prereq lines, glowing
// allocated nodes. Demo holds allocation state in local component state;
// real version persists to Supabase via edge function.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { CLASSES, getTree, NODE_BY_ID, type ClassId, type SkillNode } from '@barbrawl/game-core';
import { TreeGraph } from '@/components/TreeGraph';
import { NodeDetailPanel } from '@/components/NodeDetailPanel';
import { Panel } from '@/components/Panel';
import { PixelText } from '@/components/PixelText';
import { UI } from '@/design/palette';
import { PIXEL } from '@/design/scale';
import { useGameStore } from '@/state/game-store';

export default function TreeScreen() {
  const activeIdx = useGameStore((s) => s.activeIdx);
  const roster = useGameStore((s) => s.roster);
  const allocateNode = useGameStore((s) => s.allocateNode);

  // Default the open class to the user's active character.
  const [classIdx, setClassIdx] = useState(activeIdx);
  const [treeIdx, setTreeIdx] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Sync if active character changes outside the screen.
  useEffect(() => { setClassIdx(activeIdx); }, [activeIdx]);

  const cls = CLASSES[classIdx]!;
  const treeId = cls.treeIds[treeIdx]!;
  const tree = useMemo(() => getTree(treeId), [treeId]);
  const treeName = cls.treeDisplayNames[treeId] ?? treeId;

  // Pull the matching roster row for the currently-viewed class.
  const charRow = roster.find((r) => r.class_id === cls.id);
  const allocated = useMemo(
    () => new Set<string>(charRow?.allocated_nodes ?? []),
    [charRow],
  );
  const skillPointsLeft = charRow ? Math.max(0, charRow.level - charRow.allocated_nodes.length) : 0;

  const selectedNode: SkillNode | null = selectedId ? (NODE_BY_ID.get(selectedId) ?? null) : null;
  const status = useMemo(() => {
    if (!selectedNode) return 'locked' as const;
    if (allocated.has(selectedNode.id)) return 'allocated' as const;
    if (skillPointsLeft <= 0) return 'locked' as const;
    const reqs = selectedNode.req ?? [];
    const ok = reqs.length === 0 || reqs.every((r) => allocated.has(r));
    return ok ? 'available' as const : 'locked' as const;
  }, [allocated, selectedNode, skillPointsLeft]);

  const onAllocate = useCallback(() => {
    if (!selectedNode || !charRow) return;
    allocateNode(charRow.class_id as ClassId, selectedNode.id);
  }, [selectedNode, charRow, allocateNode]);

  return (
    <View style={{ flex: 1, backgroundColor: UI.bg, paddingTop: 24 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, marginBottom: 8 }}>
        <Pressable onPress={() => router.back()}>
          <PixelText size={12} color={UI.cursor}>◀ BACK</PixelText>
        </Pressable>
        <PixelText size={14} color={UI.text}>{cls.name.toUpperCase()}</PixelText>
        <Pressable onPress={() => router.push('/respec')}>
          <PixelText size={11} color={UI.cursor}>SP {skillPointsLeft} · RESPEC</PixelText>
        </Pressable>
      </View>

      {/* Class picker */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12, gap: 4 }}
        style={{ flexGrow: 0, marginBottom: 8 }}
      >
        {CLASSES.map((c, i) => (
          <Pressable
            key={c.id}
            onPress={() => { setClassIdx(i); setTreeIdx(0); setSelectedId(null); }}
            style={{
              paddingHorizontal: 8, paddingVertical: 6,
              borderColor: i === classIdx ? UI.cursor : UI.borderDark,
              borderWidth: PIXEL,
              backgroundColor: i === classIdx ? UI.panelFill : UI.bg,
            }}
          >
            <PixelText size={10} color={i === classIdx ? UI.cursor : UI.textDim}>
              {shortClassName(c.name)}
            </PixelText>
          </Pressable>
        ))}
      </ScrollView>

      {/* Tree picker */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 12, gap: 4, marginBottom: 8 }}>
        {cls.treeIds.map((tid, i) => {
          const display = cls.treeDisplayNames[tid] ?? tid;
          return (
            <Pressable
              key={tid}
              onPress={() => { setTreeIdx(i); setSelectedId(null); }}
              style={{
                flex: 1, alignItems: 'center', paddingVertical: 6,
                borderColor: i === treeIdx ? UI.cursor : UI.borderDark,
                borderWidth: PIXEL,
                backgroundColor: i === treeIdx ? UI.panelFill : UI.bg,
              }}
            >
              <PixelText size={11} color={i === treeIdx ? UI.cursor : UI.text}>
                {display.toUpperCase()}
              </PixelText>
            </Pressable>
          );
        })}
      </View>

      {/* Tree graph */}
      <ScrollView contentContainerStyle={{ alignItems: 'center', paddingVertical: 12 }}>
        <TreeGraph
          tree={tree}
          allocated={allocated}
          {...(selectedId ? { selectedId } : {})}
          onSelect={setSelectedId}
        />
      </ScrollView>

      {/* Selected-node detail */}
      {selectedNode ? (
        <View style={{ marginBottom: 12 }}>
          <NodeDetailPanel
            node={selectedNode}
            status={status}
            onAllocate={onAllocate}
            onClose={() => setSelectedId(null)}
          />
        </View>
      ) : (
        <Panel style={{ marginHorizontal: 12, marginBottom: 12 }}>
          <PixelText size={11} color={UI.textDim}>
            Tap a node to inspect. Tier 1 nodes need no prerequisites.
          </PixelText>
          <PixelText size={10} color={UI.textDim} style={{ marginTop: 4 }}>
            {treeName.toUpperCase()} — {tree.length} nodes, 1 keystone.
          </PixelText>
        </Panel>
      )}
    </View>
  );
}

function shortClassName(full: string): string {
  // "The Operator" -> "OPER"
  return full.replace(/^The\s+/, '').slice(0, 4).toUpperCase();
}
