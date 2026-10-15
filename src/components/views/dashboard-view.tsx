"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Compass,
  LoaderCircle,
  MessageSquareText,
  RefreshCw,
  Send,
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
  score?: number;
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

function MemberRecommendation({ match }: { match: MatchRow }) {
  return (
    <li>
      <Link href={`/members/${match.member.id}`} className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
        <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-overlay text-xs font-bold text-accent-strong">{initials(match.member.name)}</span>
        <span className="min-w-0">
          <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="truncate text-sm font-semibold text-main group-hover:text-accent-strong">{match.member.name}</span>
            {match.score !== undefined && <span className="text-xs font-semibold tabular-nums text-accent-strong">{match.score} fit</span>}
          </span>
          <span className="mt-1 block text-sm text-muted">{match.member.headline}</span>
          {match.reasons.length > 0 && <span className="mt-2 block line-clamp-2 text-[13px] leading-5 text-muted">{match.reasons.slice(0, 2).join(" ")}</span>}
        </span>
        <ArrowUpRight aria-hidden="true" className="mt-1 size-4 shrink-0 text-faint transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-main" />
      </Link>
    </li>
  );
}

function OpportunityRecommendation({ match }: { match: OpportunityMatch }) {
  return (
    <li>
      <Link href={`/opportunities/${match.opportunity.id}`} className="group grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
        <span className="min-w-0">
          <span className="block text-sm font-semibold leading-5 text-main group-hover:text-accent-strong">{match.opportunity.title}</span>
          <span className="mt-1 block text-sm text-muted">{match.opportunity.role} · {match.opportunity.compensation}</span>
          {match.reasons[0] && <span className="mt-2 block line-clamp-2 text-[13px] leading-5 text-muted">{match.reasons[0]}</span>}
        </span>
        <span className="flex flex-col items-end justify-between gap-3 text-accent-strong">
          <span className="whitespace-nowrap text-xs font-semibold tabular-nums">{match.score} fit</span>
          <ArrowUpRight aria-hidden="true" className="size-4 text-faint transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-main" />
        </span>
      </Link>
    </li>
  );
}

function LoadingDashboard() {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-7 md:px-7 md:py-9 xl:px-10" aria-busy="true" aria-label="Loading dashboard">
      <p className="sr-only" role="status">Loading your demo workspace…</p>
      <div className="mb-3 h-10 w-80 max-w-full animate-pulse rounded-xl bg-surface-overlay" />
      <div className="mb-8 h-4 w-[min(32rem,100%)] animate-pulse rounded-full bg-surface-overlay" />
      <div className="h-72 animate-pulse rounded-2xl border border-line bg-surface" />
      <div className="mt-8 border-y border-line py-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{[0, 1, 2, 3].map((item) => <div key={item} className="h-5 animate-pulse rounded-full bg-surface-overlay" />)}</div>
      </div>
    </div>
  );
}

