"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { ParsedAgentRequest } from "@/lib/agent";
import type { ToolResult } from "@/lib/tools";
import type { ToolName } from "@/lib/validation";
import type { DemoState, Introduction, Interest, Member, Project } from "@/lib/types";

export type DemoActorMode = "owner" | "candidate";
export const demoActorStorageKey = "u-connect-demo-actor";
export const demoCandidateStorageKey = "u-connect-demo-candidate";
const demoActorIds: Record<DemoActorMode, string> = { owner: "mem-ada", candidate: "mem-erin" };
const actorChangeEvent = "u-connect-demo-actor-change";
let fallbackActorMode: DemoActorMode = "owner";
let fallbackCandidateId = demoActorIds.candidate;

export type AgentResponse = {
  parsed: ParsedAgentRequest;
  toolCalls: Array<{ tool: string; input: unknown; output: ToolResult }>;
  results: unknown[];
  nextSteps: string[];
};

export function restoreDemoActorMode(value: unknown): DemoActorMode {
  return value === "candidate" ? "candidate" : "owner";
}

export function getDemoActorId(mode: DemoActorMode, candidateId = fallbackCandidateId): string {
  return mode === "owner" ? demoActorIds.owner : candidateId;
}

export function restoreDemoCandidateId(value: unknown): string {
  return typeof value === "string" && value.startsWith("mem-") ? value : demoActorIds.candidate;
}

function subscribeToActor(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(actorChangeEvent, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(actorChangeEvent, onChange);
  };
}

function getStoredActorMode(): DemoActorMode {
  try {
    return restoreDemoActorMode(window.localStorage.getItem(demoActorStorageKey));
  } catch {
    return fallbackActorMode;
  }
}

function getServerActorMode(): DemoActorMode {
  return "owner";
}

function getStoredCandidateId(): string {
  try {
    return restoreDemoCandidateId(window.localStorage.getItem(demoCandidateStorageKey));
  } catch {
    return fallbackCandidateId;
  }
}

export interface StateSnapshot extends Omit<DemoState, "members"> {
  members: Member[];
  sharedContacts: Record<string, { email: string }>;
}

export type DemoLoadStatus = "loading" | "refreshing" | "success" | "error";
export interface DemoFeedback {
  status: "pending" | "success" | "error";
  message: string;
}

export interface ProjectDraft {
  title: string;
  description: string;
  skills: string[];
  budgetTHB?: number;
}

interface DemoProviderValue {
  snapshot: StateSnapshot | null;
  loadStatus: DemoLoadStatus;
  loadError: string | null;
  refresh: (options?: { quiet?: boolean }) => Promise<void>;
  actorMode: DemoActorMode;
  candidateActorId: string;
  actorId: string;
  actor: Member | null;
  setActorMode: (mode: DemoActorMode) => void;
  setCandidateActorId: (memberId: string) => void;
  setActorId: (memberId: string) => void;
  actionFeedback: DemoFeedback | null;
  clearActionFeedback: () => void;
  isMutating: boolean;
  agentPending: boolean;
  agentResponse: AgentResponse | null;
  runAgent: (text: string) => Promise<AgentResponse>;
  runTool: (tool: ToolName, input: unknown) => Promise<ToolResult>;
  createProject: (draft: ProjectDraft) => Promise<Project>;
  requestIntroduction: (projectId: string, memberId: string) => Promise<Introduction>;
  transitionIntroduction: (introductionId: string, action: "accept" | "decline" | "confirm" | "share_contact") => Promise<Introduction>;
  recordInterest: (opportunityId: string) => Promise<Interest>;
  resetDemo: () => Promise<StateSnapshot>;
}

const DemoContext = createContext<DemoProviderValue | null>(null);

