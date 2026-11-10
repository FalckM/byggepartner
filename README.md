# Byggepartner – pakketilbudsgenerator (studentprototype)

> **Studentprototype (IS-219, UiA, Gruppe 20)** – ikke en offisiell Multicom-tjeneste. Priser og data er demo-data.

En webapp som hjelper kunder uten teknisk erfaring med å sette sammen en komplett og kompatibel PC innenfor budsjettet sitt. Se `PLAN.md` for faser og `DECISIONS.md` for antakelser.

**Status:** Fase 1 (fundament) ferdig. Full README kommer i fase 7.

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
