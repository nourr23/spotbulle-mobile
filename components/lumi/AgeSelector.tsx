import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export interface AgeRange {
  value: string;
  label: string;
}

export const AGE_RANGES: AgeRange[] = [
  { value: '16-20', label: '16-20 ans' },
  { value: '21-30', label: '21-30 ans' },
  { value: '31-45', label: '31-45 ans' },
  { value: '46+', label: '46 ans et plus' },
];

interface AgeSelectorProps {
  selectedAgeRange: string | null;
  onSelect: (ageRange: string) => void;
  disabled?: boolean;
}

export default function AgeSelector({
  selectedAgeRange,
  onSelect,
  disabled = false,
}: AgeSelectorProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sélectionnez votre tranche d'âge</Text>
      <Text style={styles.subtitle}>
        Cela nous aide à personnaliser vos questions DISC
      </Text>

      <View style={styles.buttonsContainer}>
        {AGE_RANGES.map((range) => {
          const isSelected = selectedAgeRange === range.value;
          return (
            <TouchableOpacity
              key={range.value}
              style={[
                styles.button,
                isSelected && styles.buttonSelected,
                disabled && styles.buttonDisabled,
              ]}
              onPress={() => !disabled && onSelect(range.value)}
              disabled={disabled}
            >
              <Text
                style={[
                  styles.buttonText,
                  isSelected && styles.buttonTextSelected,
                ]}
              >
                {range.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 24,
  },
  title: {
    color: '#f9fafb',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: '#9ca3af',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonsContainer: {
    gap: 12,
  },
  button: {
    backgroundColor: '#1e293b',
    borderWidth: 2,
    borderColor: '#334155',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  buttonSelected: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#f9fafb',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextSelected: {
    color: '#0b1120',
  },
});

