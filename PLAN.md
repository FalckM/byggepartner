# PLAN – Byggepartner (pakketilbudsgenerator, prototype)

Kilde: `multicom-pakketilbudsgenerator-prompt.md`. Avvik og antakelser står i `DECISIONS.md`.

## Faser og verifiseringsporter

| # | Fase | Innhold | Port |
|---|---|---|---|
| 1 | Fundament | Next.js 16, Tailwind 4 + shadcn/ui, Prisma 7 + docker compose (Postgres), Zod-skjemaer for alle kategorier, seed-katalog (150+ komponenter, spill, scenarier), `pnpm db:seed`, `/admin/katalog` | Seed kjører uten Zod-feil; `/admin/katalog` lister alle komponenter med filtrering |
| 2 | Motor | Regler R01–R19, `power.ts`, `checklist.ts`, `validate.ts`, `compatibleAlternatives`, `explain.ts` + enhetstester | ≥ 95 % linjedekning i `lib/engine/rules`, S04–S09 grønne |
| 3 | Generator og ytelse | `generate.ts`, `performance.ts`, tre nivåer, `BUDGET_TOO_LOW`, fast-check, `/admin/scenarier`, `/admin/stresstest` | S01–S12 grønne; stresstest 100 % gyldige, p95 < 300 ms |
| 4 | Kundeflyt | Forside, veiviser, resultat + bytt-skuff, FPS, strømmåler, handlekurv, kasse, bekreftelse + byggeguide, delbare lenker | E2E «Sander-reisen» + «RESP-04» desktop/mobil; axe 0 alvorlige |
| 5 | Ekspert, oppgrader, kart | `/bygg`, ekspertmodus, `/oppgrader`, SVG-kompatibilitetskart, «Spør en PC-bygger» | S11 grønn i UI; ekspertmodus-test grønn |
| 6 | Måling | Hendelseslogging, `/test`, `/admin/analyse`, CSV-eksport | Simulert testøkt gir riktige tall |
| 7 | Ekstern data og deploy | Importør + CSV-import, GitHub Actions, Vercel + Neon | Offentlig URL, Lighthouse-mål, README komplett |

## Mappestruktur

```
app/              Next.js App Router ((shop), admin, test, api)
components/ui/    shadcn/ui-komponenter
components/       egne delte komponenter (banner, kategoriikoner …)
lib/engine/       REN TypeScript – ingen import fra next/prisma/react
lib/data/         ProductSource-adapter (static, prisma, multicom-stub, importers)
lib/db.ts         Prisma-klient (singleton, driver adapter pg)
lib/generated/    Prisma-generert klient (gitignored)
prisma/           schema.prisma, seed.ts, migrations
seed/             components/*.json, games.json, scenarios.json
tests/            engine/*.test.ts, seed/*.test.ts, e2e/*.spec.ts
docs/             tjenesteplan.md, brukertest-guide.md
```

## Avhengigheter (hovedsakelig)

next 16.4 · react 19.3 · typescript 5.9 strict · tailwindcss 4 · shadcn/ui (Base UI) · lucide-react · motion · recharts · zod 4 · react-hook-form · zustand · @tanstack/react-query · prisma/@prisma/client 7.10 + @prisma/adapter-pg · vitest + coverage-v8 · fast-check · playwright + @axe-core/playwright (fase 4) · @faker-js/faker (fase 3) · tsx · prettier · eslint 9

## Kommandoer

```bash
pnpm i
docker compose up -d
pnpm db:migrate     # prisma migrate dev
pnpm db:seed        # validerer og laster seed-data
pnpm dev
pnpm test           # vitest
pnpm typecheck && pnpm lint
```
