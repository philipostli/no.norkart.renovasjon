'use strict';

const fs = require('fs');
const path = require('path');

// Mock device class to test calendar processing
class MockDevice {
  constructor() {
    this.wasteData = {};
    this.mockTomorrowDate = null; // For testing purposes
    this.fractions = [
      { Id: 1, Navn: "Restavfall" },
      { Id: 2, Navn: "Papiravfall" },
      { Id: 3, Navn: "Matavfall" },
      { Id: 4, Navn: "Glass- og metallemballasje" },
      { Id: 6, Navn: "Spesialavfall" },
      { Id: 7, Navn: "Plastemballasje" }
    ];
  }

  // Method to set mock tomorrow date for testing
  setMockTomorrowDate(date) {
    this.mockTomorrowDate = new Date(date);
    this.mockTomorrowDate.setHours(0, 0, 0, 0);
  }

  getCapabilityNameForFraction(fractionName) {
    // Define keywords to search for in fraction names and their corresponding capabilities
    const keywordToCapability = [
      { keywords: ['rest'], capability: 'waste_general' },
      { keywords: ['papir', 'papp'], capability: 'waste_paper' },
      { keywords: ['glass'], capability: 'waste_glass' },
      { keywords: ['plast', 'plastic'], capability: 'waste_plastic' },
      { keywords: ['spesial', 'special'], capability: 'waste_special' },
      { keywords: ['tekstil', 'klær'], capability: 'waste_clothes' },
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

  // Use the exact implementation from device.js
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

  // Use the exact implementation from device.js
  getWastePickedUpTomorrow() {
    if (!this.wasteData || !this.fractions) {
      return { hasPickup: false, wasteType: null };
    }

    // Use mock date if set, otherwise use real tomorrow
    const tomorrow = this.mockTomorrowDate || (() => {
      const t = new Date();
      t.setDate(t.getDate() + 1);
      t.setHours(0, 0, 0, 0);
      return t;
    })();

    // Mock settings - assume all waste types are enabled
    const settings = {
      waste_general: true,
      waste_paper: true,
      waste_bio: true,
      waste_glass: true,
      waste_plastic: true,
      waste_special: true
    };

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
          
          // Only return if this capability is enabled in settings
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
            
            return { 
              hasPickup: true, 
              wasteType: wasteType,
              fractionName: fraction.Navn 
            };
          }
        }
      }
    }

    return { hasPickup: false, wasteType: null };
  }



  // Simulate the calendar processing logic from device.js
  processCalendarData(calendarData) {
    const wasteData = {};

    calendarData.forEach(item => {
      const fraction = item.FraksjonId;
      item.Tommedatoer.forEach(dateString => {
        const date = new Date(dateString);
        if (!wasteData[fraction] || date < wasteData[fraction]) {
          wasteData[fraction] = date;
        }
      });
    });

    this.wasteData = wasteData;
    return wasteData;
  }

  getNextPickupDate(fractionId) {
    return this.wasteData[fractionId] || null;
  }

  getFormattedDate(date) {
    return date.toLocaleDateString('no-NO', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  }


}

