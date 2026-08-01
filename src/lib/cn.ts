/**
 * Minimal class-name joiner. Falsy values are dropped so callers can write
 * conditional classes inline without pulling in a dependency.
 */
export function cn(...parts: unknown[]): string {
  return parts.filter((part): part is string => typeof part === "string" && part.length > 0).join(" ");
}
