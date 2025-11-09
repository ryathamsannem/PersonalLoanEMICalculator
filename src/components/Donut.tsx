// src/components/Donut.tsx
export default function Donut({
  principal,
  interest,
  size = 300,
  stroke = 22,
}: { principal: number; interest: number; size?: number; stroke?: number }) {
  const total = Math.max(1, principal + interest);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const interestLen = (interest / total) * c;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Principal vs Interest">
      <g transform={`translate(${size / 2}, ${size / 2})`}>
        <circle r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
        <circle
          r={r}
          fill="none"
          stroke="#4f46e5"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${interestLen} ${c - interestLen}`}
          transform="rotate(-90)"
        />
      </g>
    </svg>
  );
}
