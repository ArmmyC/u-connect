"use client";

import Link from "next/link";
import {
  Activity,
  Blocks,
  BriefcaseBusiness,
  Compass,
  LayoutDashboard,
  Network,
  Sparkles,
  UsersRound,
  Workflow,
} from "lucide-react";
import { twMerge } from "tailwind-merge";

const navigation = [
  {
    label: "Workspace",
    links: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Discover",
    links: [
      { href: "/members", label: "Members", icon: UsersRound },
      { href: "/opportunities", label: "Opportunities", icon: BriefcaseBusiness },
    ],
  },
  {
    label: "Collaborate",
    links: [
      { href: "/agent", label: "AI Agent", icon: Sparkles },
      { href: "/team-builder", label: "Team Builder", icon: Workflow },
      { href: "/network", label: "Network", icon: Network },
    ],
  },
  {
    label: "Developer tools",
    links: [{ href: "/playground", label: "Agent Playground", icon: Blocks }],
  },
];

interface SidebarProps {
  pathname: string;
  onNavigate?: () => void;
  className?: string;
}

export function Sidebar({ pathname, onNavigate, className }: SidebarProps) {
  return (
    <aside className={twMerge("flex h-full flex-col px-4 py-5", className)}>
      <Link href="/" onClick={onNavigate} className="group flex items-center gap-3 rounded-xl px-2 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
        <span className="grid size-10 place-items-center rounded-[14px] bg-accent text-accent-foreground shadow-sm transition-transform group-hover:rotate-[-5deg]">
          <span className="text-lg font-black tracking-tight">U</span>
        </span>
        <span className="min-w-0">
          <span className="block text-[15px] font-bold tracking-tight text-main">U-Connect</span>
          <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-faint">Community workspace</span>
        </span>
      </Link>

      <div className="mt-8 flex items-center justify-between px-2">
        <span className="eyebrow">Workspace</span>
        <span aria-hidden="true" className="size-1.5 rounded-full bg-success shadow-[0_0_10px_var(--success)]" />
      </div>

      <nav aria-label="Main navigation" className="mt-3 flex-1 space-y-5 overflow-y-auto pb-6">
        {navigation.map((group) => (
          <section key={group.label} aria-label={group.label}>
            {group.label !== "Workspace" && <h2 className="eyebrow mb-2 px-3">{group.label}</h2>}
            <ul className="space-y-1">
              {group.links.map(({ href, label, icon: Icon }) => {
                const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className="nav-link flex min-h-10 items-center gap-3 rounded-xl px-3 text-[13px] font-medium"
                    >
                      <Icon aria-hidden="true" className={twMerge("size-[17px]", active ? "text-accent-strong" : "text-faint")} strokeWidth={1.8} />
                      <span>{label}</span>
                      {label === "Network" && <span className="ml-auto size-1.5 rounded-full bg-warning" aria-label="Review introductions" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </nav>

      <div className="rounded-2xl border border-line bg-surface-raised p-3.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-main">
          <Compass aria-hidden="true" className="size-4 text-accent" />
          Demo environment
        </div>
        <p className="mt-2 text-[11px] leading-5 text-muted">Fictional profiles and opportunities. No external accounts connected.</p>
        <div className="mt-3 flex items-center gap-1.5 text-[10px] font-medium text-faint">
          <Activity aria-hidden="true" className="size-3.5" />
          Local data workspace
        </div>
      </div>
    </aside>
  );
}