export function DashboardView() {
  const {
    snapshot, loadStatus, loadError, refresh, actor, actorMode, actorId,
    agentPending, agentResponse, agentError, runAgent,
  } = useDemo();
  const [prompt, setPrompt] = useState("");
  const [promptError, setPromptError] = useState<string | null>(null);
  const agentRows = agentResponse?.results.map(summarizeAgentRow).filter((row): row is AgentSummaryRow => row !== null) ?? [];
  const usesBriefMemberMatches = agentResponse?.parsed.mode === "members" || agentResponse?.parsed.mode === "team";
  const fallbackOpportunity = snapshot?.opportunities.find((item) => item.id === "opp-marketplace") ?? snapshot?.opportunities.find((item) => item.status === "open");
  const agentStatus = agentPending
    ? { label: "Finding matches…", variant: "info" as const }
    : agentError
      ? { label: "Needs attention", variant: "danger" as const }
      : agentResponse
        ? agentResponse.results.length
          ? { label: "Results ready", variant: "success" as const }
          : { label: "No exact matches", variant: "warning" as const }
        : { label: "Ready", variant: "success" as const };

  const memberMatches = useMemo<MatchRow[]>(() => {
    if (!snapshot) return [];
    if (agentResponse && agentResponse.parsed.mode !== "opportunities") {
      return agentResponse.results
        .map(summarizeAgentRow)
        .filter((row): row is AgentSummaryRow => row !== null)
        .flatMap((row) => {
          const member = snapshot.members.find((item) => item.id === row.id);
          return member && member.id !== actorId ? [{ member, score: row.score, reasons: row.reasons }] : [];
        })
        .slice(0, 3);
    }
    if (!fallbackOpportunity) return [];
    return matchCandidates(fallbackOpportunity, snapshot.members)
      .filter((match) => match.member.id !== actorId)
      .slice(0, 3);
  }, [snapshot, actorId, agentResponse, fallbackOpportunity]);

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
        <h1 className="text-2xl font-semibold tracking-tight text-main">We couldn’t load your demo workspace.</h1>
        <p role="alert" className="mt-3 max-w-lg text-sm leading-6 text-muted">{loadError ?? "The local state service did not respond."}</p>
        <Button className="mt-6" onClick={() => void refresh().catch(() => undefined)}><RefreshCw aria-hidden="true" className="size-4" />Try again</Button>
      </section>
    );
  }

  const availableCount = snapshot.members.filter((member) => member.availability === "available").length;
  const openOpportunityCount = snapshot.opportunities.filter((opportunity) => opportunity.status === "open").length;
  const activeProjectCount = snapshot.projects.filter((project) => project.ownerId === actorId).length;
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
      <header className="mb-7 max-w-3xl">
        <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.03em] text-main sm:text-[38px]">
          {actorMode === "owner" ? "Turn an idea into a team." : "Find work that fits your strengths."}
        </h1>
        <p className="mt-3 max-w-[62ch] text-[15px] leading-6 text-muted">
          {actorMode === "owner"
            ? "Describe what you need. U-Connect searches the community for people and opportunities that can move it forward."
            : "Describe what you want to do next. U-Connect searches open roles and projects across your community."}
        </p>
      </header>

      {loadError && loadStatus === "success" && (
        <div role="status" className="mb-4 flex items-center justify-between gap-3 rounded-control border border-warning/20 bg-warning-soft px-4 py-3 text-xs text-warning">
          <span>{loadError} The view may be out of date.</span>
          <Button variant="subtle" size="sm" onClick={() => void refresh({ quiet: true }).catch(() => undefined)}>Retry</Button>
        </div>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-12">
        <Card className="overflow-hidden rounded-2xl shadow-none xl:col-span-8">
          <CardHeader className="flex-row items-start justify-between gap-4 pb-3 md:pb-4">
            <div className="min-w-0">
              <CardTitle className="text-xl leading-7 sm:text-2xl">
                {actorMode === "owner" ? "Describe the team you need." : "Describe the work you want."}
              </CardTitle>
              <CardDescription className="mt-2 max-w-[58ch]">Mention skills, roles, or the outcome you have in mind. The agent will show how each result fits.</CardDescription>
            </div>
            <Badge variant={agentStatus.variant} className="shrink-0" role="status" aria-live="polite" aria-atomic="true">
              {agentPending && <LoaderCircle aria-hidden="true" className="size-3 animate-spin" />}
              {!agentPending && <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />}
              {agentStatus.label}
            </Badge>
          </CardHeader>
          <CardContent className="pt-3 md:pt-4">
            <form onSubmit={handlePromptSubmit}>
              <label className="mb-2 block text-sm font-semibold text-main" htmlFor="dashboard-agent-prompt">
                Your brief
              </label>
              <Textarea
                id="dashboard-agent-prompt"
                rows={3}
                value={prompt}
                onChange={(event) => { setPrompt(event.target.value); if (promptError) setPromptError(null); }}
                placeholder="e.g. I need a frontend developer and a UI/UX designer to launch my startup MVP…"
                aria-invalid={Boolean(promptError)}
                aria-describedby={promptError ? "dashboard-prompt-error" : "dashboard-prompt-hint"}
                className="min-h-[108px] border-line-strong bg-bg/60 px-4 text-sm leading-6"
              />
              {promptError ? <p id="dashboard-prompt-error" role="alert" className="mt-2 text-sm text-danger">{promptError}</p> : <p id="dashboard-prompt-hint" className="mt-2 text-[13px] leading-5 text-muted">Your brief stays in this local demo. Results show the tool calls and why each match fits.</p>}
              <div className="mt-5 flex flex-col gap-4 border-t border-line pt-4 sm:flex-row sm:items-end sm:justify-between">
                <fieldset className="min-w-0 flex-1" aria-label="Prompt suggestions">
                  <legend className="text-sm font-medium text-main">Try a sample</legend>
                  <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
                    {suggestedPrompts.map((suggestion) => (
                      <button key={suggestion} type="button" onClick={() => choosePrompt(suggestion)} className="text-left text-sm leading-5 text-muted underline decoration-line underline-offset-4 transition-colors hover:text-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <Button type="submit" disabled={agentPending} className="shrink-0 self-start sm:self-auto">
                  {agentPending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Send aria-hidden="true" className="size-4" />}
                  {agentPending ? "Finding matches…" : "Find matches"}
                </Button>
              </div>
            </form>

            <div className="mt-4">
              <Link href="/team-builder" className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-strong underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                Build a team step by step<ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </div>

            {(agentError || agentResponse) && (
              <div className="mt-5 border-t border-line pt-4" aria-live="polite">
                {agentError ? (
                  <p role="alert" className="rounded-control border border-danger/20 bg-danger-soft px-3.5 py-3 text-sm leading-5 text-danger">{agentError}</p>
                ) : agentResponse && (
                  <div>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-sm font-semibold text-accent-strong"><Check aria-hidden="true" className="size-4" />Brief interpreted</div>
                        <p className="mt-1.5 text-sm font-medium text-main">{agentResponse.parsed.intent}</p>
                        <p className="mt-1 text-sm leading-5 text-muted">{agentResponse.parsed.rationale}</p>
                      </div>
                      <Badge variant="accent">{agentResponse.toolCalls.length} tool call{agentResponse.toolCalls.length === 1 ? "" : "s"}</Badge>
                    </div>
                    <ul className="mt-4 divide-y divide-line border-y border-line">
                      {agentRows.slice(0, 4).map((row) => (
                        <li key={row.id} className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 py-3">
                          <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-overlay text-xs font-bold text-accent-strong">{initials(row.name)}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-main">{row.name}</span>
                            <span className="block text-sm text-muted">{row.headline}</span>
                            {row.reasons.length > 0 && <span className="mt-2 block space-y-1">{row.reasons.slice(0, 2).map((reason) => <span key={reason} className="block text-[13px] leading-5 text-muted">{reason}</span>)}</span>}
                          </span>
                          {row.score !== undefined && <span className="shrink-0 text-xs font-semibold tabular-nums text-accent-strong">{row.score} fit</span>}
                        </li>
                      ))}
                    </ul>
                    {agentResponse.results.length === 0 && <p className="mt-3 text-sm text-muted">No exact matches yet. Try a different skill or role.</p>}
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
                      <span className="flex items-center gap-1.5 text-sm text-muted"><MessageSquareText aria-hidden="true" className="size-4" />Tool: <code className="font-mono text-accent-strong">{agentResponse.toolCalls[0]?.tool ?? "none"}</code></span>
                      <Button asChild variant="subtle" size="sm" className="-mr-2"><Link href="/agent">Open agent workspace<ArrowRight aria-hidden="true" className="size-3.5" /></Link></Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <aside className="min-w-0 pt-1 xl:col-span-4 xl:border-l xl:border-line xl:pl-6">
          <section aria-labelledby="dashboard-activity-heading">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="dashboard-activity-heading" className="text-lg font-semibold tracking-tight text-main">Activity</h2>
              <Link href="/network" className="inline-flex items-center gap-1 text-sm font-medium text-accent-strong underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                Network<ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </div>
            <p className="mt-1 text-sm leading-5 text-muted">Projects and introductions in this workspace.</p>
            {activity.length ? (
              <ol className="mt-4 divide-y divide-line border-y border-line">
                {activity.map((entry) => (
                  <li key={entry.id} className="flex min-w-0 items-start justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-main">{entry.title}</p>
                      <p className="mt-1 text-[13px] leading-5 text-muted">{entry.detail}</p>
                    </div>
                    <time className="shrink-0 pt-0.5 text-xs tabular-nums text-muted" dateTime={entry.date}>{new Date(entry.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</time>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-4 border-y border-line py-4 text-sm leading-6 text-muted"><span className="font-semibold text-main">No activity yet.</span> Projects, introductions, and interests will appear here.</p>
            )}

            <div className="mt-5 border-t border-line pt-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-main">Pending introductions</h3>
                <span className="text-sm font-semibold tabular-nums text-muted">{pendingIntroductions.length}</span>
              </div>
              {pendingIntroductions.length ? (
                <ul className="divide-y divide-line">
                  {pendingIntroductions.slice(0, 2).map((intro) => {
                    const project = snapshot.projects.find((item) => item.id === intro.projectId);
                    const candidate = snapshot.members.find((item) => item.id === intro.memberId);
                    return <li key={intro.id} className="flex items-start justify-between gap-3 py-3 text-sm text-muted"><span className="min-w-0 truncate">{actorMode === "candidate" ? project?.title : candidate?.name}</span><span className="shrink-0 text-warning">Awaiting reply</span></li>;
                  })}
                </ul>
              ) : (
                <p className="text-sm leading-5 text-muted">No requests need attention right now.</p>
              )}
            </div>
          </section>
        </aside>
      </div>

      <section aria-label="Workspace overview" className="mt-8 border-y border-line py-4">
        <h2 className="sr-only">Workspace overview</h2>
        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
          <li><span className="font-semibold tabular-nums text-main">{snapshot.members.length}</span> members <span className="text-faint">· {availableCount} available</span></li>
          <li><span className="font-semibold tabular-nums text-main">{openOpportunityCount}</span> open opportunities</li>
          <li><span className="font-semibold tabular-nums text-main">{activeProjectCount}</span> your projects</li>
          <li><span className="font-semibold tabular-nums text-main">{pendingIntroductions.length}</span> pending introductions</li>
        </ul>
      </section>

      <div className="mt-9 grid items-start gap-10 xl:grid-cols-2 xl:gap-12">
        <section className="min-w-0" aria-labelledby="dashboard-members-heading">
          <header className="flex items-start justify-between gap-4">
            <div>
              <h2 id="dashboard-members-heading" className="text-xl font-semibold tracking-tight text-main">Members to meet</h2>
              <p className="mt-1 max-w-[62ch] text-sm leading-5 text-muted">
                {usesBriefMemberMatches
                  ? "Matched to your latest member or team brief."
                  : fallbackOpportunity
                    ? agentResponse
                      ? `People with relevant skills for ${fallbackOpportunity.title}.`
                      : `Strong candidates for ${fallbackOpportunity.title}. Submit a brief above for team matches.`
                    : "Run a member or team brief to see relevant people here."}
              </p>
            </div>
            <Button asChild variant="subtle" size="sm" className="-mr-3 shrink-0"><Link href="/members">Browse all<ArrowRight aria-hidden="true" className="size-4" /></Link></Button>
          </header>
          {memberMatches.length ? (
            <ul className="mt-4 divide-y divide-line border-y border-line">
              {memberMatches.map((match) => <MemberRecommendation key={match.member.id} match={match} />)}
            </ul>
          ) : (
              <p className="mt-4 border-y border-line py-4 text-sm leading-6 text-muted">{usesBriefMemberMatches ? "No members matched your latest brief. Try a different skill or role." : "No community recommendations are available right now. Run a member or team brief above."}</p>
            )}
        </section>

        <section className="min-w-0" aria-labelledby="dashboard-opportunities-heading">
          <header className="flex items-start justify-between gap-4">
            <div>
              <h2 id="dashboard-opportunities-heading" className="text-xl font-semibold tracking-tight text-main">Opportunities to explore</h2>
              <p className="mt-1 max-w-[62ch] text-sm leading-5 text-muted">Open roles related to {actor?.name.split(" ")[0] ?? "your"}’s listed skills.</p>
            </div>
            <Button asChild variant="subtle" size="sm" className="-mr-3 shrink-0"><Link href="/opportunities">View all<ArrowRight aria-hidden="true" className="size-4" /></Link></Button>
          </header>
          {opportunityMatches.length ? (
            <ul className="mt-4 divide-y divide-line border-y border-line">
              {opportunityMatches.map((match) => <OpportunityRecommendation key={match.opportunity.id} match={match} />)}
            </ul>
          ) : (
              <p className="mt-4 border-y border-line py-4 text-sm leading-6 text-muted">No exact opportunity matches yet. Add more skills to your profile or explore every open listing.</p>
            )}
        </section>
      </div>

      <section className="mt-9 flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
        <p className="max-w-[70ch] text-sm leading-6 text-muted">
          <span className="font-semibold text-main">Introductions are consent-based.</span> Contact details stay hidden until a candidate accepts and the project owner explicitly shares them.
        </p>
        <Button asChild variant="outline" size="sm" className="self-start shrink-0 sm:self-auto"><Link href="/playground">Explore the agent tools<ArrowRight aria-hidden="true" className="size-4" /></Link></Button>
      </section>
    </div>
  );
}
