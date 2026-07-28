import type { Metadata } from "next";
import UniversalSlugPage from "@/components/universal-slug-page"; // Adjust path
import { buildListingMetadata } from "@/lib/listing-social-metadata";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return buildListingMetadata(slug);
}

export default function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  return <UniversalSlugPage params={params} type="event" />;
}