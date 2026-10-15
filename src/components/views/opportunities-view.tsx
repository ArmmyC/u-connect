"use client";

import { useMemo, useState } from "react";
import { BriefcaseBusiness, RotateCcw, Search } from "lucide-react";
import { useDemo } from "@/components/demo-provider";
import { OpportunityCard } from "@/components/shared/opportunity-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getOpportunityFit } from "@/components/views/opportunity-detail-view";
import { searchOpportunities } from "@/lib/matching";
import type { OpportunityType } from "@/lib/types";

type OpportunityTypeFilter = OpportunityType | "all";

function LoadingState() {
  return <div role="status" aria-live="polite" className="grid min-h-60 place-items-center rounded-card border border-line bg-surface text-sm text-muted">Loading opportunities…</div>;
}

export function OpportunitiesView() {
  const { snapshot, actorId, loadStatus, loadError, refresh } = useDemo();
  const [query, setQuery] = useState("");
  const [type, setType] = useState<OpportunityTypeFilter>("all");
  const results = useMemo(() => snapshot ? searchOpportunities({
    ...(query.trim() ? { query: query.trim() } : {}),
    ...(type !== "all" ? { type } : {}),
  }, snapshot.opportunities) : [], [snapshot, query, type]);

  function resetFilters() {
    setQuery("");
    setType("all");
  }

  return (
    <div className="space-y-5 px-page py-6 md:py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow">Community marketplace</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-main sm:text-3xl">Opportunities worth exploring</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Find projects, roles, freelance work, and collaborations with clear requirements and listed terms.</p>
        </div>
        {snapshot && <Badge variant="accent"><BriefcaseBusiness aria-hidden="true" className="size-3.5" />{snapshot.opportunities.length} listings</Badge>}
      </header>

      {loadError && snapshot && <p role="status" className="rounded-control border border-warning/20 bg-warning-soft px-4 py-3 text-xs leading-5 text-warning">The latest refresh failed. Showing the last loaded opportunities.</p>}

      {!snapshot ? loadStatus === "error" ? (
        <Card className="p-6 text-center">
          <h2 className="text-sm font-semibold text-main">Opportunities could not load</h2>
          <p role="alert" className="mt-2 text-xs leading-5 text-muted">{loadError ?? "The local demo service is unavailable."}</p>
          <Button className="mt-4" variant="secondary" onClick={() => void refresh().catch(() => undefined)}><RotateCcw aria-hidden="true" className="size-4" />Try again</Button>
        </Card>
      ) : <LoadingState /> : (
        <>
          <Card className="p-4 sm:p-5">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-end">
              <div className="min-w-0">
                <label htmlFor="opportunity-query" className="mb-1.5 block text-xs font-medium text-muted">Search opportunities</label>
                <div className="relative">
                  <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
                  <Input id="opportunity-query" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Title, skill, role, or description" className="h-10 pl-9 text-xs" />
                </div>
              </div>
              <div className="min-w-0">
                <label htmlFor="opportunity-type" className="mb-1.5 block text-xs font-medium text-muted">Listing type</label>
                <select id="opportunity-type" value={type} onChange={(event) => setType(event.target.value as OpportunityTypeFilter)} className="field h-10 px-3 text-xs">
                  <option value="all">All types</option>
                  <option value="project">Project</option>
                  <option value="job">Job</option>
                  <option value="freelance">Freelance</option>
                  <option value="collaboration">Collaboration</option>
                  <option value="cofounder">Cofounder</option>
                </select>
              </div>
              <Button variant="subtle" size="sm" onClick={resetFilters} className="justify-self-start md:justify-self-end"><RotateCcw aria-hidden="true" className="size-3.5" />Reset filters</Button>
            </div>
            <p className="mt-3 text-[10px] leading-4 text-faint">Match signals use the current demo member’s listed skills and availability. All catalog records are fictional.</p>
          </Card>

          <section aria-labelledby="opportunity-results-heading">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 id="opportunity-results-heading" className="text-sm font-semibold text-main">{results.length ? "Available listings" : "No listings match"}</h2>
                <p className="mt-1 text-[11px] text-muted">Requirements and compensation are shown as listed by the demo owner.</p>
              </div>
              <Badge variant="default">{results.length} shown</Badge>
            </div>
            {results.length ? (
              <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:gap-4">
                {results.map((opportunity) => {
                  const ownerName = snapshot.members.find((member) => member.id === opportunity.ownerId)?.name ?? "Community member";
                  const fit = getOpportunityFit(opportunity, actorId, snapshot.members);
                  return <OpportunityCard key={opportunity.id} opportunity={opportunity} ownerName={ownerName} matchScore={fit.score} matchReasons={fit.reasons} />;
                })}
              </div>
            ) : (
              <Card className="flex min-h-64 flex-col items-center justify-center border-dashed p-6 text-center">
                <span aria-hidden="true" className="grid size-11 place-items-center rounded-2xl bg-surface-overlay text-faint"><Search className="size-5" /></span>
                <p className="mt-3 text-sm font-semibold text-main">Nothing matches these filters</p>
                <p className="mt-1 max-w-sm text-xs leading-5 text-muted">Try a broader search term or include more listing types.</p>
                <Button variant="secondary" size="sm" className="mt-4" onClick={resetFilters}>Show all listings</Button>
              </Card>
            )}
          </section>
        </>
      )}
    </div>
  );
}
