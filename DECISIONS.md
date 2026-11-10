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

## D10 – Tolkninger i regelmotoren (fase 2)
- **`validate(items, catalog, options?)`** har en valgfri tredje parameter (`includeOs`, `wantsWifi`, `gaming`), fordi sjekklisten (7.4) avhenger av kundens behov. Standard: `includeOs = true`.
- **`ok`** = 0 feilede ERROR **og** alle *påkrevde* sjekklisteposter er ✅. WARNING og INFO blokkerer aldri.
- **Kjølepasta (R18)** er INFO som regel, men en *påkrevd* sjekklistepost når kjøleren mangler pasta. Uten pasta blir pakken ufullstendig (DP3).
- **R00_UNKNOWN_COMPONENT** (ekstra): ukjent id eller feil kategori i handlekurven gir ERROR, så en manipulert handlekurv aldri kan gi grønn hake.
- **R11 og adapter:** et 12V-2x6-kort på en strømforsyning uten 12V-2x6 er WARNING hvis strømforsyningen har nok 8-pin til adapteren som følger med kortet (én per 150 W, minst to), ellers ERROR.
- **R09** sjekker både format (ATX/SFX) og lengde. SFX i et rent ATX-kabinett regnes som feil (krever brakett vi ikke selger).
- **R14:** 2,5"-SSD kan bruke ledige 3,5"-brønner. Antall SATA-strømkontakter på strømforsyningen sjekkes også.
- **R16** hoppes over når sokkelen ikke matcher (R01 tar det), for å unngå doble, forvirrende meldinger.
- **R10:** margin = (PSU − last) / last. «Strømforsyningen har nok kraft, med 35 % margin».
- **Fiks-kandidater** (`fixSuggestion.candidateIds`) er kontrollert slik at byttet faktisk fjerner feilen. De sorteres etter færrest advarsler og nærmest pris (likeverdig bytte).
- **«Legg til anbefalt»** i sjekklisten foreslår bare deler som ikke skaper nye mangler (f.eks. ikke en kjøler som så trenger pasta).
- **`compatibleAlternatives`** sorterer etter (a) ytelse per krone, der kategorien har et ytelsesmål, ellers (b) pris. Kandidater med advarsler kommer sist. Utsolgte vises i «Passer ikke» med grunnen «Utsolgt».
- **`rulesChecked`** teller reglene som faktisk var relevante for pakken. UI-teksten «vi har sjekket 19 ting» bruker `RULES.length`.

## D11 – FPS-modell (fase 3)
- `REF_GPU_SCORE = 50`, `REF_CPU_SCORE = 70`. `baseFps` i `seed/games.json` er «målt» mot en tenkt referansemaskin med disse verdiene. Alle tallene er demo-data.
- `cpuWeight`-justering: `cpuFps = baseFps1080 × 1,6 × (1 + cpuWeight × (CPU/REF − 1))`. CPU-tunge spill reagerer sterkere på raskere eller tregere prosessor.
- Integrert grafikk regnes som et svært svakt skjermkort (`perfScore 6`). Spill med låst bildefrekvens (`fpsCap`) kappes.
- «Vet ikke / mye forskjellig» bruker et generelt spill (`GENERIC_GAME`) i målfunksjonen. FPS vises da som «Typiske spill».
- Etiketter: < 45 Spillbart, 45–90 Jevnt, 90–144 Veldig jevnt, > 144 Konkurransenivå. Mot skjermen: Ja ≥ 100 %, Nesten ≥ 80 %.

