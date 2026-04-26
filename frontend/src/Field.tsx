import React, { forwardRef } from 'react';
import { TextInput, View, Text, StyleSheet, TextInputProps, ViewStyle } from 'react-native';
import { Colors, Radius } from './theme';

type Props = TextInputProps & {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  testID?: string;
};

export const Field = forwardRef<TextInput, Props>(function Field(
  { label, error, containerStyle, testID, style, ...rest },
  ref,
) {
  return (
    <View style={[{ width: '100%' }, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        ref={ref}
        testID={testID}
        placeholderTextColor={Colors.textMuted}
        style={[styles.input, !!error && styles.inputError, style]}
        {...rest}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  label: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
    color: Colors.textPrimary,
  },
  inputError: { borderColor: Colors.danger },
  error: {
    color: Colors.danger,
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    marginTop: 4,
  },
});
