/** Logs diagnostics for developers without ever showing technical details to children. */
export function logDevelopmentError(message: string, error?: unknown): void {
  if (import.meta.env.DEV) {
    console.error(`[Math Practice] ${message}`, error)
  }
}
