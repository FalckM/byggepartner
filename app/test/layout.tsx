import Link from "next/link";
import { ClipboardList } from "lucide-react";

export default function TestLayout({ children }: LayoutProps<"/test">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-3">
          <ClipboardList aria-hidden className="size-5 text-primary" />
          <span className="font-heading font-semibold">Byggepartner · Brukertest</span>
          <Link href="/admin/analyse" className="ml-auto text-sm underline underline-offset-4">
            Analyse
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
