"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ResetPassword() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [formData, setFormData] = useState({
    password: "",
    password_confirmation: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState({
    password: "",
    password_confirmation: "",
  });

  // Extract token and email from URL parameters (from reset email)
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  useEffect(() => {
    // Validate that we have the required parameters
    if (!token || !email) {
      setError(
        "Invalid or expired password reset link. Please request a new reset link.",
      );
    }
  }, [token, email]);

  const validateForm = () => {
    const newErrors = {
      password: "",
      password_confirmation: "",
    };
    let isValid = true;

    if (!formData.password) {
      newErrors.password = "Password is required";
      isValid = false;
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
      isValid = false;
    }

    if (!formData.password_confirmation) {
      newErrors.password_confirmation = "Please confirm your password";
      isValid = false;
    } else if (formData.password !== formData.password_confirmation) {
      newErrors.password_confirmation = "Passwords do not match";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if token and email are available
    if (!token || !email) {
      setError("Invalid password reset link");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess(false);
    setErrors({
      password: "",
      password_confirmation: "",
    });

    if (!validateForm()) {
      setIsLoading(false);
      return;
    }

    try {
      const API_URL = process.env.API_URL || "https://me-fie.co.uk";

      // console.log("🚀 Sending password reset request...");

      const response = await fetch(`${API_URL}/api/reset_password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: token,
          email: email,
          password: formData.password,
          password_confirmation: formData.password_confirmation,
        }),
      });

      const data = await response.json();
      // console.log("📥 Response:", data);

      if (!response.ok) {
        throw new Error(
          data.message || data.error || "Failed to reset password",
        );
      }

      // console.log("✅ Password reset successfully");
      setSuccess(true);

      // Clear form
      setFormData({
        password: "",
        password_confirmation: "",
      });

      // Redirect to login after success
      setTimeout(() => {
        router.push("/auth/login?message=password_reset_success");
      }, 2000);
    } catch (error) {
      // console.error("❌ Password reset failed:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to reset password. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));

    if (errors[id as keyof typeof errors]) {
      setErrors((prev) => ({
        ...prev,
        [id]: "",
      }));
    }

    if (error) {
      setError("");
    }
  };

  // Show error if token or email is missing
  if (!token || !email) {
    return (
      <div className="relative h-[98vh] flex items-center justify-center px-4 login-bg rounded-2xl">
        <div className="absolute inset-0 bg-black/30 rounded-2xl" />
        <Card className="relative z-10 w-full max-w-md rounded-2xl shadow-sm bg-white/95 backdrop-blur-md border-none">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <Link href="/">
                <Image
                  src="/images/logos/login-logo.png"
                  alt="MeFie Logo"
                  width={110}
                  height={50}
                  className="object-cover"
                />
              </Link>
            </div>
            <div className="space-y-1 mt-0">
              <h2 className="text-4xl font-semibold text-gray-900">
                Invalid Reset Link
              </h2>
              <p className="text-gray-500 text-sm">
                This password reset link is invalid or has expired
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                <div className="flex items-start gap-3">
                  <div className="shrink-0">
                    <svg
                      className="w-5 h-5 text-red-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-red-800">
                      Invalid Reset Link
                    </h3>
                    <p className="text-sm text-red-700 mt-1">
                      {error ||
                        "This password reset link is invalid or has expired. Please request a new password reset link."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Link href="/auth/forgot-password">
                  <Button className="w-full text-sm bg-[#93C01F] text-white cursor-pointer hover:bg-[#7da519]">
                    Request New Reset Link
                  </Button>
                </Link>

                <Link href="/auth/login">
                  <Button variant="outline" className="w-full text-sm">
                    Back to Login
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative h-[98vh] flex items-center justify-center px-4 login-bg rounded-2xl">
      <div className="absolute inset-0 bg-black/30 rounded-2xl" />
      <Card className="relative z-10 w-full max-w-md rounded-2xl shadow-sm bg-white/95 backdrop-blur-md border-none">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <Link href="/">
              <Image
                src="/images/logos/login-logo.png"
                alt="MeFie Logo"
                width={110}
                height={50}
                className="object-cover"
              />
            </Link>
          </div>
          <div className="space-y-1 mt-0">
            <h2 className="text-4xl font-semibold text-gray-900">
              Reset Password
            </h2>
            <p className="text-gray-500 text-sm">
              Create a new password for your account
            </p>
            {/* <div className="text-xs text-gray-400 mt-1">
              Resetting password for: {email}
            </div> */}
          </div>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-4">
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
                      Password Reset Successfully!
                    </h3>
                    <p className="text-sm text-green-700 mt-1">
                      Your password has been updated. Redirecting to login...
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm">
                    New Password <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your new password"
                      className="w-full"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-red-500 text-sm">{errors.password}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password_confirmation" className="text-sm">
                    Confirm New Password <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="password_confirmation"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your new password"
                      className="w-full"
                      value={formData.password_confirmation}
                      onChange={handleInputChange}
                      required
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  {errors.password_confirmation && (
                    <p className="text-red-500 text-sm">
                      {errors.password_confirmation}
                    </p>
                  )}
                </div>

                {error && (
                  <div className="p-3 rounded-md bg-red-50 border border-red-200">
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isLoading || !token || !email}
                  className="w-full text-sm bg-[#93C01F] text-white cursor-pointer hover:bg-[#7da519] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Resetting Password..." : "Reset Password"}
                </Button>

                <div className="flex items-center justify-center">
                  <Link
                    href="/auth/login"
                    className="text-sm text-gray-600 hover:text-[#93C01F] transition-colors flex items-center justify-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Login
                  </Link>
                </div>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
