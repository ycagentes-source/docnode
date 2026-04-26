import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Colors, Radius, Shadow, Spacing } from '../../src/theme';
import { useAuth } from '../../src/AuthContext';
import { api, ApiError } from '../../src/api';
import { Field } from '../../src/Field';
import { Button } from '../../src/Button';
import { ConfirmModal } from '../../src/ConfirmModal';

export default function Settings() {
  const { user, signOut, refreshUser } = useAuth();
  const router = useRouter();
  const [name, setName] = useState(user?.name || '');
  const [savingName, setSavingName] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdInfo, setPwdInfo] = useState('');
  const [pwdErr, setPwdErr] = useState('');
  const [showLogout, setShowLogout] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const saveProfile = async () => {
    if (!name.trim()) return;
    setSavingName(true);
    try {
      await api.put('/api/auth/profile', { name });
      await refreshUser();
    } catch {} finally { setSavingName(false); }
  };

  const changePwd = async () => {
    setPwdInfo(''); setPwdErr('');
    if (!currentPwd || newPwd.length < 6) {
      setPwdErr('Preencha a senha atual e a nova (mín. 6 caracteres).');
      return;
    }
    setSavingPwd(true);
    try {
      await api.post('/api/auth/change-password', { current_password: currentPwd, new_password: newPwd });
      setCurrentPwd(''); setNewPwd('');
      setPwdInfo('Senha alterada com sucesso.');
    } catch (e: any) {
      setPwdErr(e instanceof ApiError ? e.message : 'Não foi possível alterar a senha.');
    } finally { setSavingPwd(false); }
  };

  const onLogout = async () => {
    setShowLogout(false);
    await signOut();
    router.replace('/(auth)/login');
  };

  const onDeleteAccount = async () => {
    setDeleting(true);
    try {
      await api.del('/api/auth/account');
      await signOut();
      router.replace('/(auth)/login');
    } catch {
    } finally { setDeleting(false); setShowDelete(false); }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: Spacing.xl, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Ajustes</Text>
          <Text style={styles.subtitle}>Sua conta e preferências.</Text>

          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(user?.name || '?').slice(0, 1).toUpperCase()}</Text>
            </View>
            <Text style={styles.profileName}>{user?.name}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
          </View>

          <SectionTitle title="Dados da conta" />
          <View style={styles.card}>
            <Field testID="settings-name-input" label="Nome" value={name} onChangeText={setName} />
            <View style={{ height: 12 }} />
            <Button testID="settings-save-name" label="Salvar" loading={savingName} onPress={saveProfile} />
          </View>

          <SectionTitle title="Alterar senha" />
          <View style={styles.card}>
            <Field
              testID="settings-current-password"
              label="Senha atual"
              secureTextEntry
              value={currentPwd}
              onChangeText={setCurrentPwd}
            />
            <View style={{ height: 12 }} />
            <Field
              testID="settings-new-password"
              label="Nova senha"
              secureTextEntry
              value={newPwd}
              onChangeText={setNewPwd}
            />
            {!!pwdInfo && <Text style={styles.info}>{pwdInfo}</Text>}
            {!!pwdErr && <Text style={styles.error}>{pwdErr}</Text>}
            <View style={{ height: 14 }} />
            <Button testID="settings-change-password" label="Alterar senha" loading={savingPwd} onPress={changePwd} />
          </View>

          <SectionTitle title="Sobre" />
          <TouchableOpacity testID="settings-about-link" style={styles.row} onPress={() => router.push('/about')}>
            <Feather name="info" size={18} color={Colors.textSecondary} />
            <Text style={styles.rowText}>Sobre o Docnode</Text>
            <Feather name="chevron-right" size={18} color={Colors.textMuted} />
          </TouchableOpacity>

          <SectionTitle title="Conta" />
          <TouchableOpacity testID="settings-logout" style={styles.row} onPress={() => setShowLogout(true)}>
            <Feather name="log-out" size={18} color={Colors.textSecondary} />
            <Text style={styles.rowText}>Sair</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="settings-delete-account" style={[styles.row, { backgroundColor: Colors.statusExpiredBg }]} onPress={() => setShowDelete(true)}>
            <Feather name="trash-2" size={18} color={Colors.danger} />
            <Text style={[styles.rowText, { color: Colors.danger }]}>Excluir conta e todos os dados</Text>
          </TouchableOpacity>

          <Text style={styles.footer}>Docnode by Keynode • v1.0</Text>
        </ScrollView>

        <ConfirmModal
          visible={showLogout}
          title="Sair da conta?"
          message="Você poderá entrar novamente quando quiser."
          confirmLabel="Sair"
          onClose={() => setShowLogout(false)}
          onConfirm={onLogout}
        />
        <ConfirmModal
          visible={showDelete}
          title="Excluir conta permanentemente?"
          message="Esta ação não pode ser desfeita. Todos os seus documentos, familiares e dados serão removidos definitivamente."
          confirmLabel="Excluir tudo"
          destructive
          loading={deleting}
          onClose={() => setShowDelete(false)}
          onConfirm={onDeleteAccount}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  title: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 26, color: Colors.textPrimary, letterSpacing: -0.5 },
  subtitle: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  profileCard: { backgroundColor: '#fff', borderRadius: Radius.lg, padding: 22, alignItems: 'center', marginTop: 18, ...Shadow.card },
  avatar: { width: 64, height: 64, borderRadius: 18, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  avatarText: { color: '#fff', fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 24 },
  profileName: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 17, color: Colors.textPrimary },
  profileEmail: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  sectionTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: Colors.textSecondary, marginTop: 24, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.6 },
  card: { backgroundColor: '#fff', borderRadius: Radius.lg, padding: 16, ...Shadow.card },
  row: {
    backgroundColor: '#fff', borderRadius: Radius.lg, padding: 16, flexDirection: 'row', alignItems: 'center',
    gap: 12, marginBottom: 8, ...Shadow.card,
  },
  rowText: { flex: 1, fontFamily: 'Poppins_500Medium', fontSize: 14, color: Colors.textPrimary },
  info: { color: Colors.primaryDark, marginTop: 8, fontFamily: 'Poppins_500Medium', fontSize: 12 },
  error: { color: Colors.danger, marginTop: 8, fontFamily: 'Poppins_500Medium', fontSize: 12 },
  footer: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: Colors.textMuted, textAlign: 'center', marginTop: 32, letterSpacing: 0.5 },
});
