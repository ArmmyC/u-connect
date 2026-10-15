import Link from "next/link";
import { ArrowUpRight, CalendarDays, CircleDot, MapPin, Sparkles } from "lucide-react";
import type { Opportunity } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function formatOpportunityDeadline(deadline: string) {
  const date = new Date(`${deadline}T00:00:00.000Z`);
  return Number.isNaN(date.valueOf()) ? deadline : new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(date);
}

export function OpportunityCard({ opportunity, ownerName, matchScore, matchReasons }: {
  opportunity: Opportunity;
  ownerName: string;
  matchScore: number | null;
  matchReasons: string[];
}) {
  return (
    <Card className="flex h-full min-w-0 flex-col p-4 transition-colors hover:border-line-strong sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap gap-1.5">
          <Badge variant="info" className="capitalize">{opportunity.type}</Badge>
          <Badge variant={opportunity.status === "open" ? "success" : opportunity.status === "closed" ? "default" : "warning"} className="capitalize">{opportunity.status.replace("-", " ")}</Badge>
        </div>
        {matchScore === null ? <Badge variant="default">No match</Badge> : <Badge variant="accent"><Sparkles aria-hidden="true" className="size-3" />{matchScore} fit</Badge>}
      </div>

      <Link href={`/opportunities/${encodeURIComponent(opportunity.id)}`} className="mt-3 block break-words text-base font-semibold tracking-tight text-main decoration-accent underline-offset-4 hover:underline">{opportunity.title}</Link>
      <p className="mt-1 text-xs font-medium text-accent-strong">{opportunity.role}</p>
      <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted">{opportunity.description}</p>

      <div className="mt-4 flex min-w-0 flex-wrap gap-1.5" aria-label="Required skills">
        {opportunity.requiredSkills.map((skill) => <Badge key={skill} variant="default" className="max-w-full truncate">{skill}</Badge>)}
      </div>

      <div className="mt-4 grid min-w-0 gap-2 rounded-xl border border-line/70 bg-surface-raised/60 p-3 text-[11px] sm:grid-cols-2">
        <p className="flex min-w-0 items-start gap-2 text-muted"><CircleDot aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-accent" /><span className="min-w-0 break-words">{opportunity.compensation}</span></p>
        <p className="flex min-w-0 items-start gap-2 text-muted"><CalendarDays aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-info" /><span>Due {formatOpportunityDeadline(opportunity.deadline)}</span></p>
        <p className="flex min-w-0 items-start gap-2 text-muted sm:col-span-2"><MapPin aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-faint" /><span>Posted by {ownerName}</span></p>
      </div>

      {matchReasons.length > 0 && <p className="mt-3 line-clamp-2 text-[11px] leading-4 text-muted"><span className="font-semibold text-accent-strong">Match signal: </span>{matchReasons[0]}</p>}

      <div className="mt-auto flex justify-end border-t border-line/70 pt-3">
        <Button asChild variant="subtle" size="sm" className="-mr-2"><Link href={`/opportunities/${encodeURIComponent(opportunity.id)}`}>View details<ArrowUpRight aria-hidden="true" className="size-3.5" /></Link></Button>
      </div>
    </Card>
  );
}
