import { authService } from "./authService";
import { getIntegrationStatus } from "./integrationService";

/**
 * Google is used for two things: optional sign-in, and the calendar + Meet
 * permissions behind "Connect Google Calendar". Both go through the same
 * server-side OAuth flow; calendar access is requested incrementally:
 *   https://www.googleapis.com/auth/calendar.events     (create Meet events)
 *   https://www.googleapis.com/auth/calendar.freebusy   (read busy times only)
 */
export const googleService = {
  async isConfigured() {
    return (await getIntegrationStatus()).google;
  },
  /** Starts real Google OAuth. Callers check isConfigured() first. */
  connectCalendar(next = "/availability") {
    authService.linkGoogleCalendar(next);
  },
};