class DemoApiError extends Error {
  constructor(message: string, readonly code = "REQUEST_FAILED") {
    super(message);
    this.name = "DemoApiError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStateSnapshot(value: unknown): value is StateSnapshot {
  return isRecord(value) && Array.isArray(value.members) && Array.isArray(value.opportunities) &&
    Array.isArray(value.projects) && Array.isArray(value.introductions) && Array.isArray(value.interests) &&
    isRecord(value.sharedContacts);
}

function isToolResult(value: unknown): value is ToolResult {
  if (!isRecord(value)) return false;
  if (value.ok === true) return typeof value.tool === "string" && "result" in value;
  return value.ok === false && isRecord(value.error) && typeof value.error.code === "string" && typeof value.error.message === "string";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "The local demo service could not complete the request.";
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: { Accept: "application/json", ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers },
    });
  } catch {
    throw new DemoApiError("Could not reach the local demo service. Check that the app is running.", "NETWORK_ERROR");
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const problem = isRecord(payload) && isRecord(payload.error) ? payload.error : null;
    throw new DemoApiError(
      problem && typeof problem.message === "string" ? problem.message : `The request failed (${response.status}).`,
      problem && typeof problem.code === "string" ? problem.code : "REQUEST_FAILED",
    );
  }
  if (payload === null) throw new DemoApiError("The local demo service returned an empty response.", "INVALID_RESPONSE");
  return payload as T;
}

