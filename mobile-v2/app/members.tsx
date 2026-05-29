import { Redirect } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useEffect, useMemo, useState } from 'react';

import { Avatar } from '@/src/components/avatar';
import { ScreenShell, sharedStyles } from '@/src/components/screen-shell';
import { useAuth } from '@/src/providers/auth-provider';
import { useLanguage } from '@/src/providers/language-provider';
import {
  addMobileAllowedAccess,
  deleteMobileAllowedAccess,
  deleteMobileMember,
  getMobileAllowedAccess,
  getMobileMemberDetail,
  getMobileMembers,
  updateMobileMember,
} from '@/src/services/modules-service';
import { theme } from '@/src/theme/theme';
import { UserRole } from '@/src/types/domain';

type MembersTab = 'directory' | 'access';

const visibleDirectoryRoles: UserRole[] = ['Referee', 'TO', 'TO Supervisor', 'Staff', 'Financialist'];
const accessRoles: UserRole[] = ['Referee', 'TO', 'TO Supervisor', 'Staff', 'Financialist'];

export default function MembersScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<MembersTab>('directory');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [accessEmail, setAccessEmail] = useState('');
  const [accessLicense, setAccessLicense] = useState('');
  const [accessRole, setAccessRole] = useState<UserRole>('Referee');
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editLicense, setEditLicense] = useState('');
  const [editPhoto, setEditPhoto] = useState('');

  const membersQuery = useQuery({
    queryKey: ['mobile-members', user?.id],
    queryFn: () => getMobileMembers(user!),
    enabled: Boolean(user && (user.role === 'Instructor' || user.role === 'Staff')),
  });

  const accessQuery = useQuery({
    queryKey: ['mobile-allowed-access', user?.id],
    queryFn: () => getMobileAllowedAccess(user!),
    enabled: Boolean(user && user.role === 'Instructor'),
  });

  const memberDetailQuery = useQuery({
    queryKey: ['mobile-member-detail', selectedMemberId],
    queryFn: () => getMobileMemberDetail(selectedMemberId!),
    enabled: Boolean(selectedMemberId),
  });

  useEffect(() => {
    const member = memberDetailQuery.data?.member;
    if (!member) {
      return;
    }

    setEditName(member.fullName);
    setEditEmail(member.email);
    setEditLicense(member.licenseNumber || '');
    setEditPhoto(member.photoUrl || '');
  }, [memberDetailQuery.data?.member]);

  const addAccessMutation = useMutation({
    mutationFn: () => addMobileAllowedAccess(user!, { email: accessEmail, licenseNumber: accessLicense, role: accessRole }),
    onSuccess: async () => {
      setAccessEmail('');
      setAccessLicense('');
      await queryClient.invalidateQueries({ queryKey: ['mobile-allowed-access', user?.id] });
    },
  });

  const deleteAccessMutation = useMutation({
    mutationFn: (accessId: string) => deleteMobileAllowedAccess(user!, accessId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['mobile-allowed-access', user?.id] });
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: () =>
      updateMobileMember(user!, {
        memberId: selectedMemberId!,
        email: editEmail,
        fullName: editName,
        licenseNumber: editLicense,
        photoUrl: editPhoto,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['mobile-members', user?.id] });
      await queryClient.invalidateQueries({ queryKey: ['mobile-member-detail', selectedMemberId] });
    },
  });

  const deleteMemberMutation = useMutation({
    mutationFn: () => deleteMobileMember(user!, selectedMemberId!),
    onSuccess: async () => {
      setSelectedMemberId(null);
      await queryClient.invalidateQueries({ queryKey: ['mobile-members', user?.id] });
    },
  });

  const members = (membersQuery.data?.members || []).filter((item) => visibleDirectoryRoles.includes(item.role));
  const accessList = accessQuery.data?.accessList || [];
  const member = memberDetailQuery.data?.member;

  const roleSummary = useMemo(() => {
    const refereeCount = members.filter((item) => item.role === 'Referee').length;
    const toCount = members.filter((item) => item.role === 'TO' || item.role === 'TO Supervisor').length;
    return { refereeCount, toCount };
  }, [members]);

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (!(user.role === 'Instructor' || user.role === 'Staff')) {
    return <Redirect href="/home" />;
  }

  return (
    <ScreenShell user={user} title={t('members.title')} subtitle={t('members.subtitle')}>
      <View style={styles.segmentWrap}>
        <Pressable
          style={[styles.segmentButton, activeTab === 'directory' ? styles.segmentButtonActive : null]}
          onPress={() => setActiveTab('directory')}
        >
          <Text style={[styles.segmentText, activeTab === 'directory' ? styles.segmentTextActive : null]}>Directory</Text>
        </Pressable>
        {user.role === 'Instructor' ? (
          <Pressable
            style={[styles.segmentButton, activeTab === 'access' ? styles.segmentButtonActive : null]}
            onPress={() => setActiveTab('access')}
          >
            <Text style={[styles.segmentText, activeTab === 'access' ? styles.segmentTextActive : null]}>Add Access</Text>
          </Pressable>
        ) : null}
      </View>

      {activeTab === 'directory' ? (
        <>
          <View style={styles.summaryRow}>
            <View style={[sharedStyles.sectionCard, styles.summaryCard]}>
              <Text style={styles.summaryLabel}>Referees</Text>
              <Text style={styles.summaryValue}>{roleSummary.refereeCount}</Text>
            </View>
            <View style={[sharedStyles.sectionCard, styles.summaryCard]}>
              <Text style={styles.summaryLabel}>TO / Supervisors</Text>
              <Text style={styles.summaryValue}>{roleSummary.toCount}</Text>
            </View>
          </View>

          {members.map((item) => (
            <Pressable
              key={item.id}
              style={[styles.memberCard, selectedMemberId === item.id ? styles.memberCardActive : null]}
              onPress={() => setSelectedMemberId(item.id)}
            >
              <View style={styles.memberCardTop}>
                <Avatar photoUrl={item.photoUrl} fullName={item.fullName} size={54} />
                <View style={styles.memberCardText}>
                  <Text style={styles.memberName}>{item.fullName}</Text>
                  <Text style={styles.memberMeta}>{item.role}</Text>
                </View>
              </View>
              <View style={styles.memberTags}>
                <View style={sharedStyles.pill}>
                  <Text style={sharedStyles.pillText}>{item.licenseNumber || 'No license'}</Text>
                </View>
              </View>
            </Pressable>
          ))}

          {member ? (
            <View style={[sharedStyles.sectionCard, styles.detailCard]}>
              <View style={styles.detailHeader}>
                <Avatar photoUrl={editPhoto || member.photoUrl} fullName={editName || member.fullName} size={72} />
                <View style={styles.detailHeaderText}>
                  <Text style={styles.detailTitle}>{member.fullName}</Text>
                  <Text style={styles.detailSubtitle}>{member.role}</Text>
                </View>
              </View>

              <TextInput style={styles.input} value={editName} onChangeText={setEditName} placeholder="Full name" />
              <TextInput style={styles.input} value={editEmail} onChangeText={setEditEmail} placeholder="Email" autoCapitalize="none" />
              <TextInput style={styles.input} value={editLicense} onChangeText={setEditLicense} placeholder="License number" />
              <TextInput style={styles.input} value={editPhoto} onChangeText={setEditPhoto} placeholder="Photo URL" autoCapitalize="none" />

              {user.role === 'Instructor' ? (
                <View style={styles.detailActions}>
                  <Pressable style={styles.primaryButton} onPress={() => void updateMemberMutation.mutate()}>
                    <Text style={styles.primaryButtonText}>Save changes</Text>
                  </Pressable>
                  <Pressable
                    style={styles.deleteButton}
                    onPress={() =>
                      Alert.alert('Delete member', 'Remove this member from the system?', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => void deleteMemberMutation.mutate() },
                      ])
                    }
                  >
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          ) : null}
        </>
      ) : (
        <View style={[sharedStyles.sectionCard, styles.accessCard]}>
          <Text style={sharedStyles.sectionTitle}>Registration access</Text>
          <TextInput style={styles.input} value={accessEmail} onChangeText={setAccessEmail} placeholder="email@example.com" autoCapitalize="none" />
          <TextInput style={styles.input} value={accessLicense} onChangeText={setAccessLicense} placeholder="License number" />
          <View style={styles.roleRow}>
            {accessRoles.map((role) => (
              <Pressable
                key={role}
                style={[styles.roleChip, accessRole === role ? styles.roleChipActive : null]}
                onPress={() => setAccessRole(role)}
              >
                <Text style={[styles.roleChipText, accessRole === role ? styles.roleChipTextActive : null]}>{role}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={styles.primaryButton} onPress={() => void addAccessMutation.mutate()}>
            <Text style={styles.primaryButtonText}>Add Access</Text>
          </Pressable>

          {accessList.map((access) => (
            <View key={access.id} style={styles.accessRow}>
              <View style={styles.accessText}>
                <Text style={styles.accessEmail}>{access.email}</Text>
                <Text style={styles.accessMeta}>
                  {access.role} • {access.licenseNumber || 'No license'}
                </Text>
              </View>
              <Pressable
                style={styles.accessDelete}
                onPress={() =>
                  Alert.alert('Delete access', 'Remove this registration access?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => void deleteAccessMutation.mutate(access.id) },
                  ])
                }
              >
                <Text style={styles.accessDeleteText}>Delete</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  segmentWrap: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#efe6db',
    borderRadius: 24,
    padding: 6,
  },
  segmentButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  segmentText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  segmentTextActive: {
    color: theme.colors.white,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    minHeight: 104,
    justifyContent: 'space-between',
  },
  summaryLabel: {
    color: theme.colors.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  summaryValue: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '900',
  },
  memberCard: {
    borderRadius: theme.radius.md,
    padding: 16,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.line,
    gap: 14,
  },
  memberCardActive: {
    borderColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  memberCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  memberCardText: {
    flex: 1,
    gap: 3,
  },
  memberName: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  memberMeta: {
    color: theme.colors.muted,
    fontSize: 13,
  },
  memberTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailCard: {
    gap: 14,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  detailHeaderText: {
    flex: 1,
    gap: 3,
  },
  detailTitle: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '900',
  },
  detailSubtitle: {
    color: theme.colors.muted,
    fontSize: 14,
  },
  input: {
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.canvasAlt,
    paddingHorizontal: 14,
    color: theme.colors.text,
    fontSize: 15,
  },
  detailActions: {
    gap: 10,
  },
  roleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.card,
  },
  roleChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  roleChipText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  roleChipTextActive: {
    color: theme.colors.white,
  },
  primaryButton: {
    minHeight: 50,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: theme.colors.white,
    fontSize: 15,
    fontWeight: '900',
  },
  deleteButton: {
    minHeight: 50,
    borderRadius: 18,
    backgroundColor: theme.colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    color: theme.colors.white,
    fontSize: 15,
    fontWeight: '900',
  },
  accessCard: {
    gap: 14,
  },
  accessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    backgroundColor: theme.colors.canvasAlt,
    borderWidth: 1,
    borderColor: theme.colors.line,
    padding: 12,
  },
  accessText: {
    flex: 1,
    gap: 3,
  },
  accessEmail: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  accessMeta: {
    color: theme.colors.muted,
    fontSize: 12,
  },
  accessDelete: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: theme.colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accessDeleteText: {
    color: theme.colors.danger,
    fontSize: 12,
    fontWeight: '900',
  },
});
