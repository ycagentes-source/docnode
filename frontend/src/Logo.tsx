import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors, Radius } from './theme';

export function Logo({ size = 28, showSubtitle = false }: { size?: number; showSubtitle?: boolean }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={[styles.row]}>
        <View style={[styles.mark, { width: size + 4, height: size + 4, borderRadius: (size + 4) / 4 }]}>
          <Feather name="lock" color="#fff" size={Math.round(size * 0.6)} />
        </View>
        <Text style={[styles.brand, { fontSize: Math.round(size * 0.95) }]}>
          Doc<Text style={{ color: Colors.primary }}>node</Text>
        </Text>
      </View>
      {showSubtitle ? <Text style={styles.tagline}>by Keynode</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mark: {
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  brand: {
    fontFamily: 'PlusJakartaSans_700Bold',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  tagline: {
    marginTop: 4,
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
});
