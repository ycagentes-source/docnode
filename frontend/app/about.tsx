import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Colors, Radius, Shadow, Spacing } from '../src/theme';
import { Logo } from '../src/Logo';

export default function About() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerRow}>
        <TouchableOpacity testID="about-back" onPress={() => router.back()} style={styles.iconBtn}>
          <Feather name="chevron-left" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Sobre</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.xl, paddingBottom: 60 }}>
        <View style={styles.heroCard}>
          <Logo size={36} showSubtitle />
          <Text style={styles.heroTitle}>Documentos importantes em um só lugar</Text>
          <Text style={styles.heroText}>
            Organize, proteja e receba lembretes antes do vencimento. Sem complicação, sem depender de pastas
            soltas ou prints perdidos.
          </Text>
        </View>

        <Section title="Para quê serve">
          <Bullet>Cadastrar familiares e documentos pessoais.</Bullet>
          <Bullet>Anexar PDF ou foto do documento.</Bullet>
          <Bullet>Receber alertas antes de documentos vencerem.</Bullet>
          <Bullet>Encontrar contratos, CNH, exames e arquivos rapidamente.</Bullet>
        </Section>

        <Section title="Privacidade e segurança">
          <Bullet>Os documentos pertencem ao usuário.</Bullet>
          <Bullet>Cada conta acessa somente seus próprios documentos.</Bullet>
          <Bullet>Os dados não são usados para treinamento de IA.</Bullet>
          <Bullet>Você pode excluir sua conta e todos os dados a qualquer momento.</Bullet>
        </Section>

        <Section title="Sobre a marca">
          <Text style={styles.body}>
            Docnode é uma marca da Keynode, empresa de tecnologia voltada para automações, sites, aplicativos
            e organização digital. O Docnode foi pensado para famílias que precisam de simplicidade,
            confiança e controle sobre documentos importantes.
          </Text>
        </Section>

        <View style={styles.footerCard}>
          <Text style={styles.footerBrand}>Docnode by Keynode</Text>
          <Text style={styles.footerSmall}>v1.0 • MVP</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.bulletRow}>
      <View style={styles.dot} />
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  headerRow: { paddingHorizontal: Spacing.xl, paddingTop: 8, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconBtn: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', ...Shadow.card },
  title: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 18, color: Colors.textPrimary, flex: 1, textAlign: 'center' },
  heroCard: { backgroundColor: '#fff', borderRadius: Radius.xl, padding: 22, alignItems: 'center', ...Shadow.card },
  heroTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 20, color: Colors.textPrimary, textAlign: 'center', marginTop: 14, letterSpacing: -0.3 },
  heroText: { fontFamily: 'Poppins_400Regular', fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 22 },
  section: { backgroundColor: '#fff', borderRadius: Radius.lg, padding: 18, marginTop: 16, ...Shadow.card },
  sectionTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, color: Colors.textPrimary, marginBottom: 10 },
  body: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: Colors.textSecondary, lineHeight: 22 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary, marginTop: 8, marginRight: 10 },
  bulletText: { fontFamily: 'Poppins_400Regular', color: Colors.textSecondary, fontSize: 13, flex: 1, lineHeight: 22 },
  footerCard: { alignItems: 'center', marginTop: 28 },
  footerBrand: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: Colors.textPrimary, letterSpacing: 0.4 },
  footerSmall: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: Colors.textMuted, marginTop: 4 },
});
