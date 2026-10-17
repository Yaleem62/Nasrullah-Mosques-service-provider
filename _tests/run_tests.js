// Test harness: compiles the real src/utils/searchService.js with the project's
// Babel preset, mocks firebase, and runs functional search test cases.
const Module = require('module');
const path = require('path');
const fs = require('fs');

const babel = require('@babel/core');
const repoRoot = path.join(__dirname, '..');

// 1. Compile the real module
const transformOptions = {
  presets: [require.resolve('babel-preset-expo', { paths: [repoRoot] })],
  babelrc: false,
  configFile: false,
  sourceType: 'module',
};
let code = babel.transformFileSync(path.join(repoRoot, 'src/utils/searchService.js'), transformOptions).code;

// Safety net: convert remaining ESM exports to CommonJS for node require()
if (/\bexport\b/.test(code)) {
  code = code
    .replace(/export const /g, 'const ')
    .replace(/export function /g, 'function ')
    .replace(/export \{[^}]*\};?/g, '');
  code += `\nmodule.exports = { normalizeServices, matchesQuery, firestoreSearch, localSearch, runSearch };\n`;
}
const compiledPath = path.join(__dirname, 'searchService.compiled.js');
fs.writeFileSync(compiledPath, code);

// 2. Mock firebase modules BEFORE requiring the compiled file
const MOCKS = {
  'firebase/firestore': path.join(__dirname, 'mock_firestore.js'),
  '../../firebase': path.join(__dirname, 'mock_firebase.js'),
};
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  if (MOCKS[request]) return MOCKS[request];
  return origResolve.call(this, request, parent, ...rest);
};

const { firestoreSearch, localSearch, matchesQuery } = require('./searchService.compiled.js');

let pass = 0, fail = 0;
function check(name, cond, extra = '') {
  cond ? pass++ : fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`);
}

(async () => {
  const cases = [
    ['plumb', 1, 'partial word match (THE reported array bug)'],
    ['Plumbing', 1, 'case-insensitive'],
    ['repair', 1, 'substring inside array item "generator repair"'],
    ['tutor', 1, 'substring inside array item "tutoring"'],
    ['generator repair', 1, 'multi-word exact service'],
    ['Ahmed', 1, 'name-based match'],
    ['xyznothing', 0, 'true miss stays a miss'],
  ];
  for (const [q, expected, desc] of cases) {
    const r = await firestoreSearch(q);
    check(`firestoreSearch("${q}") -> ${expected} (${desc})`, r.length === expected,
      `[${r.map((u) => u.name || u.fullName).join(', ')}]`);
  }

  const byName = await firestoreSearch('musa');
  check('signup doc WITHOUT services array is found by name', byName.length === 1);

  const empty = await firestoreSearch(undefined);
  check('undefined/empty query returns [] without crash', Array.isArray(empty) && empty.length === 0);

  const usersData = { users: { user1: { name: 'Ahmed Hassan', services: ['plumbing', 'electrical'] } } };
  const local = localSearch('plumb', usersData);
  check('localSearch partial match + matchingServices populated',
    local.length === 1 && local[0].matchingServices.includes('plumbing'));

  check('matchesQuery(null, "plumb") is safe', matchesQuery(null, 'plumb') === false);
  check('services stored as a single string still matches',
    matchesQuery({ services: 'plumbing' }, 'plumb') === true);

  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
})().catch((e) => {
  console.error('TEST RUNNER ERROR:', e);
  process.exit(1);
});
