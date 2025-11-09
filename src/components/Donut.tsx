// src/components/Donut.tsx
type Props = {
  principal: number;
  interest: number;
  size?: number;   // overall diameter (kept same)
  stroke?: number; // ring thickness (we make this bigger)
};

export default function Donut({ principal, interest, size = 280, stroke = 30 }: Props) {
  const total = Math.max(1, principal + interest);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const interestLen = (interest / total) * c;

  const pPct = ((principal / total) * 100).toFixed(1);
  const iPct = ((interest / total) * 100).toFixed(1);

  const inr = (x: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(x);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="Principal vs Interest"
      className="select-none"
    >
      <g transform={`translate(${size / 2}, ${size / 2})`}>
        {/* Base: principal */}
        <circle r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke}>
          <title>{`Principal: ${inr(principal)} (${pPct}%)`}</title>
        </circle>

        {/* Interest arc */}
        <circle
          r={r}
          fill="none"
          stroke="#4f46e5"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${interestLen} ${c - interestLen}`}
          transform="rotate(-90)"
        >
          <title>{`Interest: ${inr(interest)} (${iPct}%)`}</title>
        </circle>
      </g>
    </svg>
  );
}
