import { Suspense } from "react";
import NavigationTab from "@/components/navigation-tab";
import BusinessesContent from "./businesses-content";

export default async function Businesses() {
  return (
    <div className="overflow-x-hidden pt-20 bg-gray-50">
      <div className="w-full">
        {/* Main Navigation Tabs */}
        <NavigationTab />

        {/* Category Tabs & Content */}
        <Suspense fallback={<div className="h-20" />}>
          <BusinessesContent />
        </Suspense>
      </div>
    </div>
  );
}
