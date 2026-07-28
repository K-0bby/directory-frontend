"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import Link from "next/link"; // 1. Import Link
import {
  Calendar as CalendarIcon,
  LayoutGrid,
  Search,
  ChevronLeft,
  ChevronRight,
  MapPin,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { stripHtml } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
  subDays,
  isBefore,
  isAfter,
  isSameWeek,
} from "date-fns";
import { useAuth } from "@/context/auth-context";

// --- Types ---
interface EventItem {
  id: string;
  slug?: string; // Add slug to type if available, fallback to ID
  title: string;
  category: string;
  image: string;
  description: string;
  location: string;
  date: string;
  startTime?: string;
  isVerified?: boolean;
}

interface ApiEventItem {
  id: number | string;
  slug?: string;
  title?: string;
  name?: string;
  category?: { name: string } | string;
  image?: string;
  cover_image?: string;
  description?: string;
  location?: string;
  start_date?: string;
  start_time?: string;
  is_verified?: boolean;
}

export default function MyEvents() {
  const { user, loading: authLoading } = useAuth();
  const [viewMode, setViewMode] = useState<"grid" | "calendar">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOption, setFilterOption] = useState("all");
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [events, setEvents] = useState<EventItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      if (authLoading) return;

      const token = localStorage.getItem("authToken");
      if (!user || !token) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://me-fie.co.uk";
        const response = await fetch(`${API_URL}/api/user/events/saved`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch events");
        }

        const json = await response.json();
        const rawData: ApiEventItem[] = Array.isArray(json.data)
          ? json.data
          : Array.isArray(json)
          ? json
          : [];

        const mappedEvents: EventItem[] = rawData.map((item) => ({
          id: item.id.toString(),
          slug: item.slug || item.id.toString(), // Map slug
          title: item.title || item.name || "Untitled Event",
          category:
            typeof item.category === "object"
              ? item.category?.name || "Event"
              : item.category || "Event",
          image:
            item.image ||
            item.cover_image ||
            "/images/no-image.jpg",
          description: item.description || "No description provided.",
          location: item.location || "TBD",
          date: item.start_date
            ? new Date(item.start_date).toISOString()
            : new Date().toISOString(),
          startTime: item.start_time || "10:00 AM",
          isVerified: item.is_verified || false,
        }));

        setEvents(mappedEvents);
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, [user, authLoading]);

  const filteredEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return events.filter((event) => {
      const eventDate = parseISO(event.date);
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        event.title.toLowerCase().includes(query) ||
        event.description.toLowerCase().includes(query) ||
        event.location.toLowerCase().includes(query) ||
        event.category.toLowerCase().includes(query);

      let matchesTime = true;
      if (filterOption === "week") {
        matchesTime = isSameWeek(eventDate, today, { weekStartsOn: 1 });
      } else if (filterOption === "month") {
        matchesTime = isSameMonth(eventDate, today);
      }

      return matchesSearch && matchesTime;
    });
  }, [events, searchQuery, filterOption]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingEvents = filteredEvents.filter((e) => {
    const eventDate = parseISO(e.date);
    return isAfter(eventDate, subDays(today, 1));
  });

  const pastEvents = filteredEvents.filter((e) => {
    const eventDate = parseISO(e.date);
    return isBefore(eventDate, today);
  });

  const renderCalendar = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const dateFormat = "d";
    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    return (
      <div className="border rounded-xl bg-white overflow-hidden shadow-none">
        <div className="grid grid-cols-7 border-b bg-white">
          {weekDays.map((d, i) => (
            <div
              key={i}
              className="py-4 text-center text-sm font-semibold text-gray-900 border-r last:border-r-0"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 auto-rows-[140px]">
          {calendarDays.map((dayItem, idx) => {
            const dayEvents = filteredEvents.filter((e) =>
              isSameDay(parseISO(e.date), dayItem)
            );
            const isCurrentMonth = isSameMonth(dayItem, monthStart);
            const isTodayDate = isToday(dayItem);

            return (
              <div
                key={dayItem.toString()}
                className={`border-b border-r p-2 flex flex-col relative transition-colors hover:bg-gray-50
                  ${
                    !isCurrentMonth
                      ? "bg-gray-50/50 text-gray-400"
                      : "bg-white text-gray-900"
                  }
                  ${(idx + 1) % 7 === 0 ? "border-r-0" : ""} 
                `}
              >
                <div className="flex justify-between items-start mb-1">
                  <span
                    className={`text-sm font-medium h-7 w-7 flex items-center justify-center rounded-full
                      ${isTodayDate ? "bg-[#275782] text-white shadow-sm" : ""}
                    `}
                  >
                    {format(dayItem, dateFormat)}
                  </span>
                </div>

                <div className="flex flex-col gap-1 overflow-y-auto custom-scrollbar max-h-[90px]">
                  {dayEvents.map((ev) => (
                    // Wrap calendar pills in Link as well
                    <Link
                      key={ev.id}
                      href={`/events/${ev.slug || ev.id}`}
                      className="text-[10px] px-2 py-1 rounded bg-[#EBF8C9] text-[#5F8B0A] truncate font-medium cursor-pointer hover:opacity-80 border border-[#93C01F]/20 block"
                      title={ev.title}
                    >
                      {ev.startTime ? `${ev.startTime.split(" ")[0]} ` : ""}
                      {ev.title}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="px-1 lg:px-8 py-6 space-y-8 pb-20 w-full max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Events</h1>
        <p className="text-gray-500 mt-1">
          Keep track of all your events you have saved
        </p>
      </div>

      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-[320px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by title, location..."
              className="pl-9 bg-white border-gray-200 h-10 focus-visible:ring-[#93C01F]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Select value={filterOption} onValueChange={setFilterOption}>
            <SelectTrigger className="w-40 h-10 bg-white border-gray-200">
              <span className="text-gray-500 mr-1">Filter</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className={`gap-2 h-10 border-gray-200 transition-colors ${
              viewMode === "calendar"
                ? "bg-[#EBF8C9] text-[#5F8B0A] border-[#93C01F] font-semibold"
                : "text-gray-500 bg-white hover:bg-gray-50"
            }`}
            onClick={() => setViewMode("calendar")}
          >
            <CalendarIcon className="w-4 h-4" />
            Calendar
          </Button>
          <Button
            variant="outline"
            className={`gap-2 h-10 border-gray-200 transition-colors ${
              viewMode === "grid"
                ? "bg-[#EBF8C9] text-[#5F8B0A] border-[#93C01F] font-semibold"
                : "text-gray-500 bg-white hover:bg-gray-50"
            }`}
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid className="w-4 h-4" />
            Grid
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-64 bg-gray-100 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : (
        <>
          {viewMode === "calendar" ? (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
              <div className="flex items-center justify-between bg-white border rounded-xl p-4 shadow-none">
                <div className="flex gap-2 items-center">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <span className="text-xl font-bold ml-3 text-gray-900 w-[180px]">
                    {format(currentMonth, "MMMM yyyy")}
                  </span>
                </div>
                <Button
                  variant="outline"
                  className="h-8 px-4 text-sm"
                  onClick={() => setCurrentMonth(new Date())}
                >
                  Today
                </Button>
              </div>

              {renderCalendar()}
            </div>
          ) : (
            <div className="space-y-12 animate-in fade-in zoom-in-95 duration-300">
              {searchQuery &&
                upcomingEvents.length === 0 &&
                pastEvents.length === 0 && (
                  <div className="text-center py-20 text-gray-500 bg-gray-50 rounded-xl border border-dashed">
                    <Search className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    No events found matching &quot;{searchQuery}&quot;
                  </div>
                )}

              {(upcomingEvents.length > 0 || !searchQuery) && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      Upcoming Events
                    </h2>
                    <p className="text-gray-500 text-sm">
                      Events you&apos;ve saved. Don&apos;t miss them!
                    </p>
                  </div>

                  {upcomingEvents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {upcomingEvents.map((event) => (
                        <EventCard key={event.id} event={event} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-xl border border-dashed text-sm">
                      No upcoming events{" "}
                      {filterOption !== "all"
                        ? `this ${filterOption}`
                        : "found"}
                      .
                    </div>
                  )}
                </div>
              )}

              {(pastEvents.length > 0 || !searchQuery) &&
                filterOption === "all" && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">
                        Past Events
                      </h2>
                      <p className="text-gray-500 text-sm">
                        Events you bookmarked coming up
                      </p>
                    </div>

                    {pastEvents.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {pastEvents.map((event) => (
                          <EventCard
                            key={event.id}
                            event={event}
                            isPast={true}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-xl border border-dashed text-sm">
                        No past events history.
                      </div>
                    )}
                  </div>
                )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// --- Grid Card Component ---
function EventCard({ event, isPast }: { event: EventItem; isPast?: boolean }) {
  const parsedDate = parseISO(event.date);

  // 2. Updated EventCard to use Next.js Link
  return (
    <Link
      href={`/events/${event.slug || event.id}`} // Dynamic slug link
      className="block group rounded-2xl overflow-hidden border border-gray-100 bg-white shadow-none hover:shadow-xs transition-all cursor-pointer"
    >
      <div className="relative h-56 w-full bg-gray-200">
        <Image
          src={event.image}
          alt={event.title}
          fill
          className="object-cover"
        />

        {!isPast && (
          <div className="absolute top-3 right-3 bg-[#EB5757] text-white text-[10px] font-medium px-2 py-1 rounded-full flex items-center gap-1 shadow-sm z-10">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            Upcoming
          </div>
        )}

        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-5">
          <div className="flex items-center justify-between w-full">
            <h3 className="text-white text-2xl font-bold line-clamp-1">
              {event.title}
            </h3>
            <div className="flex items-center gap-2">
              <Badge className="bg-white/90 text-black hover:bg-white border-none h-6 px-3 backdrop-blur-sm">
                {event.category}
              </Badge>
              {event.isVerified && (
                <CheckCircle className="w-5 h-5 text-green-500 fill-white" />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
          {stripHtml(event.description)}
        </p>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span>{event.location}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
            <CalendarIcon className="w-4 h-4 text-gray-400" />
            <span>
              {format(parsedDate, "MMM d")} -{" "}
              {format(parsedDate, "MMM d, yyyy")}
            </span>
          </div>
        </div>

        {isPast && (
          <Button
            className="w-full bg-[#93C01F] hover:bg-[#82ab1b] text-white rounded-lg h-10 mt-2"
            onClick={(e) => {
              // Prevent navigation when clicking the button
              e.preventDefault();
              e.stopPropagation();
              // Add review logic here later
            }}
          >
            Leave review
          </Button>
        )}
      </div>
    </Link>
  );
}
