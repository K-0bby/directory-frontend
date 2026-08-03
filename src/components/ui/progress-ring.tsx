import { cn } from "@/lib/utils";

interface ProgressRingProps {
  /** 0-100. Values outside the range are clamped. */
  value: number;
  /** Outer diameter in pixels. */
  size?: number;
  strokeWidth?: number;
  /** Hides the numeric label — useful at small sizes where it won't fit. */
  hideLabel?: boolean;
  className?: string;
}

/**
 * Determinate circular progress indicator.
 *
 * Deliberately determinate: an indeterminate spinner tells a user that
 * something is happening but not whether it is nearly done, which is the
 * question that actually matters during a multi-file upload.
 */
export function ProgressRing({
  value,
  size = 44,
  strokeWidth = 4,
  hideLabel = false,
  className,
}: ProgressRingProps) {
  const percent = Math.min(100, Math.max(0, Math.round(value)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {/* -rotate-90 puts 0% at 12 o'clock; SVG circles otherwise start at 3 o'clock. */}
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="stroke-gray-200"
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="stroke-[#93C01F] transition-[stroke-dashoffset] duration-300 ease-out"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      {!hideLabel && (
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold tabular-nums text-gray-700">
          {percent}%
        </span>
      )}
    </div>
  );
}
