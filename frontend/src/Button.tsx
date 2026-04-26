import React from 'react';
import { Text, View, StyleSheet, ActivityIndicator, Pressable, ViewStyle } from 'react-native';
import { Colors, Radius, Shadow } from './theme';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  testID?: string;
  icon?: React.ReactNode;
  fullWidth?: boolean;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  style,
  testID,
  icon,
  fullWidth = true,
}: Props) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      testID={testID}
      onPress={isDisabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        fullWidth && { width: '100%' },
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && styles.ghost,
        variant === 'danger' && styles.danger,
        isDisabled && styles.disabled,
        pressed && !isDisabled && { opacity: 0.85, transform: [{ scale: 0.98 }] },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'danger' ? '#fff' : Colors.primary} />
      ) : (
        <View style={styles.content}>
          {icon && <View style={{ marginRight: 8 }}>{icon}</View>}
          <Text
            style={[
              styles.text,
              variant === 'primary' && { color: '#fff' },
              variant === 'secondary' && { color: Colors.primaryDark },
              variant === 'ghost' && { color: Colors.primaryDark },
              variant === 'danger' && { color: '#fff' },
            ]}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: Radius.lg,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flexDirection: 'row', alignItems: 'center' },
  primary: { backgroundColor: Colors.primary, ...Shadow.button },
  secondary: { backgroundColor: '#E6F8F8' },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: Colors.danger },
  disabled: { opacity: 0.55 },
  text: { fontFamily: 'Poppins_600SemiBold', fontSize: 15 },
});
