import { cn } from "@/lib/cn";

type Variant = "gold" | "blood";
type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-5 py-2.5 text-sm",
  lg: "px-7 py-3.5 text-base",
};

type OrnateButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  /** Renders a spinner and blocks interaction. */
  busy?: boolean;
};

/** Cast-metal plaque button. Lifts on hover, depresses on press. */
export function OrnateButton({
  variant = "gold",
  size = "md",
  busy = false,
  className,
  disabled,
  children,
  ...rest
}: OrnateButtonProps) {
  return (
    <button
      className={cn(
        "btn-ornate inline-flex items-center justify-center gap-2",
        variant === "blood" && "btn-blood",
        SIZES[size],
        className,
      )}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...rest}
    >
      {busy && (
        <span
          aria-hidden
          className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  );
}
