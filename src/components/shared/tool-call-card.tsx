import { Check, CircleAlert, Wrench } from "lucide-react";
import type { AgentResponse } from "@/components/demo-provider";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

function formatted(value: unknown) {
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
}

export function ToolCallCard({ call, index }: { call: AgentResponse["toolCalls"][number]; index: number }) {
  const succeeded = call.output.ok;
  const output = succeeded ? call.output.result : call.output.error;

  return (
    <Card className="min-w-0 overflow-hidden">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-xl bg-surface-overlay text-accent-strong"><Wrench className="size-4" /></span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">Tool step {index + 1}</p>
            <h3 className="mt-0.5 truncate font-mono text-xs font-semibold text-main">{call.tool}</h3>
          </div>
        </div>
        <Badge variant={succeeded ? "success" : "danger"}>
          {succeeded ? <Check aria-hidden="true" className="size-3" /> : <CircleAlert aria-hidden="true" className="size-3" />}
          {succeeded ? "Complete" : "Failed"}
        </Badge>
      </div>
      <div className="grid min-w-0 gap-3 p-4 md:grid-cols-2">
        <section className="min-w-0" aria-label={`${call.tool} input`}>
          <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-faint">Input</h4>
          <pre className="max-h-56 overflow-auto rounded-xl border border-line/70 bg-bg/70 p-3 font-mono text-[10px] leading-5 text-muted">{formatted(call.input)}</pre>
        </section>
        <section className="min-w-0" aria-label={`${call.tool} output`}>
          <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-faint">{succeeded ? "Output" : "Error"}</h4>
          <pre className={`max-h-56 overflow-auto rounded-xl border p-3 font-mono text-[10px] leading-5 ${succeeded ? "border-line/70 bg-bg/70 text-muted" : "border-danger/20 bg-danger-soft text-danger"}`}>{formatted(output)}</pre>
        </section>
      </div>
    </Card>
  );
}
