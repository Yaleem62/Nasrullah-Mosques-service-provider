// src/screens/DashboardScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Title, Text, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ServiceCard from '../components/ServiceCard';
import SearchBar from '../components/SearchBar';
import { servicesList } from '../utils/serviceList';
import { normalizeServices } from '../utils/searchService';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';

// 🔹 Local fallback data
const usersData = {
  users: {
    user1: {
      id: 'user1',
      name: 'Ahmed Hassan',
      phone: '+1234567890',
      email: '1234567890@mosque.app',
      services: ['plumbing', 'electrical', 'generator repair'],
      profileViews: 15,
      contactsReceived: 8,
    },
    user2: {
      id: 'user2',
      name: 'Fatima Al-Zahra',
      phone: '+1234567891',
      email: '1234567891@mosque.app',
      services: ['tutoring', 'translation', 'arabic tutoring'],
      profileViews: 22,
      contactsReceived: 12,
    },
    user3: {
      id: 'user3',
      name: 'Omar Abdullah',
      phone: '+1234567892',
      email: '1234567892@mosque.app',
      services: ['catering', 'event setup', 'cooking'],
      profileViews: 31,
      contactsReceived: 18,
    },
  },
};

// Aligned with src/utils/serviceList.js so every quick-search chip can
// actually match a provider. Previously contained entries such as
// 'electrician', 'beauty' and 'fitness' that exist in NO provider's services
// array, so tapping them always returned "No providers found".
const POPULAR_SERVICES = [
  'plumbing',
  'cleaning',
  'tutoring',
  'electrical',
  'gardening',
  'handyman',
  'tailoring',
  'catering',
  'photography',
  'cooking',
];

