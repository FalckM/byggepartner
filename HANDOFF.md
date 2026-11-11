# HANDOFF – Byggepartner (Multicom pakketilbudsgenerator, studentprototype)

Sist oppdatert: 2026-11-11 · Gren: `fase-1-fundament` (alle faser committet her, `main` har bare scaffold) · Siste commit: `5d32113`

## 1. Hva dette er

Klikkbar webapp-prototype for IS-219 (UiA, Gruppe 20): en «digital byggepartner» der en kunde uten teknisk kunnskap oppgir budsjett og bruk, og får en **komplett og garantert kompatibel** PC-pakke.

- **Kildesannhet for krav:** `multicom-pakketilbudsgenerator-prompt.md` (kap. 0–16). Les den først.
- **Avvik og antakelser:** `DECISIONS.md` (D01–D17). Les den før du endrer atferd.
- **Faser og porter:** `PLAN.md`. **Brukertest:** `docs/brukertest-guide.md`.

## 2. Status

| Fase | Status | Port |
|---|---|---|
| 1 Fundament | ✅ | Seed uten Zod-feil, `/admin/katalog` med filtre |
| 2 Motor (R01–R19) | ✅ | 100 % linjedekning i `lib/engine/rules` (håndheves i `vitest.config.mts`), S04–S09 grønne |
| 3 Generator og ytelse | ✅ | S01–S12 grønne, fast-check med 1000 kjøringer, stresstest 100 % gyldig, p95 ≈ 15–20 ms |
| 4 Kundeflyt | ✅ | E2E «Sander-reisen» og «RESP-04» grønne på desktop og mobil, axe 0 alvorlige |
| 5 Ekspert, oppgrader, kart | ✅ | S11 grønn i UI, ekspertmodus-test grønn |
| 6 Måling | ✅ | Simulert testøkt gir riktige tall i `/admin/analyse` |
| 7 Ekstern data og deploy | 🟡 **Delvis** | Import (datasett og CSV) ✅. **Deploy, CI, tjenesteplan og full README gjenstår** |

Tester ved overlevering: **291 Vitest og 41 Playwright** grønne (1 skippet med vilje: stresstest på mobil). Typecheck, lint og `next build` er grønne.

## 3. Brukerens ønsker (viktig)

- Svar brukeren på **norsk**. Kode, variabelnavn og commits på engelsk. All UI-tekst på norsk bokmål.
- Brukeren vil **kjøre lokalt nå og vente med deploy**. Ikke deploy, ikke opprett eksterne kontoer eller tjenester (Vercel, Neon, GitHub-repo) og ikke push uten eksplisitt klarsignal.
- Brukeren liker korte statusrapporter per fase med hva som ble funnet og rettet, og ærlige forbehold.
- Commit per fase med `Co-Authored-By`-linje (se tidligere commits). Ikke ta med de usporede mappene `.agents/`, `.claude/`, `.windsurf/` og `skills-lock.json` (Prismas egne agent-skills fra `prisma init`). Brukeren har ikke bestemt hva som skal skje med dem.

## 4. Miljø og kjøring

```bash
export PATH="$HOME/.local/bin:$PATH"   # pnpm ligger der (corepack shim), IKKE i standard PATH
docker compose up -d                    # Postgres 17 på localhost:5432 (Docker Desktop må kjøre)
pnpm dev                                # http://localhost:3000
```

| Kommando | Merk |
|---|---|
| `pnpm db:migrate` | `prisma migrate dev && prisma generate`. Prisma 7 genererer **ikke** klienten automatisk |
| `pnpm db:seed` | Validerer all seed-JSON med Zod og upserter. Trygt å kjøre flere ganger. Rører ikke `import:*`-rader |
| `pnpm test` / `pnpm test:coverage` | Vitest (`tests/**/*.test.ts`) |
| `pnpm e2e` | Playwright, desktop og Pixel 7. Starter `next dev` på port 3100. **Krever DB med seed** |
| `pnpm typecheck` | `next typegen && tsc --noEmit` (rutetyper må genereres først) |
| `pnpm seed:stress` | Skriver `public/stress/catalog.json` (gitignored). Kjøres også i `prebuild` |
| `pnpm analytics:reset` | Sletter hendelser og testøkter, ber om bekreftelse, nekter mot ikke-lokal DB uten `--yes-really` |

E2E-testene etterlater testøkter (RESP-1xx–9xx, notat «E2E-simulert økt») i lokal DB. Det er greit lokalt; nullstill før ekte brukertester.

## 5. Stakk (oppgradert fra prompten, se DECISIONS D01)

Next.js **16.4** (App Router, Turbopack, `cacheComponents` + `partialPrefetching` på) · React 19.3 · TypeScript 5.9 strict · Tailwind 4 · shadcn/ui **base-nova (Base UI, ikke Radix)** · Zod 4 · Prisma **7.10** (`prisma-client`-generator → `lib/generated/prisma`, driver adapter `@prisma/adapter-pg`, `prisma.config.ts`) · Zustand · Vitest 5 + fast-check · Playwright + axe · motion · lucide · Recharts (bare stresstest).

