import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { useLanguage } from '@/src/providers/language-provider';
import { getBottomNavItems } from '@/src/services/modules-service';
import { theme } from '@/src/theme/theme';
import { UserRole } from '@/src/types/domain';

const logoAsset = require('../../assets/images/icon.png');

interface BottomNavProps {
  role: UserRole;
}

function NavIcon({ itemKey, active }: { itemKey: string; active: boolean }) {
  const color = active ? theme.colors.navActive : theme.colors.navMuted;
  const size = 22;

  switch (itemKey) {
    case 'home':
      return <Image source={logoAsset} style={[styles.logoIcon, active ? styles.logoIconActive : null]} resizeMode="contain" />;
    case 'games':
      return <Ionicons name="basketball-outline" size={size} color={color} />;
    case 'chat':
      return <Ionicons name="chatbubble-ellipses-outline" size={size} color={color} />;
    case 'reports':
      return <Ionicons name="document-text-outline" size={size} color={color} />;
    case 'ranking':
      return <MaterialCommunityIcons name="chart-bar" size={size} color={color} />;
    case 'news':
      return <Ionicons name="newspaper-outline" size={size} color={color} />;
    case 'members':
      return <Ionicons name="people-outline" size={size} color={color} />;
    case 'profile':
      return <Ionicons name="person-outline" size={size} color={color} />;
    case 'finance':
      return <MaterialCommunityIcons name="cash-multiple" size={size} color={color} />;
    default:
      return <Ionicons name="ellipse-outline" size={size} color={color} />;
  }
}

export function BottomNav({ role }: BottomNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLanguage();
  const items = getBottomNavItems(role);

  return (
    <View style={styles.wrap}>
      <View style={styles.grid}>
        {items.map((item) => {
          const active = pathname === item.route;

          return (
            <Pressable
              key={item.key}
              style={styles.item}
              onPress={() => router.replace(item.route as never)}
            >
              <View style={[styles.iconSlot, active ? styles.iconSlotActive : null]}>
                <NavIcon itemKey={item.key} active={active} />
              </View>
              <Text style={[styles.label, active ? styles.labelActive : null]} numberOfLines={1}>
                {t(item.labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#2b0e17',
    paddingTop: 10,
    paddingBottom: 14,
    paddingHorizontal: 6,
  },
  grid: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 2,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 2,
  },
  iconSlot: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  iconSlotActive: {
    backgroundColor: 'rgba(255,163,31,0.18)',
  },
  logoIcon: {
    width: 22,
    height: 22,
    opacity: 0.84,
  },
  logoIconActive: {
    opacity: 1,
  },
  label: {
    color: theme.colors.navMuted,
    fontSize: 9,
    fontWeight: '800',
    textAlign: 'center',
  },
  labelActive: {
    color: theme.colors.navActive,
  },
});
