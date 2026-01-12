import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { checkVideoProfileInformation } from '@/services/api/videos/checkProfileInfo';
import AgeSelector from '@/components/lumi/AgeSelector';

export default function DiscScreen() {
  const { user } = useAuth();
  const [checkingAge, setCheckingAge] = useState(true);
  const [ageRange, setAgeRange] = useState<string | null>(null);
  const [showAgeSelection, setShowAgeSelection] = useState(false);
  const hasCheckedVideoAge = useRef(false);

  // Function to determine age range from age number
  const getAgeRangeFromAge = (age: number): string | null => {
    if (age >= 16 && age <= 20) return '16-20';
    if (age >= 21 && age <= 30) return '21-30';
    if (age >= 31 && age <= 45) return '31-45';
    if (age >= 46) return '46+';
    return null;
  };

  // Check for age in video profile information
  useEffect(() => {
    const checkAge = async () => {
      // Only check once on mount, and don't overwrite if user already selected
      if (hasCheckedVideoAge.current || ageRange !== null) {
        return;
      }

      if (!user?.id) {
        setCheckingAge(false);
        setShowAgeSelection(true);
        return;
      }

      try {
        setCheckingAge(true);
        const result = await checkVideoProfileInformation({ userId: user.id });

        if (result.hasProfileInfo && result.ageRange) {
          // Age found in video, set it
          setAgeRange(result.ageRange);
          setShowAgeSelection(false);
          hasCheckedVideoAge.current = true;
        } else {
          // No age found, show selection
          setShowAgeSelection(true);
          hasCheckedVideoAge.current = true;
        }
      } catch (error) {
        console.error('[DiscScreen] Error checking video age:', error);
        setShowAgeSelection(true);
      } finally {
        setCheckingAge(false);
      }
    };

    checkAge();
  }, [user?.id, ageRange]);

  const handleAgeSelect = (selectedAgeRange: string) => {
    setAgeRange(selectedAgeRange);
    setShowAgeSelection(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Profil DISC</Text>
        <Text style={styles.subtitle}>
          Découvrez votre profil de personnalité DISC
        </Text>
      </View>

      {checkingAge && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22c55e" />
          <Text style={styles.loadingText}>Vérification de votre âge...</Text>
        </View>
      )}

      {!checkingAge && showAgeSelection && (
        <AgeSelector
          selectedAgeRange={ageRange}
          onSelect={handleAgeSelect}
        />
      )}

      {!checkingAge && !showAgeSelection && ageRange && (
        <View style={styles.ageConfirmedContainer}>
          <Text style={styles.ageConfirmedText}>
            Tranche d'âge sélectionnée: {ageRange}
          </Text>
          <Text style={styles.nextStepText}>
            Prêt à commencer le questionnaire DISC
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    color: '#f9fafb',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    color: '#9ca3af',
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    color: '#9ca3af',
    fontSize: 14,
    marginTop: 16,
  },
  ageConfirmedContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginTop: 24,
  },
  ageConfirmedText: {
    color: '#22c55e',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  nextStepText: {
    color: '#9ca3af',
    fontSize: 14,
    textAlign: 'center',
  },
});