## 6. Arkitektur – hvor ting ligger

```
lib/engine/        REN TS (håndheves av tests/engine/purity.test.ts – ingen next/react/prisma)
  types.ts           Zod-skjemaer: Component (discriminated union), NeedsProfile, Scenario, SPEC_SCHEMAS
  context.ts         BuildContext + catalogIndex (WeakMap-cache) + totalNok (eide deler gratis)
  rules/             r01…r19, én fil per regel + index.ts (RULES-registeret)
  validate.ts        runRules / validate → ValidationReport (ok = 0 ERROR + komplett sjekkliste)
  checklist.ts, power.ts, alternatives.ts (compatibleAlternatives), explain.ts (+ findJargon)
  generate.ts        beam search, tre nivåer, BUDGET_TOO_LOW, oppgraderingsmodus
  performance.ts     FPS-modell · buildGuide.ts · compatGraph.ts · builderAnswers.ts · scenarioRunner.ts
lib/data/          seedData (laster og validerer seed-JSON), source.ts (ProductSource), staticSource, prismaSource,
                   games.ts, importers/ (csv, csvImport, normalize, pcPartDataset)
lib/server/        catalog.ts (getCatalog/getGames med React cache, newBuildId), api.ts (parseBody), importer.ts, rate-limit.ts
lib/client/        cart-store, builder-store, prefs-store (ekspertmodus), test-session, safe-storage (try/catch localStorage)
lib/analytics/     events.ts (17 typer, Zod), track.ts (batch → /api/events, flushNow), metrics.ts (ren, H1–H3)
app/(shop)/        forside, veiviser, pakke/[id], handlekurv, kasse, bekreftelse/[id], bygg, oppgrader
app/admin/         katalog, scenarier, stresstest, analyse, import
app/test/          moderatormodus + /test/avslutt (trygghetsscore 1–5)
app/api/           generate, validate, components, builds(/[id]), orders, events, test-sessions(/[id]), admin/export, admin/import(/template)
components/shop/   fit-status (stempel), parts-list, swap-sheet, problem-list, checklist-view, fps-panel, power-meter, compat-map, ask-builder …
seed/              components/*.json (151 deler), games.json (16), scenarios.json (S01–S12)
tests/             engine/, analytics/, importers/, seed/, stress/, e2e/
```

**Dataflyt:** veiviseren poster til `/api/generate`, som lagrer en `Build` (med needs) og returnerer `buildId`. `/pakke/[id]` **regenererer** de tre nivåene fra needs (generatoren er deterministisk). Handlekurven ligger i Zustand og localStorage og valideres på klienten ved hver endring. `/api/orders` **validerer på nytt på serveren** (422 hvis ikke ok).

## 7. Invarianter du ikke må bryte

1. **Grønn hake («Alt passer sammen») vises bare når `validate().ok === true`.** Grønt brukes kun for «passer», rødt for blokkerende feil, gult for råd. Ikon og tekst følger alltid med fargen.
2. **Motoren er ren TS.** Purity-testen feiler hvis `lib/engine` importerer framework-kode.
3. **Generatoren returnerer bare pakker der full `validate()` er ok og totalen er innenfor nivågrensen.** fast-check-testen håndhever dette.
4. **Standardmodus inneholder ikke «sokkel», «PCIe», «TDP» eller «chipset».** Det sjekkes med `findJargon` i både enhets- og E2E-tester. Tekniske tall vises bare i ekspertmodus.
5. **Ufullstendige importer (`incompleteForValidation: true`) når aldri motoren.** De filtreres bort i `prismaSource`. Seed-rader kan aldri overskrives av import.
6. **Ingen persondata.** Kassen lagrer bare build-id og anonym id. Analyse lagrer anonym id og testøkt-id, aldri IP.
7. **Sporbarhet:** sentrale moduler har kommentaren `// DPx, US-yy`. Behold den for nye moduler.
8. **Prototypebanneret** vises på alle sider. Fiktive merkenavn for alt utenom CPU, GPU-brikker og Windows (D06).

## 8. Gotchas vi har gått på

- **Next 16 Cache Components:**
  - DB-lesing og `params`/`searchParams` må ligge inne i `<Suspense>` med `await connection()` i en egen async komponent. Se mønsteret i enhver `page.tsx`.
  - `Date.now()` eller `Math.random()` i render (også i klientkomponenter) feiler. Legg dem i effects eller hendelseshåndterere.
- **Les docs:** `AGENTS.md` (generert av Next) sier at du skal lese `node_modules/next/dist/docs/` for API-er; Next 16 avviker fra treningsdata.
- **Next 16 holder tidligere ruter montert men skjult (React Activity):**
  - I E2E: avgrens til `page.getByRole("main")`. `locator("main")` og `getByTestId` uten avgrensning treffer skjulte kopier.
  - Sheets og dialoger ligger i en portal utenfor `main`. Bruk `page.getByRole("dialog")`.
