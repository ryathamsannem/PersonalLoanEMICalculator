// src/components/SliderRow.tsx
"use client";
import { useId } from "react";

export default function SliderRow(props: {
  label: string;
  min: number; max: number; step?: number;
  value: number; onChange: (v: number) => void;
  prefix?: string; suffix?: string;
  widthPx?: number;               // optional: slider width hint
}) {
  const id = useId();
  const {
    label, min, max, step = 1, value, onChange,
    prefix = "", suffix = "", widthPx
  } = props;

  const clamp = (n: number) => Math.min(max, Math.max(min, isFinite(n) ? n : min));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm text-gray-700 font-medium">{label}</label>
        <div className="flex items-center gap-2">
          {prefix && <span className="text-gray-500 text-sm">{prefix}</span>}
          <input
            type="number"
            value={Number.isFinite(value) ? value : min}
            onChange={(e) => onChange(clamp(Number(e.target.value)))}
            step={step}
            min={min} max={max}
            className="w-28 rounded-md border border-gray-300 bg-white px-2 py-1 text-right text-sm
                       focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {suffix && <span className="text-gray-500 text-sm">{suffix}</span>}
        </div>
      </div>

      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(clamp(Number(e.target.value)))}
        className="w-full accent-emerald-600"
        style={widthPx ? { width: widthPx } : undefined}
      />
    </div>
  );
}
