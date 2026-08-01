"use client";
import { useState } from "react";
import {
  Eye,
  MessageSquare,
  Bookmark,
  Star,
  Plus,
  Check,
  Clock,
  CircleDashed,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Pencil,
  Trash2,
  MoreHorizontal,
  // Briefcase,
} from "lucide-react";
import Image from "next/image";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type ListingStatus =
  | "published"
  | "pending"
  | "drafted"
  | "rejected"
  | "suspended"
  | "ended";

export interface ListingsTableItem {
  id: string;
  slug: string;
  name: string;
  image: string;
  allImages: string[];
  category: string;
  location: string;
  status: ListingStatus;
  type: string;
  verified: boolean;
  views: number;
  comments: number;
  bookmarks: number;
  rating: number;
  description?: string;
}

interface ListingsTableProps {
  listings: ListingsTableItem[];
  showPagination?: boolean;
  button?: boolean;
  itemsPerPage?: number;
  pagination?: {
    currentPage: number;
    totalPages?: number;
    hasNextPage: boolean;
    onPrevious: () => void;
    onNext: () => void;
  };
  onViewClick?: (listing: ListingsTableItem) => void;
  onEditClick?: (listing: ListingsTableItem) => void;
  onDeleteClick?: (id: string) => void;
  onWhatWeDoClick?: (listing: ListingsTableItem) => void;
}

const getStatusConfig = (status: ListingStatus) => {
  switch (status) {
    case "published":
      return {
        label: "Published",
        className: "bg-[#3E875E] text-white border-[#0A7B3E]/20",
        icon: (
          <span className="border border-white rounded-full w-4 h-4 flex items-center justify-center bg-white">
            <Check className="w-4 h-4 text-black" />
          </span>
        ),
      };
    case "pending":
      return {
        label: "In review",
        className: "bg-[#2E61B4] text-white border-[#1976D2]/20",
        icon: (
          <span>
            <Clock className="w-4 h-4" />
          </span>
        ),
      };
    case "drafted":
      return {
        label: "Draft",
        className: "bg-[#F5F5F5] text-[#616161] border-[#616161]/20",
        icon: (
          <span>
            <CircleDashed className="w-4 h-4" />
          </span>
        ),
      };
    case "rejected":
      return {
        label: "Rejected",
        className: "bg-red-100 text-red-700 border-red-200",
        icon: <CircleDashed className="w-4 h-4" />,
      };
    case "suspended":
      return {
        label: "Suspended",
        className: "bg-orange-100 text-orange-700 border-orange-200",
        icon: <CircleDashed className="w-4 h-4" />,
      };
    case "ended":
      return {
        label: "Ended",
        className: "bg-slate-200 text-slate-700 border-slate-300",
        icon: <Clock className="w-4 h-4" />,
      };
  }
};

