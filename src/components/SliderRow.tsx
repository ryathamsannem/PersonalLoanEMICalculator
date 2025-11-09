// src/components/SliderRow.tsx
"use client";
import { useId } from "react";

export default function SliderRow(props: {
  label: string;
  min: number; max: number; step?: number;
  value: number; onChange: (v: number) => void;
  prefix?: string; suffix?: string;
}) {
  const id = useId();
  const { label, min, max, step = 1, value, onChange, prefix = "", suffix = "" } = props;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm text-gray-700 font-medium">{label}</label>
        <div className="text-sm tabular-nums text-gray-900">
          {prefix}{value.toLocaleString("en-IN")}{suffix}
        </div>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-emerald-600"
      />
    </div>
  );
}
