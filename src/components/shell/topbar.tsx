"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Menu, Moon, Search, Sun } from "lucide-react";
import { useDemo } from "@/components/demo-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TopbarProps {
  onMenuClick: () => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
}

export function Topbar({ onMenuClick, theme, onToggleTheme }: TopbarProps) {
  const router = useRouter();
  const { snapshot, actorId, actorMode, candidateActorId, setActorMode, setCandidateActorId } = useDemo();
  const [query, setQuery] = useState("");

  const pendingCount = useMemo(() => {
    if (!snapshot) return 0;
    if (actorMode === "candidate") return snapshot.introductions.filter((intro) => intro.memberId === actorId && intro.status === "pending").length;
    const ownedProjects = new Set(snapshot.projects.filter((project) => project.ownerId === actorId).map((project) => project.id));
    return snapshot.introductions.filter((intro) => ownedProjects.has(intro.projectId) && intro.status === "pending").length;
  }, [snapshot, actorId, actorMode]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    router.push(value ? `/members?query=${encodeURIComponent(value)}` : "/members");
  }

  function handleActorChange(value: string) {
    if (value === "owner") {
      setActorMode("owner");
      return;
    }
    const candidateId = value.startsWith("candidate:") ? value.slice("candidate:".length) : "mem-erin";
    setCandidateActorId(candidateId);
    setActorMode("candidate");
  }

  return (
    <header className="topbar sticky top-0 z-30 flex h-[68px] items-center gap-2 px-4 md:gap-4 md:px-7 xl:px-9">
      <Button id="mobile-navigation-trigger" variant="subtle" size="icon" className="shrink-0 lg:hidden" aria-label="Open navigation menu" onClick={onMenuClick}>
        <Menu aria-hidden="true" className="size-5" />
      </Button>

      <div className="hidden min-w-0 flex-1 items-center md:flex">
        <span className="text-xs font-medium text-faint">U-CONNECT</span>
        <span aria-hidden="true" className="mx-3 h-4 w-px bg-line" />
        <span className="truncate text-xs font-medium text-muted">Community workspace</span>
      </div>

      <form role="search" onSubmit={handleSearch} className="hidden w-full max-w-[350px] items-center md:flex">
        <label className="sr-only" htmlFor="global-search">Search members and opportunities</label>
        <div className="relative w-full">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-faint" />
          <Input id="global-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the community…" className="h-10 border-transparent bg-surface-raised pl-10 pr-14 text-xs shadow-none hover:border-line-strong" />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-faint">↵</kbd>
        </div>
      </form>

      <div className="ml-auto flex shrink-0 items-center gap-1.5 md:ml-0 md:gap-2.5">
        <Link href="/members" className="grid size-9 place-items-center rounded-control text-muted transition-colors hover:bg-surface-raised hover:text-main md:hidden" aria-label="Open member search">
          <Search aria-hidden="true" className="size-[18px]" />
        </Link>

        <Link href="/network" className="relative grid size-9 place-items-center rounded-control text-muted transition-colors hover:bg-surface-raised hover:text-main" aria-label={pendingCount ? `Network, ${pendingCount} pending introductions` : "Network, no pending introductions"}>
          <Bell aria-hidden="true" className="size-[18px]" />
          {pendingCount > 0 && <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-accent px-1 text-[9px] font-bold leading-4 text-accent-foreground">{pendingCount}</span>}
        </Link>

        <span aria-hidden="true" className="mx-0.5 h-7 w-px bg-line md:mx-1" />

        <label className="sr-only" htmlFor="demo-actor">Act as demo member</label>
        <select
          id="demo-actor"
          aria-label="Demo actor"
          value={actorMode === "owner" ? "owner" : `candidate:${candidateActorId}`}
          onChange={(event) => handleActorChange(event.target.value)}
          className="h-9 max-w-[132px] cursor-pointer rounded-control border border-line bg-surface px-2.5 text-[11px] font-semibold text-main outline-none transition-colors hover:border-line-strong focus-visible:ring-2 focus-visible:ring-accent sm:max-w-[170px] sm:px-3 sm:text-xs"
        >
          <option value="owner">Owner · {snapshot?.members.find((member) => member.id === "mem-ada")?.name.split(" ")[0] ?? "Ada"}</option>
          {(snapshot?.members ?? []).filter((member) => member.id !== "mem-ada").map((member) => (
            <option key={member.id} value={`candidate:${member.id}`}>Candidate · {member.name.split(" ")[0]}</option>
          ))}
        </select>

        <Button variant="subtle" size="icon" onClick={onToggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`} title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`} className="size-9">
          {theme === "dark" ? <Sun aria-hidden="true" className="size-[17px]" /> : <Moon aria-hidden="true" className="size-[17px]" />}
        </Button>
      </div>
    </header>
  );
}
