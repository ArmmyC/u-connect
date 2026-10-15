"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, CircleAlert, LoaderCircle, RefreshCw, Sparkles, UsersRound } from "lucide-react";
import { useDemo, type AgentResponse, type ProjectDraft } from "@/components/demo-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createProjectAndRequestIntroductions, type TeamBuilderWorkflowStep } from "@/lib/team-builder-workflow";
import { parseAgentRequest } from "@/lib/agent";
import type { Member } from "@/lib/types";

const teamStarter = "I need a frontend developer and a UI/UX designer to launch my startup MVP";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function titleForBrief(brief: string) {
  return /marketplace/i.test(brief) ? "Community marketplace MVP" : /mvp|startup/i.test(brief) ? "Startup MVP collaboration" : "New community project";
}

function recommendationsFor(response: AgentResponse | null, members: Member[], ownerId: string) {
  if (!response || response.parsed.mode !== "team") return [];
  return response.results.flatMap((value) => {
    if (!isRecord(value)) return [];
    const candidate = isRecord(value.member) ? value.member : value;
    if (typeof candidate.id !== "string" || candidate.id === ownerId) return [];
    const member = members.find((item) => item.id === candidate.id);
    if (!member) return [];
    return [{
      member,
      score: typeof value.score === "number" ? value.score : null,
      requestedRole: typeof value.requestedRole === "string" ? value.requestedRole : null,
      reasons: Array.isArray(value.reasons) ? value.reasons.filter((reason): reason is string => typeof reason === "string") : [],
    }];
  });
}

function recommendedIdsFor(response: AgentResponse | null, ownerId: string) {
  if (!response || response.parsed.mode !== "team") return [];
  return response.results.flatMap((value) => {
    if (!isRecord(value)) return [];
    const member = isRecord(value.member) ? value.member : value;
    return typeof member.id === "string" && member.id !== ownerId ? [member.id] : [];
  });
}

function teamSummary(response: AgentResponse | null) {
  const output = response?.toolCalls[0]?.output;
  if (!output?.ok || !isRecord(output.result)) return { filledRoles: [] as string[], unfilledRoles: [] as string[] };
  return {
    filledRoles: Array.isArray(output.result.filledRoles) ? output.result.filledRoles.filter((role): role is string => typeof role === "string") : [],
    unfilledRoles: Array.isArray(output.result.unfilledRoles) ? output.result.unfilledRoles.filter((role): role is string => typeof role === "string") : [],
  };
}

function LoadingState() {
  return <div role="status" aria-live="polite" className="grid min-h-60 place-items-center text-sm text-muted">Loading the team workspace…</div>;
}

