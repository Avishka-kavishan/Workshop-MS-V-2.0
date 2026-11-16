import { formatMillion, formatRupees, formatDualDeclaration, roundTo6Decimals, parseAmountToMn } from '../src/lib/financialFormat';

console.log('Testing 6 Decimal Places Precision across System:');
console.log('------------------------------------------------');
console.log('4.8 ->', formatMillion(4.8));
console.log('4.5 ->', formatMillion(4.5));
console.log('0.00005 (user entered in screenshot) ->', formatMillion(0.00005));
console.log('0.000005 (5 rupees) ->', formatMillion(0.000005));
console.log('0.000001 (1 rupee) ->', formatMillion(0.000001));
console.log('0 ->', formatMillion(0));
console.log('1825.316655 ->', formatMillion(1825.316655));

console.log('\nRupee Cent Equivalents:');
console.log('0.00005 Mn in Rs ->', formatRupees(0.00005, true));
console.log('0.000005 Mn in Rs ->', formatRupees(0.000005, true));
console.log('0.000001 Mn in Rs ->', formatRupees(0.000001, true));
console.log('4.8 Mn in Rs ->', formatRupees(4.8, true));

console.log('\nDual Declarations:');
console.log('Dual 0.00005 ->', formatDualDeclaration(0.00005).combined);
console.log('Dual 0.000005 ->', formatDualDeclaration(0.000005).combined);
console.log('Dual 4.8 ->', formatDualDeclaration(4.8).combined);

// Assertions
if (formatMillion(0.00005) !== '0.000050') throw new Error(`Expected 0.000050, got ${formatMillion(0.00005)}`);
if (formatMillion(0.000005) !== '0.000005') throw new Error(`Expected 0.000005, got ${formatMillion(0.000005)}`);
if (formatMillion(0.000001) !== '0.000001') throw new Error(`Expected 0.000001, got ${formatMillion(0.000001)}`);
if (formatMillion(4.8) !== '4.800000') throw new Error(`Expected 4.800000, got ${formatMillion(4.8)}`);
if (formatRupees(0.00005, true) !== 'Rs. 50.00') throw new Error(`Expected Rs. 50.00, got ${formatRupees(0.00005, true)}`);
if (formatRupees(0.000001, true) !== 'Rs. 1.00') throw new Error(`Expected Rs. 1.00, got ${formatRupees(0.000001, true)}`);

console.log('\nALL 6-DECIMAL TESTS PASSED SUCCESSFULLY!');
