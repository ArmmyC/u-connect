import { OpportunityDetailView } from "@/components/views/opportunity-detail-view";

type OpportunityPageProps = {
  params: Promise<{ id: string }>;
};

export default async function OpportunityPage({ params }: OpportunityPageProps) {
  const { id } = await params;
  return <OpportunityDetailView opportunityId={id} />;
}