// --- Mobile accordion row ---
function MobileListingRow({
  listing,
  isExpanded,
  onToggle,
  onViewClick,
  onEditClick,
  onDeleteClick,
}: {
  listing: ListingsTableItem;
  isExpanded: boolean;
  onToggle: () => void;
  onViewClick?: (l: ListingsTableItem) => void;
  onEditClick?: (l: ListingsTableItem) => void;
  onDeleteClick?: (id: string) => void;
}) {
  const statusConfig = getStatusConfig(listing.status);

  return (
    <div className="border-b border-[#E3E8EF] last:border-b-0">
      {/* Collapsed row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={onToggle}
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg border border-[#E3E8EF] bg-white"
          aria-label={isExpanded ? "Collapse" : "Expand"}
        >
          <ChevronDown
            className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
          />
        </button>

        <button
          className="flex items-center gap-3 flex-1 min-w-0 text-left"
          onClick={() => onViewClick?.(listing)}
        >
          <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 border border-[#E3E8EF]">
            <Image
              src={listing.image}
              alt={listing.name}
              width={36}
              height={36}
              unoptimized
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-semibold text-[#1F3A4C] text-sm truncate">
              {listing.name}
            </span>
            {listing.verified && (
              <Image
                src="/images/icons/verify.svg"
                alt="Verified"
                width={14}
                height={14}
                className="shrink-0"
              />
            )}
          </div>
        </button>

        {/* Actions menu */}
        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-gray-100"
              >
                <MoreHorizontal className="h-4 w-4 text-[#425466]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => onViewClick?.(listing)}
                className="cursor-pointer"
              >
                <Eye className="mr-2 h-4 w-4" /> View
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onEditClick?.(listing)}
                className="cursor-pointer"
              >
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDeleteClick?.(listing.id)}
                className="cursor-pointer text-red-600 focus:text-red-700"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 bg-gray-50/60">
          {/* Status + Type */}
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium ${statusConfig.className}`}
            >
              {statusConfig.icon}
              <span>{statusConfig.label}</span>
            </div>
            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 border border-slate-200 text-xs font-medium capitalize">
              {listing.type}
            </span>
          </div>

          {/* Category & Location */}
          <div className="flex items-center gap-1.5 text-xs text-[#425466]">
            <span className="font-medium">{listing.category}</span>
            <span className="w-1 h-1 rounded-full bg-[#425466]" />
            <span>{listing.location}</span>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-[#425466]">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 cursor-default">
                  <Image
                    src="/images/icons/website.png"
                    alt="Views"
                    width={14}
                    height={14}
                    className="shrink-0"
                  />
                  <span className="text-xs">
                    {listing.views.toLocaleString()}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>Views</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 cursor-default">
                  <MessageSquare className="w-3.5 h-3.5 text-black" />
                  <span className="text-xs">{listing.comments}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>Comments</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 cursor-default">
                  <Bookmark className="w-3.5 h-3.5 text-black" />
                  <span className="text-xs">{listing.bookmarks}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>Bookmarks</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 cursor-default">
                  <Star className="w-3.5 h-3.5 text-black" />
                  <span className="text-xs">{listing.rating}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>Rating</TooltipContent>
            </Tooltip>
          </div>
        </div>
      )}
    </div>
  );
}

export function ListingsTable({
  listings,
  showPagination = false,
  button = true,
  itemsPerPage = 4,
  pagination,
  onViewClick,
  onEditClick,
  onDeleteClick,
  // onWhatWeDoClick,
}: ListingsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpanded = (id: string) =>
    setExpandedId((prev) => (prev === id ? null : id));

  // Calculate pagination
  const totalPages = Math.ceil(listings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentListings = listings.slice(startIndex, endIndex);

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxPagesToShow = 4;

    if (totalPages <= maxPagesToShow) {
      // Show all pages if total is less than max
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show pages with smart logic
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4);
      } else if (currentPage >= totalPages - 2) {
        pages.push(totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(
          currentPage - 1,
          currentPage,
          currentPage + 1,
          currentPage + 2,
        );
      }
    }

    return pages;
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePrevious = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const listingsToRender =
    showPagination && !pagination ? currentListings : listings;
  const visibleTotalPages = pagination?.totalPages ?? totalPages;
  const shouldShowPagination =
    showPagination &&
    (pagination
      ? pagination.currentPage > 1 || pagination.hasNextPage
      : totalPages > 1);

  const handleVisiblePrevious = () => {
    if (pagination) {
      pagination.onPrevious();
      return;
    }

    handlePrevious();
  };

  const handleVisibleNext = () => {
    if (pagination) {
      pagination.onNext();
      return;
    }

    handleNext();
  };

  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-0 px-4">
        <div className="w-full h-full flex items-center justify-center">
          <Image
            src="/images/icons/tags-empty.png"
            alt="No Activity"
            width={100}
            height={100}
          />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mt-2">
          No listings yet
        </h3>
        <p className="text-sm text-gray-500 text-center max-w-sm">
          No Listings yet. Add one to start reaching customers
        </p>
        {button && (
          <Button className="mt-6 bg-[#93C01F] py-3.5 px-4 hover:bg-[#93C01F]/80 cursor-pointer">
            <span>
              <Plus className="w-4 h-4" />
            </span>
            Add your first listing
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full rounded-xl border">
      {/* Mobile accordion — hidden on md+ */}
      <div className="md:hidden divide-y-0">
        {listingsToRender.map((listing) => (
          <MobileListingRow
            key={listing.id}
            listing={listing}
            isExpanded={expandedId === listing.id}
            onToggle={() => toggleExpanded(listing.id)}
            onViewClick={onViewClick}
            onEditClick={onEditClick}
            onDeleteClick={onDeleteClick}
          />
        ))}
      </div>

      {/* Desktop table — hidden on mobile */}
      <div className="hidden md:block">
        <Table>
          <TableHeader className="rounded-2xl">
            <TableRow className="border-b border-[#E3E8EF] hover:bg-transparent bg-gray-100">
              <TableHead className="text-[#425466] font-medium text-sm rounded-tl-xl">
                Listings
              </TableHead>
              <TableHead className="text-[#425466] font-medium text-sm rounded-tl-xl">
                Type
              </TableHead>
              <TableHead className="text-[#425466] font-medium text-sm">
                Category & Location
              </TableHead>
              <TableHead className="text-[#425466] font-medium text-sm">
                Status
              </TableHead>
              <TableHead className="text-[#425466] font-medium text-sm">
                Stats Summary
              </TableHead>
              <TableHead className="text-[#425466] font-medium text-sm text-right rounded-tr-xl">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listingsToRender.map((listing) => {
              const statusConfig = getStatusConfig(listing.status);
              return (
                <TableRow
                  key={listing.id}
                  className="border-b border-[#E3E8EF] hover:bg-gray-50/50 cursor-pointer"
                  onClick={() => onViewClick?.(listing)}
                >
                  <TableCell className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
                        <Image
                          src={listing.image}
                          alt={listing.name}
                          width={40}
                          height={40}
                          unoptimized
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex items-center justify-between w-full gap-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-[#1F3A4C] leading-tight">
                              {listing.name}
                            </span>
                            {listing.verified && (
                              <Image
                                src="/images/icons/verify.svg"
                                alt="Verified"
                                width={16}
                                height={16}
                                title="Verified listing"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <Badge className="bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-100 font-medium text-[10px] px-2 py-0">
                      {listing.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex items-center gap-2 text-[#425466]">
                      <span>{listing.category}</span>
                      <span className="w-1 h-1 rounded-full bg-[#425466]"></span>
                      <span>{listing.location}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm font-medium ${statusConfig.className}`}
                    >
                      <span>{statusConfig.icon}</span>
                      <span>{statusConfig.label}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex items-center gap-4 text-[#425466]">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1.5 cursor-default">
                            <Image
                              src="/images/icons/website.png"
                              alt="Views"
                              width={16}
                              height={16}
                              className="shrink-0"
                            />
                            <span className="text-sm">
                              {listing.views.toLocaleString()}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>Views</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1.5 cursor-default">
                            <MessageSquare className="w-3.5 h-3.5 text-black" />
                            <span className="text-sm">{listing.comments}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>Comments</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1.5 cursor-default">
                            <Bookmark className="w-3.5 h-3.5 text-black" />
                            <span className="text-sm">{listing.bookmarks}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>Bookmarks</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1.5 cursor-default">
                            <Star className="w-3.5 h-3.5 text-black" />
                            <span className="text-sm">{listing.rating}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>Rating</TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                  <TableCell
                    className="py-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-gray-100"
                          >
                            <MoreHorizontal className="h-4 w-4 text-[#425466]" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => onViewClick?.(listing)}
                            className="cursor-pointer"
                          >
                            <Eye className="mr-2 h-4 w-4" /> View
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onEditClick?.(listing)}
                            className="cursor-pointer"
                          >
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onDeleteClick?.(listing.id)}
                            className="cursor-pointer text-red-600 focus:text-red-700"
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {shouldShowPagination && (
          <div className="flex items-center justify-end gap-2 px-4 py-4 border-t border-[#E3E8EF]">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleVisiblePrevious}
              disabled={(pagination?.currentPage ?? currentPage) === 1}
              className="h-8 w-8 hover:bg-gray-100 disabled:opacity-50 border rounded-full"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>

            {pagination ? (
              <span className="px-3 text-sm text-[#425466]">
                Page {pagination.currentPage}
                {pagination.totalPages ? ` of ${pagination.totalPages}` : ""}
              </span>
            ) : (
              <div className="border rounded-full">
                {getPageNumbers().map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "ghost"}
                    size="icon"
                    onClick={() => handlePageChange(page)}
                    className={`h-8 w-8 rounded-full ${
                      currentPage === page
                        ? "bg-[#93C01F] text-white hover:bg-[#93C01F]/90"
                        : "hover:bg-gray-100 text-gray-700"
                    }`}
                  >
                    {page}
                  </Button>
                ))}
              </div>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={handleVisibleNext}
              disabled={
                pagination
                  ? !pagination.hasNextPage
                  : currentPage === visibleTotalPages
              }
              className="h-8 w-8 hover:bg-gray-100 disabled:opacity-50 border rounded-full"
              aria-label="Next page"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        )}
      </div>
      {/* end hidden md:block */}
    </div>
  );
}
