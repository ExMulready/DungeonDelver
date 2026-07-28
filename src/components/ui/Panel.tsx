import { cn } from "@/lib/cn";

type PanelProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Adds gold filigree to the top-left and bottom-right corners. */
  ornate?: boolean;
  /** Optional engraved heading rendered above a divider. */
  title?: string;
};

/**
 * Carved stone container. The bevel comes from inset shadows in `.panel`
 * (globals.css) rather than borders, which is what keeps it from reading as a
 * plain bordered div.
 */
export function Panel({
  ornate = false,
  title,
  className,
  children,
  ...rest
}: PanelProps) {
  return (
    <div
      className={cn("panel", ornate && "panel-ornate", "p-5", className)}
      {...rest}
    >
      {title && (
        <>
          <h2 className="text-center text-lg font-bold">{title}</h2>
          <hr className="divider-ornate my-4" />
        </>
      )}
      {children}
    </div>
  );
}
