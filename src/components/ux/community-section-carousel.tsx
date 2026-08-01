// This component is a wrapper for the consolidated CommunityCarousel
// Used in Discover and Events pages with compact layout (no padding, no title)
import type { CommunityCard } from "@/lib/data";
import CommunityCarousel from "../communities/community-carousel";

interface CommunitySectionCarouselProps {
  communities: CommunityCard[];
}

export default function CommunitySectionCarousel({
  communities,
}: CommunitySectionCarouselProps) {
  return (
    <CommunityCarousel
      communities={communities}
      showTitle={false}
      showNavigation={false}
      noPadding={true}
    />
  );
}
