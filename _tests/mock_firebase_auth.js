// Mock of firebase/auth simulating BOTH real builds:
//  - web build:    getReactNativePersistence is NOT exported (undefined)
//  - native build: it IS exported and wraps AsyncStorage
const os = require('os');
const path = require('path');
const fs = require('fs');
const callsPath = path.join(os.tmpdir(), 'firebase_test_auth_calls.json');
const readCalls = () => (fs.existsSync(callsPath) ? JSON.parse(fs.readFileSync(callsPath, 'utf8')) : []);
const pushCall = (fn) => {
  const calls = readCalls();
  calls.push([fn, process.env.MOCK_PLATFORM]);
  fs.writeFileSync(callsPath, JSON.stringify(calls));
};
module.exports = {
  getAuth: () => { pushCall('getAuth'); return { type: 'getAuth' }; },
  initializeAuth: (app, opts) => {
    pushCall('initializeAuth');
    if (process.env.MOCK_ALREADY_INITIALIZED === '1') {
      const err = new Error('Auth already initialized');
      err.code = 'auth/already-initialized';
      throw err;
    }
    return { type: 'initializeAuth', persistence: opts?.persistence };
  },
};
if (process.env.MOCK_PLATFORM === 'web') {
  module.exports.getReactNativePersistence = undefined;
} else {
  module.exports.getReactNativePersistence = (storage) => ({ backed: 'AsyncStorage', storage });
}
