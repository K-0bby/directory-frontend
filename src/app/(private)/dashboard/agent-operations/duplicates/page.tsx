import AdminAgentOperations from "@/components/dashboard/admin-agent-operations";
import { Suspense } from "react";

export default function DuplicateOperationsPage() {
  return <Suspense fallback={null}><AdminAgentOperations view="duplicates" /></Suspense>;
}
