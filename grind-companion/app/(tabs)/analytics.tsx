import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MetricCard } from '@/src/components/MetricCard';
import { useSessionsStore } from '@/src/store/sessionsStore';
import { listSessionMetaBySessionIds } from '@/src/journal/sessionMetaRepo';
import {
  calcRatio,
  formatJournalSummary,
  type SessionMetaWithBean,
} from '@/src/journal/types';
import {
  MODE_MAP,
  PROFILE_MAP,
  TERMINATION_REASON_MAP,
  type GrindSession,
} from '@/src/parsing/types';
import { theme } from '@/src/theme';

function formatError(session: GrindSession): string {
  if (session.grind_mode === 1) {
    return `${session.time_error_ms} ms`;
  }
  const sign = session.error_grams > 0 ? '+' : '';
  return `${sign}${session.error_grams.toFixed(2)} g`;
}

function SessionRow({
  session,
  meta,
  onPress,
}: {
  session: GrindSession;
  meta?: SessionMetaWithBean;
  onPress: () => void;
}) {
  const ok =
    session.termination_reason === 0 &&
    Math.abs(session.error_grams) <= (session.tolerance || 0.03);
  const journalLine = meta
    ? formatJournalSummary({
        bean_name: meta.bean_name,
        grind_setting: meta.grind_setting,
        brew_time_s: meta.brew_time_s,
        ratio: calcRatio(meta.yield_g, meta.dose_g ?? session.final_weight),
      })
    : null;

  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.rowTop}>
        <Text style={styles.rowTitle}>
          #{session.session_id} · {PROFILE_MAP[session.profile_id] ?? '?'} ·{' '}
          {MODE_MAP[session.grind_mode] ?? '?'}
        </Text>
        <Text style={[styles.badge, { color: ok ? theme.colors.success : theme.colors.warning }]}>
          {TERMINATION_REASON_MAP[session.termination_reason] ?? 'UNKNOWN'}
        </Text>
      </View>
      <Text style={styles.rowMeta}>
        {session.final_weight.toFixed(2)} g / {session.target_weight.toFixed(2)} g · Error{' '}
        {formatError(session)} · {(session.total_time_ms / 1000).toFixed(1)} s ·{' '}
        {session.pulse_count} pulses
      </Text>
      {journalLine ? <Text style={styles.journal}>{journalLine}</Text> : null}
    </Pressable>
  );
}

export default function AnalyticsScreen() {
  const router = useRouter();
  const { sessions, loading, refresh, error } = useSessionsStore();
  const [metaMap, setMetaMap] = useState<Map<number, SessionMetaWithBean>>(new Map());

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        await refresh();
      })();
    }, [refresh])
  );

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        const map = await listSessionMetaBySessionIds(sessions.map((s) => s.session_id));
        setMetaMap(map);
      })();
    }, [sessions])
  );

  const avgError =
    sessions.length > 0
      ? sessions.reduce((s, x) => s + Math.abs(x.error_grams), 0) / sessions.length
      : 0;
  const successCount = sessions.filter((s) => s.termination_reason === 0).length;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.headerActions}>
        <Pressable style={styles.linkBtn} onPress={() => router.push('/diagnose' as never)}>
          <Text style={styles.linkText}>Diagnose</Text>
        </Pressable>
        <Pressable style={styles.linkBtn} onPress={() => router.push('/beans' as never)}>
          <Text style={styles.linkText}>Bohnen</Text>
        </Pressable>
      </View>

      <View style={styles.metrics}>
        <MetricCard label="Sessions" value={String(sessions.length)} />
        <MetricCard
          label="Avg |Error|"
          value={`${avgError.toFixed(3)} g`}
          accent={theme.colors.primary}
        />
        <MetricCard
          label="Complete"
          value={`${successCount}/${sessions.length || 0}`}
          accent={theme.colors.success}
        />
      </View>

      {loading && sessions.length === 0 ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => String(item.session_id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>
              Noch keine Sessions. Unter Connect mit dem ESP verbinden und synchronisieren.
              {'\n'}Logging am Gerät muss aktiv sein (Menu → Logs & Data).
            </Text>
          }
          ListHeaderComponent={error ? <Text style={styles.error}>{error}</Text> : null}
          renderItem={({ item }) => (
            <SessionRow
              session={item}
              meta={metaMap.get(item.session_id)}
              onPress={() => router.push(`/session/${item.session_id}`)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  linkBtn: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  linkText: {
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.accent,
    fontSize: 13,
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 10,
  },
  row: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radii.card,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  rowTitle: {
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.textPrimary,
    fontSize: 15,
    flex: 1,
  },
  badge: {
    fontFamily: theme.fonts.medium,
    fontSize: 11,
    marginLeft: 8,
  },
  rowMeta: {
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
    fontSize: 13,
  },
  journal: {
    marginTop: 6,
    fontFamily: theme.fonts.medium,
    color: theme.colors.accent,
    fontSize: 13,
  },
  empty: {
    marginTop: 40,
    textAlign: 'center',
    color: theme.colors.secondary,
    fontFamily: theme.fonts.regular,
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  error: {
    color: theme.colors.error,
    marginBottom: 12,
    fontFamily: theme.fonts.medium,
  },
});
