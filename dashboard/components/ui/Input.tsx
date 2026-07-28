import { clsx } from "clsx";
import { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={clsx(
            "bg-white border px-3.5 py-2.5 text-sm text-slate-900 rounded-lg",
            "placeholder:text-slate-400 transition-all duration-150",
            "focus:outline-none focus:ring-2 focus:ring-offset-0",
            error
              ? "border-critica/50 focus:ring-critica/20 focus:border-critica/60"
              : "border-border hover:border-slate-300 focus:ring-primary/20 focus:border-primary/60",
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-xs text-critica flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
            {error}
          </p>
        )}
        {hint && !error && <p className="text-xs text-dim">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";
