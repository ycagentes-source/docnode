import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Radius } from './theme';
import { STATUS_LABELS } from './labels';

const styleMap: Record<string, { bg: string; fg: string }> = {
  ativo: { bg: Colors.statusActiveBg, fg: Colors.primaryDark },
  vencendo_em_breve: { bg: Colors.statusExpiringBg, fg: '#92400E' },
  vencido: { bg: Colors.statusExpiredBg, fg: '#991B1B' },
  sem_vencimento: { bg: Colors.statusNoneBg, fg: '#374151' },
};

export function StatusBadge({ status, small = false }: { status: string; small?: boolean }) {
  const s = styleMap[status] || styleMap.sem_vencimento;
  return (
    <View
      testID={`status-badge-${status}`}
      style={[styles.badge, { backgroundColor: s.bg }, small && styles.badgeSmall]}
    >
      <View style={[styles.dot, { backgroundColor: s.fg }]} />
      <Text style={[styles.text, { color: s.fg }, small && styles.textSmall]}>
        {STATUS_LABELS[status] || status}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    alignSelf: 'flex-start',
  },
  badgeSmall: { paddingHorizontal: 8, paddingVertical: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  text: { fontFamily: 'Poppins_500Medium', fontSize: 12 },
  textSmall: { fontSize: 11 },
});
