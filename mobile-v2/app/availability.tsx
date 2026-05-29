import { Redirect } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useState } from 'react';

import { ScreenShell, sharedStyles } from '@/src/components/screen-shell';
import { useAuth } from '@/src/providers/auth-provider';
import { useLanguage } from '@/src/providers/language-provider';
import {
  createMobileAvailabilityRequest,
  getMobileAvailabilityOverview,
  reviewMobileAvailabilityRequest,
} from '@/src/services/modules-service';
import { theme } from '@/src/theme/theme';
import { formatDateLabel } from '@/src/utils/format';

const today = new Date().toISOString().slice(0, 10);

export default function AvailabilityScreen() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [reason, setReason] = useState('');

  const availabilityQuery = useQuery({
    queryKey: ['mobile-availability'],
    queryFn: getMobileAvailabilityOverview,
    enabled: Boolean(user),
  });

  const createMutation = useMutation({
    mutationFn: () => createMobileAvailabilityRequest({ startDate, endDate, reason }),
    onSuccess: async () => {
      setReason('');
      await queryClient.invalidateQueries({ queryKey: ['mobile-availability'] });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: ({ requestId, status }: { requestId: string; status: 'Approved' | 'Declined' }) =>
      reviewMobileAvailabilityRequest(requestId, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['mobile-availability'] });
    },
  });

  if (!user) return <Redirect href="/login" />;

  const overview = availabilityQuery.data;
  const requests = overview?.myRequests || [];
  const approvals = overview?.pendingApprovals || [];
  const approved = overview?.upcomingApproved || [];
  const isApprover = user.role === 'Instructor' || user.role === 'TO Supervisor';
  const canSubmit = user.role === 'Referee' || user.role === 'TO';
  const summaryValue = isApprover ? approvals.length : requests.filter((item) => item.status === 'Pending').length;
  const summaryLabel = isApprover ? 'Pending approvals' : 'My pending leaves';

  return (
    <ScreenShell user={user} title={t('home.availability')} subtitle="Leaves, approvals and approved windows">
      <View style={styles.heroCard}>
        <Text style={styles.heroEyebrow}>IREFZONE AVAILABILITY</Text>
        <Text style={styles.heroTitle}>Keep game assignments aligned with real availability.</Text>
        <View style={styles.summaryRow}>
          <View style={[sharedStyles.sectionCard, styles.metricCard]}>
            <Text style={styles.metricValue}>{summaryValue}</Text>
            <Text style={styles.metricLabel}>{summaryLabel}</Text>
          </View>
          <View style={[sharedStyles.sectionCard, styles.metricCard]}>
            <Text style={styles.metricValue}>{approved.length}</Text>
            <Text style={styles.metricLabel}>Approved periods</Text>
          </View>
        </View>
      </View>

      {canSubmit ? (
        <View style={[sharedStyles.sectionCard, styles.panel]}>
          <Text style={sharedStyles.sectionTitle}>Request leave</Text>
          <TextInput style={styles.input} value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" placeholderTextColor={theme.colors.muted} />
          <TextInput style={styles.input} value={endDate} onChangeText={setEndDate} placeholder="YYYY-MM-DD" placeholderTextColor={theme.colors.muted} />
          <TextInput
            style={[styles.input, styles.textarea]}
            value={reason}
            onChangeText={setReason}
            placeholder="Reason"
            placeholderTextColor={theme.colors.muted}
            multiline
            textAlignVertical="top"
          />
          {createMutation.error ? <Text style={styles.errorText}>{(createMutation.error as Error).message}</Text> : null}
          <Pressable style={styles.primaryButton} onPress={() => void createMutation.mutate()}>
            <Text style={styles.primaryButtonText}>{createMutation.isPending ? 'Saving…' : 'Send request'}</Text>
          </Pressable>
        </View>
      ) : null}

      {isApprover ? (
        <View style={[sharedStyles.sectionCard, styles.panel]}>
          <Text style={sharedStyles.sectionTitle}>Pending approvals</Text>
          {approvals.length ? (
            approvals.map((item) => (
              <View key={item.id} style={styles.requestCard}>
                <Text style={styles.requestName}>{item.userName}</Text>
                <Text style={styles.requestMeta}>{item.userRole}</Text>
                <Text style={styles.requestMeta}>{formatDateLabel(item.startDate)} → {formatDateLabel(item.endDate)}</Text>
                <Text style={styles.requestReason}>{item.reason}</Text>
                <View style={styles.actionRow}>
                  <Pressable style={[styles.actionButton, styles.approveButton]} onPress={() => void reviewMutation.mutate({ requestId: item.id, status: 'Approved' })}>
                    <Text style={styles.actionButtonText}>Approve</Text>
                  </Pressable>
                  <Pressable style={[styles.actionButton, styles.declineButton]} onPress={() => void reviewMutation.mutate({ requestId: item.id, status: 'Declined' })}>
                    <Text style={[styles.actionButtonText, styles.declineText]}>Decline</Text>
                  </Pressable>
                </View>
              </View>
            ))
          ) : (
            <Text style={sharedStyles.muted}>{t('common.noData')}</Text>
          )}
        </View>
      ) : null}

      <View style={[sharedStyles.sectionCard, styles.panel]}>
        <Text style={sharedStyles.sectionTitle}>{isApprover ? 'My history' : 'My requests'}</Text>
        {(isApprover ? requests : requests).length ? (
          requests.map((item) => (
            <View key={item.id} style={styles.requestCard}>
              <Text style={styles.requestName}>{item.status}</Text>
              <Text style={styles.requestMeta}>{formatDateLabel(item.startDate)} → {formatDateLabel(item.endDate)}</Text>
              <Text style={styles.requestReason}>{item.reason}</Text>
            </View>
          ))
        ) : (
          <Text style={sharedStyles.muted}>{t('common.noData')}</Text>
        )}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    gap: 16,
  },
  heroEyebrow: {
    color: theme.colors.primaryAccent,
    fontSize: 12,
    fontWeight: '900',
  },
  heroTitle: {
    color: theme.colors.text,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minHeight: 110,
    justifyContent: 'space-between',
  },
  metricValue: {
    color: theme.colors.primary,
    fontSize: 30,
    fontWeight: '900',
  },
  metricLabel: {
    color: theme.colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  panel: {
    gap: 14,
  },
  input: {
    minHeight: 54,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.canvasAlt,
    paddingHorizontal: 14,
    color: theme.colors.text,
    fontSize: 15,
  },
  textarea: {
    minHeight: 108,
    paddingTop: 14,
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
  },
  primaryButtonText: {
    color: theme.colors.white,
    fontSize: 15,
    fontWeight: '900',
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: 13,
    fontWeight: '700',
  },
  requestCard: {
    borderRadius: 20,
    backgroundColor: theme.colors.canvasAlt,
    borderWidth: 1,
    borderColor: theme.colors.line,
    padding: 14,
    gap: 6,
  },
  requestName: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  requestMeta: {
    color: theme.colors.muted,
    fontSize: 13,
  },
  requestReason: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  actionButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveButton: {
    backgroundColor: theme.colors.primary,
  },
  declineButton: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  actionButtonText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '900',
  },
  declineText: {
    color: theme.colors.text,
  },
});
