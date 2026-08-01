"use client";

import { useState } from "react";
import { WhatsappLogo, X } from "@phosphor-icons/react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { usePathname } from "next/navigation";

const STORAGE_KEY = "whatsapp_floater_open";

const HIDDEN_PATHS = ["/dashboard", "/claim/manual"];

export function WhatsAppFloater() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  // Read persisted state once; default open if nothing stored yet.
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return sessionStorage.getItem(STORAGE_KEY) !== "false";
  });

  const close = () => {
    sessionStorage.setItem(STORAGE_KEY, "false");
    setOpen(false);
  };

  const show = () => {
    sessionStorage.setItem(STORAGE_KEY, "true");
    setOpen(true);
  };

  // Not yet hydrated, not authenticated, or on a form page
  if (loading || !user) return null;
  if (HIDDEN_PATHS.some((p) => pathname?.startsWith(p))) return null;

  if (!open) {
    return (
      <button
        onClick={show}
        aria-label="Open WhatsApp chat"
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-10 h-10 rounded-full bg-[#25D366] text-white shadow-md hover:shadow-lg transition-all duration-200 active:scale-95"
      >
        <WhatsappLogo size={20} weight="fill" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-end gap-1">
      <Link
        href="https://wa.me/447961793661"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with us on WhatsApp"
        className="group flex items-center rounded-full bg-[#25D366] p-3 text-white shadow-lg transition-all duration-300 ease-in-out hover:pr-5 hover:shadow-xl active:scale-95"
      >
        <WhatsappLogo size={28} weight="fill" className="shrink-0" />
        <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold transition-all duration-300 ease-in-out group-hover:max-w-[120px] group-hover:ml-2">
          Chat with us
        </span>
      </Link>
      <button
        onClick={close}
        aria-label="Close WhatsApp widget"
        className="mb-1 -ml-3 flex items-center justify-center w-5 h-5 rounded-full bg-gray-600 text-white hover:bg-gray-800 transition-colors"
      >
        <X size={10} weight="bold" />
      </button>
    </div>
  );
}
