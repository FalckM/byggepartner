"use client";
// DP1, US-01, US-02, RESP-05 — Needs wizard: budget first, then use, games, screen, wishes.
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Box,
  Check,
  Clapperboard,
  Code2,
  Gamepad2,
  GraduationCap,
  Leaf,
  Lightbulb,
  Loader2,
  Minimize2,
  Radio,
  Search,
  Sparkles,
  VolumeX,
  Wifi,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics/track";
import { formatNok } from "@/lib/engine/labels";
import type { NeedsProfile, Use } from "@/lib/engine/types";
import { cn } from "@/lib/utils";

type GameLite = { slug: string; name: string; genre: string };
type StepKey = "budget" | "use" | "games" | "screen" | "wishes";

const USES: { value: Use; label: string; icon: React.ReactNode }[] = [
  { value: "GAMING", label: "Spill", icon: <Gamepad2 className="size-6" /> },
  { value: "STUDY", label: "Skole/studier", icon: <GraduationCap className="size-6" /> },
  { value: "STREAMING", label: "Streaming", icon: <Radio className="size-6" /> },
  { value: "VIDEO_EDIT", label: "Video/bilderedigering", icon: <Clapperboard className="size-6" /> },
  { value: "PROGRAMMING", label: "Programmering", icon: <Code2 className="size-6" /> },
  { value: "3D", label: "3D", icon: <Box className="size-6" /> },
];

const WISHES: { key: keyof NeedsProfile["preferences"] | "longevity"; label: string; hint: string; icon: React.ReactNode }[] = [
  { key: "quiet", label: "Stillegående", hint: "Rolige vifter og demping", icon: <VolumeX className="size-5" /> },
  { key: "small", label: "Liten", hint: "Tar lite plass på pulten", icon: <Minimize2 className="size-5" /> },
  { key: "wifi", label: "Trådløst nett (Wi-Fi)", hint: "Uten nettverkskabel", icon: <Wifi className="size-5" /> },
  { key: "rgb", label: "RGB-lys", hint: "Farget lys i PC-en", icon: <Lightbulb className="size-5" /> },
  { key: "whiteBuild", label: "Hvit farge", hint: "Hvite deler der det finnes", icon: <Sparkles className="size-5" /> },
  { key: "longevity", label: "Skal vare lenge (5 år)", hint: "Lettere å oppgradere senere", icon: <Leaf className="size-5" /> },
];

const QUICK = [10000, 14000, 20000, 30000];

// Timing helpers live outside the component (event-handler use only).
const nowMs = () => performance.now();
const msSince = (start: number) => Math.round(performance.now() - start);

