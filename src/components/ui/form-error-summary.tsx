import { WarningCircle } from "@phosphor-icons/react/dist/ssr";

import { cn } from "@/lib/utils";

interface FormErrorSummaryProps {
  errors: string[];
  title?: string;
  className?: string;
}

export function FormErrorSummary({
  errors,
  title = "We couldn’t save this step",
  className,
}: FormErrorSummaryProps) {
  const uniqueErrors = [...new Set(errors.filter(Boolean))];
  if (uniqueErrors.length === 0) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        "rounded-lg border border-red-200 bg-red-50 p-4 text-red-900",
        className,
      )}
    >
      <div className="flex gap-3">
        <WarningCircle className="mt-0.5 size-5 shrink-0" weight="fill" />
        <div>
          <p className="font-medium">{title}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {uniqueErrors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
