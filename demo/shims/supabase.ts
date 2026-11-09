/**
 * The static demo has no backend. The live data layer is only constructed
 * when Supabase keys are set (never in this build), so this stand-in keeps
 * the Supabase SDK out of the demo bundle.
 */
export function createBrowserClient(): never {
  throw new Error("The static demo has no backend");
}
