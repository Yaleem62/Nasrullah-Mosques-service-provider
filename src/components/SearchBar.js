import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Keyboard,
  Animated,
  ActivityIndicator,
  Text,
  Platform,
  Dimensions,
} from 'react-native';
import { Card } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { debounce } from 'lodash';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';

// Advanced Configuration & Constants
const SEARCH_CONFIG = {
  DEBOUNCE_DELAY: 300,
  SEARCH_TIMEOUT: 10000,
  MAX_SUGGESTIONS: 8,
  ANIMATION_DURATION: {
    FAST: 150,
    NORMAL: 200,
    SLOW: 300,
  },
  BLUR_DELAY: 150,
  SUGGESTION_DELAY: 100,
};

const COLORS = {
  PRIMARY: '#2E7D32',
  PRIMARY_LIGHT: '#4CAF50',
  PRIMARY_DARK: '#1B5E20',
  SECONDARY: '#E8F5E8',
  TEXT_PRIMARY: '#1A1A1A',
  TEXT_SECONDARY: '#666666',
  TEXT_TERTIARY: '#999999',
  BACKGROUND: '#F8F9FA',
  BACKGROUND_FOCUSED: '#FFFFFF',
  BORDER: '#E5E7EB',
  BORDER_FOCUSED: '#2E7D32',
  ERROR: '#DC2626',
  SUCCESS: '#059669',
  SHADOW: 'rgba(46, 125, 50, 0.08)',
  OVERLAY: 'rgba(0, 0, 0, 0.02)',
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Firestore Connectivity Test with Advanced Error Handling
const testFirestoreConnectivity = async () => {
  try {
    const startTime = Date.now();
    const snapshot = await getDocs(collection(db, 'users'));
    const endTime = Date.now();
    
    console.log('🔥 Firestore Health Check:', {
      status: 'CONNECTED',
      latency: `${endTime - startTime}ms`,
      collectionExists: !snapshot.empty,
      documentCount: snapshot.size,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Firestore Connection Failed:', {
      error: error.message,
      code: error.code,
      timestamp: new Date().toISOString(),
      suggestions: [
        'Check internet connection',
        'Verify Firebase configuration',
        'Check Firestore security rules'
      ]
    });
  }
};

// Initialize connectivity test
testFirestoreConnectivity();

/**
 * Advanced SearchBar Component with Enhanced UX and Performance
 * 
 * Features:
 * - Intelligent suggestion filtering with fuzzy matching
 * - Advanced animations with spring physics
 * - Robust error handling and fallback mechanisms
 * - Optimized rendering with memoization
 * - Accessibility support
 * - Advanced search analytics
 */
export default function SearchBar({ 
  onSearch, 
  initialValue = '', 
  suggestions = [],
  placeholder = "Search for services (e.g., plumbing, tutoring, cleaning...)",
  usersData = {},
  onSearchStateChange,
  enableAnalytics = true,
  maxSuggestions = SEARCH_CONFIG.MAX_SUGGESTIONS,
}) {
  // State Management with Advanced State Structure
  const [searchState, setSearchState] = useState({
    query: initialValue,
    filteredSuggestions: [],
    showSuggestions: false,
    isFocused: false,
    isLoading: false,
    error: null,
    lastSearchTime: null,
    searchCount: 0,
  });

  // Refs for Performance & Animation
  const inputRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const animationTimeoutRef = useRef(null);
  
  // Advanced Animation Values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-15)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const inputScaleAnim = useRef(new Animated.Value(1)).current;

  // Cleanup function for timeouts
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
    };
  }, []);

  // Advanced Suggestion Filtering with Fuzzy Matching
  const filterSuggestions = useCallback((query, suggestions) => {
    if (!query.trim()) return [];

    const searchTerm = query.toLowerCase().trim();
    const queryWords = searchTerm.split(' ').filter(word => word.length > 0);

    const scoredSuggestions = suggestions
      .map(service => {
        const serviceLower = service.toLowerCase();
        let score = 0;

        // Exact match - highest score
        if (serviceLower === searchTerm) score += 100;
        
        // Starts with query - high score
        else if (serviceLower.startsWith(searchTerm)) score += 80;
        
        // Contains query - medium score
        else if (serviceLower.includes(searchTerm)) score += 60;
        
        // Word-based matching - variable score
        else {
          const matchingWords = queryWords.filter(word => serviceLower.includes(word));
          score += (matchingWords.length / queryWords.length) * 40;
        }

        // Bonus for shorter strings (more specific)
        if (score > 0) {
          score += Math.max(0, 20 - service.length);
        }

        return { service, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxSuggestions)
      .map(({ service }) => service);

    return scoredSuggestions;
  }, [maxSuggestions]);

  // Advanced Local Search with Performance Optimization
  const performLocalSearch = useCallback((searchQuery) => {
    const searchTerm = searchQuery.toLowerCase().trim();
    const users = Object.values(usersData.users || {});
    
    const results = users
      .filter(user => {
        if (!user.services || !Array.isArray(user.services)) return false;
        return user.services.some(service => 
          service.toLowerCase().includes(searchTerm)
        );
      })
      .map(user => {
        const matchingServices = user.services.filter(service => 
          service.toLowerCase().includes(searchTerm)
        );
        
        // Calculate relevance score
        const exactMatches = matchingServices.filter(service => 
          service.toLowerCase() === searchTerm
        ).length;
        
        return {
          id: Object.keys(usersData.users || {}).find(key => usersData.users[key] === user) || user.id,
          ...user,
          name: user.name || user.id || 'Unknown User',
          matchingServices,
          relevanceScore: exactMatches * 10 + matchingServices.length,
        };
      })
      .sort((a, b) => b.relevanceScore - a.relevanceScore);

    if (enableAnalytics) {
      console.log('📊 Local Search Analytics:', {
        query: searchTerm,
        totalUsers: users.length,
        resultsCount: results.length,
        timestamp: new Date().toISOString(),
      });
    }

    return results;
  }, [usersData, enableAnalytics]);

  // Enhanced Firestore Search with Advanced Error Handling
  const performFirestoreSearch = useCallback(async (searchQuery) => {
    const searchTerm = searchQuery.toLowerCase().trim();
    
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Search request timed out')), SEARCH_CONFIG.SEARCH_TIMEOUT)
    );

    const searchPromise = getDocs(collection(db, 'users')).then(querySnapshot => {
      if (querySnapshot.empty) {
        throw new Error('No service providers found in database');
      }

      const results = querySnapshot.docs
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            name: data.name || doc.id,
            services: Array.isArray(data.services) ? data.services : [],
          };
        })
        .filter(user => {
          if (!user.services.length) return false;
          return user.services.some(service => 
            service.toLowerCase().includes(searchTerm)
          );
        })
        .map(user => ({
          ...user,
          matchingServices: user.services.filter(service => 
            service.toLowerCase().includes(searchTerm)
          ),
        }))
        .sort((a, b) => {
          // Prioritize exact matches
          const aExact = a.services.some(s => s.toLowerCase() === searchTerm);
          const bExact = b.services.some(s => s.toLowerCase() === searchTerm);
          
          if (aExact && !bExact) return -1;
          if (!aExact && bExact) return 1;
          
          // Then by number of matching services
          return b.matchingServices.length - a.matchingServices.length;
        });

      if (enableAnalytics) {
        console.log('🔥 Firestore Search Analytics:', {
          query: searchTerm,
          totalDocs: querySnapshot.size,
          resultsCount: results.length,
          timestamp: new Date().toISOString(),
        });
      }

      return results;
    });

    return Promise.race([searchPromise, timeoutPromise]);
  }, [enableAnalytics]);

  // Optimized Search Function with Analytics
  const performSearch = useMemo(
    () => debounce(async (searchQuery) => {
      if (!searchQuery.trim()) {
        setSearchState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: null 
        }));
        onSearch?.([]);
        return;
      }

      const searchStartTime = Date.now();

      setSearchState(prev => ({ 
        ...prev, 
        isLoading: true, 
        error: null,
        searchCount: prev.searchCount + 1,
        lastSearchTime: Date.now(),
      }));

      try {
        const results = await performFirestoreSearch(searchQuery);
        
        const searchDuration = Date.now() - searchStartTime;
        
        setSearchState(prev => ({ ...prev, isLoading: false }));
        
        if (results.length === 0) {
          const localResults = performLocalSearch(searchQuery);
          setSearchState(prev => ({ 
            ...prev, 
            error: localResults.length === 0 ? 'No matching services found' : null 
          }));
          onSearch?.(localResults);
        } else {
          onSearch?.(results);
        }

        // Analytics callback
        onSearchStateChange?.({
          query: searchQuery,
          resultsCount: results.length,
          searchDuration,
          source: results.length > 0 ? 'firestore' : 'local',
        });

      } catch (error) {
        const searchDuration = Date.now() - searchStartTime;
        const localResults = performLocalSearch(searchQuery);
        
        setSearchState(prev => ({
          ...prev,
          isLoading: false,
          error: `Search temporarily unavailable. Showing ${localResults.length} local results.`,
        }));

        onSearch?.(localResults);

        if (enableAnalytics) {
          console.error('🔥 Search Error Analytics:', {
            error: error.message,
            query: searchQuery,
            duration: searchDuration,
            fallbackResults: localResults.length,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }, SEARCH_CONFIG.DEBOUNCE_DELAY),
    [performFirestoreSearch, performLocalSearch, onSearch, onSearchStateChange, enableAnalytics]
  );

  // Advanced Animation System
  const animateIn = useCallback(() => {
    Animated.parallel([
      Animated.spring(fadeAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, scaleAnim]);

  const animateOut = useCallback((callback) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: SEARCH_CONFIG.ANIMATION_DURATION.FAST,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -15,
        duration: SEARCH_CONFIG.ANIMATION_DURATION.FAST,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: SEARCH_CONFIG.ANIMATION_DURATION.FAST,
        useNativeDriver: true,
      }),
    ]).start(callback);
  }, [fadeAnim, slideAnim, scaleAnim]);

  const animateInputFocus = useCallback((focused) => {
    Animated.spring(inputScaleAnim, {
      toValue: focused ? 1.02 : 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  }, [inputScaleAnim]);

  // Effect for handling suggestion visibility
  useEffect(() => {
    if (searchState.query.trim().length > 0) {
      const filtered = filterSuggestions(searchState.query, suggestions);
      
      setSearchState(prev => ({ ...prev, filteredSuggestions: filtered }));
      
      if (filtered.length > 0 && searchState.isFocused && searchState.query.trim()) {
        setSearchState(prev => ({ ...prev, showSuggestions: true }));
        animateIn();
      } else {
        animateOut(() => {
          setSearchState(prev => ({ ...prev, showSuggestions: false }));
        });
      }
    } else {
      setSearchState(prev => ({ ...prev, filteredSuggestions: [] }));
      animateOut(() => {
        setSearchState(prev => ({ ...prev, showSuggestions: false }));
      });
    }
  }, [searchState.query, suggestions, searchState.isFocused, filterSuggestions, animateIn, animateOut]);

  // Enhanced Event Handlers
  const handleQueryChange = useCallback((text) => {
    setSearchState(prev => ({ ...prev, query: text }));
    performSearch(text);
  }, [performSearch]);

  const handleSuggestionPress = useCallback((suggestion) => {
    setSearchState(prev => ({ ...prev, query: suggestion, showSuggestions: false }));
    
    animationTimeoutRef.current = setTimeout(() => {
      performSearch(suggestion);
      Keyboard.dismiss();
      inputRef.current?.blur();
    }, SEARCH_CONFIG.SUGGESTION_DELAY);
  }, [performSearch]);

  const handleClear = useCallback(() => {
    setSearchState(prev => ({
      ...prev,
      query: '',
      showSuggestions: false,
      error: null,
    }));
    onSearch?.([]);
    inputRef.current?.focus();
  }, [onSearch]);

  const handleFocus = useCallback(() => {
    setSearchState(prev => ({ ...prev, isFocused: true }));
    animateInputFocus(true);
    
    if (searchState.filteredSuggestions.length > 0 && searchState.query.trim()) {
      setSearchState(prev => ({ ...prev, showSuggestions: true }));
      animateIn();
    }
  }, [searchState.filteredSuggestions.length, searchState.query, animateInputFocus, animateIn]);

  const handleBlur = useCallback(() => {
    setSearchState(prev => ({ ...prev, isFocused: false }));
    animateInputFocus(false);
    
    searchTimeoutRef.current = setTimeout(() => {
      animateOut(() => {
        setSearchState(prev => ({ ...prev, showSuggestions: false }));
      });
    }, SEARCH_CONFIG.BLUR_DELAY);
  }, [animateInputFocus, animateOut]);

  const handleSubmit = useCallback(() => {
    performSearch(searchState.query);
    Keyboard.dismiss();
    inputRef.current?.blur();
  }, [performSearch, searchState.query]);

  // Advanced Text Highlighting Component
  const HighlightedText = useCallback(({ text, query }) => {
    if (!query.trim()) return <Text style={styles.suggestionText}>{text}</Text>;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return (
      <Text style={styles.suggestionText}>
        {parts.map((part, index) => (
          <Text
            key={index}
            style={[
              styles.suggestionText,
              part.toLowerCase() === query.toLowerCase() && styles.highlightedText
            ]}
          >
            {part}
          </Text>
        ))}
      </Text>
    );
  }, []);

  // Enhanced Suggestion Item Renderer
  const renderSuggestion = useCallback(({ item, index }) => (
    <TouchableOpacity
      style={[
        styles.suggestionItem,
        index === searchState.filteredSuggestions.length - 1 && styles.lastSuggestionItem
      ]}
      onPress={() => handleSuggestionPress(item)}
      activeOpacity={0.6}
      accessibilityRole="button"
      accessibilityLabel={`Search for ${item}`}
    >
      <MaterialIcons 
        name="work_outline" 
        size={18} 
        color={COLORS.TEXT_SECONDARY} 
        style={styles.suggestionIcon}
      />
      <HighlightedText text={item} query={searchState.query} />
      <MaterialIcons 
        name="north_west" 
        size={14} 
        color={COLORS.TEXT_TERTIARY} 
        style={styles.suggestionArrow}
      />
    </TouchableOpacity>
  ), [searchState.filteredSuggestions.length, searchState.query, handleSuggestionPress, HighlightedText]);

  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.searchInputContainer,
          searchState.isFocused && styles.searchInputContainerFocused,
          { transform: [{ scale: inputScaleAnim }] }
        ]}
      >
        <MaterialIcons
          name="search"
          size={22}
          color={searchState.isFocused ? COLORS.PRIMARY : COLORS.TEXT_TERTIARY}
          style={styles.searchIcon}
        />
        <TextInput
          ref={inputRef}
          style={styles.searchInput}
          placeholder={placeholder}
          placeholderTextColor={COLORS.TEXT_TERTIARY}
          value={searchState.query}
          onChangeText={handleQueryChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          returnKeyType="search"
          onSubmitEditing={handleSubmit}
          clearButtonMode="never"
          autoCorrect={false}
          autoCapitalize="none"
          accessibilityLabel="Search for services"
          accessibilityHint="Type to search for service providers"
        />
        
        {searchState.isLoading && (
          <ActivityIndicator 
            size="small" 
            color={COLORS.PRIMARY} 
            style={styles.loadingIcon} 
          />
        )}
        
        {searchState.query.length > 0 && !searchState.isLoading && (
          <TouchableOpacity
            onPress={handleClear}
            style={styles.clearButton}
            activeOpacity={0.6}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
          >
            <MaterialIcons name="close" size={20} color={COLORS.TEXT_TERTIARY} />
          </TouchableOpacity>
        )}
      </Animated.View>

      {searchState.error && (
        <View style={styles.errorContainer}>
          <MaterialIcons name="info_outline" size={16} color={COLORS.ERROR} />
          <Text style={styles.errorText}>{searchState.error}</Text>
        </View>
      )}

      {searchState.showSuggestions && searchState.filteredSuggestions.length > 0 && (
        <Animated.View
          style={[
            styles.suggestionsContainer,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim }
              ],
            },
          ]}
        >
          <Card style={styles.suggestionsCard} elevation={Platform.OS === 'ios' ? 0 : 8}>
            <FlatList
              data={searchState.filteredSuggestions}
              renderItem={renderSuggestion}
              keyExtractor={(item, index) => `suggestion-${item}-${index}`}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="always"
              style={styles.suggestionsList}
              removeClippedSubviews={true}
              maxToRenderPerBatch={6}
              windowSize={10}
            />
          </Card>
        </Animated.View>
      )}
    </View>
  );
}

