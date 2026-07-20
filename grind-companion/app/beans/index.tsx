import { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { listBeans, deleteBean } from '@/src/journal/beansRepo';
import type { Bean } from '@/src/journal/types';
import { theme } from '@/src/theme';

export default function BeansScreen() {
  const router = useRouter();
  const [beans, setBeans] = useState<Bean[]>([]);

  const refresh = useCallback(async () => {
    setBeans(await listBeans());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  return (
    <View style={styles.wrap}>
      <Pressable style={styles.addBtn} onPress={() => router.push('/beans/new' as never)}>
        <Text style={styles.addText}>Neue Bohne</Text>
      </Pressable>
      <FlatList
        data={beans}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>Noch keine Bohnen. Lege die erste an.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                {[item.roaster, item.origin].filter(Boolean).join(' · ') || '—'}
              </Text>
            </View>
            <Pressable
              onPress={async () => {
                await deleteBean(item.id);
                await refresh();
              }}>
              <Text style={styles.delete}>Löschen</Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: theme.colors.background, padding: 16 },
  addBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.button,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  addText: {
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.textPrimary,
  },
  list: { gap: 10, paddingBottom: 40 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radii.card,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  name: {
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.textPrimary,
    fontSize: 16,
  },
  meta: {
    marginTop: 4,
    fontFamily: theme.fonts.regular,
    color: theme.colors.secondary,
    fontSize: 13,
  },
  delete: {
    fontFamily: theme.fonts.medium,
    color: theme.colors.error,
    marginLeft: 12,
  },
  empty: {
    textAlign: 'center',
    color: theme.colors.secondary,
    marginTop: 40,
    fontFamily: theme.fonts.regular,
  },
});
