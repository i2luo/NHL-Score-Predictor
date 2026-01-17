// Test script to verify API returns correct injury data
const fs = require('fs');
const path = require('path');

// Simulate what the API does
const detailedInjuryPath = path.join(__dirname, 'nhl_injuries_detailed.json');

console.log('='.repeat(60));
console.log('Testing Injury Data Loading');
console.log('='.repeat(60));

if (!fs.existsSync(detailedInjuryPath)) {
  console.error('❌ Injury data file not found at:', detailedInjuryPath);
  process.exit(1);
}

const detailedData = fs.readFileSync(detailedInjuryPath, 'utf-8');
const injuries = JSON.parse(detailedData);

console.log(`\n✅ Loaded ${injuries.length} total injuries from file\n`);

// Group injuries by team
const detailedInjuries = {};
injuries.forEach(injury => {
  const team = injury.team;
  if (team) {
    if (!detailedInjuries[team]) {
      detailedInjuries[team] = [];
    }
    detailedInjuries[team].push({
      player: injury.player || '',
      status: injury.status || '',
      timeline: injury.timeline || '',
      reason: injury.reason || ''
    });
  }
});

console.log('Injuries grouped by team:');
Object.keys(detailedInjuries).sort().forEach(team => {
  console.log(`  ${team}: ${detailedInjuries[team].length} players`);
});

// Test specific teams
console.log('\n' + '='.repeat(60));
console.log('Testing NYR injuries:');
console.log('='.repeat(60));
const nyrInjuries = detailedInjuries['NYR'] || [];
console.log(`Found ${nyrInjuries.length} NYR injuries:`);
nyrInjuries.forEach(inj => {
  console.log(`  - ${inj.player} (${inj.timeline}) - ${inj.reason}`);
});

console.log('\n' + '='.repeat(60));
console.log('Testing PIT injuries:');
console.log('='.repeat(60));
const pitInjuries = detailedInjuries['PIT'] || [];
console.log(`Found ${pitInjuries.length} PIT injuries:`);
pitInjuries.forEach(inj => {
  console.log(`  - ${inj.player} (${inj.timeline}) - ${inj.reason}`);
});

console.log('\n' + '='.repeat(60));
console.log('Testing PHI injuries:');
console.log('='.repeat(60));
const phiInjuries = detailedInjuries['PHI'] || [];
console.log(`Found ${phiInjuries.length} PHI injuries:`);
phiInjuries.forEach(inj => {
  console.log(`  - ${inj.player} (${inj.timeline}) - ${inj.reason}`);
});

// Check for wrong players
console.log('\n' + '='.repeat(60));
console.log('Checking for Cale Makar and Jake Oettinger:');
console.log('='.repeat(60));
let foundMakar = false;
let foundOettinger = false;
Object.keys(detailedInjuries).forEach(team => {
  detailedInjuries[team].forEach(inj => {
    if (inj.player.includes('Makar')) {
      console.log(`  ⚠️  Found Cale Makar on ${team}: ${inj.player}`);
      foundMakar = true;
    }
    if (inj.player.includes('Oettinger')) {
      console.log(`  ⚠️  Found Jake Oettinger on ${team}: ${inj.player}`);
      foundOettinger = true;
    }
  });
});
if (!foundMakar) console.log('  ✅ Cale Makar NOT in injury data (correct)');
if (!foundOettinger) console.log('  ✅ Jake Oettinger NOT in injury data (correct)');

console.log('\n' + '='.repeat(60));
console.log('Test Complete');
console.log('='.repeat(60));