export function TeamBuilderView() {
  const router = useRouter();
  const {
    snapshot, loadStatus, loadError, refresh, actor, actorId, actorMode, setActorMode,
    agentResponse, agentPending, actionFeedback, runAgent, createProject, requestIntroduction,
  } = useDemo();
  const initialTeamResponse = agentResponse?.parsed.mode === "team" ? agentResponse : null;
  const initialBrief = initialTeamResponse?.parsed.intent ?? teamStarter;
  const [brief, setBrief] = useState(initialBrief);
  const [projectTitle, setProjectTitle] = useState(titleForBrief(initialBrief));
  const [projectDescription, setProjectDescription] = useState(initialBrief);
  const [projectBudget, setProjectBudget] = useState(initialTeamResponse?.parsed.budgetTHB === undefined ? "" : String(initialTeamResponse.parsed.budgetTHB));
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(() => recommendedIdsFor(initialTeamResponse, actorId));
  const [workflowSteps, setWorkflowSteps] = useState<TeamBuilderWorkflowStep[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [briefError, setBriefError] = useState<string | null>(null);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [workflowMessage, setWorkflowMessage] = useState<string | null>(null);

  const parsedBrief = useMemo(() => parseAgentRequest(brief), [brief]);
  const teamResponse = agentResponse?.parsed.intent.trim() === brief.trim() && agentResponse.parsed.mode === "team" ? agentResponse : null;
  const recommendations = useMemo(() => recommendationsFor(teamResponse, snapshot?.members ?? [], actorId), [teamResponse, snapshot, actorId]);
  const summary = useMemo(() => teamSummary(teamResponse), [teamResponse]);

  async function findTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = brief.trim();
    if (!text) {
      setBriefError("Describe the roles or skills you need for this project.");
      return;
    }
    setBriefError(null);
    setWorkflowMessage(null);
    setProjectTitle(titleForBrief(text));
    setProjectDescription(text);
    setProjectBudget(parsedBrief.budgetTHB === undefined ? "" : String(parsedBrief.budgetTHB));
    try {
      const result = await runAgent(text);
      if (result.parsed.mode === "team") {
        setSelectedMemberIds(recommendedIdsFor(result, actorId));
        setProjectTitle(titleForBrief(result.parsed.intent));
        setProjectDescription(result.parsed.intent);
        setProjectBudget(result.parsed.budgetTHB === undefined ? "" : String(result.parsed.budgetTHB));
        setWorkflowSteps([]);
      }
    } catch {
      // The provider exposes the service error as feedback above the form.
    }
  }

  function toggleMember(memberId: string) {
    setSelectedMemberIds((current) => current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId]);
  }

  async function createProjectAndIntros() {
    if (!snapshot || actorMode !== "owner") return;
    if (!teamResponse || !recommendations.length) {
      setProjectError("Run the brief through the agent and select at least one recommended member first.");
      return;
    }
    if (!selectedMemberIds.length) {
      setProjectError("Select at least one member to request an introduction.");
      return;
    }
    if (!projectTitle.trim() || !projectDescription.trim()) {
      setProjectError("Add a project title and short description before saving.");
      return;
    }
    const amount = projectBudget.trim() ? Number(projectBudget) : undefined;
    if (amount !== undefined && (!Number.isFinite(amount) || amount < 0)) {
      setProjectError("Enter a valid non-negative budget amount.");
      return;
    }

    setProjectError(null);
    setWorkflowMessage(null);
    setWorkflowSteps([]);
    setIsCreating(true);
    const draft: ProjectDraft = {
      title: projectTitle.trim(),
      description: projectDescription.trim(),
      skills: teamResponse.parsed.skills,
      ...(amount !== undefined ? { budgetTHB: amount } : {}),
    };

    try {
      const outcome = await createProjectAndRequestIntroductions({
        draft,
        memberIds: selectedMemberIds,
        createProject,
        requestIntroduction,
        onStep: (step) => setWorkflowSteps((current) => [...current.filter((item) => item.id !== step.id), step]),
      });
      if (outcome.failures.length) {
        setWorkflowMessage(`Project saved and ${outcome.introductions.length} introduction request${outcome.introductions.length === 1 ? "" : "s"} sent. ${outcome.failures.length} request${outcome.failures.length === 1 ? "" : "s"} need attention.`);
        return;
      }
      setWorkflowMessage(`Project saved with ${outcome.introductions.length} pending introduction request${outcome.introductions.length === 1 ? "" : "s"}. Opening Network…`);
      router.push("/network");
    } catch (error) {
      setWorkflowMessage(error instanceof Error ? error.message : "The project could not be saved.");
    } finally {
      setIsCreating(false);
    }
  }

  if (!snapshot) {
    if (loadStatus === "error") return <div className="px-page py-8"><Card className="p-6 text-center"><h1 className="text-base font-semibold text-main">Team Builder is unavailable</h1><p role="alert" className="mt-2 text-xs text-muted">{loadError ?? "The local demo workspace did not respond."}</p><Button className="mt-4" variant="secondary" onClick={() => void refresh().catch(() => undefined)}><RefreshCw aria-hidden="true" className="size-4" />Try again</Button></Card></div>;
    return <LoadingState />;
  }

  const selectedCount = selectedMemberIds.length;
  const ownerMode = actorMode === "owner" && actorId === "mem-ada";

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-5 px-page py-6 md:py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow">From brief to introductions</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-main sm:text-3xl">Team Builder</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Turn a short project brief into a role-covered team, then choose who should receive an introduction request.</p>
        </div>
        <Badge variant="info"><UsersRound aria-hidden="true" className="size-3.5" />{snapshot.members.length} fictional profiles</Badge>
      </header>

      {loadError && <p role="status" className="rounded-control border border-warning/20 bg-warning-soft px-4 py-3 text-xs leading-5 text-warning">The latest refresh failed. The last loaded workspace is still shown.</p>}

      <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Describe the team you need</CardTitle>
            <CardDescription>Roles, skills, and an optional budget are parsed from free-form text.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <form onSubmit={(event) => void findTeam(event)}>
              <label className="sr-only" htmlFor="team-brief">Team brief</label>
              <Textarea id="team-brief" value={brief} onChange={(event) => { setBrief(event.target.value); if (briefError) setBriefError(null); }} aria-invalid={Boolean(briefError)} aria-describedby={briefError ? "team-brief-error" : "team-brief-hint"} className="min-h-32 bg-bg/60 px-4" placeholder="Example: I need a frontend developer and a UI/UX designer to launch my startup MVP" />
              {briefError ? <p id="team-brief-error" role="alert" className="mt-2 text-xs text-danger">{briefError}</p> : <p id="team-brief-hint" className="mt-2 text-[11px] text-faint">The agent uses the shared local matching tools and does not create a project until you choose the action below.</p>}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <Button type="submit" variant="secondary" disabled={agentPending}>{agentPending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Sparkles aria-hidden="true" className="size-4" />}{agentPending ? "Finding a team…" : "Find recommended team"}</Button>
                {teamResponse && <Badge variant="success"><Check aria-hidden="true" className="size-3.5" />Brief parsed</Badge>}
              </div>
            </form>

            {actionFeedback?.status === "error" && agentResponse?.parsed.intent.trim() === brief.trim() && <p role="alert" className="rounded-control border border-danger/20 bg-danger-soft px-3.5 py-3 text-xs leading-5 text-danger">{actionFeedback.message}</p>}

            <section aria-label="Parsed project requirements" className="rounded-2xl border border-line bg-surface-raised/70 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="eyebrow">Parsed brief</p><h2 className="mt-1 text-sm font-semibold text-main">{parsedBrief.mode === "team" ? "Team recommendation" : `Current intent: ${parsedBrief.mode}`}</h2></div>
                <Badge variant="accent">{parsedBrief.count} requested</Badge>
              </div>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="min-w-0"><dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-faint">Roles</dt><dd className="mt-1 break-words text-xs leading-5 text-main">{parsedBrief.roles.length ? parsedBrief.roles.join(", ") : "No specific role found"}</dd></div>
                <div className="min-w-0"><dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-faint">Skills</dt><dd className="mt-1 flex flex-wrap gap-1.5">{parsedBrief.skills.length ? parsedBrief.skills.map((skill) => <Badge key={skill} variant="default">{skill}</Badge>) : <span className="text-xs text-main">No specific skill found</span>}</dd></div>
                <div className="min-w-0 sm:col-span-2"><dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-faint">Budget</dt><dd className="mt-1 text-xs text-main">{parsedBrief.budgetTHB !== undefined ? `฿${parsedBrief.budgetTHB.toLocaleString("en-US")}${parsedBrief.budgetUnit ? ` / ${parsedBrief.budgetUnit}` : " · unit not specified"}` : "No explicit budget found"}</dd></div>
              </dl>
            </section>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader className="flex-row items-start justify-between gap-3">
            <div><p className="eyebrow">Transparent matches</p><CardTitle className="mt-1">Recommended members</CardTitle><CardDescription className="mt-1">Scores include grounded skill and project evidence. Select the people you want to contact.</CardDescription></div>
            <Badge variant="default">{recommendations.length} matches</Badge>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            {!teamResponse ? (
              <div className="rounded-2xl border border-dashed border-line-strong px-4 py-8 text-center">
                <span aria-hidden="true" className="mx-auto grid size-10 place-items-center rounded-xl bg-surface-overlay text-accent-strong"><Sparkles className="size-4" /></span>
                <p className="mt-3 text-sm font-semibold text-main">Run the brief to see matching members</p>
                <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-muted">The recommendation includes role coverage, fit scores, and the profile evidence behind each result.</p>
              </div>
            ) : recommendations.length ? (
              <>
                {(summary.filledRoles.length > 0 || summary.unfilledRoles.length > 0) && <div className="flex flex-wrap gap-1.5">{summary.filledRoles.map((role) => <Badge key={`filled-${role}`} variant="success"><Check aria-hidden="true" className="size-3" />{role}</Badge>)}{summary.unfilledRoles.map((role) => <Badge key={`unfilled-${role}`} variant="warning"><CircleAlert aria-hidden="true" className="size-3" />Needs a match: {role}</Badge>)}</div>}
                <fieldset className="grid gap-3 sm:grid-cols-2">
                  <legend className="sr-only">Select members for introduction requests</legend>
                  {recommendations.map(({ member, score, requestedRole, reasons }) => {
                    const checked = selectedMemberIds.includes(member.id);
                    return (
                      <label key={member.id} className={`flex min-w-0 cursor-pointer items-start gap-3 rounded-2xl border p-3 transition-colors focus-within:ring-2 focus-within:ring-accent ${checked ? "border-accent/40 bg-accent-soft/35" : "border-line bg-surface-raised/50 hover:border-line-strong"}`}>
                        <input type="checkbox" checked={checked} onChange={() => toggleMember(member.id)} aria-label={`Select ${member.name} for an introduction`} className="mt-1 size-4 shrink-0 accent-accent" />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-start justify-between gap-2"><span className="min-w-0"><span className="block truncate text-sm font-semibold text-main">{member.name}</span><span className="mt-0.5 block truncate text-[11px] text-muted">{requestedRole ?? member.headline}</span></span>{score !== null && <Badge variant="accent" className="shrink-0">{score} fit</Badge>}</span>
                          <span className="mt-2 block text-[11px] leading-5 text-muted">{reasons[0] ?? `Profile lists ${member.skills.slice(0, 3).join(", ")}.`}</span>
                          {member.projects[0] && <span className="mt-2 block border-t border-line/70 pt-2 text-[10px] leading-4 text-faint">Project evidence: {member.projects[0]}</span>}
                        </span>
                      </label>
                    );
                  })}
                </fieldset>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-line-strong px-4 py-8 text-center"><p className="text-sm font-semibold text-main">No members matched this brief</p><p className="mt-1 text-xs leading-5 text-muted">Try broader role wording or remove a skill constraint.</p></div>
            )}
          </CardContent>
        </Card>
      </section>

      {teamResponse && recommendations.length > 0 && (
        <Card className="min-w-0 overflow-hidden border-accent/20">
          <CardHeader>
            <p className="eyebrow">Project setup</p>
            <CardTitle>Create the project and request introductions</CardTitle>
            <CardDescription>Requests are sent one by one. Candidates decide whether to accept; contact details remain private until you confirm and share.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div><label htmlFor="team-project-title" className="mb-1.5 block text-xs font-medium text-muted">Project title</label><Input id="team-project-title" value={projectTitle} onChange={(event) => setProjectTitle(event.target.value)} maxLength={100} /></div>
              <div><label htmlFor="team-project-budget" className="mb-1.5 block text-xs font-medium text-muted">Project budget in THB · optional</label><Input id="team-project-budget" type="number" min="0" step="1000" value={projectBudget} onChange={(event) => setProjectBudget(event.target.value)} placeholder="No budget set" /></div>
              <div className="md:col-span-2"><label htmlFor="team-project-description" className="mb-1.5 block text-xs font-medium text-muted">Project summary</label><Textarea id="team-project-description" value={projectDescription} onChange={(event) => setProjectDescription(event.target.value)} maxLength={1000} className="min-h-24" /></div>
            </div>

            {actorMode !== "owner" && <div role="status" className="flex flex-col gap-3 rounded-xl border border-warning/20 bg-warning-soft p-3.5 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs leading-5 text-warning">Project creation uses the demo owner account. Switch to Owner mode before saving this team plan.</p><Button size="sm" variant="secondary" onClick={() => setActorMode("owner")}>Switch to Owner</Button></div>}
            {projectError && <p role="alert" className="rounded-control border border-danger/20 bg-danger-soft px-3.5 py-3 text-xs text-danger">{projectError}</p>}
            {workflowMessage && <p role={workflowSteps.some((step) => step.status === "error") ? "alert" : "status"} aria-live="polite" className={`rounded-control border px-3.5 py-3 text-xs leading-5 ${workflowSteps.some((step) => step.status === "error") ? "border-danger/20 bg-danger-soft text-danger" : "border-success/20 bg-success-soft text-success"}`}>{workflowMessage}</p>}

            {workflowSteps.length > 0 && <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3" aria-label="Project and introduction progress">{workflowSteps.map((step) => <li key={step.id} role="status" className={`flex min-w-0 items-start gap-2 rounded-xl border px-3 py-2.5 text-[11px] leading-4 ${step.status === "success" ? "border-success/20 bg-success-soft text-success" : step.status === "error" ? "border-danger/20 bg-danger-soft text-danger" : "border-line bg-surface-raised text-muted"}`}><span aria-hidden="true" className="mt-0.5 shrink-0">{step.status === "pending" ? <LoaderCircle className="size-3.5 animate-spin" /> : step.status === "success" ? <Check className="size-3.5" /> : <CircleAlert className="size-3.5" />}</span><span className="min-w-0"><span className="block font-semibold text-main">{step.kind === "project" ? projectTitle || "Project" : snapshot.members.find((member) => member.id === step.memberId)?.name ?? "Member"}</span><span className="block break-words">{step.message}</span></span></li>)}</ol>}

            <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted">{selectedCount} member{selectedCount === 1 ? "" : "s"} selected · owner {actor?.name ?? "Ada"}</p>
              <div className="flex flex-wrap gap-2">
                {workflowMessage && workflowSteps.some((step) => step.status === "success") && <Button asChild variant="secondary"><Link href="/network">View Network<ArrowRight aria-hidden="true" className="size-4" /></Link></Button>}
                <Button disabled={isCreating || !ownerMode || !selectedCount} onClick={() => void createProjectAndIntros()}>
                  {isCreating ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <UsersRound aria-hidden="true" className="size-4" />}
                  {isCreating ? "Saving project and requests…" : `Create project & request introductions`}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-center text-[10px] leading-5 text-faint">All recommendations are based on fictional public profiles. Introduction requests do not reveal private contacts.</p>
    </div>
  );
}
