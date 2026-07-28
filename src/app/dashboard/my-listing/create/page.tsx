import { ListingProvider } from "@/context/listing-form-context";
import ListingContent from "@/components/dashboard/listing/listing-content";
import { Suspense } from "react";

export default function NewListing() {
  return (
    <ListingProvider>
      <Suspense>
        <ListingContent />
      </Suspense>
    </ListingProvider>
  );
}
