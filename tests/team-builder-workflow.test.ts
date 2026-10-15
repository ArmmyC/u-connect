import { describe, expect, it, vi } from "vitest";
import { createProjectAndRequestIntroductions } from "@/lib/team-builder-workflow";
import type { Introduction, Project } from "@/lib/types";

describe("createProjectAndRequestIntroductions", () => {
  it("creates one project and requests introductions sequentially for unique selected members", async () => {
    const order: string[] = [];
    const project: Project = { id: "project-1", ownerId: "mem-ada", title: "MVP", description: "Launch", skills: ["React"] };
    const createProject = vi.fn(async () => {
      order.push("project");
      return project;
    });
    const requestIntroduction = vi.fn(async (_projectId: string, memberId: string) => {
      order.push(memberId);
      return { id: `intro-${memberId}`, projectId: project.id, memberId, status: "pending" as const, createdAt: "2026-10-16" } satisfies Introduction;
    });
    const onStep = vi.fn();

    const result = await createProjectAndRequestIntroductions({
      draft: { title: "MVP", description: "Launch", skills: ["React"] },
      memberIds: ["mem-ben", "mem-erin", "mem-ben"],
      createProject,
      requestIntroduction,
      onStep,
    });

    expect(order).toEqual(["project", "mem-ben", "mem-erin"]);
    expect(result.project).toEqual(project);
    expect(result.introductions.map((intro) => intro.memberId)).toEqual(["mem-ben", "mem-erin"]);
    expect(result.failures).toEqual([]);
    expect(onStep).toHaveBeenCalledWith(expect.objectContaining({ id: "project", status: "success" }));
  });

  it("keeps successful requests and continues after an individual intro request fails", async () => {
    const project: Project = { id: "project-1", ownerId: "mem-ada", title: "MVP", description: "Launch", skills: [] };
    const requestIntroduction = vi.fn(async (_projectId: string, memberId: string) => {
      if (memberId === "mem-erin") throw new Error("candidate unavailable");
      return { id: "intro-ben", projectId: project.id, memberId, status: "pending" as const, createdAt: "2026-10-16" } satisfies Introduction;
    });
    const onStep = vi.fn();

    const result = await createProjectAndRequestIntroductions({
      draft: { title: project.title, description: project.description, skills: [] },
      memberIds: ["mem-ben", "mem-erin", "mem-chai"],
      createProject: async () => project,
      requestIntroduction,
      onStep,
    });

    expect(result.introductions.map((intro) => intro.memberId)).toEqual(["mem-ben", "mem-chai"]);
    expect(result.failures).toEqual([{ memberId: "mem-erin", message: "candidate unavailable" }]);
    expect(requestIntroduction).toHaveBeenCalledTimes(3);
    expect(onStep).toHaveBeenCalledWith(expect.objectContaining({ id: "introduction-mem-erin", status: "error", message: "candidate unavailable" }));
  });

  it("does not request introductions if project creation fails", async () => {
    const requestIntroduction = vi.fn();
    const onStep = vi.fn();

    await expect(createProjectAndRequestIntroductions({
      draft: { title: "MVP", description: "Launch", skills: [] },
      memberIds: ["mem-ben"],
      createProject: async () => { throw new Error("project failed"); },
      requestIntroduction,
      onStep,
    })).rejects.toThrow("project failed");

    expect(requestIntroduction).not.toHaveBeenCalled();
    expect(onStep).toHaveBeenCalledWith(expect.objectContaining({ id: "project", status: "error", message: "project failed" }));
  });
});
