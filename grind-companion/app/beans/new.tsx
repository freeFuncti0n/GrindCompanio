import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { createBean } from '@/src/journal/beansRepo';
import { theme } from '@/src/theme';

export default function NewBeanScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [roaster, setRoaster] = useState('');
  const [origin, setOrigin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSave() {
    if (!name.trim()) {
      setError('Name ist Pflicht');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createBean({
        name,
        roaster: roaster || null,
        origin: origin || null,
      });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Ethiopia Yirgacheffe"
        placeholderTextColor={theme.colors.neutral}
      />
      <Text style={styles.label}>Röster</Text>
      <TextInput
        style={styles.input}
        value={roaster}
        onChangeText={setRoaster}
        placeholderTextColor={theme.colors.neutral}
      />
      <Text style={styles.label}>Herkunft</Text>
      <TextInput
        style={styles.input}
        value={origin}
        onChangeText={setOrigin}
        placeholderTextColor={theme.colors.neutral}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable
        style={[styles.save, saving && { opacity: 0.6 }]}
        disabled={saving}
        onPress={() => void onSave()}>
        <Text style={styles.saveText}>Speichern</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: theme.colors.background, padding: 16 },
  label: {
    fontFamily: theme.fonts.medium,
    color: theme.colors.secondary,
    fontSize: 12,
    marginTop: 12,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.regular,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  save: {
    marginTop: 24,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.button,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveText: {
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.textPrimary,
  },
  error: {
    marginTop: 10,
    color: theme.colors.error,
    fontFamily: theme.fonts.medium,
  },
});
