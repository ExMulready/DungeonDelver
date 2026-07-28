import { cn } from "@/lib/cn";

/**
 * Aged-vellum surface for narration prose. Intentionally dark rather than
 * bright parchment — a white page would blow out the rest of the palette.
 */
export function Vellum({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("vellum p-6", className)} {...rest}>
      {children}
    </div>
  );
}
