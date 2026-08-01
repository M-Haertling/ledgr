/**
 * Narrow an unknown thrown value to a displayable message. `catch` binds its
 * value as `unknown`, so this is the one place that inspects it.
 */
export function errorMessage(e: unknown, fallback: string): string {
  return e instanceof Error && e.message ? e.message : fallback;
}

/** Stack trace of a thrown value, when it carries one. */
export function errorStack(e: unknown): string | undefined {
  return e instanceof Error ? e.stack : undefined;
}
