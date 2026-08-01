/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import Link from "next/link";
import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import VerifyOtp from "./_component/verify-otp";
import { toast } from "sonner";

// Phone Input Imports
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";
import { z } from "zod";
import { getPhoneValidationError, normalizePhone, normalizePhoneInput } from "@/lib/phone";
import { cn } from "@/lib/utils";

const signupSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters long"),
  phone: z.string().min(1, "Phone number is required"),
});

function SignupForm() {
  const router = useRouter();
  const { login } = useAuth();

  const searchParams = useSearchParams();

  const [showPassword, setShowPassword] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [, setError] = useState("");

  const redirectPath = searchParams.get("redirect") || "/";
  const verifyEmail = searchParams.get("email") || "";
  const isVerifyMode = searchParams.get("verify") === "true";

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    country_code: "+44",
    country_iso2: "gb",
    email: verifyEmail,
    password: "",
  });

  const [errors, setErrors] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    password: "",
  });
  const [touched, setTouched] = useState({
    first_name: false,
    last_name: false,
    phone: false,
    email: false,
    password: false,
  });

  type SignupField = keyof typeof errors;

  const validateField = useCallback(
    (field: SignupField, value: string) => {
      const partial = { ...formData, [field]: value };
      const result = signupSchema.safeParse(partial);
      if (result.success) {
        setErrors((prev) => ({ ...prev, [field]: "" }));
        return;
      }
      const fieldErrors = result.error.flatten().fieldErrors;
      setErrors((prev) => ({
        ...prev,
        [field]: fieldErrors[field]?.[0] || "",
      }));
    },
    [formData],
  );

  const validateForm = () => {
    const result = signupSchema.safeParse(formData);
    const schemaErrors = result.success ? {} : result.error.flatten().fieldErrors;
    const phoneError = getPhoneValidationError(formData.phone, formData.country_iso2) || "";
    const newErrors = {
      first_name: schemaErrors.first_name?.[0] || "",
      last_name: schemaErrors.last_name?.[0] || "",
      phone: phoneError || schemaErrors.phone?.[0] || "",
      email: schemaErrors.email?.[0] || "",
      password: schemaErrors.password?.[0] || "",
    };
    setErrors(newErrors);
    return result.success && !phoneError;
  };

  // Handle verify mode from login redirect
  useEffect(() => {
    if (isVerifyMode && verifyEmail) {
      setFormData((prev) => ({ ...prev, email: verifyEmail }));
      setShowOtp(true);
      // Optionally auto-resend OTP
      handleResendOtp(true);
    }
  }, [isVerifyMode, verifyEmail]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (!validateForm()) {
      setIsLoading(false);
      return;
    }

    const normalizedPhone = normalizePhone(formData.phone, formData.country_iso2);
    if (!normalizedPhone) {
      setIsLoading(false);
      return;
    }

    const payload = {
      ...formData,
      country_code: normalizedPhone.countryCode,
      phone: normalizedPhone.nationalNumber,
    };

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://me-fie.co.uk";
      const response = await fetch(`${API_URL}/api/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Registration failed.");

      const token = data.token || data.access_token || data.data?.token;
      if (token) {
        await login(token);
      }

      toast.success("Registration Successful!", {
        description: "Please check your email for the verification code.",
      });

      setShowOtp(true);
    } catch (err: any) {
      setError(err.message || "Failed to register");
      toast.error("Registration Failed", { description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (otp: string) => {
    setIsLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://me-fie.co.uk";
      const storedToken = localStorage.getItem("authToken");

      const res = await fetch(`${API_URL}/api/verify_email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(storedToken && { Authorization: `Bearer ${storedToken}` }),
        },
        body: JSON.stringify({ email: formData.email, otp }),
      });

      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message || "Invalid OTP code provided.");

      const newToken = data.token || data.access_token || data.data?.token;

      if (newToken) {
        await login(newToken);

        // Redirect to the original page user was trying to access, or dashboard bookmarks for customers
        router.push(redirectPath !== "/" ? redirectPath : "/dashboard/bookmarks");
        router.refresh();
        return;
      }

      toast.success("Account Verified!", {
        description: "Welcome to MeFie! Redirecting...",
      });

      router.push(redirectPath !== "/" ? redirectPath : "/");
      router.refresh();
    } catch (err: any) {
      toast.error("Verification Error", { description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = useCallback(async (isAutoResend = false) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://me-fie.co.uk";
      const res = await fetch(`${API_URL}/api/resend_otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to resend");
      if (!isAutoResend) {
        toast.success(data.message || "OTP Resent successfully.");
      }
    } catch (err: any) {
      if (!isAutoResend) {
        toast.error("Resend Failed", { description: err.message });
      }
    }
  }, [formData.email]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
    if (touched[id as SignupField]) {
      validateField(id as SignupField, value);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setTouched((prev) => ({ ...prev, [id]: true }));
    validateField(id as SignupField, value);
  };

  const handlePhoneChange = (phone: string, meta: any) => {
    const dialCode = meta.country?.dialCode || "";
    const iso2 = meta.country?.iso2 || "gb";
    const normalizedInput = normalizePhoneInput(phone, iso2);
    setFormData((prev) => ({
      ...prev,
      phone: normalizedInput,
      country_code: dialCode.startsWith("+") ? dialCode : `+${dialCode}`,
      country_iso2: iso2,
    }));
    // Don't validate until the user has actually typed digits (component fires onChange on mount).
    if (normalizedInput.replace(/\D/g, "") === dialCode.replace(/\D/g, "")) return;
    setTouched((prev) => ({ ...prev, phone: true }));
    const phoneError = getPhoneValidationError(normalizedInput, iso2);
    setErrors((prev) => ({
      ...prev,
      phone: phoneError || "",
    }));
  };

  return (
    <div className="relative h-[98vh] flex items-center justify-center px-4 login-bg rounded-2xl">
      <div className="absolute inset-0 bg-black/30 rounded-2xl" />
      <Card className="relative z-10 w-full max-w-md rounded-2xl shadow-sm bg-white/95 backdrop-blur-md border-none ">
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
            <p className="text-sm text-gray-500">
              Already have an account?{" "}
              <Link
                href="/auth/login"
                className="text-[#93C01F] font-medium hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
          <div className="mt-2">
            <h2 className="text-3xl font-semibold text-gray-900">
              {!showOtp ? "Create account" : ""}
            </h2>
          </div>
        </CardHeader>
        <CardContent>
          {!showOtp ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">First Name</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    className={errors.first_name ? "border-red-500 focus-visible:ring-red-500" : ""}
                  />
                  {errors.first_name && (
                    <p className="text-red-500 text-xs mt-1">{errors.first_name}</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs">Last Name</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    className={errors.last_name ? "border-red-500 focus-visible:ring-red-500" : ""}
                  />
                  {errors.last_name && (
                    <p className="text-red-500 text-xs mt-1">{errors.last_name}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Phone Number</Label>
                <PhoneInput
                  defaultCountry="gb"
                  preferredCountries={["gb", "gh", "ng", "ke", "za"]}
                  placeholder="Enter phone number"
                  value={formData.phone}
                  onChange={(phone, meta) => handlePhoneChange(phone, meta)}
                  className={cn("w-full", errors.phone && "phone-input-error")}
                  inputClassName="w-full"
                />
                {errors.phone && (
                  <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
                )}
                <Label className="text-xs">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  className={errors.email ? "border-red-500 focus-visible:ring-red-500" : ""}
                />
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                )}
                <Label className="text-xs">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    className={errors.password ? "border-red-500 focus-visible:ring-red-500" : ""}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-500 text-xs mt-1">{errors.password}</p>
                )}
              </div>
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#93C01F] hover:bg-[#82ab1b] py-6 rounded-xl"
              >
                {isLoading ? "Creating..." : "Sign Up"}
              </Button>
            </form>
          ) : (
            <VerifyOtp
              email={formData.email}
              isLoading={isLoading}
              onVerify={handleVerifyOtp}
              onResend={handleResendOtp}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}


export default function SignUpPage() {
  return (
    <div>
      <Suspense
        fallback={
          <div className="relative z-10 bg-white rounded-2xl flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-[#93C01F]" />
            <span className="text-gray-500">Loading signup...</span>
          </div>
        }
      >
        <SignupForm />
      </Suspense>
    </div>
  );
}
