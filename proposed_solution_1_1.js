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
