import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Colors, Radius, Shadow, Spacing } from '../../src/theme';
import { api } from '../../src/api';
import { PARENTESCO_LABELS, initialsFromName } from '../../src/labels';

type Familiar = {
  id: string; nome: string; parentesco: string; avatar_base64?: string | null; documentos_count: number;
};

export default function Family() {
  const router = useRouter();
  const [list, setList] = useState<Familiar[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setList(await api.get<Familiar[]>('/api/familiares')); } catch {}
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Família</Text>
          <Text style={styles.subtitle}>Organize documentos por pessoa.</Text>
        </View>
        <TouchableOpacity testID="family-add-button" onPress={() => router.push('/family/new')} style={styles.addBtn}>
          <Feather name="plus" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={list}
        keyExtractor={(f) => f.id}
        contentContainerStyle={{ padding: Spacing.xl, paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={Colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}><Feather name="users" size={28} color={Colors.primary} /></View>
            <Text style={styles.emptyTitle}>Adicione pessoas da família</Text>
            <Text style={styles.emptyText}>Organize os documentos por perfil.</Text>
            <TouchableOpacity
              testID="family-empty-add"
              onPress={() => router.push('/family/new')}
              style={styles.emptyBtn}
            >
              <Feather name="user-plus" size={16} color="#fff" />
              <Text style={styles.emptyBtnText}>Adicionar familiar</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            testID={`family-item-${item.id}`}
            style={styles.card}
            onPress={() => router.push(`/family/${item.id}`)}
          >
            {item.avatar_base64 ? (
              <Image source={{ uri: `data:image/jpeg;base64,${item.avatar_base64}` }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitials}>{initialsFromName(item.nome)}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>{item.nome}</Text>
              <Text style={styles.parentesco}>{PARENTESCO_LABELS[item.parentesco] || item.parentesco}</Text>
              <View style={styles.docsBadge}>
                <Feather name="file-text" size={11} color={Colors.primaryDark} />
                <Text style={styles.docsText}>
                  {item.documentos_count} {item.documentos_count === 1 ? 'documento' : 'documentos'}
                </Text>
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
  subtitle: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  addBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', ...Shadow.button },
  card: { backgroundColor: '#fff', borderRadius: Radius.lg, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14, ...Shadow.card },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.statusActiveBg },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { fontFamily: 'PlusJakartaSans_700Bold', color: Colors.primaryDark, fontSize: 16 },
  name: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: Colors.textPrimary },
  parentesco: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  docsBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    marginTop: 8, paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.sm, backgroundColor: Colors.statusActiveBg,
  },
  docsText: { fontFamily: 'Poppins_500Medium', fontSize: 11, color: Colors.primaryDark },
  empty: { backgroundColor: '#fff', borderRadius: Radius.lg, paddingVertical: 36, paddingHorizontal: 22, alignItems: 'center', ...Shadow.card },
  emptyIcon: { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.statusActiveBg, marginBottom: 14 },
  emptyTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 17, color: Colors.textPrimary, marginBottom: 6, textAlign: 'center' },
  emptyText: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: Colors.textSecondary, textAlign: 'center' },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 14, backgroundColor: Colors.primary, marginTop: 16 },
  emptyBtnText: { fontFamily: 'Poppins_600SemiBold', color: '#fff', fontSize: 14 },
});
