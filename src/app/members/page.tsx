import { MembersView } from "@/components/views/members-view";

type MembersPageProps = {
  searchParams: Promise<{ query?: string | string[] }>;
};

export default async function MembersPage({ searchParams }: MembersPageProps) {
  const params = await searchParams;
  const query = typeof params.query === "string" ? params.query : "";
  return <MembersView key={query} initialQuery={query} />;
}
