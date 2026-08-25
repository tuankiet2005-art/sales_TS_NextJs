"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useI18n } from "../i18n/LanguageContext";
import { softIncludes } from "../lib/softSearch";

export function SearchableCombobox<T>({
  items,
  value,
  onChange,
  getKey,
  getLabel,
  getSearchText,
  placeholder,
  error,
  disabled,
  onBlur,
}: {
  items: T[];
  value?: number;
  onChange: (id: number) => void;
  getKey: (item: T) => number;
  getLabel: (item: T) => string;
  getSearchText?: (item: T) => string[];
  placeholder: string;
  error?: string;
  disabled?: boolean;
  onBlur?: () => void;
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const selected = items.find((item) => getKey(item) === value);
  const selectedLabel = selected ? getLabel(selected) : "";
  const matches = useMemo(
    () =>
      items.filter((item) => {
        const parts = [getLabel(item), ...(getSearchText?.(item) ?? [])];
        return softIncludes(query, ...parts);
      }),
    [items, query, getLabel, getSearchText],
  );

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-ink/40" />
        <input
          value={open ? query : selectedLabel}
          placeholder={placeholder}
          disabled={disabled}
          onFocus={() => {
            if (disabled) return;
            setQuery("");
            setOpen(true);
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onBlur={() => {
            window.setTimeout(() => {
              setOpen(false);
              onBlur?.();
            }, 120);
          }}
          className={`mt-1 h-12 w-full rounded-xl border bg-paper pl-10 pr-3 text-ink disabled:opacity-60 ${
            error ? "border-red-500" : "border-ink/10"
          }`}
        />
        {open && !disabled && (
          <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-ink/10 bg-white py-1 shadow-card">
            {matches.length === 0 ? (
              <li className="px-3 py-2 text-sm text-ink/50">{t("emptySearch")}</li>
            ) : (
              matches.map((item) => {
                const label = getLabel(item);
                const active = getKey(item) === value;
                return (
                  <li key={getKey(item)}>
                    <button
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        onChange(getKey(item));
                        setQuery("");
                        setOpen(false);
                      }}
                      className={`block w-full px-3 py-2 text-left text-sm ${
                        active ? "bg-mist font-semibold text-ink" : "text-ink/80 hover:bg-paper"
                      }`}
                    >
                      {label}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        )}
      </div>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
