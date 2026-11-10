import Link from "next/link";

// Placeholder – the real landing page (spec 9.3) is built in phase 4.
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-4 px-4 py-16">
      <h1 className="text-3xl font-semibold text-balance">
        Få en PC som passer – uten å kunne alt om PC-deler.
      </h1>
      <p className="text-muted-foreground">
        Kundeflyten bygges i fase 4. Foreløpig kan du se komponentkatalogen i adminpanelet.
      </p>
      <Link
        href="/admin/katalog"
        className="inline-flex min-h-11 w-fit items-center rounded-md bg-primary px-4 font-medium text-primary-foreground"
      >
        Åpne katalogen
      </Link>
    </main>
  );
}
