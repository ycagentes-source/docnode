import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, ScrollView, Animated, Easing } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors, Radius } from './theme';

type Option = { value: string | number; label: string };

type Props = {
  label?: string;
  value: string | number | null | undefined;
  onChange: (v: any) => void;
  options: Option[];
  placeholder?: string;
  testID?: string;
};

export function Select({ label, value, onChange, options, placeholder, testID }: Props) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: open ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [open, anim]);

  return (
    <View style={{ width: '100%' }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable testID={testID} onPress={() => setOpen(true)} style={styles.trigger}>
        <Text style={[styles.value, !selected && { color: Colors.textMuted }]}>
          {selected ? selected.label : placeholder || 'Selecionar...'}
        </Text>
        <Feather name="chevron-down" size={18} color={Colors.textSecondary} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Animated.View
            style={[
              styles.sheet,
              { transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }] },
            ]}
          >
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>{label || 'Selecionar'}</Text>
            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
              {options.map((opt) => {
                const active = opt.value === value;
                return (
                  <Pressable
                    key={String(opt.value)}
                    testID={`select-option-${opt.value}`}
                    style={[styles.row, active && { backgroundColor: '#E6F8F8' }]}
                    onPress={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                  >
                    <Text style={[styles.rowText, active && { color: Colors.primaryDark, fontFamily: 'Poppins_600SemiBold' }]}>
                      {opt.label}
                    </Text>
                    {active && <Feather name="check" size={18} color={Colors.primary} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Animated.View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: Colors.textSecondary, marginBottom: 6 },
  trigger: {
    backgroundColor: '#fff',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  value: { fontFamily: 'Poppins_400Regular', fontSize: 15, color: Colors.textPrimary, flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(10,12,13,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 32 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#D1D5DB', alignSelf: 'center', marginBottom: 12 },
  sheetTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 18, color: Colors.textPrimary, marginBottom: 12 },
  row: { paddingVertical: 14, paddingHorizontal: 14, borderRadius: Radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowText: { fontFamily: 'Poppins_400Regular', fontSize: 15, color: Colors.textPrimary },
});
