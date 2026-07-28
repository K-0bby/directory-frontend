"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  CONSENT_CHANGE_EVENT,
  DENIED_CONSENT,
  readStoredConsent,
  type AnalyticsConsent,
  type ConsentSelection,
} from "@/lib/analytics/consent";
import { sanitizeAnalyticsPath } from "@/lib/analytics/path";

type AnalyticsCommand = (...args: unknown[]) => void;

type QueuedAnalyticsCommand = AnalyticsCommand & {
  q?: unknown[][];
};

declare global {
  interface Window {
    clarity?: QueuedAnalyticsCommand;
    dataLayer?: unknown[][];
    gtag?: AnalyticsCommand;
  }
}

interface ProductionAnalyticsProps {
  allowedHosts: string[];
  clarityProjectId: string | null;
  gaMeasurementId: string;
  routeScope: "public" | "private";
}

function appendExternalScript(id: string, source: string): void {
  if (document.getElementById(id)) return;

  const script = document.createElement("script");
  script.id = id;
  script.async = true;
  script.src = source;
  script.dataset.mefieAnalytics = "true";
  document.head.appendChild(script);
}

function ensureGoogleQueue(): AnalyticsCommand {
  window.dataLayer = window.dataLayer ?? [];
  window.gtag =
    window.gtag ??
    ((...args: unknown[]) => {
      window.dataLayer?.push(args);
    });

  return window.gtag;
}

function ensureClarityQueue(): QueuedAnalyticsCommand {
  window.clarity =
    window.clarity ??
    Object.assign(
      (...args: unknown[]) => {
        if (!window.clarity) return;
        window.clarity.q = window.clarity.q ?? [];
        window.clarity.q.push(args);
      },
      { q: [] as unknown[][] },
    );

  return window.clarity;
}

function googleConsent(
  command: "default" | "update",
  consent: ConsentSelection,
): void {
  const gtag = ensureGoogleQueue();

  gtag("consent", command, {
    ad_personalization: consent.marketing ? "granted" : "denied",
    ad_storage: consent.marketing ? "granted" : "denied",
    ad_user_data: consent.marketing ? "granted" : "denied",
    analytics_storage: consent.analytics ? "granted" : "denied",
    ...(command === "default" ? { wait_for_update: 500 } : {}),
  });
}

function clarityConsent(consent: ConsentSelection): void {
  const clarity = ensureClarityQueue();

  clarity("consentv2", {
    ad_Storage: consent.marketing ? "granted" : "denied",
    analytics_Storage: consent.analytics ? "granted" : "denied",
  });
}

export function ProductionAnalytics({
  allowedHosts,
  clarityProjectId,
  gaMeasurementId,
  routeScope,
}: ProductionAnalyticsProps) {
  const pathname = usePathname();
  const lastPageLocation = useRef<string | null>(null);

  const hostnameAllowed =
    typeof window !== "undefined" &&
    allowedHosts.includes(window.location.hostname.toLowerCase());

  useEffect(() => {
    if (!hostnameAllowed) return;

    const storedConsent = readStoredConsent();
    const initialConsent = storedConsent ?? DENIED_CONSENT;
    const gtag = ensureGoogleQueue();

    googleConsent("default", initialConsent);
    gtag("js", new Date());
    gtag("config", gaMeasurementId, {
      send_page_view: false,
    });
    appendExternalScript(
      "mefie-google-analytics",
      `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(
        gaMeasurementId,
      )}`,
    );

    if (clarityProjectId) {
      const clarity = ensureClarityQueue();
      clarityConsent(initialConsent);
      clarity("set", "environment", "production");
      clarity("set", "route_scope", routeScope);
      appendExternalScript(
        "mefie-microsoft-clarity",
        `https://www.clarity.ms/tag/${encodeURIComponent(clarityProjectId)}`,
      );
    }

    const handleConsentChange = (event: Event) => {
      const consent = (event as CustomEvent<AnalyticsConsent>).detail;
      googleConsent("update", consent);

      if (clarityProjectId) clarityConsent(consent);
    };

    window.addEventListener(CONSENT_CHANGE_EVENT, handleConsentChange);

    return () => {
      window.removeEventListener(CONSENT_CHANGE_EVENT, handleConsentChange);
    };
  }, [
    clarityProjectId,
    gaMeasurementId,
    hostnameAllowed,
    routeScope,
  ]);

  useEffect(() => {
    if (!hostnameAllowed || !window.gtag) return;

    const safePath = sanitizeAnalyticsPath(pathname || "/");
    const pageLocation = `${window.location.origin}${safePath}`;

    if (lastPageLocation.current === pageLocation) return;

    window.gtag("event", "page_view", {
      page_location: pageLocation,
      page_path: safePath,
      page_referrer: lastPageLocation.current ?? document.referrer,
      page_title: routeScope === "private" ? safePath : document.title,
      send_to: gaMeasurementId,
    });

    lastPageLocation.current = pageLocation;
  }, [gaMeasurementId, hostnameAllowed, pathname, routeScope]);

  return null;
}
