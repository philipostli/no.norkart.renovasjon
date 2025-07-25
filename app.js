'use strict';

const Homey = require('homey');

module.exports = class MyApp extends Homey.App {

  /**
   * onInit is called when the app is initialized.
   */
  async onInit() {
    this.log('MinRenovasjon has been initialized');

    await this.initFlows();
  }

  async initFlows() {
    const condition = await this.homey.flow
      .getConditionCard('isSpecificWaste')
      .registerRunListener(
        (args) => {
          // Get the pickup date (Date object) from device method
          const pickupDate = args.device.getWastePickupDate(args.wasteType);
          
          if (!pickupDate) {
            return false;
          }
          
          const today = new Date();
          today.setHours(0, 0, 0, 0); // Reset time to start of day
          
          const pickupDateNormalized = new Date(pickupDate);
          pickupDateNormalized.setHours(0, 0, 0, 0); // Reset time to start of day
          
          // this.homey.log('waste_'+args.wasteType);
          // this.homey.log('Pickup date:', pickupDate);
          // this.homey.log('Today:', today);
          // this.homey.log('When:', args.when);
          
          if (args.when == 'today') {
            return pickupDateNormalized.getTime() === today.getTime();
          } else if (args.when == 'tomorrow') {
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            return pickupDateNormalized.getTime() === tomorrow.getTime();
          } else {
            return false;
          }
        }
      )
    
  }

};
