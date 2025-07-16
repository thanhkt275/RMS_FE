import * as React from "react";

interface MultiSelectProps {
  id?: string;
  options: { label: string; value: string }[];
  value: string[];
  onChange: (vals: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  id,
  options,
  value,
  onChange,
  disabled,
  placeholder,
}) => (
  <select
    id={id}
    multiple
    value={value}
    onChange={e =>
      onChange(Array.from(e.target.selectedOptions, o => o.value))
    }
    disabled={disabled}
    className="border rounded p-2 w-full"
  >
    {placeholder && options.length === 0 && (
      <option value="" disabled>
        {placeholder}
      </option>
    )}
    {options.map(opt => (
      <option key={opt.value} value={opt.value}>
        {opt.label}
      </option>
    ))}
  </select>
);

export default MultiSelect;
