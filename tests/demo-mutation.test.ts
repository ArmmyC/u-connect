import { describe, expect, it, vi } from "vitest";
import { performDemoMutation } from "@/components/demo-provider";

describe("demo mutation refresh handling", () => {
  it("keeps a successful mutation result when the follow-up refresh fails", async () => {
    const saved = { id: "intro-1", status: "accepted" };
    const operation = vi.fn(async () => saved);
    const refresh = vi.fn(async () => {
      throw new Error("state endpoint unavailable");
    });
    const setActionFeedback = vi.fn();
    const setIsMutating = vi.fn();

    await expect(performDemoMutation(
      "Introduction accepted.",
      operation,
      refresh,
      setActionFeedback,
      setIsMutating,
    )).resolves.toBe(saved);

    expect(operation).toHaveBeenCalledOnce();
    expect(refresh).toHaveBeenCalledOnce();
    expect(setActionFeedback).toHaveBeenLastCalledWith(expect.objectContaining({
      status: "success",
      message: expect.stringContaining("may be stale"),
    }));
    expect(setIsMutating).toHaveBeenNthCalledWith(1, true);
    expect(setIsMutating).toHaveBeenLastCalledWith(false);
  });
});