export function Wizard({ games }: { games: GameLite[] }) {
  const router = useRouter();
  const [budget, setBudget] = useState(14000);
  const [includeOs, setIncludeOs] = useState(true);
  const [assembly, setAssembly] = useState(false);
  const [uses, setUses] = useState<Use[]>([]);
  const [chosenGames, setChosenGames] = useState<string[]>([]);
  const [unknownGames, setUnknownGames] = useState(false);
  const [query, setQuery] = useState("");
  const [resolution, setResolution] = useState<NeedsProfile["resolution"]>("1080p");
  const [hz, setHz] = useState<NeedsProfile["targetHz"]>(144);
  const [prefs, setPrefs] = useState<NeedsProfile["preferences"]>({});
  const [longevity, setLongevity] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<{ message: string; budget?: boolean } | null>(null);

  const steps: StepKey[] = uses.includes("GAMING") ? ["budget", "use", "games", "screen", "wishes"] : ["budget", "use", "screen", "wishes"];
  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const heading = useRef<HTMLHeadingElement>(null);
  const stepStart = useRef(0);

  useEffect(() => {
    stepStart.current = nowMs();
    track("wizard_step_viewed", { step });
    heading.current?.focus();
  }, [step]);

  const canNext = step === "use" ? uses.length > 0 : step === "games" ? chosenGames.length > 0 || unknownGames : true;
  const isLast = stepIndex >= steps.length - 1;

  function next() {
    track("wizard_step_completed", { step, ms: msSince(stepStart.current) });
    if (isLast) void submit();
    else setStepIndex(stepIndex + 1);
  }
  function back() {
    if (stepIndex === 0) router.push("/");
    else setStepIndex(stepIndex - 1);
  }

  async function submit() {
    const needs: NeedsProfile = {
      budgetNok: budget,
      includeOs,
      uses,
      games: unknownGames ? [] : chosenGames,
      resolution,
      targetHz: hz,
      preferences: prefs,
      longevityYears: longevity ? 5 : 3,
      assemblyService: assembly,
    };
    setBusy(true);
    setProblem(null);
    try {
      const res = await fetch("/api/generate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ needs }) });
      const data = await res.json();
      if (res.status === 422) {
        setProblem({ message: data.message, budget: true });
        return;
      }
      if (!res.ok) throw new Error();
      track("wizard_completed", { buildId: data.buildId, budget });
      router.push(`/pakke/${data.buildId}`);
    } catch {
      setProblem({ message: "Noe gikk galt, prøv igjen." });
    } finally {
      setBusy(false);
    }
  }

  const filteredGames = games.filter((g) => g.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="space-y-8">
      {/* Progress */}
      <div>
        <p className="text-sm font-medium text-muted-foreground">
          Steg {stepIndex + 1} av {steps.length}
        </p>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label="Fremdrift i veiviseren"
          aria-valuemin={1}
          aria-valuemax={steps.length}
          aria-valuenow={stepIndex + 1}
        >
          <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }} />
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canNext && !busy) next();
        }}
        className="space-y-8"
      >
        {step === "budget" && (
          <fieldset className="space-y-6">
            <legend className="sr-only">Budsjett</legend>
            <StepHeading ref={heading} title="Hvor mye vil du bruke?" sub="Vi holder oss innenfor budsjettet – og sier fra hvis det ikke går." />
            <div className="rounded-2xl border bg-card p-5 sm:p-6">
              <label htmlFor="budget" className="text-sm font-medium text-muted-foreground">
                Budsjett
              </label>
              <p className="font-heading text-5xl font-semibold tabular-nums" aria-hidden>
                {formatNok(budget)}
              </p>
              <input
                id="budget"
                type="range"
                min={6000}
                max={50000}
                step={500}
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                aria-valuetext={formatNok(budget)}
                className="mt-4 h-11 w-full cursor-pointer accent-[var(--primary)]"
              />
              <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                <span>6 000 kr</span>
                <span>50 000 kr</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Hurtigvalg for budsjett">
                {QUICK.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setBudget(q)}
                    aria-pressed={budget === q}
                    className={cn(
                      "min-h-11 rounded-full border px-4 text-sm font-medium tabular-nums",
                      budget === q ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:border-primary",
                    )}
                  >
                    {formatNok(q)}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <CheckCard checked={includeOs} onChange={setIncludeOs} label="Inkluder Windows" hint="Trengs for å bruke PC-en. Fjern hvis du har en lisens fra før." />
              <CheckCard checked={assembly} onChange={setAssembly} label="Inkluder montering (+999 kr)" hint="Vi bygger og tester PC-en for deg." />
            </div>
          </fieldset>
        )}

        {step === "use" && (
          <fieldset className="space-y-6">
            <legend className="sr-only">Bruk</legend>
            <StepHeading ref={heading} title="Hva skal PC-en brukes til?" sub="Velg alt som passer." />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {USES.map((u) => (
                <ChoiceCard
                  key={u.value}
                  type="checkbox"
                  checked={uses.includes(u.value)}
                  onChange={(on) => setUses(on ? [...uses, u.value] : uses.filter((x) => x !== u.value))}
                  label={u.label}
                  icon={u.icon}
                />
              ))}
            </div>
          </fieldset>
        )}

        {step === "games" && (
          <fieldset className="space-y-6">
            <legend className="sr-only">Spill</legend>
            <StepHeading ref={heading} title="Hvilke spill spiller du?" sub="Da kan vi vise hvor jevnt spillene dine kommer til å gå." />
            <div className="relative">
              <Search aria-hidden className="absolute top-3.5 left-3.5 size-4 text-muted-foreground" />
              <label htmlFor="game-search" className="sr-only">
                Søk etter spill
              </label>
              <input
                id="game-search"
                type="search"
                placeholder="Søk etter spill …"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-11 w-full rounded-xl border bg-card pr-3 pl-10"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <ChoiceCard
                type="checkbox"
                checked={unknownGames}
                onChange={(on) => {
                  setUnknownGames(on);
                  if (on) setChosenGames([]);
                }}
                label="Vet ikke / mye forskjellig"
                hint="Vi velger en allsidig spill-PC"
              />
              {filteredGames.map((g) => (
                <ChoiceCard
                  key={g.slug}
                  type="checkbox"
                  checked={chosenGames.includes(g.slug)}
                  onChange={(on) => {
                    setUnknownGames(false);
                    setChosenGames(on ? [...chosenGames, g.slug] : chosenGames.filter((x) => x !== g.slug));
                  }}
                  label={g.name}
                  hint={g.genre}
                />
              ))}
            </div>
          </fieldset>
        )}

        {step === "screen" && (
          <div className="space-y-6">
            <StepHeading ref={heading} title="Hvilken skjerm har du?" sub="Usikker? Velg «Vanlig» og 144 Hz." />
            <fieldset className="space-y-3">
              <legend className="font-medium">Skarphet</legend>
              <div className="grid gap-3 sm:grid-cols-3">
                {(
                  [
                    ["1080p", "Vanlig (1080p)", "Den vanligste skjermen"],
                    ["1440p", "Skarp (1440p)", "Skarpere bilde, krever mer"],
                    ["2160p", "4K", "Skarpest – krever mest"],
                  ] as const
                ).map(([v, label, hint]) => (
                  <ChoiceCard key={v} type="radio" name="resolution" checked={resolution === v} onChange={() => setResolution(v)} label={label} hint={hint} />
                ))}
              </div>
            </fieldset>
            <fieldset className="space-y-3">
              <legend className="font-medium">Hvor mange bilder i sekundet kan skjermen vise?</legend>
              <p className="text-sm text-muted-foreground">Står ofte på skjermen eller esken. Usikker? Velg 144 Hz.</p>
              <div className="grid grid-cols-3 gap-3">
                {([60, 144, 240] as const).map((v) => (
                  <ChoiceCard key={v} type="radio" name="hz" checked={hz === v} onChange={() => setHz(v)} label={`${v} Hz`} />
                ))}
              </div>
            </fieldset>
          </div>
        )}

        {step === "wishes" && (
          <fieldset className="space-y-6">
            <legend className="sr-only">Ønsker</legend>
            <StepHeading ref={heading} title="Har du noen ønsker?" sub="Helt valgfritt – hopp over om du vil." />
            <div className="grid gap-3 sm:grid-cols-2">
              {WISHES.map((w) => (
                <CheckCard
                  key={w.key}
                  icon={w.icon}
                  label={w.label}
                  hint={w.hint}
                  checked={w.key === "longevity" ? longevity : !!prefs[w.key]}
                  onChange={(on) => (w.key === "longevity" ? setLongevity(on) : setPrefs({ ...prefs, [w.key]: on }))}
                />
              ))}
            </div>
          </fieldset>
        )}

        {problem && (
          <div role="alert" className="rounded-2xl border-2 border-warn bg-warn-soft p-5">
            <p className="font-medium">{problem.message}</p>
            {problem.budget && (
              <Button type="button" variant="outline" className="mt-3 min-h-11" onClick={() => { setProblem(null); setStepIndex(0); }}>
                Juster budsjett
              </Button>
            )}
          </div>
        )}

        <div className="sticky bottom-0 -mx-4 flex gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
          <Button type="button" variant="outline" size="lg" className="min-h-12" onClick={back}>
            <ArrowLeft aria-hidden /> Tilbake
          </Button>
          <Button type="submit" size="lg" className="min-h-12 flex-1 text-base sm:flex-none" disabled={!canNext || busy}>
            {busy ? (
              <>
                <Loader2 aria-hidden className="animate-spin" /> Setter sammen og sjekker …
              </>
            ) : isLast ? (
              <>
                Vis PC-ene mine <ArrowRight aria-hidden />
              </>
            ) : (
              <>
                Neste <ArrowRight aria-hidden />
              </>
            )}
          </Button>
        </div>
        {!canNext && (
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {step === "use" ? "Velg minst én ting for å gå videre." : "Velg minst ett spill, eller «Vet ikke»."}
          </p>
        )}
      </form>
    </div>
  );
}

