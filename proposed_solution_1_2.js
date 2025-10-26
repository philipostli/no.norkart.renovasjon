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
