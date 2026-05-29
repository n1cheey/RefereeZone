import { Image, StyleSheet, Text, View } from 'react-native';

import { getTeamLogoUri } from '@/src/services/team-logos';
import { theme } from '@/src/theme/theme';
import { getInitials } from '@/src/utils/format';

interface TeamBadgeProps {
  teamName: string;
}

export function TeamBadge({ teamName }: TeamBadgeProps) {
  const logoUri = getTeamLogoUri(teamName);

  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        {logoUri ? <Image source={{ uri: logoUri }} style={styles.icon} resizeMode="contain" /> : <Text style={styles.initials}>{getInitials(teamName)}</Text>}
      </View>
      <Text style={styles.name} numberOfLines={2}>
        {teamName}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: theme.colors.canvasAlt,
    borderWidth: 1,
    borderColor: theme.colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  icon: {
    width: 42,
    height: 42,
  },
  initials: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '900',
  },
  name: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 18,
  },
});