function jsonBody(value: unknown): RequestInit {
  return { method: "POST", body: JSON.stringify(value) };
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<StateSnapshot | null>(null);
  const [loadStatus, setLoadStatus] = useState<DemoLoadStatus>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const actorMode = useSyncExternalStore(subscribeToActor, getStoredActorMode, getServerActorMode);
  const savedCandidateActorId = useSyncExternalStore(subscribeToActor, getStoredCandidateId, () => demoActorIds.candidate);
  const [actionFeedback, setActionFeedback] = useState<DemoFeedback | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const [agentPending, setAgentPending] = useState(false);
  const [agentResponse, setAgentResponse] = useState<AgentResponse | null>(null);
  const hasLoaded = useRef(false);
  const candidateActorId = snapshot?.members.some((member) => member.id === savedCandidateActorId)
    ? savedCandidateActorId
    : snapshot?.members.find((member) => member.id !== demoActorIds.owner)?.id ?? savedCandidateActorId;
  const actorId = actorMode === "owner" ? demoActorIds.owner : candidateActorId;

  const refresh = useCallback(async (options?: { quiet?: boolean }) => {
    if (!options?.quiet) setLoadStatus(hasLoaded.current ? "refreshing" : "loading");
    try {
      const nextSnapshot = await requestJson<unknown>("/api/state", { cache: "no-store" });
      if (!isStateSnapshot(nextSnapshot)) throw new DemoApiError("The state response has an unexpected shape.", "INVALID_RESPONSE");
      setSnapshot(nextSnapshot);
      setLoadError(null);
      hasLoaded.current = true;
      setLoadStatus("success");
    } catch (error) {
      const message = errorMessage(error);
      setLoadError(message);
      setLoadStatus(hasLoaded.current ? "success" : "error");
      throw error;
    }
  }, []);

  useEffect(() => {
    void refresh().catch(() => undefined);
  }, [refresh]);

  const setActorMode = useCallback((mode: DemoActorMode) => {
    fallbackActorMode = mode;
    try {
      window.localStorage.setItem(demoActorStorageKey, mode);
    } catch {
      setActionFeedback({ status: "error", message: "This browser could not save the demo actor selection." });
    }
    window.dispatchEvent(new Event(actorChangeEvent));
  }, []);

  const setCandidateActorId = useCallback((memberId: string) => {
    fallbackCandidateId = restoreDemoCandidateId(memberId);
    try {
      window.localStorage.setItem(demoCandidateStorageKey, fallbackCandidateId);
    } catch {
      setActionFeedback({ status: "error", message: "This browser could not save the candidate selection." });
    }
    window.dispatchEvent(new Event(actorChangeEvent));
  }, []);

  const setActorId = useCallback((memberId: string) => {
    if (memberId === demoActorIds.owner) {
      setActorMode("owner");
      return;
    }
    setCandidateActorId(memberId);
    setActorMode("candidate");
  }, [setActorMode, setCandidateActorId]);

  const clearActionFeedback = useCallback(() => setActionFeedback(null), []);

  const runTool = useCallback(async (tool: ToolName, input: unknown): Promise<ToolResult> => {
    try {
      const response = await fetch(`/api/tools/${tool}`, jsonBody({ actorId, input }));
      const payload: unknown = await response.json().catch(() => null);
      if (isToolResult(payload)) return payload;
      return { ok: false, error: { code: "INVALID_RESPONSE", message: "The tool endpoint returned an unexpected response." } };
    } catch {
      return { ok: false, error: { code: "NETWORK_ERROR", message: "Could not reach the local demo service. Check that the app is running." } };
    }
  }, [actorId]);

  const performMutation = useCallback(async function performMutation<T>(successMessage: string, operation: () => Promise<T>): Promise<T> {
    setIsMutating(true);
    setActionFeedback({ status: "pending", message: "Saving your change…" });
    try {
      const result = await operation();
      await refresh({ quiet: true });
      setActionFeedback({ status: "success", message: successMessage });
      return result;
    } catch (error) {
      setActionFeedback({ status: "error", message: errorMessage(error) });
      throw error;
    } finally {
      setIsMutating(false);
    }
  }, [refresh]);

  const runAgent = useCallback(async (text: string): Promise<AgentResponse> => {
    setAgentPending(true);
    setActionFeedback({ status: "pending", message: "Reading your brief and matching the demo catalog…" });
    try {
      const response = await requestJson<AgentResponse>("/api/agent", jsonBody({ text }));
      setAgentResponse(response);
      setActionFeedback({ status: "success", message: "Your brief is ready to review." });
      return response;
    } catch (error) {
      setActionFeedback({ status: "error", message: errorMessage(error) });
      throw error;
    } finally {
      setAgentPending(false);
    }
  }, []);

  const createProject = useCallback((draft: ProjectDraft) => performMutation("Project saved to your workspace.", async () => {
    const result = await runTool("create_project", { ownerId: actorId, ...draft });
    if (!result.ok) throw new DemoApiError(result.error.message, result.error.code);
    return result.result as Project;
  }), [actorId, performMutation, runTool]);

  const requestIntroduction = useCallback((projectId: string, memberId: string) => performMutation("Introduction request sent.", async () => {
    const result = await runTool("request_introduction", { projectId, memberId });
    if (!result.ok) throw new DemoApiError(result.error.message, result.error.code);
    return result.result as Introduction;
  }), [performMutation, runTool]);

  const transitionIntroduction = useCallback((introductionId: string, action: "accept" | "decline" | "confirm" | "share_contact") => performMutation(
    action === "share_contact" ? "Contact details shared after approval." : `Introduction ${({ accept: "accepted", decline: "declined", confirm: "confirmed" })[action]}.`,
    () => requestJson<{ ok: true; introduction: Introduction }>(`/api/intros/${encodeURIComponent(introductionId)}`, {
      method: "PATCH", body: JSON.stringify({ actorId, action }), headers: { "Content-Type": "application/json" },
    }).then((result) => result.introduction),
  ), [actorId, performMutation]);

  const recordInterest = useCallback((opportunityId: string) => performMutation("Your interest was recorded.", () =>
    requestJson<{ ok: true; interest: Interest }>(`/api/opportunities/${encodeURIComponent(opportunityId)}/interest`, jsonBody({ actorId }))
      .then((result) => result.interest),
  ), [actorId, performMutation]);

  const resetDemo = useCallback(() => performMutation("Demo data restored to its seed state.", async () => {
    const restored = await requestJson<unknown>("/api/demo/reset", { method: "POST" });
    if (!isStateSnapshot(restored)) throw new DemoApiError("The reset response has an unexpected shape.", "INVALID_RESPONSE");
    setSnapshot(restored);
    setAgentResponse(null);
    return restored;
  }), [performMutation]);

  const actor = snapshot?.members.find((member) => member.id === actorId) ?? null;
  const value = useMemo<DemoProviderValue>(() => ({
    snapshot, loadStatus, loadError, refresh, actorMode, candidateActorId, actorId, actor, setActorMode,
    setCandidateActorId, setActorId,
    actionFeedback, clearActionFeedback, isMutating, agentPending, agentResponse, runAgent, runTool,
    createProject, requestIntroduction, transitionIntroduction, recordInterest, resetDemo,
  }), [snapshot, loadStatus, loadError, refresh, actorMode, candidateActorId, actorId, actor, setActorMode,
    setCandidateActorId, setActorId,
    actionFeedback, clearActionFeedback, isMutating, agentPending, agentResponse, runAgent, runTool,
    createProject, requestIntroduction, transitionIntroduction, recordInterest, resetDemo]);

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo(): DemoProviderValue {
  const context = useContext(DemoContext);
  if (!context) throw new Error("useDemo must be used inside a DemoProvider.");
  return context;
}
