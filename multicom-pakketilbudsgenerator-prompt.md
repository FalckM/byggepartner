# Byggeprompt: «Byggepartner» – Pakketilbudsgenerator for Multicom (prototype)

> **Slik brukes denne prompten:** Lim inn alt under streken i en kodeagent (Claude Code, Cursor e.l.) i en tom mappe. Prompten er selvforsynt: den inneholder kontekst fra Oppgave 3 og 4 (IS-219, Gruppe 20), krav, arkitektur, datamodell, kompatibilitetsregler, genereringsalgoritme, seed-data, testplan og akseptkriterier. Agenten skal bygge i faser og verifisere hver fase før den går videre.

---

## 0. Rolle og arbeidsform

Du er en senior fullstack-utvikler og tjenestedesigner. Du skal bygge en **fungerende, klikkbar og deploybar webapp-prototype** av en *pakketilbudsgenerator* for den norske nettbutikken Multicom. Prototypen skal brukes i brukertester (Build–Measure–Learn) og demonstreres for oppdragsgiver og faglærere.

Arbeidsregler for deg:

1. **Planlegg først.** Før du skriver kode: skriv en kort `PLAN.md` med fasene i kapittel 14, mappestruktur og avhengigheter. Ikke spør brukeren om ting som er bestemt i denne prompten – ta rimelige valg og dokumenter dem i `DECISIONS.md`.
2. **Bygg i faser.** Hver fase har en *verifiseringsport* (kapittel 14). Kjør tester/lint/typecheck og bekreft at porten passerer før neste fase.
3. **Kompatibilitetsmotoren er hjertet.** Den skal være ren TypeScript uten UI-/DB-avhengigheter, 100 % deterministisk og ha høyest testdekning i prosjektet.
4. **Sporbarhet.** Hver funksjon skal kunne spores til et designprinsipp (DP1–DP4) og en brukerhistorie (US-xx). Prinsippet er «*No feature without service rationale*». Legg en kommentar `// DP2, US-04` over sentrale moduler/komponenter.
5. **All tekst i UI er på norsk bokmål**, enkelt språk uten fagsjargong i standardmodus (se kapittel 9.1). Kode, variabelnavn og commits på engelsk.
6. **Ingen falsk merkevare.** Ikke bruk Multicoms logo, fonter eller kopier deres nettsted. Bruk en nøytral, egen visuell profil og vis et tydelig banner: «Studentprototype (IS-219, UiA) – ikke en offisiell Multicom-tjeneste. Priser og data er demo-data.»
7. **Ingen ekte betaling, ingen ekte persondata.** Kassen er simulert. Testdeltakere identifiseres kun med koder (RESP-xx), i tråd med samtykkeskjemaet (Sikt ref. 722034).

---

## 1. Kontekst (oppsummert fra Oppgave 3 og 4)

**Oppdragsgiver:** Multicom – norsk nettbutikk for PC-komponenter, ferdigbygde PC-er og tilbehør. Kundene er gamere, studenter, førstegangskjøpere og foreldre.

**Problemstilling:** *«Hvordan kan Multicom utvikle en digital pakketilbudsgenerator som hjelper kunder med lite teknisk erfaring å sette sammen en komplett og kompatibel PC innenfor eget budsjett, og samtidig gjøre kjøpet tryggere?»*

**Nå-situasjon (Service Safari):** Multicom.no fungerer som en flat varekatalog (varedominant logikk). Ingen automatisk kompatibilitetskontroll – inkompatible deler (f.eks. feil sokkel) kan ligge i samme handlekurv. Tunge spesifikasjonstabeller uten forklaring. Handlekurven viser kun varelinjer og totalpris, ingen sjekkliste for tilbehør. Konkurrenter: Komplett (kuratert PC-bygger, montering mot tillegg) og PCPartPicker (kompatibilitetsvarsler, BIOS/klaring).

**Point of Cause:** Handlekurv og kasse. Kunden stopper når de skal forplikte seg økonomisk.

**Rotårsak (5 Whys):** Multicom mangler et *digitalt rådgivningslag* som omsetter intern fagkompetanse til proaktiv beslutningsstøtte i sanntid.

**Omramming:** Fra «kunden finner ikke riktige deler» til «kunden er redd for å kjøpe deler som ikke passer sammen». Fra varekatalog til **digital byggepartner** (tjenestedominant logikk, value-in-use). Analogi: IKEAs kjøkkenplanlegger – kunden oppgir mål og ønsker, regelmotoren legger automatisk til alt som trengs.

**Persona – Sander (19):** Ny student, førstegangsbygger, budsjett **14 000 kr**, vil ha PC til spill (bl.a. Counter-Strike 2) og studier som varer 4–5 år. Smerter: valgparalyse, frykt for feilkjøp, fagspråk, angst for å ødelegge deler (CPU-pinner), glemmer tilbehør. Gevinster: best ytelse per krone, trygghet for at PC-en starter, stolthet over å bygge selv.

**Empiriske funn som MÅ gjenspeiles i løsningen:**

| Kode | Informant | Sitat / atferd | Krav til løsningen |
|---|---|---|---|
| RISK | RESP-03 | «Det er skummelt å bruke 14 000 kr når du er usikker på om maskinen starter.» | Kompatibilitetsgaranti, automatisk feilsikring |
| WORKAROUND | RESP-02 | Bruker PCPartPicker parallelt for watt og kontakter | Innebygd strømkalkulator og kontaktvalidering |
| JOB | RESP-01 | «Jeg vil bare vite om spillet mitt lagger, ikke hva PCIe 5.0 betyr.» | Inngang via spilltitler og oppløsning; FPS-estimat |
| COMP | RESP-04 | «Skjermkortet var to centimeter for langt for kabinettet. Måtte sage.» | Dimensjonskontroll kabinett/GPU/kjøler |
| FRICTION | RESP-05 | «Dette nettstedet snakker gresk. Hvorfor kan jeg ikke bare velge et budsjett?» | Behovsveiviser, budsjett først |
| INFO | RESP-06 | Glemte CPU-kjøler og operativsystem | Automatisk varsel om manglende komponenter |
| TRUST | RESP-03 | «Hadde det vært en garanti-knapp, hadde jeg bestilt på sekundet.» | Grønn hake: «Alt passer sammen» |
| COMP/ESCALATE | RESP-07 | «Hovedproblemet er å finne ut hva som passer med det jeg har hjemme.» | Oppgraderingsmodus + «Spør en PC-bygger» |

**Fire designprinsipper (styrende for alt):**

- **DP1 – Start i behovet, ikke i spesifikasjonene.** Budsjett og bruksområde først.
- **DP2 – Automatisk kompatibilitetskontroll.** Sokkel, strøm, fysiske mål; skjul/blokker det som ikke passer.
- **DP3 – Komplett pakke uten hull.** Sjekkliste og varsler om manglende deler (kjøler, OS, kjølepasta).
- **DP4 – Synlig trygghet i kjøpsøyeblikket.** «Alt passer sammen», kompatibilitetsgaranti, montering som tilvalg.

