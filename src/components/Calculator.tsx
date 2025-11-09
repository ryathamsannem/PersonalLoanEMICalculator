"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SliderRow from "@/components/SliderRow";
import Donut from "@/components/Donut";
import { computeEmi, inr, round2 } from "@/lib/emi";

/* -----------------------------------------------------------
 * Calculator (aligned controls + exports)
 * -------------------------------------------------------- */
export default function Calculator() {
  const params = useSearchParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // URL -> State
  const [amount, setAmount] = useState<number>(Number(params.get("amount") ?? 50_000));
  const [rate, setRate] = useState<number>(Number(params.get("rate") ?? 10));
  const [months, setMonths] = useState<number>(Number(params.get("months") ?? 60));
  const [tenureMode, setTenureMode] = useState<"months" | "years">(params.get("mode") === "years" ? "years" : "months");
  const [startDate, setStartDate] = useState<string>(params.get("start") ?? todayISO());
  const [mode, setMode] = useState<"monthly" | "yearly">("monthly");

  // Debounced URL sync
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncUrl = useCallback((next: {
    amount?: number; rate?: number; months?: number;
    mode?: "months" | "years"; start?: string
  }) => {
    const map = new Map(params.entries());
    if (next.amount  !== undefined) map.set("amount",  String(next.amount));
    if (next.rate    !== undefined) map.set("rate",    String(next.rate));
    if (next.months  !== undefined) map.set("months",  String(next.months));
    if (next.mode    !== undefined) map.set("mode",    next.mode);
    if (next.start   !== undefined) map.set("start",   next.start);
    const sp = new URLSearchParams(map as any);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      startTransition(() => router.replace(`/?${sp.toString()}`));
    }, 250);
  }, [params, router, startTransition]);

  // Computation
  const out = useMemo(() => computeEmi({
    principal: amount, annualRatePct: rate, tenureMonths: months
  }), [amount, rate, months]);

  // Derived / handlers
  const yearsValue = round2(months / 12);
  const onAmount = (v: number) => { setAmount(v); syncUrl({ amount: v }); };
  const onRate   = (v: number) => { setRate(v);   syncUrl({ rate: v   }); };
  const onMonths = (v: number) => { setMonths(v); syncUrl({ months: v }); };
  const onYears  = (yrs: number) => {
    const m = Math.round(yrs * 12); setMonths(m); setTenureMode("years"); syncUrl({ months: m, mode: "years" });
  };
  const onStartDate = (d: string) => { setStartDate(d); syncUrl({ start: d }); };

  // Table data (full schedule)
  const monthlyRows = useMemo(
    () => attachDates(out.breakdown, startDate),
    [out.breakdown, startDate]
  );
  const yearlyRows = useMemo(
    () => groupByYear(monthlyRows),
    [monthlyRows]
  );

  // Exporters
  const exportCSV = () => {
    const rows = mode === "monthly"
      ? monthlyRows.map(r => [r.date, r.month, Math.round(r.principal), Math.round(r.interest), Math.round(r.balance)])
      : yearlyRows.map(y => [y.year, Math.round(y.principal), Math.round(y.interest), Math.round(y.balance)]);
    const head = mode === "monthly"
      ? ["Date","Month","Principal","Interest","Balance"]
      : ["Year","Principal","Interest","Balance End"];
    const csv = [head, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `amortization_${mode}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const exportPDF = async () => {
    try {
      const { jsPDF } = await import("jspdf");
      // @ts-ignore - default export pattern
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF({ unit: "pt", format: "a4" });

      doc.setFontSize(14);
      doc.text("Personal Loan Amortization", 40, 40);
      doc.setFontSize(11);
      doc.text(`Amount: ${inr(amount)} | Rate: ${rate}% | Tenure: ${months} months | Start: ${startDate}`, 40, 60);

      const head = mode === "monthly"
        ? [["Date","Month","Principal","Interest","Balance"]]
        : [["Year","Principal","Interest","Balance End"]];
      const body = (mode === "monthly"
        ? monthlyRows.map(r => [r.date, r.month, inr(Math.round(r.principal)), inr(Math.round(r.interest)), inr(Math.round(r.balance))])
        : yearlyRows.map(y => [String(y.year), inr(Math.round(y.principal)), inr(Math.round(y.interest)), inr(Math.round(y.balance))])
      ) as any[];

      autoTable(doc, { head, body, startY: 80, styles: { fontSize: 9 } });
      doc.save(`amortization_${mode}.pdf`);
    } catch (e) {
      alert('PDF export needs: pnpm add jspdf jspdf-autotable');
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <header className="mb-6">
        <h1 className="text-4xl font-extrabold tracking-tight text-blue-700">
          Personal Loan EMI Calculator
        </h1>
        <p className="text-gray-700 mt-2">
          Instant EMI, interest &amp; payoff visualization. Shareable URL.
        </p>
      </header>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Controls (aligned like Groww) */}
        <section>
          <div className="rounded-2xl border border-blue-100 bg-white shadow-sm p-6">
            <div className="space-y-6 max-w-xl">
              {/* Amount */}
              <FormRow>
                <FormLabel>Loan amount</FormLabel>
                <ValueBox>₹</ValueBox>
                <BoxInput value={amount} onChange={onAmount} />
              </FormRow>
              <SliderRow label="" min={50_000} max={10_000_000} step={10_000} value={amount} onChange={onAmount} />

              {/* Rate */}
              <FormRow>
                <FormLabel>Rate of interest (p.a.)</FormLabel>
                <BoxInput value={rate} onChange={onRate} width="w-28" step={0.1} />
                <ValueBox>%</ValueBox>
              </FormRow>
              <SliderRow label="" min={5} max={36} step={0.1} value={rate} onChange={onRate} />

              {/* Tenure header + toggle */}
              <div className="flex items-center justify-between">
                <FormLabel>Loan tenure</FormLabel>
                <TenureToggle
                  mode={tenureMode}
                  onMode={(m) => { setTenureMode(m); syncUrl({ mode: m }); }}
                />
              </div>

              {/* Tenure slider + box */}
              {tenureMode === "months" ? (
                <>
                  <FormRow>
                    <FormLabel>Tenure (months)</FormLabel>
                    <BoxInput value={months} onChange={onMonths} />
                  </FormRow>
                  <SliderRow label="" min={6} max={360} step={1} value={months} onChange={onMonths} />
                </>
              ) : (
                <>
                  <FormRow>
                    <FormLabel>Tenure (years)</FormLabel>
                    <BoxInput value={yearsValue} onChange={(v)=>onYears(Number(v))} step={0.5} />
                  </FormRow>
                  <SliderRow label="" min={0.5} max={30} step={0.5} value={yearsValue} onChange={onYears} />
                </>
              )}

              {/* Start date */}
              <div className="space-y-1">
                <label className="text-sm font-semibold text-blue-700">Start date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => onStartDate(e.target.value)}
                  className="w-48 rounded-md border border-blue-300 bg-white px-3 py-2 text-sm text-gray-900
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500">Amortization starts from this date.</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid sm:grid-cols-2 gap-4 mt-6">
            <Stat label="Monthly EMI" value={inr(round2(out.monthlyEmi))} />
            <Stat label="Total interest" value={inr(Math.round(out.totalInterest))} />
            <Stat label="Total payment" value={inr(Math.round(out.totalPayment))} />
            <Stat label="Tenure" value={`${months} months`} />
          </div>
        </section>

        {/* Donut + table */}
        <section className="flex flex-col items-center gap-6">
          <div className="rounded-2xl border border-blue-100 bg-white shadow-sm p-6 w-full flex flex-col items-center">
            <Donut principal={amount} interest={out.totalInterest} />
            <div className="mt-4 text-sm text-gray-700">
              <span className="inline-block w-3 h-3 rounded-full bg-blue-100 border border-blue-200 mr-2" /> Principal
              <span className="inline-block w-3 h-3 rounded-full bg-blue-600 ml-6 mr-2" /> Interest
            </div>
          </div>

          {/* Schedule header with toggles + exports */}
          <div className="w-full">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-blue-700">
                Amortization Schedule ({mode === "monthly" ? "Monthly" : "Yearly"})
              </h2>
              <div className="flex items-center gap-2">
                <ToggleSmall
                  left="Monthly" right="Yearly"
                  active={mode === "monthly" ? "left" : "right"}
                  onLeft={()=>setMode("monthly")}
                  onRight={()=>setMode("yearly")}
                />
                <button onClick={exportCSV}
                        className="ml-2 rounded-full bg-blue-50 text-blue-700 px-3 py-1 text-sm border border-blue-200 hover:bg-blue-100">
                  Download CSV
                </button>
                <button onClick={exportPDF}
                        className="rounded-full bg-blue-600 text-white px-3 py-1 text-sm hover:bg-blue-700">
                  Download PDF
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-auto border rounded-2xl">
              <table className="min-w-full text-sm">
                <thead className="bg-blue-50">
                  <tr>
                    {mode === "monthly" ? (
                      <>
                        <Th>Date</Th><Th>Month</Th><Th>Principal</Th><Th>Interest</Th><Th>Balance</Th>
                      </>
                    ) : (
                      <>
                        <Th>Year</Th><Th>Principal</Th><Th>Interest</Th><Th>Balance End</Th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {mode === "monthly"
                    ? monthlyRows.map((r) => (
                        <tr key={r.month} className="even:bg-blue-50">
                          <Td>{r.date}</Td>
                          <Td>{r.month}</Td>
                          <Td>₹ {Math.round(r.principal).toLocaleString("en-IN")}</Td>
                          <Td>₹ {Math.round(r.interest).toLocaleString("en-IN")}</Td>
                          <Td>₹ {Math.round(r.balance).toLocaleString("en-IN")}</Td>
                        </tr>
                      ))
                    : yearlyRows.map((y) => (
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
        </section>
      </div>

      {isPending && <div className="mt-4 text-sm text-gray-400">Updating link…</div>}
    </div>
  );
}

/* ---------- small building blocks (alignment like Groww) ---------- */

function FormRow({ children }: { children: React.ReactNode }) {
  // label | value box | input box all aligned on one row
  return <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2">{children}</div>;
}
function FormLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-sm font-semibold text-blue-700">{children}</div>;
}
function ValueBox({ children }: { children: React.ReactNode }) {
  return <div className="px-3 py-2 rounded-md border border-blue-200 bg-blue-50 text-blue-700 text-sm">{children}</div>;
}
function BoxInput({
  value, onChange, width = "w-36", step = 1
}: { value: number | string; onChange: (v: number) => void; width?: string; step?: number }) {
  const [tmp, setTmp] = useState(String(value));
  // keep caret stable, validate on blur
  return (
    <input
      type="text"
      value={tmp}
      onChange={(e) => setTmp(e.target.value)}
      onBlur={() => {
        const n = Number(tmp);
        if (!isNaN(n)) onChange(n); else setTmp(String(value));
      }}
      className={`${width} rounded-md border border-blue-300 bg-white px-3 py-2 text-right text-sm text-gray-900
                  focus:outline-none focus:ring-2 focus:ring-blue-500`}
      inputMode="decimal"
    />
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-xs text-blue-700 font-medium">{label}</div>
      <div className="text-2xl font-semibold tabular-nums text-gray-900">{value}</div>
    </div>
  );
}
function TenureToggle({ mode, onMode }: { mode:"months"|"years"; onMode:(m:"months"|"years")=>void }) {
  return (
    <div className="inline-flex rounded-full border border-blue-200 bg-blue-50 p-1 text-sm">
      <button
        className={`px-3 py-1 rounded-full ${mode==="months" ? "bg-white shadow-sm text-blue-700 font-semibold":"text-blue-700"}`}
        onClick={() => onMode("months")}
      >Months</button>
      <button
        className={`px-3 py-1 rounded-full ${mode==="years" ? "bg-white shadow-sm text-blue-700 font-semibold":"text-blue-700"}`}
        onClick={() => onMode("years")}
      >Years</button>
    </div>
  );
}
function ToggleSmall({ left, right, active, onLeft, onRight }:{
  left:string; right:string; active:"left"|"right"; onLeft:()=>void; onRight:()=>void
}) {
  return (
    <div className="inline-flex rounded-full border border-blue-200 bg-blue-50 p-1 text-sm">
      <button className={`px-3 py-1 rounded-full ${active==="left" ? "bg-white shadow-sm text-blue-700 font-semibold":"text-blue-700"}`} onClick={onLeft}>{left}</button>
      <button className={`px-3 py-1 rounded-full ${active==="right"? "bg-white shadow-sm text-blue-700 font-semibold":"text-blue-700"}`} onClick={onRight}>{right}</button>
    </div>
  );
}
function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-2 text-left text-blue-700 font-medium">{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-2 text-gray-900 tabular-nums">{children}</td>;
}

/* ---------- date & grouping utils ---------- */

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
  rows: { month:number; principal:number; interest:number; balance:number }[],
  startISO: string
) {
  return rows.map((r) => ({ ...r, date: addMonthsISO(startISO, r.month - 1) }));
}
function groupByYear(rows: { date:string; principal:number; interest:number; balance:number }[]) {
  const map: Record<number, { principal:number; interest:number; balance:number }> = {};
  for (const r of rows) {
    const y = new Date(r.date).getFullYear();
    if (!map[y]) map[y] = { principal: 0, interest: 0, balance: r.balance };
    map[y].principal += r.principal;
    map[y].interest  += r.interest;
    map[y].balance    = r.balance;
  }
  return Object.entries(map).map(([year, v]) => ({ year: Number(year), ...v }));
}
