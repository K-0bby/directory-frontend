import AdminAgentOperations from "@/components/dashboard/admin-agent-operations";
import { Suspense } from "react";

export default function StewardshipOperationsPage() {
  return <Suspense fallback={null}><AdminAgentOperations view="stewardship" /></Suspense>;
}
