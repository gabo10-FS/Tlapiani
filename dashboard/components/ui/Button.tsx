import { clsx } from "clsx";
import { forwardRef } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost" | "green";
type Size    = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary:   "bg-primary text-white border-primary hover:bg-primary-dark hover:border-primary-dark shadow-sm",
  secondary: "bg-white text-slate-700 border-border hover:border-primary hover:text-primary shadow-card",
  green:     "bg-secondary text-white border-secondary hover:bg-secondary-dark shadow-sm",
  danger:    "bg-white text-critica border-critica/40 hover:bg-red-50 hover:border-critica",
  ghost:     "bg-transparent text-dim border-transparent hover:bg-row hover:text-slate-700",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs rounded-md gap-1.5",
  md: "px-4 py-2   text-sm rounded-lg gap-2",
  lg: "px-5 py-2.5 text-sm rounded-lg gap-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "secondary", size = "md", loading, className, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={clsx(
        "inline-flex items-center justify-center font-medium border",
        "transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-1",
        "disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.98]",
        variants[variant], sizes[size], className
      )}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
      )}
      {children}
    </button>
  )
);
Button.displayName = "Button";
