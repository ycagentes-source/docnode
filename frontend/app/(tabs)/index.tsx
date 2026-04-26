import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Colors, Radius, Shadow, Spacing } from '../../src/theme';
import { api } from '../../src/api';
import { useAuth } from '../../src/AuthContext';
import { Field } from '../../src/Field';
import { StatusBadge } from '../../src/StatusBadge';
import { TIPO_LABELS, formatDateBR } from '../../src/labels';

type Doc = {
  id: string;
  nome: string;
  tipo: string;
  familiar_nome?: string | null;
  data_vencimento?: string | null;
  status: string;
};

type Dashboard = {
  user_name: string;
  familiares_count: number;
  documentos_count: number;
  documentos_vencidos: number;
  documentos_vencendo: number;
  documentos_sem_vencimento: number;
  proximos_vencimentos: Doc[];
};

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<Dashboard | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const d = await api.get<Dashboard>('/api/dashboard');
      setData(d);
    } catch {
      // ignore (auth may be loading)
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const goSearch = () => {
    router.push({ pathname: '/(tabs)/documents', params: { q: search } });
  };

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  })();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl tintColor={Colors.primary} refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>{greeting},</Text>
          <Text testID="dashboard-username" style={styles.userName}>
            {user?.name || data?.user_name || ''}
          </Text>
        </View>

        <View style={styles.searchWrap}>
          <Feather name="search" size={18} color={Colors.textMuted} />
          <Field
            testID="dashboard-search-input"
            placeholder="Buscar documento, familiar ou tipo..."
            containerStyle={{ flex: 1 }}
            style={{
              borderWidth: 0,
              backgroundColor: 'transparent',
              paddingVertical: 12,
              paddingHorizontal: 8,
            }}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={goSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity testID="dashboard-search-clear" onPress={() => setSearch('')}>
              <Feather name="x-circle" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.statRow}>
          <StatCard
            testID="stat-cadastrados"
            color={Colors.primaryDark}
            bg={Colors.statusActiveBg}
            value={data?.documentos_count ?? 0}
            label="Cadastrados"
            icon="file-text"
            onPress={() => router.push('/(tabs)/documents')}
          />
          <StatCard
            testID="stat-vencidos"
            color={Colors.statusExpired}
            bg={Colors.statusExpiredBg}
            value={data?.documentos_vencidos ?? 0}
            label="Vencidos"
            icon="alert-circle"
            onPress={() => router.push({ pathname: '/(tabs)/documents', params: { status: 'vencido' } })}
          />
        </View>
        <View style={styles.statRow}>
          <StatCard
            testID="stat-vencendo"
            color="#92400E"
            bg={Colors.statusExpiringBg}
            value={data?.documentos_vencendo ?? 0}
            label="Vencendo"
            icon="clock"
            onPress={() => router.push({ pathname: '/(tabs)/documents', params: { status: 'vencendo_em_breve' } })}
          />
          <StatCard
            testID="stat-familiares"
            color={Colors.primaryDark}
            bg="#EFF6FF"
            value={data?.familiares_count ?? 0}
            label="Familiares"
            icon="users"
            onPress={() => router.push('/(tabs)/family')}
          />
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            testID="dashboard-add-document"
            style={[styles.actionBtn, { backgroundColor: Colors.primary }]}
            onPress={() => router.push('/document/new')}
          >
            <Feather name="plus-circle" size={18} color="#fff" />
            <Text style={[styles.actionText, { color: '#fff' }]}>Adicionar documento</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="dashboard-add-family"
            style={[styles.actionBtn, { backgroundColor: Colors.statusActiveBg }]}
            onPress={() => router.push('/family/new')}
          >
            <Feather name="user-plus" size={18} color={Colors.primaryDark} />
            <Text style={[styles.actionText, { color: Colors.primaryDark }]}>Adicionar familiar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Próximos vencimentos</Text>
          <TouchableOpacity testID="dashboard-see-all" onPress={() => router.push('/(tabs)/expirations')}>
            <Text style={styles.sectionLink}>Ver todos</Text>
          </TouchableOpacity>
        </View>

        {(!data?.proximos_vencimentos || data.proximos_vencimentos.length === 0) ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Feather name="check-circle" size={28} color={Colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Tudo certo por enquanto</Text>
            <Text style={styles.emptyText}>Nenhum vencimento próximo.</Text>
          </View>
        ) : (
          data.proximos_vencimentos.map((d) => (
            <TouchableOpacity
              key={d.id}
              testID={`dashboard-doc-${d.id}`}
              style={styles.docCard}
              onPress={() => router.push(`/document/${d.id}`)}
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
                <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <StatusBadge status={d.status} small />
                  <Text style={styles.docDate}>Vence: {formatDateBR(d.data_vencimento)}</Text>
                </View>
              </View>
              <Feather name="chevron-right" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          ))
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  value, label, icon, color, bg, onPress, testID,
}: { value: number; label: string; icon: any; color: string; bg: string; onPress: () => void; testID: string }) {
  return (
    <TouchableOpacity testID={testID} onPress={onPress} style={[styles.statCard, { backgroundColor: '#fff' }]}>
      <View style={[styles.statIcon, { backgroundColor: bg }]}>
        <Feather name={icon} size={18} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.xl, paddingBottom: 60 },
  header: { marginBottom: 14 },
  greeting: { fontFamily: 'Poppins_400Regular', fontSize: 14, color: Colors.textSecondary },
  userName: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 26, color: Colors.textPrimary, letterSpacing: -0.5 },
  searchWrap: {
    backgroundColor: '#fff', borderRadius: Radius.lg, paddingHorizontal: 14, paddingRight: 12,
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Colors.border, marginBottom: 18,
  },
  statRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statCard: { flex: 1, borderRadius: Radius.lg, padding: 16, ...Shadow.card },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 24, color: Colors.textPrimary, letterSpacing: -0.5 },
  statLabel: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 6, marginBottom: 22 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: Radius.lg,
  },
  actionText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 },
  sectionTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 18, color: Colors.textPrimary },
  sectionLink: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: Colors.primaryDark },
  docCard: {
    backgroundColor: '#fff', borderRadius: Radius.lg, padding: 14, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center', gap: 12, ...Shadow.card,
  },
  docIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.statusActiveBg },
  docTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: Colors.textPrimary },
  docMeta: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  docDate: { fontFamily: 'Poppins_500Medium', fontSize: 11, color: Colors.textSecondary },
  empty: {
    backgroundColor: '#fff', borderRadius: Radius.lg, paddingVertical: 32, paddingHorizontal: 16,
    alignItems: 'center', ...Shadow.card,
  },
  emptyIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.statusActiveBg, marginBottom: 12 },
  emptyTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16, color: Colors.textPrimary, marginBottom: 4 },
  emptyText: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: Colors.textSecondary, textAlign: 'center' },
});
