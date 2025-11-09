"use client";
import { useState, useEffect } from "react";

export default function SliderRow({
  label,
  min,
  max,
  step = 1,
  value,
  onChange,
}: {
  label?: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (v: number) => void;
}) {
  const [temp, setTemp] = useState(String(value));
  useEffect(() => setTemp(String(value)), [value]);

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-semibold text-blue-700">{label}</label>
      )}
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
