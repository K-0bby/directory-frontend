import AdminAgentOperations from "@/components/dashboard/admin-agent-operations";
import { Suspense } from "react";

export default function RevisionOperationsPage() {
  return <Suspense fallback={null}><AdminAgentOperations view="revisions" /></Suspense>;
}
