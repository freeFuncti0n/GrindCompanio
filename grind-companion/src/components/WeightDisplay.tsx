import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';

type Props = {
  weight: number;
  target?: number | null;
  unit?: string;
  accent?: string;
};

export function WeightDisplay({
  weight,
  target = null,
  unit = 'g',
  accent = theme.colors.primary,
}: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={[styles.weight, { color: accent }]}>
        {Number.isFinite(weight) ? weight.toFixed(1) : '—'}
        <Text style={styles.unit}> {unit}</Text>
      </Text>
      {target != null && Number.isFinite(target) ? (
        <Text style={styles.target}>Ziel {target.toFixed(1)} {unit}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  weight: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.typography.weightDisplay,
    letterSpacing: -1,
  },
  unit: {
    fontFamily: theme.fonts.medium,
    fontSize: 22,
    color: theme.colors.textSecondary,
  },
  target: {
    marginTop: 4,
    fontFamily: theme.fonts.medium,
    fontSize: theme.typography.caption,
    color: theme.colors.secondary,
  },
});
