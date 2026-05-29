import { ReactNode } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNav } from '@/src/components/bottom-nav';
import { useSeason } from '@/src/providers/season-provider';
import { theme } from '@/src/theme/theme';
import { User } from '@/src/types/domain';

const logoAsset = require('../../assets/images/icon.png');

interface ScreenShellProps {
  user: User;
  title: string;
  subtitle?: string;
  children: ReactNode;
  showSeasonSwitcher?: boolean;
}

export function ScreenShell({ user, title, subtitle, children, showSeasonSwitcher = false }: ScreenShellProps) {
  const { seasonId, setSeasonId } = useSeason();

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
            {title ? <Text style={styles.title}>{title}</Text> : null}
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            {showSeasonSwitcher ? (
              <View style={styles.seasonRow}>
                {(['2025-2026', '2026-2027'] as const).map((item) => {
                  const active = seasonId === item;
                  return (
                    <Pressable
                      key={item}
                      style={[styles.seasonChip, active ? styles.seasonChipActive : null]}
                      onPress={() => setSeasonId(item)}
                    >
                      <Text style={[styles.seasonChipText, active ? styles.seasonChipTextActive : null]}>
                        {item}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
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
    shadowColor: '#2b0e17',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
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
    gap: 10,
    paddingBottom: 4,
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
  seasonRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 4,
  },
  seasonChip: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.card,
    justifyContent: 'center',
  },
  seasonChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  seasonChipText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '900',
  },
  seasonChipTextActive: {
    color: theme.colors.white,
  },
});
