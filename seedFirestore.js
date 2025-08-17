const admin = require("firebase-admin");
const { readFileSync } = require("fs");

// Load service account key
const serviceAccount = require("./serviceAccountKey.json");

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Load your existing JSON file
const seedData = JSON.parse(readFileSync("firestore-seed.json", "utf8"));

async function seed() {
  try {
    // Seed Users
    for (const [userId, userData] of Object.entries(seedData.users)) {
      await db.collection("users").doc(userId).set(userData);
      console.log(`✅ Added user: ${userId}`);
    }

    // Seed Notifications
    for (const [notifId, notifData] of Object.entries(seedData.notifications)) {
      await db.collection("notifications").doc(notifId).set(notifData);
      console.log(`✅ Added notification: ${notifId}`);
    }

    console.log("🎉 Done seeding Firestore!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error seeding:", err);
    process.exit(1);
  }
}

seed();
