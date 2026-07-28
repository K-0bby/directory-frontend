"use client";

import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Input } from "./ui/input";

interface SearchDropdownProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  context?: "discover" | "businesses" | "events" | "communities";
}

export default function SearchDropdown({
  onSearch,
  placeholder = "Search by listing name or keyword...",
}: SearchDropdownProps) {
  const [query, setQuery] = useState("");

  // Debounce: only call onSearch 350ms after the user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(query.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [query, onSearch]);

  return (
    <div className="relative w-full">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
      <Input
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full h-10 pl-12 pr-10 rounded-full border border-[#E2E8F0] text-gray-600 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#9ACC23] focus:border-transparent"
      />
      {query && (
        <button
          type="button"
          onClick={() => { setQuery(""); onSearch(""); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
