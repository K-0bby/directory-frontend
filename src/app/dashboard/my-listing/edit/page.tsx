import { ListingProvider } from "@/context/listing-form-context";
import EditListingContent from "@/components/dashboard/listing/edit-listing-content";
import { Suspense } from "react";

export default function EditListing() {
  return (
    <ListingProvider>
      <Suspense>
        <EditListingContent />
      </Suspense>
    </ListingProvider>
  );
}