I tillegg: erfarne brukere skal fortsatt kunne justere enkeltdeler selv (ikke ta fra dem kontrollen).

**Hypoteser prototypen skal kunne måle (kapittel 11):**

- **H1:** Budsjett + bruksområde før det tekniske → førstegangskjøpere kommer raskere frem til en komplett maskin og med *mindre* usikkerhet enn i dagens nettbutikk.
- **H2:** Et tydelig klarsignal i handlekurven («alt passer sammen») → færre stopper opp rett før betaling.
- **H3:** Automatisk varsel om manglende komponenter → brukerne ender med et komplett oppsett.

Målinger: oppgaveløsning (ja/nei), tid brukt, hvor de nøler, og selvrapportert trygghet 1–5.

---

## 2. Mål og ikke-mål

**Mål:**
- En webapp der en bruker uten teknisk kunnskap på under 3 minutter går fra «budsjett + hva skal PC-en brukes til» til en komplett, garantert kompatibel PC-pakke i handlekurven.
- En regelmotor som beviselig fanger alle kjente inkompatibiliteter i seed-katalogen.
- En generator som alltid leverer pakker som (a) er komplette, (b) passerer alle regler, (c) holder seg innenfor budsjett.
- Et adminpanel og en testmodus som gjør det mulig å *se at alt fungerer* (scenariokjøring, stresstest, analysedata for H1–H3).
- Deploybar til en offentlig URL.

**Ikke-mål:**
- Ekte betaling, ekte lagerintegrasjon mot Multicom, innlogging for kunder, e-postutsending.
- Perfekte FPS-tall. FPS er tydelig merket som *estimat*.
- Native mobilapp (men webappen skal være responsiv og fungere fint på mobil).

---

## 3. Brukerhistorier (MoSCoW)

Bruk disse ID-ene i kode, tester og `README.md`.

### Må (MVP)
- **US-01** Som førstegangskjøper vil jeg starte med å oppgi budsjett, slik at jeg slipper å forstå komponenter først. *(DP1, RESP-05)*
- **US-02** Som gamer vil jeg velge spillene jeg spiller og skjermoppløsning, slik at forslaget passer det jeg faktisk skal gjøre. *(DP1, RESP-01)*
- **US-03** Som førstegangskjøper vil jeg få et ferdig, komplett PC-forslag innenfor budsjettet. *(DP1, DP3)*
- **US-04** Som kunde vil jeg at systemet automatisk sjekker at alle deler passer sammen (sokkel, minne, mål, strøm). *(DP2, RESP-02/04)*
- **US-05** Som kunde vil jeg få varsel hvis noe nødvendig mangler (kjøler, OS, lagring, strømforsyning). *(DP3, RESP-06)*
- **US-06** Som kunde vil jeg se en tydelig grønn bekreftelse «Alt passer sammen» før jeg betaler. *(DP4, RESP-03)*
- **US-07** Som kunde vil jeg kunne bytte en del og bare få se alternativer som passer med resten. *(DP2, kontroll for erfarne)*
- **US-08** Som kunde vil jeg forstå hver del i enkelt språk («Hva gjør denne? Hvorfor valgte vi den?»). *(DP1)*
- **US-09** Som kunde vil jeg se omtrentlig ytelse (FPS) i spillene mine. *(DP1, RESP-01)*
- **US-10** Som kunde vil jeg legge pakken i handlekurven og gjennomføre en (simulert) bestilling. *(DP4)*
- **US-11** Som prosjektgruppe vil vi ha en side som kjører alle testscenarier og viser at regler og generator fungerer. *(intern)*

### Bør
- **US-12** Som kunde vil jeg kunne velge monteringstjeneste som tilvalg. *(DP4, angst for å ødelegge deler)*
- **US-13** Som kunde vil jeg få tre alternativer (Spar / Anbefalt / Ytelse) å velge mellom.
- **US-14** Som erfaren bruker vil jeg ha en «Ekspertmodus» med fulle spesifikasjoner og fri bygging med live-validering.
- **US-15** Som kunde vil jeg se strømforbruk og hvor mye margin strømforsyningen har. *(RESP-02)*
- **US-16** Som moderator i brukertest vil jeg starte en testøkt med deltakerkode, og få logget tid, steg og trygghetsscore. *(H1–H3)*
- **US-17** Som kunde vil jeg kunne dele/lagre pakken via lenke.

### Kan
- **US-18** Som oppgraderer vil jeg oppgi delene jeg har og få forslag som passer med dem. *(RESP-07)*
- **US-19** Som kunde vil jeg kunne «Spør en PC-bygger» (simulert chat/skjema). *(RESP-07, ESCALATE)*
- **US-20** Som kunde vil jeg få en personlig byggeguide for akkurat min pakke etter kjøp.
- **US-21** Som kunde vil jeg se et visuelt «kompatibilitetskart» over hvordan delene henger sammen.
- **US-22** Som admin vil jeg importere komponenter fra et eksternt datasett.

---

## 4. Teknologistakk (bestemt – ikke diskuter)

- **Rammeverk:** Next.js 15 (App Router) + React 19 + TypeScript (strict).
- **UI:** Tailwind CSS v4 + shadcn/ui (Radix), lucide-react ikoner, Framer Motion for subtile overganger. Recharts for grafer i admin.
- **Validering/skjema:** Zod (delt mellom klient, server og seed), react-hook-form.
- **State:** Zustand for byggestate på klient (persist til `localStorage` med try/catch), TanStack Query for serverdata.
- **Database:** PostgreSQL via Prisma. Lokalt: `docker compose` med Postgres 16. Produksjon: Neon eller Supabase (gratisnivå).
- **Tester:** Vitest (enhet), fast-check (egenskapsbaserte tester av generator), Playwright (E2E), axe-core via `@axe-core/playwright` (tilgjengelighet).
- **Kvalitet:** ESLint, Prettier, `tsc --noEmit` i CI. GitHub Actions: lint → typecheck → unit → e2e.
- **Deploy:** Vercel. Seed kjøres med `pnpm db:seed` mot `DATABASE_URL`.
- **Pakkebehandler:** pnpm.

---

## 5. Arkitektur

