import AgentContentRevision from "@/components/dashboard/listing/agent-content-revision";

interface AgentContentRevisionPageProps {
  params: Promise<{ slug: string }>;
}

export default async function AgentContentRevisionPage({
  params,
}: AgentContentRevisionPageProps) {
  const { slug } = await params;
  return <AgentContentRevision slug={slug} />;
}
