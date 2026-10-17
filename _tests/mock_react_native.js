// Mock of react-native for tests — Platform.OS driven by MOCK_PLATFORM env
module.exports = {
  Platform: { OS: process.env.MOCK_PLATFORM || 'ios' },
};
