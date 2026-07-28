/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { Suspense, useState, useCallback, useEffect, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "./button";
import { X } from "lucide-react";

const COOKIE_CONSENT_KEY = "cookie_consent";

function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

function CookieConsentContent() {
  const searchParams = useSearchParams();
  const isHydrated = useHydrated();
  const showFromUrl = isHydrated && searchParams?.get("cookies") === "true";
  
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (!isHydrated) return;
    
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent || showFromUrl) {
      setShowBanner(true);
      setShowSettings(showFromUrl);
    }
  }, [isHydrated, showFromUrl]);

  const handleAccept = useCallback(() => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
    window.dispatchEvent(new CustomEvent("cookieConsentUpdate", { detail: "accepted" }));
    setShowBanner(false);
    setShowSettings(false);
  }, []);

  const handleDeny = useCallback(() => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "denied");
    window.dispatchEvent(new CustomEvent("cookieConsentUpdate", { detail: "denied" }));
    setShowBanner(false);
    setShowSettings(false);
  }, []);

  const handleManagePreferences = useCallback(() => {
    setShowSettings(true);
  }, []);

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg border border-gray-200 p-4 md:p-6">
        {!showSettings ? (
          <>
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">
                  Cookie Settings
                </h3>
                <p className="text-sm text-gray-600">
                  We use cookies to enhance your browsing experience, serve
                  personalized content, and analyze our traffic. By clicking
                  &quot;Accept All&quot;, you consent to our use of cookies.
                </p>
              </div>
              <button
                onClick={handleDeny}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <Button
                onClick={handleAccept}
                className="bg-[#93c01f] hover:bg-[#a3d65c] text-white"
              >
                Accept All
              </Button>
              <Button
                onClick={handleDeny}
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Deny
              </Button>
              <Button
                onClick={handleManagePreferences}
                variant="ghost"
                className="text-gray-600 hover:text-gray-900"
              >
                Manage Preferences
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">
                Cookie Preferences
              </h3>
              <button
                onClick={handleDeny}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <div>
                  <p className="font-medium text-sm text-gray-900">
                    Necessary Cookies
                  </p>
                  <p className="text-xs text-gray-500">
                    Essential for the website to function
                  </p>
                </div>
                <span className="text-xs text-green-600 font-medium">Always On</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <div>
                  <p className="font-medium text-sm text-gray-900">
                    Analytics Cookies
                  </p>
                  <p className="text-xs text-gray-500">
                    Help us understand how visitors interact with our website
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#93c01f]"></div>
                </label>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium text-sm text-gray-900">
                    Marketing Cookies
                  </p>
                  <p className="text-xs text-gray-500">
                    Used to deliver relevant advertisements
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#93c01f]"></div>
                </label>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleAccept}
                className="bg-[#93c01f] hover:bg-[#a3d65c] text-white"
              >
                Save Preferences
              </Button>
              <Button
                onClick={handleDeny}
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
