import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Title, Text, ActivityIndicator, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons'; // Changed to MaterialCommunityIcons
import ServiceCard from '../components/ServiceCard';
import SearchBar from '../components/SearchBar';
import { servicesList } from '../utils/serviceList';

// JSON data for local search fallback
const usersData = {
  "users": {
    "user1": {
      "id": "user1", // Added id
      "name": "Ahmed Hassan",
      "phone": "+1234567890",
      "email": "1234567890@mosque.app",
      "services": ["plumbing", "electrical", "generator repair"],
      "profileViews": 15,
      "contactsReceived": 8,
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-20T14:30:00Z"
    },
    "user2": {
      "id": "user2", // Added id
      "name": "Fatima Al-Zahra",
      "phone": "+1234567891",
      "email": "1234567891@mosque.app",
      "services": ["tutoring", "translation", "arabic tutoring"],
      "profileViews": 22,
      "contactsReceived": 12,
      "createdAt": "2024-01-10T09:15:00Z",
      "updatedAt": "2024-01-22T16:45:00Z"
    },
    "user3": {
      "id": "user3", // Added id
      "name": "Omar Abdullah",
      "phone": "+1234567892",
      "email": "1234567892@mosque.app",
      "services": ["catering", "event setup", "cooking"],
      "profileViews": 31,
      "contactsReceived": 18,
      "createdAt": "2024-01-08T11:20:00Z",
      "updatedAt": "2024-01-21T13:10:00Z"
    }
  }
};

// Popular services for quick access
const POPULAR_SERVICES = [
  'plumbing', 'cleaning', 'tutoring', 'electrician', 'gardening', 
  'handyman', 'beauty', 'fitness', 'catering', 'photography'
];

export default function DashboardScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [providers, setProviders] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);

  // Dynamically generate suggestions from JSON and servicesList
  const suggestions = Array.from(
    new Set([
      ...servicesList,
      ...Object.values(usersData.users).flatMap(user => user.services)
    ])
  );

  const handleSearch = (results) => {
    setProviders(results);
    setHasSearched(true);
    if (searchQuery.trim() && !searchHistory.includes(searchQuery.toLowerCase().trim())) {
      setSearchHistory(prev => [searchQuery.toLowerCase().trim(), ...prev.slice(0, 4)]);
    }
  };

  const handleQuickSearch = (service) => {
    setSearchQuery(service);
  };

  const renderProvider = ({ item }) => (
    <ServiceCard
      provider={item}
      onPress={() => navigation.navigate('Profile', { provider: item })} // Changed to pass full provider
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
        <MaterialCommunityIcons // Changed to MaterialCommunityIcons
          name="magnify" // Changed to magnify
          size={64}
          color="#E0E0E0"
          style={{ marginBottom: 16 }}
        />
        <Text style={styles.welcomeTitle}>Find Local Service Providers</Text>
        <Text style={styles.welcomeText}>
          Search for services you need and connect with qualified providers in your area.
        </Text>
        
        <View style={styles.featureList}>
          <View style={styles.featureItem}>
            <MaterialCommunityIcons name="account-check" size={20} color="#4CAF50" /> {/* Changed to account-check */}
            <Text style={styles.featureText}>Verified Providers</Text>
          </View>
          <View style={styles.featureItem}>
            <MaterialCommunityIcons name="star" size={20} color="#FF9800" /> {/* Changed to star */}
            <Text style={styles.featureText}>Rated & Reviewed</Text>
          </View>
          <View style={styles.featureItem}>
            <MaterialCommunityIcons name="map-marker" size={20} color="#2196F3" /> {/* Changed to map-marker */}
            <Text style={styles.featureText}>Local Services</Text>
          </View>
        </View>
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
            {providers.length > 0 
              ? `${providers.length} provider${providers.length !== 1 ? 's' : ''} found`
              : 'Discover local service providers'
            }
          </Text>
        </View>
        <TouchableOpacity
          style={styles.profileButton}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Profile')} // Kept as Profile
          accessibilityLabel="Go to your profile"
        >
          <MaterialCommunityIcons name="account-circle" size={36} color="#2E7D32" /> {/* Changed to MaterialCommunityIcons */}
        </TouchableOpacity>
      </View>

      <View style={styles.searchSection}>
        <SearchBar
          onSearch={handleSearch}
          initialValue={searchQuery}
          suggestions={suggestions}
          usersData={usersData}
        />
      </View>

      <View style={styles.content}>
        {providers.length === 0 && hasSearched ? (
          <View style={styles.centered}>
            <MaterialCommunityIcons // Changed to MaterialCommunityIcons
              name="magnify-close" // Changed to magnify-close
              size={64}
              color="#E0E0E0"
              style={{ marginBottom: 16 }}
            />
            <Text style={styles.noResultsTitle}>
              No providers found
            </Text>
            <Text style={styles.noResultsText}>
              No providers found for "{searchQuery}".
            </Text>
            <Text style={styles.noResultsHint}>
              Try a different search term or browse popular services below.
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
                Found {providers.length} provider{providers.length !== 1 ? 's' : ''} for "{searchQuery}"
              </Text>
            }
            ListFooterComponent={<View style={{ height: 32 }} />}
            initialNumToRender={10}
            maxToRenderPerBatch={5}
            updateCellsBatchingPeriod={100}
            removeClippedSubviews={true}
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    zIndex: 10,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2E7D32',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    fontWeight: '400',
  },
  profileButton: {
    padding: 8,
    marginTop: 4,
  },
  searchSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  content: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyStateContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  quickAccessContainer: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  serviceChip: {
    marginBottom: 8,
    backgroundColor: '#E8F5E8',
    borderColor: '#4CAF50',
  },
  recentChip: {
    marginBottom: 8,
    backgroundColor: '#F3E5F5',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  welcomeSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  featureList: {
    alignItems: 'flex-start',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    marginLeft: 8,
  },
  noResultsTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  noResultsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  noResultsHint: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 24,
  },
  listContainer: {
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  resultsHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
});