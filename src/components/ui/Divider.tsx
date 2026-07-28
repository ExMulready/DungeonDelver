import { cn } from "@/lib/cn";

/** Gold rule that fades at both ends with a diamond at centre. */
export function Divider({ className }: { className?: string }) {
  return <hr className={cn("divider-ornate", className)} />;
}
