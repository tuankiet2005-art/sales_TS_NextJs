"use client";
import { useState } from "react";
import { formatVnd, parseMoneyInput } from "../lib/format";

export function CurrencyInput({
  value,
  onChange,
  className = "mt-1 h-10 w-full rounded-lg border border-ink/10 bg-paper px-3 text-sm",
  placeholder,
  min = 0,
}: {
  value?: number | null;
  onChange: (value: number | undefined) => void;
  className?: string;
  placeholder?: string;
  min?: number;
}) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState("");

  const numeric = value != null && Number.isFinite(Number(value)) ? Number(value) : undefined;
  const display = focused ? draft : numeric != null ? formatVnd(numeric) : "";

  return (
    <input
      type="text"
      inputMode="numeric"
      value={display}
      placeholder={placeholder}
      className={className}
      onFocus={() => {
        setFocused(true);
        setDraft(numeric != null ? String(numeric) : "");
      }}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        setFocused(false);
        const parsed = parseMoneyInput(draft);
        if (parsed != null && parsed < min) {
          onChange(min);
          return;
        }
        onChange(parsed);
      }}
    />
  );
}
