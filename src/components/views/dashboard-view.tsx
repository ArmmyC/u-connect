"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  Clock3,
  Compass,
  LoaderCircle,
  MessageSquareText,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { matchCandidates } from "@/lib/matching";
import type { Member, Opportunity } from "@/lib/types";
import { useDemo } from "@/components/demo-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

const suggestedPrompts = [
  "Frontend + UI/UX team for my MVP",
  "Find a Python and AI collaborator",
  "Show digital marketing opportunities",
];

interface MatchRow {
  member: Member;
  score: number;
  reasons: string[];
}

interface OpportunityMatch {
  opportunity: Opportunity;
  score: number;
  reasons: string[];
}

interface AgentSummaryRow {
  id: string;
  name: string;
  headline: string;
  score?: number;
  reasons: string[];
}

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function summarizeAgentRow(value: unknown, index: number): AgentSummaryRow | null {
  if (!isRecord(value)) return null;
  const member = isRecord(value.member) ? value.member : value;
  const name = typeof member.name === "string" ? member.name : typeof member.title === "string" ? member.title : null;
  if (!name) return null;
  const reasons = Array.isArray(value.reasons) ? value.reasons.filter((reason): reason is string => typeof reason === "string") : [];
  return {
    id: typeof member.id === "string" ? member.id : `${name}-${index}`,
    name,
    headline: typeof member.headline === "string" ? member.headline : typeof member.role === "string" ? member.role : "Community match",
    score: typeof value.score === "number" ? value.score : undefined,
    reasons,
  };
}

function StatCard({ label, value, detail, icon: Icon, accent = false }: {
  label: string;
  value: number;
  detail: string;
  icon: typeof UsersRound;
  accent?: boolean;
}) {
  return (
    <Card className="metric-card relative overflow-hidden">
      <CardContent className="flex h-full flex-col justify-between gap-4 p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <span className="text-[11px] font-semibold text-muted sm:text-xs">{label}</span>
          <span className="metric-icon shrink-0"><Icon aria-hidden="true" className="size-[17px]" strokeWidth={1.8} /></span>
        </div>
        <div>
          <div className="text-[28px] font-semibold leading-none tracking-tight text-main sm:text-[32px]">{value}</div>
          <p className="mt-2 text-[10px] leading-4 text-faint sm:text-[11px]">{detail}</p>
        </div>
        {accent && <span aria-hidden="true" className="absolute bottom-0 left-0 h-0.5 w-16 bg-accent" />}
      </CardContent>
    </Card>
  );
}

function MemberRecommendation({ match }: { match: MatchRow }) {
  return (
    <Link href={`/members/${match.member.id}`} className="group flex items-start gap-3 rounded-xl border border-transparent p-2.5 transition-colors hover:border-line hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
      <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-[13px] bg-surface-overlay text-xs font-bold text-accent-strong">{initials(match.member.name)}</span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate text-sm font-semibold text-main group-hover:text-accent-strong">{match.member.name}</span>
          <Badge variant="mint" className="px-2 py-0.5 text-[10px]">{match.score} fit</Badge>
        </span>
        <span className="mt-1 block truncate text-xs text-muted">{match.member.headline}</span>
        <span className="mt-2 block line-clamp-2 text-[11px] leading-4 text-faint">{match.reasons[0] ?? "Profile fits the requested collaboration."}</span>
      </span>
      <ChevronRight aria-hidden="true" className="mt-2 size-4 shrink-0 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-main" />
    </Link>
  );
}

function OpportunityRecommendation({ match }: { match: OpportunityMatch }) {
  return (
    <Link href={`/opportunities/${match.opportunity.id}`} className="group rounded-xl border border-line bg-surface-raised p-3.5 transition-colors hover:border-line-strong hover:bg-surface-overlay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
      <span className="flex items-start justify-between gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-info-soft text-info"><BriefcaseBusiness aria-hidden="true" className="size-4" /></span>
        <Badge variant="mint" className="shrink-0">{match.score} fit</Badge>
      </span>
      <span className="mt-3 block text-sm font-semibold leading-5 text-main group-hover:text-accent-strong">{match.opportunity.title}</span>
      <span className="mt-1 block text-xs text-muted">{match.opportunity.role} · {match.opportunity.compensation}</span>
      <span className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-accent-strong">Why it fits <ArrowUpRight aria-hidden="true" className="size-3.5" /></span>
    </Link>
  );
}

