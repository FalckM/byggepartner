"use client";
// US-19, RESP-07 — «Spør en PC-bygger» (simulated chat with prewritten, build-specific answers).
import { useMemo, useState } from "react";
import { MessageCircleQuestion, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { track } from "@/lib/analytics/track";
import { builderAnswers } from "@/lib/engine/builderAnswers";
import type { ValidationReport } from "@/lib/engine/report";
import type { BuildItem, Catalog, NeedsProfile } from "@/lib/engine/types";
import { cn } from "@/lib/utils";

type Msg = { from: "you" | "builder"; text: string };

export function AskBuilder({ items, catalog, report, needs, className }: { items: BuildItem[]; catalog: Catalog; report: ValidationReport; needs?: NeedsProfile; className?: string }) {
  const [open, setOpen] = useState(false);
  const [log, setLog] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const qa = useMemo(() => (open ? builderAnswers(items, catalog, report, needs) : []), [open, items, catalog, report, needs]);

  return (
    <>
      <Button
        variant="outline"
        className={cn("min-h-11 w-full", className)}
        onClick={() => {
          setOpen(true);
          track("ask_builder_opened", { ok: report.ok });
        }}
      >
        <MessageCircleQuestion aria-hidden /> Spør en PC-bygger før du bestiller
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="font-heading text-xl">Spør en PC-bygger</SheetTitle>
            <SheetDescription>Prototype: svarene er forhåndsskrevet ut fra akkurat din pakke. Ingen meldinger sendes.</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 px-4 pb-6">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Vanlige spørsmål">
              {qa.map((q) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setLog((l) => [...l, { from: "you", text: q.question }, { from: "builder", text: q.answer }])}
                  className="min-h-10 rounded-full border bg-card px-3 text-left text-sm transition-colors hover:border-foreground"
                >
                  {q.question}
                </button>
              ))}
            </div>
            <ol className="space-y-2" aria-live="polite" aria-label="Samtale" data-testid="builder-chat">
              {log.map((m, i) => (
                <li
                  key={i}
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm",
                    m.from === "you" ? "ml-auto bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
                  )}
                >
                  <span className="sr-only">{m.from === "you" ? "Du: " : "PC-bygger: "}</span>
                  {m.text}
                </li>
              ))}
            </ol>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!draft.trim()) return;
                setLog((l) => [
                  ...l,
                  { from: "you", text: draft.trim() },
                  { from: "builder", text: "Takk for spørsmålet! En PC-bygger svarer vanligvis innen 2 timer i åpningstiden. (Prototype – meldingen sendes ikke.)" },
                ]);
                setDraft("");
              }}
            >
              <label htmlFor="ask-draft" className="sr-only">
                Skriv et eget spørsmål
              </label>
              <input
                id="ask-draft"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Skriv et eget spørsmål …"
                className="h-11 min-w-0 flex-1 rounded-xl border bg-card px-3"
              />
              <Button type="submit" size="icon" className="size-11" aria-label="Send">
                <Send aria-hidden />
              </Button>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
