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
    country_code: "+233",
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

  const validateForm = () => {
    const newErrors = {
      first_name: "",
      last_name: "",
      phone: "",
      email: "",
      password: "",
    };
    let isValid = true;

    if (!formData.first_name.trim()) {
      newErrors.first_name = "First name is required";
      isValid = false;
    }
    if (!formData.last_name.trim()) {
      newErrors.last_name = "Last name is required";
      isValid = false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
      isValid = false;
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = "Invalid email format";
      isValid = false;
    }

    if (!formData.password || formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters long";
      isValid = false;
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
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

    const rawPhone = formData.phone.replace(/\D/g, "");
    const dialCodeDigits = formData.country_code.replace(/\D/g, "");
    const apiPhone = rawPhone.startsWith(dialCodeDigits)
      ? rawPhone.slice(dialCodeDigits.length)
      : rawPhone;

    const payload = { ...formData, phone: apiPhone };

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
        
        // Role-based routing after signup/verification - read from localStorage since state may not be immediately available
        const userRole = localStorage.getItem("userRole")?.toLowerCase() || "";
        if (userRole === "admin") {
          // Admin goes to admin dashboard
          router.push("/dashboard/admin");
        } 
        else if (userRole === "vendor" || userRole === "listing_agent" || userRole === "agent") {
          // Vendors and listing agents go to my listings
          router.push("/dashboard/vendor/my-listing");
        }
        else {
          // Regular users go to home page
          router.push(redirectPath);
        }
        router.refresh();
        return;
      }

      toast.success("Account Verified!", {
        description: "Welcome to MeFie! Redirecting to landing page...",
      });

      router.push("/");
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
    if (errors[id as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [id]: "" }));
    }
  };

  const handlePhoneChange = (phone: string, meta: any) => {
    const dialCode = meta.country?.dialCode || "";
    setFormData((prev) => ({
      ...prev,
      phone: phone,
      country_code: dialCode.startsWith("+") ? dialCode : `+${dialCode}`,
    }));
    if (errors.phone) setErrors((prev) => ({ ...prev, phone: "" }));
  };

  return (
    <div className="relative h-[98vh] flex items-center justify-center px-4 login-bg rounded-2xl">
      <div className="absolute inset-0 bg-black/30 rounded-2xl" />
      <Card className="relative z-10 w-full max-w-md rounded-2xl shadow-sm bg-white/95 backdrop-blur-md border-none ">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <Link href="/">
              <Image
                src="/images/logos/login-logo.png"
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
                    placeholder="John"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs">Last Name</Label>
                  <Input
                    id="last_name"
                    placeholder="Doe"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Phone Number</Label>
                <PhoneInput
                  defaultCountry="gh"
                  placeholder="Enter phone number"
                  value={formData.phone}
                  onChange={(phone, meta) => handlePhoneChange(phone, meta)}
                  inputClassName="w-full h-11 border border-gray-300 rounded-r-3xl px-4"
                />
                <Label className="text-xs">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
                <Label className="text-xs">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
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
