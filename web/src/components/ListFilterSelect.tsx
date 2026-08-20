interface ListFilterSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  allLabel: string;
}

export function ListFilterSelect({ label, value, onChange, options, allLabel }: ListFilterSelectProps) {
  return (
    <label className="flex min-w-[9rem] flex-1 flex-col gap-1 sm:max-w-[12rem] sm:flex-none">
      <span className="text-[11px] font-medium uppercase tracking-wide text-ink/45">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-lg border border-ink/10 bg-white px-3 text-sm outline-none ring-copper/30 focus:ring-2"
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