```
/app
  /(shop)
    page.tsx                  → Forside
    veiviser/page.tsx         → Behovsveiviser (US-01, US-02)
    pakke/[id]/page.tsx       → Resultat: 3 pakker, detaljer, bytt del (US-03..09, US-13)
    bygg/page.tsx             → Ekspertmodus/fri bygging (US-14)
    oppgrader/page.tsx        → Oppgraderingsmodus (US-18)
    handlekurv/page.tsx       → Handlekurv + sjekkliste + garanti (US-05, US-06, US-12)
    kasse/page.tsx            → Simulert kasse (US-10)
    bekreftelse/[id]/page.tsx → Ordrebekreftelse + byggeguide (US-20)
  /admin
    page.tsx                  → Oversikt/KPI
    katalog/page.tsx          → Komponentliste, filtrering, redigering
    scenarier/page.tsx        → Kjør testscenarier (US-11)
    stresstest/page.tsx       → Ytelsestest av generator
    analyse/page.tsx          → H1–H3 målinger (US-16)
    import/page.tsx           → Import fra eksternt datasett (US-22)
  /test/page.tsx              → Moderatorens testmodus (US-16)
  /api
    components/route.ts       → GET med filtre + compatibleWith
    generate/route.ts         → POST behov → 3 pakker
    validate/route.ts         → POST build → ValidationReport
    builds/route.ts, builds/[id]/route.ts → lagre/dele pakker
    events/route.ts           → POST analysehendelser
    admin/scenarios/run/route.ts
    admin/stress/route.ts
    admin/import/route.ts
/lib
  /engine                     → REN TS. Ingen import fra next/prisma/react.
    types.ts                  → Domene-typer (Zod-skjemaer)
    rules/                    → én fil per regel, se kapittel 7
    validate.ts               → kjører alle regler → ValidationReport
    power.ts                  → strømberegning
    performance.ts            → ytelsesscore + FPS-estimat
    generate.ts               → generatoralgoritme
    explain.ts                → norske forklaringer per del/regel
    checklist.ts              → komplett-pakke-sjekkliste
  /data
    source.ts                 → ProductSource-interface (adapter)
    prismaSource.ts           → leser fra DB
    staticSource.ts           → leser fra seed-JSON (brukes i tester)
    importers/                → eksterne datasett → vårt skjema
  /analytics                  → klientlogger for hendelser
/prisma
  schema.prisma
  seed.ts
/seed
  components/*.json           → kuratert katalog per kategori
  games.json                  → spill med ytelsesprofil
  scenarios.json              → testscenarier (kapittel 10.3)
/tests
  engine/*.test.ts
  e2e/*.spec.ts
```

**Viktig designvalg:** All forretningslogikk ligger i `/lib/engine` og kalles fra både API-ruter og klient (for live-validering uten nettverksrundtur). Motoren tar inn en `Catalog` (liste av komponenter) og returnerer rene data. Dette gjør den testbar med `staticSource` uten database.

**Adapter-mønster for produktdata:** `ProductSource` har metodene `listByCategory`, `getById`, `search`. Multicom har ikke et åpent produkt-API, så prototypen bruker egen seed-katalog. Lag i tillegg en `MulticomSource`-stub med TODO og dokumentasjon av hvilke felt et ekte API må levere (pris, lagerstatus, leveringstid, alle kompatibilitetsfelt fra kapittel 6). Dette viser IT-interessenten hvordan løsningen kobles på nettbutikkens produktinformasjon.

---

## 6. Datamodell

### 6.1 Felles komponentfelt

```ts
Component {
  id: string               // slug, f.eks. "cpu-amd-ryzen-5-7600"
  category: Category       // CPU | MOTHERBOARD | RAM | GPU | STORAGE | PSU | CASE | COOLER | OS | ACCESSORY
  brand: string
  name: string             // visningsnavn
  priceNok: number         // heltall, inkl. mva
  stock: "IN_STOCK" | "LOW" | "ORDER" | "OUT"
  deliveryDays: number
  imageUrl?: string        // bruk nøytrale illustrasjoner/ikon per kategori hvis bilde mangler
  plainSummary: string     // én setning på enkel norsk, f.eks. "Hjernen i PC-en. 6 kjerner – rikelig til spill og studier."
  tierLabel?: "Budsjett" | "Mellomklasse" | "Entusiast"
  specs: <kategori-spesifikt, se 6.2>
  source: "seed" | "import:<navn>"
  isDemoData: true
}
```

### 6.2 Kategori-spesifikke felt (Zod discriminated union på `category`)

- **CPU:** `socket` ("AM4" | "AM5" | "LGA1700" | "LGA1851"), `cores`, `threads`, `baseGhz`, `boostGhz`, `tdpW`, `hasIntegratedGraphics`, `includesCooler`, `memorySupport` (["DDR4"] / ["DDR5"] / begge), `perfScoreGaming` (0–100), `perfScoreMulti` (0–100), `generation`, `minBiosByChipset?` (map chipset → minimum BIOS-flagg).
- **MOTHERBOARD:** `socket`, `chipset`, `formFactor` ("ATX" | "mATX" | "ITX"), `memoryType` ("DDR4" | "DDR5"), `memorySlots`, `maxMemoryGb`, `m2Slots`, `m2Pcie5Slots`, `sataPorts`, `hasWifi`, `biosFlashback`, `shipsWithBiosSupportFor` (liste over CPU-generasjoner støttet ut av esken).
- **RAM:** `memoryType`, `modules` (antall pinner), `capacityGbTotal`, `speedMts`, `casLatency`, `heightMm`.
- **GPU:** `chipset`, `vramGb`, `lengthMm`, `slotWidth`, `tbpW` (board power), `recommendedPsuW`, `powerConnectors` ({ pcie8pin: number, pin16_12v2x6: number }), `perfScore` (0–100), `features` (["DLSS", "FSR", "RT"]).
- **STORAGE:** `type` ("NVME" | "SATA_SSD" | "HDD"), `interface` ("M2_PCIE4" | "M2_PCIE5" | "SATA"), `capacityGb`, `readMbs`.
- **PSU:** `wattage`, `efficiency` ("80+ Bronze" | "Gold" | "Platinum"), `formFactor` ("ATX" | "SFX"), `modular` ("NONE" | "SEMI" | "FULL"), `connectors` ({ pcie8pin, pin16_12v2x6, sata, eps8pin }), `atx31: boolean`.
- **CASE:** `supportedMotherboards` (["ATX","mATX","ITX"]), `maxGpuLengthMm`, `maxCoolerHeightMm`, `supportedPsu` (["ATX"] / ["SFX"]), `maxPsuLengthMm`, `radiatorSupport` ({ top: [240,280,360], front: [...] }), `includedFans`, `driveBays25`, `driveBays35`, `hasGlassPanel`.
- **COOLER:** `type` ("AIR" | "AIO"), `supportedSockets`, `heightMm` (luft), `radiatorMm?` (AIO), `tdpRatingW`, `includesThermalPaste`, `noiseDb`.
- **OS:** `name` ("Windows 11 Home" osv.), `licenseType`.
- **ACCESSORY:** `kind` ("THERMAL_PASTE" | "WIFI_ADAPTER" | "CABLE" | "FAN" | "ASSEMBLY_SERVICE"), `description`.

### 6.3 Øvrige tabeller (Prisma)

