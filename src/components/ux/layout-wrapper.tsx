"use client"
import { useState } from "react";
import { usePathname } from "next/navigation";
import Navbar from "@/components/ui/navbar";
import Footer from "@/components/ui/footer";
// import BecomeVendor from "@/app/become-a-vendor/page";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isAuthPage = pathname.startsWith("/auth");
    const isDashboard = pathname.startsWith("/dashboard")

    // The dashboard's "Preview as visitor" iframe appends `?preview=1` to a
    // real listing route to suppress site chrome. Read once via a lazy
    // useState initializer (safe during SSR: window is undefined there, so
    // this defaults to false, matching normal chrome) rather than
    // useSearchParams() — this wrapper renders on every route, and
    // useSearchParams() would opt the whole site into requiring a Suspense
    // boundary here.
    const [isPreview] = useState(
        () => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("preview") === "1"
    );

    const showChrome = !isAuthPage && !isDashboard && !isPreview && pathname !== "/become-a-vendor";

    return (
        <>
            {showChrome && <Navbar />}
            {children}
            {showChrome && <Footer />}
        </>
    );
}

