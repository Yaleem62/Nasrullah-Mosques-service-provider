// Shared mock state (mirrors firestore-seed.json + a real signup doc)
exports.mockDocs = [
  { id: 'user1', data: () => ({ name: 'Ahmed Hassan', services: ['plumbing', 'electrical', 'generator repair'] }) },
  { id: 'user2', data: () => ({ name: 'Fatima Al-Zahra', services: ['tutoring', 'translation', 'arabic tutoring'] }) },
  { id: 'user3', data: () => ({ name: 'Omar Abdullah', services: ['catering', 'event setup', 'cooking'] }) },
  { id: 'newSignup', data: () => ({ fullName: 'Musa Ibrahim', email: 'musa@x.com' }) },
];
