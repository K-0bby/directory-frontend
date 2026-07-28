"use client";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

interface VerifyOtpProps {
  email: string;
  onVerify: (otp: string) => Promise<void>;
  onResend: () => Promise<void>;
  isLoading: boolean;
}

export default function VerifyOtp({
  email,
  onVerify,
  onResend,
  isLoading,
}: VerifyOtpProps) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Added: Auto-fill on paste logic
  const handlePaste = (e: React.ClipboardEvent) => {
    const pastedData = e.clipboardData.getData("text").slice(0, 6).split("");
    if (pastedData.every((char) => /^\d$/.test(char))) {
      const newOtp = [...otp];
      pastedData.forEach((char, i) => {
        newOtp[i] = char;
      });
      setOtp(newOtp);
      inputRefs.current[Math.min(pastedData.length - 1, 5)]?.focus();
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="text-center">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
          Confirm your email
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 mt-2 break-all px-2">
          Please enter the code sent to your email{" "}
          <span className="font-medium text-gray-700">{email}</span>
        </p>
      </div>

      <div className="flex items-center justify-center gap-1.5 sm:gap-2">
        {otp.map((digit, i) => (
          <div key={i} className="flex items-center gap-1.5 sm:gap-2">
            <Input
              ref={(el) => {
                inputRefs.current[i] = el;
              }}
              className="w-10 h-12 sm:w-13 sm:h-14 text-center text-lg sm:text-xl font-bold rounded-lg border-2 border-gray-200 focus:border-[#93C01F] focus:ring-[#93C01F] transition-colors p-0"
              value={digit}
              maxLength={1}
              inputMode="numeric"
              onPaste={handlePaste}
              onChange={(e) => handleChange(e.target.value, i)}
              onKeyDown={(e) => handleKeyDown(e, i)}
            />
            {i === 2 && (
              <span className="text-xl sm:text-2xl font-bold text-gray-400 mx-0.5 sm:mx-1">
                -
              </span>
            )}
          </div>
        ))}
      </div>

      <Button
        className="w-full bg-[#93C01F] hover:bg-[#82ab1b] h-12 text-base font-semibold"
        disabled={isLoading || otp.some((d) => !d)}
        onClick={() => onVerify(otp.join(""))}
      >
        {isLoading ? <Loader2 className="animate-spin mr-2" /> : "Verify Code"}
      </Button>

      <div className="text-center text-sm">
        {timer > 0 ? (
          <span className="text-gray-500">
            Didn&apos;t get the code?{" "}
            <span className="text-gray-400">Resend in {timer}s</span>
          </span>
        ) : (
          <span className="text-gray-500">
            Didn&apos;t get the code?{" "}
            <button
              type="button"
              onClick={() => {
                onResend();
                setTimer(60);
              }}
              className="text-[#93C01F] font-bold hover:text-[#82ab1b] hover:underline"
            >
              Resend
            </button>
          </span>
        )}
      </div>
    </div>
  );
}
