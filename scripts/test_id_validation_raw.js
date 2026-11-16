const {
  validateSriLankanNic,
  validateSriLankanPassport,
  validateForeignPassport,
  validatePhone,
  validateEmail,
  compareResourcePersons,
  findSimilarResourcePersons,
} = require('../src/lib/idValidation.ts');

console.log("Testing Old NIC (Valid Male 1985):", validateSriLankanNic("851234567V"));
console.log("Testing Old NIC (Valid Female):", validateSriLankanNic("926451234X"));
console.log("Testing New NIC (Valid Male 1985):", validateSriLankanNic("198512304567"));
console.log("Testing New NIC (Valid Female 2001):", validateSriLankanNic("200164501234"));
console.log("Testing SL Passport:", validateSriLankanPassport("N1234567"));
console.log("Testing Foreign Passport:", validateForeignPassport("GB98765432"));
console.log("Testing Phone:", validatePhone("0771234567"));

// Cross match test
const personA = { nic: "851234567V", name: "Dr. Ranjith Dissanayake", workplace: "University of Peradeniya" };
const personB = { nic: "198512304567", name: "Prof. Ranjith Dissanayake", workplace: "Peradeniya" };
console.log("Cross Match Result:", compareResourcePersons(personA, personB));