export default function DashboardScreen({ navigation }) {
  const [providers, setProviders] = useState([]);
  const [allProviders, setAllProviders] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const [currentSearchQuery, setCurrentSearchQuery] = useState('');

  // 🔥 Load providers from Firestore (for suggestions)
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const firestoreProviders = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // fallback to local if Firestore empty
      const combined =
        firestoreProviders.length > 0
          ? firestoreProviders
          : Object.values(usersData.users);

      setAllProviders(combined);
    });

    return () => unsubscribe();
  }, []);

  // Dynamic suggestions — normalizeServices guards against `services` being
  // undefined (new signups) or a plain string, which previously produced
  // garbage suggestions or crashed the flatMap.
  const suggestions = Array.from(
    new Set([
      ...servicesList,
      ...allProviders.flatMap((user) => normalizeServices(user?.services)),
    ])
  );

  // 🔎 Handle search results from SearchBar. The second argument is the
  // search term — it was previously ALWAYS '' because SearchBar called
  // `onSearch(results)` without it, so the header showed the wrong query.
  const handleSearchResults = useCallback((results, searchTerm = '') => {
    // Empty term = the user cleared the input -> back to the welcome state
    // instead of a permanent "No providers found for ''" screen
    if (!searchTerm) {
      setProviders([]);
      setHasSearched(false);
      setCurrentSearchQuery('');
      return;
    }

    setProviders(results || []);
    setHasSearched(true);
    setCurrentSearchQuery(searchTerm);

    setSearchHistory((prev) => {
      const normalized = searchTerm.toLowerCase().trim();
      if (!normalized || prev.includes(normalized)) return prev;
      return [normalized, ...prev.slice(0, 4)];
    });
  }, []);

  // Handle quick search from chips — flows into SearchBar via `searchQuery`
  // prop, which types the text into the input and runs the search.
  const handleQuickSearch = useCallback((service) => {
    setCurrentSearchQuery(service);
  }, []);

  // Stable callback so SearchBar's effect doesn't re-fire every render
  const handleSearchStateChange = useCallback((state) => {
    setCurrentSearchQuery((prev) => (state?.query !== undefined && state.query !== prev ? state.query : prev));
  }, []);

  const renderProvider = ({ item }) => (
    <ServiceCard
      provider={item}
      onPress={() => navigation.navigate('Profile', { provider: item })}
    />
  );

  const renderPopularServices = () => (
    <View style={styles.quickAccessContainer}>
      <Text style={styles.sectionTitle}>Popular Services</Text>
      <View style={styles.chipContainer}>
        {POPULAR_SERVICES.map((service) => (
          <Chip
            key={service}
            mode="outlined"
            onPress={() => handleQuickSearch(service)}
            style={styles.serviceChip}
            textStyle={styles.chipText}
          >
            {service.charAt(0).toUpperCase() + service.slice(1)}
          </Chip>
        ))}
      </View>
    </View>
  );

  const renderRecentSearches = () => {
    if (searchHistory.length === 0) return null;

    return (
      <View style={styles.quickAccessContainer}>
        <Text style={styles.sectionTitle}>Recent Searches</Text>
        <View style={styles.chipContainer}>
          {searchHistory.map((search, index) => (
            <Chip
              key={`${search}-${index}`}
              mode="flat"
              onPress={() => handleQuickSearch(search)}
              style={styles.recentChip}
              textStyle={styles.chipText}
              icon="history"
            >
              {search.charAt(0).toUpperCase() + search.slice(1)}
            </Chip>
          ))}
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      {renderRecentSearches()}
      {renderPopularServices()}

      <View style={styles.welcomeSection}>
        <MaterialCommunityIcons
          name="magnify"
          size={64}
          color="#E0E0E0"
          style={{ marginBottom: 16 }}
        />
        <Text style={styles.welcomeTitle}>Find Local Service Providers</Text>
        <Text style={styles.welcomeText}>
          Search for services you need and connect with qualified providers in
          your area.
        </Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Title style={styles.title}>Find Services</Title>
          <Text style={styles.subtitle}>
            {hasSearched && providers.length > 0
              ? `${providers.length} provider${
                  providers.length !== 1 ? 's' : ''
                } found`
              : 'Discover local service providers'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.profileButton}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Profile')}
        >
          <MaterialCommunityIcons
            name="account-circle"
            size={36}
            color="#2E7D32"
          />
        </TouchableOpacity>
      </View>

      <View style={styles.searchSection}>
        <SearchBar
          onSearch={handleSearchResults}
          initialValue={currentSearchQuery}
          suggestions={suggestions}
          usersData={usersData}
          searchQuery={currentSearchQuery}
          onSearchStateChange={handleSearchStateChange}
        />
      </View>

      <View style={styles.content}>
        {hasSearched && providers.length === 0 ? (
          <View style={styles.centered}>
            <MaterialCommunityIcons
              name="magnify-close"
              size={64}
              color="#E0E0E0"
              style={{ marginBottom: 16 }}
            />
            <Text style={styles.noResultsTitle}>No providers found</Text>
            <Text style={styles.noResultsText}>
              No providers found for "{currentSearchQuery}".
            </Text>
            {renderPopularServices()}
          </View>
        ) : !hasSearched ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={providers}
            renderItem={renderProvider}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              <Text style={styles.resultsHeader}>
                Found {providers.length} provider
                {providers.length !== 1 ? 's' : ''} for "{currentSearchQuery}"
              </Text>
            }
            ListFooterComponent={<View style={{ height: 32 }} />}
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    elevation: 4,
  },
  headerContent: { flex: 1 },
  title: { fontSize: 28, fontWeight: '700', color: '#2E7D32' },
  subtitle: { fontSize: 14, color: '#666' },
  profileButton: { padding: 8, marginTop: 4 },
  searchSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  content: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyStateContainer: { flex: 1, paddingHorizontal: 24, paddingTop: 24 },
  quickAccessContainer: { marginBottom: 32 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  serviceChip: { marginBottom: 8, backgroundColor: '#E8F5E8' },
  recentChip: { marginBottom: 8, backgroundColor: '#F3E5F5' },
  chipText: { fontSize: 12, fontWeight: '500' },
  welcomeSection: { alignItems: 'center', paddingVertical: 32 },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  noResultsTitle: { fontSize: 22, fontWeight: '700', color: '#333' },
  noResultsText: { fontSize: 16, color: '#666', textAlign: 'center' },
  listContainer: { paddingVertical: 16, paddingHorizontal: 24 },
  resultsHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
});
