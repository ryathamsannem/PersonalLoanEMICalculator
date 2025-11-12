"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  useTransition,
  useEffect,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SliderRow from "@/components/SliderRow";
import Donut from "@/components/Donut";
import { computeEmi, inr, round2 } from "@/lib/emi";

/* -----------------------------------------------------------
 *  Refined UI with synced inputs, sensible defaults, and styling
 * -------------------------------------------------------- */
export default function Calculator() {
  const params = useSearchParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // ---------- defaults ----------
  // Start date = 7th of current month
  const defaultStart = monthSeventhISO();

  // committed (source of truth)
  const [amount, setAmount] = useState<number>(
    Number(params.get("amount") ?? 500_000)
  );
  const [rate, setRate] = useState<number>(
    Number(params.get("rate") ?? 9.99)
  );
  // Default to YEARS (5y => 60 months) unless URL overrides
  const [modeTenure, setModeTenure] = useState<"months" | "years">(
    (params.get("mode") as "months" | "years") ?? "years"
  );
  const [months, setMonths] = useState<number>(
    Number(params.get("months") ?? 60)
  );
  const [startDate, setStartDate] = useState<string>(
    params.get("start") ?? defaultStart
  );

  // drafts (edited live, committed on Calculate)
  const [dAmount, setDAmount] = useState(amount);
  const [dRate, setDRate] = useState(rate);
  const [dMonths, setDMonths] = useState(months);
  const [dMode, setDMode] = useState<"months" | "years">(modeTenure);
  const [dStart, setDStart] = useState<string>(startDate);

  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pushUrl = useCallback(
    (v: {
      amount: number;
      rate: number;
      months: number;
      mode: "months" | "years";
      start: string;
    }) => {
      const map = new Map(params.entries());
      map.set("amount", String(v.amount));
      map.set("rate", String(v.rate));
      map.set("months", String(v.months));
      map.set("mode", v.mode);
      map.set("start", v.start);
      const sp = new URLSearchParams(map as any);
      if (debRef.current) clearTimeout(debRef.current);
      debRef.current = setTimeout(() => {
        startTransition(() => router.replace(`/?${sp.toString()}`));
      }, 120);
    },
    [params, router, startTransition]
  );

  const onCalculate = () => {
    const commitMonths =
      dMode === "years" ? Math.round(Number(dMonths) * 12) : Math.round(Number(dMonths));
    setAmount(Number(dAmount));
    setRate(Number(dRate));
    setMonths(commitMonths);
    setModeTenure(dMode);
    setStartDate(dStart);
    pushUrl({
      amount: Number(dAmount),
      rate: Number(dRate),
      months: commitMonths,
      mode: dMode,
      start: dStart,
    });
  };

  // compute on committed values
  const out = useMemo(
    () =>
      computeEmi({
        principal: amount,
        annualRatePct: rate,
        tenureMonths: months,
      }),
    [amount, rate, months]
  );

  // amortization data
  const monthlyRows = useMemo(
    () => attachDates(out.breakdown, startDate),
    [out.breakdown, startDate]
  );
  const yearlyRows = useMemo(() => groupByYear(monthlyRows), [monthlyRows]);
  const [tableMode, setTableMode] = useState<"monthly" | "yearly">("monthly");

  // exports + share
  const exportCSV = () => {
    const head =
      tableMode === "monthly"
        ? ["Date", "Month", "Principal", "Interest", "Balance"]
        : ["Year", "Principal", "Interest", "Balance End"];
    const rows =
      tableMode === "monthly"
        ? monthlyRows.map((r) => [
            r.date,
            r.month,
            fmtIN(r.principal),
            fmtIN(r.interest),
            fmtIN(r.balance),
          ])
        : yearlyRows.map((y) => [
            y.year,
            fmtIN(y.principal),
            fmtIN(y.interest),
            fmtIN(y.balance),
          ]);
    const csv = [head, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `amortization_${tableMode}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const exportPDF = async () => {
    try {
      const { jsPDF } = await import("jspdf");
      // @ts-ignore
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF({ unit: "pt", format: "a4" });

      doc.setFont("helvetica", "");
      doc.setFontSize(14);
      doc.text("Personal Loan Amortization", 40, 40);
      doc.setFontSize(11);
      doc.text(
        `Amount: ${fmtIN(amount)} INR  |  Rate: ${rate}%  |  Tenure: ${months} months  |  Start: ${startDate}`,
        40,
        60
      );

      const head =
        tableMode === "monthly"
          ? [["Date", "Month", "Principal (INR)", "Interest (INR)", "Balance (INR)"]]
          : [["Year", "Principal (INR)", "Interest (INR)", "Balance End (INR)"]];
      const body = (tableMode === "monthly"
        ? monthlyRows.map((r) => [
            r.date,
            String(r.month),
            fmtIN(r.principal),
            fmtIN(r.interest),
            fmtIN(r.balance),
          ])
        : yearlyRows.map((y) => [
            String(y.year),
            fmtIN(y.principal),
            fmtIN(y.interest),
            fmtIN(y.balance),
          ])) as any[];

      autoTable(doc, { head, body, startY: 80, styles: { fontSize: 9 } });
      doc.save(`amortization_${tableMode}.pdf`);
    } catch {
      alert("PDF export needs: pnpm add jspdf jspdf-autotable");
    }
  };

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert("Link copied!");
    } catch {
      alert("Copy failed. Please copy from the address bar.");
    }
  };

  // draft-years display
  const draftYears = dMode === "years" ? Number(dMonths) : round2(Number(dMonths) / 12);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <header className="mb-6">
        <h1 className="text-4xl font-bold text-brand-blue tracking-tight leading-tight">
          Personal Loan EMI Calculator
        </h1>
        <p className="text-brand-gray font-light mt-1">
          Instant EMI, interest & payoff visualization — share your configuration with a link.
        </p>
      </header>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* LEFT — controls */}
        <section>
          <div className="rounded-2xl border border-blue-100 bg-white shadow-sm hover:shadow-md transition-all duration-300 p-6">
            <div className="space-y-6 max-w-xl">
              {/* Amount */}
              <FormRow>
                <FormLabel>Loan amount</FormLabel>
                <ValueBox>₹</ValueBox>
                <BoxInput
                  value={dAmount}
                  onChange={(v) => setDAmount(Number(v))}
                  placeholder="500000"
                />
              </FormRow>
              <SliderRow
                min={50_000}
                max={10_000_000}
                step={10_000}
                value={dAmount}
                onChange={setDAmount}
              />

              {/* Rate */}
              <FormRow>
                <FormLabel>Rate of interest (p.a.)</FormLabel>
                <BoxInput
                  value={dRate}
                  onChange={(v) => setDRate(Number(v))}
                  width="w-28"
                  step={0.1}
                  placeholder="9.99"
                />
                <ValueBox>%</ValueBox>
              </FormRow>
              <SliderRow min={5} max={36} step={0.1} value={dRate} onChange={setDRate} />

              {/* Tenure toggle */}
              <div className="flex items-center justify-between">
                <FormLabel>Loan tenure</FormLabel>
                <TenureToggle mode={dMode} onMode={(m) => setDMode(m)} />
              </div>

              {/* Tenure inputs */}
              {dMode === "months" ? (
                <>
                  <FormRow>
                    <FormLabel>Tenure (months)</FormLabel>
                    <BoxInput
                      value={dMonths}
                      onChange={(v) => setDMonths(Number(v))}
                      placeholder="60"
                    />
                  </FormRow>
                  <SliderRow min={6} max={360} step={1} value={dMonths} onChange={setDMonths} />
                </>
              ) : (
                <>
                  <FormRow>
                    <FormLabel>Tenure (years)</FormLabel>
                    <BoxInput
                      value={draftYears}
                      onChange={(v) => setDMonths(Number(v) * 12)}
                      step={0.5}
                      placeholder="5"
                    />
                  </FormRow>
                  <SliderRow
                    min={0.5}
                    max={30}
                    step={0.5}
                    value={draftYears}
                    onChange={(v) => setDMonths(Number(v) * 12)}
                  />
                </>
              )}

              {/* Start date */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-brand-blue mb-1">
                  Start date
                </label>
                <input
                  type="date"
                  value={dStart}
                  onChange={(e) => setDStart(e.target.value)}
                  className="w-48 rounded-lg border border-blue-300 bg-white px-3 py-2 mt-1 text-sm text-slate-900
                             focus:outline-none focus:ring-2 focus:ring-brand-blue/70"
                />
                <p className="text-xs text-brand-gray">Amortization starts from this date.</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={onCalculate}
                  className="rounded-full bg-gradient-to-r from-brand-blue to-brand-light text-white px-5 py-2 text-sm font-medium
                             shadow-sm hover:shadow-md transition-all"
                >
                  Calculate
                </button>
                <button
                  onClick={copyShareLink}
                  className="rounded-full bg-blue-50 text-brand-blue px-4 py-2 text-sm border border-blue-200 hover:bg-blue-100 transition"
                >
                  Copy shareable link
                </button>
                {isPending && <span className="text-xs text-slate-400">Updating…</span>}
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

        {/* RIGHT — donut + table */}
        <section className="flex flex-col items-center gap-6">
          <div className="rounded-2xl border border-blue-100 bg-white shadow-sm hover:shadow-md transition p-6 w-full flex flex-col items-center">
            <Donut principal={amount} interest={out.totalInterest} />
            <div className="mt-4 text-sm text-brand-gray">
              <span className="inline-block w-3 h-3 rounded-full bg-blue-100 border border-blue-200 mr-2" />{" "}
              Principal
              <span className="inline-block w-3 h-3 rounded-full bg-brand-blue ml-6 mr-2" />{" "}
              Interest
            </div>
          </div>

          {/* Table + exports */}
          <div className="w-full">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-brand-blue">
                Amortization Schedule ({tableMode === "monthly" ? "Monthly" : "Yearly"})
              </h2>
              <div className="flex items-center gap-2">
                <ToggleSmall
                  left="Monthly"
                  right="Yearly"
                  active={tableMode === "monthly" ? "left" : "right"}
                  onLeft={() => setTableMode("monthly")}
                  onRight={() => setTableMode("yearly")}
                />
                <button
                  onClick={exportCSV}
                  className="ml-2 rounded-full bg-blue-50 text-brand-blue px-3 py-1 text-sm border border-blue-200 hover:bg-blue-100 transition"
                >
                  Download CSV
                </button>
                <button
                  onClick={exportPDF}
                  className="rounded-full bg-brand-blue text-white px-3 py-1 text-sm hover:brightness-110 transition"
                >
                  Download PDF
                </button>
              </div>
            </div>

            <div className="overflow-auto border rounded-2xl">
              <table className="min-w-full text-sm">
                <thead className="bg-blue-50">
                  <tr>
                    {tableMode === "monthly" ? (
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
                  {tableMode === "monthly"
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
    </div>
  );
}

/* ---------------- presentational helpers ---------------- */

function FormRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2">{children}</div>;
}
function FormLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-sm font-medium text-brand-blue">{children}</div>;
}
function ValueBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 text-brand-blue text-sm">
      {children}
    </div>
  );
}

/** Text input that stays in sync with external value and shows red styling when empty */
function BoxInput({
  value,
  onChange,
  width = "w-36",
  step = 1,
  placeholder,
}: {
  value: number | string;
  onChange: (v: number) => void;
  width?: string;
  step?: number;
  placeholder?: string;
}) {
  const [tmp, setTmp] = useState(String(value));

  // keep textbox synced with external changes (slider, calculate, URL)
  useEffect(() => {
    setTmp(String(value));
  }, [value]);

  const isEmpty = String(tmp).trim() === "";

  return (
    <input
      type="text"
      value={tmp}
      placeholder={placeholder}
      onChange={(e) => setTmp(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          const n = Number(tmp);
          if (!isNaN(n)) onChange(n);
          (e.target as HTMLInputElement).blur();
        }
      }}
      onBlur={() => {
        const n = Number(tmp);
        if (!isNaN(n)) onChange(n);
        else setTmp(String(value)); // revert if invalid
      }}
      className={`${width} rounded-lg px-3 py-2 text-right text-sm transition
                  focus:outline-none focus:ring-2
                  ${
                    isEmpty
                      ? "border border-red-500 bg-red-50 placeholder-red-400 focus:ring-red-400"
                      : "border border-blue-300 bg-white text-slate-900 focus:ring-brand-blue/70"
                  }`}
      inputMode="decimal"
    />
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm hover:shadow-md transition">
      <div className="text-xs text-brand-blue font-medium">{label}</div>
      <div className="text-2xl font-bold tabular-nums text-slate-900">{value}</div>
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
            ? "bg-white shadow-sm text-brand-blue font-medium"
            : "text-brand-blue"
        }`}
        onClick={() => onMode("months")}
      >
        Months
      </button>
      <button
        className={`px-3 py-1 rounded-full ${
          mode === "years"
            ? "bg-white shadow-sm text-brand-blue font-medium"
            : "text-brand-blue"
        }`}
        onClick={() => onMode("years")}
      >
        Years
      </button>
    </div>
  );
}
function ToggleSmall({
  left,
  right,
  active,
  onLeft,
  onRight,
}: {
  left: string;
  right: string;
  active: "left" | "right";
  onLeft: () => void;
  onRight: () => void;
}) {
  return (
    <div className="inline-flex rounded-full border border-blue-200 bg-blue-50 p-1 text-sm">
      <button
        className={`px-3 py-1 rounded-full ${
          active === "left"
            ? "bg-white shadow-sm text-brand-blue font-medium"
            : "text-brand-blue"
        }`}
        onClick={onLeft}
      >
        {left}
      </button>
      <button
        className={`px-3 py-1 rounded-full ${
          active === "right"
            ? "bg-white shadow-sm text-brand-blue font-medium"
            : "text-brand-blue"
        }`}
        onClick={onRight}
      >
        {right}
      </button>
    </div>
  );
}
function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-2 text-left text-brand-blue font-medium">{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-2 text-slate-900 tabular-nums">{children}</td>;
}

/* ---------------- utilities ---------------- */

function todayISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}
function monthSeventhISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}-07`;
}
function addMonthsISO(iso: string, add: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1 + add, d);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mm}-${dd}`;
}
function attachDates(
  rows: { month: number; principal: number; interest: number; balance: number }[],
  startISO: string
) {
  return rows.map((r) => ({ ...r, date: addMonthsISO(startISO, r.month - 1) }));
}
function groupByYear(rows: {
  date: string;
  principal: number;
  interest: number;
  balance: number;
}[]) {
  const map: Record<
    number,
    { principal: number; interest: number; balance: number }
  > = {};
  for (const r of rows) {
    const y = new Date(r.date).getFullYear();
    if (!map[y]) map[y] = { principal: 0, interest: 0, balance: r.balance };
    map[y].principal += r.principal;
    map[y].interest += r.interest;
    map[y].balance = r.balance;
  }
  return Object.entries(map).map(([year, v]) => ({ year: Number(year), ...v }));
}
// plain Indian grouping (no ₹) for PDF
function fmtIN(x: number) {
  return Math.round(x).toLocaleString("en-IN");
}
