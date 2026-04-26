import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Colors, Radius, Shadow, Spacing } from '../../src/theme';
import { api } from '../../src/api';
import { StatusBadge } from '../../src/StatusBadge';
import { TIPO_LABELS, formatDateBR } from '../../src/labels';
import { ConfirmModal } from '../../src/ConfirmModal';
import { shareOrDownload } from '../../src/share';

type Doc = {
  id: string; nome: string; tipo: string; familiar_id?: string | null; familiar_nome?: string | null;
  data_emissao?: string | null; data_vencimento?: string | null; observacoes?: string | null;
  has_arquivo: boolean; arquivo_nome?: string | null; arquivo_tipo?: string | null; arquivo_base64?: string | null;
  status: string; lembretes: { dias_antes: number; ativo: boolean }[];
  created_at: string; updated_at: string;
};

export default function DocumentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [doc, setDoc] = useState<Doc | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setDoc(await api.get<Doc>(`/api/documentos/${id}`));
    } catch {} finally { setLoading(false); }
  }, [id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onShare = async () => {
    if (!doc?.arquivo_base64 || !doc.arquivo_nome) return;
    await shareOrDownload(doc.arquivo_base64, doc.arquivo_nome, doc.arquivo_tipo || 'application/octet-stream');
  };

  const onDelete = async () => {
    setDeleting(true);
    try {
      await api.del(`/api/documentos/${id}`);
      router.back();
    } catch {} finally { setDeleting(false); setShowDelete(false); }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }
  if (!doc) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={{ padding: 24 }}>Documento não encontrado.</Text>
      </SafeAreaView>
    );
  }

  const isImage = doc.arquivo_tipo?.startsWith('image/');
  const isPdf = doc.arquivo_tipo === 'application/pdf';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerRow}>
        <TouchableOpacity testID="docdetail-back" onPress={() => router.back()} style={styles.iconBtn}>
          <Feather name="chevron-left" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{doc.nome}</Text>
        <TouchableOpacity testID="docdetail-edit" onPress={() => router.push(`/document/edit/${doc.id}`)} style={styles.iconBtn}>
          <Feather name="edit-2" size={18} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.xl, paddingBottom: 60 }}>
        <View style={styles.statusRow}>
          <StatusBadge status={doc.status} />
          <Text style={styles.tipoText}>{TIPO_LABELS[doc.tipo] || doc.tipo}</Text>
        </View>

        <View style={styles.previewBox}>
          {doc.has_arquivo && isImage && doc.arquivo_base64 ? (
            <Image
              source={{ uri: `data:${doc.arquivo_tipo};base64,${doc.arquivo_base64}` }}
              style={styles.preview}
              resizeMode="contain"
            />
          ) : doc.has_arquivo && isPdf ? (
            <View style={styles.previewPlaceholder}>
              <View style={[styles.previewIcon, { backgroundColor: '#FEE2E2' }]}>
                <Feather name="file-text" size={36} color="#991B1B" />
              </View>
              <Text style={styles.previewTitle}>Documento PDF</Text>
              <Text style={styles.previewText} numberOfLines={1}>{doc.arquivo_nome}</Text>
            </View>
          ) : (
            <View style={styles.previewPlaceholder}>
              <View style={styles.previewIcon}><Feather name="file" size={36} color={Colors.textMuted} /></View>
              <Text style={styles.previewTitle}>Sem arquivo anexado</Text>
              <Text style={styles.previewText}>Edite o documento para anexar uma foto ou PDF.</Text>
            </View>
          )}
        </View>

        {doc.has_arquivo && (
          <TouchableOpacity testID="docdetail-share" style={styles.shareBtn} onPress={onShare}>
            <Feather name="share-2" size={18} color="#fff" />
            <Text style={styles.shareBtnText}>{Platform.OS === 'web' ? 'Baixar / Compartilhar' : 'Compartilhar arquivo'}</Text>
          </TouchableOpacity>
        )}

        <View style={styles.metaCard}>
          <Meta label="Familiar" value={doc.familiar_nome || '—'} />
          <Meta label="Data de emissão" value={formatDateBR(doc.data_emissao)} />
          <Meta label="Data de vencimento" value={formatDateBR(doc.data_vencimento)} />
          <Meta label="Última atualização" value={formatDateBR(doc.updated_at)} />
        </View>

        {!!(doc.observacoes && doc.observacoes.trim()) && (
          <View style={styles.notes}>
            <Text style={styles.notesLabel}>Observações</Text>
            <Text style={styles.notesText}>{doc.observacoes}</Text>
          </View>
        )}

        {doc.lembretes.length > 0 && (
          <View style={{ marginTop: 16 }}>
            <Text style={styles.notesLabel}>Lembretes</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {doc.lembretes.map((l) => (
                <View key={l.dias_antes} style={styles.lemb}>
                  <Feather name="bell" size={11} color={Colors.primaryDark} />
                  <Text style={styles.lembText}>{l.dias_antes} dias antes</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <TouchableOpacity testID="docdetail-delete" style={styles.deleteRow} onPress={() => setShowDelete(true)}>
          <Feather name="trash-2" size={18} color={Colors.danger} />
          <Text style={styles.deleteText}>Excluir documento</Text>
        </TouchableOpacity>
      </ScrollView>

      <ConfirmModal
        visible={showDelete}
        title="Excluir documento?"
        message="Esta ação é permanente e não pode ser desfeita."
        confirmLabel="Excluir"
        destructive
        loading={deleting}
        onClose={() => setShowDelete(false)}
        onConfirm={onDelete}
      />
    </SafeAreaView>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  headerRow: {
    paddingHorizontal: Spacing.xl, paddingTop: 8, paddingBottom: 8,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  iconBtn: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', ...Shadow.card },
  title: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 17, color: Colors.textPrimary, flex: 1, textAlign: 'center', marginHorizontal: 8 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  tipoText: { fontFamily: 'Poppins_500Medium', color: Colors.textSecondary, fontSize: 13 },
  previewBox: { backgroundColor: '#fff', borderRadius: Radius.lg, overflow: 'hidden', ...Shadow.card, minHeight: 220 },
  preview: { width: '100%', height: 320 },
  previewPlaceholder: { alignItems: 'center', justifyContent: 'center', padding: 36 },
  previewIcon: { width: 76, height: 76, borderRadius: 20, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  previewTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16, color: Colors.textPrimary },
  previewText: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: Colors.textSecondary, marginTop: 4, textAlign: 'center' },
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14, paddingVertical: 14, borderRadius: Radius.lg, backgroundColor: Colors.primary, ...Shadow.button },
  shareBtnText: { color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 14 },
  metaCard: { backgroundColor: '#fff', borderRadius: Radius.lg, padding: 8, marginTop: 22, ...Shadow.card },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  metaLabel: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: Colors.textSecondary },
  metaValue: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: Colors.textPrimary, maxWidth: '60%' },
  notes: { backgroundColor: '#fff', borderRadius: Radius.lg, padding: 16, marginTop: 16, ...Shadow.card },
  notesLabel: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6 },
  notesText: { fontFamily: 'Poppins_400Regular', color: Colors.textPrimary, fontSize: 14, marginTop: 8, lineHeight: 22 },
  lemb: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: Colors.statusActiveBg, borderRadius: 999 },
  lembText: { fontFamily: 'Poppins_500Medium', color: Colors.primaryDark, fontSize: 11 },
  deleteRow: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center', marginTop: 28, paddingVertical: 14, borderRadius: Radius.lg, backgroundColor: Colors.statusExpiredBg },
  deleteText: { fontFamily: 'Poppins_600SemiBold', color: Colors.danger, fontSize: 14 },
});
