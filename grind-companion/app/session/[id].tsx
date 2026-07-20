import { useEffect } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { MetricCard } from '@/src/components/MetricCard';
import { SessionChart } from '@/src/components/SessionChart';
import { SessionJournalForm } from '@/src/components/SessionJournalForm';
import { useSessionsStore } from '@/src/store/sessionsStore';
import {
  MODE_MAP,
  PROFILE_MAP,
  TERMINATION_REASON_MAP,
} from '@/src/parsing/types';
import { theme } from '@/src/theme';

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sessionId = Number(id);
  const { width } = useWindowDimensions();
  const { selected, measurements, loading, loadSession, error } = useSessionsStore();

  useEffect(() => {
    if (Number.isFinite(sessionId)) {
      void loadSession(sessionId);
    }
  }, [sessionId, loadSession]);

  if (loading && !selected) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (!selected) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error ?? 'Session nicht gefunden'}</Text>
      </View>
    );
  }

  const accent =
    selected.grind_mode === 1 ? theme.colors.accent : theme.colors.primary;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: accent }]}>
        #{selected.session_id} · {PROFILE_MAP[selected.profile_id] ?? '?'}
      </Text>
      <Text style={styles.sub}>
        {MODE_MAP[selected.grind_mode] ?? '?'} ·{' '}
        {TERMINATION_REASON_MAP[selected.termination_reason] ?? 'UNKNOWN'} ·{' '}
        {selected.result_status}
      </Text>

      <View style={styles.metrics}>
        <MetricCard
          label="Final / Dosis"
          value={`${selected.final_weight.toFixed(2)} g`}
          accent={accent}
        />
        <MetricCard label="Target" value={`${selected.target_weight.toFixed(2)} g`} />
        <MetricCard
          label="Error"
          value={`${selected.error_grams >= 0 ? '+' : ''}${selected.error_grams.toFixed(3)} g`}
          accent={
            Math.abs(selected.error_grams) <= selected.tolerance
              ? theme.colors.success
              : theme.colors.warning
          }
        />
        <MetricCard label="Time" value={`${(selected.total_time_ms / 1000).toFixed(1)} s`} />
        <MetricCard
          label="Motor ON"
          value={`${(selected.total_motor_on_time_ms / 1000).toFixed(1)} s`}
        />
        <MetricCard label="Pulses" value={String(selected.pulse_count)} />
      </View>

      <Text style={styles.chartTitle}>Weight / Flow</Text>
      <SessionChart
        measurements={measurements}
        width={Math.min(width - 32, 680)}
        height={240}
      />

      <SessionJournalForm sessionId={selected.session_id} doseG={selected.final_weight} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 16, paddingBottom: 40 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  title: {
    fontFamily: theme.fonts.bold,
    fontSize: 28,
  },
  sub: {
    marginTop: 6,
    marginBottom: 16,
    fontFamily: theme.fonts.medium,
    color: theme.colors.textSecondary,
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  chartTitle: {
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.textPrimary,
    fontSize: 16,
    marginBottom: 10,
  },
  error: {
    color: theme.colors.error,
    fontFamily: theme.fonts.medium,
  },
});