function runCalendarTest() {
  console.log('🧪 Testing Calendar Processing...\n');
  console.log('='.repeat(50));
  
  // Test data from user query
  const testCalendarData = [
    {"FraksjonId":1,"Tommedatoer":["2025-07-28T00:00:00","2025-08-13T00:00:00"]},
    {"FraksjonId":3,"Tommedatoer":["2025-07-27T00:00:00","2025-08-13T00:00:00"]},
    {"FraksjonId":2,"Tommedatoer":["2025-07-30T00:00:00","2025-08-27T00:00:00"]},
    {"FraksjonId":4,"Tommedatoer":["2025-07-30T00:00:00","2025-09-24T00:00:00"]},
    {"FraksjonId":7,"Tommedatoer":["2025-07-30T00:00:00","2025-08-27T00:00:00"]}
  ];

  const device = new MockDevice();
  
  // Expected results - earliest date for each fraction
  const expectedResults = {
    1: new Date("2025-07-28T00:00:00"), // Restavfall
    2: new Date("2025-07-30T00:00:00"), // Papiravfall
    3: new Date("2025-07-27T00:00:00"), // Matavfall
    4: new Date("2025-07-30T00:00:00"), // Glass- og metallemballasje
    7: new Date("2025-07-30T00:00:00")  // Plastemballasje
  };

  console.log('📅 Processing calendar data...');
  const processedData = device.processCalendarData(testCalendarData);
  
  let passedTests = 0;
  let failedTests = 0;
  
  console.log('\n🔍 Testing earliest date extraction:');
  
  // Test each fraction's earliest date
  for (const [fractionId, expectedDate] of Object.entries(expectedResults)) {
    const actualDate = device.getNextPickupDate(parseInt(fractionId));
    
    if (actualDate && actualDate.getTime() === expectedDate.getTime()) {
      const fraction = device.fractions.find(f => f.Id == fractionId);
      const fractionName = fraction ? fraction.Navn : `Unknown (ID: ${fractionId})`;
      const formattedDate = device.getFormattedDate(actualDate);
      
      console.log(`✅ Fraksjon ${fractionId} (${fractionName}): ${formattedDate}`);
      passedTests++;
    } else {
      console.log(`❌ Fraksjon ${fractionId}:`);
      console.log(`   Expected: ${expectedDate.toISOString()}`);
      console.log(`   Got: ${actualDate ? actualDate.toISOString() : 'null'}`);
      failedTests++;
    }
  }

  console.log('\n🔍 Testing capability mapping:');
  
  // Test capability mapping for each fraction
  const capabilityTests = [
    { fractionId: 1, expectedCapability: 'waste_general' },
    { fractionId: 2, expectedCapability: 'waste_paper' },
    { fractionId: 3, expectedCapability: 'waste_bio' }, // Matavfall should map to waste_bio
    { fractionId: 4, expectedCapability: 'waste_glass' },
    { fractionId: 7, expectedCapability: 'waste_plastic' }
  ];

  capabilityTests.forEach(test => {
    const fraction = device.fractions.find(f => f.Id === test.fractionId);
    if (fraction) {
      const actualCapability = device.getCapabilityNameForFraction(fraction.Navn);
      
      if (actualCapability === test.expectedCapability) {
        console.log(`✅ ${fraction.Navn} → ${actualCapability || 'null'}`);
        passedTests++;
      } else {
        console.log(`❌ ${fraction.Navn}:`);
        console.log(`   Expected: ${test.expectedCapability || 'null'}`);
        console.log(`   Got: ${actualCapability || 'null'}`);
        failedTests++;
      }
    }
  });

  console.log('\n🔍 Testing waste type lookup:');
  
  // Test that getWastePickupDate returns correct dates for different waste types
  const wasteTypeTests = [
    { wasteType: 'general', expectedDate: new Date("2025-07-28T00:00:00"), expectedFractionId: 1 },
    { wasteType: 'paper', expectedDate: new Date("2025-07-30T00:00:00"), expectedFractionId: 2 },
    { wasteType: 'bio', expectedDate: new Date("2025-07-27T00:00:00"), expectedFractionId: 3 },
    { wasteType: 'glass', expectedDate: new Date("2025-07-30T00:00:00"), expectedFractionId: 4 },
    { wasteType: 'plastic', expectedDate: new Date("2025-07-30T00:00:00"), expectedFractionId: 7 }
  ];

  wasteTypeTests.forEach(test => {
    const actualDate = device.getWastePickupDate(test.wasteType);
    
    if (actualDate && actualDate.getTime() === test.expectedDate.getTime()) {
      const fraction = device.fractions.find(f => f.Id === test.expectedFractionId);
      console.log(`✅ wasteType '${test.wasteType}' → ${device.getFormattedDate(actualDate)} (Fraksjon ${test.expectedFractionId}: ${fraction.Navn})`);
      passedTests++;
    } else {
      console.log(`❌ wasteType '${test.wasteType}':`);
      console.log(`   Expected: ${device.getFormattedDate(test.expectedDate)} (Fraksjon ${test.expectedFractionId})`);
      console.log(`   Got: ${actualDate ? device.getFormattedDate(actualDate) : 'null'}`);
      failedTests++;
    }
  });

  console.log('\n🔍 Testing getWastePickedUpTomorrow():');
  
  // Test that getWastePickedUpTomorrow returns correct result when tomorrow is 28.07.2025
  device.setMockTomorrowDate("2025-07-28T00:00:00");
  const tomorrowResult = device.getWastePickedUpTomorrow();
  
  if (tomorrowResult.hasPickup === true && tomorrowResult.wasteType === 'general' && tomorrowResult.fractionName === 'Restavfall') {
    console.log(`✅ getWastePickedUpTomorrow() → hasPickup: true, wasteType: '${tomorrowResult.wasteType}', fractionName: '${tomorrowResult.fractionName}'`);
    passedTests++;
  } else {
    console.log(`❌ getWastePickedUpTomorrow() failed:`);
    console.log(`   Expected: hasPickup: true, wasteType: 'general', fractionName: 'Restavfall'`);
    console.log(`   Got: hasPickup: ${tomorrowResult.hasPickup}, wasteType: '${tomorrowResult.wasteType}', fractionName: '${tomorrowResult.fractionName}'`);
    failedTests++;
  }

  // Test when tomorrow has no pickup (e.g., 29.07.2025)
  device.setMockTomorrowDate("2025-07-29T00:00:00");
  const noPickupResult = device.getWastePickedUpTomorrow();
  
  if (noPickupResult.hasPickup === false && noPickupResult.wasteType === null) {
    console.log(`✅ getWastePickedUpTomorrow() (no pickup) → hasPickup: false, wasteType: null`);
    passedTests++;
  } else {
    console.log(`❌ getWastePickedUpTomorrow() (no pickup) failed:`);
    console.log(`   Expected: hasPickup: false, wasteType: null`);
    console.log(`   Got: hasPickup: ${noPickupResult.hasPickup}, wasteType: '${noPickupResult.wasteType}'`);
    failedTests++;
  }

  console.log('\n🔍 Testing earliest overall pickup date:');
  
  // Find the earliest date among all fractions
  let earliestDate = null;
  let earliestFractionId = null;
  
  for (const [fractionId, date] of Object.entries(processedData)) {
    if (!earliestDate || date < earliestDate) {
      earliestDate = date;
      earliestFractionId = parseInt(fractionId);
    }
  }
  
  const expectedEarliestDate = new Date("2025-07-27T00:00:00");
  const expectedEarliestFractionId = 3;
  
  if (earliestDate && earliestDate.getTime() === expectedEarliestDate.getTime() && 
      earliestFractionId === expectedEarliestFractionId) {
    const fraction = device.fractions.find(f => f.Id === earliestFractionId);
    console.log(`✅ Earliest pickup: ${device.getFormattedDate(earliestDate)} (${fraction.Navn})`);
    passedTests++;
  } else {
    console.log(`❌ Earliest pickup test failed:`);
    console.log(`   Expected: ${device.getFormattedDate(expectedEarliestDate)} (Fraksjon ${expectedEarliestFractionId})`);
    console.log(`   Got: ${earliestDate ? device.getFormattedDate(earliestDate) : 'null'} (Fraksjon ${earliestFractionId})`);
    failedTests++;
  }

  // Test summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Results:');
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📈 Success Rate: ${Math.round((passedTests / (passedTests + failedTests)) * 100)}%`);
  
  if (failedTests === 0) {
    console.log('\n🎉 All calendar processing tests passed!');
    return true;
  } else {
    console.log('\n💥 Some tests failed!');
    return false;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const success = runCalendarTest();
  process.exit(success ? 0 : 1);
}

module.exports = { runCalendarTest }; 