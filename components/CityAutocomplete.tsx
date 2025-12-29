import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';

interface CitySuggestion {
  display_name: string;
  name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    country?: string;
  };
}

interface CityAutocompleteProps {
  value: string;
  onChange: (city: string) => void;
  onCoordinatesChange: (coords: { latitude: number; longitude: number }) => void;
  onTimezoneChange?: (timezone: string) => void;
  placeholder?: string;
}

// Debounce hook
function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Simple timezone estimation from coordinates
function estimateTimezoneFromCoordinates(lat: number, lon: number): string {
  const offset = Math.round(lon / 15);
  
  const timezoneMap: Record<string, string> = {
    '-12': 'Pacific/Midway',
    '-11': 'Pacific/Honolulu',
    '-10': 'Pacific/Honolulu',
    '-9': 'America/Anchorage',
    '-8': 'America/Los_Angeles',
    '-7': 'America/Denver',
    '-6': 'America/Chicago',
    '-5': 'America/New_York',
    '-4': 'America/Caracas',
    '-3': 'America/Sao_Paulo',
    '-2': 'Atlantic/South_Georgia',
    '-1': 'Atlantic/Azores',
    '0': 'Europe/London',
    '1': 'Europe/Paris',
    '2': 'Europe/Berlin',
    '3': 'Europe/Moscow',
    '4': 'Asia/Dubai',
    '5': 'Asia/Karachi',
    '6': 'Asia/Dhaka',
    '7': 'Asia/Bangkok',
    '8': 'Asia/Shanghai',
    '9': 'Asia/Tokyo',
    '10': 'Australia/Sydney',
    '11': 'Pacific/Auckland',
    '12': 'Pacific/Auckland',
  };
  
  // Special cases for common cities
  if (lat >= 4 && lat <= 5 && lon >= -75 && lon <= -74) return 'America/Bogota';
  if (lat >= 48 && lat <= 49 && lon >= 2 && lon <= 3) return 'Europe/Paris';
  if (lat >= 40 && lat <= 41 && lon >= -74 && lon <= -73) return 'America/New_York';
  if (lat >= 51 && lat <= 52 && lon >= -1 && lon <= 0) return 'Europe/London';
  
  return timezoneMap[offset.toString()] || 'UTC';
}

export default function CityAutocomplete({
  value,
  onChange,
  onCoordinatesChange,
  onTimezoneChange,
  placeholder = 'Ex: Paris, France',
}: CityAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debouncedValue = useDebounce(value, 500);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&accept-language=fr`,
        {
          headers: {
            'User-Agent': 'SpotBulle-Mobile/1.0',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Erreur lors de la recherche');
      }

      const data = await response.json();
      setSuggestions(data);
    } catch (err) {
      console.error('Erreur geocoding:', err);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTimezone = useCallback(async (lat: number, lon: number) => {
    if (!onTimezoneChange) return;

    try {
      // Try BigDataCloud API first
      const geoResponse = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
      );

      if (geoResponse.ok) {
        const data = await geoResponse.json();
        const timezone =
          data.timezone?.name ||
          data.timezone ||
          data.timeZone?.name ||
          data.timeZone ||
          data.timezoneId ||
          null;

        if (timezone) {
          onTimezoneChange(timezone);
          return;
        }
      }
    } catch (err) {
      console.error('Error detecting timezone:', err);
    }

    // Fallback to estimation
    const estimatedTimezone = estimateTimezoneFromCoordinates(lat, lon);
    if (estimatedTimezone) {
      onTimezoneChange(estimatedTimezone);
    }
  }, [onTimezoneChange]);

  useEffect(() => {
    if (debouncedValue && debouncedValue.length >= 3) {
      fetchSuggestions(debouncedValue);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [debouncedValue, fetchSuggestions]);

  const handleSelectCity = async (suggestion: CitySuggestion) => {
    const displayName = suggestion.display_name || suggestion.name || '';
    
    // First update coordinates and timezone, then update city name
    if (suggestion.lat && suggestion.lon) {
      const lat = parseFloat(suggestion.lat);
      const lon = parseFloat(suggestion.lon);
      
      // Update coordinates first
      onCoordinatesChange({ latitude: lat, longitude: lon });
      
      // Then update timezone
      await fetchTimezone(lat, lon);
    }
    
    // Finally update city name (this might trigger a re-render, so do it last)
    onChange(displayName);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const formatCityName = (suggestion: CitySuggestion): string => {
    const parts: string[] = [];
    if (suggestion.name) parts.push(suggestion.name);
    if (suggestion.address) {
      if (suggestion.address.city) parts.push(suggestion.address.city);
      else if (suggestion.address.town) parts.push(suggestion.address.town);
      else if (suggestion.address.village) parts.push(suggestion.address.village);
      
      if (suggestion.address.country) parts.push(suggestion.address.country);
    }
    return parts.length > 0 ? parts.join(', ') : suggestion.display_name || '';
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={(text) => {
            onChange(text);
            if (text.length >= 3) {
              setShowSuggestions(true);
            } else {
              setShowSuggestions(false);
            }
          }}
          placeholder={placeholder}
          placeholderTextColor="#6b7280"
          selectionColor="#22c55e"
        />
        {loading && (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="small" color="#22c55e" />
          </View>
        )}
      </View>

      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          {suggestions.map((item, index) => (
            <TouchableOpacity
              key={`${item.lat}-${item.lon}-${index}`}
              style={styles.suggestionItem}
              onPress={() => handleSelectCity(item)}
            >
              <Text style={styles.suggestionText}>{formatCityName(item)}</Text>
              {item.display_name && item.display_name !== formatCityName(item) && (
                <Text style={styles.suggestionSubtext} numberOfLines={1}>
                  {item.display_name}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1,
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1f2937',
    borderRadius: 12,
    padding: 14,
    color: '#f9fafb',
    fontSize: 16,
    paddingRight: 40,
  },
  loaderContainer: {
    position: 'absolute',
    right: 12,
    top: 14,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
    maxHeight: 200,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1f2937',
  },
  suggestionText: {
    color: '#f9fafb',
    fontSize: 14,
    fontWeight: '500',
  },
  suggestionSubtext: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 2,
  },
});

