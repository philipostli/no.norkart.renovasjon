# Renovasjon App Tests

Denne mappen inneholder tester for MinRenovasjon appen.

## Testfiler

### 1. `test-capability-mapping.js`
Hovedtestfil som kjører alle tester og gir en samlet rapport.

**Kjør alle tester:**
```bash
npm test
```

Eller direkte:
```bash
node test/test-capability-mapping.js
```

### 2. `test-fractions.json` og `test-fractions-2.json`
Testdata for å verifisere at fraksjonsnavn mappes korrekt til capabilities.

### 3. `test-calendar-processing.js`
Tester prosessering av renovasjonskalenderdata. Denne testen verifiserer:

- **Datautvinning**: At tidligste dato for hver fraksjon ekstraheres korrekt
- **Capability mapping**: At fraksjoner mappes til riktige capabilities
- **Tidligste henting**: At den tidligste hentedatoen identifiseres korrekt

**Kjør kun kalendertesten:**
```bash
node test/test-calendar-processing.js
```

## Testdata

Kalendertesten bruker følgende testdata:
```json
[
  {"FraksjonId":1,"Tommedatoer":["2025-07-28T00:00:00","2025-08-13T00:00:00"]},
  {"FraksjonId":3,"Tommedatoer":["2025-07-27T00:00:00","2025-08-13T00:00:00"]},
  {"FraksjonId":2,"Tommedatoer":["2025-07-30T00:00:00","2025-08-27T00:00:00"]},
  {"FraksjonId":4,"Tommedatoer":["2025-07-30T00:00:00","2025-09-24T00:00:00"]},
  {"FraksjonId":7,"Tommedatoer":["2025-07-30T00:00:00","2025-08-27T00:00:00"]}
]
```

### Forventede resultater:
- **Fraksjon 1 (Restavfall)**: 28. juli 2025 → `waste_general`
- **Fraksjon 2 (Papiravfall)**: 30. juli 2025 → `waste_paper`  
- **Fraksjon 3 (Matavfall)**: 27. juli 2025 → `waste_bio`
- **Fraksjon 4 (Glass- og metallemballasje)**: 30. juli 2025 → `waste_glass`
- **Fraksjon 7 (Plastemballasje)**: 30. juli 2025 → `waste_plastic`

**Tidligste henting**: 27. juli 2025 (Matavfall)

## Testresultater

Når alle tester kjøres, får du en rapport som viser:
- ✅ Bestått tester
- ❌ Feilede tester  
- 📈 Suksessrate
- 🏆 Samlet oversikt

Eksempel output:
```
🏆 OVERALL TEST RESULTS
============================================================
📁 Test files: 3
🧪 Total tests: 47
✅ Total passed: 46
❌ Total failed: 1
📈 Overall success rate: 98%
``` 