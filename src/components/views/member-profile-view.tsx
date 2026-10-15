"use client";

import Link from "next/link";
import { ArrowLeft, ArrowUpRight, BriefcaseBusiness, Github, MapPin, Network, ShieldCheck, Sparkles } from "lucide-react";
import type { Member } from "@/lib/types";
import { useDemo } from "@/components/demo-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function MemberProfileContent({ member, sharedContact }: { member: Member; sharedContact?: { email: string } }) {
  return (
    <div className="space-y-5 px-page py-6 md:py-8">
      <Button asChild variant="subtle" size="sm" className="-ml-2"><Link href="/members"><ArrowLeft aria-hidden="true" className="size-3.5" />Back to members</Link></Button>

      <section className="relative overflow-hidden rounded-card border border-line bg-surface-raised p-5 sm:p-7">
        <div aria-hidden="true" className="absolute -right-12 -top-20 size-64 rounded-full bg-accent/5 blur-3xl" />
        <div className="relative flex min-w-0 flex-col gap-5 sm:flex-row sm:items-start">
          <span aria-hidden="true" className="grid size-16 shrink-0 place-items-center rounded-[1.4rem] border border-accent/20 bg-accent-soft text-xl font-bold text-accent-strong">{member.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="eyebrow">Public member profile</p>
                <h1 className="mt-1.5 break-words text-2xl font-semibold tracking-tight text-main sm:text-3xl">{member.name}</h1>
                <p className="mt-1.5 text-sm text-muted">{member.headline}</p>
              </div>
              <Badge variant={member.availability === "available" ? "success" : member.availability === "part-time" ? "warning" : "default"}>{member.availability}</Badge>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant="info" className="capitalize">{member.role}</Badge>
              <Badge variant="default"><MapPin aria-hidden="true" className="size-3" />{member.location}</Badge>
              {member.openToCollaborate && <Badge variant="mint">Open to collaborate</Badge>}
              {member.openToHire && <Badge variant="default">Open to hire</Badge>}
            </div>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-main">{member.bio}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {member.portfolioUrl && <a href={member.portfolioUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-2 rounded-control border border-line-strong bg-surface px-3 text-xs font-semibold text-main transition-colors hover:bg-surface-overlay"><ArrowUpRight aria-hidden="true" className="size-3.5" />Portfolio</a>}
              {member.githubUrl && <a href={member.githubUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-2 rounded-control border border-line-strong bg-surface px-3 text-xs font-semibold text-main transition-colors hover:bg-surface-overlay"><Github aria-hidden="true" className="size-3.5" />GitHub demo</a>}
            </div>
          </div>
        </div>
      </section>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_310px]">
        <div className="min-w-0 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Project evidence</CardTitle>
              <CardDescription>Examples listed by this fictional demo member.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {member.projects.length ? <ul className="space-y-3">{member.projects.map((project) => <li key={project} className="flex gap-3 rounded-xl border border-line/70 bg-surface-raised/60 p-3.5"><span aria-hidden="true" className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent-strong"><BriefcaseBusiness className="size-3.5" /></span><p className="min-w-0 text-xs leading-5 text-main">{project}</p></li>)}</ul> : <p className="text-sm text-muted">No project examples have been listed.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Skills and interests</CardTitle>
              <CardDescription>Use these as starting points for a focused conversation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div>
                <h3 className="mb-2 text-xs font-semibold text-main">Skills</h3>
                <div className="flex flex-wrap gap-1.5">{member.skills.map((skill) => <Badge key={skill} variant="default">{skill}</Badge>)}</div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="mb-2 text-xs font-semibold text-main">Interests</h3>
                  <ul className="space-y-1.5 text-xs leading-5 text-muted">{member.interests.map((interest) => <li key={interest}>· {interest}</li>)}</ul>
                </div>
                <div>
                  <h3 className="mb-2 text-xs font-semibold text-main">Preferred work</h3>
                  <ul className="space-y-1.5 text-xs leading-5 text-muted">{member.preferredWork.map((work) => <li key={work}>· {work}</li>)}</ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="min-w-0 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Working details</CardTitle>
              <CardDescription>Listed terms from the public profile.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <div className="rounded-xl border border-line/70 bg-surface-raised/60 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-faint">Compensation</p>
                <p className="mt-1.5 break-words text-sm font-semibold text-main">{member.compensation}</p>
                <p className="mt-1 text-[10px] text-faint">Listed unit: {member.compensationUnit}</p>
              </div>
              <div className="rounded-xl border border-line/70 bg-surface-raised/60 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-faint">Availability</p>
                <p className="mt-1.5 text-sm font-semibold capitalize text-main">{member.availability}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-accent/15 bg-accent-soft/30">
            <CardContent className="p-4">
              <div className="flex items-start gap-2.5">
                <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-accent-strong" />
                <div className="min-w-0">
                  <h2 className="text-xs font-semibold text-main">Contact privacy</h2>
                  {sharedContact ? (
                    <a href={`mailto:${sharedContact.email}`} className="mt-2 block break-all text-xs font-medium text-accent-strong underline underline-offset-2">{sharedContact.email}</a>
                  ) : (
                    <p className="mt-1.5 text-[11px] leading-5 text-muted">Private details appear here only after the member accepts an introduction and the project owner shares contact information.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-2 p-4">
              <p className="text-xs font-semibold text-main"><Sparkles aria-hidden="true" className="mr-1.5 inline size-3.5 text-accent" />Continue exploring</p>
              <Button asChild variant="secondary" size="sm" className="w-full justify-between"><Link href="/opportunities">Browse opportunities<ArrowUpRight aria-hidden="true" className="size-3.5" /></Link></Button>
              <Button asChild variant="subtle" size="sm" className="w-full justify-between"><Link href="/network">Open network<Network aria-hidden="true" className="size-3.5" /></Link></Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

export function MemberProfileView({ memberId }: { memberId: string }) {
  const { snapshot, loadStatus, loadError, refresh } = useDemo();
  if (!snapshot) {
    if (loadStatus === "error") return <div className="px-page py-8"><Card className="p-6 text-center"><h1 className="text-base font-semibold text-main">Profile unavailable</h1><p role="alert" className="mt-2 text-xs text-muted">{loadError ?? "The local demo service is unavailable."}</p><Button variant="secondary" className="mt-4" onClick={() => void refresh().catch(() => undefined)}>Try again</Button></Card></div>;
    return <div role="status" aria-live="polite" className="px-page py-10 text-sm text-muted">Loading member profile…</div>;
  }
  const member = snapshot.members.find((item) => item.id === memberId);
  if (!member) return <div className="px-page py-8"><Card className="p-6"><p className="eyebrow">Profile not found</p><h1 className="mt-2 text-xl font-semibold text-main">That member is not in this demo catalog.</h1><Button asChild variant="secondary" size="sm" className="mt-4"><Link href="/members"><ArrowLeft aria-hidden="true" className="size-3.5" />Back to members</Link></Button></Card></div>;
  return <MemberProfileContent member={member} sharedContact={snapshot.sharedContacts[memberId]} />;
}
