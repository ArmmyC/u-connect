"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, LoaderCircle, Send, Sparkles } from "lucide-react";
import { useDemo, type AgentResponse } from "@/components/demo-provider";
import { MemberCard } from "@/components/shared/member-card";
import { OpportunityCard } from "@/components/shared/opportunity-card";
import { ToolCallCard } from "@/components/shared/tool-call-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

const starterPrompts = [
  "Find a React freelance developer",
  "Build a startup MVP team with frontend and UI/UX",
  "Find Python and AI opportunities",
  "Recommend a blockchain team",
  "Find digital marketing people",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function memberIdFromResult(value: unknown): { id: string; score: number | null; reasons: string[] } | null {
  if (!isRecord(value)) return null;
  const member = isRecord(value.member) ? value.member : value;
  if (typeof member.id !== "string") return null;
  return {
    id: member.id,
    score: typeof value.score === "number" ? value.score : null,
    reasons: Array.isArray(value.reasons) ? value.reasons.filter((reason): reason is string => typeof reason === "string") : [],
  };
}

function opportunityIdFromResult(value: unknown): string | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.title !== "string" || !Array.isArray(value.requiredSkills)) return null;
  return value.id;
}

function responseKind(response: AgentResponse | null) {
  if (!response) return "";
  const tool = response.toolCalls[0]?.tool;
  return tool === "recommend_team" || response.parsed.mode === "team" ? "team" : tool === "search_opportunities" || response.parsed.mode === "opportunities" ? "opportunities" : "members";
}

