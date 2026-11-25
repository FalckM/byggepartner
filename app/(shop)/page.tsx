import Link from "next/link";
import { Compass, Hammer, TrendingUp, type LucideIcon } from "lucide-react";
import { RULES } from "@/lib/engine/rules";

// DP1, DP4 — Front page for the demo: who we are, what the prototype is, and the three ways in.
export default function Home() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-10 lg:px-6 lg:py-16">
      <section className="max-w-2xl">
        <p className="text-sm font-semibold text-muted-foreground">Studentprototype · IS-219 · Universitetet i Agder</p>
        <h1 className="mt-2 text-[28px] leading-tight font-bold text-balance">Byggepartner – en prototype for Multicom</h1>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          Vi er Gruppe 20 ved UiA. Prototypen viser hvordan en kunde uten teknisk kunnskap kan få en komplett PC der alle delene
          garantert passer sammen – før kunden betaler.
        </p>
      </section>

      <section aria-labelledby="try" className="mt-12">
        <h2 id="try" className="text-[22px] font-semibold">
          Prøv prototypen
        </h2>
        <ul className="mt-5 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          <Entry href="/veiviser" icon={Compass} title="Hjelp meg å velge">
            Svar på noen enkle spørsmål om budsjett og bruk, og få tre ferdige pakker.
          </Entry>
          <Entry href="/bygg" icon={Hammer} title="Bygg selv">
            Velg én del om gangen og se PC-en fylles ut, mens vi sjekker at alt passer.
          </Entry>
          <Entry href="/oppgrader" icon={TrendingUp} title="Oppgrader">
            Fortell hva du har fra før, og få forslag til hva som gir mest for pengene.
          </Entry>
        </ul>
      </section>

      <section aria-labelledby="about" className="mt-16 grid gap-8 border-t pt-10 md:grid-cols-3">
        <h2 id="about" className="text-[22px] font-semibold">
          Om prototypen
        </h2>
        <Fact title="Ekte kompatibilitetssjekk">
          {RULES.length} regler kjøres hver gang noe endres: fysisk plass, strøm, kabler og at ingenting mangler.
        </Fact>
        <Fact title="Demo-data">
          Priser, lagerstatus og ytelsestall er laget for testing. Merkenavn utenom prosessorer, skjermkort og Windows er fiktive.
        </Fact>
      </section>
    </main>
  );
}

function Entry({ href, icon: Icon, title, children }: { href: "/veiviser" | "/bygg" | "/oppgrader"; icon: LucideIcon; title: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="group block rounded-2xl outline-offset-4">
        <span className="grid aspect-[16/9] place-items-center sm:aspect-[4/3] overflow-hidden rounded-2xl bg-muted transition-shadow group-hover:shadow-sm">
          <Icon aria-hidden strokeWidth={1.25} className="size-24 text-primary transition-transform duration-300 group-hover:scale-105" />
        </span>
        <span className="mt-3 block font-semibold">{title}</span>
        <span className="mt-0.5 block text-sm text-muted-foreground">{children}</span>
      </Link>
    </li>
  );
}

function Fact({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{children}</p>
    </div>
  );
}