- `Game { id, name, slug, iconUrl, genre, gpuWeight (0–1), cpuWeight (0–1), baseFps: { "1080p": n, "1440p": n, "2160p": n } (målt mot referanse-GPU/CPU), esports: boolean }`
- `Build { id (kort, delbar), createdAt, needs (JSON: NeedsProfile), tier ("SAVE"|"RECOMMENDED"|"PERFORMANCE"|"CUSTOM"|"UPGRADE"), items (JSON: {category, componentId, qty}[]), totalNok, validation (JSON snapshot), assemblyService: boolean }`
- `Order { id, buildId, createdAt, totalNok, status "SIMULATED" }`
- `TestSession { id, participantCode ("RESP-08"…), segment, taskDescription, startedAt, finishedAt, completed, confidenceScore (1–5), notes }`
- `Event { id, sessionId?, anonymousId, type, payload JSON, ts }`

### 6.4 NeedsProfile (utdata fra veiviseren)

```ts
NeedsProfile {
  budgetNok: number                      // 6 000–50 000
  includeOs: boolean                     // "Jeg har allerede Windows" → false
  uses: ("GAMING" | "STUDY" | "STREAMING" | "VIDEO_EDIT" | "PROGRAMMING" | "3D")[]
  games: string[]                        // game slugs
  resolution: "1080p" | "1440p" | "2160p"
  targetHz: 60 | 144 | 240
  preferences: { quiet?: boolean; small?: boolean; wifi?: boolean; rgb?: boolean; whiteBuild?: boolean }
  longevityYears: 3 | 5                  // "skal vare lenge" → prioriter AM5/DDR5, PSU-margin
  assemblyService: boolean
  existingParts?: { category, componentId | freeText }[]   // oppgraderingsmodus
}
```

---

## 7. Kompatibilitetsmotor (DP2) – presis spesifikasjon

### 7.1 Kontrakt

```ts
type Severity = "ERROR" | "WARNING" | "INFO";
interface RuleResult {
  ruleId: string;               // f.eks. "R03_GPU_LENGTH"
  severity: Severity;
  passed: boolean;
  involved: string[];           // component ids
  messagePlain: string;         // enkel norsk for kunden
  messageTechnical: string;     // for ekspertmodus, med tall
  fixSuggestion?: { action: "REPLACE" | "ADD" | "REMOVE"; category: Category; candidateIds?: string[] };
}
interface ValidationReport {
  ok: boolean;                  // true kun hvis 0 ERROR og komplett sjekkliste
  results: RuleResult[];
  checklist: ChecklistItem[];   // DP3
  power: PowerReport;
  totalNok: number;
}
validate(build: BuildItems, catalog: Catalog): ValidationReport
```

`ok === true` er *eneste* betingelse for å vise den grønne haken «Alt passer sammen» (DP4).

### 7.2 Regler (én fil per regel, hver med egne enhetstester – både bestått, feilet og grensetilfeller)

| ID | Regel | Alvorlighet | Kundevennlig melding (eksempel) |
|---|---|---|---|
| R01_SOCKET | CPU.socket === MB.socket | ERROR | «Prosessoren passer ikke i hovedkortet (ulik sokkel).» |
| R02_MEMORY_TYPE | RAM.memoryType === MB.memoryType, og CPU.memorySupport inkluderer den | ERROR | «Minnet (DDR4) passer ikke i dette hovedkortet (DDR5).» |
| R03_GPU_LENGTH | GPU.lengthMm ≤ CASE.maxGpuLengthMm. WARNING hvis margin < 10 mm | ERROR/WARNING | «Skjermkortet er 2 cm for langt for kabinettet.» *(RESP-04)* |
| R04_COOLER_HEIGHT | Luftkjøler: heightMm ≤ CASE.maxCoolerHeightMm | ERROR | «Kjøleren er for høy til at sidepanelet kan lukkes.» |
| R05_COOLER_SOCKET | COOLER.supportedSockets inkluderer CPU.socket | ERROR | |
| R06_COOLER_CAPACITY | COOLER.tdpRatingW ≥ CPU.tdpW (WARNING hvis < 1,2×) | ERROR/WARNING | «Kjøleren er litt svak – PC-en kan bli varm og bråkete.» |
| R07_RADIATOR_FIT | AIO.radiatorMm finnes i CASE.radiatorSupport | ERROR | |
| R08_FORM_FACTOR | MB.formFactor ∈ CASE.supportedMotherboards | ERROR | |
| R09_PSU_FORM | PSU.formFactor ∈ CASE.supportedPsu | ERROR | |
| R10_PSU_WATTAGE | PSU.wattage ≥ estimert last × 1,3 (ERROR < 1,0×, WARNING 1,0–1,3×). Se 7.3 | ERROR/WARNING | «Strømforsyningen har nok kraft, med 35 % margin.» |
| R11_PSU_CONNECTORS | PSU har kontaktene GPU krever (12V-2x6 eller antall 8-pin) | ERROR | «Strømforsyningen mangler riktig kabel til skjermkortet.» *(RESP-02)* |
| R12_RAM_SLOTS | RAM.modules ≤ MB.memorySlots og kapasitet ≤ maxMemoryGb | ERROR | |
| R13_M2_SLOTS | Antall NVMe ≤ MB.m2Slots; PCIe5-disk i PCIe4-spor → INFO (virker, men tregere) | ERROR/INFO | |
| R14_SATA | SATA-enheter ≤ MB.sataPorts og plass i kabinett | ERROR | |
| R15_DISPLAY_OUTPUT | Ingen GPU og CPU uten integrert grafikk → ERROR | ERROR | «Du trenger et skjermkort – denne prosessoren har ikke innebygd grafikk.» |
| R16_BIOS | CPU-generasjon ikke i MB.shipsWithBiosSupportFor → WARNING (INFO hvis biosFlashback) | WARNING | «Hovedkortet kan trenge en BIOS-oppdatering. Multicom gjør dette gratis ved montering.» |
| R17_RAM_HEIGHT | Høy RAM + stor luftkjøler med overheng → WARNING (forenklet: RAM.heightMm > 40 og kjøler i blacklist) | WARNING | |
| R18_THERMAL_PASTE | Ny kjøler uten forhåndspåført pasta og ingen pasta i build → sjekklisteinnslag | INFO | |
| R19_DUPLICATE_SINGLETON | Maks én CPU, ett MB, ett kabinett, én PSU | ERROR | |

Regel-registeret skal være en array slik at nye regler kan legges til uten å endre `validate.ts`. Hver regel er en ren funksjon `(ctx: BuildContext) => RuleResult[]`.

### 7.3 Strømberegning (`power.ts`)

```
lastW = CPU.tdpW × 1,25 (boost)
      + GPU.tbpW
      + 50 (hovedkort, RAM, vifter)
      + 8 per NVMe/SSD + 10 per HDD
      + 5 per ekstra vifte
anbefaltW = ceil(lastW × 1,3 / 50) × 50
```
Returner `{ lastW, anbefaltW, psuW, marginPct, status }` og vis det som en enkel måler («Strømforsyning: god margin»).

### 7.4 Komplett-pakke-sjekkliste (DP3, `checklist.ts`)