function LoadingDashboard() {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-7 md:px-7 md:py-9 xl:px-10" aria-busy="true" aria-label="Loading dashboard">
      <div className="mb-7 h-3 w-36 animate-pulse rounded-full bg-surface-overlay" />
      <div className="mb-3 h-9 w-64 max-w-full animate-pulse rounded-xl bg-surface-overlay" />
      <div className="mb-8 h-4 w-80 max-w-full animate-pulse rounded-full bg-surface-overlay" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((item) => <div key={item} className="h-32 animate-pulse rounded-card border border-line bg-surface" />)}</div>
      <div className="mt-5 grid gap-4 lg:grid-cols-12"><div className="h-72 animate-pulse rounded-card border border-line bg-surface lg:col-span-8" /><div className="h-72 animate-pulse rounded-card border border-line bg-surface lg:col-span-4" /></div>
    </div>
  );
}

export function DashboardView() {
  const {
    snapshot, loadStatus, loadError, refresh, actor, actorMode, actorId,
    agentPending, agentResponse, runAgent, actionFeedback,
  } = useDemo();
  const [prompt, setPrompt] = useState("");
  const [promptError, setPromptError] = useState<string | null>(null);

  const memberMatches = useMemo<MatchRow[]>(() => {
    if (!snapshot) return [];
    const opportunity = snapshot.opportunities.find((item) => item.id === "opp-marketplace") ?? snapshot.opportunities.find((item) => item.status === "open");
    if (!opportunity) return [];
    return matchCandidates(opportunity, snapshot.members)
      .filter((match) => match.member.id !== actorId)
      .slice(0, 3);
  }, [snapshot, actorId]);

  const opportunityMatches = useMemo<OpportunityMatch[]>(() => {
    if (!snapshot || !actor) return [];
    return snapshot.opportunities
      .filter((opportunity) => opportunity.status === "open")
      .map((opportunity) => ({ opportunity, match: matchCandidates(opportunity, [actor])[0] }))
      .filter((entry) => entry.match !== undefined)
      .sort((left, right) => (right.match?.score ?? 0) - (left.match?.score ?? 0))
      .slice(0, 2)
      .map(({ opportunity, match }) => ({ opportunity, score: match?.score ?? 0, reasons: match?.reasons ?? [] }));
  }, [snapshot, actor]);

  const pendingIntroductions = useMemo(() => {
    if (!snapshot) return [];
    const ownedProjects = new Set(snapshot.projects.filter((project) => project.ownerId === actorId).map((project) => project.id));
    return snapshot.introductions.filter((intro) => intro.status === "pending" && (
      actorMode === "candidate" ? intro.memberId === actorId : ownedProjects.has(intro.projectId)
    ));
  }, [snapshot, actorId, actorMode]);

  const activity = useMemo(() => {
    if (!snapshot) return [];
    return [
      ...snapshot.introductions.map((intro) => {
        const project = snapshot.projects.find((item) => item.id === intro.projectId);
        const member = snapshot.members.find((item) => item.id === intro.memberId);
        return {
          id: intro.id,
          title: project?.title ?? "Untitled project",
          detail: `${member?.name ?? "A member"} · introduction ${intro.status}`,
          date: intro.createdAt,
          status: intro.status,
        };
      }),
      ...snapshot.interests.map((interest) => {
        const opportunity = snapshot.opportunities.find((item) => item.id === interest.opportunityId);
        const member = snapshot.members.find((item) => item.id === interest.memberId);
        return {
          id: `${interest.opportunityId}-${interest.memberId}`,
          title: opportunity?.title ?? "Opportunity",
          detail: `${member?.name ?? "A member"} expressed interest`,
          date: interest.createdAt,
          status: "interest",
        };
      }),
    ].sort((left, right) => right.date.localeCompare(left.date)).slice(0, 4);
  }, [snapshot]);

  if (!snapshot && loadStatus === "loading") return <LoadingDashboard />;

  if (!snapshot) {
    return (
      <section className="mx-auto flex min-h-[68vh] w-full max-w-3xl flex-col items-center justify-center px-5 py-12 text-center">
        <span className="metric-icon mb-5 size-12"><Compass aria-hidden="true" className="size-5" /></span>
        <p className="eyebrow">Workspace unavailable</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-main">We couldn’t load your demo workspace.</h1>
        <p role="alert" className="mt-3 max-w-lg text-sm leading-6 text-muted">{loadError ?? "The local state service did not respond."}</p>
        <Button className="mt-6" onClick={() => void refresh().catch(() => undefined)}><RefreshCw aria-hidden="true" className="size-4" />Try again</Button>
      </section>
    );
  }

  const availableCount = snapshot.members.filter((member) => member.availability === "available").length;
  const openOpportunityCount = snapshot.opportunities.filter((opportunity) => opportunity.status === "open").length;
  const activeProjectCount = snapshot.projects.filter((project) => project.ownerId === actorId).length;
  const agentRows = agentResponse?.results.map(summarizeAgentRow).filter((row): row is AgentSummaryRow => row !== null) ?? [];

  async function handlePromptSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const brief = prompt.trim();
    if (!brief) {
      setPromptError("Add a short brief so U-Connect can find a useful match.");
      return;
    }
    setPromptError(null);
    try {
      await runAgent(brief);
    } catch {
      // The provider keeps a visible error state beside the prompt.
    }
  }

  function choosePrompt(value: string) {
    setPrompt(value);
    setPromptError(null);
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-6 md:px-7 md:py-8 xl:px-10 xl:py-9">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Your community, in motion</p>
          <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.04em] text-main sm:text-[34px]">
            Welcome back{actor ? `, ${actor.name.split(" ")[0]}` : ""}.
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted">Find people who move your next idea forward, or discover a project that fits your strengths.</p>
        </div>
        <Button asChild variant="secondary" className="self-start sm:self-auto">
          <Link href="/team-builder"><Plus aria-hidden="true" className="size-4" />Build a team</Link>
        </Button>
      </div>

      {loadError && loadStatus === "success" && (
        <div role="status" className="mb-4 flex items-center justify-between gap-3 rounded-control border border-warning/20 bg-warning-soft px-4 py-3 text-xs text-warning">
          <span>{loadError} The view may be out of date.</span>
          <Button variant="subtle" size="sm" onClick={() => void refresh({ quiet: true }).catch(() => undefined)}>Retry</Button>
        </div>
      )}

      <section aria-label="Workspace overview" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Community members" value={snapshot.members.length} detail={`${availableCount} available to collaborate`} icon={UsersRound} />
        <StatCard label="Open opportunities" value={openOpportunityCount} detail="Projects, roles and freelance work" icon={BriefcaseBusiness} accent />
        <StatCard label="Your projects" value={activeProjectCount} detail={actorMode === "owner" ? "Owned by this demo actor" : "Created in this workspace"} icon={Sparkles} />
        <StatCard label="Pending intros" value={pendingIntroductions.length} detail={actorMode === "candidate" ? "Requests waiting on you" : "Requests awaiting a reply"} icon={Clock3} />
      </section>

      <div className="mt-4 grid gap-4 xl:grid-cols-12">
        <Card className="overflow-hidden xl:col-span-8">
          <CardHeader className="flex-row items-start justify-between gap-4 pb-3 md:pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-xl bg-accent-soft text-accent-strong"><Sparkles aria-hidden="true" className="size-4" /></span>
                <span className="eyebrow">U-Connect assistant</span>
              </div>
              <CardTitle className="mt-3 text-lg">What are you looking to build?</CardTitle>
              <CardDescription className="mt-1">Describe the skills or people you need. Matches come from the demo community.</CardDescription>
            </div>
            <Badge variant="success" className="hidden shrink-0 sm:inline-flex"><span aria-hidden="true" className="size-1.5 rounded-full bg-success" />Ready</Badge>
          </CardHeader>
          <CardContent className="pt-3 md:pt-4">
            <form onSubmit={handlePromptSubmit}>
              <label className="sr-only" htmlFor="dashboard-agent-prompt">Describe the team or opportunity you need</label>
              <Textarea
                id="dashboard-agent-prompt"
                rows={3}
                value={prompt}
                onChange={(event) => { setPrompt(event.target.value); if (promptError) setPromptError(null); }}
                placeholder="e.g. I need a frontend developer and a UI/UX designer to launch my startup MVP…"
                aria-invalid={Boolean(promptError)}
                aria-describedby={promptError ? "dashboard-prompt-error" : "dashboard-prompt-hint"}
                className="min-h-[92px] border-line bg-bg/60 px-4 text-sm"
              />
              {promptError ? <p id="dashboard-prompt-error" role="alert" className="mt-2 text-xs text-danger">{promptError}</p> : <p id="dashboard-prompt-hint" className="mt-2 text-[11px] text-faint">No prompt leaves this local demo. The agent shows its tool calls and matching reasons.</p>}
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2" aria-label="Prompt suggestions">
                  {suggestedPrompts.map((suggestion) => (
                    <button key={suggestion} type="button" onClick={() => choosePrompt(suggestion)} className="rounded-pill border border-line px-2.5 py-1.5 text-[10px] font-medium text-muted transition-colors hover:border-line-strong hover:bg-surface-raised hover:text-main focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:text-[11px]">
                      {suggestion}
                    </button>
                  ))}
                </div>
                <Button type="submit" disabled={agentPending} className="shrink-0 self-start sm:self-auto">
                  {agentPending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Send aria-hidden="true" className="size-4" />}
                  {agentPending ? "Finding matches…" : "Find matches"}
                </Button>
              </div>
            </form>

            {actionFeedback && (actionFeedback.status === "error" || agentResponse) && (
              <div className="mt-5 border-t border-line pt-4" aria-live="polite">
                {actionFeedback.status === "error" ? (
                  <p role="alert" className="rounded-control border border-danger/20 bg-danger-soft px-3.5 py-3 text-xs leading-5 text-danger">{actionFeedback.message}</p>
                ) : agentResponse && (
                  <div className="rounded-2xl border border-accent/15 bg-accent-soft/50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-xs font-semibold text-accent-strong"><Check aria-hidden="true" className="size-4" />Brief interpreted</div>
                        <p className="mt-1.5 text-sm font-medium text-main">{agentResponse.parsed.intent}</p>
                        <p className="mt-1 text-[11px] leading-5 text-muted">{agentResponse.parsed.rationale}</p>
                      </div>
                      <Badge variant="mint">{agentResponse.toolCalls.length} tool call{agentResponse.toolCalls.length === 1 ? "" : "s"}</Badge>
                    </div>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {agentRows.slice(0, 4).map((row) => (
                        <div key={row.id} className="flex min-w-0 items-center gap-2.5 rounded-xl border border-line/70 bg-surface/70 px-3 py-2.5">
                          <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-overlay text-[10px] font-bold text-accent-strong">{initials(row.name)}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-semibold text-main">{row.name}</span>
                            <span className="block truncate text-[10px] text-muted">{row.headline}</span>
                          </span>
                          {row.score !== undefined && <span className="shrink-0 text-[10px] font-semibold text-accent-strong">{row.score}</span>}
                        </div>
                      ))}
                    </div>
                    {agentResponse.results.length === 0 && <p className="mt-3 text-xs text-muted">No exact matches yet. Try a different skill or role.</p>}
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line/70 pt-3">
                      <span className="flex items-center gap-1.5 text-[10px] text-muted"><MessageSquareText aria-hidden="true" className="size-3.5" />Tool: <code className="font-mono text-accent-strong">{agentResponse.toolCalls[0]?.tool ?? "none"}</code></span>
                      <Button asChild variant="subtle" size="sm" className="-mr-2"><Link href="/agent">Open agent workspace<ArrowRight aria-hidden="true" className="size-3.5" /></Link></Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-4">
          <CardHeader className="flex-row items-start justify-between">
            <div>
              <CardTitle>Activity</CardTitle>
              <CardDescription className="mt-1">What’s moving in your workspace</CardDescription>
            </div>
            <span className="grid size-8 place-items-center rounded-xl bg-surface-overlay text-muted"><Clock3 aria-hidden="true" className="size-4" /></span>
          </CardHeader>
          <CardContent className="pt-4">
            {activity.length ? (
              <ol className="space-y-4">
                {activity.map((entry) => (
                  <li key={entry.id} className="flex gap-3">
                    <span aria-hidden="true" className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full ${entry.status === "accepted" || entry.status === "confirmed" || entry.status === "shared" ? "bg-success-soft text-success" : "bg-info-soft text-info"}`}>
                      {entry.status === "accepted" || entry.status === "confirmed" || entry.status === "shared" ? <Check className="size-3.5" /> : <MessageSquareText className="size-3.5" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-main">{entry.title}</p>
                      <p className="mt-1 text-[11px] leading-4 text-muted">{entry.detail}</p>
                    </div>
                    <time className="shrink-0 pt-0.5 text-[10px] text-faint" dateTime={entry.date}>{new Date(entry.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</time>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="flex min-h-36 flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong px-5 py-6 text-center">
                <span className="grid size-10 place-items-center rounded-full bg-surface-overlay text-faint"><MessageSquareText aria-hidden="true" className="size-[18px]" /></span>
                <p className="mt-3 text-xs font-semibold text-main">A fresh start</p>
                <p className="mt-1 max-w-[230px] text-[11px] leading-5 text-muted">Your project, introductions and interests will show up here.</p>
              </div>
            )}

            <div className="mt-5 border-t border-line pt-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold text-main">Pending introductions</p>
                <Badge variant={pendingIntroductions.length ? "warning" : "default"}>{pendingIntroductions.length}</Badge>
              </div>
              {pendingIntroductions.length ? (
                <ul className="space-y-2">
                  {pendingIntroductions.slice(0, 2).map((intro) => {
                    const project = snapshot.projects.find((item) => item.id === intro.projectId);
                    const candidate = snapshot.members.find((item) => item.id === intro.memberId);
                    return <li key={intro.id} className="flex items-center gap-2 text-[11px] text-muted"><span aria-hidden="true" className="size-1.5 rounded-full bg-warning" /><span className="min-w-0 flex-1 truncate">{actorMode === "candidate" ? project?.title : candidate?.name}</span><span className="shrink-0 text-warning">Awaiting reply</span></li>;
                  })}
                </ul>
              ) : (
                <p className="text-[11px] leading-5 text-faint">No requests need attention right now.</p>
              )}
              <Button asChild variant="subtle" size="sm" className="mt-3 -ml-2"><Link href="/network">Open network<ArrowRight aria-hidden="true" className="size-3.5" /></Link></Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-7">
          <CardHeader className="flex-row items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2"><UsersRound aria-hidden="true" className="size-4 text-accent" /><span className="eyebrow">Made for collaboration</span></div>
              <CardTitle className="mt-2">Members to know</CardTitle>
              <CardDescription className="mt-1">People who fit the community marketplace brief.</CardDescription>
            </div>
            <Button asChild variant="subtle" size="sm" className="-mr-2 shrink-0"><Link href="/members">Browse all<ArrowRight aria-hidden="true" className="size-3.5" /></Link></Button>
          </CardHeader>
          <CardContent className="space-y-1 pt-3">
            {memberMatches.length ? memberMatches.map((match) => <MemberRecommendation key={match.member.id} match={match} />) : (
              <p className="rounded-xl bg-surface-raised px-4 py-5 text-sm text-muted">No members match this brief yet. Browse the full directory to explore more skills.</p>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-5">
          <CardHeader className="flex-row items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2"><BriefcaseBusiness aria-hidden="true" className="size-4 text-info" /><span className="eyebrow">A good next step</span></div>
              <CardTitle className="mt-2">Opportunities for you</CardTitle>
              <CardDescription className="mt-1">Open roles that fit {actor?.name.split(" ")[0] ?? "your"}’s listed skills.</CardDescription>
            </div>
            <Button asChild variant="subtle" size="sm" className="-mr-2 shrink-0"><Link href="/opportunities">View all<ArrowRight aria-hidden="true" className="size-3.5" /></Link></Button>
          </CardHeader>
          <CardContent className="grid gap-2.5 pt-3">
            {opportunityMatches.length ? opportunityMatches.map((match) => <OpportunityRecommendation key={match.opportunity.id} match={match} />) : (
              <p className="rounded-xl bg-surface-raised px-4 py-5 text-sm text-muted">No exact opportunity matches yet. Add more skills to your profile or explore every open listing.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <section className="mt-4 rounded-card border border-line bg-surface-raised/65 p-4 sm:flex sm:items-center sm:justify-between sm:gap-5 sm:px-5">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-strong"><Compass aria-hidden="true" className="size-[17px]" /></span>
          <div>
            <p className="text-xs font-semibold text-main">A private, local-first demo</p>
            <p className="mt-1 text-[11px] leading-5 text-muted">Contact details stay hidden until a candidate accepts and the project owner explicitly shares them.</p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm" className="mt-3 shrink-0 sm:mt-0"><Link href="/playground">Explore the tools<ChevronRight aria-hidden="true" className="size-3.5" /></Link></Button>
      </section>
    </div>
  );
}
