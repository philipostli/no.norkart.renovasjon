# Analyse av problemet
Bruker opplever at status ikon på flis bir resatt hver natt, mulig på grunn av restart. Problemets årsak må undersøkes.

Teknologier/biblioteker involvert:
- Homey App
- JavaScript
- JSON

## Kort analyse av problemet
Problemets årsak kan være at status ikonet ikke blir lagret korrekt eller at det blir nullstilt under restart. For å løse dette må vi undersøke hvordan status ikonet lagres og oppdateres i appen.

## Foreslåtte kodeendringer
Før vi kan foreslå kodeendringer må vi se på hvordan status ikonet lagres og oppdateres i appen. I denne appen ser det ut til at status ikonet er en del av `app.json` filen.

```json
// app.json
{
  "id": "com.example.app",
  "version": "1.0.0",
  "name": "Min Renovasjon",
  "description": "Min Renovasjon App",
  "icons": {
    "small": "assets/images/small.png",
    "large": "assets/images/large.png",
    "xlarge": "assets/images/xlarge.png"
  },
  "capabilities": [
    // ...
  ]
}
```

For å løse problemet må vi lagre status ikonet i en persistent lagring så det ikke blir nullstilt under restart. Vi kan bruke Homey sin innebygde `settings` API til å lagre status ikonet.

```javascript
// app.js
const Homey = require('homey');

class MinRenovasjonApp extends Homey.App {
  async onInit() {
    // ...
    this.statusIcon = await this.getSetting('statusIcon');
    if (!this.statusIcon) {
      this.statusIcon = 'default-icon'; // default icon
      await this.setSetting('statusIcon', this.statusIcon);
    }
  }

  async onRestart() {
    // ...
    await this.setSetting('statusIcon', this.statusIcon);
  }

  async setStatusIcon(icon) {
    this.statusIcon = icon;
    await this.setSetting('statusIcon', this.statusIcon);
  }
}
```

I ovenstående kode lagrer vi status ikonet i `settings` API under `onInit` metoden. Vi også oppdaterer status ikonet under `onRestart` metoden og i en egen `setStatusIcon` metode.

## Nye filer som må opprettes
Ingen nye filer må opprettes.

## Tester
For å teste løsningen kan vi lagre en test i `test` mappen.

```javascript
// test/test-status-icon.js
const Homey = require('homey');
const MinRenovasjonApp = require('../app');

describe('Min Renovasjon App', () => {
  it('should save status icon', async () => {
    const app = new MinRenovasjonApp();
    await app.onInit();
    const statusIcon = await app.getSetting('statusIcon');
    expect(statusIcon).toBe('default-icon');
  });

  it('should update status icon', async () => {
    const app = new MinRenovasjonApp();
    await app.onInit();
    await app.setStatusIcon('new-icon');
    const statusIcon = await app.getSetting('statusIcon');
    expect(statusIcon).toBe('new-icon');
  });
});
```

## Dokumentasjonsoppdateringer
Vi må oppdatere dokumentasjonen til å inkludere den nye `setStatusIcon` metoden og hvordan status ikonet lagres og oppdateres.

```markdown
// README.md
## Status Ikon
Status ikonet lagres i Homey sin innebygde `settings` API. For å oppdatere status ikonet kan du bruke `setStatusIcon` metoden.
```