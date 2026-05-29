import { Image, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/src/theme/theme';
import { getInitials } from '@/src/utils/format';

interface AvatarProps {
  photoUrl?: string | null;
  fullName: string;
  size?: number;
}

export function Avatar({ photoUrl, fullName, size = 52 }: AvatarProps) {
  const initials = getInitials(fullName);

  if (photoUrl) {
    return <Image source={{ uri: photoUrl }} style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]} />;
  }

  return (
    <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={styles.initials}>{initials || '?'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: theme.colors.canvasAlt,
  },
  fallback: {
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: theme.colors.white,
    fontSize: 18,
    fontWeight: '900',
  },
});
