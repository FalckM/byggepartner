"use client";
// US-18, RESP-07 — «Hva passer med det jeg har hjemme?» Owned parts are locked; only new parts are bought.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics/track";
import { CATEGORY_LABEL_PLAIN, formatNok } from "@/lib/engine/labels";
import type { Category, NeedsProfile } from "@/lib/engine/types";

type Part = { id: string; name: string; category: Category };
const CATS: Category[] = ["CPU", "MOTHERBOARD", "RAM", "GPU", "STORAGE", "PSU", "CASE", "COOLER"];
const UNKNOWN = "";
const OTHER = "__other__";

export function UpgradeForm({ parts, games }: { parts: Part[]; games: { slug: string; name: string }[] }) {
  const router = useRouter();
  const [owned, setOwned] = useState<Partial<Record<Category, string>>>({});
  const [freeText, setFreeText] = useState<Partial<Record<Category, string>>>({});
  const [upgrade, setUpgrade] = useState<Category[]>(["GPU"]);
  const [budget, setBudget] = useState(6000);
  const [chosenGames, setChosenGames] = useState<string[]>([]);
  const [resolution, setResolution] = useState<NeedsProfile["resolution"]>("1080p");
  const [hz, setHz] = useState<NeedsProfile["targetHz"]>(144);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const unknownKept = CATS.filter((c) => !upgrade.includes(c) && (!owned[c] || owned[c] === OTHER) && c !== "COOLER");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!upgrade.length) return setProblem("Velg minst én del du vil oppgradere.");
    setBusy(true);
    setProblem(null);
    const existingParts: NonNullable<NeedsProfile["existingParts"]> = CATS.flatMap((c): NonNullable<NeedsProfile["existingParts"]> =>
      upgrade.includes(c)
        ? []
        : owned[c] && owned[c] !== OTHER
          ? [{ category: c, componentId: owned[c] }]
          : freeText[c]
            ? [{ category: c, freeText: freeText[c] }]
            : [],
    );
    const needs: NeedsProfile = {
      budgetNok: budget,
      includeOs: false,
      uses: ["GAMING"],
      games: chosenGames,
      resolution,
      targetHz: hz,
      preferences: {},
      longevityYears: 3,
      assemblyService: false,
      existingParts,
    };
    try {
      const res = await fetch("/api/generate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ needs, upgradeCategories: upgrade }) });
      const data = await res.json();
      if (res.status === 422) return setProblem(data.message);
      if (!res.ok) throw new Error();
      track("wizard_completed", { mode: "upgrade", buildId: data.buildId });
      router.push(`/pakke/${data.buildId}`);
    } catch {
      setProblem("Noe gikk galt, prøv igjen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold sm:text-4xl">Oppgrader PC-en du har</h1>
        <p className="mt-2 text-muted-foreground">
          Fortell oss hva du har i dag, så foreslår vi nye deler som garantert passer med resten. Du betaler bare for det nye.
        </p>
      </div>

      <fieldset className="space-y-3 rounded-2xl border bg-card p-5">
        <legend className="px-1 font-heading text-lg font-semibold">1. Hva har du i dag?</legend>
        <p className="text-sm text-muted-foreground">Usikker? Velg «Vet ikke» – da tar vi det med i forslaget, eller du kan spørre en PC-bygger.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {CATS.map((c) => (
            <div key={c} className="space-y-1.5">
              <label htmlFor={`own-${c}`} className="text-sm font-medium">
                {CATEGORY_LABEL_PLAIN[c]}
              </label>
              <select
                id={`own-${c}`}
                value={owned[c] ?? UNKNOWN}
                onChange={(e) => setOwned({ ...owned, [c]: e.target.value })}
                disabled={upgrade.includes(c)}
                className="h-11 w-full rounded-xl border bg-background px-3 disabled:opacity-70"
              >
                <option value={UNKNOWN}>{upgrade.includes(c) ? "Skal byttes" : c === "COOLER" ? "Den som fulgte med / vet ikke" : "Vet ikke / har ikke"}</option>
                {parts
                  .filter((p) => p.category === c)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                <option value={OTHER}>Annet (skriv selv)</option>
              </select>
              {owned[c] === OTHER && !upgrade.includes(c) && (
                <input
                  aria-label={`${CATEGORY_LABEL_PLAIN[c]}: skriv modellen`}
                  placeholder="F.eks. modellnavnet på esken"
                  value={freeText[c] ?? ""}
                  onChange={(e) => setFreeText({ ...freeText, [c]: e.target.value })}
                  className="h-11 w-full rounded-xl border bg-background px-3"
                />
              )}
            </div>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-3 rounded-2xl border bg-card p-5">
        <legend className="px-1 font-heading text-lg font-semibold">2. Hva vil du oppgradere?</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {CATS.map((c) => (
            <label key={c} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 has-[:checked]:border-primary has-[:checked]:bg-secondary">
              <input
                type="checkbox"
                checked={upgrade.includes(c)}
                onChange={(e) => setUpgrade(e.target.checked ? [...upgrade, c] : upgrade.filter((x) => x !== c))}
                className="size-4 accent-[var(--primary)]"
              />
              <span className="text-sm">{CATEGORY_LABEL_PLAIN[c].split(" (")[0]}</span>
            </label>
          ))}
        </div>
        {unknownKept.length > 0 && (
          <p className="rounded-xl bg-warn-soft p-3 text-sm" role="note">
            Vi vet ikke hvilken {unknownKept.map((c) => CATEGORY_LABEL_PLAIN[c].split(" (")[0].toLowerCase()).join(", ")} du har. For å kunne love at alt passer,
            tar vi med en ny i forslaget. Velg modellen over om du vet den.
          </p>
        )}
      </fieldset>

      <fieldset className="space-y-4 rounded-2xl border bg-card p-5">
        <legend className="px-1 font-heading text-lg font-semibold">3. Budsjett og spill</legend>
        <div>
          <label htmlFor="up-budget" className="text-sm font-medium">
            Budsjett for nye deler: <strong className="tabular-nums">{formatNok(budget)}</strong>
          </label>
          <input id="up-budget" type="range" min={1000} max={30000} step={500} value={budget} onChange={(e) => setBudget(Number(e.target.value))} aria-valuetext={formatNok(budget)} className="h-11 w-full accent-[var(--primary)]" />
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Spillene dine">
          {games.map((g) => (
            <label key={g.slug} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-full border px-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-secondary">
              <input
                type="checkbox"
                checked={chosenGames.includes(g.slug)}
                onChange={(e) => setChosenGames(e.target.checked ? [...chosenGames, g.slug] : chosenGames.filter((x) => x !== g.slug))}
                className="size-4 accent-[var(--primary)]"
              />
              {g.name}
            </label>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="up-res" className="text-sm font-medium">
              Skjerm
            </label>
            <select id="up-res" value={resolution} onChange={(e) => setResolution(e.target.value as NeedsProfile["resolution"])} className="h-11 w-full rounded-xl border bg-background px-3">
              <option value="1080p">Vanlig (1080p)</option>
              <option value="1440p">Skarp (1440p)</option>
              <option value="2160p">4K</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="up-hz" className="text-sm font-medium">
              Bilder i sekundet skjermen kan vise
            </label>
            <select id="up-hz" value={hz} onChange={(e) => setHz(Number(e.target.value) as NeedsProfile["targetHz"])} className="h-11 w-full rounded-xl border bg-background px-3">
              <option value={60}>60 Hz</option>
              <option value={144}>144 Hz</option>
              <option value={240}>240 Hz</option>
            </select>
          </div>
        </div>
      </fieldset>

      {problem && (
        <p role="alert" className="rounded-2xl border-2 border-warn bg-warn-soft p-4">
          {problem}
        </p>
      )}
      <Button type="submit" size="lg" className="min-h-12 w-full rounded-full text-base sm:w-auto" disabled={busy}>
        {busy ? <Loader2 aria-hidden className="animate-spin" /> : null} Vis forslag som passer <ArrowRight aria-hidden />
      </Button>
    </form>
  );
}
