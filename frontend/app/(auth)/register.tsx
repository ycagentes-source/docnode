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
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Logo } from '../../src/Logo';
import { Field } from '../../src/Field';
import { Button } from '../../src/Button';
import { Colors, Spacing } from '../../src/theme';
import { useAuth } from '../../src/AuthContext';
import { ApiError } from '../../src/api';

export default function Register() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async () => {
    setError('');
    if (!name || !email || !password) {
      setError('Preencha todos os campos.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }
    setLoading(true);
    try {
      await signUp(name, email, password);
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e instanceof ApiError ? e.message : 'Não foi possível criar a conta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Logo size={28} />
          </View>

          <Text style={styles.title}>Criar conta</Text>
          <Text style={styles.subtitle}>
            Organize documentos importantes em um só lugar.
          </Text>

          <View style={{ height: 24 }} />
          <Field
            testID="register-name-input"
            label="Nome completo"
            placeholder="Seu nome"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
          <View style={{ height: 12 }} />
          <Field
            testID="register-email-input"
            label="E-mail"
            placeholder="seu@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <View style={{ height: 12 }} />
          <Field
            testID="register-password-input"
            label="Senha"
            placeholder="Mínimo 6 caracteres"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <View style={{ height: 12 }} />
          <Field
            testID="register-confirm-input"
            label="Confirmar senha"
            secureTextEntry
            value={confirm}
            onChangeText={setConfirm}
          />

          {!!error && <Text style={styles.error} testID="register-error">{error}</Text>}

          <View style={{ height: 20 }} />
          <Button testID="register-submit-button" label="Criar conta" loading={loading} onPress={onSubmit} />

          <View style={styles.signupRow}>
            <Text style={styles.signupText}>Já tem conta? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity testID="register-go-login">
                <Text style={styles.signupLink}>Entrar</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Docnode by Keynode</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.xl, paddingTop: 24, flexGrow: 1 },
  header: { marginBottom: 18 },
  title: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 26, color: Colors.textPrimary, letterSpacing: -0.5 },
  subtitle: { fontFamily: 'Poppins_400Regular', fontSize: 14, color: Colors.textSecondary, marginTop: 6, lineHeight: 22 },
  signupRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 22 },
  signupText: { fontFamily: 'Poppins_400Regular', color: Colors.textSecondary, fontSize: 14 },
  signupLink: { fontFamily: 'Poppins_600SemiBold', color: Colors.primaryDark, fontSize: 14 },
  error: { color: Colors.danger, marginTop: 14, fontFamily: 'Poppins_500Medium', fontSize: 13 },
  footer: { paddingVertical: 14, alignItems: 'center' },
  footerText: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: Colors.textMuted },
});
