"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, CalendarDays, Check, CircleDot, MapPin, RotateCcw, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import { useDemo } from "@/components/demo-provider";
import { formatOpportunityDeadline } from "@/components/shared/opportunity-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { matchCandidates } from "@/lib/matching";
import type { Member, Opportunity } from "@/lib/types";

export interface OpportunityFit {
  score: number | null;
  reasons: string[];
}

export function getOpportunityFit(opportunity: Opportunity, actorId: string, catalog: Member[]): OpportunityFit {
  const actor = catalog.find((member) => member.id === actorId);
  if (!actor) return { score: null, reasons: ["The selected demo member is not in the public directory."] };
  if (actor.availability === "busy") return { score: null, reasons: ["Your profile lists availability as busy, so this listing is not ranked as an active fit."] };
  const match = matchCandidates(opportunity, catalog).find((candidate) => candidate.member.id === actorId);
  if (match) return { score: match.score, reasons: match.reasons };

  const missingSkills = opportunity.requiredSkills.filter((skill) => !actor.skills.some((known) => known.toLowerCase() === skill.toLowerCase()));
  return { score: null, reasons: [
    `Your profile does not list: ${missingSkills.join(", ")}.`,
    `This listing requires all ${opportunity.requiredSkills.length} listed skills.`,
  ] };
}

function LoadingState() {
  return <div role="status" aria-live="polite" className="grid min-h-60 place-items-center px-page text-sm text-muted">Loading opportunity details…</div>;
}

