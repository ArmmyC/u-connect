"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, CircleAlert, Clock3, Handshake, LockKeyhole, Mail, RefreshCw, Send, ShieldCheck, UsersRound } from "lucide-react";
import { useDemo } from "@/components/demo-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Introduction, IntroductionStatus, Project } from "@/lib/types";

type LocalFeedback = { status: "pending" | "success" | "error"; message: string };

function isCompleted(status: IntroductionStatus, step: "accepted" | "confirmed" | "shared") {
  const rank: Record<IntroductionStatus, number> = { pending: 0, accepted: 1, confirmed: 2, shared: 3, declined: 1 };
  return status !== "declined" && rank[status] >= rank[step];
}

function statusVariant(status: IntroductionStatus) {
  if (status === "shared" || status === "confirmed") return "success" as const;
  if (status === "accepted") return "info" as const;
  if (status === "declined") return "default" as const;
  return "warning" as const;
}

function formatRequestedDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(date);
}

function StatusTimeline({ introduction }: { introduction: Introduction }) {
  if (introduction.status === "declined") {
    return (
      <ol aria-label="Introduction state timeline" className="grid gap-2 sm:grid-cols-2">
        <li className="flex items-start gap-2 rounded-xl border border-success/20 bg-success-soft px-3 py-2.5 text-[11px] text-success"><Check aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" /><span><span className="block font-semibold">Request sent</span><span className="block mt-0.5 text-[10px] text-faint">{formatRequestedDate(introduction.createdAt)}</span></span></li>
        <li aria-current="step" className="flex items-start gap-2 rounded-xl border border-line bg-surface-raised px-3 py-2.5 text-[11px] text-muted"><CircleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-faint" /><span><span className="block font-semibold text-main">Candidate declined</span><span className="block mt-0.5 text-[10px]">This request is complete.</span></span></li>
      </ol>
    );
  }

  const steps: Array<{ status: "accepted" | "confirmed" | "shared" | null; label: string }> = [
    { status: null, label: "Request sent" },
    { status: "accepted", label: "Candidate accepted" },
    { status: "confirmed", label: "Owner confirmed" },
    { status: "shared", label: "Contact shared" },
  ];
  return (
    <ol aria-label="Introduction state timeline" className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {steps.map((step, index) => {
        const done = step.status === null || isCompleted(introduction.status, step.status);
        const current = introduction.status === "pending" && index === 1 || introduction.status === "accepted" && index === 2 || introduction.status === "confirmed" && index === 3 || introduction.status === "shared" && index === 3;
        const Icon = done ? Check : current ? Clock3 : LockKeyhole;
        return <li key={step.status ?? "requested"} aria-current={current ? "step" : undefined} className={`flex min-w-0 items-start gap-2 rounded-xl border px-3 py-2.5 text-[11px] ${done ? "border-success/20 bg-success-soft text-success" : current ? "border-warning/20 bg-warning-soft text-warning" : "border-line bg-surface-raised text-faint"}`}><Icon aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" /><span className="min-w-0"><span className={`block font-semibold ${done || current ? "" : "text-muted"}`}>{step.label}</span>{index === 0 && <span className="mt-0.5 block truncate text-[10px] text-faint">{formatRequestedDate(introduction.createdAt)}</span>}</span></li>;
      })}
    </ol>
  );
}