// Enhanced StyleSheet with Advanced Design System
const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 16,
    paddingHorizontal: 18,
    height: 52,
    borderWidth: 1.5,
    borderColor: COLORS.BORDER,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.SHADOW,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  searchInputContainerFocused: {
    borderColor: COLORS.BORDER_FOCUSED,
    backgroundColor: COLORS.BACKGROUND_FOCUSED,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.PRIMARY,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  searchIcon: {
    marginRight: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.TEXT_PRIMARY,
    paddingVertical: 0,
    letterSpacing: 0.2,
  },
  clearButton: {
    padding: 6,
    marginLeft: 10,
    borderRadius: 12,
    backgroundColor: COLORS.OVERLAY,
  },
  loadingIcon: {
    marginLeft: 10,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 18,
  },
  errorText: {
    color: COLORS.ERROR,
    fontSize: 13,
    marginLeft: 6,
    fontWeight: '500',
    flex: 1,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 58,
    left: 0,
    right: 0,
    zIndex: 1000,
    maxWidth: SCREEN_WIDTH - 32,
  },
  suggestionsCard: {
    backgroundColor: COLORS.BACKGROUND_FOCUSED,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: Platform.OS === 'ios' ? 1 : 0,
    borderColor: COLORS.BORDER,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.TEXT_PRIMARY,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 24,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  suggestionsList: {
    maxHeight: 280,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.BORDER,
    backgroundColor: COLORS.BACKGROUND_FOCUSED,
  },
  lastSuggestionItem: {
    borderBottomWidth: 0,
  },
  suggestionIcon: {
    marginRight: 14,
  },
  suggestionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '400',
    color: COLORS.TEXT_PRIMARY,
    letterSpacing: 0.1,
  },
  suggestionArrow: {
    marginLeft: 10,
    opacity: 0.6,
  },
  highlightedText: {
    fontWeight: '600',
    color: COLORS.PRIMARY,
    backgroundColor: COLORS.SECONDARY,
    borderRadius: 4,
    paddingHorizontal: 2,
  },
});
