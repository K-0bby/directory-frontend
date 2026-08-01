import { Suspense } from "react";

import AgentMyListings from "@/components/dashboard/listing/agent-my-listings";

export default function AgentMyListingsPage() {
  return (
    <Suspense>
      <AgentMyListings />
    </Suspense>
  );
}