## D12 – Generatoren (fase 3)
- **Profilvalg:** 1440p/4K-spill → GAMING_HI; video/streaming/3D → EDIT; bare e-sportspill ved ≥ 144 Hz → ESPORT; ellers spill → GAMING_1080; ellers STUDY. Tabell 8.1 er brukt uendret. «Studier: 0–10 % GPU» er satt til 5 %.
- **Beam search** følger 8.2: tre søk (grense 85 / 100 / 110 % av budsjettet, minus OS og montering), bredde 50, rekkefølge CPU → MB → RAM → GPU → CASE → COOLER → PSU → STORAGE.
  - **Kandidater per steg:** topp 8 etter nytte per krone innenfor ±40 % av andelen, pluss sikkerhetsvalg (beste nytte under vinduet, de to billigste og de tre beste kunden har råd til). Uten sikkerhetsvalgene kan et for smalt vindu gjøre billige eller dyre pakker umulige.
  - **Heuristikk:** delscore, der skjermkortet estimeres optimistisk ut fra resterende budsjett, minus straff for å bruke langt mer enn andelen så langt og for å ikke ha råd til ≥ 1 TB lagring.
- **Kompatibilitet under søk:** speiler alle ERROR-reglene og unngår WARNING der det går (GPU-margin ≥ 10 mm, kjøler ≥ 1,2× TDP, PSU ≥ last × 1,3, egne 12V-2x6-kabler, ingen RAM/kjøler-kollisjon). BIOS-advarsel (R16) er lov, men straffes i score. Til slutt kjøres **full `validate()`**, og bare `ok`-pakker returneres.
- **Målfunksjon:** FPS-nytte per spill = min(fps/Hz, 1) + 0,25 × overskudd (avtagende), snitt × 100. Produktivitet: 0,1 × multi (studier) og 0,5 × multi + 0,3 × GPU (redigering). I tillegg RAM- og lagringsbonus, plattformbonus ved «skal vare lenge», preferanser (stille, liten, hvit, RGB), lagerstatus som *andel* på lager (normalisert, så flere deler ikke gir høyere score) og et lite kvalitetsledd som gjør at budsjettet brukes fornuftig når FPS er mettet.
- **Etterfylling:** kjølepasta og Wi-Fi-adapter regnes inn i «effektiv pris» allerede under søket (kjøler uten pasta = pris + pasta), og legges så til. Dermed sprenger etterfyllingen aldri budsjettet, og nedgradering (8.2 punkt 5) trengs ikke.
- **Nivåer:**
  - *Anbefalt:* høyest score ≤ budsjett.
  - *Spar:* høyest score per krone ≤ 85 %, valgt fra Pareto-fronten (ingen dyrere pakke uten høyere score) og helst ≥ 60 % av budsjettet.
  - *Ytelse:* høyest score ≤ 110 % og minst +1 bedre enn Anbefalt. **Utelates hvis ingenting er merkbart bedre** (f.eks. S12, der RTX 5080 og 9800X3D allerede er toppen). Spar utelates hvis ingen komplett PC finnes under 85 %.
- **BUDGET_TOO_LOW:** et eget billigst-mulig-søk gir `minimumNok`, rundet opp til nærmeste 10 kr. En test bekrefter at generatoren faktisk lykkes med akkurat det beløpet.
- **Oppgraderingsmodus (US-18):** eide deler markeres `owned` og koster 0. Kategorier utenfor `upgradeCategories` er låst, bortsett fra strømforsyning og kjøler, som kan byttes hvis de blir for svake. Budsjettandelene normaliseres over kategoriene som faktisk kjøpes.
- **Forklaringer** returneres per `componentId` (ikke per kategori), siden en pakke kan ha flere deler i samme kategori.
- **Forventninger justert:** S02 og S12 krever ikke lenger «3 pakker» (det står ikke i spesifikasjonen, og er umulig/meningsløst der).

## D13 – Stresskatalog
`pnpm seed:stress` lager 1 991 syntetiske komponenter (faker, `seed(219)`) pluss OS og tilbehør fra seed-katalogen, til sammen 2 000. Katalogen skrives til `public/stress/catalog.json` (genereres også ved `prebuild`) og lastes **ikke** inn i databasen, så den ikke blandes med kundekatalogen. `/admin/stresstest` kjører generatoren i nettleseren. Testprofilene er deterministiske (mulberry32, seed 219).

