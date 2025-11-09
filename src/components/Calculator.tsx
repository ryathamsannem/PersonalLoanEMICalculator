"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { computeEmi, inr, round2 } from "@/lib/emi";
import SliderRow from "@/components/SliderRow";
import Donut from "@/components/Donut";

export default function Calculator() {
  const params = useSearchParams();
  const router = useRouter();

  const principal = Number(params.get("amount") ?? 1000000);
  const rate = Number(params.get("rate") ?? 10);
  const months = Number(params.get("months") ?? 60);

  const out = computeEmi({ principal, annualRatePct: rate, tenureMonths: months });

  const setParam = (key: string, v: number) => {
    const map = new Map(params.entries());
    map.set(key, String(v));
    const sp = new URLSearchParams(map as any);
    router.replace(`/?${sp.toString()}`);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Personal Loan EMI Calculator</h1>
      <p className="text-gray-600 mt-1">
        Instant EMI, interest & payoff visualization. Shareable URL.
      </p>

      <div className="grid md:grid-cols-2 gap-8 mt-8">
        {/* Left Side - Sliders */}
        <section className="space-y-6">
          <SliderRow
            label="Loan amount"
            min={50000}
            max={5000000}
            step={10000}
            value={principal}
            onChange={(v) => setParam("amount", v)}
            prefix="₹ "
          />
          <SliderRow
            label="Rate of interest (p.a.)"
            min={5}
            max={24}
            step={0.1}
            value={rate}
            onChange={(v) => setParam("rate", v)}
            suffix=" %"
          />
          <SliderRow
            label="Loan tenure (months)"
            min={6}
            max={360}
            step={1}
            value={months}
            onChange={(v) => setParam("months", v)}
          />

          <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl">
            <Stat label="Monthly EMI" value={inr(round2(out.monthlyEmi))} />
            <Stat label="Total interest" value={inr(Math.round(out.totalInterest))} />
            <Stat label="Total payment" value={inr(Math.round(out.totalPayment))} />
            <Stat label="Tenure" value={`${months} months`} />
          </div>
        </section>

        {/* Right Side - Donut Chart */}
        <section className="flex flex-col items-center justify-center">
          <Donut principal={principal} interest={out.totalInterest} />
          <div className="mt-4 text-sm text-gray-700">
            <span className="inline-block w-3 h-3 rounded-full bg-gray-300 mr-2" />
            Principal
            <span className="inline-block w-3 h-3 rounded-full bg-indigo-600 ml-6 mr-2" />
            Interest
          </div>
        </section>
      </div>

      <AmortizationPreview data={out.breakdown.slice(0, 12)} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg bg-white border border-gray-200 shadow-sm">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function AmortizationPreview({
  data,
}: {
  data: { month: number; principal: number; interest: number; balance: number }[];
}) {
  return (
    <div className="mt-10">
      <h2 className="text-lg font-semibold mb-3">First 12 months (preview)</h2>
      <div className="overflow-auto border rounded-xl">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <Th>Month</Th>
              <Th>Principal</Th>
              <Th>Interest</Th>
              <Th>Balance</Th>
            </tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr key={r.month} className="even:bg-gray-50">
                <Td>{r.month}</Td>
                <Td>₹ {Math.round(r.principal).toLocaleString("en-IN")}</Td>
                <Td>₹ {Math.round(r.interest).toLocaleString("en-IN")}</Td>
                <Td>₹ {Math.round(r.balance).toLocaleString("en-IN")}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left font-medium px-4 py-2 text-gray-700">{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-2 text-gray-800 tabular-nums">{children}</td>;
}
