import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DemoProvider } from "@/components/demo-provider";
import { Sidebar } from "@/components/shell/sidebar";

describe("workspace sidebar", () => {
  it("offers an accessible demo reset control in the environment panel", () => {
    const markup = renderToStaticMarkup(
      <DemoProvider>
        <Sidebar pathname="/" />
      </DemoProvider>,
    );

    expect(markup).toMatch(/<button\b[^>]*>[\s\S]*Reset Demo[\s\S]*<\/button>/);
  });
});
