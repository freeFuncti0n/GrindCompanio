import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { listBeans } from '@/src/journal/beansRepo';
import {
  getBeanRecommendations,
  getDialAggregates,
} from '@/src/journal/diagnoseQueries';
import {
  TARGET_BREW_TIME_MAX_S,
  TARGET_BREW_TIME_MIN_S,
  TARGET_RATIO_MAX,
  TARGET_RATIO_MIN,
  formatRatio,
  type Bean,
  type BeanRecommendation,
  type DialAggRow,
} from '@/src/journal/types';
import { theme } from '@/src/theme';

export default function DiagnoseScreen() {
  const [beans, setBeans] = useState<Bean[]>([]);
  const [beanFilter, setBeanFilter] = useState<number | null>(null);
  const [rows, setRows] = useState<DialAggRow[]>([]);
  const [recs, setRecs] = useState<BeanRecommendation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [beanList, agg, recommendations] = await Promise.all([
        listBeans(),
        getDialAggregates(beanFilter),
        getBeanRecommendations(),
      ]);
      setBeans(beanList);
      setRows(agg);
      setRecs(
        beanFilter == null
          ? recommendations
          : recommendations.filter((r) => r.bean_id === beanFilter)
      );
    } finally {
      setLoading(false);
    }
  }, [beanFilter]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const filteredRecs = useMemo(() => recs, [recs]);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.intro}>
        Ziel: Bezugszeit {TARGET_BREW_TIME_MIN_S}–{TARGET_BREW_TIME_MAX_S} s · Ratio{' '}
        {TARGET_RATIO_MIN}–{TARGET_RATIO_MAX} · Score ≥ 4
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
        <Pressable
          style={[styles.chip, beanFilter == null && styles.chipActive]}
          onPress={() => setBeanFilter(null)}>
          <Text style={[styles.chipText, beanFilter == null && styles.chipTextActive]}>
            Alle
          </Text>
        </Pressable>
        {beans.map((b) => {
          const active = beanFilter === b.id;
          return (
            <Pressable
              key={b.id}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setBeanFilter(b.id)}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{b.name}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 24 }} />
      ) : (
        <>
          <Text style={styles.section}>Empfehlung pro Bohne</Text>
          {filteredRecs.length === 0 ? (
            <Text style={styles.empty}>Noch zu wenig Journal-Daten.</Text>
          ) : (
            filteredRecs.map((r) => (
              <View key={r.bean_id} style={styles.card}>
                <Text style={styles.cardTitle}>{r.bean_name}</Text>
                <Text style={styles.cardMeta}>
                  Bester Dial {r.grind_setting} · Ø Score{' '}
                  {r.avg_score != null ? r.avg_score.toFixed(1) : '—'} · Treffer{' '}
                  {(r.hit_rate * 100).toFixed(0)}% · n={r.n}
                  {r.n < 3 ? ' (wenig Daten)' : ''}
                </Text>
              </View>
            ))
          )}

          <Text style={styles.section}>Aggregation Bohne × Dial</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.colBean]}>Bohne</Text>
            <Text style={[styles.th, styles.colDial]}>Dial</Text>
            <Text style={[styles.th, styles.colN]}>n</Text>
            <Text style={[styles.th, styles.colScore]}>Score</Text>
            <Text style={[styles.th, styles.colTime]}>Zeit</Text>
            <Text style={[styles.th, styles.colRatio]}>Ratio</Text>
            <Text style={[styles.th, styles.colHit]}>Treffer</Text>
          </View>
          {rows.length === 0 ? (
            <Text style={styles.empty}>Keine aggregierten Shots.</Text>
          ) : (
            rows.map((row) => (
              <View
                key={`${row.bean_id}-${row.grind_setting}`}
                style={styles.tableRow}>
                <Text style={[styles.td, styles.colBean]} numberOfLines={1}>
                  {row.bean_name}
                </Text>
                <Text style={[styles.td, styles.colDial]}>{row.grind_setting}</Text>
                <Text style={[styles.td, styles.colN]}>{row.n}</Text>
                <Text style={[styles.td, styles.colScore]}>
                  {row.avg_score != null ? row.avg_score.toFixed(1) : '—'}
                </Text>
                <Text style={[styles.td, styles.colTime]}>
                  {row.avg_brew_time_s != null ? row.avg_brew_time_s.toFixed(0) : '—'}
                </Text>
                <Text style={[styles.td, styles.colRatio]}>
                  {formatRatio(row.avg_ratio)}
                </Text>
                <Text style={[styles.td, styles.colHit]}>
                  {row.hits}/{row.n}
                </Text>
              </View>
            ))
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 16, paddingBottom: 40 },
  intro: {
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  filters: { flexGrow: 0, marginBottom: 16 },
  chip: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.medium,
    fontSize: 13,
  },
  chipTextActive: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.semiBold,
  },
  section: {
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.textPrimary,
    fontSize: 16,
    marginBottom: 10,
    marginTop: 8,
  },
  card: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radii.card,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 8,
  },
  cardTitle: {
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.accent,
    fontSize: 15,
  },
  cardMeta: {
    marginTop: 4,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
    fontSize: 13,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  th: {
    fontFamily: theme.fonts.medium,
    color: theme.colors.secondary,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  td: {
    fontFamily: theme.fonts.regular,
    color: theme.colors.textPrimary,
    fontSize: 12,
  },
  colBean: { flex: 1.4 },
  colDial: { width: 40 },
  colN: { width: 28 },
  colScore: { width: 44 },
  colTime: { width: 40 },
  colRatio: { width: 52 },
  colHit: { width: 48 },
  empty: {
    color: theme.colors.secondary,
    fontFamily: theme.fonts.regular,
    marginBottom: 16,
  },
});
