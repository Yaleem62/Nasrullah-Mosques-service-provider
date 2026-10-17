// Mock of firebase/firestore for tests (reads state from mock_state.js)
const { mockDocs } = require('./mock_state.js');
module.exports = {
  collection: () => ({}),
  getDocs: async () => ({ docs: mockDocs.map((d) => ({ id: d.id, data: () => d.data() })) }),
};
