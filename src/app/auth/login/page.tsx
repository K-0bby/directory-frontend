"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";


function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState({
    email: "",
    password: "",
  });

  const { login } = useAuth();

  const redirectPath = searchParams.get("redirect") || "/";

  const validateForm = () => {
    const newErrors = { email: "", password: "" };
    let isValid = true;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
      isValid = false;
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = "Invalid email format";
      isValid = false;
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
      isValid = false;
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters long";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setErrors({
      email: "",
      password: "",
    });

    if (!validateForm()) {
      setIsLoading(false);
      return;
    }

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://me-fie.co.uk";

      // console.log('📡 Sending login request to:', `${API_URL}/api/login`);
      const response = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      // console.log('📨 Raw login response:', data);

      if (!response.ok) {
        // Handle specific error messages from backend or default to generic
        throw new Error(data.message || "Invalid email or password");
      }

      // Debug: Check all possible token locations
      // console.log('🔍 Searching for token in response:', {
      //   'data.token': data.token,
      //   'data.access_token': data.access_token,
      //   'data.jwt': data.jwt,
      //   'data.data': data.data,
      //   'data.data?.token': data.data?.token,
      //   'fullResponse': data
      // });

      // Try multiple possible token field names
      const token =
        data.token || data.access_token || data.jwt || data.data?.token;

      if (token) {
        // console.log('✅ Token found:', token);
        await login(token);

        // Role-based routing after login - read from localStorage since state may not be immediately available
        const userRole = localStorage.getItem("userRole")?.toLowerCase() || "";

        if (userRole === "admin") {
          // Admin goes to admin dashboard
          router.push("/dashboard/admin");
        } else if (
          userRole === "vendor" ||
          userRole === "listing_agent" ||
          userRole === "agent"
        ) {
          // Vendors and listing agents go to my listings
          router.push("/dashboard/vendor/my-listing");
        } else {
          // Regular users go to home page or redirect path
          router.push(redirectPath);
        }
      } else {
        // console.error('❌ No token found in response');
        setError("Login successful but no token received");
      }
    } catch (error) {
      // console.error("❌ Login failed:", error);
      // If the error message includes "401" or typical auth failure text, show specific message
      const msg = error instanceof Error ? error.message : String(error);

      // Check if it's an unverified email case
      if (
        msg.toLowerCase().includes("not verified") ||
        msg.toLowerCase().includes("verify your email") ||
        msg.toLowerCase().includes("email not verified") ||
        msg.toLowerCase().includes("please verify")
      ) {
        // Show info toast
        toast.info("Please verify your email", {
          description: "Redirecting to verification page...",
        });
        
        // Redirect to signup with email pre-filled and verification flow
        const encodedEmail = encodeURIComponent(formData.email);
        router.push(`/auth/signup?redirect=${redirectPath}&email=${encodedEmail}&verify=true`);
        return;
      }

      setError(msg.includes("401") ? "Incorrect email or password." : msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.id]: e.target.value,
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
                src="/images/logos/login-logo.png"
                alt="MeFie Logo"
                width={110}
                height={50}
                className="object-cover"
              />
            </Link>

            <p className="text-sm text-gray-500">
              Don&apos;t have an account?{" "}
              <Link
                href={`/auth/signup?redirect=${redirectPath}`}
                className="text-[#93C01F] font-medium hover:underline"
              >
                Sign up
              </Link>
            </p>
          </div>

          {/* <div className="-mt-10 px-2">
            <Link
              href="/"
              className="flex items-center text-[#93C01F] text-sm gap-2"
            >
              <span>
                <ArrowLeft size={16} />
              </span>
              Back to Home
            </Link>
          </div> */}

          <div className="space-y-1 mt-0">
            <h2 className="text-4xl font-semibold text-gray-900">
              Sign in to mefie
            </h2>
            <p className="text-gray-500 text-base">
              Welcome back, please enter your details
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm">
                  Email Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  className="w-full placeholder:text-xs"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
                {errors.email && (
                  <p className="text-red-500 text-sm">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex item-center justify-between">
                  <Label htmlFor="password" className="text-sm">
                    Password <span className="text-red-500">*</span>
                  </Label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-sm text-[#93C01F] font-medium hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>

                {/* WRAPPER FOR RELATIVE POSITIONING */}
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    className="w-full placeholder:text-xs pr-10" // Added pr-10 to prevent text overlap with eye
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>

                {errors.password && (
                  <p className="text-red-500 text-sm">{errors.password}</p>
                )}
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full text-sm bg-[#93C01F] text-white cursor-pointer"
              >
                {isLoading ? "Signing in..." : "Sign in"}
              </Button>

              <div className=" px-2">
                <Link
                  href="/"
                  className="flex items-center justify-center text-[#93C01F] text-sm gap-2"
                >
                  <span>
                    <ArrowLeft size={16} />
                  </span>
                  Back to Home
                </Link>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div>
      <Suspense
        fallback={
          <div className="relative z-10 bg-white rounded-2xl flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-[#93C01F]" />
            <span className="text-gray-500">Loading login...</span>
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
