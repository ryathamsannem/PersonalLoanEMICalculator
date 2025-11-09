"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SliderRow from "@/components/SliderRow";
import Donut from "@/components/Donut";
import { computeEmi, inr, round2 } from "@/lib/emi";

/** -----------------------------------------------------------
 *  Main component
 *  -------------------------------------------------------- */
export default function Calculator() {
  const params = useSearchParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // ---- URL → local state (with defaults)
  const [amount, setAmount] = useState<number>(
    Number(params.get("amount") ?? 50_000)
  );
  const [rate, setRate] = useState<number>(Number(params.get("rate") ?? 10));
  const [months, setMonths] = useState<number>(
    Number(params.get("months") ?? 60)
  );
  const [tenureMode, setTenureMode] = useState<"months" | "years">(
    params.get("mode") === "years" ? "years" : "months"
  );
  const [startDate, setStartDate] = useState<string>(
    params.get("start") ?? todayISO()
  );

  // ---- Debounced URL sync (prevents lag while sliding/typing)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncUrl = useCallback(
    (next: {
      amount?: number;
      rate?: number;
      months?: number;
      mode?: "months" | "years";
      start?: string;
    }) => {
      const map = new Map(params.entries());
      if (next.amount !== undefined) map.set("amount", String(next.amount));
      if (next.rate !== undefined) map.set("rate", String(next.rate));
      if (next.months !== undefined) map.set("months", String(next.months));
      if (next.mode !== undefined) map.set("mode", next.mode);
      if (next.start !== undefined) map.set("start", next.start);

      const sp = new URLSearchParams(map as any);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        startTransition(() => router.replace(`/?${sp.toString()}`));
      }, 250);
    },
    [params, router, startTransition]
  );

  // ---- EMI calculation (memoized)
  const out = useMemo(
    () =>
      computeEmi({
        principal: amount,
        annualRatePct: rate,
        tenureMonths: months,
      }),
    [amount, rate, months]
  );

  // ---- Handlers
  const onAmount = (v: number) => {
    setAmount(v);
    syncUrl({ amount: v });
  };
  const onRate = (v: number) => {
    setRate(v);
    syncUrl({ rate: v });
  };
  const onMonths = (v: number) => {
    setMonths(v);
    syncUrl({ months: v });
  };
  const onYears = (yrs: number) => {
    const m = Math.round(yrs * 12);
    setMonths(m);
    setTenureMode("years");
    syncUrl({ months: m, mode: "years" });
  };
  const onStartDate = (d: string) => {
    setStartDate(d);
    syncUrl({ start: d });
  };

  // Derived
  const yearsValue = round2(months / 12);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <header className="mb-6">
        <h1 className="text-4xl font-bold tracking-tight text-blue-700">
          Personal Loan EMI Calculator
        </h1>
        <p className="text-gray-700 mt-2">
          Instant EMI, interest &amp; payoff visualization. Shareable URL.
        </p>
      </header>

      <div className="grid lg:grid-cols-2 gap-10">
        {/* Controls */}
        <section className="space-y-8">
          <Card>
            <div className="space-y-6">
              <SliderRow
                label="Loan amount"
                min={50_000}
                max={10_000_000}
                step={10_000}
                value={amount}
                onChange={onAmount}
                prefix="₹"
              />

              <SliderRow
                label="Rate of interest (p.a.)"
                min={5}
                max={36}
                step={0.1}
                value={rate}
                onChange={onRate}
                suffix="%"
              />

              {/* Tenure with Months/Years toggle */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-blue-700">
                    Loan tenure
                  </div>
                  <TenureToggle
                    mode={tenureMode}
                    onMode={(m) => {
                      setTenureMode(m);
                      syncUrl({ mode: m });
                    }}
                  />
                </div>

                {tenureMode === "months" ? (
                  <SliderRow
                    label="Tenure (months)"
                    min={6}
                    max={360}
                    step={1}
                    value={months}
                    onChange={onMonths}
                  />
                ) : (
                  <SliderRow
                    label="Tenure (years)"
                    min={0.5}
                    max={30}
                    step={0.5}
                    value={yearsValue}
                    onChange={(v) => onYears(v)}
                  />
                )}
              </div>

              {/* Start date */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-blue-700">
                  Start date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => onStartDate(e.target.value)}
                  className="w-48 rounded-md border border-blue-300 bg-white px-3 py-2 text-sm text-gray-900
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500">
                  Amortization starts from this date.
                </p>
              </div>
            </div>
          </Card>

          {/* Stats */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Stat label="Monthly EMI" value={inr(round2(out.monthlyEmi))} />
            <Stat
              label="Total interest"
              value={inr(Math.round(out.totalInterest))}
            />
            <Stat
              label="Total payment"
              value={inr(Math.round(out.totalPayment))}
            />
            <Stat label="Tenure" value={`${months} months`} />
          </div>
        </section>

        {/* Visualization */}
        <section className="flex flex-col items-center">
          <Card className="w-full flex flex-col items-center">
            {/* Donut: make sure you updated Donut.tsx to thicker ring + tooltips */}
            <Donut principal={amount} interest={out.totalInterest} />
            <div className="mt-4 text-sm text-gray-700">
              <span className="inline-block w-3 h-3 rounded-full bg-blue-100 border border-blue-200 mr-2" />{" "}
              Principal
              <span className="inline-block w-3 h-3 rounded-full bg-blue-600 ml-6 mr-2" />{" "}
              Interest
            </div>
          </Card>

          {/* Full amortization with Monthly/Yearly toggle */}
          <AmortizationPreview
            data={attachDates(out.breakdown, startDate)}
          />
        </section>
      </div>

      {isPending && (
        <div className="mt-4 text-sm text-gray-400">Updating link…</div>
      )}
    </div>
  );
}

