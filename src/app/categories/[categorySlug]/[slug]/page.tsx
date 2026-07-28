import type { Metadata } from "next";
import UniversalSlugPage from "@/components/universal-slug-page";
import { buildListingMetadata } from "@/lib/listing-social-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ categorySlug: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return buildListingMetadata(slug);
}

export default function CategorySlugPage({
  params,
}: {
  params: Promise<{ categorySlug: string; slug: string }>;
}) {
  return <UniversalSlugPage params={params} type="business" />;
}