- **axe-flakiness:** Playwright kjører med `reducedMotion: "reduce"`, og `expectAccessible` venter to animasjonsrammer. Ikke fjern noen av delene.
- **Valgkort:** native input som dekker hele kortet (`absolute inset-0 opacity-0`), ikke `sr-only`. Da fungerer `check()` uten `force`.
- **React Compiler-lint** («impure function during render», «refs during render») gir falske positive på hendelseshåndterere. Løses med hjelpefunksjoner på modulnivå eller `onSubmit={(e) => void handleSubmit(fn)(e)}`.
- **globals.css:** `shadcn add` kan duplisere `@theme inline` og `@custom-variant`. Sjekk filen etter at du legger til komponenter. Mørk modus følger `prefers-color-scheme` (ikke `.dark`-klasse).
- **Rutefiler** kan bare eksportere HTTP-metoder og config.
- **Stale rutetyper** etter at sider flyttes: `rm -rf .next/dev/types && pnpm typecheck`.

## 9. Gjenstår (prioritert)

### Fase 7 del 2 – deploy (KREVER KLARSIGNAL FRA BRUKER)
- [ ] **Beskytt `/admin`, `/test` og `/api/admin/*`** før offentlig URL, f.eks. Basic Auth i `proxy.ts` (Next 16-navnet på middleware, se docs) når `ADMIN_PASSWORD` er satt. Import-API-et kan i dag skrive til DB uten auth.
- [ ] GitHub Actions: lint → typecheck → unit → e2e. E2E trenger en Postgres-service, `pnpm db:deploy`, `pnpm db:seed` og `pnpm exec playwright install --with-deps chromium`.
- [ ] Vercel + Neon: `DATABASE_URL`, `prisma migrate deploy`, seed i prod. `postinstall` kjører `prisma generate` (fungerer uten DATABASE_URL). `prebuild` lager stresskatalogen.
- [ ] Lighthouse mobil (krav: Performance ≥ 85, Accessibility ≥ 95). **Ikke målt ennå.**

### Leveranser (kap. 15)
- [ ] `docs/tjenesteplan.md`: service blueprint for SKAL-situasjonen (kundehandlinger → frontstage → backstage → støttesystemer).
- [ ] Full `README.md` (norsk): kobling til Oppgave 3/4 (DP1–DP4, H1–H3), skjermbilder, deploy, tabellen **Brukerhistorie → Skjermbilde → Test**.
- [ ] `MulticomSource`-stub (`lib/data/`) med TODO og felt et ekte Multicom-API må levere (spec kap. 5). **Ikke laget.**
- [ ] Sluttrapport etter kap. 16 (selvsjekk 1–7).

### Mindre / kjent
- Kompatibilitetskartet: når en feilledning krysser midt mellom hovedkort og minne, får den korte MB–RAM-ledningen ikke plass til sitt ✓-merke. Ledningen er likevel med i listevisningen og kan nås med tastatur.
- BuildCores OpenDB (nevnt i spec 10.2) er ikke vurdert.
- Lagerstatus og priser er demo-data. FPS-modellen er en grov, dokumentert modell (D11).
- Rate-limit og datasett-cache ligger i minnet per serverinstans. Det holder for en prototype.

## 10. Nyttige referanser

- **Felle-komponenter for testing (D03):**

  | Felle | Id |
  |---|---|
  | GPU, 340 mm | `gpu-rtx-5070-ti-titan-oc` |
  | Kabinett, maks 290 mm GPU | `case-compact-m1-matx` |
  | Kjøler, 165 mm | `cooler-tower-x165-dual` |
  | SFX-kabinett | `case-shoebox-s9-itx` |
  | Strømforsyning, 450 W | `psu-basic-450-bronze` |
  | Hovedkort uten BIOS-støtte for Ryzen 9000 | `mb-b650m-legacy-bios` |
  | CPU uten grafikk og kjøler | `cpu-intel-core-i5-14600kf` |
  | Høy RGB-RAM | `ram-ddr5-32-6000-rgb-tall` |
  | Kjøler uten kjølepasta | `cooler-single-tower-no-paste-150` |

- **Kjent gyldig baseline:** `BASE` i `tests/engine/helpers.ts` og `EXAMPLE_BUILD` i `lib/client/builder-store.ts`.
- **Prisma-skills** fra Prisma ligger lokalt i `.claude/skills/prisma-*` (usporet). Nyttig ved migrering eller deploy.
- **Skjermbilder** av UI-et er ikke lagret i repoet. Ta nye med Playwright (se mønsteret i tidligere sesjoner: start `next dev --port 3100`, kjør et `.mjs`-skript fra prosjektroten, slett skriptet etterpå).
