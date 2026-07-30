"use client";

import * as React from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { Button as BaseButton } from "@/components/ui/button";
import {
  Card as BaseCard,
  CardContent as BaseCardContent,
  CardHeader as BaseCardHeader,
} from "@/components/ui/card";
import { Input as BaseInput } from "@/components/ui/input";
import { Label as BaseLabel } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function SettingsCard({
  className,
  ...props
}: React.ComponentProps<typeof BaseCard>) {
  return (
    <BaseCard
      className={cn("gap-0 border-gray-200 bg-white py-0 shadow-none", className)}
      {...props}
    />
  );
}

export function SettingsCardHeader({
  className,
  ...props
}: React.ComponentProps<typeof BaseCardHeader>) {
  return <BaseCardHeader className={cn("block p-6 pb-4", className)} {...props} />;
}

export function SettingsCardContent({
  className,
  ...props
}: React.ComponentProps<typeof BaseCardContent>) {
  return <BaseCardContent className={cn("px-6 pb-6", className)} {...props} />;
}

export function SettingsLabel({
  className,
  ...props
}: React.ComponentProps<typeof BaseLabel>) {
  return (
    <BaseLabel
      className={cn("mb-1.5 block text-sm font-medium text-gray-900", className)}
      {...props}
    />
  );
}

interface SettingsInputProps extends React.ComponentProps<typeof BaseInput> {
  showEyeIcon?: boolean;
}

export function SettingsInput({
  className,
  showEyeIcon = false,
  type = "text",
  ...props
}: SettingsInputProps) {
  const [showPassword, setShowPassword] = React.useState(false);
  const inputType = showEyeIcon && showPassword ? "text" : type;

  return (
    <div className="relative">
      <BaseInput
        type={inputType}
        className={cn(
          "h-auto w-full rounded-lg border-gray-300 px-4 py-2.5 shadow-none focus-visible:border-lime-500 focus-visible:ring-lime-500/20",
          showEyeIcon && "pr-10",
          className,
        )}
        {...props}
      />
      {showEyeIcon && (
        <button
          type="button"
          onClick={() => setShowPassword((visible) => !visible)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      )}
    </div>
  );
}

interface SettingsButtonProps
  extends Omit<React.ComponentProps<typeof BaseButton>, "variant"> {
  variant?: "default" | "outline";
  isLoading?: boolean;
}

export function SettingsButton({
  children,
  className,
  disabled,
  isLoading = false,
  variant = "default",
  ...props
}: SettingsButtonProps) {
  return (
    <BaseButton
      variant="outline"
      disabled={disabled || isLoading}
      className={cn(
        "h-auto rounded-lg px-6 py-2.5 font-medium shadow-none",
        variant === "outline"
          ? "border-red-400 bg-white text-red-500 hover:bg-red-50 hover:text-red-600"
          : "border-lime-500 bg-lime-500 text-white hover:bg-lime-600 hover:text-white",
        className,
      )}
      {...props}
    >
      {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </BaseButton>
  );
}
