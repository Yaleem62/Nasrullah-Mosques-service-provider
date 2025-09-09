// src/utils/searchService.js
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";

// 🔍 Firestore search
export const firestoreSearch = async (query) => {
  if (!query) return [];
  const searchTerm = String(query).toLowerCase().trim();
  console.log("🔍 Firestore search for:", searchTerm);

  try {
    const snapshot = await getDocs(collection(db, "users"));

    const results = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((user) => Array.isArray(user.services))
      .filter((user) =>
        user.services.some(
          (service) =>
            typeof service === "string" &&
            service.toLowerCase().trim() === searchTerm
        )
      )
      .map((user) => ({
        ...user,
        matchingServices: user.services.filter(
          (s) =>
            typeof s === "string" &&
            s.toLowerCase().trim() === searchTerm
        ),
      }));

    console.log("🔍 Firestore search results:", results.map((u) => u.name));
    return results;
  } catch (error) {
    console.error("❌ Firestore search error:", error);
    return [];
  }
};

// 🔎 Local search (from cached usersData)
export const localSearch = (query, usersData) => {
  if (!query || !usersData) return [];
  const searchTerm = String(query).toLowerCase().trim();
  console.log("🔎 Local search for:", searchTerm);

  const results = Object.entries(usersData?.users || {})
    .map(([id, user]) => ({ id, ...user }))
    .filter((user) => Array.isArray(user.services))
    .filter((user) =>
      user.services.some(
        (service) =>
          typeof service === "string" &&
          service.toLowerCase().trim() === searchTerm
      )
    )
    .map((user) => ({
      ...user,
      matchingServices: user.services.filter(
        (s) =>
          typeof s === "string" &&
          s.toLowerCase().trim() === searchTerm
      ),
    }));

  console.log("🔎 Local search results:", results.map((u) => u.name));
  return results;
};

// 🌍 Unified search: first Firestore, fallback to local
export const runSearch = async (query, usersData) => {
  if (!query) return [];

  let results = await firestoreSearch(query);

  if (!results.length) {
    results = localSearch(query, usersData);
  }

  console.log(
    "🔍 Final search results:",
    results.map((u) => u.name || u.id)
  );

  return results;
};
