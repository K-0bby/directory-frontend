"use client";

export const CONSENT_STORAGE_KEY = "mefie_consent_v2";
export const LEGACY_CONSENT_STORAGE_KEY = "cookie_consent";
export const CONSENT_CHANGE_EVENT = "mefie:consent-change";

export interface AnalyticsConsent {
  version: 2;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
}

export type ConsentSelection = Pick<
  AnalyticsConsent,
  "analytics" | "marketing"
>;

export const DENIED_CONSENT: ConsentSelection = {
  analytics: false,
  marketing: false,
};

function isAnalyticsConsent(value: unknown): value is AnalyticsConsent {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<AnalyticsConsent>;

  return (
    candidate.version === 2 &&
    typeof candidate.analytics === "boolean" &&
    typeof candidate.marketing === "boolean" &&
    typeof candidate.updatedAt === "string"
  );
}

/**
 * Read the stored V2 consent choice.
 *
 * A legacy denial remains denied and is upgraded automatically. A legacy
 * acceptance is deliberately not trusted because the old preference switches
 * were visual only; that visitor is prompted again.
 */
export function readStoredConsent(): AnalyticsConsent | null {
  if (typeof window === "undefined") return null;

  const serialized = window.localStorage.getItem(CONSENT_STORAGE_KEY);

  if (serialized) {
    try {
      const parsed: unknown = JSON.parse(serialized);
      if (isAnalyticsConsent(parsed)) return parsed;
    } catch {
      window.localStorage.removeItem(CONSENT_STORAGE_KEY);
    }
  }

  const legacyConsent = window.localStorage.getItem(
    LEGACY_CONSENT_STORAGE_KEY,
  );

  if (legacyConsent !== "denied") return null;

  const migratedDenial: AnalyticsConsent = {
    version: 2,
    ...DENIED_CONSENT,
    updatedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(
    CONSENT_STORAGE_KEY,
    JSON.stringify(migratedDenial),
  );
  window.localStorage.removeItem(LEGACY_CONSENT_STORAGE_KEY);

  return migratedDenial;
}

/**
 * Persist and broadcast an explicit visitor choice.
 */
export function saveConsent(
  selection: ConsentSelection,
): AnalyticsConsent {
  const consent: AnalyticsConsent = {
    version: 2,
    analytics: selection.analytics,
    marketing: selection.marketing,
    updatedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
  window.localStorage.removeItem(LEGACY_CONSENT_STORAGE_KEY);
  window.dispatchEvent(
    new CustomEvent<AnalyticsConsent>(CONSENT_CHANGE_EVENT, {
      detail: consent,
    }),
  );

  return consent;
}
