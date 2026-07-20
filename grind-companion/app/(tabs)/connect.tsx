import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBleStore } from '@/src/store/bleStore';
import { useSessionsStore } from '@/src/store/sessionsStore';
import { theme } from '@/src/theme';

export default function ConnectScreen() {
  const {
    status,
    devices,
    deviceName,
    error,
    syncMessage,
    syncProgress,
    isSyncing,
    systemInfo,
    liveSupported,
    remoteSupported,
    scan,
    connect,
    disconnect,
    sync,
    clearError,
  } = useBleStore();
  const refreshSessions = useSessionsStore((s) => s.refresh);

  const busy = status === 'scanning' || status === 'connecting' || isSyncing;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.container}>
        <Text style={styles.statusLabel}>Status</Text>
        <Text style={styles.statusValue}>
          {status === 'connected'
            ? `Verbunden · ${deviceName ?? 'GrindByWeight'}`
            : status === 'scanning'
              ? 'Scanne…'
              : status === 'connecting'
                ? 'Verbinde…'
                : 'Getrennt'}
        </Text>

        {systemInfo ? (
          <Text style={styles.info} numberOfLines={4}>
            {systemInfo}
          </Text>
        ) : null}

        {status === 'connected' ? (
          <Text style={styles.liveHint}>
            Live:{' '}
            {liveSupported
              ? 'aktiv (Phase-2 Firmware)'
              : 'nicht verfügbar — Export funktioniert trotzdem'}
            {' · '}
            Remote:{' '}
            {remoteSupported ? 'bereit' : 'nach Firmware-Update'}
          </Text>
        ) : null}

        <View style={styles.actions}>
          {status !== 'connected' ? (
            <>
              <Pressable
                style={[styles.btn, styles.btnPrimary]}
                disabled={busy}
                onPress={() => {
                  clearError();
                  void scan();
                }}>
                <Text style={styles.btnText}>{busy ? '…' : 'Scan'}</Text>
              </Pressable>
              <Pressable
                style={[styles.btn, styles.btnAccent]}
                disabled={busy}
                onPress={() => {
                  clearError();
                  void connect();
                }}>
                <Text style={styles.btnText}>Auto-Connect</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable
                style={[styles.btn, styles.btnPrimary]}
                disabled={busy}
                onPress={async () => {
                  try {
                    await sync();
                    await refreshSessions();
                  } catch {
                    /* shown in store */
                  }
                }}>
                <Text style={styles.btnText}>
                  {isSyncing ? `Sync ${syncProgress}%` : 'Sessions syncen'}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.btn, styles.btnDanger]}
                disabled={busy}
                onPress={() => void disconnect()}>
                <Text style={styles.btnText}>Trennen</Text>
              </Pressable>
            </>
          )}
        </View>

        {busy ? <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 12 }} /> : null}
        {syncMessage ? <Text style={styles.syncMsg}>{syncMessage}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.section}>Gefundene Geräte</Text>
        <FlatList
          data={devices}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <Text style={styles.empty}>
              Tippe auf Scan. Am ESP Bluetooth aktivieren. Logging muss für Analytics an sein.
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.device}
              onPress={() => void connect(item.id)}
              disabled={busy || status === 'connected'}>
              <Text style={styles.deviceName}>{item.name}</Text>
              <Text style={styles.deviceMeta}>
                {item.rssi != null ? `${item.rssi} dBm` : '—'} · {item.id.slice(0, 8)}…
              </Text>
            </Pressable>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  statusLabel: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: theme.colors.secondary,
    textTransform: 'uppercase',
  },
  statusValue: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 22,
    color: theme.colors.textPrimary,
    marginTop: 4,
  },
  info: {
    marginTop: 10,
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  liveHint: {
    marginTop: 8,
    fontFamily: theme.fonts.medium,
    fontSize: 13,
    color: theme.colors.accent,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 18,
  },
  btn: {
    borderRadius: theme.radii.button,
    paddingVertical: 14,
    paddingHorizontal: 20,
    minWidth: 140,
    alignItems: 'center',
  },
  btnPrimary: { backgroundColor: theme.colors.primary },
  btnAccent: { backgroundColor: theme.colors.accent },
  btnDanger: { backgroundColor: theme.colors.neutral },
  btnText: {
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.textPrimary,
    fontSize: 15,
  },
  syncMsg: {
    marginTop: 12,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.regular,
  },
  error: {
    marginTop: 10,
    color: theme.colors.error,
    fontFamily: theme.fonts.medium,
  },
  section: {
    marginTop: 24,
    marginBottom: 10,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.textPrimary,
    fontSize: 16,
  },
  empty: {
    color: theme.colors.secondary,
    fontFamily: theme.fonts.regular,
    lineHeight: 20,
  },
  device: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radii.card,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  deviceName: {
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.textPrimary,
    fontSize: 16,
  },
  deviceMeta: {
    marginTop: 4,
    fontFamily: theme.fonts.regular,
    color: theme.colors.secondary,
    fontSize: 12,
  },
});
