"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { Button } from "@/components/ui/button";

const themeStorageKey = "u-connect-theme";
const themeChangeEvent = "u-connect-theme-change";
type Theme = "dark" | "light";

function subscribeToTheme(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(themeChangeEvent, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(themeChangeEvent, onChange);
  };
}

function getTheme(): Theme {
  try {
    return window.localStorage.getItem(themeStorageKey) === "dark" ? "dark" : "light";
  } catch {
    return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  }
}

function getServerTheme(): Theme {
  return "light";
}

function saveTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    window.localStorage.setItem(themeStorageKey, theme);
  } catch {
    // The theme still works for this session when storage is unavailable.
  }
  window.dispatchEvent(new Event(themeChangeEvent));
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const theme = useSyncExternalStore(subscribeToTheme, getTheme, getServerTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  function toggleTheme() {
    saveTheme(theme === "dark" ? "light" : "dark");
  }

  return (
    <div className="app-frame flex min-h-screen">
      <a href="#main-content" className="sr-only z-50 rounded-control bg-accent px-4 py-2 font-semibold text-accent-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>

      <div className="side-rail sticky top-0 hidden h-screen shrink-0 lg:flex">
        <Sidebar pathname={pathname} className="w-full" />
      </div>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setMobileNavOpen(true)} theme={theme} onToggleTheme={toggleTheme} />
        <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 outline-none">
          {children}
        </main>
        <footer className="border-t border-line px-5 py-4 text-center text-[10px] leading-5 text-faint md:px-8">
          U-Connect demo workspace · all profiles and opportunities are fictional
        </footer>
      </div>

      <Dialog.Root open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content
            className="dialog-content"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              document.getElementById("mobile-navigation-trigger")?.focus();
            }}
          >
            <Dialog.Title className="sr-only">U-Connect navigation</Dialog.Title>
            <Dialog.Description className="sr-only">Choose a workspace area.</Dialog.Description>
            <Button variant="subtle" size="icon" aria-label="Close navigation menu" onClick={() => setMobileNavOpen(false)} className="absolute right-3 top-3 z-10">
              <X aria-hidden="true" className="size-4" />
            </Button>
            <Sidebar pathname={pathname} onNavigate={() => setMobileNavOpen(false)} className="pt-5" />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
