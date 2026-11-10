# Byggepartner – pakketilbudsgenerator (studentprototype)

> **Studentprototype (IS-219, UiA, Gruppe 20)** – ikke en offisiell Multicom-tjeneste. Priser og data er demo-data.

En webapp som hjelper kunder uten teknisk erfaring med å sette sammen en komplett og kompatibel PC innenfor budsjettet sitt. Se `PLAN.md` for faser og `DECISIONS.md` for antakelser.

**Status:** Fase 1–6 ferdig, import av eksterne data (fase 7 del 1) ferdig. Deploy er utsatt – prototypen kjøres lokalt. Full README kommer sammen med deploy.

## Kjør lokalt

Krever Node 24, pnpm og Docker.

```bash
pnpm i
docker compose up -d      # Postgres 17 på localhost:5432
cp .env.example .env      # hvis .env ikke finnes
pnpm db:migrate           # oppretter tabeller + genererer Prisma-klient
pnpm db:seed              # validerer seed-data med Zod og laster dem inn
pnpm dev                  # http://localhost:3000  (admin: /admin/katalog)
```

## Tester

```bash
pnpm test        # Vitest (enhetstester)
pnpm e2e         # Playwright, desktop + mobil (krever DB med seed-data)
pnpm typecheck && pnpm lint
```

## Nyttige sider lokalt

| Side | Hva |
|---|---|
| `/` | Kundeflyten: veiviser → PC-forslag → handlekurv → kasse |
| `/bygg`, `/oppgrader` | Bygg selv / oppgrader eksisterende PC |
| `/test` | Start en moderert brukertest (se `docs/brukertest-guide.md`) |
| `/admin` | Katalog, scenarier S01–S12, stresstest, analyse (H1–H3), import |

## Import av eksterne data

`/admin/import` henter fra det åpne datasettet [docyx/pc-part-dataset](https://github.com/docyx/pc-part-dataset) (MIT-lisens, © 2021-2025 Doc Oliver, data fra PCPartPicker) eller tar imot en CSV-fil (last ned malen på siden). Alle rader forhåndsvises med status *Komplett*, *Ufullstendig* eller *Feil* før noe lagres. Ufullstendige deler brukes aldri av generatoren. Se `DECISIONS.md` D17.

## Andre kommandoer

```bash
pnpm seed:stress       # lager stresskatalogen (2 000 syntetiske deler) for /admin/stresstest
pnpm analytics:reset   # sletter hendelser og testøkter før en ekte testrunde (spør om bekreftelse)
```
