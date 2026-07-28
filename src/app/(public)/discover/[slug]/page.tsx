import type { Metadata } from "next";
import UniversalSlugPage from "@/components/universal-slug-page";
import { buildListingMetadata } from "@/lib/listing-social-metadata";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return buildListingMetadata(slug);
}

export default function DiscoverPage({ params }: { params: Promise<{ slug: string }> }) {
  // Assuming 'Discover' items are treated as businesses or have a similar layout
  return <UniversalSlugPage params={params} type="discover" />;
}