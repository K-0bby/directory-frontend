import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { Badge } from "../ui/badge";

interface PillProps {
  label: string;
  className?: string;
  onClick?: () => void;
}

export default function Pill({ label, className, onClick }: PillProps) {
  return (
    <Badge
      className={cn(
        "relative z-20 px-2 py-1 flex items-center justify-between  text-muted-foreground border rounded-full bg-gray-100 hover:bg-gray-100 hover:border-gray-100",
        className
      )}
    >
      <span className="flex-1 text-center">{label}</span>
      {onClick && (
        <X
          className="w-6 h-6 shrink-0 cursor-pointer hover:text-red-700 transition-colors border border-gray-50 rounded-full bg-[#FCFCFC] ml-2"
          onClick={onClick}
        />
      )}
    </Badge>
  );
}