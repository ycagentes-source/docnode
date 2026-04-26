import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Colors, Radius, Shadow, Spacing } from '../../src/theme';
import { Field } from '../../src/Field';
import { Button } from '../../src/Button';
import { Select } from '../../src/Select';
import { api, ApiError } from '../../src/api';
import { PARENTESCO_OPTIONS, initialsFromName } from '../../src/labels';
import { pickImageFromCamera, pickImageFromLibrary } from '../../src/filePicker';
import { ConfirmModal } from '../../src/ConfirmModal';

export default function FamiliarForm() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const isEdit = !!id && id !== 'new';

  const [nome, setNome] = useState('');
  const [parentesco, setParentesco] = useState('outro');
  const [dataNasc, setDataNasc] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [apagarDocs, setApagarDocs] = useState(false);
  const [docsCount, setDocsCount] = useState(0);

  useEffect(() => {
    (async () => {
      if (!isEdit) return;
      try {
        const f: any = await api.get(`/api/familiares/${id}`);
        setNome(f.nome);
        setParentesco(f.parentesco);
        setDataNasc(f.data_nascimento || '');
        setObservacoes(f.observacoes || '');
        setAvatarBase64(f.avatar_base64 || null);
        setDocsCount(f.documentos_count || 0);
      } catch {}
    })();
  }, [id, isEdit]);

  const onPickAvatar = async (source: 'camera' | 'library') => {
    try {
      const f = source === 'camera' ? await pickImageFromCamera() : await pickImageFromLibrary();
      if (f) setAvatarBase64(f.base64);
    } catch {}
  };

  const onSave = async () => {
    setError('');
    if (!nome.trim()) return setError('Informe o nome.');
    const body = {
      nome,
      parentesco,
      data_nascimento: dataNasc || null,
      observacoes: observacoes || null,
      avatar_base64: avatarBase64,
    };
    setLoading(true);
    try {
      if (isEdit) await api.put(`/api/familiares/${id}`, body);
      else await api.post('/api/familiares', body);
      router.back();
    } catch (e: any) {
      setError(e instanceof ApiError ? e.message : 'Erro ao salvar.');
    } finally { setLoading(false); }
  };

  const onDelete = async () => {
    try {
      await api.del(`/api/familiares/${id}`, { apagar_documentos: apagarDocs });
      router.back();
    } catch {} finally { setShowDelete(false); }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.headerRow}>
          <TouchableOpacity testID="famform-back" onPress={() => router.back()} style={styles.iconBtn}>
            <Feather name="chevron-left" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>{isEdit ? 'Editar familiar' : 'Novo familiar'}</Text>
          {isEdit ? (
            <TouchableOpacity testID="famform-go-docs" onPress={() => router.push({ pathname: '/(tabs)/documents', params: { familiar_id: id } })} style={styles.iconBtn}>
              <Feather name="file-text" size={18} color={Colors.textPrimary} />
            </TouchableOpacity>
          ) : <View style={{ width: 36 }} />}
        </View>

        <ScrollView contentContainerStyle={{ padding: Spacing.xl, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <View style={styles.avatarWrap}>
            {avatarBase64 ? (
              <Image source={{ uri: `data:image/jpeg;base64,${avatarBase64}` }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarInit}>{initialsFromName(nome) || '+'}</Text>
              </View>
            )}
            <View style={styles.avatarBtns}>
              <TouchableOpacity testID="famform-avatar-library" style={styles.avatarBtn} onPress={() => onPickAvatar('library')}>
                <Feather name="image" size={14} color={Colors.primaryDark} />
                <Text style={styles.avatarBtnText}>Galeria</Text>
              </TouchableOpacity>
              {Platform.OS !== 'web' && (
                <TouchableOpacity testID="famform-avatar-camera" style={styles.avatarBtn} onPress={() => onPickAvatar('camera')}>
                  <Feather name="camera" size={14} color={Colors.primaryDark} />
                  <Text style={styles.avatarBtnText}>Câmera</Text>
                </TouchableOpacity>
              )}
              {avatarBase64 && (
                <TouchableOpacity onPress={() => setAvatarBase64(null)} style={[styles.avatarBtn, { backgroundColor: '#FEE2E2' }]}>
                  <Feather name="x" size={14} color={Colors.danger} />
                  <Text style={[styles.avatarBtnText, { color: Colors.danger }]}>Remover</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <Field testID="famform-nome" label="Nome completo" placeholder="Nome completo" value={nome} onChangeText={setNome} />
          <View style={{ height: 14 }} />
          <Select testID="famform-parentesco" label="Parentesco" value={parentesco} onChange={setParentesco} options={PARENTESCO_OPTIONS} />
          <View style={{ height: 14 }} />
          <Field testID="famform-nasc" label="Data de nascimento (AAAA-MM-DD)" placeholder="1980-05-15" value={dataNasc} onChangeText={setDataNasc} autoCapitalize="none" />
          <View style={{ height: 14 }} />
          <Field
            testID="famform-obs"
            label="Observações (opcional)"
            placeholder="Detalhes..."
            multiline
            value={observacoes}
            onChangeText={setObservacoes}
            style={{ minHeight: 80, textAlignVertical: 'top' }}
          />
          {!!error && <Text style={styles.error} testID="famform-error">{error}</Text>}

          <View style={{ height: 22 }} />
          <Button testID="famform-save" label={isEdit ? 'Salvar alterações' : 'Salvar familiar'} loading={loading} onPress={onSave} />

          {isEdit && (
            <TouchableOpacity testID="famform-delete" style={styles.deleteRow} onPress={() => setShowDelete(true)}>
              <Feather name="trash-2" size={18} color={Colors.danger} />
              <Text style={styles.deleteText}>Excluir familiar</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmModal
        visible={showDelete}
        title="Excluir familiar?"
        message={
          docsCount > 0
            ? `Existem ${docsCount} documento(s) vinculados. Você pode mantê-los (sem familiar) ou apagar tudo.`
            : 'Esta ação é permanente.'
        }
        confirmLabel={apagarDocs ? 'Excluir tudo' : 'Excluir e manter docs'}
        destructive
        onClose={() => setShowDelete(false)}
        onConfirm={onDelete}
      />
      {showDelete && docsCount > 0 && (
        <View style={styles.optionRow}>
          <TouchableOpacity testID="famform-keep-docs" onPress={() => setApagarDocs(false)} style={[styles.optionBtn, !apagarDocs && styles.optionActive]}>
            <Text style={[styles.optionText, !apagarDocs && { color: '#fff' }]}>Manter documentos</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="famform-delete-docs" onPress={() => setApagarDocs(true)} style={[styles.optionBtn, apagarDocs && styles.optionActive, { backgroundColor: apagarDocs ? Colors.danger : '#fff' }]}>
            <Text style={[styles.optionText, apagarDocs && { color: '#fff' }]}>Apagar documentos</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  headerRow: { paddingHorizontal: Spacing.xl, paddingTop: 8, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconBtn: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', ...Shadow.card },
  title: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 18, color: Colors.textPrimary, flex: 1, textAlign: 'center' },
  avatarWrap: { alignItems: 'center', marginBottom: 22 },
  avatar: { width: 96, height: 96, borderRadius: 48, marginBottom: 14, backgroundColor: Colors.statusActiveBg },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInit: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 32, color: Colors.primaryDark },
  avatarBtns: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  avatarBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: Colors.statusActiveBg },
  avatarBtnText: { fontFamily: 'Poppins_500Medium', color: Colors.primaryDark, fontSize: 12 },
  error: { color: Colors.danger, marginTop: 12, fontFamily: 'Poppins_500Medium', fontSize: 13 },
  deleteRow: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center', marginTop: 22, paddingVertical: 14, borderRadius: Radius.lg, backgroundColor: Colors.statusExpiredBg },
  deleteText: { fontFamily: 'Poppins_600SemiBold', color: Colors.danger, fontSize: 14 },
  optionRow: { position: 'absolute', bottom: 200, left: 24, right: 24, flexDirection: 'row', gap: 8, justifyContent: 'center' },
  optionBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: Colors.border },
  optionActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  optionText: { fontFamily: 'Poppins_500Medium', color: Colors.textSecondary, fontSize: 12 },
});
