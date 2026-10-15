import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { DemoProvider } from "@/components/demo-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "U-Connect | Community workspace",
  description: "Find collaborators and opportunities in a local-first community workspace.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased" data-theme="light" data-scroll-behavior="smooth">
      <body className="min-h-full bg-bg font-sans text-main">
        <DemoProvider>
          <AppShell>{children}</AppShell>
        </DemoProvider>
      </body>
    </html>
  );
}
