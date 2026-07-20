import Svg, { Circle, G } from 'react-native-svg';
import { theme } from '../theme';

type Props = {
  size?: number;
  progress: number; // 0-100
  color?: string;
  trackColor?: string;
};

export function ProgressArc({
  size = theme.sizes.progressArc,
  progress,
  color = theme.colors.primary,
  trackColor = theme.colors.neutral,
}: Props) {
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, progress));
  const strokeDashoffset = circumference * (1 - clamped / 100);
  const cx = size / 2;
  const cy = size / 2;

  return (
    <Svg width={size} height={size}>
      <G transform={`rotate(-90 ${cx} ${cy})`}>
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={trackColor}
          strokeWidth={stroke}
          fill="none"
          opacity={0.35}
        />
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </G>
    </Svg>
  );
}
