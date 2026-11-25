"use client";
// DP1 — The three ways in, as product tabs: icon over label, an ink rule under the active one.
import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Hammer, TrendingUp, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS: { href: "/veiviser" | "/bygg" | "/oppgrader"; label: string; icon: LucideIcon; match: string[] }[] = [
  { href: "/veiviser", label: "Hjelp meg å velge", icon: Compass, match: ["/veiviser", "/pakke"] },
  { href: "/bygg", label: "Bygg selv", icon: Hammer, match: ["/bygg"] },
  { href: "/oppgrader", label: "Oppgrader", icon: TrendingUp, match: ["/oppgrader"] },
];

export function MainNav({ className }: { className?: string }) {
  // Next 16 Cache Components: the pathname is unknown while prerendering dynamic routes, so only the
  // active marker suspends – the links themselves are in the static shell.
  return (
    <nav aria-label="Hovedmeny" className={className}>
      <Suspense fallback={<Tabs path={null} />}>
        <ActiveTabs />
      </Suspense>
    </nav>
  );
}

function ActiveTabs() {
  return <Tabs path={usePathname()} />;
}

function Tabs({ path }: { path: string | null }) {
  return (
    <ul className="flex items-stretch justify-center gap-2 sm:gap-6">
      {TABS.map(({ href, label, icon: Icon, match }) => {
        const active = path !== null && match.some((m) => path.startsWith(m));
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex min-h-11 flex-col items-center gap-1 border-b-2 px-1 py-2 text-xs font-semibold whitespace-nowrap transition-colors sm:flex-row sm:gap-2 sm:text-base",
                active ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
              )}
            >
              <Icon aria-hidden className={cn("size-5 transition", active ? "text-primary" : "group-hover:text-foreground")} />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
