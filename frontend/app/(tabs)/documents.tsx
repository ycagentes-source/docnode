import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Colors, Radius, Shadow, Spacing } from '../../src/theme';
import { api } from '../../src/api';
import { Field } from '../../src/Field';
import { StatusBadge } from '../../src/StatusBadge';
import { TIPO_LABELS, formatDateBR } from '../../src/labels';

type Doc = {
  id: string; nome: string; tipo: string; familiar_nome?: string | null;
  data_vencimento?: string | null; status: string;
};

const FILTERS = [
  { key: 'todos', label: 'Todos' },
  { key: 'vencido', label: 'Vencidos' },
  { key: 'vencendo_em_breve', label: 'Vencendo' },
  { key: 'ativo', label: 'Ativos' },
  { key: 'sem_vencimento', label: 'Sem vencimento' },
];

export default function Documents() {
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string; status?: string; familiar_id?: string }>();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [search, setSearch] = useState((params.q as string) || '');
  const [filter, setFilter] = useState<string>((params.status as string) || 'todos');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const qs = new URLSearchParams();
    if (search) qs.set('q', search);
    if (filter && filter !== 'todos') qs.set('status_filter', filter);
    if (params.familiar_id) qs.set('familiar_id', params.familiar_id as string);
    try {
      const data = await api.get<Doc[]>(`/api/documentos?${qs.toString()}`);
      setDocs(data);
    } catch {}
  }, [search, filter, params.familiar_id]);

  useEffect(() => {
    if (params.q) setSearch(params.q as string);
    if (params.status) setFilter(params.status as string);
  }, [params.q, params.status]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const empty = useMemo(() => docs.length === 0, [docs.length]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Documentos</Text>
        <TouchableOpacity testID="documents-add-button" onPress={() => router.push('/document/new')} style={styles.addBtn}>
          <Feather name="plus" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <Feather name="search" size={18} color={Colors.textMuted} />
        <Field
          testID="documents-search-input"
          placeholder="Buscar documentos..."
          containerStyle={{ flex: 1 }}
          style={{ borderWidth: 0, backgroundColor: 'transparent', paddingVertical: 12, paddingHorizontal: 8 }}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={load}
          returnKeyType="search"
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            testID={`documents-filter-${f.key}`}
            onPress={() => setFilter(f.key)}
            style={[styles.chip, filter === f.key && styles.chipActive]}
          >
            <Text style={[styles.chipText, filter === f.key && styles.chipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={docs}
        keyExtractor={(d) => d.id}
        contentContainerStyle={{ padding: Spacing.xl, paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ListEmptyComponent={
          empty ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Feather name="file-text" size={28} color={Colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>Nenhum documento encontrado</Text>
              <Text style={styles.emptyText}>
                Você ainda não adicionou documentos. Comece salvando um documento importante.
              </Text>
              <TouchableOpacity
                testID="documents-empty-add"
                onPress={() => router.push('/document/new')}
                style={styles.emptyBtn}
              >
                <Feather name="plus-circle" size={16} color="#fff" />
                <Text style={styles.emptyBtnText}>Adicionar documento</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            testID={`document-item-${item.id}`}
            style={styles.docCard}
            onPress={() => router.push(`/document/${item.id}`)}
          >
            <View style={styles.docIcon}>
              <Feather name="file-text" size={18} color={Colors.primaryDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.docTitle} numberOfLines={1}>{item.nome}</Text>
              <Text style={styles.docMeta} numberOfLines={1}>
                {TIPO_LABELS[item.tipo] || item.tipo}
                {item.familiar_nome ? ` • ${item.familiar_nome}` : ''}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                <StatusBadge status={item.status} small />
                {item.data_vencimento && (
                  <Text style={styles.docDate}>Vence: {formatDateBR(item.data_vencimento)}</Text>
                )}
              </View>
            </View>
            <Feather name="chevron-right" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  headerRow: { paddingHorizontal: Spacing.xl, paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 26, color: Colors.textPrimary, letterSpacing: -0.5 },
  addBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', ...Shadow.button },
  searchWrap: {
    marginHorizontal: Spacing.xl, marginTop: 12, backgroundColor: '#fff', borderRadius: Radius.lg, paddingHorizontal: 14,
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  chipsRow: { paddingHorizontal: Spacing.xl, paddingVertical: 14, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: Colors.border, marginRight: 8 },
  chipActive: { backgroundColor: Colors.primaryDark, borderColor: Colors.primaryDark },
  chipText: { fontFamily: 'Poppins_500Medium', fontSize: 12, color: Colors.textSecondary },
  chipTextActive: { color: '#fff' },
  docCard: {
    backgroundColor: '#fff', borderRadius: Radius.lg, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12, ...Shadow.card,
  },
  docIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.statusActiveBg },
  docTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: Colors.textPrimary },
  docMeta: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  docDate: { fontFamily: 'Poppins_500Medium', fontSize: 11, color: Colors.textSecondary },
  empty: { backgroundColor: '#fff', borderRadius: Radius.lg, paddingVertical: 36, paddingHorizontal: 22, alignItems: 'center', ...Shadow.card },
  emptyIcon: { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.statusActiveBg, marginBottom: 14 },
  emptyTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 17, color: Colors.textPrimary, marginBottom: 6, textAlign: 'center' },
  emptyText: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 14, backgroundColor: Colors.primary, marginTop: 16 },
  emptyBtnText: { fontFamily: 'Poppins_600SemiBold', color: '#fff', fontSize: 14 },
});
