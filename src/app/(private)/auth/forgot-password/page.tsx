"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [emailError, setEmailError] = useState("");

  // Email validation
  const validateEmail = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email.trim()) {
      setEmailError("Email is required");
      return false;
    } else if (!emailRegex.test(email)) {
      setEmailError("Invalid email format");
      return false;
    }

    setEmailError("");
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess(false);
    setEmailError("");

    if (!validateEmail()) {
      setIsLoading(false);
      return;
    }

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://me-fie.co.uk";
      const response = await fetch(`${API_URL}/api/reset_mail`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to send reset link. Please try again."
        );
      }

      // Handle successful request
      setSuccess(true);
      setEmail(""); // Clear the form
    } catch {
      // console.error("Forgot password failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);

    // Clear error when user starts typing
    if (emailError) {
      setEmailError("");
    }
    if (error) {
      setError("");
    }
  };

  return (
    <div className="relative h-[98vh] flex items-center justify-center px-4 login-bg rounded-2xl">
      <div className="absolute inset-0 bg-black/30 rounded-2xl" />
      <Card className="relative z-10 w-full max-w-md rounded-2xl shadow-sm bg-white/95 backdrop-blur-md border-none">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <Link href="/">
              <Image
                src="/images/logos/logo-light.png"
                alt="MeFie Logo"
                width={110}
                height={50}
                className="object-cover"
              />
            </Link>
            <p className="text-sm text-gray-500">
              Remember password?{" "}
              <Link
                href="/auth/login"
                className="text-[#93C01F] font-medium hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
          <div className="space-y-1 mt-0">
            <h2 className="text-4xl font-semibold text-gray-900">
              Forgot Password?
            </h2>
            <p className="text-gray-500 text-sm">
              No worries! Enter your email and we&apos;ll send you reset
              instructions
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* Success Message added here above the label */}
              {success && (
                <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                  <div className="flex items-start gap-3">
                    <div className="shrink-0">
                      <svg
                        className="w-5 h-5 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-green-800">
                        Check your email
                      </h3>
                      {/* <p className="text-sm text-green-700 mt-1">
                        We&apos;ve sent password reset instructions to your
                        email address. Please check your inbox and follow the
                        link to reset your password.
                      </p> */}
                      <p className="text-sm text-green-700 mt-1">
                        A reset password link will be sent to your email
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm">
                  Email Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  className="w-full"
                  value={email}
                  onChange={handleInputChange}
                  required
                />
                {emailError && (
                  <p className="text-red-500 text-sm mt-1">{emailError}</p>
                )}
              </div>

              {error && (
                <div className="p-3 rounded-md bg-red-50 border border-red-200">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full text-sm bg-[#93C01F] text-white cursor-pointer hover:bg-[#7da519] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Sending..." : "Send Reset Link"}
              </Button>

              <div className="flex items-center justify-center">
                <Link
                  href="/auth/login"
                  className="text-sm text-gray-600 hover:text-[#93C01F] transition-colors flex items-center justify-center gap-2"
                >
                  <span>
                    <ArrowLeft className="w-4 h-4" />
                  </span>{" "}
                  Back to Sign in
                </Link>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}