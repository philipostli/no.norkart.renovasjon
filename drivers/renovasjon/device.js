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
    
    // Create device-specific wasteType token
    this.wasteTypeToken = await this.homey.flow.createToken(`wasteType_${this.getData().id}`, {
      type: "string",
      title: `${this.homey.__('device.waste_type_tomorrow')} - ${this.getName()}`
    });

    // Create individual waste type tokens for tomorrow's pickup (yes/no)
    this.wasteTokens = {};
    const wasteTypes = [
      { key: 'general', name: 'Restavfall' },
      { key: 'paper', name: 'Papir' },
      { key: 'glass', name: 'Glass' },
      { key: 'plastic', name: 'Plast' },
      { key: 'bio', name: 'Matavfall' },
      { key: 'garden', name: 'Hageavfall' },
      { key: 'clothes', name: 'Tekstil' },
      { key: 'electrical', name: 'Elektrisk' },
      { key: 'special', name: 'Spesialavfall' }
    ];

    for (const wasteType of wasteTypes) {
      this.wasteTokens[wasteType.key] = await this.homey.flow.createToken(`waste${wasteType.key.charAt(0).toUpperCase() + wasteType.key.slice(1)}Tomorrow_${this.getData().id}`, {
        type: "boolean",
        title: `${wasteType.name} i morgen - ${this.getName()}`
      });
    }

    const settings = await this.getSettings();
    // this.log(this.getSettings());
    await this.updateFractions(settings.countyId, settings.streetName, settings.addressCode, settings.houseNumber);
    await this.processMinRenovasjonResponse(settings.countyId, settings.streetName, settings.addressCode, settings.houseNumber);
    
    // Setup daily cron job for updates
    await this.setupDailyCronJob();

    // Initial token update
    await this.updateWasteTypeToken();
    await this.updateIndividualWasteTokens();
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
    // this.log('MinRenovasjon settings were changed');
    // this.log('Changed keys:', changedKeys);
    
    // Check if any waste display settings were changed
    const wasteSettingsChanged = changedKeys.some(key => key.startsWith('waste_'));
    
    if (wasteSettingsChanged) {
      // this.log('Waste display settings changed - updating capabilities and next_pickup_days');
      
      // Handle capability changes based on settings
      for (const key of changedKeys) {
        if (key.startsWith('waste_')) {
          if (newSettings[key] === false) {
            // Remove capability if disabled
            if (this.hasCapability(key)) {
              await this.removeCapability(key);
              // this.log(`Removed capability: ${key}`);
            }
          } else if (newSettings[key] === true) {
            // Add capability back if enabled and we have data for it
            if (this.wasteData && this.fractions) {
              // Find if we have data for this capability
              const fraction = this.fractions.find(f => {
                const capabilityName = this.getCapabilityNameForFraction(f.Navn);
                return capabilityName === key;
              });
              
              if (fraction && this.wasteData[fraction.Id]) {
                if (!this.hasCapability(key)) {
                  await this.addCapability(key);
                  // this.log(`Added capability: ${key}`);
                }
                
                // Set the capability value
                const date = this.wasteData[fraction.Id];
                const dateString = date.toLocaleDateString('no-NO', { 
                  weekday: 'short', 
                  day: 'numeric', 
                  month: 'short' 
                });
                await this.setCapabilityValue(key, dateString);
                // this.log(`Set ${key} to: ${dateString}`);
              }
            }
          }
        }
      }
      
      // Recalculate next_pickup_days based on enabled waste types
      if (this.wasteData && this.fractions) {
        await this.updateNextPickupDays(newSettings);
        await this.updateIndividualWasteTokens();
      }
    }
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
    
    // Cleanup device-specific tokens
    if (this.wasteTypeToken) {
      try {
        await this.wasteTypeToken.unregister();
        this.log('WasteType token unregistered');
      } catch (error) {
        this.homey.error('Failed to unregister wasteType token:', error);
      }
    }

    // Cleanup individual waste tokens
    if (this.wasteTokens) {
      for (const [wasteType, token] of Object.entries(this.wasteTokens)) {
        try {
          await token.unregister();
          this.log(`${wasteType} token unregistered`);
        } catch (error) {
          this.homey.error(`Failed to unregister ${wasteType} token:`, error);
        }
      }
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
        
        // Update wasteType token for tomorrow's pickup
        await this.updateWasteTypeToken();
        await this.updateIndividualWasteTokens();
        
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
      // Testdata: Use test calendar data instead of API call
      // const data = [
      //   {"FraksjonId":1,"Tommedatoer":["2025-07-28T00:00:00","2025-08-13T00:00:00"]},
      //   {"FraksjonId":3,"Tommedatoer":["2025-07-27T00:00:00","2025-08-13T00:00:00"]},
      //   {"FraksjonId":2,"Tommedatoer":["2025-07-30T00:00:00","2025-08-27T00:00:00"]},
      //   {"FraksjonId":4,"Tommedatoer":["2025-07-28T00:00:00","2025-09-24T00:00:00"]},
      //   {"FraksjonId":7,"Tommedatoer":["2025-07-28T00:00:00","2025-08-27T00:00:00"]}
      // ];
      
      // this.log('Using test calendar data instead of API');
      
      // Original API code (commented out for testing):
      
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
      
      const settings = await this.getSettings();
      // this.log(settings);

      // Remove capabilities that are no longer in the calendar data
      await this.removeObsoleteCapabilities(wasteData, settings);

      // Iterate over the wasteData object keys (fraction IDs)
      for (const fractionId of Object.keys(wasteData)) {
        const nextDate = wasteData[fractionId];
        const norwegianDate = nextDate.toLocaleDateString('no-NO', {
          weekday: 'short',
          month: 'short',
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
        
        // Check if user wants to show this capability
        if (settings[capabilityName] === false) {
          continue; // Skip adding/updating this capability if user has disabled it
        }
        
        // Add capability if it doesn't exist and set value
        if (!this.hasCapability(capabilityName)) {
          await this.addCapability(capabilityName);
        }
        await this.setCapabilityValue(capabilityName, norwegianDate);
      }
        
        // Find the earliest date and its fraction ID (only for enabled capabilities)
        let earliestDate = null;
        let earliestFractionId = null;
        
        for (const fractionId of Object.keys(wasteData)) {
          const date = wasteData[fractionId];
          
          // Check if this fraction has a corresponding enabled capability
          const fraction = this.fractions.find(f => f.Id == fractionId);
          if (fraction) {
            const capabilityName = this.getCapabilityNameForFraction(fraction.Navn);
            if (capabilityName && settings[capabilityName] === false) {
              continue; // Skip this fraction if its capability is disabled
            }
          }
          
          if (!earliestDate || date < earliestDate) {
            earliestDate = date;
            earliestFractionId = fractionId;
          }
        }
        
        await this.updateNextPickupDays(settings, earliestDate, earliestFractionId);
      

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

  async removeObsoleteCapabilities(wasteData, settings) {
    try {
      // Get all waste-related capabilities currently on the device
      const currentCapabilities = this.getCapabilities().filter(cap => cap.startsWith('waste_'));
      
      // Build set of valid capability names from current wasteData
      const validCapabilities = new Set();
      
      if (this.fractions) {
        for (const fractionId of Object.keys(wasteData)) {
          const fraction = this.fractions.find(f => f.Id == fractionId);
          if (fraction) {
            const capabilityName = this.getCapabilityNameForFraction(fraction.Navn);
            if (capabilityName) {
              validCapabilities.add(capabilityName);
            }
          }
        }
      }
      
      // Remove capabilities that are no longer valid
      for (const capability of currentCapabilities) {
        if (!validCapabilities.has(capability)) {
          this.log(`Removing obsolete capability: ${capability}`);
          await this.removeCapability(capability);
        }
      }
      
    } catch (error) {
      this.homey.error('Failed to remove obsolete capabilities:', error);
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

  getWastePickedUpTomorrow() {
    // Use the new function to get all pickups, but return in old format for compatibility
    const pickups = this.getAllWastePickedUpTomorrow();
    
    if (pickups.length > 0) {
      // Return the first pickup for backward compatibility
      return { 
        hasPickup: true, 
        wasteType: pickups[0].wasteType,
        fractionName: pickups[0].fractionName 
      };
    }

    return { hasPickup: false, wasteType: null };
  }

  async updateWasteTypeToken() {
    try {
      // Get all waste types being picked up tomorrow
      const tomorrowPickups = this.getAllWastePickedUpTomorrow();
      
      if (tomorrowPickups.length > 0) {
        // Get fraction names for all pickups
        const fractionNames = tomorrowPickups.map(pickup => pickup.fractionName);
        
        // Format the names with proper Norwegian grammar
        let tokenValue;
        if (fractionNames.length === 1) {
          tokenValue = fractionNames[0];
        } else if (fractionNames.length === 2) {
          tokenValue = `${fractionNames[0]} og ${fractionNames[1]}`;
        } else {
          // More than 2: use commas and "og" before the last one
          const lastItem = fractionNames.pop();
          tokenValue = `${fractionNames.join(', ')} og ${lastItem}`;
        }
        
        await this.wasteTypeToken.setValue(tokenValue);
        this.log(`Updated wasteType token to: ${tokenValue}`);
      } else {
        // No pickup tomorrow, set to empty value
        await this.wasteTypeToken.setValue('');
        this.log('Updated wasteType token to empty (no pickup tomorrow)');
      }
    } catch (error) {
      this.homey.error('Failed to update wasteType token:', error);
    }
  }

  async updateIndividualWasteTokens() {
    try {
      if (!this.wasteTokens) {
        return; // Tokens not initialized yet
      }

      // Get all waste types being picked up tomorrow
      const tomorrowPickups = this.getAllWastePickedUpTomorrow();
      const tomorrowWasteTypes = new Set(tomorrowPickups.map(pickup => pickup.wasteType));

      // Update each individual waste token
      const wasteTypes = ['general', 'paper', 'glass', 'plastic', 'bio', 'garden', 'clothes', 'electrical', 'special'];
      
      for (const wasteType of wasteTypes) {
        if (this.wasteTokens[wasteType]) {
          const hasPickup = tomorrowWasteTypes.has(wasteType);
          await this.wasteTokens[wasteType].setValue(hasPickup);
          // this.log(`Updated ${wasteType} token to: ${hasPickup}`);
        }
      }
    } catch (error) {
      this.homey.error('Failed to update individual waste tokens:', error);
    }
  }

  getAllWastePickedUpTomorrow() {
    if (!this.wasteData || !this.fractions) {
      return [];
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0); // Reset time to start of day

    const settings = this.getSettings();
    const pickups = [];

    // Check all waste data for tomorrow's pickups
    for (const fractionId of Object.keys(this.wasteData)) {
      const pickupDate = this.wasteData[fractionId];
      const pickupDateNormalized = new Date(pickupDate);
      pickupDateNormalized.setHours(0, 0, 0, 0);

      if (pickupDateNormalized.getTime() === tomorrow.getTime()) {
        // Find the fraction info
        const fraction = this.fractions.find(f => f.Id == fractionId);
        if (fraction) {
          const capabilityName = this.getCapabilityNameForFraction(fraction.Navn);
          
          // Only include if this capability is enabled in settings
          if (capabilityName && settings[capabilityName] !== false) {
            // Map capability name to wasteType for the flow
            const wasteTypeMap = {
              'waste_general': 'general',
              'waste_paper': 'paper',
              'waste_plastic': 'plastic',
              'waste_bio': 'bio',
              'waste_glass': 'glass',
              'waste_garden': 'garden',
              'waste_special': 'special',
              'waste_electrical': 'electrical',
              'waste_clothes': 'clothes'
            };
            
            const wasteType = wasteTypeMap[capabilityName] || 'general';
            
            pickups.push({ 
              wasteType: wasteType,
              fractionName: fraction.Navn 
            });
          }
        }
      }
    }

    return pickups;
  }

  async updateNextPickupDays(settings, earliestDate = null, earliestFractionId = null) {
    // If no earliest date provided, calculate it from wasteData
    if (!earliestDate && this.wasteData && this.fractions) {
      for (const fractionId of Object.keys(this.wasteData)) {
        const date = this.wasteData[fractionId];
        
        // Check if this fraction has a corresponding enabled capability
        const fraction = this.fractions.find(f => f.Id == fractionId);
        if (fraction) {
          const capabilityName = this.getCapabilityNameForFraction(fraction.Navn);
          if (capabilityName && settings[capabilityName] === false) {
            continue; // Skip this fraction if its capability is disabled
          }
        }
        
        if (!earliestDate || date < earliestDate) {
          earliestDate = date;
          earliestFractionId = fractionId;
        }
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
      
      // Always remove and re-add to ensure it appears last
      if (this.hasCapability('next_pickup_days')) {
        await this.removeCapability('next_pickup_days');
      }
      await this.addCapability('next_pickup_days');
      await this.setCapabilityValue('next_pickup_days', nextPickupText);
      
      // this.log(`Updated next pickup: ${nextPickupText}`);
    } else {
      // No enabled waste types have pickup dates, remove the capability
      if (this.hasCapability('next_pickup_days')) {
        await this.removeCapability('next_pickup_days');
        // this.log('Removed next_pickup_days - no enabled waste types');
      }
    }
  }

};
