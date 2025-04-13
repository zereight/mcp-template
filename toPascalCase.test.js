// toPascalCase.test.js
import { fileURLToPath } from 'url';
import path from 'path';
import process from 'process';

// Import the function to test from create_mcp_server.js
import { toPascalCase } from './create_mcp_server.js';

// Utility function to convert a string to PascalCase
// function toPascalCase(str) {
//   if (!str) return ''; // Handle empty or null input
//
//   // Check if the string contains separators
//   if (!str.includes('-') && !str.includes('_')) {
//     // No separators: capitalize first letter, keep the rest as is
//     // This handles cases like 'simple' and 'alreadyPascal'
//     return str.charAt(0).toUpperCase() + str.slice(1);
//   } else {
//     // Separators found: split, capitalize first letter, lowercase rest, join
//     return str
//       .split(/[-_]/) // Split by hyphen or underscore
//       .filter(part => part.length > 0) // Remove empty strings resulting from leading/trailing/double separators
//       .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()) // Capitalize first letter, lowercase rest
//       .join(''); // Join parts back together
//   }
// }

// --- Test Section for toPascalCase --- START
function runTests() {
  console.log('Running toPascalCase tests...');
  const testCases = [
    { input: 'google-docs-mcp', expected: 'GoogleDocsMcp' },
    { input: 'my_server_name', expected: 'MyServerName' },
    { input: 'simple', expected: 'Simple' },
    { input: 'alreadyPascal', expected: 'AlreadyPascal' }, // Handles already PascalCase
    { input: 'with-number-123', expected: 'WithNumber123' },
    { input: 'special_chars!@#', expected: 'SpecialChars!@#' }, // Non-alphanumeric are kept as is after split/join
    { input: '-leading-hyphen', expected: 'LeadingHyphen' }, // Handles leading hyphen
    { input: 'trailing-hyphen-', expected: 'TrailingHyphen' }, // Handles trailing hyphen
    { input: 'double--hyphen', expected: 'DoubleHyphen' },   // Handles double hyphen
    { input: 'ALL_CAPS_WORD', expected: 'AllCapsWord' }, // Handles all caps with underscore
    { input: 'kebab-case-example', expected: 'KebabCaseExample' },
    { input: 'snake_case_example', expected: 'SnakeCaseExample' },
    { input: 'mixed_Case-example', expected: 'MixedCaseExample' },
    { input: '', expected: '' }, // Handles empty string
    { input: null, expected: '' }, // Handles null input
    { input: 'a', expected: 'A' }, // Handles single character
    { input: '_a', expected: 'A' }, // Handles single char with leading underscore
  ];

  let failures = 0;
  testCases.forEach(test => {
    const result = toPascalCase(test.input);
    if (result === test.expected) {
      console.log(`  PASS: '${test.input}' -> '${result}'`);
    } else {
      console.error(`  FAIL: '${test.input}' -> '${result}' (Expected: '${test.expected}')`);
      failures++;
    }
  });

  if (failures === 0) {
    console.log('All toPascalCase tests passed!\n');
    return true;
  } else {
    console.error(`\n${failures} toPascalCase test(s) failed.\n`);
    return false;
  }
}

// Run tests only if the script is executed directly
const currentFilePath = fileURLToPath(import.meta.url);
const scriptPath = path.resolve(process.argv[1]);

if (currentFilePath === scriptPath) {
  const allPassed = runTests();
  process.exit(allPassed ? 0 : 1); // Exit with 0 if all tests pass, 1 otherwise
} 