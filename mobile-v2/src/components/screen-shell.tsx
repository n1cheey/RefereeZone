import { ReactNode } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNav } from '@/src/components/bottom-nav';
import { theme } from '@/src/theme/theme';
import { User } from '@/src/types/domain';

const logoAsset = require('../../assets/images/icon.png');

interface ScreenShellProps {
  user: User;
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function ScreenShell({ user, title, subtitle, children }: ScreenShellProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.topBar}>
          <View style={styles.logoWrap}>
            <Image source={logoAsset} style={styles.logo} resizeMode="contain" />
            <Text style={styles.logoText}>iRefZone</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {children}
        </ScrollView>

        <BottomNav role={user.role} />
      </View>
    </SafeAreaView>
  );
}

export const sharedStyles = StyleSheet.create({
  sectionCard: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    padding: 18,
    gap: 12,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  muted: {
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: theme.colors.canvasAlt,
  },
  pillText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
});

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.canvas },
  container: { flex: 1 },
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  logoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logo: {
    width: 34,
    height: 34,
    borderRadius: 10,
  },
  logoText: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 24,
    gap: 16,
  },
  header: {
    gap: 6,
  },
  title: {
    color: theme.colors.text,
    fontSize: 30,
    fontWeight: '900',
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
});
