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

export default function Login() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async () => {
    setError('');
    if (!email || !password) {
      setError('Informe e-mail e senha.');
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e instanceof ApiError ? e.message : 'Não foi possível entrar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Logo size={32} />
          </View>

          <Text style={styles.title}>Bem-vindo de volta</Text>
          <Text style={styles.subtitle}>
            Acesse seus documentos importantes em um só lugar.
          </Text>

          <View style={{ height: 28 }} />

          <Field
            testID="login-email-input"
            label="E-mail"
            placeholder="seu@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
          />
          <View style={{ height: 14 }} />
          <Field
            testID="login-password-input"
            label="Senha"
            placeholder="••••••••"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <Link href="/(auth)/forgot-password" asChild>
            <TouchableOpacity testID="login-forgot-link" style={{ marginTop: 12, alignSelf: 'flex-end' }}>
              <Text style={styles.forgot}>Esqueci minha senha</Text>
            </TouchableOpacity>
          </Link>

          {!!error && <Text style={styles.error} testID="login-error">{error}</Text>}

          <View style={{ height: 18 }} />
          <Button testID="login-submit-button" label="Entrar" loading={loading} onPress={onSubmit} />

          <View style={styles.signupRow}>
            <Text style={styles.signupText}>Ainda não tem conta? </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity testID="login-go-register">
                <Text style={styles.signupLink}>Criar conta</Text>
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
  scroll: { padding: Spacing.xl, paddingTop: 40, flexGrow: 1 },
  header: { marginBottom: 28 },
  title: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 28,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: 6,
    lineHeight: 22,
  },
  forgot: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: Colors.primaryDark },
  signupRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 26 },
  signupText: { fontFamily: 'Poppins_400Regular', color: Colors.textSecondary, fontSize: 14 },
  signupLink: { fontFamily: 'Poppins_600SemiBold', color: Colors.primaryDark, fontSize: 14 },
  error: { color: Colors.danger, marginTop: 14, fontFamily: 'Poppins_500Medium', fontSize: 13 },
  footer: { paddingVertical: 18, alignItems: 'center' },
  footerText: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: Colors.textMuted, letterSpacing: 0.5 },
});
