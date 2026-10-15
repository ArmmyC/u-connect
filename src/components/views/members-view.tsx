"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Search, UsersRound } from "lucide-react";
import { useDemo } from "@/components/demo-provider";
import { MemberCard } from "@/components/shared/member-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { parseAgentRequest } from "@/lib/agent";
import { recommendTeam, searchMembers } from "@/lib/matching";
import type { Availability, Member } from "@/lib/types";

type AvailabilityFilter = Availability | "all";
export interface MemberDirectoryFilters {
  query: string;
  role: string;
  skill: string;
  availability: AvailabilityFilter;
}
export interface MemberDirectoryMatch {
  member: Member;
  score: number | null;
  reasons: string[];
}

export function buildMemberDirectoryMatches(
  catalog: Member[],
  actor: Member | null,
  filters: MemberDirectoryFilters,
): MemberDirectoryMatch[] {
  const query = filters.query.trim();
  const filtered = searchMembers({
    ...(query ? { query } : {}),
    ...(filters.role ? { role: filters.role } : {}),
    ...(filters.skill ? { skills: [filters.skill] } : {}),
    ...(filters.availability !== "all" ? { availability: filters.availability } : {}),
  }, catalog);
  const parsedSkills = parseAgentRequest(query).skills;
  const requestedSkills = filters.skill ? [filters.skill] : parsedSkills.length ? parsedSkills : actor?.skills ?? [];
  const ranked = recommendTeam({ skills: requestedSkills, count: catalog.length }, catalog).recommendations;
  const rankingById = new Map(ranked.map((match) => [match.member.id, match]));

  return filtered.map((member) => {
    const match = rankingById.get(member.id);
    return { member, score: match?.score ?? null, reasons: match?.reasons ?? [] };
  }).sort((left, right) => {
    if (left.score === null && right.score !== null) return 1;
    if (left.score !== null && right.score === null) return -1;
    return (right.score ?? 0) - (left.score ?? 0) || left.member.name.localeCompare(right.member.name);
  });
}

function PageLoading() {
  return <div role="status" aria-live="polite" className="grid min-h-60 place-items-center rounded-card border border-line bg-surface text-sm text-muted">Loading the community directory…</div>;
}

