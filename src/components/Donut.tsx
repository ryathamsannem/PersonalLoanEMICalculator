type Props = {
  principal: number;
  interest: number;
  size?: number;
  stroke?: number;
};

export default function Donut({
  principal,
  interest,
  size = 280,
  stroke = 45, // thicker ring only
}: Props) {
  const total = Math.max(1, principal + interest);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const interestLen = (interest / total) * c;

  const inr = (x: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(x);

  const pPct = ((principal / total) * 100).toFixed(1);
  const iPct = ((interest / total) * 100).toFixed(1);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g transform={`translate(${size / 2}, ${size / 2})`}>
        <circle
          r={r}
          fill="none"
          stroke="#dbeafe"
          strokeWidth={stroke}
          className="cursor-pointer transition-all hover:opacity-80"
        >
          <title>{`Principal: ${inr(principal)} (${pPct}%)`}</title>
        </circle>
        <circle
          r={r}
          fill="none"
          stroke="#2563eb"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${interestLen} ${c - interestLen}`}
          transform="rotate(-90)"
          className="cursor-pointer transition-all hover:opacity-80"
        >
          <title>{`Interest: ${inr(interest)} (${iPct}%)`}</title>
        </circle>
      </g>
    </svg>
  );
}
