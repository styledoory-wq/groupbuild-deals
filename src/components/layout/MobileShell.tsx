import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Bell, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScanFAB } from "@/components/supplier/ScanFAB";


import { useApp } from "@/store/AppStore";

/**
 * Adaptive shell.
 *
 * Renders `children` EXACTLY ONCE and switches chrome (header, padding,
 * container width) via responsive Tailwind classes. Rendering children twice
 * caused duplicate <h1>, duplicate analytics events, and 2× data fetching.
 *
 * MOBILE (<lg): full-bleed column capped at --app-max-w, safe-area padding,
 * BottomNav floats over content.
 *
 * DESKTOP (≥lg): fixed top header + 1200px content area, padded around a
 * right-anchored 248px sidebar (rendered by BottomNav).
 */
export function MobileShell({ children, className }: { children: ReactNode; className?: string }) {
  const { user } = useApp();
  return (
    <div
      className="min-h-screen min-h-[100dvh] relative"
      style={{ overscrollBehavior: "none", backgroundColor: "#F7F5F0" }}
    >
      {/* Desktop top header — sits to the LEFT of the right sidebar (248px).
          For guests we render a minimal header (logo + sign-in) instead of the personal chrome. */}
      {user ? (
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
                className="w-full h-9 rounded-full bg-[#F4F6F9] border border-transparent pr-9 pl-4 text-[13px] text-[#1F2937] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#0E6B5A] focus:bg-white transition"
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
            <div className="h-9 w-9 rounded-full bg-[#0E6B5A] text-white flex items-center justify-center text-[12px] font-bold">
              {(user?.name ?? "?").slice(0, 1)}
            </div>
          </div>
        </header>
      ) : (
        <header
          dir="rtl"
          className="hidden lg:flex fixed top-0 left-0 right-0 h-14 bg-white border-b border-[#ECEEF2] z-[70] items-center px-6 gap-6"
        >
          <Link to="/" className="font-extrabold text-[#0E6B5A] text-[16px] tracking-tight">GroupBuild</Link>
          <div className="flex-1" />
          <Link
            to="/auth/resident"
            className="text-[#0E6B5A] font-semibold text-[13px] border border-[#0E6B5A]/25 px-4 py-1.5 rounded-full hover:bg-[#0E6B5A]/5 transition-colors"
          >
            התחברות
          </Link>
        </header>
      )}

      {/* Single content container — mobile styling by default, desktop overrides via lg: */}
      <main
        dir="rtl"
        className={cn(
          // Mobile
          "flex justify-center min-h-screen min-h-[100dvh] overflow-x-hidden",
          // Desktop resets: no flex-center, pad below fixed header
          "lg:block lg:pt-14 lg:overflow-visible",
        )}
      >
        <div
          className={cn(
            // Mobile column
            "w-full max-w-[var(--app-max-w)] min-h-screen min-h-[100dvh] relative z-10 overflow-x-hidden",
            "pt-[env(safe-area-inset-top)]",
            "pb-[calc(env(safe-area-inset-bottom)+var(--nav-h)+12px)]",
            // Desktop overrides
            "lg:max-w-[1200px] lg:mx-auto lg:px-6 lg:py-6 lg:min-h-0 lg:overflow-visible lg:pt-0 lg:pb-0",
            className,
          )}
        >
          {children}
        </div>
      </main>

      <ScanFAB />
    </div>
  );
}
