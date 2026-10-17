// Verifies firebase.js auth initialization on BOTH platforms against mocks
// that mirror the real @firebase/auth builds (web build lacks
// getReactNativePersistence; react-native build has it).
const Module = require('module');
const path = require('path');
const fs = require('fs');
const os = require('os');
const babel = require('@babel/core');

const repoRoot = path.join(__dirname, '..');
const callsPath = path.join(os.tmpdir(), 'firebase_test_auth_calls.json');

let code = babel.transformFileSync(path.join(repoRoot, 'firebase.js'), {
  presets: [require.resolve('babel-preset-expo', { paths: [repoRoot] })],
  babelrc: false, configFile: false, sourceType: 'module',
}).code;
if (/\bexport\b/.test(code)) {
  code = code
    .replace(/export const /g, 'const ')
    .replace(/export \{[^}]*\};?/g, '')
    .replace(/export default app;?/g, '');
  code += '\nmodule.exports = { auth, db, app };';
}
const compiledPath = path.join(__dirname, 'firebase.compiled.js');
fs.writeFileSync(compiledPath, code);

const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  const MOCKS = {
    'react-native': path.join(__dirname, 'mock_react_native.js'),
    'firebase/auth': path.join(__dirname, 'mock_firebase_auth.js'),
    'firebase/app': path.join(__dirname, 'mock_firebase_app.js'),
    'firebase/firestore': path.join(__dirname, 'mock_firebase_firestore.js'),
    '@react-native-async-storage/async-storage': path.join(__dirname, 'mock_async_storage.js'),
  };
  if (MOCKS[request]) return MOCKS[request];
  return origResolve.call(this, request, parent, ...rest);
};

function runScenario(platform, env = {}) {
  for (const k of Object.keys(require.cache)) {
    if ((k.includes('_tests') || k === compiledPath) && k !== __filename) delete require.cache[k];
  }
  fs.writeFileSync(callsPath, '[]');
  process.env.MOCK_PLATFORM = platform;
  for (const [k, v] of Object.entries(env)) process.env[k] = v;
  const mod = require(compiledPath);
  const calls = JSON.parse(fs.readFileSync(callsPath, 'utf8'));
  for (const k of Object.keys(env)) delete process.env[k];
  return { mod, calls };
}

let pass = 0, fail = 0;
const check = (name, cond, extra = '') => {
  cond ? pass++ : fail++;
  console.log((cond ? 'PASS' : 'FAIL') + '  ' + name + (extra ? '  ' + extra : ''));
};

const web = runScenario('web');
check('web: did NOT crash although getReactNativePersistence is undefined', true);
check('web: auth created via getAuth()', web.mod.auth?.type === 'getAuth', JSON.stringify(web.calls));
check('web: getReactNativePersistence was never called',
  !web.calls.some(([fn]) => fn === 'getReactNativePersistence'));

const native = runScenario('native');
check('native: auth created via initializeAuth()', native.mod.auth?.type === 'initializeAuth');
check('native: persistence backed by AsyncStorage',
  native.mod.auth?.persistence?.backed === 'AsyncStorage');

const hot = runScenario('native', { MOCK_ALREADY_INITIALIZED: '1' });
check('native hot reload: falls back to getAuth() instead of crashing', hot.mod.auth?.type === 'getAuth');

check('exports intact: db and default(app) export', !!web.mod.db && 'default' in web.mod);

console.log('\nRESULT: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail > 0 ? 1 : 0);