function ProjectCard({ project, introductions, ownerView, memberById, sharedContacts, feedback, pendingId, isMutating, onTransition }: {
  project: Project;
  introductions: Introduction[];
  ownerView: boolean;
  memberById: Map<string, { name: string; headline: string }>;
  sharedContacts: Record<string, { email: string }>;
  feedback: Record<string, LocalFeedback>;
  pendingId: string | null;
  isMutating: boolean;
  onTransition: (introductionId: string, action: "accept" | "decline" | "confirm" | "share_contact") => void;
}) {
  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 pt-5">
        <div className="min-w-0 flex-1"><p className="eyebrow">{ownerView ? "Your project" : "Project invitation"}</p><CardTitle className="mt-1 break-words text-lg">{project.title}</CardTitle><CardDescription className="mt-1 line-clamp-2">{project.description}</CardDescription></div>
        <Badge variant="default">{introductions.length} request{introductions.length === 1 ? "" : "s"}</Badge>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="flex flex-wrap gap-1.5">{project.skills.map((skill) => <Badge key={skill} variant="default">{skill}</Badge>)}{project.budgetTHB !== undefined && <Badge variant="accent">฿{project.budgetTHB.toLocaleString("en-US")} budget</Badge>}</div>
        {introductions.length ? introductions.map((introduction) => {
          const member = memberById.get(introduction.memberId);
          const contact = introduction.status === "shared" ? sharedContacts[introduction.memberId] : undefined;
          const localFeedback = feedback[introduction.id];
          const busy = pendingId === introduction.id || isMutating;
          return (
            <article key={introduction.id} className="min-w-0 space-y-4 rounded-2xl border border-line bg-surface-raised/45 p-3.5 sm:p-4">
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                <div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-faint">{ownerView ? "Candidate" : "Your request"}</p><p className="mt-1 truncate text-sm font-semibold text-main">{member?.name ?? "Member profile unavailable"}</p>{member && <p className="mt-0.5 truncate text-[11px] text-muted">{member.headline}</p>}</div>
                <Badge variant={statusVariant(introduction.status)} className="capitalize">{introduction.status}</Badge>
              </div>

              <StatusTimeline introduction={introduction} />

              {ownerView && introduction.status === "accepted" && (
                <div className="flex flex-col gap-3 rounded-xl border border-info/20 bg-info-soft/60 p-3.5 sm:flex-row sm:items-center sm:justify-between"><p className="flex items-start gap-2 text-[11px] leading-5 text-muted"><Handshake aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-info" /><span>The candidate accepted. Confirm the collaboration before choosing to share contact details.</span></p><Button size="sm" disabled={busy} onClick={() => onTransition(introduction.id, "confirm")}>{busy ? "Saving…" : "Confirm collaboration"}</Button></div>
              )}

              {ownerView && introduction.status === "confirmed" && (
                <div className="flex flex-col gap-3 rounded-xl border border-success/20 bg-success-soft/50 p-3.5 sm:flex-row sm:items-center sm:justify-between"><p className="flex items-start gap-2 text-[11px] leading-5 text-muted"><ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" /><span>Collaboration is confirmed. Sharing contact details is a separate, explicit action.</span></p><Button size="sm" disabled={busy} onClick={() => onTransition(introduction.id, "share_contact")}><Send aria-hidden="true" className="size-3.5" />{busy ? "Sharing…" : "Share contact details"}</Button></div>
              )}

              {!ownerView && introduction.status === "pending" && (
                <div className="flex flex-col gap-2 sm:flex-row"><Button className="sm:flex-1" disabled={busy} onClick={() => onTransition(introduction.id, "accept")}>{busy ? "Saving…" : "Accept request"}</Button><Button className="sm:flex-1" variant="secondary" disabled={busy} onClick={() => onTransition(introduction.id, "decline")}>Decline</Button></div>
              )}

              {contact ? (
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-success/20 bg-success-soft px-3.5 py-3"><span><span className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-success">Contact shared</span><a href={`mailto:${contact.email}`} className="mt-1 flex min-w-0 items-center gap-1.5 break-all text-xs font-medium text-main underline decoration-success/50 underline-offset-4"><Mail aria-hidden="true" className="size-3.5 shrink-0" />{contact.email}</a></span><Badge variant="success"><Check aria-hidden="true" className="size-3" />Explicitly shared</Badge></div>
              ) : (
                <p className="flex items-start gap-2 rounded-xl border border-line px-3.5 py-3 text-[10px] leading-5 text-faint"><LockKeyhole aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />Contact details are hidden until the owner confirms and explicitly shares them.</p>
              )}

              {localFeedback && <p role={localFeedback.status === "error" ? "alert" : "status"} aria-live="polite" className={`rounded-lg px-3 py-2.5 text-[11px] leading-5 ${localFeedback.status === "error" ? "bg-danger-soft text-danger" : localFeedback.status === "success" ? "bg-success-soft text-success" : "bg-surface px-3 text-muted"}`}>{localFeedback.message}</p>}
            </article>
          );
        }) : <div className="rounded-xl border border-dashed border-line px-4 py-6 text-center"><p className="text-xs font-semibold text-main">No introduction requests yet</p><p className="mt-1 text-[11px] text-muted">Add a request from Team Builder to start a consent-aware connection.</p><Button asChild variant="subtle" size="sm" className="mt-2"><Link href="/team-builder">Open Team Builder<ArrowRight aria-hidden="true" className="size-3.5" /></Link></Button></div>}
      </CardContent>
    </Card>
  );
}

