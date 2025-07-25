'use strict';

const fs = require('fs');
const path = require('path');

// Mock device class to test the function
class MockDevice {
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
}

function runTestFile(fileName, testNumber) {
  console.log(`\n🧪 Running Test Set ${testNumber}: ${fileName}`);
  console.log('='.repeat(50));
  
  // Load test data
  const testDataPath = path.join(__dirname, fileName);
  const testFractions = JSON.parse(fs.readFileSync(testDataPath, 'utf8'));
  
  const device = new MockDevice();
  let passedTests = 0;
  let failedTests = 0;
  
  // Test each fraction
  testFractions.forEach((fraction, index) => {
    const result = device.getCapabilityNameForFraction(fraction.Navn);
    const expected = fraction.expectedCapability;
    
    if (result === expected) {
      console.log(`✅ Test ${index + 1}: "${fraction.Navn}" → ${result || 'null'}`);
      passedTests++;
    } else {
      console.log(`❌ Test ${index + 1}: "${fraction.Navn}"`);
      console.log(`   Expected: ${expected || 'null'}`);
      console.log(`   Got: ${result || 'null'}`);
      failedTests++;
    }
  });
  
  // Test set summary
  console.log(`\n📊 Test Set ${testNumber} Results:`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📈 Success Rate: ${Math.round((passedTests / testFractions.length) * 100)}%`);
  
  return { passed: passedTests, failed: failedTests, total: testFractions.length };
}

function runTests() {
  console.log('🧪 Testing getCapabilityNameForFraction function...\n');
  
  const testFiles = [
    'test-fractions.json',
    'test-fractions-2.json'
  ];
  
  let totalPassed = 0;
  let totalFailed = 0;
  let totalTests = 0;
  
  // Run all test files
  testFiles.forEach((fileName, index) => {
    const results = runTestFile(fileName, index + 1);
    totalPassed += results.passed;
    totalFailed += results.failed;
    totalTests += results.total;
  });
  
  // Overall summary
  console.log('\n' + '='.repeat(60));
  console.log('🏆 OVERALL TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`📁 Test files: ${testFiles.length}`);
  console.log(`🧪 Total tests: ${totalTests}`);
  console.log(`✅ Total passed: ${totalPassed}`);
  console.log(`❌ Total failed: ${totalFailed}`);
  console.log(`📈 Overall success rate: ${Math.round((totalPassed / totalTests) * 100)}%`);
  
  if (totalFailed === 0) {
    console.log('\n🎉 All tests passed across all test files!');
    process.exit(0);
  } else {
    console.log('\n💥 Some tests failed!');
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests }; 