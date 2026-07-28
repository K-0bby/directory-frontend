import { Suspense } from "react";
import NavigationTab from "@/components/navigation-tab";
import CommunityContent from "./community-content";

export default async function CommunityPage() {
  return (
    <div className="overflow-x-hidden pt-20 bg-gray-50">
      <div className="w-full">
        {/* Main Navigation Tabs */}
        <NavigationTab />

        {/* Category Tabs & Content */}
        <Suspense fallback={<div className="h-20" />}>
          <CommunityContent />
        </Suspense>
      </div>
    </div>
  );
}