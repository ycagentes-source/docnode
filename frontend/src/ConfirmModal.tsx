import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, Animated, Easing } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors, Radius } from './theme';
import { Button } from './Button';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
};

export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive,
  onConfirm,
  onClose,
  loading,
}: Props) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: visible ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, anim]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View
          style={[
            styles.card,
            {
              transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }],
              opacity: anim,
            },
          ]}
        >
          <Pressable>
            <View
              style={[
                styles.icon,
                { backgroundColor: destructive ? Colors.statusExpiredBg : Colors.statusActiveBg },
              ]}
            >
              <Feather
                name={destructive ? 'alert-triangle' : 'help-circle'}
                size={26}
                color={destructive ? Colors.danger : Colors.primaryDark}
              />
            </View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>
            <View style={{ height: 16 }} />
            <Button
              testID="confirm-modal-confirm"
              label={confirmLabel}
              variant={destructive ? 'danger' : 'primary'}
              onPress={onConfirm}
              loading={loading}
            />
            <View style={{ height: 8 }} />
            <Button testID="confirm-modal-cancel" label={cancelLabel} variant="ghost" onPress={onClose} />
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(10,12,13,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#fff', borderRadius: Radius.xxl, padding: 24, width: '100%', maxWidth: 420 },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 20, color: Colors.textPrimary, marginBottom: 6 },
  message: { fontFamily: 'Poppins_400Regular', fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },
});
