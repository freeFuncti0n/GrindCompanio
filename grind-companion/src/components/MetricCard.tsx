import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';

type Props = {
  label: string;
  value: string;
  accent?: string;
};

export function MetricCard({ label, value, accent = theme.colors.textPrimary }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: accent }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radii.card,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  label: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: theme.colors.secondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  value: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 20,
  },
});
