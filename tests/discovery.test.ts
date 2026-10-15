import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildMemberDirectoryMatches } from "@/components/views/members-view";
import { MemberProfileContent } from "@/components/views/member-profile-view";
import { getOpportunityFit } from "@/components/views/opportunity-detail-view";
import { members, opportunities } from "@/lib/seed";

describe("member and opportunity discovery", () => {
  it("keeps URL search, role, and availability filters while returning explainable member scores", () => {
    const rows = buildMemberDirectoryMatches(members, members[0], {
      query: "React",
      role: "engineering",
      skill: "",
      availability: "available",
    });

    expect(rows.map((row) => row.member.id)).toContain("mem-ben");
    expect(rows.map((row) => row.member.id)).not.toContain("mem-ada");
    expect(rows[0]?.score).toBeGreaterThan(0);
    expect(rows[0]?.reasons).toContain("Skills include React.");
  });

  it("explains exact opportunity skill evidence and missing requirements", () => {
    const goodFit = getOpportunityFit(opportunities.find((item) => item.id === "opp-marketplace")!, "mem-ada", members);
    const missingSkills = getOpportunityFit(opportunities.find((item) => item.id === "opp-ai-forecast")!, "mem-ada", members);
    const unavailable = getOpportunityFit(opportunities.find((item) => item.id === "opp-marketplace")!, "mem-oat", members);

    expect(goodFit.score).toBeGreaterThan(0);
    expect(goodFit.reasons).toContain("Skills include React, TypeScript.");
    expect(missingSkills.score).toBeNull();
    expect(missingSkills.reasons.join(" ")).toContain("Python");
    expect(missingSkills.reasons.join(" ")).toContain("Machine Learning");
    expect(unavailable.score).toBeNull();
    expect(unavailable.reasons[0]).toContain("availability as busy");
  });

  it("renders profile contact only from the explicitly shared contact prop", () => {
    const memberWithUnexpectedEmail = { ...members[0], email: "private@example.test" };
    const privateMarkup = renderToStaticMarkup(createElement(MemberProfileContent, {
      member: memberWithUnexpectedEmail,
      sharedContact: undefined,
    }));
    const sharedMarkup = renderToStaticMarkup(createElement(MemberProfileContent, {
      member: memberWithUnexpectedEmail,
      sharedContact: { email: "shared@example.test" },
    }));

    expect(privateMarkup).not.toContain("private@example.test");
    expect(privateMarkup).not.toContain("mailto:");
    expect(sharedMarkup).toContain("shared@example.test");
    expect(sharedMarkup).toContain("mailto:shared@example.test");
  });
});