export function NetworkView() {
  const { snapshot, loadStatus, loadError, refresh, actorMode, actorId, candidateActorId, setActorMode, setCandidateActorId, isMutating, transitionIntroduction, actionFeedback } = useDemo();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, LocalFeedback>>({});

  const memberById = useMemo(() => new Map((snapshot?.members ?? []).map((member) => [member.id, { name: member.name, headline: member.headline }])), [snapshot]);
  const projects = useMemo(() => {
    if (!snapshot) return [];
    if (actorMode === "owner") return snapshot.projects.filter((project) => project.ownerId === actorId);
    const candidateProjectIds = new Set(snapshot.introductions.filter((intro) => intro.memberId === actorId).map((intro) => intro.projectId));
    return snapshot.projects.filter((project) => candidateProjectIds.has(project.id));
  }, [snapshot, actorMode, actorId]);

  async function transition(introductionId: string, action: "accept" | "decline" | "confirm" | "share_contact") {
    const labels = { accept: "Accepting the request…", decline: "Declining the request…", confirm: "Confirming the collaboration…", share_contact: "Sharing contact details…" };
    const success = { accept: "You accepted this introduction request.", decline: "You declined this introduction request.", confirm: "Collaboration confirmed. You can now share contact details separately.", share_contact: "Contact details were explicitly shared with this collaboration." };
    setPendingId(introductionId);
    setFeedback((current) => ({ ...current, [introductionId]: { status: "pending", message: labels[action] } }));
    try {
      await transitionIntroduction(introductionId, action);
      setFeedback((current) => ({ ...current, [introductionId]: { status: "success", message: success[action] } }));
    } catch (error) {
      setFeedback((current) => ({ ...current, [introductionId]: { status: "error", message: error instanceof Error ? error.message : "This introduction could not be updated." } }));
    } finally {
      setPendingId(null);
    }
  }

  if (!snapshot) {
    if (loadStatus === "error") return <div className="px-page py-8"><Card className="p-6 text-center"><h1 className="text-base font-semibold text-main">Network is unavailable</h1><p role="alert" className="mt-2 text-xs text-muted">{loadError ?? "The local demo workspace did not respond."}</p><Button className="mt-4" variant="secondary" onClick={() => void refresh().catch(() => undefined)}><RefreshCw aria-hidden="true" className="size-4" />Try again</Button></Card></div>;
    return <div role="status" aria-live="polite" className="grid min-h-60 place-items-center px-page text-sm text-muted">Loading network activity…</div>;
  }

  const ownerView = actorMode === "owner";
  const visibleProjects = projects.map((project) => ({
    project,
    introductions: snapshot.introductions.filter((introduction) => introduction.projectId === project.id && (ownerView || introduction.memberId === actorId)),
  }));
  const visibleRequestCount = visibleProjects.reduce((count, item) => count + item.introductions.length, 0);
  const currentActor = snapshot.members.find((member) => member.id === actorId);

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-5 px-page py-6 md:py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0"><p className="eyebrow">Consent-aware collaboration</p><h1 className="mt-2 text-2xl font-semibold tracking-tight text-main sm:text-3xl">Network</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Manage project introductions through candidate approval, owner confirmation, and a separate contact-share decision.</p></div>
        <Badge variant="info"><UsersRound aria-hidden="true" className="size-3.5" />{visibleRequestCount} visible request{visibleRequestCount === 1 ? "" : "s"}</Badge>
      </header>

      {loadError && <p role="status" className="rounded-control border border-warning/20 bg-warning-soft px-4 py-3 text-xs leading-5 text-warning">The latest refresh failed. The last loaded network state is still shown.</p>}
      {actionFeedback?.status === "success" && !Object.keys(feedback).length && <p role="status" aria-live="polite" className="rounded-control border border-success/20 bg-success-soft px-4 py-3 text-xs leading-5 text-success">{actionFeedback.message}</p>}

      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="min-w-0"><p className="text-sm font-semibold text-main">Review as a demo actor</p><p className="mt-1 text-xs leading-5 text-muted">Role switching changes the local demo identity. The server still checks which member owns each action.</p></div>
          <div className="flex flex-col gap-2 sm:items-end">
            <div role="group" aria-label="Network role" className="inline-flex rounded-control border border-line bg-surface-raised p-1">
              <Button size="sm" variant={ownerView ? "primary" : "subtle"} aria-pressed={ownerView} onClick={() => setActorMode("owner")}>Owner view</Button>
              <Button size="sm" variant={!ownerView ? "primary" : "subtle"} aria-pressed={!ownerView} onClick={() => setActorMode("candidate")}>Candidate view</Button>
            </div>
            {!ownerView && <label className="flex items-center gap-2 text-[11px] text-muted"><span>Candidate</span><select aria-label="Candidate member" value={candidateActorId} onChange={(event) => setCandidateActorId(event.target.value)} className="field h-9 min-w-36 px-2.5 text-xs">{snapshot.members.filter((member) => member.id !== "mem-ada").map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>}
          </div>
        </CardContent>
      </Card>

      {ownerView && <div className="rounded-xl border border-accent/15 bg-accent-soft/40 px-4 py-3 text-xs leading-5 text-muted"><span className="font-semibold text-accent-strong">Owner · {currentActor?.name ?? "Ada"}</span> — review candidate replies and decide whether to confirm and share.</div>}
      {!ownerView && <div className="rounded-xl border border-info/20 bg-info-soft/50 px-4 py-3 text-xs leading-5 text-muted"><span className="font-semibold text-info">Candidate · {currentActor?.name ?? "Member"}</span> — only requests addressed to this selected member can be accepted or declined.</div>}

      {visibleProjects.length ? (
        <section aria-labelledby="network-projects-heading" className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2"><div><p className="eyebrow">Your workspace</p><h2 id="network-projects-heading" className="mt-1 text-base font-semibold text-main">{ownerView ? "Owned projects and requests" : "Your invitations"}</h2></div><span className="text-[11px] text-muted">{visibleProjects.length} project{visibleProjects.length === 1 ? "" : "s"}</span></div>
          <div className="grid min-w-0 gap-4">{visibleProjects.map(({ project, introductions }) => <ProjectCard key={project.id} project={project} introductions={introductions} ownerView={ownerView} memberById={memberById} sharedContacts={snapshot.sharedContacts} feedback={feedback} pendingId={pendingId} isMutating={isMutating} onTransition={(id, action) => void transition(id, action)} />)}</div>
        </section>
      ) : (
        <Card className="flex min-h-72 flex-col items-center justify-center border-dashed p-6 text-center">
          <span aria-hidden="true" className="grid size-12 place-items-center rounded-2xl bg-surface-overlay text-accent-strong">{ownerView ? <Send className="size-5" /> : <Clock3 className="size-5" />}</span>
          <h2 className="mt-4 text-base font-semibold text-main">{ownerView ? "No projects yet" : "No requests for this member"}</h2>
          <p className="mt-2 max-w-md text-xs leading-5 text-muted">{ownerView ? "Build a team from a parsed brief, then request introductions for the members you select." : "Select a candidate who has an introduction request, or wait for an owner to reach out."}</p>
          {ownerView ? <Button asChild className="mt-4"><Link href="/team-builder">Open Team Builder<ArrowRight aria-hidden="true" className="size-4" /></Link></Button> : <Button variant="secondary" className="mt-4" onClick={() => setCandidateActorId(snapshot.members.find((member) => member.id !== "mem-ada" && snapshot.introductions.some((introduction) => introduction.memberId === member.id))?.id ?? candidateActorId)}>Show a candidate with a request</Button>}
        </Card>
      )}

      <Card className="border-line/80 bg-surface-raised/55">
        <CardContent className="flex items-start gap-3 p-4 sm:p-5"><ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-accent-strong" /><div><h2 className="text-sm font-semibold text-main">Contact details stay private until shared</h2><p className="mt-1 text-xs leading-5 text-muted">Accepting an introduction does not reveal an email. The owner must confirm the collaboration, then choose Share contact details. Shared addresses use the reserved fictional <code className="font-mono text-accent-strong">.test</code> domain.</p></div></CardContent>
      </Card>
    </div>
  );
}