export function MembersView({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter();
  const { snapshot, actor, loadStatus, loadError, refresh } = useDemo();
  const [query, setQuery] = useState(initialQuery);
  const [role, setRole] = useState("");
  const [skill, setSkill] = useState("");
  const [availability, setAvailability] = useState<AvailabilityFilter>("all");

  const skills = useMemo(() => [...new Set(snapshot?.members.flatMap((member) => member.skills) ?? [])].sort((a, b) => a.localeCompare(b)), [snapshot]);
  const rows = useMemo(() => snapshot ? buildMemberDirectoryMatches(snapshot.members, actor, { query, role, skill, availability }) : [], [snapshot, actor, query, role, skill, availability]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    router.replace(value ? `/members?query=${encodeURIComponent(value)}` : "/members", { scroll: false });
  }

  function resetFilters() {
    setQuery("");
    setRole("");
    setSkill("");
    setAvailability("all");
    router.replace("/members", { scroll: false });
  }

  return (
    <div className="space-y-5 px-page py-6 md:py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow">Community directory</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-main sm:text-3xl">People to build with</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Explore the skills, working style, and fictional project evidence people have chosen to share.</p>
        </div>
        {snapshot && <Badge variant="mint"><UsersRound aria-hidden="true" className="size-3.5" />{snapshot.members.length} members</Badge>}
      </header>

      {loadError && snapshot && <p role="status" className="rounded-control border border-warning/20 bg-warning-soft px-4 py-3 text-xs leading-5 text-warning">The latest refresh failed. Showing the last loaded directory.</p>}

      {!snapshot ? loadStatus === "error" ? (
        <Card className="p-6 text-center">
          <h2 className="text-sm font-semibold text-main">The directory could not load</h2>
          <p role="alert" className="mt-2 text-xs leading-5 text-muted">{loadError ?? "The local demo service is unavailable."}</p>
          <Button className="mt-4" variant="secondary" onClick={() => void refresh().catch(() => undefined)}><RotateCcw aria-hidden="true" className="size-4" />Try again</Button>
        </Card>
      ) : <PageLoading /> : (
        <div className="grid min-w-0 gap-5 lg:grid-cols-[250px_minmax(0,1fr)] xl:grid-cols-[270px_minmax(0,1fr)]">
          <aside className="min-w-0">
            <Card className="p-4 sm:p-5 lg:sticky lg:top-[88px]">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-main">Search & filters</h2>
                <Button variant="subtle" size="sm" onClick={resetFilters} className="-mr-2"><RotateCcw aria-hidden="true" className="size-3.5" />Reset</Button>
              </div>
              <form role="search" onSubmit={submitSearch} className="mt-4 space-y-3.5">
                <div>
                  <label htmlFor="member-query" className="mb-1.5 block text-xs font-medium text-muted">Search the directory</label>
                  <div className="relative">
                    <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
                    <Input id="member-query" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Skill, role, or name" className="h-10 pl-9 text-xs" />
                  </div>
                  <p className="mt-1.5 text-[10px] leading-4 text-faint">Search terms match public profile text. Submit to save the query in the URL.</p>
                </div>
                <div>
                  <label htmlFor="member-role" className="mb-1.5 block text-xs font-medium text-muted">Role</label>
                  <select id="member-role" value={role} onChange={(event) => setRole(event.target.value)} className="field h-10 px-3 text-xs">
                    <option value="">All roles</option>
                    <option value="engineering">Engineering</option>
                    <option value="design">Design</option>
                    <option value="marketing">Marketing</option>
                    <option value="founding">Founding</option>
                    <option value="recruiting">Recruiting</option>
                    <option value="business">Business</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="member-skill" className="mb-1.5 block text-xs font-medium text-muted">Skill</label>
                  <select id="member-skill" value={skill} onChange={(event) => setSkill(event.target.value)} className="field h-10 px-3 text-xs">
                    <option value="">All skills</option>
                    {skills.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="member-availability" className="mb-1.5 block text-xs font-medium text-muted">Availability</label>
                  <select id="member-availability" value={availability} onChange={(event) => setAvailability(event.target.value as AvailabilityFilter)} className="field h-10 px-3 text-xs">
                    <option value="all">Any availability</option>
                    <option value="available">Available</option>
                    <option value="part-time">Part-time</option>
                    <option value="busy">Busy</option>
                  </select>
                </div>
                <Button type="submit" className="w-full" size="sm"><Search aria-hidden="true" className="size-3.5" />Search members</Button>
              </form>
            </Card>
          </aside>

          <section aria-labelledby="member-results-heading" className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 id="member-results-heading" className="text-sm font-semibold text-main">{rows.length ? "Directory results" : "No matches yet"}</h2>
                <p className="mt-1 text-[11px] text-muted">Scores compare listed skills and availability with {parseAgentRequest(query).skills.length ? "your search phrase" : actor?.name ? `${actor.name.split(" ")[0]}’s profile` : "the selected filters"}.</p>
              </div>
              <Badge variant="default">{rows.length} shown</Badge>
            </div>
            {rows.length ? (
              <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:gap-4">
                {rows.map((row) => <MemberCard key={row.member.id} member={row.member} score={row.score} reasons={row.reasons} />)}
              </div>
            ) : (
              <Card className="flex min-h-64 flex-col items-center justify-center border-dashed p-6 text-center">
                <span aria-hidden="true" className="grid size-11 place-items-center rounded-2xl bg-surface-overlay text-faint"><Search className="size-5" /></span>
                <p className="mt-3 text-sm font-semibold text-main">No one matches those filters</p>
                <p className="mt-1 max-w-sm text-xs leading-5 text-muted">Try another skill or clear a filter to see more of the community.</p>
                <Button variant="secondary" size="sm" className="mt-4" onClick={resetFilters}>Clear filters</Button>
              </Card>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