export function OpportunityDetailView({ opportunityId }: { opportunityId: string }) {
  const { snapshot, actorId, loadStatus, loadError, refresh, recordInterest, isMutating } = useDemo();
  const [localInterest, setLocalInterest] = useState<{ memberId: string } | null>(null);
  const [interestFeedback, setInterestFeedback] = useState<{ status: "pending" | "success" | "error"; message: string } | null>(null);

  if (!snapshot) {
    if (loadStatus === "error") return <div className="px-page py-8"><Card className="p-6 text-center"><h1 className="text-base font-semibold text-main">Opportunity unavailable</h1><p role="alert" className="mt-2 text-xs text-muted">{loadError ?? "The local demo service is unavailable."}</p><Button variant="secondary" className="mt-4" onClick={() => void refresh().catch(() => undefined)}><RotateCcw aria-hidden="true" className="size-4" />Try again</Button></Card></div>;
    return <LoadingState />;
  }

  const opportunity = snapshot.opportunities.find((item) => item.id === opportunityId);
  if (!opportunity) return <div className="px-page py-8"><Card className="p-6"><p className="eyebrow">Listing not found</p><h1 className="mt-2 text-xl font-semibold text-main">This opportunity is not in the demo catalog.</h1><Button asChild variant="secondary" size="sm" className="mt-4"><Link href="/opportunities"><ArrowLeft aria-hidden="true" className="size-3.5" />Back to opportunities</Link></Button></Card></div>;

  const owner = snapshot.members.find((member) => member.id === opportunity.ownerId);
  const fit = getOpportunityFit(opportunity, actorId, snapshot.members);
  const interestedInSnapshot = snapshot.interests.some((interest) => interest.opportunityId === opportunity.id && interest.memberId === actorId);
  const alreadyInterested = interestedInSnapshot || localInterest?.memberId === actorId;
  const isOwner = opportunity.ownerId === actorId;
  const interestOpportunityId = opportunity.id;

  async function expressInterest() {
    setInterestFeedback({ status: "pending", message: "Recording your interest…" });
    try {
      const interest = await recordInterest(interestOpportunityId);
      setLocalInterest({ memberId: interest.memberId });
      setInterestFeedback({ status: "success", message: "Your interest has been recorded." });
    } catch (error) {
      setInterestFeedback({ status: "error", message: error instanceof Error ? error.message : "Your interest could not be recorded." });
    }
  }

  return (
    <div className="space-y-5 px-page py-6 md:py-8">
      <Button asChild variant="subtle" size="sm" className="-ml-2"><Link href="/opportunities"><ArrowLeft aria-hidden="true" className="size-3.5" />Back to opportunities</Link></Button>

      {loadError && <p role="status" className="rounded-control border border-warning/20 bg-warning-soft px-4 py-3 text-xs leading-5 text-warning">Showing the last loaded details because the latest refresh failed.</p>}

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_330px] xl:gap-5">
        <main className="min-w-0 space-y-4">
          <Card className="overflow-hidden">
            <CardHeader className="pt-5 sm:pt-6">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="info" className="capitalize">{opportunity.type}</Badge>
                <Badge variant={opportunity.status === "open" ? "success" : opportunity.status === "closed" ? "default" : "warning"} className="capitalize">{opportunity.status.replace("-", " ")}</Badge>
                <span className="ml-auto text-[10px] text-faint">Listing ID · {opportunity.id}</span>
              </div>
              <CardTitle className="mt-3 break-words text-2xl sm:text-3xl">{opportunity.title}</CardTitle>
              <CardDescription className="mt-2 text-sm">Looking for a <span className="font-semibold text-main">{opportunity.role}</span></CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-4">
              <p className="whitespace-pre-line text-sm leading-6 text-muted">{opportunity.description}</p>

              <div>
                <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold text-main"><Sparkles aria-hidden="true" className="size-3.5 text-accent" />Required skills</h2>
                <div className="flex flex-wrap gap-1.5">{opportunity.requiredSkills.map((skill) => <Badge key={skill} variant="default">{skill}</Badge>)}</div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="flex min-w-0 items-start gap-3 rounded-xl border border-line/70 bg-surface-raised/60 p-3.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent-strong"><CircleDot aria-hidden="true" className="size-4" /></span>
                  <div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-faint">Compensation</p><p className="mt-1 break-words text-xs font-semibold leading-5 text-main">{opportunity.compensation}</p>{opportunity.budgetUnit && <p className="mt-1 text-[10px] capitalize text-muted">Unit: {opportunity.budgetUnit}</p>}</div>
                </div>
                <div className="flex min-w-0 items-start gap-3 rounded-xl border border-line/70 bg-surface-raised/60 p-3.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-info-soft text-info"><CalendarDays aria-hidden="true" className="size-4" /></span>
                  <div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-faint">Deadline</p><p className="mt-1 text-xs font-semibold text-main">{formatOpportunityDeadline(opportunity.deadline)}</p></div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your match signals</CardTitle>
              <CardDescription>Deterministic fit based on the selected demo member’s listed skills and availability.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line/70 bg-surface-raised/60 p-3.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-strong"><Sparkles aria-hidden="true" className="size-4" /></span>
                  <div className="min-w-0"><p className="text-xs font-semibold text-main">{fit.score === null ? "No active match" : "Ranked fit"}</p><p className="mt-1 text-[10px] text-muted">{fit.score === null ? "The hard requirements are not met." : "Reasons come from the public member profile."}</p></div>
                </div>
                {fit.score === null ? <Badge variant="default">No score</Badge> : <Badge variant="accent">{fit.score} fit</Badge>}
              </div>
              <ul className="mt-3 space-y-2">
                {fit.reasons.map((reason) => <li key={reason} className="flex gap-2.5 text-xs leading-5 text-muted"><Check aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-accent-strong" /><span>{reason}</span></li>)}
              </ul>
            </CardContent>
          </Card>
        </main>

        <aside className="min-w-0 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Listing owner</CardTitle>
              <CardDescription>Posted by a community member.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {owner ? (
                <Link href={`/members/${encodeURIComponent(owner.id)}`} className="group flex min-w-0 items-center gap-3 rounded-xl border border-line/70 bg-surface-raised/60 p-3 transition-colors hover:border-line-strong">
                  <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl bg-info-soft text-xs font-bold text-info">{owner.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-main">{owner.name}</span><span className="mt-1 block truncate text-[10px] text-muted">{owner.headline}</span></span>
                  <ArrowUpRight aria-hidden="true" className="size-3.5 shrink-0 text-faint group-hover:text-main" />
                </Link>
              ) : <p className="text-xs text-muted">Owner profile unavailable.</p>}
              {owner && <p className="mt-3 flex items-center gap-1.5 text-[10px] text-faint"><MapPin aria-hidden="true" className="size-3" />{owner.location}</p>}
            </CardContent>
          </Card>

          <Card className="border-accent/15">
            <CardHeader>
              <CardTitle>Interested?</CardTitle>
              <CardDescription>Let the owner know you want to hear more.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              {alreadyInterested ? (
                <div className="rounded-xl border border-success/20 bg-success-soft px-3 py-3 text-xs font-medium text-success"><Check aria-hidden="true" className="mr-1.5 inline size-3.5" />Interest sent</div>
              ) : isOwner ? (
                <div className="rounded-xl border border-line bg-surface-raised px-3 py-3 text-xs text-muted">This is your listing.</div>
              ) : opportunity.status !== "open" ? (
                <div className="rounded-xl border border-line bg-surface-raised px-3 py-3 text-xs capitalize text-muted">This listing is {opportunity.status.replace("-", " ")}.</div>
              ) : (
                <Button className="w-full" disabled={isMutating || interestFeedback?.status === "pending"} onClick={() => void expressInterest()}>
                  {interestFeedback?.status === "pending" ? "Recording interest…" : "Express interest"}<ArrowUpRight aria-hidden="true" className="size-4" />
                </Button>
              )}

              {interestFeedback && <p role={interestFeedback.status === "error" ? "alert" : "status"} aria-live="polite" className={`rounded-lg px-3 py-2.5 text-[11px] leading-5 ${interestFeedback.status === "error" ? "bg-danger-soft text-danger" : interestFeedback.status === "success" ? "bg-success-soft text-success" : "bg-surface-raised text-muted"}`}>{interestFeedback.message}</p>}
              {alreadyInterested && <Button asChild variant="secondary" size="sm" className="w-full justify-between"><Link href="/network">View your network<ArrowUpRight aria-hidden="true" className="size-3.5" /></Link></Button>}
              <p className="flex items-start gap-2 border-t border-line pt-3 text-[10px] leading-5 text-faint"><ShieldCheck aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />Expressing interest shares no private contact details.</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-2.5"><UsersRound aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-info" /><div><p className="text-xs font-semibold text-main">Looking for teammates?</p><p className="mt-1 text-[11px] leading-5 text-muted">Use the network workspace to manage project introductions.</p></div></div>
              <Button asChild variant="subtle" size="sm" className="mt-3 w-full justify-between"><Link href="/network">Open network<ArrowUpRight aria-hidden="true" className="size-3.5" /></Link></Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
