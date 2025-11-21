// Test the dynamic permit generation logic
function incrementReferenceNumber(baseRefNo, increment) {
  if (!baseRefNo) return baseRefNo;

  const refNo = baseRefNo.replace("/Excise", "");
  const match = refNo.match(/(\d+)(\D*)$/);

  if (!match) return refNo;

  const number = parseInt(match[1], 10);
  const suffix = match[2];
  const prefix = refNo.substring(0, refNo.length - match[0].length);
  const paddingLength = match[1].length;

  return prefix + (number + increment).toString().padStart(paddingLength, "0") + suffix;
}

function generatePermitCopies(permitData) {
  const permitCopies = [];
  const baseRefNo = permitData.letterNo;
  const numberOfPermits = permitData.numberOfPermits;
  const copyNames = ["ORIGINAL", "DUPLICATE", "TRIPLICATE", "QUADRUPLICATE"];

  // Generate copies by copy type first, then by permit number
  // For each copy type (ORIGINAL, DUPLICATE, TRIPLICATE, QUADRUPLICATE)
  for (let copyTypeIndex = 0; copyTypeIndex < 4; copyTypeIndex++) {
    // For each permit number (1, 2, 3, etc.)
    for (let permitNumber = 0; permitNumber < numberOfPermits; permitNumber++) {
      const currentRefNo = permitNumber === 0 ? baseRefNo : incrementReferenceNumber(baseRefNo, permitNumber);
      
      permitCopies.push({
        letterNo: currentRefNo,
        copyType: copyNames[copyTypeIndex],
        permitNumber: permitNumber + 1,
      });
    }
  }

  return permitCopies;
}

// Test with different numberOfPermits values
console.log("=== TESTING DYNAMIC PERMIT GENERATION ===\n");

// Test 1: numberOfPermits = 1
console.log("TEST 1: numberOfPermits = 1");
let testData1 = { letterNo: "EXC/2024/001", numberOfPermits: 1 };
let copies1 = generatePermitCopies(testData1);
console.log(`Expected: ${testData1.numberOfPermits * 4} copies`);
console.log(`Generated: ${copies1.length} copies`);
copies1.forEach((copy, index) => {
  console.log(`${index + 1}. ${copy.letterNo} - ${copy.copyType}`);
});

console.log("\n" + "=".repeat(50) + "\n");

// Test 2: numberOfPermits = 5
console.log("TEST 2: numberOfPermits = 5");
let testData2 = { letterNo: "EXC/2024/001", numberOfPermits: 5 };
let copies2 = generatePermitCopies(testData2);
console.log(`Expected: ${testData2.numberOfPermits * 4} copies`);
console.log(`Generated: ${copies2.length} copies`);
copies2.forEach((copy, index) => {
  console.log(`${index + 1}. ${copy.letterNo} - ${copy.copyType}`);
});

console.log("\n" + "=".repeat(50) + "\n");

// Test 3: numberOfPermits = 2
console.log("TEST 3: numberOfPermits = 2");
let testData3 = { letterNo: "EXC/2024/001", numberOfPermits: 2 };
let copies3 = generatePermitCopies(testData3);
console.log(`Expected: ${testData3.numberOfPermits * 4} copies`);
console.log(`Generated: ${copies3.length} copies`);
copies3.forEach((copy, index) => {
  console.log(`${index + 1}. ${copy.letterNo} - ${copy.copyType}`);
});