// src/lib/emi.ts
export type EmiInput = {
  principal: number;        // loan amount (INR)
  annualRatePct: number;    // e.g., 10.5
  tenureMonths: number;     // e.g., 60
};

export type EmiOutput = {
  monthlyEmi: number;
  totalPayment: number;
  totalInterest: number;
  breakdown: { month: number; principal: number; interest: number; balance: number }[];
};

// EMI = P * r * (1+r)^n / ((1+r)^n - 1)
export function computeEmi({ principal, annualRatePct, tenureMonths }: EmiInput): EmiOutput {
  const r = annualRatePct / 12 / 100;
  const n = Math.max(1, Math.floor(tenureMonths));

  const pow = Math.pow(1 + r, n);
  const monthlyEmi = r === 0 ? principal / n : (principal * r * pow) / (pow - 1);

  const breakdown: EmiOutput["breakdown"] = [];
  let balance = principal;
  for (let m = 1; m <= n; m++) {
    const interest = balance * r;
    const principalComp = Math.min(monthlyEmi - interest, balance);
    balance = Math.max(0, balance - principalComp);
    breakdown.push({ month: m, principal: principalComp, interest, balance });
  }

  const totalPayment = monthlyEmi * n;
  const totalInterest = totalPayment - principal;

  return { monthlyEmi, totalPayment, totalInterest, breakdown };
}

export function inr(x: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(x);
}
export const round2 = (x: number) => Math.round((x + Number.EPSILON) * 100) / 100;
