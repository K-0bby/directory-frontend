"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "../ui/checkbox";
import Pill from "./pill";
import { Plus, Check, ChevronDown } from "lucide-react";

interface TagSelectorProps {
  tags: string[];
  selectedTags: string[];
  onTagChange: (newTags: string[]) => void;
}

export default function TagSelector({
  tags,
  selectedTags,
  onTagChange,
}: TagSelectorProps) {
  const [open, setOpen] = useState(false);

  // Handle adding/removing tags
  const handleSelect = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagChange(selectedTags.filter((item) => item !== tag));
    } else if (selectedTags.length < 3) {
      onTagChange([...selectedTags, tag]);
    }
  };

  return (
    <div className="w-full max-w-md space-y-4">
      {/* Dropdown with selected tags */}
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger className="flex items-center justify-between h-10 px-4 border border-gray-300 rounded-lg bg-white text-gray-600 w-full">
          <div className="flex flex-wrap gap-1 text-gray-400 text-xs">
            {selectedTags.length > 0 ? (
              selectedTags.map((tag) => (
                <Pill key={tag} label={tag} onClick={() => handleSelect(tag)} />
              ))
            ) : (
              <span className="text-gray-400">Select tag(s)</span>
            )}
          </div>
          <ChevronDown className="w-4 h-4 ml-2" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[420px] p-2 border border-gray-300 rounded-lg bg-white shadow-md">
          {tags.map((tag) => (
            <div
              key={tag}
              className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-md cursor-pointer"
              onClick={() => handleSelect(tag)}
            >
              <Checkbox
                checked={selectedTags.includes(tag)}
                className="border border-[#D0D5DD]"
              />
              <span className="text-xs text-gray-500">{tag}</span>
            </div>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Available Tags */}
      <p className="text-xs font-medium text-gray-600">Available tags</p>
      <div className="flex flex-wrap gap-3">
        {tags.map((tag) => (
          <button
            key={tag}
            onClick={() => handleSelect(tag)}
            className={`flex items-center space-x-2 px-3 py-1 text-xs rounded-xl border transition-all ${
              selectedTags.includes(tag)
                ? "bg-blue-100 text-blue-600 border-blue-400 cursor-default"
                : "bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200"
            }`}
            disabled={selectedTags.includes(tag)}
          >
            {tag}{" "}
            {selectedTags.includes(tag) ? (
              <Check className="w-3 h-3 ml-2" />
            ) : (
              <Plus className="w-3 h-3 ml-2" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
