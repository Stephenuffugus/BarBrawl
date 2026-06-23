import React from 'react';
import { Pressable, View } from 'react-native';
import { UI } from '@/design/palette';
import { playSfx } from '@/audio/sfx';
import { PixelText } from './PixelText';

export interface MenuItem {
  id: string;
  label: string;
  disabled?: boolean;
}

export interface MenuListProps {
  items: readonly MenuItem[];
  cursor: number;            // index of current selection
  onSelect: (id: string, idx: number) => void;
  onMove?: (idx: number) => void;
}

/**
 * PS1-literal command menu. White text rows with a yellow chevron next to
 * the selected one. Tapping a row selects it (mobile UX); arrow-key style
 * navigation is layered on top of cursor state by the caller.
 */
export const MenuList = React.memo(function MenuList({ items, cursor, onSelect, onMove }: MenuListProps) {
  return (
    <View>
      {items.map((item, idx) => {
        const isSelected = idx === cursor;
        const dim = item.disabled;
        return (
          <Pressable
            key={item.id}
            onPress={() => {
              if (dim) return;
              playSfx('menu_select');
              onMove?.(idx);
              onSelect(item.id, idx);
            }}
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4 }}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected, disabled: dim }}
          >
            <PixelText
              size={14}
              color={isSelected ? UI.cursor : 'transparent'}
              style={{ width: 16 }}
            >
              ▶
            </PixelText>
            <PixelText
              size={14}
              color={dim ? UI.textDim : UI.text}
            >
              {item.label}
            </PixelText>
          </Pressable>
        );
      })}
    </View>
  );
});
