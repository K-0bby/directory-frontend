"use client";

import { useEffect } from "react";
import Clarity from "@microsoft/clarity";
import { useAuth } from "@/context/auth-context";

const PROJECT_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;
const COOKIE_CONSENT_KEY = "cookie_consent";

export default function MicrosoftClarity() {
  const { user } = useAuth();

  // Initialise once and apply stored consent state
  useEffect(() => {
    if (!PROJECT_ID) return;

    Clarity.init(PROJECT_ID);

    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (consent === "accepted") {
      Clarity.consentV2();
    }

    // React to consent decisions made on this page load
    const handleConsentUpdate = (e: Event) => {
      const decision = (e as CustomEvent<string>).detail;
      if (decision === "accepted") {
        Clarity.consentV2();
      } else {
        Clarity.consentV2({ ad_Storage: "denied", analytics_Storage: "denied" });
      }
    };

    window.addEventListener("cookieConsentUpdate", handleConsentUpdate);
    return () => window.removeEventListener("cookieConsentUpdate", handleConsentUpdate);
  }, []);

  // Identify logged-in users so sessions are linkable in the Clarity dashboard
  useEffect(() => {
    if (!PROJECT_ID || !user) return;
    const friendlyName = user.name || `${user.first_name} ${user.last_name}`.trim();
    Clarity.identify(user.id, undefined, undefined, friendlyName);
  }, [user]);

  return null;
}
