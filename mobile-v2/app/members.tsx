import { Redirect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/src/components/avatar';
import { ScreenShell } from '@/src/components/screen-shell';
import { useAuth } from '@/src/providers/auth-provider';
import { useLanguage } from '@/src/providers/language-provider';
import { getMobileMembers } from '@/src/services/modules-service';
import { theme } from '@/src/theme/theme';

export default function MembersScreen() {
  const { user } = useAuth();
  const { t } = useLanguage();

  const membersQuery = useQuery({
    queryKey: ['mobile-members', user?.id],
    queryFn: () => getMobileMembers(user!),
    enabled: Boolean(user && (user.role === 'Instructor' || user.role === 'Staff')),
  });

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (!(user.role === 'Instructor' || user.role === 'Staff')) {
    return <Redirect href="/home" />;
  }

  const members = membersQuery.data?.members || [];

  return (
    <ScreenShell user={user} title={t('members.title')} subtitle={t('members.subtitle')}>
      {members.map((member) => (
        <View key={member.id} style={styles.row}>
          <View style={styles.left}>
            <Avatar photoUrl={member.photoUrl} fullName={member.fullName} size={46} />
            <View style={styles.textWrap}>
              <Text style={styles.name}>{member.fullName}</Text>
              <Text style={styles.meta}>{member.role}</Text>
            </View>
          </View>
          <Text style={styles.license}>{member.licenseNumber || '—'}</Text>
        </View>
      ))}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    padding: 14,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  meta: {
    color: theme.colors.muted,
    fontSize: 13,
  },
  license: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
});