Obligatoriske poster: Prosessor, Hovedkort, Minne, Lagring, Strømforsyning, Kabinett. Betingede: Skjermkort (hvis CPU mangler iGPU eller bruk = gaming), CPU-kjøler (hvis CPU ikke har medfølgende kjøler – *RESP-06*), Kjølepasta (R18), Operativsystem (hvis `includeOs`; ellers vis «Du har oppgitt at du har Windows – husk lisensnøkkel»), Wi-Fi-adapter (hvis `preferences.wifi` og MB mangler Wi-Fi). Hver post: ✅ / ⚠️ / ❌ med én forklarende setning og en «Legg til anbefalt»-knapp.

### 7.5 Filtrering av kompatible alternativer (US-07)

`compatibleAlternatives(build, category, catalog)` returnerer kun komponenter som ikke introduserer noen ERROR når de byttes inn, sortert etter (a) ytelse-/pris-endring, (b) pris. Hver kandidat får `priceDeltaNok`, `perfDeltaPct` og eventuelle WARNINGs. Inkompatible kan vises i en sammenfoldet seksjon «Passer ikke (12)» med grunn, men kan ikke velges.

---

## 8. Generatoren (DP1 + DP3)

### 8.1 Budsjettfordeling per profil (startpunkt, justerbar i `generate.ts`)

| Profil | CPU | GPU | MB | RAM | Lagring | PSU | Kabinett | Kjøler |
|---|---|---|---|---|---|---|---|---|
| Gaming 1080p | 18 % | 38 % | 11 % | 7 % | 7 % | 7 % | 7 % | 5 % |
| Gaming 1440p/4K | 16 % | 45 % | 10 % | 7 % | 6 % | 7 % | 6 % | 3 % |
| E-sport høy Hz (CS2, Valorant) | 24 % | 32 % | 11 % | 8 % | 7 % | 7 % | 7 % | 4 % |
| Studier/kontor | 30 % | 0–10 % (iGPU ok) | 15 % | 12 % | 15 % | 10 % | 12 % | 6 % |
| Redigering/streaming | 26 % | 30 % | 11 % | 11 % | 9 % | 6 % | 5 % | 2 % |

OS-pris (hvis `includeOs`) trekkes fra budsjettet først. Montering (hvis valgt) trekkes også fra først.

### 8.2 Algoritme (deterministisk, < 300 ms for 2 000 komponenter)

1. **Plattformvalg:** Grupper på (socket, memoryType). For `longevityYears = 5` gi bonus til AM5/LGA1851 + DDR5.
2. **Kandidatbeskjæring:** For hver kategori, behold topp N (N=8) etter `nytte/pris` innenfor ±40 % av kategoriens budsjettandel. Fjern utsolgte (`stock = OUT`).
3. **Beam search:** Bygg kombinasjoner i rekkefølgen CPU → MB → RAM → GPU → CASE → COOLER → PSU → STORAGE. Etter hvert steg: forkast delbygg som bryter en ERROR-regel eller allerede overstiger budsjettet. Beam-bredde 50.
4. **Målfunksjon:**
   `score = Σ_spill( vekt × estimertFPS_normalisert ) × profilvekter + 0,1 × perfScoreMulti(hvis STUDY/EDIT) − straff(WARNINGs) − straff(støy hvis quiet) + bonus(lagerstatus IN_STOCK)`
5. **Etterfyll:** Kjør `checklist` og legg automatisk til det som mangler (kjøler, pasta, OS, Wi-Fi). Hvis dette sprenger budsjettet, nedgrader komponenten med lavest marginal nytte og prøv igjen.
6. **Tre nivåer (US-13):**
   - **Spar:** høyeste `score/pris` med total ≤ 85 % av budsjett.
   - **Anbefalt:** høyeste `score` med total ≤ budsjett. Markeres som standardvalg.
   - **Ytelse:** høyeste `score` med total ≤ 110 % av budsjett, tydelig merket «1 240 kr over budsjettet ditt».
7. **Invariant (testes med fast-check):** for ethvert gyldig `NeedsProfile` returnerer generatoren enten pakker der `validate().ok === true` og `total ≤ grense`, eller en forklarende feil `{ reason: "BUDGET_TOO_LOW", minimumNok }` med en vennlig melding («Det laveste vi får til en komplett spill-PC er 7 490 kr»).
8. **Forklaring:** For hver valgt del, generer en «Hvorfor denne?»-tekst fra maler i `explain.ts` (f.eks. «Vi brukte mer av budsjettet på skjermkortet fordi du spiller i 1440p.»).

### 8.3 Ytelses- og FPS-modell (`performance.ts`, US-09)

```
gpuFps = game.baseFps[res] × (GPU.perfScore / REF_GPU_SCORE)
cpuFps = game.baseFps["1080p"] × 1,6 × (CPU.perfScoreGaming / REF_CPU_SCORE) × game.cpuWeight-justering
fps    = min(gpuFps, cpuFps)
flaskehals = gpuFps < cpuFps ? "GPU" : "CPU"
```
- Vis som intervall (±15 %), avrundet til nærmeste 5, med etikett «Estimert ytelse» og tooltip «Basert på typiske tester – faktiske tall varierer med innstillinger.»
- Oversett til enkelt språk: < 45 fps «Spillbart», 45–90 «Jevnt», 90–144 «Veldig jevnt», > 144 «Konkurransenivå». Sammenlign mot `targetHz` («Når 240 Hz-skjermen din: Nesten»).
- Referanseverdier og `baseFps` er demo-data; dokumenter dette i `DECISIONS.md`.

---

## 9. UI/UX-spesifikasjon

### 9.1 Språk og tone
- Standardmodus: ingen fagord uten forklaring. Bruk «Prosessor (hjernen)», «Skjermkort (grafikken i spill)», «Strømforsyning», «Kabinett (kassen)». Fagbegrep vises i en «Ekspertmodus»-bryter øverst (US-14).
- Mikrotekst skal redusere frykt: «Du kan ikke velge noe som ikke passer», «Vi sjekker alt automatisk».

