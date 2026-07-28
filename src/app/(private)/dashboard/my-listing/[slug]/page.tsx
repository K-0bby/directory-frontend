import ListingDetailPage from "@/components/dashboard/listing/listing-detail-page";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default function ListingDetailRoute({ params }: PageProps) {
  return <ListingDetailPage params={params} />;
}
