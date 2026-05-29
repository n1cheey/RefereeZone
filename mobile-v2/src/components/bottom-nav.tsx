import { usePathname, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useLanguage } from '@/src/providers/language-provider';
import { getBottomNavItems } from '@/src/services/modules-service';
import { theme } from '@/src/theme/theme';
import { UserRole } from '@/src/types/domain';

interface BottomNavProps {
  role: UserRole;
}

export function BottomNav({ role }: BottomNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLanguage();
  const items = getBottomNavItems(role);

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {items.map((item) => {
          const active = pathname === item.route;
          return (
            <Pressable
              key={item.key}
              style={[styles.item, active ? styles.itemActive : null]}
              onPress={() => router.replace(item.route as never)}
            >
              <Text style={[styles.label, active ? styles.labelActive : null]}>{t(item.labelKey)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.line,
    backgroundColor: 'rgba(255,255,255,0.96)',
    paddingTop: 10,
    paddingBottom: 14,
  },
  row: {
    paddingHorizontal: 16,
    gap: 10,
  },
  item: {
    minHeight: 42,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.card,
  },
  itemActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  label: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  labelActive: {
    color: theme.colors.white,
  },
});
