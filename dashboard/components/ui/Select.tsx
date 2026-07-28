import { clsx } from "clsx";
import { forwardRef } from "react";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className, id, ...props }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-text">
            {label}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          className={clsx(
            "bg-surface border px-3.5 py-2.5 text-sm text-text rounded-lg",
            "transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-0",
            error
              ? "border-critica/50 focus:ring-critica/20"
              : "border-border hover:border-border-hi focus:ring-primary/20 focus:border-primary/50",
            className
          )}
          {...props}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {error && <p className="text-xs text-critica">{error}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";
