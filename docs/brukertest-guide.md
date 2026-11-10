# Brukertest-guide – Byggepartner

Slik kjører prosjektgruppen en modererte brukertest av prototypen og leser resultatene. Målet er å teste hypotesene H1–H3 fra Oppgave 4.

| Hypotese | Hva vi måler | Hvor |
|---|---|---|
| **H1** Budsjett + bruk først gir raskere og tryggere vei til komplett PC | Tid fra veiviser-start til PC-forslag, tid per steg (nøling), trygghet 1–5 | `/admin/analyse` → H1, Testøkter |
| **H2** Tydelig «Alt passer sammen» gir færre som stopper før betaling | Andel som fullfører blant de som så grønn hake, mot de som ikke gjorde det | `/admin/analyse` → H2 |
| **H3** Automatisk varsel om manglende deler gir komplett oppsett | Andel med komplett sjekkliste i handlekurven, antall deler lagt til via sjekklisten | `/admin/analyse` → H3 |

## Før testdagen

1. Nullstill analysedata fra utvikling: `pnpm analytics:reset` (lokalt). I produksjon: `pnpm analytics:reset --yes-really` med `DATABASE_URL` satt.
2. Sjekk at samtykkeskjemaet (Sikt ref. 722034) er signert. Deltakere identifiseres **kun** med kode (RESP-08, RESP-09 …). Skriv aldri navn i notatfeltet.
3. Bruk én PC/nettleser per deltaker. Testmodus lagres i nettleseren, så bruk gjerne et privat vindu per deltaker.

## Under testen

1. Gå til **`/test`**. Skriv deltakerkode, velg segment og eventuelt en tilpasset oppgave (se under). Trykk **«Start testøkt og åpne butikken»**. Handlekurven tømmes automatisk.
2. Les oppgaven høyt. Be deltakeren tenke høyt. Ikke hjelp med mindre de står helt fast (noter det i så fall).
3. Butikken viser en diskret linje øverst: *Testøkt RESP-xx · mm:ss · Avslutt testøkt*.
4. Økten avsluttes når deltakeren fullfører den simulerte bestillingen (spørsmålet om trygghet kommer automatisk), eller når moderator trykker **«Avslutt testøkt»**.
5. Deltakeren svarer: **«Hvor trygg er du på at PC-en vil fungere? (1–5)»**. Moderator krysser av for om oppgaven ble fullført, og skriver korte observasjoner (hvor de nølte, hva de sa).

## Oppgavetekster per segment

| Segment | Oppgave |
|---|---|
| **Førstegangskjøper** (Sander, RESP-03) | «Du har 14 000 kr og vil ha en PC til CS2 og studier. Finn en PC og legg den i handlekurven.» |
| **Foresatt** (RESP-05) | «Barnet ditt skal konfirmeres og ønsker seg en spill-PC. Du har 10 000 kr og vet ikke hvilke spill. Finn en PC du føler deg trygg på å kjøpe.» |
| **Lavbudsjett** (RESP-06) | «Du har 12 000 kr til en PC for skolearbeid og litt League of Legends. Sørg for at du ikke glemmer noe du trenger.» |
| **Oppgraderer** (RESP-07) | «Du har en PC med Ryzen 5 5600, B550-hovedkort, 16 GB minne og 550 W strømforsyning. Finn et nytt skjermkort for inntil 6 000 kr som passer.» (Start fra **Oppgrader** i menyen.) |
| **Erfaren** | «Bygg en PC selv i «Bygg selv». Prøv å sette inn et langt skjermkort i et lite kabinett, og se hva som skjer.» |

## Etter testen – slik leser du `/admin/analyse`

- Velg **«Bare testøkter»** for å utelate vanlige besøk.
- **Trakt:** hvor mange som kom til hvert steg. Et stort fall mellom «Åpnet handlekurven» og «Gikk til kassen» er nettopp Point of Cause (H2).
- **H1, tid per steg:** lange steg viser hvor folk nøler. Sammenlign med observasjonene.
- **H2:** sammenlign fullføring *med* og *uten* grønn hake.
- **H3:** andel med komplett pakke i handlekurven, og hvor mange deler som ble lagt til via sjekklisten.
- **Per segment / Testøkter:** varighet, om de fullførte, trygghet og notater per deltaker.
- **CSV-eksport** (øverst til høyre) for videre analyse i Excel eller R. Sammendraget har én rad per testøkt.

> **Merk:** med 5–10 deltakere er tallene indikasjoner, ikke statistisk signifikante. Bruk dem sammen med sitater og observasjoner i rapporten (Oppgave 4, Build–Measure–Learn).