## D14 – Kundeflyten (fase 4)
- **Visuell profil «arbeidsbenk og tegning»:** varmt papirhvitt og blekkblått, med et svakt arbeidstegningsrutenett på forsiden. Bricolage Grotesque til overskrifter, Geist til brødtekst. Grønt brukes **bare** for «passer»: chip, stempel og sertifikat. Rødt brukes bare for blokkerende feil, gult for råd. Fargen er aldri eneste signal; ikon og tekst følger alltid med.
- **`/pakke/[id]`:** kunden kommer til en lagret pakke (Build med behov). De tre nivåene **regenereres** fra behovene, siden generatoren er deterministisk, så delte lenker viser det samme. En delt, endret pakke vises som «Lagret pakke».
- **Validering, FPS og forklaringer** kjøres i nettleseren (samme motor) ved hvert bytte. Serveren validerer på nytt ved bestilling (`/api/orders` gir 422 hvis pakken ikke er `ok`).
- **Handlekurven** er Zustand og `localStorage` med try/catch. Montering er en egen vare (`acc-assembly-service`), slått av og på med en bryter.
- **Kassen** sender ingen navn eller adresse noen steder. Bare pakke-id og anonym id lagres (Order og Build).
- **`/bygg`** er laget allerede i fase 4 fordi E2E «RESP-04» (fase 4-porten) foregår der. Deler som ikke passer er gråtonet med grunnen, men kan velges («Velg likevel») slik at kunden ser konflikten og kan fikse den med ett klikk. Ekspertmodus og filtre kommer i fase 5.
- **Hendelser** (`track()`) er lagt inn på alle steder fra kap. 11, men bufres i minnet til `/api/events` lages i fase 6.
- **Testteknikk:** Next 16 holder tidligere ruter montert men skjult (React Activity). E2E-tester avgrenses derfor til `getByRole("main")`, og skuffen finnes via `getByRole("dialog")`. Playwright kjører med `reducedMotion: "reduce"`, så axe ikke måler farger midt i en overgang.

## D15 – Ekspertmodus, oppgradering, kart og PC-bygger (fase 5)
- **Ekspertmodus** er en global bryter i headeren, lagret i `localStorage` (`bp-prefs`). Den viser tekniske tall (sokkel, watt, mm …) i delelisten, problemlisten, «Se hva vi har sjekket» og kartet. Standardmodus er uendret og sjargongfri (testet med E2E i begge retninger).
- **`/bygg`** viser alltid fulle spesifikasjoner (PCPartPicker-lignende), med filtre for søk, makspris, «Vis bare det som passer» og «Bare på lager», og sortering etter pris eller ytelse. Deler som ikke passer, er gråtonet, har grunnen som tooltip og i tekst, og kan fortsatt velges.
- **`/oppgrader`:** eide deler velges fra katalogen per kategori. «Vet ikke» og fritekst regnes som *ikke eid*, slik at vi kan love kompatibilitet; skjemaet sier tydelig fra om dette. Kategorier som skal oppgraderes kjøpes nye. Strømforsyning og kjøler kan byttes hvis de er for svake (D12), og resultatsiden viser da en advarsel.
- **Kompatibilitetskart (US-21):** `lib/engine/compatGraph.ts` (rent) kobler hver regel til et par kategorier. Kanten får verste status. SVG-et legger ledninger utenom andre noder og plasserer statusmerker med problemene først, så ✕ aldri skjules. Status vises med farge, ikon (✓ ! ✕) og strekmønster. Ledningene er tastaturknapper, og det finnes en listevisning.
- **«Spør en PC-bygger» (US-19):** simulert chat med forhåndsskrevne svar generert fra pakken (`lib/engine/builderAnswers.ts`). Egne spørsmål får et standardsvar. Ingenting sendes.
