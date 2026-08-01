"use client"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

export type SortOption = "name-asc" | "name-desc" | "newest" | "oldest" | "popular";

type SortDropdownProps = {
  value: SortOption;
  onChange: (value: SortOption) => void;
  className?: string;
};

const sortOptions = [
  { value: "name-asc", label: "Name (A-Z)" },
  { value: "name-desc", label: "Name (Z-A)" },
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "popular", label: "Most Popular" },
] as const;

export function Sort({
  value,
  onChange,
  className,
}: SortDropdownProps) {
  return (
    <Select value={value} onValueChange={(val) => onChange(val as SortOption)}>
      <SelectTrigger className={className ?? "w-[180px] mr-4"}>
        <span className="text-sm text-muted-foreground mr-1">Sort by</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {sortOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
