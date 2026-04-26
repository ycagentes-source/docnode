import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Colors, Radius, Shadow, Spacing } from '../../src/theme';
import { api } from '../../src/api';
import { StatusBadge } from '../../src/StatusBadge';
import { TIPO_LABELS, formatDateBR } from '../../src/labels';

type Doc = {
  id: string; nome: string; tipo: string; familiar_nome?: string | null;
  data_vencimento?: string | null; status: string;
};
type Buckets = { vencidos: Doc[]; proximos_7: Doc[]; proximos_30: Doc[]; depois: Doc[] };

export default function Expirations() {
  const router = useRouter();
  const [buckets, setBuckets] = useState<Buckets | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get<Buckets>('/api/vencimentos');
      setBuckets(data);
    } catch {}
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const total = (buckets?.vencidos.length ?? 0) + (buckets?.proximos_7.length ?? 0) + (buckets?.proximos_30.length ?? 0) + (buckets?.depois.length ?? 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={{ paddingHorizontal: Spacing.xl, paddingTop: 8 }}>
        <Text style={styles.title}>Vencimentos</Text>
        <Text style={styles.subtitle}>Acompanhe o que precisa de atenção.</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: Spacing.xl, paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {total === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Feather name="check-circle" size={28} color={Colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Nenhum vencimento próximo</Text>
            <Text style={styles.emptyText}>Tudo certo por enquanto.</Text>
          </View>
        ) : (
          <>
            <Section title="Vencidos" docs={buckets?.vencidos || []} accent={Colors.statusExpired} onPress={(id) => router.push(`/document/${id}`)} />
            <Section title="Próximos 7 dias" docs={buckets?.proximos_7 || []} accent={Colors.statusExpiring} onPress={(id) => router.push(`/document/${id}`)} />
            <Section title="Próximos 30 dias" docs={buckets?.proximos_30 || []} accent={Colors.primary} onPress={(id) => router.push(`/document/${id}`)} />
            <Section title="Depois" docs={buckets?.depois || []} accent={Colors.textMuted} onPress={(id) => router.push(`/document/${id}`)} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, docs, accent, onPress }: { title: string; docs: Doc[]; accent: string; onPress: (id: string) => void }) {
  if (docs.length === 0) return null;
  return (
    <View style={{ marginBottom: 22 }}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionDot, { backgroundColor: accent }]} />
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionCount}>{docs.length}</Text>
      </View>
      {docs.map((d) => (
        <TouchableOpacity
          key={d.id}
          testID={`expiration-doc-${d.id}`}
          style={styles.docCard}
          onPress={() => onPress(d.id)}
        >
          <View style={styles.docIcon}>
            <Feather name="file-text" size={18} color={Colors.primaryDark} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.docTitle} numberOfLines={1}>{d.nome}</Text>
            <Text style={styles.docMeta} numberOfLines={1}>
              {TIPO_LABELS[d.tipo] || d.tipo}
              {d.familiar_nome ? ` • ${d.familiar_nome}` : ''}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
              <StatusBadge status={d.status} small />
              <Text style={styles.docDate}>Vence: {formatDateBR(d.data_vencimento)}</Text>
            </View>
          </View>
          <Feather name="chevron-right" size={20} color={Colors.textMuted} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  title: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 26, color: Colors.textPrimary, letterSpacing: -0.5 },
  subtitle: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  sectionTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 18, color: Colors.textPrimary, flex: 1 },
  sectionCount: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: Colors.textSecondary },
  docCard: {
    backgroundColor: '#fff', borderRadius: Radius.lg, padding: 14, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center', gap: 12, ...Shadow.card,
  },
  docIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.statusActiveBg },
  docTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: Colors.textPrimary },
  docMeta: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  docDate: { fontFamily: 'Poppins_500Medium', fontSize: 11, color: Colors.textSecondary },
  empty: { backgroundColor: '#fff', borderRadius: Radius.lg, paddingVertical: 36, alignItems: 'center', ...Shadow.card },
  emptyIcon: { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.statusActiveBg, marginBottom: 14 },
  emptyTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 17, color: Colors.textPrimary, marginBottom: 6 },
  emptyText: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: Colors.textSecondary },
});
