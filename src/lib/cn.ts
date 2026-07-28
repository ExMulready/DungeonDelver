/**
 * Minimal className joiner.
 *
 * Deliberately not clsx + tailwind-merge: this project's components take a
 * `className` that is appended last, and Tailwind's later-wins cascade handles
 * the override cases we actually have. Not worth two dependencies.
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
