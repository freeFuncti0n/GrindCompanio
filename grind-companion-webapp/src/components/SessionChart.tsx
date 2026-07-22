type Point = { t: number; weight: number; flow: number };

type Props = {
  points: Point[];
  height?: number;
};

export function SessionChart({ points, height = 160 }: Props) {
  if (points.length < 2) {
    return <div className="chart-empty">Keine Live-Daten</div>;
  }
  const w = 360;
  const h = height;
  const pad = 8;
  const maxT = Math.max(...points.map((p) => p.t), 1);
  const maxW = Math.max(...points.map((p) => p.weight), 1);
  const maxF = Math.max(...points.map((p) => p.flow), 0.1);

  const toX = (t: number) => pad + (t / maxT) * (w - pad * 2);
  const toYW = (v: number) => h - pad - (v / maxW) * (h - pad * 2);
  const toYF = (v: number) => h - pad - (v / maxF) * (h - pad * 2) * 0.45;

  const weightPath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p.t).toFixed(1)} ${toYW(p.weight).toFixed(1)}`)
    .join(' ');
  const flowPath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p.t).toFixed(1)} ${toYF(p.flow).toFixed(1)}`)
    .join(' ');

  return (
    <svg className="session-chart" viewBox={`0 0 ${w} ${h}`} width="100%" height={height}>
      <path d={weightPath} fill="none" stroke="#FF3D00" strokeWidth="2" />
      <path d={flowPath} fill="none" stroke="#00AAFF" strokeWidth="1.5" opacity={0.85} />
    </svg>
  );
}
