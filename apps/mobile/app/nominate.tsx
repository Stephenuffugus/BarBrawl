// Bar nomination form + submission list. Spec §5.11.
//
// Players submit real-world bars they want added to the game. Game-core's
// validateNomination handles geo+name dedup. Demo persists nominations
// locally in the store; production flow will call the bar-nomination
// edge function (when Supabase is wired).

import React, { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Bars } from '@barbrawl/game-core';
import { Panel } from '@/components/Panel';
import { PixelText } from '@/components/PixelText';
import { UI } from '@/design/palette';
import { PIXEL } from '@/design/scale';
import { useGameStore } from '@/state/game-store';
import { playSfx } from '@/audio/sfx';

const BAR_TYPES = Bars.BAR_TYPES;

const STATUS_COLOR: Record<string, string> = {
  pending: UI.cursor,
  approved: UI.hpFull,
  rejected: UI.hpLow,
};

export default function NominateScreen() {
  const { nominations, submitNomination } = useGameStore();

  const [barName, setBarName] = useState('');
  const [address, setAddress] = useState('');
  const [barType, setBarType] = useState<string>('dive');
  const [lat, setLat] = useState('40.7128');
  const [lng, setLng] = useState('-74.0060');
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const onSubmit = () => {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    const result = submitNomination({
      barName: barName.trim(),
      address: address.trim(),
      barType,
      lat: latNum, lng: lngNum,
    });
    if (result.ok) {
      setBarName('');
      setAddress('');
      setFeedback({ ok: true, text: `Submitted! Awaiting review.` });
      playSfx('level_up');
    } else {
      setFeedback({ ok: false, text: `Rejected: ${result.reason.replaceAll('_', ' ')}.` });
      playSfx('miss');
    }
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <View style={{ flex: 1, backgroundColor: UI.bg, paddingTop: 24 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, marginBottom: 8 }}>
        <Pressable onPress={() => router.back()}>
          <PixelText size={12} color={UI.cursor}>◀ BACK</PixelText>
        </Pressable>
        <PixelText size={14} color={UI.text}>NOMINATE A PLACE</PixelText>
        <PixelText size={11} color={UI.textDim}>{nominations.length}</PixelText>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 32, gap: 8 }}>
        <Panel>
          <PixelText size={10} color={UI.textDim}>WHY</PixelText>
          <PixelText size={11} color={UI.text} style={{ marginTop: 4 }}>
            Submit a real place you want in the game. After dedup + manual
            review (~48h in production), the place appears on the map for
            everyone in your region. Owners can later claim verification.
          </PixelText>
        </Panel>

        <Panel>
          <PixelText size={11} color={UI.textDim} style={{ marginBottom: 4 }}>
            PLACE NAME
          </PixelText>
          <Field value={barName} onChangeText={setBarName} placeholder="The Wild Meadow" />

          <PixelText size={11} color={UI.textDim} style={{ marginTop: 8, marginBottom: 4 }}>
            ADDRESS
          </PixelText>
          <Field value={address} onChangeText={setAddress} placeholder="123 Main St" />

          <PixelText size={11} color={UI.textDim} style={{ marginTop: 8, marginBottom: 4 }}>
            PLACE TYPE
          </PixelText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 4 }} style={{ flexGrow: 0 }}
          >
            {BAR_TYPES.map((t) => (
              <Pressable
                key={t}
                onPress={() => setBarType(t)}
                style={{
                  paddingHorizontal: 10, paddingVertical: 6,
                  borderColor: barType === t ? UI.cursor : UI.borderDark,
                  borderWidth: PIXEL,
                  backgroundColor: barType === t ? UI.panelFill : UI.bg,
                }}
              >
                <PixelText size={10} color={barType === t ? UI.cursor : UI.text}>
                  {t.toUpperCase()}
                </PixelText>
              </Pressable>
            ))}
          </ScrollView>

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <View style={{ flex: 1 }}>
              <PixelText size={11} color={UI.textDim} style={{ marginBottom: 4 }}>LAT</PixelText>
              <Field value={lat} onChangeText={setLat} placeholder="40.7128" />
            </View>
            <View style={{ flex: 1 }}>
              <PixelText size={11} color={UI.textDim} style={{ marginBottom: 4 }}>LNG</PixelText>
              <Field value={lng} onChangeText={setLng} placeholder="-74.0060" />
            </View>
          </View>

          <Pressable
            onPress={onSubmit}
            disabled={!barName.trim() || !address.trim()}
            style={{
              alignItems: 'center', paddingVertical: 12, marginTop: 12,
              borderColor: UI.cursor, borderWidth: PIXEL,
              backgroundColor: UI.panelFill,
              opacity: !barName.trim() || !address.trim() ? 0.5 : 1,
            }}
          >
            <PixelText size={14} color={UI.cursor}>▶ SUBMIT NOMINATION</PixelText>
          </Pressable>

          {feedback ? (
            <View style={{
              marginTop: 8, padding: 8,
              borderColor: feedback.ok ? UI.hpFull : UI.hpLow, borderWidth: 2,
            }}>
              <PixelText size={11} color={feedback.ok ? UI.hpFull : UI.hpLow}>
                {feedback.text}
              </PixelText>
            </View>
          ) : null}
        </Panel>

        {nominations.length > 0 ? (
          <Panel>
            <PixelText size={10} color={UI.textDim}>YOUR SUBMISSIONS</PixelText>
            <View style={{ marginTop: 6, gap: 6 }}>
              {[...nominations].reverse().map((n) => (
                <View key={n.id} style={{
                  borderColor: STATUS_COLOR[n.status] ?? UI.border,
                  borderLeftWidth: PIXEL,
                  paddingLeft: 8, paddingVertical: 4,
                }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <PixelText size={12} color={UI.text}>{n.barName}</PixelText>
                    <PixelText size={9} color={STATUS_COLOR[n.status] ?? UI.textDim}>
                      {n.status.toUpperCase()}
                    </PixelText>
                  </View>
                  <PixelText size={9} color={UI.textDim}>
                    {n.barType.toUpperCase()} · {n.address}
                  </PixelText>
                </View>
              ))}
            </View>
          </Panel>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Field({
  value, onChangeText, placeholder,
}: {
  value: string; onChangeText: (s: string) => void; placeholder: string;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={UI.textDim}
      style={{
        color: UI.text,
        fontFamily: 'Courier',
        fontSize: 14,
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderColor: UI.border, borderWidth: 2,
        backgroundColor: UI.bg,
      }}
    />
  );
}
