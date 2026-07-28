/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import VerifyOtp from "@/app/auth/signup/_component/verify-otp";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

function VerifyForm() {
    
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isUnverified, loading: authLoading } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [redirectPath, setRedirectPath] = useState("/");
  const [hasProcessed, setHasProcessed] = useState(false);

  // Extract email from URL immediately when component mounts
  useEffect(() => {
    // console.log("🔍 Verify page mounted");
    // console.log("🔍 URL:", window.location.href);
    // console.log("🔍 Search params string:", searchParams.toString());

    const emailParam = searchParams.get("email");
    const redirectParam = searchParams.get("redirect") || "/";

    // console.log("📧 Email from URL:", emailParam);
    // console.log("➡️ Redirect path:", redirectParam);

    if (emailParam) {
      //   console.log("✅ Email found in URL, setting state");
      setEmail(decodeURIComponent(emailParam));
      setRedirectPath(redirectParam);
      setHasProcessed(true);
    } else {
      //   console.log("⚠️ No email in URL");

      // If we have an unverified user from auth context, try to get email from there
      if (isUnverified && !emailParam) {
        // console.log("🔄 User is unverified but no email in URL");
        // You might want to redirect to login with a message
        toast.error("Missing email", {
          description: "Please try logging in again",
        });
        router.replace("/auth/login");
      } else {
        setHasProcessed(true);
        // Still set processed to true to show error state
      }
    }
  }, [searchParams, isUnverified, router]);

  const handleVerifyOtp = useCallback(
    async (otp: string) => {
      if (!email) {
        toast.error("Error", {
          description: "Email is missing. Please go back and try again.",
        });
        router.push("/auth/login");
        return;
      }

      setIsLoading(true);
      try {
        const API_URL =
          process.env.NEXT_PUBLIC_API_URL || "https://me-fie.co.uk";
        const storedToken = localStorage.getItem("authToken");

        // console.log("📧 Verifying OTP for:", email);

        const res = await fetch(`${API_URL}/api/verify_email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...(storedToken && { Authorization: `Bearer ${storedToken}` }),
          },
          body: JSON.stringify({ email, otp }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Invalid OTP code provided.");
        }

        // console.log("✅ Verification successful, response:", data);

        const newToken = data.token || data.access_token || data.data?.token;

        if (newToken) {
          // Login with the token (this will refresh user profile)
          await login(newToken);

          // Small delay to ensure auth state updates
          setTimeout(() => {
            router.replace(redirectPath !== "/" ? redirectPath : "/dashboard");
            router.refresh();
          }, 500);
          return;
        }

        toast.success("Account Verified!", {
          description: "Welcome to MeFie! Redirecting...",
        });

        // If no new token, try to refresh the existing one
        if (storedToken) {
          await login(storedToken);
        }

        router.replace(redirectPath !== "/" ? redirectPath : "/");
        router.refresh();
      } catch (err: any) {
        console.error("Verification error:", err);
        toast.error("Verification Error", { description: err.message });
      } finally {
        setIsLoading(false);
      }
    },
    [email, login, redirectPath, router],
  );

  const handleResendOtp = useCallback(async () => {
    if (!email) {
      toast.error("Error", { description: "Email is missing" });
      return;
    }

    try {

      const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://me-fie.co.uk";

      const res = await fetch(`${API_URL}/api/resend_otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to resend");
      toast.success(data.message || "OTP Resent successfully.");

    } catch (err: any) {

      toast.error("Resend Failed", { description: err.message });
    }

  }, [email]);

  // Show loading while checking for email
  if (!hasProcessed || (email === null && authLoading)) {
    return (
      <div className="relative min-h-[98vh] flex items-center justify-center px-3 sm:px-4 py-6 login-bg rounded-2xl">
        <div className="absolute inset-0 bg-black/30 rounded-2xl" />
        <Card className="relative z-10 w-full max-w-md rounded-2xl shadow-sm bg-white/95 backdrop-blur-md border-none">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[#93C01F]" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error if no email
  if (!email) {
    return (
      <div className="relative min-h-[98vh] flex items-center justify-center px-3 sm:px-4 py-6 login-bg rounded-2xl">
        <div className="absolute inset-0 bg-black/30 rounded-2xl" />
        <Card className="relative z-10 w-full max-w-md rounded-2xl shadow-sm bg-white/95 backdrop-blur-md border-none">
          <CardContent className="py-12 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Email Missing
            </h2>
            <p className="text-gray-600 mb-6">
              We couldn&apos;t find the email address needed for verification.
              Please try logging in again.
            </p>
            <button
              onClick={() => router.push("/auth/login")}
              className="px-6 py-2 bg-[#93C01F] text-white rounded-lg hover:bg-[#82ab1b]"
            >
              Back to Login
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show verification form
  return (
    <div className="relative min-h-[98vh] flex items-center justify-center px-3 sm:px-4 py-6 login-bg rounded-2xl">
      <div className="absolute inset-0 bg-black/30 rounded-2xl" />
      <Card className="relative z-10 w-full max-w-md rounded-2xl shadow-sm bg-white/95 backdrop-blur-md border-none">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <Link href="/">
              <Image
                src="/images/logos/logo-light.png"
                alt="Logo"
                width={110}
                height={50}
              />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <VerifyOtp
            email={email}
            isLoading={isLoading}
            onVerify={handleVerifyOtp}
            onResend={handleResendOtp}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <div>
      <Suspense
        fallback={
          <div className="relative z-10 bg-white rounded-2xl flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-[#93C01F]" />
            <span className="text-gray-500">Loading verification...</span>
          </div>
        }
      >
        <VerifyForm />
      </Suspense>
    </div>
  );
}
