import type { ProjectDraft } from "@/components/demo-provider";
import type { Introduction, Project } from "@/lib/types";

export interface TeamBuilderWorkflowStep {
  id: string;
  kind: "project" | "introduction";
  memberId?: string;
  status: "pending" | "success" | "error";
  message: string;
}

export interface TeamBuilderWorkflowResult {
  project: Project;
  introductions: Introduction[];
  failures: Array<{ memberId: string; message: string }>;
}

function messageFor(error: unknown): string {
  return error instanceof Error ? error.message : "The local demo service could not complete this step.";
}

export async function createProjectAndRequestIntroductions(options: {
  draft: ProjectDraft;
  memberIds: string[];
  createProject: (draft: ProjectDraft) => Promise<Project>;
  requestIntroduction: (projectId: string, memberId: string) => Promise<Introduction>;
  onStep?: (step: TeamBuilderWorkflowStep) => void;
}): Promise<TeamBuilderWorkflowResult> {
  const { draft, createProject, requestIntroduction, onStep } = options;
  onStep?.({ id: "project", kind: "project", status: "pending", message: "Saving the project…" });

  let project: Project;
  try {
    project = await createProject(draft);
    onStep?.({ id: "project", kind: "project", status: "success", message: "Project saved." });
  } catch (error) {
    onStep?.({ id: "project", kind: "project", status: "error", message: messageFor(error) });
    throw error;
  }

  const introductions: Introduction[] = [];
  const failures: TeamBuilderWorkflowResult["failures"] = [];
  for (const memberId of [...new Set(options.memberIds)]) {
    const id = `introduction-${memberId}`;
    onStep?.({ id, kind: "introduction", memberId, status: "pending", message: "Sending request…" });
    try {
      const introduction = await requestIntroduction(project.id, memberId);
      introductions.push(introduction);
      onStep?.({ id, kind: "introduction", memberId, status: "success", message: "Introduction request sent." });
    } catch (error) {
      const message = messageFor(error);
      failures.push({ memberId, message });
      onStep?.({ id, kind: "introduction", memberId, status: "error", message });
    }
  }

  return { project, introductions, failures };
}
