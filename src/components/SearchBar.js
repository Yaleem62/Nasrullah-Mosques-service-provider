// src/components/SearchBar.js
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
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { debounce } from 'lodash';
import { runSearch } from '../utils/searchService';

const SEARCH_CONFIG = {
  DEBOUNCE_DELAY: 300,
  MAX_SUGGESTIONS: 8,
  ANIMATION_DURATION: 200,
  BLUR_DELAY: 150,
};

const COLORS = {
  PRIMARY: '#2E7D32',
  SECONDARY: '#E8F5E8',
  TEXT_PRIMARY: '#1A1A1A',
  TEXT_SECONDARY: '#666666',
  TEXT_TERTIARY: '#999999',
  BACKGROUND: '#F8F9FA',
  BACKGROUND_FOCUSED: '#FFFFFF',
  BORDER: '#E5E7EB',
  BORDER_FOCUSED: '#2E7D32',
  ERROR: '#DC2626',
  OVERLAY: 'rgba(0,0,0,0.02)',
  SHADOW: 'rgba(46, 125, 50, 0.08)',
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function SearchBar({
  onSearch,
  initialValue = '',
  suggestions = [],
  placeholder = 'Search for services (e.g., plumbing, tutoring...)',
  usersData = {},
  onSearchStateChange,
  maxSuggestions = SEARCH_CONFIG.MAX_SUGGESTIONS,
  searchQuery = '', // Accept external query
}) {
  const [searchState, setSearchState] = useState({
    query: initialValue,
    filteredSuggestions: [],
    showSuggestions: false,
    isFocused: false,
    isLoading: false,
    error: null,
  });

  const inputRef = useRef(null);
  const animationTimeoutRef = useRef(null);
  const currentSearchRef = useRef('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-15)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const inputScaleAnim = useRef(new Animated.Value(1)).current;

  // Update input when external searchQuery changes
  useEffect(() => {
    if (searchQuery && searchQuery !== searchState.query) {
      setSearchState(prev => ({ ...prev, query: searchQuery }));
      performSearch(searchQuery);
    }
  }, [searchQuery]);

  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
    };
  }, []);

  // Notify parent of state changes
  useEffect(() => {
    onSearchStateChange?.(searchState);
  }, [searchState, onSearchStateChange]);

  // Suggestion Filtering
  const filterSuggestions = useCallback(
    (query, suggestions) => {
      if (!query.trim()) return [];

      const searchTerm = query.toLowerCase().trim();
      const queryWords = searchTerm.split(' ').filter(w => w.length > 0);

      const scoredSuggestions = suggestions
        .map(service => {
          const serviceLower = service.toLowerCase();
          let score = 0;

          if (serviceLower === searchTerm) score += 100;
          else if (serviceLower.startsWith(searchTerm)) score += 80;
          else if (serviceLower.includes(searchTerm)) score += 60;
          else {
            const matchingWords = queryWords.filter(word => serviceLower.includes(word));
            score += (matchingWords.length / queryWords.length) * 40;
          }

          if (score > 0) score += Math.max(0, 20 - service.length);
          return { service, score };
        })
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, maxSuggestions)
        .map(({ service }) => service);

      return scoredSuggestions;
    },
    [maxSuggestions]
  );

  // Debounced Search
  const performSearch = useMemo(
    () =>
      debounce(async (queryText) => {
        currentSearchRef.current = queryText;
        
        if (!queryText.trim()) {
          setSearchState(prev => ({ ...prev, isLoading: false, error: null }));
          onSearch?.([]);
          return;
        }

        setSearchState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
          console.log('🔍 About to search for:', queryText);
          const results = await runSearch(queryText, usersData);
          
          if (currentSearchRef.current === queryText) {
            setSearchState(prev => ({ ...prev, isLoading: false }));

            if (results.length === 0) {
              setSearchState(prev => ({ ...prev, error: 'No matching services found' }));
            } else {
              setSearchState(prev => ({ ...prev, error: null }));
            }

            onSearch?.(results);
          }
        } catch (error) {
          console.error('Search error:', error);
          if (currentSearchRef.current === queryText) {
            setSearchState(prev => ({
              ...prev,
              isLoading: false,
              error: 'Search failed, please try again.',
            }));
            onSearch?.([]);
          }
        }
      }, SEARCH_CONFIG.DEBOUNCE_DELAY),
    [usersData, onSearch]
  );

  // Animations
  const animateIn = useCallback(() => {
    Animated.parallel([
      Animated.spring(fadeAnim, { toValue: 1, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim, scaleAnim]);

  const animateOut = useCallback((callback) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: SEARCH_CONFIG.ANIMATION_DURATION, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -15, duration: SEARCH_CONFIG.ANIMATION_DURATION, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 0.95, duration: SEARCH_CONFIG.ANIMATION_DURATION, useNativeDriver: true }),
    ]).start(callback);
  }, [fadeAnim, slideAnim, scaleAnim]);

  const animateInputFocus = useCallback((focused) => {
    Animated.spring(inputScaleAnim, { toValue: focused ? 1.02 : 1, useNativeDriver: true }).start();
  }, [inputScaleAnim]);

  // Handle query changes
  const handleQueryChange = useCallback(
    (text) => {
      console.log('📝 Query changed to:', text);
      
      setSearchState(prev => ({ ...prev, query: text }));
      performSearch(text);

      const filtered = filterSuggestions(text, suggestions);
      
      setSearchState(prev => ({
        ...prev,
        query: text,
        filteredSuggestions: filtered,
        showSuggestions: filtered.length > 0 && text.trim().length > 0,
      }));

      if (filtered.length > 0 && text.trim()) {
        animateIn();
      } else {
        animateOut(() => {
          setSearchState(prev => ({ ...prev, showSuggestions: false }));
        });
      }
    },
    [filterSuggestions, suggestions, animateIn, animateOut, performSearch]
  );

  const handleSuggestionPress = useCallback(
    (suggestion) => {
      console.log('🔍 Suggestion pressed:', suggestion);
      
      setSearchState(prev => ({ 
        ...prev, 
        query: suggestion, 
        showSuggestions: false 
      }));

      animationTimeoutRef.current = setTimeout(() => {
        performSearch(suggestion);
        Keyboard.dismiss();
        inputRef.current?.blur();
      }, 100);
    },
    [performSearch]
  );

  const handleClear = useCallback(() => {
    console.log('🗑️ Clearing search');
    currentSearchRef.current = '';
    setSearchState(prev => ({ 
      ...prev, 
      query: '', 
      showSuggestions: false, 
      error: null 
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

    animationTimeoutRef.current = setTimeout(() => {
      animateOut(() => setSearchState(prev => ({ ...prev, showSuggestions: false })));
    }, SEARCH_CONFIG.BLUR_DELAY);
  }, [animateInputFocus, animateOut]);

  const handleSubmit = useCallback(() => {
    console.log('⏎ Submit pressed for:', searchState.query);
    performSearch(searchState.query);
    Keyboard.dismiss();
    inputRef.current?.blur();
  }, [performSearch, searchState.query]);

  // Highlighting
  const HighlightedText = useCallback(({ text, query }) => {
    if (!query.trim()) return <Text style={styles.suggestionText}>{text}</Text>;

    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return (
      <Text style={styles.suggestionText}>
        {parts.map((part, index) => (
          <Text
            key={index}
            style={[styles.suggestionText, part.toLowerCase() === query.toLowerCase() && styles.highlightedText]}
          >
            {part}
          </Text>
        ))}
      </Text>
    );
  }, []);

  const renderSuggestion = useCallback(
    ({ item, index }) => (
      <TouchableOpacity
        style={[
          styles.suggestionItem,
          index === searchState.filteredSuggestions.length - 1 && styles.lastSuggestionItem,
        ]}
        onPress={() => handleSuggestionPress(item)}
        activeOpacity={0.6}
      >
        <MaterialIcons name="work-outline" size={18} color={COLORS.TEXT_SECONDARY} style={styles.suggestionIcon} />
        <HighlightedText text={item} query={searchState.query} />
        <MaterialCommunityIcons name="arrow-top-left" size={14} color={COLORS.TEXT_TERTIARY} style={styles.suggestionArrow} />
      </TouchableOpacity>
    ),
    [searchState.filteredSuggestions.length, searchState.query, handleSuggestionPress, HighlightedText]
  );

  return (
    <View style={styles.container}>
      <Animated.View
        style={[styles.searchInputContainer, searchState.isFocused && styles.searchInputContainerFocused, { transform: [{ scale: inputScaleAnim }] }]}
      >
        <MaterialIcons name="search" size={22} color={searchState.isFocused ? COLORS.PRIMARY : COLORS.TEXT_TERTIARY} style={styles.searchIcon} />
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
          autoCorrect={false}
          autoCapitalize="none"
        />

        {searchState.isLoading && <ActivityIndicator size="small" color={COLORS.PRIMARY} style={styles.loadingIcon} />}

        {searchState.query.length > 0 && !searchState.isLoading && (
          <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
            <MaterialCommunityIcons name="close" size={20} color={COLORS.TEXT_TERTIARY} />
          </TouchableOpacity>
        )}
      </Animated.View>

      {searchState.error && (
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="information-outline" size={16} color={COLORS.ERROR} />
          <Text style={styles.errorText}>{searchState.error}</Text>
        </View>
      )}

      {searchState.showSuggestions && searchState.filteredSuggestions.length > 0 && (
        <Animated.View style={[styles.suggestionsContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }]}>
          <Card style={styles.suggestionsCard}>
            <FlatList
              data={searchState.filteredSuggestions}
              renderItem={renderSuggestion}
              keyExtractor={(item, index) => `suggestion-${item}-${index}`}
              keyboardShouldPersistTaps="always"
            />
          </Card>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'relative', zIndex: 1000 },
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
      ios: { shadowColor: COLORS.SHADOW, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  searchInputContainerFocused: {
    borderColor: COLORS.BORDER_FOCUSED,
    backgroundColor: COLORS.BACKGROUND_FOCUSED,
    ...Platform.select({
      ios: { shadowColor: COLORS.PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  searchIcon: { marginRight: 14 },
  searchInput: { flex: 1, fontSize: 16, color: COLORS.TEXT_PRIMARY, paddingVertical: 0 },
  clearButton: { padding: 6, marginLeft: 10, borderRadius: 12, backgroundColor: COLORS.OVERLAY },
  loadingIcon: { marginLeft: 10 },
  errorContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingHorizontal: 18 },
  errorText: { color: COLORS.ERROR, fontSize: 13, marginLeft: 6 },
  suggestionsContainer: { position: 'absolute', top: 58, left: 0, right: 0, zIndex: 1000, maxWidth: SCREEN_WIDTH - 32 },
  suggestionsCard: { backgroundColor: COLORS.BACKGROUND_FOCUSED, borderRadius: 16, overflow: 'hidden' },
  suggestionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 18, borderBottomWidth: 0.5, borderBottomColor: COLORS.BORDER, backgroundColor: COLORS.BACKGROUND_FOCUSED },
  lastSuggestionItem: { borderBottomWidth: 0 },
  suggestionIcon: { marginRight: 14 },
  suggestionText: { flex: 1, fontSize: 15, color: COLORS.TEXT_PRIMARY },
  suggestionArrow: { marginLeft: 10, opacity: 0.6 },
  highlightedText: { fontWeight: '600', color: COLORS.PRIMARY, backgroundColor: COLORS.SECONDARY, paddingHorizontal: 2, borderRadius: 4 },
});