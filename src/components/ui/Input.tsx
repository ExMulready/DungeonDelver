import { cn } from "@/lib/cn";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

/** Recessed slot input — the inverse bevel of OrnateButton. */
export function Input({ label, error, className, id, ...rest }: InputProps) {
  const inputId = id ?? rest.name;

  return (
    <label className="block" htmlFor={inputId}>
      {label && <span className="label-engraved mb-1.5 block">{label}</span>}
      <input
        id={inputId}
        className={cn(
          "input-ornate w-full px-3 py-2.5 text-sm",
          error && "border-blood",
          className,
        )}
        aria-invalid={error ? true : undefined}
        {...rest}
      />
      {error && <span className="mt-1.5 block text-xs text-blood-bright">{error}</span>}
    </label>
  );
}
