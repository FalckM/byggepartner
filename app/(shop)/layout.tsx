import Link from "next/link";
import { CartLink } from "@/components/shop/cart-link";
import { MainNav } from "@/components/shop/main-nav";
import { ExpertToggle } from "@/components/shop/expert-toggle";
import { TestBar } from "@/components/test/test-bar";

export default function ShopLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur no-print">
        <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto] items-center gap-4 px-4 pt-3 lg:h-20 lg:pt-0 lg:grid-cols-[1fr_auto_1fr] lg:px-6 lg:py-0">
          <Link href="/" className="flex min-h-11 items-center gap-2.5 justify-self-start" aria-label="Byggepartner – til forsiden">
            <Logo />
            <span className="text-lg font-bold tracking-tight text-primary">byggepartner</span>
          </Link>
          <MainNav className="order-last col-span-2 -mx-4 overflow-x-auto border-t px-2 lg:order-none lg:col-span-1 lg:mx-0 lg:border-0 lg:px-0" />
          <div className="flex items-center gap-1 justify-self-end text-sm">
            <ExpertToggle />
            <CartLink />
          </div>
        </div>
      </header>
      <TestBar />
      <div className="flex-1">{children}</div>
      <footer className="border-t py-8 text-center text-[13px] text-muted-foreground no-print">
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
