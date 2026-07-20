import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Path, Rect } from 'react-native-svg';
import { theme } from '../theme';
import type { GrindMeasurement } from '../parsing/types';

type Point = { t: number; weight: number; flow: number; motor?: number };

type Props = {
  measurements?: GrindMeasurement[];
  livePoints?: Point[];
  height?: number;
  width?: number;
};

function downsample<T>(arr: T[], maxPoints: number): T[] {
  if (arr.length <= maxPoints) return arr;
  const step = arr.length / maxPoints;
  const out: T[] = [];
  for (let i = 0; i < maxPoints; i++) {
    out.push(arr[Math.floor(i * step)]);
  }
  return out;
}

export function SessionChart({
  measurements,
  livePoints,
  height = 220,
  width = 340,
}: Props) {
  const points: Point[] = useMemo(() => {
    if (livePoints && livePoints.length > 0) {
      return downsample(livePoints, 100);
    }
    if (!measurements || measurements.length === 0) return [];
    const mapped = measurements.map((m) => ({
      t: m.timestamp_ms,
      weight: m.weight_grams,
      flow: m.flow_rate_g_per_s,
      motor: m.motor_is_on,
    }));
    return downsample(mapped, 120);
  }, [measurements, livePoints]);

  if (points.length < 2) {
    return (
      <View style={[styles.empty, { height, width }]}>
        <Text style={styles.emptyText}>Keine Messdaten</Text>
      </View>
    );
  }

  const pad = 12;
  const tMin = points[0].t;
  const tMax = points[points.length - 1].t || tMin + 1;
  const weights = points.map((p) => p.weight);
  const flows = points.map((p) => p.flow);
  const wMin = Math.min(...weights);
  const wMax = Math.max(...weights, wMin + 0.1);
  const fMax = Math.max(...flows, 0.5);

  const x = (t: number) => pad + ((t - tMin) / (tMax - tMin)) * (width - pad * 2);
  const yW = (w: number) =>
    height - pad - ((w - wMin) / (wMax - wMin)) * (height - pad * 2);
  const yF = (f: number) => height - pad - (f / fMax) * (height - pad * 2) * 0.45;

  const weightPath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.t).toFixed(1)} ${yW(p.weight).toFixed(1)}`)
    .join(' ');
  const flowPath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.t).toFixed(1)} ${yF(p.flow).toFixed(1)}`)
    .join(' ');

  const motorBands = points
    .map((p, i) => {
      if (!p.motor) return null;
      const x0 = x(p.t);
      const x1 = i + 1 < points.length ? x(points[i + 1].t) : x0 + 2;
      return (
        <Rect
          key={`m-${i}`}
          x={x0}
          y={pad}
          width={Math.max(1, x1 - x0)}
          height={height - pad * 2}
          fill={theme.colors.grinderActive}
          opacity={0.45}
        />
      );
    })
    .filter(Boolean);

  return (
    <View style={styles.wrap}>
      <View style={styles.legend}>
        <Text style={[styles.legendItem, { color: theme.colors.primary }]}>Gewicht</Text>
        <Text style={[styles.legendItem, { color: theme.colors.success }]}>Flow</Text>
        <Text style={[styles.legendItem, { color: theme.colors.warning }]}>Motor</Text>
      </View>
      <Svg width={width} height={height}>
        <Line
          x1={pad}
          y1={height - pad}
          x2={width - pad}
          y2={height - pad}
          stroke={theme.colors.border}
        />
        {motorBands}
        <Path d={flowPath} stroke={theme.colors.success} strokeWidth={2} fill="none" />
        <Path d={weightPath} stroke={theme.colors.primary} strokeWidth={2.5} fill="none" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  legend: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  legendItem: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
  },
  emptyText: {
    color: theme.colors.secondary,
    fontFamily: theme.fonts.medium,
  },
});
