import { MemberProfileView } from "@/components/views/member-profile-view";

type MemberPageProps = {
  params: Promise<{ id: string }>;
};

export default async function MemberPage({ params }: MemberPageProps) {
  const { id } = await params;
  return <MemberProfileView memberId={id} />;
}
