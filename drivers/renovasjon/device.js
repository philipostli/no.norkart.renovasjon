'use strict';

const Homey = require('homey');
const ApiHelper = require('../../lib/api-helper');
const cron = require('node-cron');

module.exports = class MyDevice extends Homey.Device {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.log('MinRenovasjon has been initialized');
    const settings = await this.getSettings();
    // this.log(this.getSettings());
    await this.updateFractions(settings.countyId, settings.streetName, settings.addressCode, settings.houseNumber);
    await this.processMinRenovasjonResponse(settings.countyId, settings.streetName, settings.addressCode, settings.houseNumber);
    
    // Setup daily cron job for updates
    await this.setupDailyCronJob();
  }

  /**
   * onAdded is called when the user adds the device, called just after pairing.
   */
  async onAdded() {
    this.log('MinRenovasjon has been added');
  }

  /**
   * onSettings is called when the user updates the device's settings.
   * @param {object} event the onSettings event data
   * @param {object} event.oldSettings The old settings object
   * @param {object} event.newSettings The new settings object
   * @param {string[]} event.changedKeys An array of keys changed since the previous version
   * @returns {Promise<string|void>} return a custom message that will be displayed
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('MinRenovasjon settings where changed');
  }

  /**
   * onRenamed is called when the user updates the device's name.
   * This method can be used this to synchronise the name to the device.
   * @param {string} name The new name
   */
  async onRenamed(name) {
    this.log('MinRenovasjon was renamed');
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
  async onDeleted() {
    this.log('MinRenovasjon has been deleted');
    
    // Stop cron job when device is deleted
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob.destroy();
      this.log('Cron job stopped and destroyed');
    }
  }

  async setupDailyCronJob() {
    const settings = await this.getSettings();

    // Schedule task to run every day at 03:00
    this.cronJob = cron.schedule('0 3 * * *', async () => {
      this.log('Running daily update at 03:00...');
      
      try {
        
        // Update fractions and waste data
        await this.updateFractions(settings.countyId, settings.streetName, settings.addressCode, settings.houseNumber);
        await this.processMinRenovasjonResponse(settings.countyId, settings.streetName, settings.addressCode, settings.houseNumber);
        
        this.log('Daily update completed successfully');
      } catch (error) {
        this.error('Daily update failed:', error);
      }
    }, {
      scheduled: true,
      timezone: "Europe/Oslo"
    });
    
    this.log('Daily cron job scheduled for 03:00 (Europe/Oslo timezone) for address: ' + settings.streetName + ' ' + settings.houseNumber);
  }

  async processMinRenovasjonResponse(countyID, streetName, streetCode, houseNumber) {

    try {
      // Use ApiHelper to get calendar data
      const addressData = {
        countyId: countyID,
        streetName: streetName,
        addressCode: streetCode,
        houseNumber: houseNumber
      };
      
      const data = await ApiHelper.getCalendar(addressData, this.homey);
      
      if (!data || data.length === 0) {
        this.log('No calendar data found');
        return;
      }

    


      const wasteData = {};

      data.forEach(item => {
        const fraction = item.FraksjonId;
        item.Tommedatoer.forEach(dateString => {
          const date = new Date(dateString);
          if (!wasteData[fraction] || date < wasteData[fraction]) {
            wasteData[fraction] = date;
          }
        });
            });

      // Store wasteData for flow access
      this.wasteData = wasteData;

      // this.log(wasteData);

      // Iterate over the wasteData object keys (fraction IDs)
      for (const fractionId of Object.keys(wasteData)) {
        const nextDate = wasteData[fractionId];
        const norwegianDate = nextDate.toLocaleDateString('no-NO', {
          weekday: 'long',
          month: 'long',
          day: 'numeric'
        });
        
        // Find the fraction object by ID
        const fraction = this.fractions.find(f => f.Id == fractionId);
        if (!fraction) {
          continue; // Skip if fraction not found
        }
        
        // Get the capability name based on fraction name keywords
        const capabilityName = this.getCapabilityNameForFraction(fraction.Navn);
        if (!capabilityName) {
          continue; // Skip if no matching capability
        }
        
        // Add capability if it doesn't exist and set value
        if (!this.hasCapability(capabilityName)) {
          await this.addCapability(capabilityName);
        }
        await this.setCapabilityValue(capabilityName, norwegianDate);
      }
        
        // Find the earliest date and its fraction ID
        let earliestDate = null;
        let earliestFractionId = null;
        
        for (const fractionId of Object.keys(wasteData)) {
          const date = wasteData[fractionId];
          if (!earliestDate || date < earliestDate) {
            earliestDate = date;
            earliestFractionId = fractionId;
          }
        }
        
        if (earliestDate) {
          // Calculate days until pickup
          const today = new Date();
          today.setHours(0, 0, 0, 0); // Reset time to start of day
          const timeDiff = earliestDate.getTime() - today.getTime();
          const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
          
          // Find fraction name from this.fractions
          const fraction = this.fractions.find(f => f.Id == earliestFractionId);
          const fractionName = fraction ? fraction.Navn : `Fraksjon ${earliestFractionId}`;
          
          const nextPickupText = `${daysDiff} ${this.homey.__('device.pickup.days_to')} ${fractionName}`;
          
          if (!this.hasCapability('next_pickup_days')) {
            await this.addCapability('next_pickup_days');
          }
          await this.setCapabilityValue('next_pickup_days', nextPickupText);
          
          // this.log(`Next pickup: ${nextPickupText}`);
        }
      

      // const groupedWasteInfo = await this.groupSimilarWasteTypes(wasteData);
      // const nextDateByWasteType = await this.getNextDateByWasteType(groupedWasteInfo);
      // const wasteTypesByDays = await this.getWasteTypesByDays(nextDateByWasteType);
      // await this.updateWasteTypes(nextDateByWasteType);
      // this.updateMeasureNextWasteDaysLeft(wasteTypesByDays);
      // //this.log(groupedWasteInfo);
      // await this.setDeviceStore(wasteTypesByDays);
      return;
      // return groupedWasteInfo;
    } catch (error) {
      if (error.response) {
          // Feil i API-responsen
          this.error(this.homey.__('device.error.no_calendar'));
        } else {
          // Annen feil
          this.error(this.homey.__('device.error.general'), error.message);
        }
    }
  }

  async updateFractions(countyID, streetName, streetCode, houseNumber) {

     const addressData = {
      countyId: countyID,
      streetName: streetName,
      addressCode: streetCode,
      houseNumber: houseNumber
    };
    
    const fractions = await ApiHelper.getFractions(addressData, this.homey);
    if (!fractions) {
      this.log('No fractions found');
      return;
    }
    // this.log(fractions);
    this.fractions = fractions;
  }

  getCapabilityNameForFraction(fractionName) {
    // Define keywords to search for in fraction names and their corresponding capabilities
    const keywordToCapability = [
      { keywords: ['rest'], capability: 'waste_general' },
      { keywords: ['papir', 'papp'], capability: 'waste_paper' },
      { keywords: ['glass'], capability: 'waste_glass' },
      { keywords: ['plast', 'plastic'], capability: 'waste_plastic' },
      { keywords: ['spesial', 'special'], capability: 'waste_special' },
      { keywords: ['tekstil'], capability: 'waste_clothes' },
      { keywords: ['hage', 'garden'], capability: 'waste_garden' },
      { keywords: ['hvitevarer', 'EE', 'farlig'], capability: 'waste_electrical' },
      { keywords: ['mat', 'bio', 'organic'], capability: 'waste_bio' }
    ];

    const fractionNameLower = fractionName.toLowerCase();
    
    // Find matching capability based on keywords
    for (const mapping of keywordToCapability) {
      if (mapping.keywords.some(keyword => fractionNameLower.includes(keyword.toLowerCase()))) {
        return mapping.capability;
      }
    }
    
    return null; // No matching capability found
  }

  getWastePickupDate(wasteType) {
    if (!this.wasteData || !this.fractions) {
      return null;
    }

    // Define keywords to search for in fraction names
    const wasteTypeKeywords = {
      'general': ['rest'],
      'paper': ['papir', 'papp'],
      'glass': ['glass'],
      'plastic': ['plast', 'plastic'],
      'special': ['spesial', 'special'],
      'clothes': ['tekstil'],
      'garden': ['hage', 'garden'],
      'electrical': ['hvitevarer', 'EE', 'farlig'],
      'bio': ['mat', 'bio', 'organic']
    };

    const keywords = wasteTypeKeywords[wasteType];
    if (!keywords) {
      return null;
    }

    // Find fraction by searching for keywords in the name (case insensitive)
    const fraction = this.fractions.find(f => {
      const fractionName = f.Navn.toLowerCase();
      return keywords.some(keyword => fractionName.includes(keyword.toLowerCase()));
    });

    if (!fraction) {
      return null;
    }

    // Return the Date object from wasteData
    return this.wasteData[fraction.Id] || null;
  }

};
