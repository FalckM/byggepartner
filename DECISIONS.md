# DECISIONS – antakelser og valg

Alle valg som ikke er bestemt i byggeprompten, eller som avviker fra den, dokumenteres her.

## D01 – Oppgradert teknologistakk (fase 1, 2026-11-10)
Prompten låser Next.js 15. Etter avtale med gruppen brukes nyeste stabile versjoner:
- **Next.js 16.4** (App Router, Turbopack, `cacheComponents` + `partialPrefetching` på). Konsekvens: sider som leser fra DB pakkes i `<Suspense>` eller bruker `'use cache'`.
- **React 19.3**, **Tailwind 4.3**, **Zod 4**, **TypeScript 5.9 strict**.
- **Prisma 7.10** (ikke 8, som fortsatt er RC). Prisma 7 krever `prisma.config.ts`, generator `prisma-client` med eksplisitt `output` (`lib/generated/prisma`) og driver adapter (`@prisma/adapter-pg`).
- **shadcn/ui «base-nova»** – nyeste shadcn-stil bygger på Base UI i stedet for Radix. Samme tilgjengelighetsnivå, samme API-mønster.
- **`motion`** er det nye pakkenavnet til Framer Motion.
- **PostgreSQL 17** lokalt (Neon støtter 17 i prod).

## D02 – Demo-data
Alle komponenter har `isDemoData: true`. Priser er omtrentlige NOK-priser (inkl. mva) på 2026-nivå, ikke hentet fra Multicom. Spesifikasjoner (sokkel, minnetype, TDP/TBP, lengder, høyder) er så realistiske som mulig, men avrundet og kan avvike fra konkrete produktvarianter. `perfScore*`-verdier (0–100) er relative, egne anslag.

## D03 – Bevisste «feller» i katalogen (for testing)
| Felle | Komponent-id |
|---|---|
| 340 mm skjermkort | `gpu-rtx-5070-ti-titan-oc` (340 mm) |
| Kabinett med 290 mm GPU-grense | `case-compact-m1-matx` |
| 165 mm luftkjøler | `cooler-tower-x165-dual` |
| SFX-kabinett | `case-shoebox-s9-itx` |
| 450 W PSU uten 12V-2x6 | `psu-basic-450-bronze` |
| B650-kort uten BIOS-støtte for Ryzen 9000 | `mb-b650m-legacy-bios` |
| CPU uten iGPU og uten kjøler | `cpu-intel-core-i5-14600kf` |
| Høy RGB-RAM (> 44 mm) | `ram-ddr5-32-6000-rgb-tall` |

## D04 – Lagring av spesifikasjoner
`Component.specs` lagres som JSON i Postgres (ikke én tabell per kategori). Zod discriminated union på `category` er sannhetskilden og valideres i seed, API og importører. Begrunnelse: motoren leser hele katalogen inn i minnet uansett; fleksibelt for import av eksterne datasett.

## D05 – Kategori-spesifikke tilleggsfelt
- `CASE.formFactorClass` («MID_TOWER» | «MINI_TOWER» | «SFF») brukes til preferansen «Liten».
- `CASE.color` / `COOLER`-, `RAM`-felt `rgb`/`color` brukes til preferansene «RGB» og «Hvit».
- `COOLER.overhangsRam` (boolean) erstatter «blacklist» i R17 – mer eksplisitt.
- `ACCESSORY.priceNok` for montering = 999 kr (`acc-assembly-service`).
- `Component.incompleteForValidation` (default `false`) – importerte deler med manglende felt brukes ikke av generatoren.
- `PSU.lengthMm` – trengs for å sjekke mot `CASE.maxPsuLengthMm`.
- `Game.fpsCap` (valgfri) – spill med låst bildefrekvens (Elden Ring = 60), så FPS-estimatet ikke lover mer enn spillet tillater.

## D06 – Fiktive merkenavn
Prosessorer (AMD/Intel), skjermkortbrikker (RTX/Radeon/Arc) og Windows bruker ekte modellnavn, siden kompatibiliteten avhenger av dem. Kortprodusenter, kabinetter, kjølere, strømforsyninger, minne og lagring bruker **fiktive merker** (Nordvik, Polar, Kraftverk, Fjordtek, Skarv), så demo-spesifikasjonene ikke kan forveksles med ekte produkter.

## D07 – Katalogstørrelse
151 komponenter: CPU 20, hovedkort 22, RAM 14, GPU 22, lagring 15, PSU 15, kabinett 18, kjøler 16, OS 2, tilbehør 7.

## D08 – Playwright satt opp i fase 1
For å verifisere fase 1-porten («lister alle komponenter med filtrering») i en ekte nettleser, desktop og mobil, inkludert axe-sjekk.

## D09 – Skjemaer ved admin-filtre
Admin-katalogen bruker native `<select>` i stedet for shadcn Select (Base UI): enklere, fullt tilgjengelig og fungerer med Playwrights `selectOption`.
