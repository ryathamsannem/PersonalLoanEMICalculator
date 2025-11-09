"use client";
import { useState, useEffect } from "react";

export default function SliderRow({
  label,
  min,
  max,
  step = 1,
  value,
  onChange,
  prefix = "",
  suffix = "",
}: {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
}) {
  const [temp, setTemp] = useState(String(value));

  useEffect(() => setTemp(String(value)), [value]);

  const commit = () => {
    const num = Number(temp);
    if (!isNaN(num)) {
      const clamped = Math.min(max, Math.max(min, num));
      onChange(clamped);
    } else {
      setTemp(String(value));
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-blue-700">{label}</label>
        <div className="flex items-center gap-2">
          {prefix && <span className="text-blue-600 text-sm">{prefix}</span>}
          <input
            type="text"
            value={temp}
            onChange={(e) => setTemp(e.target.value)}
            onBlur={commit}
            className="w-32 rounded-md border border-blue-300 bg-white px-2 py-1 text-right text-sm text-gray-900
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {suffix && <span className="text-blue-600 text-sm">{suffix}</span>}
        </div>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-blue-600"
      />
    </div>
  );
}