function StepHeading({ ref, title, sub }: { ref: React.Ref<HTMLHeadingElement>; title: string; sub: string }) {
  return (
    <div>
      <h1 ref={ref} tabIndex={-1} className="text-3xl font-semibold outline-none sm:text-4xl">
        {title}
      </h1>
      <p className="mt-2 text-muted-foreground">{sub}</p>
    </div>
  );
}

function ChoiceCard({
  type,
  name,
  checked,
  onChange,
  label,
  hint,
  icon,
}: {
  type: "checkbox" | "radio";
  name?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint?: string;
  icon?: React.ReactNode;
}) {
  return (
    <label
      className={cn(
        "relative flex min-h-16 cursor-pointer flex-col justify-center gap-1 rounded-2xl border-2 bg-card p-4 transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
        checked ? "border-primary bg-secondary" : "border-border hover:border-primary/50",
      )}
    >
      {/* Invisible but full-size input: the whole card is the click target, semantics stay native. */}
      <input
        type={type}
        name={name}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="absolute inset-0 z-10 m-0 size-full cursor-pointer appearance-none rounded-2xl opacity-0"
      />
      {icon && <span aria-hidden className="text-primary">{icon}</span>}
      <span className="font-medium">{label}</span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      {checked && (
        <span aria-hidden className="absolute top-2.5 right-2.5 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground">
          <Check className="size-3.5" />
        </span>
      )}
    </label>
  );
}

function CheckCard({ checked, onChange, label, hint, icon }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string; icon?: React.ReactNode }) {
  return (
    <label
      className={cn(
        "flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl border-2 bg-card p-4 transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
        checked ? "border-primary bg-secondary" : "border-border hover:border-primary/50",
      )}
    >
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-5 shrink-0 accent-[var(--primary)]" />
      {icon && <span aria-hidden className="text-primary">{icon}</span>}
      <span>
        <span className="block font-medium">{label}</span>
        {hint && <span className="block text-sm text-muted-foreground">{hint}</span>}
      </span>
    </label>
  );
}
