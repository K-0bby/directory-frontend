"use client";

import { useRouter } from "next/navigation";
import CommunityCarousel from "@/components/communities/community-carousel";
import CommunityCard from "@/components/communities/community-card";
import { Button } from "@/components/ui/button";
import { DirectoryPageShell } from "@/components/directory/directory-page-shell";
import { useDirectoryListings } from "@/lib/directory/use-directory-listings";
import { mapCommunity, ProcessedCommunity } from "./map-community";

export default function CommunityContent() {
  const router = useRouter();

  const { items, isLoading, detectedCountry } =
    useDirectoryListings<ProcessedCommunity>({
      endpoint: "/api/communities",
      mapItem: mapCommunity,
      forwardParams: ["category_id", "category_slug", "country"],
    });

  const handleCtaClick = () => {
    router.push("/claim");
  };

  return (
    <DirectoryPageShell<ProcessedCommunity>
      mainCategorySlug="communities"
      context="communities"
      items={items}
      isLoading={isLoading}
      detectedCountry={detectedCountry}
      mapItem={mapCommunity}
      groupBy={(c) => c.tag}
      matchesCategory={(c, slug) => c.categorySlug === slug}
      heroSize={9}
      visibleGroups={0}
      emptyMessage="No communities found in this category."
      gridTitle="All communities"
      renderHero={(heroItems) => (
        <CommunityCarousel communities={heroItems} title="Community Impact" />
      )}
      renderGroup={(name, groupItems) => (
        <CommunityCarousel communities={groupItems} title={name} />
      )}
      renderFiltered={(filtered) => (
        <CommunityCarousel
          communities={filtered}
          title={`${filtered[0]?.category ?? "Filtered"} Communities`}
        />
      )}
      renderCard={(c) => (
        <CommunityCard
          community={{
            id: c.id,
            name: c.name,
            slug: c.slug,
            tag: c.tag,
            image: c.image,
            imageUrl: c.imageUrl,
            description: c.description,
            location: c.location,
            verified: c.verified,
            type: "community",
          }}
        />
      )}
      renderFooterCta={() => (
        <div className="py-12 px-4 lg:px-16">
          <div className="relative flex flex-col justify-center items-center text-center bg-[#152B40] text-white rounded-3xl h-[350px] overflow-hidden">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Ready to Grow Your Business?
            </h2>
            <Button
              onClick={handleCtaClick}
              className="bg-[#93C01F] hover:bg-[#7ea919]"
            >
              List your business today
            </Button>
          </div>
        </div>
      )}
    />
  );
}
