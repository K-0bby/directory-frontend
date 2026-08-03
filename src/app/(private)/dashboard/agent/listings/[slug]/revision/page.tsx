import { redirect } from "next/navigation";

interface AgentContentRevisionPageProps {
  params: Promise<{ slug: string }>;
}

export default async function AgentContentRevisionPage({
  params,
}: AgentContentRevisionPageProps) {
  const { slug } = await params;
  redirect(`/dashboard/agent/listings/${encodeURIComponent(slug)}`);
}
