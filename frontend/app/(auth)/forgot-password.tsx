import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Field } from '../../src/Field';
import { Button } from '../../src/Button';
import { Colors, Spacing } from '../../src/theme';
import { api, ApiError } from '../../src/api';

export default function ForgotPassword() {
  const router = useRouter();
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const onRequest = async () => {
    setError('');
    setInfo('');
    if (!email) return setError('Informe seu e-mail.');
    setLoading(true);
    try {
      const res: any = await api.post('/api/auth/forgot-password', { email });
      if (res.reset_token) {
        setToken(res.reset_token);
        setInfo('Token de recuperação gerado. Defina sua nova senha abaixo.');
        setStep('reset');
      } else {
        setInfo('Se o e-mail existir, instruções foram enviadas.');
      }
    } catch (e: any) {
      setError(e instanceof ApiError ? e.message : 'Erro ao solicitar recuperação.');
    } finally {
      setLoading(false);
    }
  };

  const onReset = async () => {
    setError('');
    if (!token || !newPassword) return setError('Preencha todos os campos.');
    if (newPassword.length < 6) return setError('A senha deve ter ao menos 6 caracteres.');
    setLoading(true);
    try {
      await api.post('/api/auth/reset-password', { token, new_password: newPassword });
      router.replace('/(auth)/login');
    } catch (e: any) {
      setError(e instanceof ApiError ? e.message : 'Não foi possível redefinir a senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity testID="forgot-back" onPress={() => router.back()} style={styles.back}>
            <Feather name="chevron-left" size={22} color={Colors.textPrimary} />
            <Text style={styles.backText}>Voltar</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Recuperar senha</Text>
          <Text style={styles.subtitle}>
            {step === 'request'
              ? 'Informe seu e-mail. Vamos gerar um token de recuperação para você.'
              : 'Use o token e defina uma nova senha.'}
          </Text>

          <View style={{ height: 24 }} />

          {step === 'request' ? (
            <>
              <Field
                testID="forgot-email-input"
                label="E-mail"
                placeholder="seu@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
              <View style={{ height: 18 }} />
              <Button testID="forgot-request-button" label="Gerar token" loading={loading} onPress={onRequest} />
            </>
          ) : (
            <>
              <Field
                testID="forgot-token-input"
                label="Token de recuperação"
                placeholder="Cole o token recebido"
                value={token}
                onChangeText={setToken}
                autoCapitalize="none"
              />
              <View style={{ height: 12 }} />
              <Field
                testID="forgot-newpass-input"
                label="Nova senha"
                placeholder="Mínimo 6 caracteres"
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
              />
              <View style={{ height: 18 }} />
              <Button testID="forgot-reset-button" label="Redefinir senha" loading={loading} onPress={onReset} />
            </>
          )}

          {!!info && <Text style={styles.info} testID="forgot-info">{info}</Text>}
          {!!error && <Text style={styles.error} testID="forgot-error">{error}</Text>}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.xl, flexGrow: 1 },
  back: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  backText: { fontFamily: 'Poppins_500Medium', color: Colors.textPrimary, fontSize: 14, marginLeft: 4 },
  title: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 26, color: Colors.textPrimary, letterSpacing: -0.5 },
  subtitle: { fontFamily: 'Poppins_400Regular', fontSize: 14, color: Colors.textSecondary, marginTop: 6, lineHeight: 22 },
  info: { color: Colors.primaryDark, marginTop: 16, fontFamily: 'Poppins_500Medium', fontSize: 13 },
  error: { color: Colors.danger, marginTop: 14, fontFamily: 'Poppins_500Medium', fontSize: 13 },
});
