// src/utils/searchService.js
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';

/**
 * Normalize any `services` value into a clean lowercase string array.
 * Fixes the "array issues": services can be undefined (users created via
 * SignupScreen have no services field yet), a single string, or an array
 * containing non-string entries. Previously `Array.isArray(user.services)`
 * filtered ALL such users out, making them permanently unsearchable.
 */
export const normalizeServices = (services) => {
  const normalizeOne = (s) =>
    String(s ?? '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();

  if (Array.isArray(services)) {
    return services.map(normalizeOne).filter(Boolean);
  }
  if (typeof services === 'string') {
    const single = normalizeOne(services);
    return single ? [single] : [];
  }
  return [];
};

const normalizeText = (value) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/**
 * A user matches when ANY of their services (or their display name) contains
 * ALL words of the query. Supports partial terms like "plumb" -> "plumbing"
 * and multi-word queries like "generator repair". Previously the search used
 * strict equality (`service === searchTerm`), so partial or extra words
 * returned zero results even when the array contained the service.
 */
export const matchesQuery = (user, rawQuery) => {
  const term = normalizeText(rawQuery);
  if (!term) return false;

  const words = term.split(' ').filter(Boolean);
  const services = normalizeServices(user?.services);
  const name = normalizeText(user?.name || user?.fullName);

  const serviceHit = services.some(
    (service) =>
      service.includes(term) || words.every((word) => service.includes(word))
  );
  const nameHit =
    name.includes(term) || (words.length > 0 && words.every((word) => name.includes(word)));

  return serviceHit || nameHit;
};

const findMatchingServices = (user, rawQuery) => {
  const term = normalizeText(rawQuery);
  const words = term.split(' ').filter(Boolean);
  return normalizeServices(user?.services).filter(
    (service) =>
      service.includes(term) || words.every((word) => service.includes(word))
  );
};

// 🔍 Firestore search
export const firestoreSearch = async (query) => {
  const searchTerm = normalizeText(query);
  if (!searchTerm) return [];

  try {
    const snapshot = await getDocs(collection(db, 'users'));

    const results = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((user) => matchesQuery(user, searchTerm))
      .map((user) => ({
        ...user,
        services: normalizeServices(user.services),
        matchingServices: findMatchingServices(user, searchTerm),
      }));

    return results;
  } catch (error) {
    console.error('❌ Firestore search error:', error);
    return [];
  }
};

// 🔎 Local search (from cached usersData)
export const localSearch = (query, usersData) => {
  const searchTerm = normalizeText(query);
  if (!searchTerm || !usersData) return [];

  // usersData may be `{ users: { id: user } }` OR already an array of users
  const entries = Array.isArray(usersData)
    ? usersData
    : Object.entries(usersData?.users || {}).map(([id, user]) => ({
        id,
        ...(user || {}),
      }));

  return entries
    .filter((user) => matchesQuery(user, searchTerm))
    .map((user) => ({
      ...user,
      services: normalizeServices(user.services),
      matchingServices: findMatchingServices(user, searchTerm),
    }));
};

// 🌍 Unified search: Firestore first, local cache as fallback
export const runSearch = async (query, usersData) => {
  const searchTerm = normalizeText(query);
  if (!searchTerm) return [];

  let results = await firestoreSearch(searchTerm);
  if (!results.length) {
    results = localSearch(searchTerm, usersData);
  }
  return results;
};