export function AgentView() {
  const { snapshot, agentResponse, agentPending, actionFeedback, runAgent } = useDemo();
  const [prompt, setPrompt] = useState(agentResponse?.parsed.intent ?? "");
  const [activeIntent, setActiveIntent] = useState(agentResponse?.parsed.intent ?? "");
  const [validationError, setValidationError] = useState<string | null>(null);
  const response = agentResponse?.parsed.intent === activeIntent ? agentResponse : null;
  const kind = responseKind(response);

  const memberResults = useMemo(() => {
    if (!snapshot || !response || kind !== "members" && kind !== "team") return [];
    return response.results.flatMap((result) => {
      const parsed = memberIdFromResult(result);
      const member = parsed ? snapshot.members.find((item) => item.id === parsed.id) : undefined;
      return parsed && member ? [{ member, score: parsed.score, reasons: parsed.reasons }] : [];
    });
  }, [snapshot, response, kind]);

  const opportunityResults = useMemo(() => {
    if (!snapshot || !response || kind !== "opportunities") return [];
    return response.results.flatMap((result) => {
      const id = opportunityIdFromResult(result);
      const opportunity = id ? snapshot.opportunities.find((item) => item.id === id) : undefined;
      return opportunity ? [opportunity] : [];
    });
  }, [snapshot, response, kind]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = prompt.trim();
    if (!text) {
      setValidationError("Describe the people, team, or opportunity you want to find.");
      return;
    }
    setValidationError(null);
    setActiveIntent(text);
    try {
      await runAgent(text);
    } catch {
      // The provider exposes the request error in the page feedback below.
    }
  }

  function chooseStarter(text: string) {
    setPrompt(text);
    setValidationError(null);
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-5 px-page py-6 md:py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow">Explainable matching</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-main sm:text-3xl">AI Agent</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Ask in your own words. The local demo parses your brief and shows the tool call and catalog evidence behind its results.</p>
        </div>
        <Badge variant="success"><Sparkles aria-hidden="true" className="size-3.5" />Deterministic demo</Badge>
      </header>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>What would move your idea forward?</CardTitle>
          <CardDescription>Try a starter, then edit it or write a completely different brief.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="flex flex-wrap gap-2" aria-label="Starter prompts">
            {starterPrompts.map((starter) => (
              <button key={starter} type="button" onClick={() => chooseStarter(starter)} className="rounded-pill border border-line px-3 py-2 text-left text-[11px] leading-4 text-muted transition-colors hover:border-line-strong hover:bg-surface-raised hover:text-main focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                {starter}
              </button>
            ))}
          </div>
          <form onSubmit={(event) => void submit(event)}>
            <label className="sr-only" htmlFor="agent-brief">Write a free-form request</label>
            <Textarea id="agent-brief" value={prompt} onChange={(event) => { setPrompt(event.target.value); if (validationError) setValidationError(null); }} placeholder="For example: Find a product designer for a booking app who can start part-time…" aria-invalid={Boolean(validationError)} aria-describedby={validationError ? "agent-brief-error" : "agent-brief-hint"} className="min-h-28 bg-bg/60 px-4" />
            {validationError ? <p id="agent-brief-error" role="alert" className="mt-2 text-xs text-danger">{validationError}</p> : <p id="agent-brief-hint" className="mt-2 text-[11px] text-faint">Fictional demo profiles only. No external AI service is connected.</p>}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <span className="text-[10px] text-faint">Members · opportunities · startup teams</span>
              <Button type="submit" disabled={agentPending}>
                {agentPending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Send aria-hidden="true" className="size-4" />}
                {agentPending ? "Interpreting brief…" : "Find matches"}
              </Button>
            </div>
          </form>
          {actionFeedback?.status === "pending" && agentPending && <p role="status" aria-live="polite" className="rounded-control border border-line bg-surface-raised px-3.5 py-3 text-xs text-muted">{actionFeedback.message}</p>}
          {actionFeedback?.status === "error" && <p role="alert" aria-live="assertive" className="rounded-control border border-danger/20 bg-danger-soft px-3.5 py-3 text-xs leading-5 text-danger">{actionFeedback.message}</p>}
        </CardContent>
      </Card>

      {response && (
        <div className="space-y-5" aria-live="polite">
          <Card className="border-accent/20">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><Badge variant="accent">Interpreted as {response.parsed.mode}</Badge><span className="text-xs text-muted">{response.parsed.roles.length ? response.parsed.roles.join(" · ") : "Role not specified"}</span></div>
                <h2 className="mt-3 break-words text-lg font-semibold text-main">{response.parsed.intent}</h2>
                <p className="mt-1 max-w-3xl text-xs leading-5 text-muted">{response.parsed.rationale}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {response.parsed.skills.map((skill) => <Badge key={skill} variant="default">{skill}</Badge>)}
                  {response.parsed.budgetTHB !== undefined && <Badge variant="warning">฿{response.parsed.budgetTHB.toLocaleString("en-US")}{response.parsed.budgetUnit ? ` / ${response.parsed.budgetUnit}` : " · unit not specified"}</Badge>}
                  {!response.parsed.skills.length && response.parsed.budgetTHB === undefined && <span className="text-[11px] text-faint">No explicit skill or budget filters were found.</span>}
                </div>
              </div>
              {response.parsed.mode === "team" && <Button asChild variant="secondary" className="shrink-0 self-start"><Link href="/team-builder">Open Team Builder<ArrowRight aria-hidden="true" className="size-4" /></Link></Button>}
            </CardContent>
          </Card>

          <section aria-labelledby="tool-steps-heading" className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div><p className="eyebrow">Agent trace</p><h2 id="tool-steps-heading" className="mt-1 text-base font-semibold text-main">Tool calls</h2></div>
              <span className="text-[11px] text-muted">Shared dispatcher · {response.toolCalls.length} step{response.toolCalls.length === 1 ? "" : "s"}</span>
            </div>
            {response.toolCalls.map((call, index) => <ToolCallCard key={`${call.tool}-${index}`} call={call} index={index} />)}
          </section>

          {kind === "opportunities" ? (
            <section aria-labelledby="agent-results-heading" className="space-y-3">
              <div className="flex items-end justify-between gap-3"><div><p className="eyebrow">Catalog results</p><h2 id="agent-results-heading" className="mt-1 text-base font-semibold text-main">Opportunities</h2></div><Badge variant="default">{opportunityResults.length} found</Badge></div>
              {opportunityResults.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{opportunityResults.map((opportunity) => <OpportunityCard key={opportunity.id} opportunity={opportunity} ownerName={snapshot?.members.find((member) => member.id === opportunity.ownerId)?.name ?? "Community member"} matchScore={null} matchReasons={[]} />)}</div> : <Card className="border-dashed p-5 text-sm text-muted">No opportunities matched those filters. Try a broader skill or a different phrase.</Card>}
              <Button asChild variant="subtle" size="sm"><Link href="/opportunities">Browse all opportunities<ArrowUpRight aria-hidden="true" className="size-3.5" /></Link></Button>
            </section>
          ) : (
            <section aria-labelledby="agent-results-heading" className="space-y-3">
              <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="eyebrow">Catalog results</p><h2 id="agent-results-heading" className="mt-1 text-base font-semibold text-main">{kind === "team" ? "Recommended collaborators" : "Matching members"}</h2></div><Badge variant="default">{memberResults.length} found</Badge></div>
              {memberResults.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{memberResults.map(({ member, score, reasons }) => <MemberCard key={member.id} member={member} score={score} reasons={reasons} />)}</div> : <Card className="border-dashed p-5 text-sm text-muted">No members matched those filters. Try another role or skill.</Card>}
              <Button asChild variant="subtle" size="sm"><Link href={kind === "team" ? "/team-builder" : "/members"}>{kind === "team" ? "Build a team from these matches" : "Browse all members"}<ArrowUpRight aria-hidden="true" className="size-3.5" /></Link></Button>
            </section>
          )}

          <Card className="bg-surface-raised/60">
            <CardHeader className="pb-3"><CardTitle className="text-sm">Next steps</CardTitle><CardDescription>The demo leaves project creation and introduction requests under your control.</CardDescription></CardHeader>
            <CardContent className="pt-0">
              <ol className="grid gap-2 sm:grid-cols-3">{response.nextSteps.map((step, index) => <li key={`${index}-${step}`} className="flex min-w-0 items-start gap-2 rounded-xl border border-line/70 bg-surface px-3 py-3 text-xs leading-5 text-muted"><span className="grid size-5 shrink-0 place-items-center rounded-full bg-accent-soft text-[10px] font-bold text-accent-strong">{index + 1}</span><span>{step}</span></li>)}</ol>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