### 9.2 Visuell profil
- Rolig, tillitsvekkende, «byggepartner»-følelse. Mørk og lys modus (respekter `prefers-color-scheme`). Fargetokens på `:root`. Grønn (#16A34A-ish) reservert *kun* for «passer»-status; rød kun for blokkerende feil; gul for advarsler. Fargen er aldri eneste signal (ikon + tekst).
- Font: Inter eller Geist via next/font. Store klikkflater (≥ 44 px), mobil først.
- WCAG 2.2 AA: kontrast, fokusmarkering, tastaturnavigasjon i veiviseren, `aria-live` for valideringsstatus.

### 9.3 Skjermbilder

**Forside `/`** – Overskrift: «Få en PC som passer – uten å kunne alt om PC-deler.» To innganger: [Hjelp meg å velge] (→ veiviser, primær) og [Jeg vil bygge selv] (→ /bygg). Tre tillitspunkter med ikoner: «Alt sjekkes automatisk», «Ingenting mangler», «Kompatibilitetsgaranti». Prototypebanner.

**Veiviser `/veiviser`** (US-01, US-02) – 5 korte steg med fremdriftslinje, «Tilbake» alltid tilgjengelig, hvert steg på én skjerm:
1. *Budsjett:* stor slider 6 000–50 000 kr (steg 500) + hurtigknapper 10 000 / 14 000 / 20 000 / 30 000. Avkrysning «Inkluder Windows» (standard på) og «Inkluder montering (+999 kr)».
2. *Hva skal PC-en brukes til?* Flervalg-kort med ikon: Spill, Skole/studier, Streaming, Video/bilderedigering, Programmering, 3D.
3. *Hvilke spill?* (vises hvis Spill) – søkbart rutenett med spillkort (CS2, Valorant, Fortnite, League of Legends, Minecraft, EA FC, GTA V, Cyberpunk 2077, Elden Ring, Call of Duty, Baldur's Gate 3, Apex Legends, Rocket League, Counter-Strike mm.). «Vet ikke / mye forskjellig» er et gyldig valg.
4. *Skjerm:* «Hvilken skjerm har du?» Kort: Vanlig (1080p), Skarp (1440p), 4K – og oppdateringsfrekvens 60 / 144 / 240 Hz med forklaring «Står ofte på skjermen eller esken. Usikker? Velg 144 Hz».
5. *Ønsker (valgfritt):* Stillegående, Liten, Trådløst nett (Wi-Fi), RGB-lys, Hvit farge, «Skal vare lenge (5 år)».
→ Knapp «Vis PC-ene mine». Loggfør tid per steg (H1).

**Resultat `/pakke/[id]`** (US-03..09, US-13)
- Øverst: tre kort side ved side (stablet på mobil): Spar / **Anbefalt** (fremhevet) / Ytelse. Hvert kort: totalpris, budsjettindikator, grønt merke «✓ Alt passer sammen», 2–3 FPS-chips for brukerens spill, «Klar til levering om X dager».
- Under valgt pakke: deleliste. Hver rad: kategoriikon, enkelt navn, `plainSummary`, pris, lagerstatus, [Hvorfor denne?] (ekspanderer forklaring) og [Bytt] (åpner sideskuff, US-07).
- **Bytt-skuff:** kun kompatible alternativer, med «+800 kr · +12 % ytelse» eller «−400 kr · samme ytelse», eventuelle advarsler, og en kollaps «Passer ikke (n)» med grunner. Etter bytte: animer valideringsstatus, oppdater FPS og totalpris.
- **Ytelsespanel:** stolpediagram per valgt spill med intervall + tekstlig nivå + flaskehals-forklaring.
- **Strømmåler** (US-15): «Bruker ca. 420 W av 650 W – god margin.»
- **Kompatibilitetskart** (US-21, Kan): SVG-diagram der delene er noder og regelsjekkene er kanter (grønn/gul/rød). Klikk på kant → regelforklaring.
- Sticky bunnlinje: total + [Legg pakken i handlekurven].

**Ekspertmodus `/bygg`** (US-14) – PCPartPicker-lignende tabell per kategori med fulle spesifikasjoner og filtre. Live validering i sidepanel (samme motor, kjører på klient). Inkompatible rader gråes ut med tooltip-grunn; brukeren kan likevel *se* dem.

**Oppgrader `/oppgrader`** (US-18, Kan) – Brukeren velger delene de har (søk i katalog eller fritekst «Vet ikke»), velger hva som skal oppgraderes og budsjett. Generator låser eksisterende deler og fyller resten. Advarsel hvis gammel PSU er for svak.

**Handlekurv `/handlekurv`** (DP3, DP4 – *Point of Cause*) – Dette er det viktigste skjermbildet for H2:
- Stort statusfelt øverst: grønn hake «Alt passer sammen – vi har sjekket 19 ting» (klikk for liste over sjekkene) *eller* tydelig rød/gul liste over hva som må fikses med ett-klikks-fiks.
- Sjekkliste (7.4) med ✅ for hver nødvendig del.
- **Kompatibilitetsgaranti-boks:** «Hvis delene i denne pakken ikke passer sammen, bytter vi dem kostnadsfritt.» + lenke «Les vilkår (prototype)». Formuler nøkternt – Forbrukertilsynet er interessent; ikke lov mer enn kompatibilitet (ikke monteringsfeil).
- Tilvalg: «Vi bygger den for deg (+999 kr) – testet og klar til bruk». Tilvalg: «Spør en PC-bygger før du bestiller» (US-19, åpner skjema/simulert chat med forhåndsskrevne svar).
- Hvis brukeren endrer handlekurven manuelt (fjerner kjøler o.l.), valider på nytt umiddelbart.

**Kasse `/kasse`** – Simulert skjema (navn, adresse – feltene kan fylles med «Test»), betalingsmåter vises som deaktiverte illustrasjoner. Knapp «Fullfør (simulert)». Ingen data sendes noe sted unntatt egen DB, og kun pakke-ID + anonym ID lagres.

**Bekreftelse** – Ordre-ID, oppsummering, kompatibilitetssertifikat (utskriftsvennlig) og personlig byggeguide (US-20): rekkefølge-sjekkliste generert fra delene (f.eks. «Sett prosessoren i sokkelen – trekanten skal peke mot ...», «Hovedkortet ditt støtter M.2 – disken skrus i sporet nærmest CPU»).

### 9.4 Tomtilstander og feil
- Budsjett for lavt → vennlig melding med minimumsbeløp og [Juster budsjett].
- Ingen spill valgt → bruk generell profil.
- API-feil → behold siste gyldige tilstand, vis «Noe gikk galt, prøv igjen».

---

## 10. Seed-data, eksterne data og «se at alt fungerer»

### 10.1 Kuratert seed-katalog (`/seed/components/*.json`)
Lag **minst 150 realistiske komponenter** med alle felt fra 6.2, priser i NOK på 2026-nivå (omtrentlige demo-priser), fordelt omtrent slik:

- CPU (16): AM4 (Ryzen 5 5600, Ryzen 7 5700X3D), AM5 (Ryzen 5 7600, 9600X, Ryzen 7 7800X3D, 9700X, 9800X3D, Ryzen 9 9900X), LGA1700 (i3-14100F, i5-14400F, i5-14600K, i7-14700K), LGA1851 (Core Ultra 5 245K, Ultra 7 265K) + minst to *uten* integrert grafikk og to *med* medfølgende kjøler.
- Hovedkort (20): A520/B550 (DDR4), A620/B650/B850/X870 (DDR5), B760 DDR4 og DDR5, Z790, B860/Z890; blanding av ATX/mATX/ITX, med og uten Wi-Fi, varierende M.2-spor og BIOS-støtte.
- RAM (14): DDR4 2×8/2×16 3200/3600, DDR5 2×16/2×32 5600/6000, én høy RGB-modell (> 44 mm).
- GPU (18): RTX 4060, RTX 5060, RTX 5060 Ti 16 GB, RTX 5070, RTX 5070 Ti, RTX 5080, RX 7600, RX 9060 XT, RX 9070, RX 9070 XT, Arc B580 – i både korte (≤ 250 mm) og lange (≥ 330 mm) varianter; minst to med 12V-2x6-kontakt.
- Lagring (14), PSU (14: 450–1000 W, Bronze/Gold, ATX/SFX, med/uten 12V-2x6), Kabinett (16: inkl. minst tre små mATX/ITX med maxGpuLength ≤ 300 mm og maxCoolerHeight ≤ 150 mm), Kjøler (14: luft 120–165 mm, AIO 240/280/360), OS (2), Tilbehør (6: kjølepasta, Wi-Fi-kort, montering 999 kr).
- Marker alle med `isDemoData: true`. Spesifikasjonene skal være så realistiske som mulig (sokkel, minnetype, TDP/TBP, lengder), men det er akseptabelt at de er omtrentlige – dokumenter dette.
- **«Feller»** (bevisst for testing): et 340 mm skjermkort, et kabinett med 290 mm GPU-grense, en 165 mm luftkjøler, et SFX-kabinett, en 450 W PSU uten 12V-2x6, et B650-kort uten BIOS-støtte for 9000-serien, en CPU uten iGPU og uten kjøler.

### 10.2 Eksterne datakilder (US-22) – valgfritt, men ønsket
Multicom har ikke et offentlig API. Implementer importører bak `ProductSource`-adapteren:
1. **Åpne datasett på GitHub** – f.eks. `docyx/pc-part-dataset` (JSON/CSV skrapet fra PCPartPicker) eller BuildCores OpenDB. **Før bruk: verifiser at repoet finnes, sjekk lisensen og hvilke felt som faktisk finnes.** Skriv en mapper som konverterer til vårt Zod-skjema; felt som mangler (f.eks. GPU-lengde eller kabinettklaring) settes til `null` og komponenten merkes `incompleteForValidation: true` og **brukes ikke av generatoren** (garantien forutsetter kvalitetssikrede data – jf. Oppgave 3, kap. 3.6). Priser i USD konverteres med fast demo-kurs og merkes.
2. **CSV-opplasting i admin** – samme mapper, med forhåndsvisning og valideringsfeil per rad før import.
3. Ikke skrap Multicom.no eller andre nettbutikker.

### 10.3 Testscenarier (`/seed/scenarios.json`) – brukes av både Vitest og `/admin/scenarier`

| ID | Basert på | Input | Forventet |
|---|---|---|---|
| S01 | RESP-03 / Sander | 14 000 kr, Spill + Studier, CS2 + Fortnite, 1080p 144 Hz, Windows ja | 3 pakker, Anbefalt ≤ 14 000, `ok=true`, CS2 ≥ 144 fps (estimat) |
| S02 | RESP-05 (mor, konfirmasjon) | 10 000 kr, Spill, «Vet ikke», 1080p 60 Hz | Komplett pakke, OS inkludert, ingen fagord i forklaringene |
| S03 | RESP-06 (lavbudsjett) | 12 000 kr, Studier + litt spill | Kjøler og OS i sjekklisten er ✅ |
| S04 | RESP-04 (GPU for lang) | Manuell build: 340 mm GPU + 290 mm-kabinett | R03 ERROR, fiks-forslag med kompatible kabinetter/GPU-er |
| S05 | RESP-02 (strøm) | Manuell build: RTX 5070 Ti + 450 W PSU | R10 + R11 ERROR, anbefalt PSU-watt vises |
| S06 | Sokkel | Ryzen 7600 + B760-kort | R01 ERROR |
| S07 | Minne | DDR4-RAM + B650-kort | R02 ERROR |
| S08 | Mangler kjøler | i5-14600K uten kjøler | Sjekkliste ❌ «CPU-kjøler», `ok=false` |
| S09 | BIOS | Ryzen 9800X3D + eldre B650 | R16 WARNING, `ok` kan være true |
| S10 | Lavt budsjett | 4 000 kr spill | `BUDGET_TOO_LOW` med minimumsbeløp |
| S11 | RESP-07 oppgradering | Eksisterende: AM4 + B550 + DDR4 + 550 W, budsjett 6 000, oppgrader GPU | GPU-forslag som passer PSU, eller PSU-oppgradering inkludert |
| S12 | 4K entusiast | 35 000 kr, Cyberpunk, 2160p | GPU-tung fordeling, PSU ≥ anbefalt |

`/admin/scenarier` viser en tabell med ✅/❌ per scenario, kjøretid, og kan ekspanderes for å se pakken og valideringsrapporten. Én knapp: «Kjør alle».

### 10.4 Syntetisk stress-katalog
`pnpm seed:stress` genererer 2 000 syntetiske, men internt konsistente komponenter (deterministisk med fast seed via `@faker-js/faker` + `faker.seed(219)`). `/admin/stresstest` kjører 500 tilfeldige `NeedsProfile`-er og viser: andel gyldige pakker (mål 100 %), p50/p95 kjøretid (mål p95 < 300 ms), antall `BUDGET_TOO_LOW`, histogram over budsjettutnyttelse.

---

## 11. Måling av hypoteser (US-16)

- **Hendelser** (`/api/events`): `wizard_step_viewed`, `wizard_step_completed` (med ms), `wizard_completed`, `package_viewed`, `tier_selected`, `part_swap_opened`, `part_swapped`, `explanation_opened`, `validation_error_shown`, `checklist_fix_clicked`, `cart_viewed`, `cart_green_check_shown`, `checkout_started`, `checkout_completed`, `cart_abandoned` (ved navigasjon bort fra kasse uten fullføring), `expert_mode_toggled`, `ask_builder_opened`.
- **Testmodus `/test`:** Moderator oppgir deltakerkode (RESP-08 …), segment og oppgave (forhåndsutfylt: «Du har 14 000 kr og vil ha en PC til CS2 og studier. Finn en PC og legg den i handlekurven.»). Starter tidtaker, åpner butikken i samme fane med en diskret testlinje. Når kassen fullføres eller moderator avslutter: vis spørsmål «Hvor trygg er du på at PC-en vil fungere? (1–5)» + fritekstnotat.
- **`/admin/analyse`:** trakt (veiviser → pakke → handlekurv → kasse → fullført), median tid til komplett pakke (H1), andel som fullfører etter å ha sett grønn hake vs. ikke (H2), andel bestillinger med komplett sjekkliste (H3), gjennomsnittlig trygghetsscore per segment, eksport til CSV. Merk tydelig at små utvalg ikke gir statistisk signifikans.
- Anonym ID i `localStorage` (try/catch), ingen IP-lagring, ingen tredjeparts sporing.

---

## 12. API-kontrakter (eksempler)

```http
POST /api/generate
{ "needs": NeedsProfile }
→ 200 { "packages": [{ "tier": "SAVE"|"RECOMMENDED"|"PERFORMANCE", "buildId", "items", "totalNok", "validation", "fps": [{game, res, low, high, label, bottleneck}], "explanations": {category: string} }] }
→ 422 { "reason": "BUDGET_TOO_LOW", "minimumNok": 7490, "message": "..." }

POST /api/validate
{ "items": [{ "category", "componentId", "qty" }] }
→ 200 ValidationReport

GET /api/components?category=GPU&compatibleWith=<buildId>&maxPrice=6000&q=5070
→ 200 { "compatible": [...], "incompatible": [{ component, reasons: string[] }] }
```

Alle inn-data valideres med Zod; feil returnerer 400 med feltfeil. Rate-limit enkelt (in-memory) på `/api/events`.

---

## 13. Kvalitetskrav og akseptkriterier

**Funksjonelle (alle må være grønne før levering):**
- [ ] S01–S12 passerer i både Vitest og `/admin/scenarier`.
- [ ] Egenskapstest (fast-check, 1 000 kjøringer): alle genererte pakker har `validate().ok === true` og holder budsjettgrensen for sitt nivå.
- [ ] Hver regel R01–R19 har minst én bestått- og én feilet-test.
- [ ] Det er umulig å komme til grønn hake i handlekurven med en ERROR (E2E-test som manipulerer handlekurven).
- [ ] Playwright E2E «Sander-reisen»: forside → veiviser (14 000, CS2, 1080p 144 Hz) → Anbefalt → bytt GPU → handlekurv viser grønn hake → kasse → bekreftelse med byggeguide. Kjøres på desktop- og mobilviewport.
- [ ] Playwright E2E «RESP-04»: i /bygg, velg 340 mm GPU + lite kabinett → rød melding om lengde → ett-klikks-fiks → grønn.
- [ ] Ekspertmodus viser tekniske tall; standardmodus inneholder ingen av ordene «sokkel», «PCIe», «TDP», «chipset» uten forklaring (automatisert tekstsjekk på resultat- og handlekurvsiden).

**Ikke-funksjonelle:**
- [ ] Lighthouse mobil: Performance ≥ 85, Accessibility ≥ 95.
- [ ] axe-core: 0 kritiske/alvorlige brudd på alle kundesider.
- [ ] Generator p95 < 300 ms på stress-katalogen; validering < 10 ms på klient.
- [ ] Ingen horisontal scroll på 360 px bredde.
- [ ] `tsc --noEmit`, ESLint og alle tester grønne i CI.

---

## 14. Faser med verifiseringsporter

1. **Fase 1 – Fundament:** Next.js-oppsett, Tailwind/shadcn, Prisma + docker-compose, Zod-skjemaer for alle kategorier, seed-katalog (150+ komponenter, spill, scenarier), `pnpm db:seed`.
   *Port:* seed kjører uten Zod-feil; `/admin/katalog` lister alle komponenter med filtrering.
2. **Fase 2 – Motor:** regler R01–R19, `power.ts`, `checklist.ts`, `validate.ts`, `compatibleAlternatives`, `explain.ts` – med enhetstester.
   *Port:* ≥ 95 % linjedekning i `/lib/engine/rules`, S04–S09 grønne.
3. **Fase 3 – Generator og ytelse:** `generate.ts`, `performance.ts`, tre nivåer, `BUDGET_TOO_LOW`, fast-check-egenskapstest, `/admin/scenarier`, `/admin/stresstest`.
   *Port:* S01–S12 grønne; stresstest viser 100 % gyldige pakker og p95 < 300 ms.
4. **Fase 4 – Kundeflyt:** forside, veiviser, resultat med bytt-skuff, FPS, strømmåler, handlekurv med sjekkliste/garanti/montering, simulert kasse, bekreftelse med byggeguide, delbare lenker.
   *Port:* E2E «Sander-reisen» og «RESP-04» grønne på desktop + mobil; axe 0 alvorlige.
5. **Fase 5 – Ekspert, oppgrader, kart:** /bygg med live-validering, ekspertmodus-bryter, /oppgrader, kompatibilitetskart (SVG), «Spør en PC-bygger».
   *Port:* S11 grønn i UI; ekspertmodus-test grønn.
6. **Fase 6 – Måling:** hendelseslogging, /test moderatormodus, /admin/analyse med trakt og H1–H3, CSV-eksport.
   *Port:* en simulert testøkt (Playwright) gir riktige tall i analysesiden.
7. **Fase 7 – Ekstern data og deploy:** importør for åpent datasett + CSV-import med forhåndsvisning; GitHub Actions; deploy til Vercel + Neon; seed i prod.
   *Port:* offentlig URL fungerer, Lighthouse-mål nådd, `README.md` komplett.

---

## 15. Leveranser

- Kildekode i et Git-repo med fornuftige commits per fase.
- `README.md` (norsk): hva prototypen er, kobling til Oppgave 3/4 (DP1–DP4, H1–H3), skjermbilder, hvordan kjøre lokalt (`pnpm i`, `docker compose up -d`, `pnpm db:seed`, `pnpm dev`), hvordan kjøre tester, hvordan deploye, og en tabell **Brukerhistorie → Skjermbilde → Test**.
- `DECISIONS.md`: alle antakelser (demo-priser, FPS-modell, budsjettfordeling, garantiformulering, datakilder og lisenser).
- `docs/tjenesteplan.md`: en kort tjenesteplan (service blueprint) for SKAL-situasjonen med lagene *kundehandlinger → frontstage (veiviser, pakke, handlekurv) → backstage (regelmotor, generator, PC-byggere som kvalitetssikrer regler/data) → støttesystemer (produktdata, lager, ordre)*, slik at gruppen kan bruke den i Oppgave 4 kap. 6.
- `docs/brukertest-guide.md`: hvordan kjøre en brukertest med /test-modus, oppgavetekster for segmentene (førstegangskjøper, foresatt, lavbudsjett, oppgraderer), og hvordan lese /admin/analyse.
- Offentlig demo-URL.

---

## 16. Selvsjekk før du sier deg ferdig

Gå gjennom og bekreft eksplisitt i sluttrapporten:
1. Kan en ikke-teknisk bruker (RESP-05) komme fra forside til grønn hake i handlekurven uten å møte et uforklart fagord?
2. Er det *umulig* å få grønn hake med en inkompatibel eller ufullstendig pakke?
3. Kan en erfaren bruker fortsatt bytte hver eneste del?
4. Fanges RESP-04-tilfellet (GPU for lang) og RESP-06-tilfellet (glemt kjøler/OS) både i veiviser-flyten og i fri bygging?
5. Er alle demo-data og estimater tydelig merket, og er prototypebanneret synlig?
6. Kan hypotesene H1–H3 faktisk måles fra /admin/analyse etter en testøkt?
7. Er alle akseptkriterier i kapittel 13 grønne? List eventuelle som ikke er det, med årsak.

Avslutt med en kort rapport: hva som er bygget, demo-URL, testresultater (antall bestått/feilet), kjente begrensninger og foreslåtte neste steg for neste Build–Measure–Learn-runde.
