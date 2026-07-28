import AgentListingWorkspace from "@/components/dashboard/listing/agent-listing-workspace";

interface AgentListingWorkspacePageProps {
  params: Promise<{ slug: string }>;
}

export default async function AgentListingWorkspacePage({
  params,
}: AgentListingWorkspacePageProps) {
  const { slug } = await params;
  return <AgentListingWorkspace slug={slug} />;
}
