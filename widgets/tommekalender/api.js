'use strict';

module.exports = {
  async getWasteData({ homey, query }) {
    try {
      
      const driver = await homey.drivers.getDriver('renovasjon');
      const devices = await driver.getDevices();
      let device = devices[0];
      const result = [];
      
      if (query.deviceId) {
        device = devices.find(device => device.getId() === query.deviceId);
      }
      
      if (device) {
        const capabilities = device.getCapabilities();
        
        const wasteCapabilities = [];
        let nextPickupDays = null;
        let nextPickupInfo = null;

        // Get all waste capabilities
        for (const capabilityId of capabilities) {
          if (capabilityId.startsWith('waste_')) {
            const value = device.getCapabilityValue(capabilityId);
            if (value) {
              const capabilityDef = homey.app.manifest.capabilities[capabilityId];
              const iconUrl = `${capabilityId}.png`;
              
              // Get the localized title from the capability definition
              const userLanguage = homey.i18n.getLanguage();
              const title = capabilityDef?.title?.[userLanguage] || capabilityDef?.title?.no || capabilityId;         
              
              wasteCapabilities.push({
                id: capabilityId,
                title: title,
                value: value,
                icon: iconUrl
              });
            }
          } else if (capabilityId === 'next_pickup_days') {
            nextPickupDays = device.getCapabilityValue(capabilityId);
          }
        }

        if (wasteCapabilities.length > 0 || nextPickupDays) {
          if (nextPickupDays) {
            nextPickupInfo = parseNextPickupText(nextPickupDays, homey);
            
            // Find matching waste capabilities for the next pickup
            if (nextPickupInfo && nextPickupInfo.wasteTypes) {
              nextPickupInfo.matchingWasteCapabilities = findMatchingWasteCapabilities(
                nextPickupInfo.wasteTypes, 
                wasteCapabilities,
                homey
              );
            }
          }

          result.push({
            deviceId: device.getData().id,
            deviceName: device.getName(),
            wasteCapabilities: wasteCapabilities,
            nextPickupDays: nextPickupDays,
            nextPickupInfo: nextPickupInfo
          });
        }
      } else {
        homey.log('No device found');
      }
      
      return result;
    } catch (error) {
      homey.error('Error getting waste data:', error);
      return [];
    }
  }
};

function parseNextPickupText(text, homey) {
  // Parse text like "2 dager til Restavfall" or "1 dag til Restavfall" (Norwegian)
  // or "2 days until General waste" or "1 day until General waste" (English)
  const norwegianMatch = text.match(/(\d+)\s+(dag|dager)\s+til\s+(.+)/);
  const englishMatch = text.match(/(\d+)\s+(day|days)\s+until\s+(.+)/);
  
  const match = norwegianMatch || englishMatch;
  
  if (match) {
    const days = parseInt(match[1]);
    const wasteTypes = match[3];
    
    let displayText;
    let isToday = false;
    let isTomorrow = false;
    
    if (days === 0) {
      displayText = homey.__('device.pickup.today');
      isToday = true;
    } else if (days === 1) {
      displayText = homey.__('device.pickup.tomorrow');
      isTomorrow = true;
    } else {
      displayText = `${days} ${homey.__('device.pickup.days_to')}`;
    }
    
    return {
      days: days,
      displayText: displayText,
      wasteTypes: wasteTypes,
      isToday: isToday,
      isTomorrow: isTomorrow
    };
  }
  
  return null;
}

function findMatchingWasteCapabilities(wasteTypesText, wasteCapabilities, homey) {
  const matchingCapabilities = [];
  
  // Split waste types text (e.g., "Restavfall og Papir" -> ["Restavfall", "Papir"])
  const wasteTypes = wasteTypesText.split(/\s+og\s+|\s*,\s*/);
  
  // Create a mapping from English to Norwegian waste type names
  const wasteTypeMapping = {
    'General waste': 'Restavfall',
    'Paper waste': 'Papp/Papir',
    'Plastic': 'Plast',
    'Food waste': 'Matavfall',
    'Glass and metal packaging': 'Glass/Metall',
    'Glass/Metal': 'Glass/Metall',
    'Garden waste': 'Hageavfall',
    'Special waste': 'Spesialavfall',
    'Electrical': 'Elektrisitet',
    'Clothes': 'Klær'
  };
  
  for (const wasteType of wasteTypes) {
    
    // Try to find a Norwegian equivalent
    const norwegianWasteType = wasteTypeMapping[wasteType] || wasteType;
    
    // Find capability that matches this waste type
    for (const capability of wasteCapabilities) {
      if (capability.title.toLowerCase().includes(norwegianWasteType.toLowerCase()) ||
          norwegianWasteType.toLowerCase().includes(capability.title.toLowerCase()) ||
          capability.title.toLowerCase().includes(wasteType.toLowerCase()) ||
          wasteType.toLowerCase().includes(capability.title.toLowerCase())) {
        matchingCapabilities.push(capability);
        break;
      }
    }
  }
  
  return matchingCapabilities;
}
