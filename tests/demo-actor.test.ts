import { describe, expect, it } from "vitest";
import { getDemoActorId, restoreDemoActorMode, restoreDemoCandidateId } from "@/components/demo-provider";

describe("demo actor selection", () => {
  it("restores the candidate selection and maps it to the candidate member", () => {
    const mode = restoreDemoActorMode("candidate");

    expect(mode).toBe("candidate");
    expect(getDemoActorId(mode)).toBe("mem-erin");
  });

  it("defaults an unknown saved selection to the project owner", () => {
    const mode = restoreDemoActorMode("other");

    expect(mode).toBe("owner");
    expect(getDemoActorId(mode)).toBe("mem-ada");
  });

  it("restores and uses the actual candidate member selected for an introduction", () => {
    const candidateId = restoreDemoCandidateId("mem-ben");

    expect(candidateId).toBe("mem-ben");
    expect(getDemoActorId("candidate", candidateId)).toBe("mem-ben");
  });
});
