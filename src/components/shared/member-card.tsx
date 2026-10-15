import Link from "next/link";
import { ArrowUpRight, BriefcaseBusiness, MapPin, Sparkles } from "lucide-react";
import type { Member } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function availabilityVariant(availability: Member["availability"]) {
  if (availability === "available") return "success" as const;
  if (availability === "part-time") return "warning" as const;
  return "default" as const;
}

export function MemberCard({ member, score, reasons }: { member: Member; score: number | null; reasons: string[] }) {
  return (
    <Card className="flex h-full min-w-0 flex-col p-4 transition-colors hover:border-line-strong sm:p-5">
      <div className="flex min-w-0 items-start gap-3">
        <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-2xl border border-accent/15 bg-accent-soft text-sm font-bold text-accent-strong">
          {initials(member.name)}
        </span>
        <div className="min-w-0 flex-1">
          <Link href={`/members/${encodeURIComponent(member.id)}`} className="block truncate text-sm font-semibold text-main decoration-accent underline-offset-4 hover:underline sm:text-base">
            {member.name}
          </Link>
          <p className="mt-1 truncate text-xs text-muted">{member.headline}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge variant="info" className="capitalize">{member.role}</Badge>
            <Badge variant={availabilityVariant(member.availability)}>{member.availability}</Badge>
          </div>
        </div>
        <div className="shrink-0 text-right">
          {score === null ? (
            <Badge variant="default">No score</Badge>
          ) : (
            <Badge variant="mint"><Sparkles aria-hidden="true" className="size-3" />{score} fit</Badge>
          )}
          <p className="mt-1.5 flex items-center justify-end gap-1 text-[10px] text-faint"><MapPin aria-hidden="true" className="size-3" />{member.location}</p>
        </div>
      </div>

      <p className="mt-4 line-clamp-2 text-xs leading-5 text-muted">{member.bio}</p>

      <div className="mt-4 min-w-0 rounded-xl border border-line/80 bg-surface-raised/70 p-3">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-faint">
          <BriefcaseBusiness aria-hidden="true" className="size-3.5" /> Project evidence
        </div>
        <p className="mt-1.5 text-xs leading-5 text-main">{member.projects[0] ?? "No project examples listed yet."}</p>
      </div>

      <div className="mt-4 flex min-w-0 flex-wrap gap-1.5" aria-label={`${member.name} skills`}>
        {member.skills.slice(0, 4).map((skill) => <Badge key={skill} variant="default" className="max-w-full truncate">{skill}</Badge>)}
        {member.skills.length > 4 && <Badge variant="default">+{member.skills.length - 4}</Badge>}
      </div>

      {reasons.length > 0 && (
        <p className="mt-3 line-clamp-2 text-[11px] leading-4 text-muted" aria-label="Match reasons">
          <span className="font-semibold text-accent-strong">Why this fit: </span>{reasons.slice(0, 2).join(" ")}
        </p>
      )}

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-line/70 pt-3">
        <span className="min-w-0 truncate text-[10px] text-faint">{member.openToCollaborate ? "Open to collaboration" : "Not seeking collaboration"}</span>
        <Button asChild variant="subtle" size="sm" className="shrink-0 -mr-2">
          <Link href={`/members/${encodeURIComponent(member.id)}`}>View profile <ArrowUpRight aria-hidden="true" className="size-3.5" /></Link>
        </Button>
      </div>
    </Card>
  );
}
