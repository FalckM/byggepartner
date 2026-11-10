import Link from "next/link";
import { Wrench } from "lucide-react";

// US-11 — Internal admin area for the project group (not customer-facing).
const NAV = [
  { href: "/admin", label: "Oversikt" },
  { href: "/admin/katalog", label: "Katalog" },
  { href: "/admin/scenarier", label: "Scenarier" },
  { href: "/admin/stresstest", label: "Stresstest" },
  { href: "/admin/analyse", label: "Analyse" },
  { href: "/admin/import", label: "Import" },
  { href: "/test", label: "Brukertest" },
] as const;

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/admin" className="flex items-center gap-2 font-semibold">
            <Wrench aria-hidden className="size-4" />
            Byggepartner · Admin
          </Link>
          <nav aria-label="Admin" className="flex flex-wrap gap-1 text-sm">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
