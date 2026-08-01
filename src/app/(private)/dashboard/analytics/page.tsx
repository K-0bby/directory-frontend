"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Bookmark,
  TrendingDown,
  Eye,
  TrendingUp,
  Mail,
  Bell,
  Upload,
  Loader2,
} from "lucide-react";
import StatCard from "@/components/dashboard/stat-cards";
import { Chart } from "@/components/dashboard/bar-chart";
import { useAuth } from "@/context/auth-context";

interface ApiListing {
  slug: string;
  rating: number;
  ratings_count: number;
  views_count: number;
  bookmarks_count: number;
}

export default function Analytics() {
  const { user, loading: authLoading } = useAuth();

  const [totalViews, setTotalViews] = useState<number | null>(null);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [totalBookmarks, setTotalBookmarks] = useState<number | null>(null);
  const [viewsChartData, setViewsChartData] = useState<Record<string, string | number>[] | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://me-fie.co.uk";

      // 1. Fetch listings to get aggregate stats
      const listingsRes = await fetch(`${API_URL}/api/listing/my_listings`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      if (!listingsRes.ok) return;
      const listingsJson = await listingsRes.json();
      const listings: ApiListing[] = listingsJson.data || [];

      // Compute aggregate stats
      const views = listings.reduce((sum, l) => sum + (l.views_count || 0), 0);
      const bookmarks = listings.reduce((sum, l) => sum + (l.bookmarks_count || 0), 0);
      const rated = listings.filter((l) => l.rating > 0);
      const avg =
        rated.length > 0
          ? Math.round(
              (rated.reduce((sum, l) => sum + Number(l.rating), 0) / rated.length) * 10,
            ) / 10
          : 0;

      setTotalViews(views);
      setTotalBookmarks(bookmarks);
      setAvgRating(avg);

      // 2. Fetch detailed views per listing for charts
      const viewsPromises = listings.map((listing) =>
        fetch(`/api/listing/${listing.slug}/views`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        })
          .then((res) => (res.ok ? res.json() : null))
          .catch(() => null),
      );

      const results = await Promise.all(viewsPromises);

      const monthlyMap: Record<string, { views: number; clicks: number }> = {};
      results.forEach((result) => {
        if (!result) return;
        const viewData = Array.isArray(result) ? result : result.data;
        if (!Array.isArray(viewData)) return;

        viewData.forEach((entry: { month?: string; date?: string; views?: number; clicks?: number }) => {
          const key = entry.month || entry.date || "Unknown";
          if (!monthlyMap[key]) monthlyMap[key] = { views: 0, clicks: 0 };
          monthlyMap[key].views += entry.views || 0;
          monthlyMap[key].clicks += entry.clicks || 0;
        });
      });

      const chartData = Object.entries(monthlyMap).map(([month, vals]) => ({
        month,
        views: vals.views,
        clicks: vals.clicks,
      }));

      if (chartData.length > 0) {
        setViewsChartData(chartData);
      }
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) fetchAnalytics();
  }, [user, authLoading, fetchAnalytics]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#93C01F]" />
      </div>
    );
  }

  return (
    <div className="px-1 lg:px-8 py-3 space-y-6">
      {/* Header Intro */}
      <div className="flex flex-col md:flex-row lg:items-center justify-between">
        <div className="mb-4">
          <h4 className="text-2xl font-semibold">Analytics</h4>
          <p className="text-base font-normal">
            Track your business performance and customer engagement.
          </p>
        </div>
        <Button className="bg-[#93C01F] py-3.5 px-4 hover:bg-[#93C01F]/80 cursor-pointer">
          <span>
            <Upload className="w-4 h-4" />
          </span>
          Export
        </Button>
      </div>

      {/* Dashboard Content */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3">
        {/* Stat cards */}
        <StatCard
          title="Total Views"
          icon={Eye}
          statValue={totalViews}
          trend={null}
          trendIconUp={TrendingUp}
          trendIconDown={TrendingDown}
        />

        <StatCard
          title="Inquiries (This month)"
          icon={Mail}
          statValue={null}
          trend={null}
          trendIconUp={TrendingUp}
          trendIconDown={TrendingDown}
        />

        <StatCard
          title="Average Rating"
          icon={Bell}
          statValue={avgRating}
          trend={null}
          trendIconUp={TrendingUp}
          trendIconDown={TrendingDown}
        />

        <StatCard
          title="Bookmarks"
          icon={Bookmark}
          statValue={totalBookmarks}
          trend={null}
          trendIconUp={TrendingUp}
          trendIconDown={TrendingDown}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Line */}
        <div>
          <div className="w-full rounded-2xl border border-[#E3E8EF] bg-white p-6 shadow-xs">
            <h2 className="text-xl font-semibold text-[#0F1A2A] mb-10">
              Traffic Over Time
            </h2>
            <Chart
              type="line"
              data={viewsChartData}
              xAxisKey="month"
              stacked
              dataKeys={[
                { key: "views", label: "Views", color: "#93C01F" },
                { key: "clicks", label: "Clicks", color: "#1F6FEB" },
              ]}
            />
          </div>
        </div>

        {/* bar Chart */}
        <div>
          <div className="w-full rounded-2xl border border-[#E3E8EF] bg-white p-6 shadow-xs">
            <h2 className="text-xl font-semibold text-[#0F1A2A] mb-10">
              Engagement breakdown
            </h2>
            <Chart
              type="bar"
              data={viewsChartData}
              xAxisKey="month"
              stacked
              dataKeys={[
                { key: "views", label: "Views", color: "#93C01F" },
                { key: "clicks", label: "Clicks", color: "#1F6FEB" },
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
