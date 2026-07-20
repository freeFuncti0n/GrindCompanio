import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ScrollView,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { listBeans } from '@/src/journal/beansRepo';
import {
  getLastJournalDefaults,
  getSessionMeta,
  upsertSessionMeta,
} from '@/src/journal/sessionMetaRepo';
import {
  calcRatio,
  formatRatio,
  type Bean,
  type SessionMeta,
} from '@/src/journal/types';
import { theme } from '@/src/theme';

type Props = {
  sessionId: number;
  doseG: number;
};

function parseOptionalNumber(text: string): number | null {
  const t = text.trim().replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function SessionJournalForm({ sessionId, doseG }: Props) {
  const router = useRouter();
  const [beans, setBeans] = useState<Bean[]>([]);
  const [beanId, setBeanId] = useState<number | null>(null);
  const [grindSetting, setGrindSetting] = useState('');
  const [grindNote, setGrindNote] = useState('');
  const [basket, setBasket] = useState('');
  const [brewTime, setBrewTime] = useState('');
  const [yieldG, setYieldG] = useState('');
  const [tasteScore, setTasteScore] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function applyMeta(m: SessionMeta) {
    setBeanId(m.bean_id);
    setGrindSetting(m.grind_setting != null ? String(m.grind_setting) : '');
    setGrindNote(m.grind_note ?? '');
    setBasket(m.basket ?? '');
    setBrewTime(m.brew_time_s != null ? String(m.brew_time_s) : '');
    setYieldG(m.yield_g != null ? String(m.yield_g) : '');
    setTasteScore(m.taste_score);
    setNotes(m.notes ?? '');
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [beanList, existing, defaults] = await Promise.all([
        listBeans(),
        getSessionMeta(sessionId),
        getLastJournalDefaults(),
      ]);
      if (cancelled) return;
      setBeans(beanList);

      if (existing) {
        applyMeta(existing);
      } else if (defaults) {
        setBeanId(defaults.bean_id);
        if (defaults.grind_setting != null) {
          setGrindSetting(String(defaults.grind_setting));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useFocusEffect(
    useCallback(() => {
      void listBeans().then(setBeans);
    }, [])
  );

  const ratio = useMemo(() => {
    return calcRatio(parseOptionalNumber(yieldG), doseG);
  }, [yieldG, doseG]);

  async function onSave() {
    setSaving(true);
    setStatus(null);
    try {
      await upsertSessionMeta({
        session_id: sessionId,
        bean_id: beanId,
        grind_setting: parseOptionalNumber(grindSetting),
        grind_note: grindNote.trim() || null,
        basket: basket.trim() || null,
        brew_time_s: parseOptionalNumber(brewTime),
        yield_g: parseOptionalNumber(yieldG),
        taste_score: tasteScore,
        notes: notes.trim() || null,
      });
      setStatus('Gespeichert');
      const refreshed = await listBeans();
      setBeans(refreshed);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Speichern fehlgeschlagen');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>Journal</Text>

      <Text style={styles.label}>Bohne</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
        {beans.map((b) => {
          const active = beanId === b.id;
          return (
            <Pressable
              key={b.id}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setBeanId(active ? null : b.id)}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{b.name}</Text>
            </Pressable>
          );
        })}
        <Pressable
          style={[styles.chip, styles.chipAccent]}
          onPress={() => router.push('/beans/new' as never)}>
          <Text style={styles.chipTextActive}>+ Neu</Text>
        </Pressable>
        <Pressable style={styles.chip} onPress={() => router.push('/beans' as never)}>
          <Text style={styles.chipText}>Alle</Text>
        </Pressable>
      </ScrollView>

      <View style={styles.row}>
        <View style={styles.field}>
          <Text style={styles.label}>Mahlgrad (Dial)</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            value={grindSetting}
            onChangeText={setGrindSetting}
            placeholder="3.5"
            placeholderTextColor={theme.colors.neutral}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Bezugszeit (s)</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            value={brewTime}
            onChangeText={setBrewTime}
            placeholder="28"
            placeholderTextColor={theme.colors.neutral}
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.field}>
          <Text style={styles.label}>Ausgabe (g)</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            value={yieldG}
            onChangeText={setYieldG}
            placeholder="36"
            placeholderTextColor={theme.colors.neutral}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Dosis / Ratio</Text>
          <Text style={styles.computed}>
            {doseG.toFixed(2)} g · {formatRatio(ratio)}
          </Text>
        </View>
      </View>

      <Text style={styles.label}>Korb</Text>
      <TextInput
        style={styles.input}
        value={basket}
        onChangeText={setBasket}
        placeholder="18g VST"
        placeholderTextColor={theme.colors.neutral}
      />

      <Text style={styles.label}>Geschmack</Text>
      <View style={styles.scoreRow}>
        {[1, 2, 3, 4, 5].map((n) => {
          const active = tasteScore === n;
          return (
            <Pressable
              key={n}
              style={[styles.scoreBtn, active && styles.scoreBtnActive]}
              onPress={() => setTasteScore(active ? null : n)}>
              <Text style={[styles.scoreText, active && styles.chipTextActive]}>{n}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>Mahlgrad-Notiz</Text>
      <TextInput
        style={styles.input}
        value={grindNote}
        onChangeText={setGrindNote}
        placeholder="fein nachgezogen"
        placeholderTextColor={theme.colors.neutral}
      />

      <Text style={styles.label}>Notiz</Text>
      <TextInput
        style={[styles.input, styles.notes]}
        value={notes}
        onChangeText={setNotes}
        multiline
        placeholder="Geschmack, Channeling, …"
        placeholderTextColor={theme.colors.neutral}
      />

      <Pressable
        style={[styles.saveBtn, saving && { opacity: 0.6 }]}
        disabled={saving}
        onPress={() => void onSave()}>
        <Text style={styles.saveText}>{saving ? '…' : 'Journal speichern'}</Text>
      </Pressable>
      {status ? <Text style={styles.status}>{status}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 24,
    marginBottom: 12,
    padding: 14,
    borderRadius: theme.radii.card,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  heading: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 18,
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  label: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: theme.colors.secondary,
    marginTop: 10,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.regular,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  notes: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  field: {
    flex: 1,
  },
  computed: {
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.accent,
    fontSize: 16,
    paddingVertical: 12,
  },
  chipRow: {
    flexGrow: 0,
    marginBottom: 4,
  },
  chip: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipAccent: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
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
  scoreRow: {
    flexDirection: 'row',
    gap: 8,
  },
  scoreBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  scoreBtnActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  scoreText: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.semiBold,
  },
  saveBtn: {
    marginTop: 16,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.button,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveText: {
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.textPrimary,
    fontSize: 15,
  },
  status: {
    marginTop: 8,
    fontFamily: theme.fonts.medium,
    color: theme.colors.success,
    fontSize: 13,
  },
});
