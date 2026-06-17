import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Bell, Search } from "lucide-react";
import { cn } from "@/lib/utils";

import { useApp } from "@/store/AppStore";

/**
 * Adaptive shell.
 *
 * MOBILE (<lg): unchanged — single column, full bleed, BottomNav floats over content.
 *
 * DESKTOP (≥lg) — Maven/Israeli-SaaS style:
 *   ┌─────────────────────────────────────────────────────┐
 *   │  TOP HEADER (56px, white, border-b)                 │
 *   │  [logo right] [search center] [bell + avatar left]  │
 *   ├──────────────┬──────────────────────────────────────┤
 *   │  RIGHT       │  MAIN CONTENT (max-w-[1200px])       │
 *   │  SIDEBAR     │  bg #F4F6F9, padding 24px            │
 *   │  (240px)     │                                      │
 *   │              │                                      │
 *   └──────────────┴──────────────────────────────────────┘
 *
 * BottomNav is hidden on lg+ (handled inside BottomNav).
 * DesktopSidebar is rendered inside BottomNav and shown only on lg+.
 */
export function MobileShell({ children, className }: { children: ReactNode; className?: string }) {
  const { user } = useApp();
  return (
    <div
      className="min-h-screen min-h-[100dvh] relative"
      style={{ overscrollBehavior: "none", backgroundColor: "#F8F8F6" }}
    >
      {/* Desktop top header — sits to the LEFT of the right sidebar (248px) */}
      <header
        dir="rtl"
        className="hidden lg:flex fixed top-0 left-0 h-14 bg-white border-b border-[#ECEEF2] z-[70] items-center px-6 gap-6"
        style={{ right: 248 }}
      >
        <div className="flex-1 max-w-xl">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
            <input
              type="search"
              placeholder="חיפוש..."
              className="w-full h-9 rounded-full bg-[#F4F6F9] border border-transparent pr-9 pl-4 text-[13px] text-[#1F2937] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#C9A227] focus:bg-white transition"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/resident/notifications"
            className="h-9 w-9 rounded-full hover:bg-[#F4F6F9] flex items-center justify-center text-[#1F2937]"
            aria-label="התראות"
          >
            <Bell className="h-4.5 w-4.5" />
          </Link>
          <div className="h-9 w-9 rounded-full bg-[#2563EB] text-white flex items-center justify-center text-[12px] font-bold">
            {(user?.name ?? "?").slice(0, 1)}
          </div>
        </div>
      </header>

      {/* Mobile layout (unchanged) — single column wrapper */}
      <div className="lg:hidden flex justify-center min-h-screen min-h-[100dvh] overflow-x-hidden">
        <div
          className={cn(
            "w-full max-w-[var(--app-max-w)] min-h-screen min-h-[100dvh] relative z-10 overflow-x-hidden",
            "pt-[env(safe-area-inset-top)]",
            "pb-[calc(env(safe-area-inset-bottom)+var(--nav-h)+12px)]",
            className,
          )}
        >
          {children}
        </div>
      </div>

      {/* Desktop content area — sidebar lives in BottomNav (fixed, right) */}
      <main
        dir="rtl"
        className={cn(
          "hidden lg:block pt-14",
          // body.has-desktop-sidebar pads padding-right:248px globally (via index.css)
        )}
      >
        <div className="mx-auto max-w-[1200px] px-6 py-6">
          <div className={className}>{children}</div>
        </div>
      </main>
    </div>
  );
}
