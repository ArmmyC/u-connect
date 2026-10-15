"use client";

import { useState, type FormEvent } from "react";
import { Check, Clipboard, LoaderCircle, Play } from "lucide-react";
import { useDemo } from "@/components/demo-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  parsePlaygroundInput,
  playgroundExamples,
  playgroundToolDescriptions,
  playgroundToolNames,
} from "@/lib/playground";
import type { ToolName } from "@/lib/validation";

type ToolResponse = { httpStatus: number | null; payload: unknown };

function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2) ?? "null";
}

function exampleFor(tool: ToolName, actorId: string, projects: Array<{ id: string; ownerId: string }>) {
  const example = playgroundExamples[tool];
  if (tool === "create_project") return { ...example, ownerId: actorId };
  if (tool === "request_introduction") {
    const ownedProject = projects.find((project) => project.ownerId === actorId);
    return { ...example, ...(ownedProject ? { projectId: ownedProject.id } : {}) };
  }
  return example;
}

function parseRawForPreview(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}

export function PlaygroundView() {
  const { actorId, snapshot } = useDemo();
  const [tool, setTool] = useState<ToolName>("search_members");
  const [inputText, setInputText] = useState(() => formatJson(playgroundExamples.search_members));
  const [requestBody, setRequestBody] = useState<unknown | null>(null);
  const [response, setResponse] = useState<ToolResponse | null>(null);
  const [pending, setPending] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  function selectTool(nextTool: ToolName) {
    setTool(nextTool);
    setInputText(formatJson(exampleFor(nextTool, actorId, snapshot?.projects ?? [])));
    setRequestBody(null);
    setResponse(null);
    setValidationMessage(null);
    setCopyMessage(null);
  }

  async function callTool(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationMessage(null);
    setCopyMessage(null);
    setResponse(null);

    const parsed = parsePlaygroundInput(tool, inputText);
    if (!parsed.ok) {
      setRequestBody({ actorId, input: parseRawForPreview(inputText) });
      setValidationMessage(parsed.message);
      setResponse({
        httpStatus: null,
        payload: {
          ok: false,
          error: {
            code: parsed.kind === "json" ? "INVALID_JSON" : "INVALID_INPUT",
            message: parsed.message,
          },
        },
      });
      return;
    }

    const body = { actorId, input: parsed.input };
    setRequestBody(body);
    setPending(true);
    try {
      const result = await fetch(`/api/tools/${encodeURIComponent(tool)}`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload: unknown = await result.json().catch(() => ({
        ok: false,
        error: { code: "INVALID_RESPONSE", message: "The tool endpoint returned invalid JSON." },
      }));
      setResponse({ httpStatus: result.status, payload });
    } catch {
      setResponse({
        httpStatus: null,
        payload: {
          ok: false,
          error: { code: "NETWORK_ERROR", message: "Could not reach the local demo service. Check that the app is running." },
        },
      });
    } finally {
      setPending(false);
    }
  }

  async function copyResponse() {
    if (!response) return;
    try {
      await navigator.clipboard.writeText(formatJson(response.payload));
      setCopyMessage("Response copied.");
    } catch {
      setCopyMessage("Clipboard access failed. Select and copy the JSON directly.");
    }
  }

  const requestPreview = requestBody ?? { actorId, input: parseRawForPreview(inputText) };

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-5 px-page py-6 md:py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow">Shared REST tool dispatcher</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-main sm:text-3xl">Agent Playground</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Edit an example request, validate it against the tool schema, then inspect the exact JSON response from the local demo API.
          </p>
        </div>
        <Badge variant="success">7 tools · local demo</Badge>
      </header>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]">
        <Card className="min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle>Build a tool call</CardTitle>
            <CardDescription>Workflow tools use the current demo actor. Project creation and introduction requests are persisted.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <label htmlFor="playground-tool" className="text-xs font-medium text-main">Tool</label>
              <select
                id="playground-tool"
                value={tool}
                onChange={(event) => selectTool(event.target.value as ToolName)}
                className="field h-11 w-full"
              >
                {playgroundToolNames.map((toolName) => <option key={toolName} value={toolName}>{toolName}</option>)}
              </select>
              <p className="text-xs leading-5 text-muted">{playgroundToolDescriptions[tool]}</p>
            </div>

            <form onSubmit={(event) => void callTool(event)} className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="playground-input" className="text-xs font-medium text-main">Input JSON</label>
                <button
                  type="button"
                  onClick={() => {
                    setInputText(formatJson(exampleFor(tool, actorId, snapshot?.projects ?? [])));
                    setRequestBody(null);
                    setResponse(null);
                    setValidationMessage(null);
                    setCopyMessage(null);
                  }}
                  className="rounded-control px-2 py-1 text-[11px] font-medium text-muted hover:bg-surface-raised hover:text-main focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  Load example
                </button>
              </div>
              <Textarea
                id="playground-input"
                value={inputText}
                onChange={(event) => {
                  setInputText(event.target.value);
                  setValidationMessage(null);
                  setRequestBody(null);
                  setResponse(null);
                  setCopyMessage(null);
                }}
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                aria-invalid={Boolean(validationMessage)}
                aria-describedby={validationMessage ? "playground-validation" : "playground-hint"}
                className="min-h-[280px] resize-y bg-bg/60 font-mono text-xs leading-5"
              />
              {validationMessage ? (
                <p id="playground-validation" role="alert" className="text-xs leading-5 text-danger">{validationMessage}</p>
              ) : (
                <p id="playground-hint" className="text-[11px] leading-5 text-faint">
                  The browser includes actor <span className="font-mono text-muted">{actorId}</span> for owner-scoped workflow checks.
                </p>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-[10px] text-faint">POST /api/tools/{tool}</span>
                <Button type="submit" disabled={pending}>
                  {pending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Play aria-hidden="true" className="size-4" />}
                  {pending ? "Calling tool…" : "Validate & call"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="min-w-0 space-y-5">
          <Card className="min-w-0 overflow-hidden">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>Request preview</CardTitle>
                  <CardDescription className="mt-1">The body sent to the API after local schema validation.</CardDescription>
                </div>
                <Badge variant="default">JSON</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <pre className="max-h-[260px] overflow-auto rounded-control border border-line bg-bg/70 p-4 font-mono text-[11px] leading-5 text-main" aria-label="Request JSON">
                <code>{formatJson(requestPreview)}</code>
              </pre>
            </CardContent>
          </Card>

          <Card className="min-w-0 overflow-hidden">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>Response</CardTitle>
                  <CardDescription className="mt-1">Success and error payloads stay in the same structured JSON shape.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {response && <Badge variant={response.payload && typeof response.payload === "object" && "ok" in response.payload && response.payload.ok === true ? "success" : "warning"}>{response.httpStatus === null ? "Local validation" : `HTTP ${response.httpStatus}`}</Badge>}
                  <Button type="button" variant="outline" size="sm" onClick={() => void copyResponse()} disabled={!response}>
                    {copyMessage === "Response copied." ? <Check aria-hidden="true" className="size-3.5" /> : <Clipboard aria-hidden="true" className="size-3.5" />}
                    {copyMessage === "Response copied." ? "Copied" : "Copy JSON"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {response ? (
                <pre className="max-h-[420px] overflow-auto rounded-control border border-line bg-bg/70 p-4 font-mono text-[11px] leading-5 text-main" aria-label="Tool response JSON" aria-live="polite">
                  <code>{formatJson(response.payload)}</code>
                </pre>
              ) : (
                <div className="rounded-control border border-dashed border-line-strong bg-bg/40 px-4 py-8 text-center text-sm text-muted">
                  Select a tool and call it to see its response here.
                </div>
              )}
              {copyMessage && <p className="mt-2 text-xs text-muted" role="status" aria-live="polite">{copyMessage}</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
