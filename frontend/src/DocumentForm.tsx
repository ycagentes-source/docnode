import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Colors, Radius, Shadow, Spacing } from './theme';
import { Field } from './Field';
import { Button } from './Button';
import { Select } from './Select';
import { api, ApiError } from './api';
import { TIPO_OPTIONS, LEMBRETES_OPTIONS } from './labels';
import { pickDocument, pickImageFromCamera, pickImageFromLibrary } from './filePicker';

type Familiar = { id: string; nome: string };
type Lembrete = { dias_antes: number; ativo: boolean };

export function DocumentForm({
  documentoId,
  defaultFamiliarId,
}: {
  documentoId?: string; // present = edit mode
  defaultFamiliarId?: string;
}) {
  const router = useRouter();
  const isEdit = !!documentoId;

  const [familiares, setFamiliares] = useState<Familiar[]>([]);
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<string>('outro');
  const [familiarId, setFamiliarId] = useState<string | null>(defaultFamiliarId || null);
  const [dataEmissao, setDataEmissao] = useState('');
  const [dataVencimento, setDataVencimento] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [arquivo, setArquivo] = useState<{ base64: string; nome: string; tipo: string } | null>(null);
  const [arquivoExistente, setArquivoExistente] = useState<{ nome: string; tipo: string } | null>(null);
  const [lembretes, setLembretes] = useState<Lembrete[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try { setFamiliares(await api.get<Familiar[]>('/api/familiares')); } catch {}
      if (isEdit) {
        try {
          const d: any = await api.get(`/api/documentos/${documentoId}`);
          setNome(d.nome);
          setTipo(d.tipo);
          setFamiliarId(d.familiar_id || null);
          setDataEmissao(d.data_emissao || '');
          setDataVencimento(d.data_vencimento || '');
          setObservacoes(d.observacoes || '');
          setLembretes((d.lembretes || []).map((l: any) => ({ dias_antes: l.dias_antes, ativo: l.ativo })));
          if (d.has_arquivo) setArquivoExistente({ nome: d.arquivo_nome || 'arquivo', tipo: d.arquivo_tipo || 'application/octet-stream' });
        } catch {}
      }
    })();
  }, [isEdit, documentoId]);

  const onPickFile = async (type: 'doc' | 'camera' | 'library') => {
    try {
      const f = type === 'doc' ? await pickDocument() : type === 'camera' ? await pickImageFromCamera() : await pickImageFromLibrary();
      if (f) setArquivo({ base64: f.base64, nome: f.name, tipo: f.mimeType });
    } catch {}
  };

  const toggleLembrete = (dias: number) => {
    setLembretes((prev) => {
      const has = prev.find((l) => l.dias_antes === dias);
      if (has) return prev.filter((l) => l.dias_antes !== dias);
      return [...prev, { dias_antes: dias, ativo: true }];
    });
  };

  const onSave = async () => {
    setError('');
    if (!nome.trim()) return setError('Informe o nome do documento.');
    if (!tipo) return setError('Selecione o tipo do documento.');

    const body: any = {
      nome,
      tipo,
      familiar_id: familiarId || null,
      data_emissao: dataEmissao || null,
      data_vencimento: dataVencimento || null,
      observacoes: observacoes || null,
      lembretes,
    };
    if (arquivo) {
      body.arquivo_base64 = arquivo.base64;
      body.arquivo_nome = arquivo.nome;
      body.arquivo_tipo = arquivo.tipo;
    }
    setLoading(true);
    try {
      if (isEdit) await api.put(`/api/documentos/${documentoId}`, body);
      else await api.post('/api/documentos', body);
      router.back();
    } catch (e: any) {
      setError(e instanceof ApiError ? e.message : 'Erro ao salvar.');
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.headerRow}>
          <TouchableOpacity testID="docform-back" onPress={() => router.back()} style={styles.iconBtn}>
            <Feather name="chevron-left" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>{isEdit ? 'Editar documento' : 'Novo documento'}</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: Spacing.xl, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <Field testID="docform-nome" label="Nome do documento" placeholder="Ex.: CNH do João" value={nome} onChangeText={setNome} />
          <View style={{ height: 14 }} />
          <Select testID="docform-tipo" label="Tipo" value={tipo} onChange={setTipo} options={TIPO_OPTIONS} />
          <View style={{ height: 14 }} />
          <Select
            testID="docform-familiar"
            label="Familiar (opcional)"
            value={familiarId || ''}
            onChange={(v) => setFamiliarId(v || null)}
            options={[{ value: '', label: 'Sem familiar' }, ...familiares.map((f) => ({ value: f.id, label: f.nome }))]}
            placeholder="Selecione um familiar"
          />
          <View style={{ height: 14 }} />
          <Field testID="docform-data-emissao" label="Data de emissão (AAAA-MM-DD)" placeholder="2024-01-01" value={dataEmissao} onChangeText={setDataEmissao} autoCapitalize="none" />
          <View style={{ height: 14 }} />
          <Field testID="docform-data-vencimento" label="Data de vencimento (AAAA-MM-DD)" placeholder="2026-12-31" value={dataVencimento} onChangeText={setDataVencimento} autoCapitalize="none" />
          <View style={{ height: 14 }} />
          <Field
            testID="docform-observacoes"
            label="Observações (opcional)"
            placeholder="Detalhes importantes..."
            multiline
            numberOfLines={4}
            value={observacoes}
            onChangeText={setObservacoes}
            style={{ minHeight: 90, textAlignVertical: 'top' }}
          />

          <Text style={styles.sectionTitle}>Arquivo</Text>
          <View style={styles.fileRow}>
            <TouchableOpacity testID="docform-pick-pdf" style={styles.fileBtn} onPress={() => onPickFile('doc')}>
              <Feather name="file" size={18} color={Colors.primaryDark} />
              <Text style={styles.fileBtnText}>PDF / Imagem</Text>
            </TouchableOpacity>
            <TouchableOpacity testID="docform-pick-library" style={styles.fileBtn} onPress={() => onPickFile('library')}>
              <Feather name="image" size={18} color={Colors.primaryDark} />
              <Text style={styles.fileBtnText}>Galeria</Text>
            </TouchableOpacity>
            {Platform.OS !== 'web' && (
              <TouchableOpacity testID="docform-pick-camera" style={styles.fileBtn} onPress={() => onPickFile('camera')}>
                <Feather name="camera" size={18} color={Colors.primaryDark} />
                <Text style={styles.fileBtnText}>Câmera</Text>
              </TouchableOpacity>
            )}
          </View>
          {arquivo ? (
            <View testID="docform-file-selected" style={styles.fileInfo}>
              <Feather name="paperclip" size={14} color={Colors.primaryDark} />
              <Text style={styles.fileInfoText} numberOfLines={1}>{arquivo.nome}</Text>
              <TouchableOpacity onPress={() => setArquivo(null)}><Feather name="x" size={16} color={Colors.textSecondary} /></TouchableOpacity>
            </View>
          ) : arquivoExistente ? (
            <View style={styles.fileInfo}>
              <Feather name="paperclip" size={14} color={Colors.primaryDark} />
              <Text style={styles.fileInfoText} numberOfLines={1}>{arquivoExistente.nome} (atual)</Text>
            </View>
          ) : null}

          <Text style={styles.sectionTitle}>Lembretes antes do vencimento</Text>
          <View style={styles.lembRow}>
            {LEMBRETES_OPTIONS.map((d) => {
              const active = lembretes.some((l) => l.dias_antes === d);
              return (
                <TouchableOpacity
                  key={d}
                  testID={`docform-lembrete-${d}`}
                  onPress={() => toggleLembrete(d)}
                  style={[styles.lembChip, active && styles.lembChipActive]}
                >
                  <Text style={[styles.lembText, active && styles.lembTextActive]}>{d} dias</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {!!error && <Text style={styles.error} testID="docform-error">{error}</Text>}

          <View style={{ height: 22 }} />
          <Button testID="docform-save" label={isEdit ? 'Salvar alterações' : 'Salvar documento'} loading={loading} onPress={onSave} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  headerRow: { paddingHorizontal: Spacing.xl, paddingTop: 8, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconBtn: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', ...Shadow.card },
  title: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 18, color: Colors.textPrimary, flex: 1, textAlign: 'center' },
  sectionTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: Colors.textSecondary, marginTop: 22, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.6 },
  fileRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  fileBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: Radius.md, backgroundColor: Colors.statusActiveBg },
  fileBtnText: { fontFamily: 'Poppins_500Medium', color: Colors.primaryDark, fontSize: 13 },
  fileInfo: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, backgroundColor: '#fff', borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border },
  fileInfoText: { fontFamily: 'Poppins_500Medium', color: Colors.textPrimary, fontSize: 13, flex: 1 },
  lembRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  lembChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: Colors.border },
  lembChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  lembText: { fontFamily: 'Poppins_500Medium', fontSize: 12, color: Colors.textSecondary },
  lembTextActive: { color: '#fff' },
  error: { color: Colors.danger, marginTop: 12, fontFamily: 'Poppins_500Medium', fontSize: 13 },
});
