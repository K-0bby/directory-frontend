import { redirect } from "next/navigation";

type LegacyManualParams = {
  type?: string | string[];
  name?: string | string[];
  slug?: string | string[];
};

const listingTypes = new Set(["business", "event", "community"]);

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function LegacyManualListingPage({
  searchParams,
}: {
  searchParams: Promise<LegacyManualParams>;
}) {
  const legacy = await searchParams;
  const requestedType = first(legacy.type);
  const type = listingTypes.has(requestedType) ? requestedType : "business";
  const params = new URLSearchParams({ type, source: "claim" });
  const name = first(legacy.name).trim().slice(0, 255);
  const slug = first(legacy.slug).trim();

  if (name) params.set("name", name);
  if (/^[a-zA-Z0-9-]+$/.test(slug)) params.set("slug", slug);

  redirect(`/dashboard/my-listing/create?${params.toString()}`);
}
