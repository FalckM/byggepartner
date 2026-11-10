import Link from "next/link";
import { CartLink } from "@/components/shop/cart-link";
import { ExpertToggle } from "@/components/shop/expert-toggle";

export default function ShopLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur no-print">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-2.5">
          <Link href="/" className="flex min-h-11 items-center gap-2.5" aria-label="Byggepartner – til forsiden">
            <Logo />
            <span className="font-heading text-lg font-semibold tracking-tight">Byggepartner</span>
          </Link>
          <nav aria-label="Hovedmeny" className="ml-auto flex items-center gap-1 text-sm">
            <Link href="/veiviser" className="hidden min-h-11 items-center rounded-full px-3 hover:bg-muted lg:inline-flex">
              Hjelp meg å velge
            </Link>
            <Link href="/bygg" className="hidden min-h-11 items-center rounded-full px-3 hover:bg-muted lg:inline-flex">
              Bygg selv
            </Link>
            <Link href="/oppgrader" className="hidden min-h-11 items-center rounded-full px-3 hover:bg-muted lg:inline-flex">
              Oppgrader
            </Link>
            <ExpertToggle />
            <CartLink />
          </nav>
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="border-t py-6 text-center text-xs text-muted-foreground no-print">
        Byggepartner er en studentprototype (IS-219, UiA). Priser, lagerstatus og ytelsestall er demo-data.
      </footer>
    </div>
  );
}

function Logo() {
  // A tiny "blueprint" mark: a component outline with a check – the brand promise.
  return (
    <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
      <rect x="2.5" y="2.5" width="27" height="27" rx="7" className="fill-primary" />
      <path d="M9 9h14v14H9z" fill="none" stroke="currentColor" strokeDasharray="2 2" className="text-primary-foreground/60" />
      <path d="M11.5 16.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="text-primary-foreground" />
    </svg>
  );
}