/** -----------------------------------------------------------
 *  Mini UI helpers
 *  -------------------------------------------------------- */

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-gray-200 bg-white p-5 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-xs text-blue-700 font-medium">{label}</div>
      <div className="text-2xl font-semibold tabular-nums text-gray-900">
        {value}
      </div>
    </div>
  );
}

function TenureToggle({
  mode,
  onMode,
}: {
  mode: "months" | "years";
  onMode: (m: "months" | "years") => void;
}) {
  return (
    <div className="inline-flex rounded-full border border-blue-200 bg-blue-50 p-1 text-sm">
      <button
        className={`px-3 py-1 rounded-full ${
          mode === "months"
            ? "bg-white shadow-sm text-blue-700 font-semibold"
            : "text-blue-700"
        }`}
        onClick={() => onMode("months")}
      >
        Months
      </button>
      <button
        className={`px-3 py-1 rounded-full ${
          mode === "years"
            ? "bg-white shadow-sm text-blue-700 font-semibold"
            : "text-blue-700"
        }`}
        onClick={() => onMode("years")}
      >
        Years
      </button>
    </div>
  );
}

/** -----------------------------------------------------------
 *  Amortization table (Monthly ↔ Yearly)
 *  -------------------------------------------------------- */

function AmortizationPreview({
  data,
}: {
  data: {
    month: number;
    principal: number;
    interest: number;
    balance: number;
    date: string;
  }[];
}) {
  const [mode, setMode] = useState<"monthly" | "yearly">("monthly");

  const yearly = useMemo(() => {
    const groups: Record<
      number,
      { principal: number; interest: number; balance: number }
    > = {};
    data.forEach((r) => {
      const y = new Date(r.date).getFullYear();
      if (!groups[y]) groups[y] = { principal: 0, interest: 0, balance: r.balance };
      groups[y].principal += r.principal;
      groups[y].interest += r.interest;
      groups[y].balance = r.balance;
    });
    return Object.entries(groups).map(([year, v]) => ({
      year: Number(year),
      ...v,
    }));
  }, [data]);

  return (
    <div className="mt-8 w-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-blue-700">
          Amortization Schedule ({mode === "monthly" ? "Monthly" : "Yearly"})
        </h2>
        <div className="flex gap-2">
          <button
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              mode === "monthly"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-blue-700"
            }`}
            onClick={() => setMode("monthly")}
          >
            Monthly
          </button>
          <button
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              mode === "yearly"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-blue-700"
            }`}
            onClick={() => setMode("yearly")}
          >
            Yearly
          </button>
        </div>
      </div>

      <div className="overflow-auto border rounded-2xl">
        <table className="min-w-full text-sm">
          <thead className="bg-blue-50">
            <tr>
              {mode === "monthly" ? (
                <>
                  <Th>Date</Th>
                  <Th>Month</Th>
                  <Th>Principal</Th>
                  <Th>Interest</Th>
                  <Th>Balance</Th>
                </>
              ) : (
                <>
                  <Th>Year</Th>
                  <Th>Principal</Th>
                  <Th>Interest</Th>
                  <Th>Balance End</Th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {mode === "monthly"
              ? data.map((r) => (
                  <tr key={r.month} className="even:bg-blue-50">
                    <Td>{r.date}</Td>
                    <Td>{r.month}</Td>
                    <Td>₹ {Math.round(r.principal).toLocaleString("en-IN")}</Td>
                    <Td>₹ {Math.round(r.interest).toLocaleString("en-IN")}</Td>
                    <Td>₹ {Math.round(r.balance).toLocaleString("en-IN")}</Td>
                  </tr>
                ))
              : yearly.map((y) => (
                  <tr key={y.year} className="even:bg-blue-50">
                    <Td>{y.year}</Td>
                    <Td>₹ {Math.round(y.principal).toLocaleString("en-IN")}</Td>
                    <Td>₹ {Math.round(y.interest).toLocaleString("en-IN")}</Td>
                    <Td>₹ {Math.round(y.balance).toLocaleString("en-IN")}</Td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2 text-left text-blue-700 font-medium">{children}</th>
  );
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-2 text-gray-900 tabular-nums">{children}</td>;
}

/** -----------------------------------------------------------
 *  Small utils
 *  -------------------------------------------------------- */

function todayISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}
function addMonthsISO(iso: string, add: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1 + add, d);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mm}-${dd}`;
}
function attachDates(
  rows: {
    month: number;
    principal: number;
    interest: number;
    balance: number;
  }[],
  startISO: string
) {
  return rows.map((r) => ({ ...r, date: addMonthsISO(startISO, r.month - 1) }));
}
