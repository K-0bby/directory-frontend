const PRODUCTION_HOST = "www.mefiedirectory.com";
const GA_ID_PATTERN = /^G-[A-Z0-9]+$/;
const CLARITY_ID_PATTERN = /^[a-z0-9]+$/;

export interface ProductionAnalyticsConfig {
  gaMeasurementId: string;
  clarityProjectId: string | null;
  allowedHosts: string[];
}

function allowedProductionHosts(): string[] {
  return (process.env.ANALYTICS_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Resolve analytics configuration on the server.
 *
 * Analytics fails closed outside Vercel Production. Once explicitly enabled in
 * Production, invalid or incomplete configuration blocks the build instead of
 * silently shipping a partially instrumented deployment.
 */
export function getProductionAnalyticsConfig(
  includeClarity: boolean,
): ProductionAnalyticsConfig | null {
  const enabled = process.env.ANALYTICS_ENABLED === "true";
  const isVercelProduction = process.env.VERCEL_ENV === "production";

  if (!enabled || !isVercelProduction) return null;

  const gaMeasurementId = (process.env.GA_MEASUREMENT_ID ?? "")
    .trim()
    .toUpperCase();
  const clarityProjectId = (process.env.CLARITY_PROJECT_ID ?? "")
    .trim()
    .toLowerCase();
  const allowedHosts = allowedProductionHosts();

  const errors: string[] = [];

  if (!GA_ID_PATTERN.test(gaMeasurementId)) {
    errors.push("GA_MEASUREMENT_ID must be a valid GA4 measurement ID.");
  }

  if (!CLARITY_ID_PATTERN.test(clarityProjectId)) {
    errors.push("CLARITY_PROJECT_ID must be a valid Clarity project ID.");
  }

  if (
    allowedHosts.length !== 1 ||
    allowedHosts[0] !== PRODUCTION_HOST
  ) {
    errors.push(
      `ANALYTICS_ALLOWED_HOSTS must contain only ${PRODUCTION_HOST}.`,
    );
  }

  if (errors.length > 0) {
    throw new Error(`Invalid production analytics configuration: ${errors.join(" ")}`);
  }

  return {
    gaMeasurementId,
    clarityProjectId: includeClarity ? clarityProjectId : null,
    allowedHosts,
  };
}
