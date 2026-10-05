import type { IntegrationStatus } from "../types";
import { api } from "./http";

const DEMO: IntegrationStatus = { linkedin: false, google: false, instagram: false, email: false };

let cached: Promise<IntegrationStatus> | null = null;

/**
 * Which providers the server has credentials for. If the API can't be
 * reached at all, everything is treated as demo mode rather than erroring.
 */
export function getIntegrationStatus(): Promise<IntegrationStatus> {
  if (!cached) {
    cached = api<IntegrationStatus>("/api/integrations/status").catch(() => DEMO);
  }
  return cached;
}
