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

  getStandardizedFractionName(fractionName) {
    // Simplified version for testing - just return the original name
    return fractionName;
  }

  getFractionsOnEarliestDate(settings = null) {
    if (!this.wasteData || !this.fractions) {
      return { earliestDate: null, fractions: [] };
    }

    // Find earliest date (no need to filter past dates - already done in processCalendarData)
    let earliestDate = null;
    for (const fractionId of Object.keys(this.wasteData)) {
      const date = this.wasteData[fractionId];
      
      // Check if this fraction has a corresponding enabled capability (if settings provided)
      if (settings) {
        const fraction = this.fractions.find(f => f.Id == fractionId);
        if (fraction) {
          const capabilityName = this.getCapabilityNameForFraction(fraction.Navn);
          if (capabilityName && settings[capabilityName] === false) {
            continue; // Skip this fraction if its capability is disabled
          }
        }
      }
      
      if (!earliestDate || date < earliestDate) {
        earliestDate = date;
      }
    }

    if (!earliestDate) {
      return { earliestDate: null, fractions: [] };
    }

    // Find all fractions that have pickup on the earliest date
    const fractionsOnEarliestDate = [];
    for (const fractionId of Object.keys(this.wasteData)) {
      const date = this.wasteData[fractionId];
      
      // Check if this date matches the earliest date
      if (date.getTime() === earliestDate.getTime()) {
        // Check if this fraction has a corresponding enabled capability (if settings provided)
        const fraction = this.fractions.find(f => f.Id == fractionId);
        if (fraction) {
          const capabilityName = this.getCapabilityNameForFraction(fraction.Navn);
          
          if (settings && capabilityName && settings[capabilityName] === false) {
            continue; // Skip this fraction if its capability is disabled
          }
          
          if (!settings || (capabilityName && settings[capabilityName] !== false)) {
            const standardizedName = this.getStandardizedFractionName(fraction.Navn);
            fractionsOnEarliestDate.push({
              id: parseInt(fractionId),
              name: standardizedName,
              originalName: fraction.Navn,
              capabilityName: capabilityName
            });
          }
        }
      }
    }

    return { earliestDate, fractions: fractionsOnEarliestDate };
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
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day

    calendarData.forEach(item => {
      const fraction = item.FraksjonId;
      item.Tommedatoer.forEach(dateString => {
        const date = new Date(dateString);
        
        // Skip dates that are in the past
        if (date < today) {
          return;
        }
        
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
  
  // Generate test data programmatically based on current date
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const dayAfterTomorrow = new Date(today);
  dayAfterTomorrow.setDate(today.getDate() + 2);
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  const nextMonth = new Date(today);
  nextMonth.setMonth(today.getMonth() + 1);
  
  const formatDate = (date) => date.toISOString().split('T')[0] + 'T00:00:00';
  
  const testCalendarData = [
    {"FraksjonId":1,"Tommedatoer":[formatDate(tomorrow), formatDate(nextWeek)]}, // Tomorrow
    {"FraksjonId":2,"Tommedatoer":[formatDate(dayAfterTomorrow), formatDate(nextMonth)]}, // Day after tomorrow
    {"FraksjonId":3,"Tommedatoer":[formatDate(tomorrow), formatDate(nextWeek)]}, // Tomorrow
    {"FraksjonId":4,"Tommedatoer":[formatDate(dayAfterTomorrow), formatDate(nextMonth)]}, // Day after tomorrow
    {"FraksjonId":6,"Tommedatoer":[formatDate(yesterday), formatDate(nextMonth)]}, // Yesterday (should be ignored)
    {"FraksjonId":7,"Tommedatoer":[formatDate(tomorrow), formatDate(nextMonth)]}  // Tomorrow
  ];
  
  console.log(`📅 Test dates generated relative to today (${today.toDateString()}):`);
  console.log(`   Yesterday: ${yesterday.toDateString()} (should be ignored)`);
  console.log(`   Tomorrow: ${tomorrow.toDateString()}`);
  console.log(`   Day after tomorrow: ${dayAfterTomorrow.toDateString()}`);

  const device = new MockDevice();
  
  // Expected results - earliest date for each fraction (using programmatic dates)
  // Note: Fraction 6 will have next month as earliest date since yesterday is filtered out
  const expectedResults = {
    1: new Date(formatDate(tomorrow)), // Restavfall - tomorrow
    2: new Date(formatDate(dayAfterTomorrow)), // Papiravfall - day after tomorrow
    3: new Date(formatDate(tomorrow)), // Matavfall - tomorrow
    4: new Date(formatDate(dayAfterTomorrow)), // Glass- og metallemballasje - day after tomorrow
    6: new Date(formatDate(nextMonth)), // Spesialavfall - next month (yesterday filtered out)
    7: new Date(formatDate(tomorrow))  // Plastemballasje - tomorrow
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

  console.log('\n🔍 Testing that past dates are ignored (using getFractionsOnEarliestDate):');
  
  // Test using the same helper function as updateNextPickupDays
  const result = device.getFractionsOnEarliestDate();
  
  const expectedEarliestFutureDate = new Date(formatDate(tomorrow));
  const expectedFractionIds = [1, 3, 7]; // Should be tomorrow's fractions, not yesterday's
  
  if (result.earliestDate && result.earliestDate.getTime() === expectedEarliestFutureDate.getTime() &&
      result.fractions.length === expectedFractionIds.length &&
      expectedFractionIds.every(id => result.fractions.some(f => f.id === id))) {
    
    const fractionNames = result.fractions.map(f => f.name).join(', ');
    console.log(`✅ Past dates ignored: Next pickup is ${device.getFormattedDate(result.earliestDate)}`);
    console.log(`   Fractions: ${fractionNames}`);
    console.log(`   (Fraction 6 from yesterday was correctly ignored)`);
    passedTests++;
  } else {
    console.log(`❌ Past date ignoring test failed:`);
    console.log(`   Expected date: ${device.getFormattedDate(expectedEarliestFutureDate)}`);
    console.log(`   Expected fractions: ${expectedFractionIds.join(', ')}`);
    console.log(`   Got date: ${result.earliestDate ? device.getFormattedDate(result.earliestDate) : 'null'}`);
    console.log(`   Got fractions: ${result.fractions.map(f => f.id).join(', ')}`);
    failedTests++;
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
    { wasteType: 'general', expectedDate: new Date(formatDate(tomorrow)), expectedFractionId: 1 },
    { wasteType: 'paper', expectedDate: new Date(formatDate(dayAfterTomorrow)), expectedFractionId: 2 },
    { wasteType: 'bio', expectedDate: new Date(formatDate(tomorrow)), expectedFractionId: 3 },
    { wasteType: 'glass', expectedDate: new Date(formatDate(dayAfterTomorrow)), expectedFractionId: 4 },
    { wasteType: 'plastic', expectedDate: new Date(formatDate(tomorrow)), expectedFractionId: 7 }
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
  
  // Test that getWastePickedUpTomorrow returns correct result for tomorrow (multiple pickups)
  device.setMockTomorrowDate(formatDate(tomorrow));
  const tomorrowResult = device.getWastePickedUpTomorrow();
  
  if (tomorrowResult.hasPickup === true && ['general', 'bio', 'plastic'].includes(tomorrowResult.wasteType)) {
    console.log(`✅ getWastePickedUpTomorrow() → hasPickup: true, wasteType: '${tomorrowResult.wasteType}', fractionName: '${tomorrowResult.fractionName}'`);
    passedTests++;
  } else {
    console.log(`❌ getWastePickedUpTomorrow() failed:`);
    console.log(`   Expected: hasPickup: true, wasteType: one of ['general', 'bio', 'plastic']`);
    console.log(`   Got: hasPickup: ${tomorrowResult.hasPickup}, wasteType: '${tomorrowResult.wasteType}', fractionName: '${tomorrowResult.fractionName}'`);
    failedTests++;
  }

  // Test when tomorrow has no pickup (using a date with no scheduled pickup)
  const noPickupDate = new Date(today);
  noPickupDate.setDate(today.getDate() + 5); // 5 days from today should have no pickup
  device.setMockTomorrowDate(formatDate(noPickupDate));
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

  console.log('\n🔍 Testing earliest overall pickup date and all fractions on that date:');
  
  // Find the earliest date among all fractions (ignoring past dates)
  const todayForComparison = new Date();
  todayForComparison.setHours(0, 0, 0, 0);
  
  let earliestDate = null;
  
  for (const [fractionId, date] of Object.entries(processedData)) {
    // Skip dates that are in the past
    if (date < todayForComparison) {
      continue;
    }
    
    if (!earliestDate || date < earliestDate) {
      earliestDate = date;
    }
  }
  
  // Find all fractions that have pickup on the earliest date
  const fractionsOnEarliestDate = [];
  for (const [fractionId, date] of Object.entries(processedData)) {
    if (earliestDate && date.getTime() === earliestDate.getTime()) {
      fractionsOnEarliestDate.push(parseInt(fractionId));
    }
  }
  
  const expectedEarliestDate = new Date(formatDate(tomorrow));
  const expectedFractionsOnEarliestDate = [1, 3, 7]; // All fractions with pickup tomorrow
  
  if (earliestDate && earliestDate.getTime() === expectedEarliestDate.getTime() && 
      fractionsOnEarliestDate.length === expectedFractionsOnEarliestDate.length &&
      expectedFractionsOnEarliestDate.every(id => fractionsOnEarliestDate.includes(id))) {
    const fractionNames = fractionsOnEarliestDate.map(id => {
      const fraction = device.fractions.find(f => f.Id === id);
      return fraction ? fraction.Navn : `Unknown (${id})`;
    });
    console.log(`✅ Earliest pickup: ${device.getFormattedDate(earliestDate)}`);
    console.log(`   Fractions: ${fractionNames.join(', ')}`);
    passedTests++;
  } else {
    console.log(`❌ Earliest pickup test failed:`);
    console.log(`   Expected date: ${device.getFormattedDate(expectedEarliestDate)}`);
    console.log(`   Expected fractions: ${expectedFractionsOnEarliestDate.join(', ')}`);
    console.log(`   Got date: ${earliestDate ? device.getFormattedDate(earliestDate) : 'null'}`);
    console.log(`   Got fractions: ${fractionsOnEarliestDate.join(', ')}`);
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