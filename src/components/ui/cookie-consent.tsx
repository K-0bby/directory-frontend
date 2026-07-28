/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "./button";
import {
  DENIED_CONSENT,
  readStoredConsent,
  saveConsent,
} from "@/lib/analytics/consent";

function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

function PreferenceSwitch({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="relative inline-flex cursor-pointer items-center">
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        aria-label={label}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="h-5 w-9 rounded-full bg-gray-200 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#93c01f] peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none" />
    </label>
  );
}

function CookieConsentContent() {
  const searchParams = useSearchParams();
  const isHydrated = useHydrated();
  const showFromUrl = isHydrated && searchParams?.get("cookies") === "true";

  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    if (!isHydrated) return;

    const storedConsent = readStoredConsent();

    if (storedConsent) {
      setAnalytics(storedConsent.analytics);
      setMarketing(storedConsent.marketing);
    } else {
      setAnalytics(DENIED_CONSENT.analytics);
      setMarketing(DENIED_CONSENT.marketing);
    }

    setShowBanner(!storedConsent || showFromUrl);
    setShowSettings(showFromUrl);
  }, [isHydrated, showFromUrl]);

  const saveAndClose = useCallback(
    (selection: { analytics: boolean; marketing: boolean }) => {
      saveConsent(selection);
      setAnalytics(selection.analytics);
      setMarketing(selection.marketing);
      setShowBanner(false);
      setShowSettings(false);
    },
    [],
  );

  const handleAcceptAll = useCallback(() => {
    saveAndClose({ analytics: true, marketing: true });
  }, [saveAndClose]);

  const handleRejectAll = useCallback(() => {
    saveAndClose(DENIED_CONSENT);
  }, [saveAndClose]);

  const handleSavePreferences = useCallback(() => {
    saveAndClose({ analytics, marketing });
  }, [analytics, marketing, saveAndClose]);

  if (!showBanner) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 p-4"
      role="dialog"
      aria-label="Cookie preferences"
      aria-modal="false"
    >
      <div className="mx-auto max-w-4xl rounded-lg border border-gray-200 bg-white p-4 shadow-lg md:p-6">
        {!showSettings ? (
          <>
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h3 className="mb-1 font-semibold text-gray-900">
                  Cookie Settings
                </h3>
                <p className="text-sm text-gray-600">
                  We use optional analytics cookies to understand how visitors
                  use Mefie. You can accept all, reject all, or choose your
                  preferences.
                </p>
              </div>
              <button
                onClick={() => setShowBanner(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Dismiss cookie settings"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                onClick={handleAcceptAll}
                className="bg-[#93c01f] text-white hover:bg-[#a3d65c]"
              >
                Accept All
              </Button>
              <Button
                onClick={handleRejectAll}
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Reject All
              </Button>
              <Button
                onClick={() => setShowSettings(true)}
                variant="ghost"
                className="text-gray-600 hover:text-gray-900"
              >
                Manage Preferences
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">
                Cookie Preferences
              </h3>
              <button
                onClick={() => setShowBanner(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Dismiss cookie preferences"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-4 space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 py-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Necessary Cookies
                  </p>
                  <p className="text-xs text-gray-500">
                    Essential for the website to function
                  </p>
                </div>
                <span className="text-xs font-medium text-green-600">
                  Always On
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-gray-100 py-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Analytics Cookies
                  </p>
                  <p className="text-xs text-gray-500">
                    Enable full analytics sessions and public-page heatmaps
                  </p>
                </div>
                <PreferenceSwitch
                  checked={analytics}
                  label="Allow analytics cookies"
                  onChange={setAnalytics}
                />
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Marketing Cookies
                  </p>
                  <p className="text-xs text-gray-500">
                    Allow advertising storage and personalization signals
                  </p>
                </div>
                <PreferenceSwitch
                  checked={marketing}
                  label="Allow marketing cookies"
                  onChange={setMarketing}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleSavePreferences}
                className="bg-[#93c01f] text-white hover:bg-[#a3d65c]"
              >
                Save Preferences
              </Button>
              <Button
                onClick={handleRejectAll}
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Reject All
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function CookieConsent() {
  return (
    <Suspense fallback={null}>
      <CookieConsentContent />
    </Suspense>
  );
}
