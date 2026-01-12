import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { checkVideoProfileInformation } from '@/services/api/videos/checkProfileInfo';
import AgeSelector from '@/components/lumi/AgeSelector';
import QuestionCard, { Question } from '@/components/lumi/QuestionCard';
import ProgressIndicator from '@/components/lumi/ProgressIndicator';
import ProfileDisplay, { LumiProfile } from '@/components/lumi/ProfileDisplay';
import HobbyFlow from '@/components/lumi/HobbyFlow';
import { startLumiSession, submitAnswer, computeProfile, getLumiProfile } from '@/services/api/lumi';

export default function DiscScreen() {
  const { user } = useAuth();
  const [checkingAge, setCheckingAge] = useState(true);
  const [ageRange, setAgeRange] = useState<string | null>(null);
  const [showAgeSelection, setShowAgeSelection] = useState(false);
  const hasCheckedVideoAge = useRef(false);

  // Question flow state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [currentAnswers, setCurrentAnswers] = useState<string[]>([]);
  const [currentAnswerValue, setCurrentAnswerValue] = useState<string | number | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [computingProfile, setComputingProfile] = useState(false);
  const [computedProfile, setComputedProfile] = useState<LumiProfile | null>(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Function to determine age range from age number
  const getAgeRangeFromAge = (age: number): string | null => {
    if (age >= 16 && age <= 20) return '16-20';
    if (age >= 21 && age <= 30) return '21-30';
    if (age >= 31 && age <= 45) return '31-45';
    if (age >= 46) return '46+';
    return null;
  };

  // Check for existing profile first
  useEffect(() => {
    const checkExistingProfile = async () => {
      if (!user?.id) {
        setCheckingAge(false);
        return;
      }

      try {
        const result = await getLumiProfile({ userId: user.id });
        if (result.success && result.profile) {
          // Profile exists, skip age selection
          setComputedProfile(result.profile as LumiProfile);
          setCheckingAge(false);
          hasCheckedVideoAge.current = true;
          return;
        }
      } catch (error) {
        console.error('[DiscScreen] Error checking existing profile:', error);
      }
    };

    checkExistingProfile();
  }, [user?.id]);

  // Check for age in video profile information (only if no profile exists)
  useEffect(() => {
    const checkAge = async () => {
      // Skip if profile already exists or already checked
      if (computedProfile || hasCheckedVideoAge.current || ageRange !== null) {
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
  }, [user?.id, ageRange, computedProfile]);

  const handleAgeSelect = (selectedAgeRange: string) => {
    setAgeRange(selectedAgeRange);
    setShowAgeSelection(false);
  };

  // Start DISC session when age range is confirmed
  useEffect(() => {
    const startSession = async () => {
      if (!ageRange || sessionId || !user?.id || computedProfile) {
        return;
      }

      try {
        setLoading(true);
        const result = await startLumiSession({
          type: 'onboarding',
          ageRange: ageRange,
        });

        if (result.success && result.session_id && result.first_question) {
          setSessionId(result.session_id);
          setCurrentQuestion(result.first_question as Question);
          setCurrentQuestionIndex(1);
          setQuestionCount(8); // DISC has 8 questions per age range
        } else {
          Alert.alert(
            'Erreur',
            result.error || 'Impossible de démarrer la session DISC'
          );
        }
      } catch (error: any) {
        console.error('[DiscScreen] Error starting session:', error);
        Alert.alert('Erreur', 'Impossible de démarrer la session DISC');
      } finally {
        setLoading(false);
      }
    };

    startSession();
  }, [ageRange, sessionId, user?.id, computedProfile]);


  const handleSubmitAnswer = async () => {
    if (!sessionId || !currentQuestion) {
      return;
    }

    // Validate answer
    if (currentQuestion.question_type === 'multiple_choice') {
      if (currentAnswers.length === 0) {
        Alert.alert('Attention', 'Veuillez sélectionner au moins une réponse');
        return;
      }
    } else {
      if (!currentAnswerValue) {
        Alert.alert('Attention', 'Veuillez entrer une réponse');
        return;
      }
    }

    try {
      setSubmitting(true);

      const answerJson =
        currentQuestion.question_type === 'multiple_choice'
          ? { answers: currentAnswers }
          : null;

      const answerValue =
        currentQuestion.question_type === 'multiple_choice'
          ? null
          : currentAnswerValue;

      const result = await submitAnswer({
        session_id: sessionId,
        question_id: currentQuestion.id,
        answer_value: answerValue as string | number | null,
        answer_json: answerJson,
      });

      if (result.success) {
        if (result.session_complete) {
          // All questions answered, compute profile
          setComputingProfile(true);
          const profileResult = await computeProfile({ session_id: sessionId });

          if (profileResult.success && profileResult.profile) {
            setComputedProfile(profileResult.profile as LumiProfile);
            setCurrentQuestion(null);
          } else {
            Alert.alert(
              'Erreur',
              profileResult.error || 'Impossible de calculer le profil'
            );
          }
          setComputingProfile(false);
        } else if (result.next_question) {
          // Next question
          setCurrentQuestion(result.next_question as Question);
          setCurrentQuestionIndex((prev) => prev + 1);
          setCurrentAnswers([]);
          setCurrentAnswerValue(null);
        }
      } else {
        Alert.alert('Erreur', result.error || 'Impossible d\'enregistrer la réponse');
      }
    } catch (error: any) {
      console.error('[DiscScreen] Error submitting answer:', error);
      Alert.alert('Erreur', 'Impossible d\'enregistrer la réponse');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Profil DISC</Text>
        <Text style={styles.subtitle}>
          Découvrez votre profil de personnalité DISC
        </Text>
      </View>

      {checkingAge && !computedProfile && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22c55e" />
          <Text style={styles.loadingText}>Vérification de votre âge...</Text>
        </View>
      )}

      {!checkingAge && !computedProfile && showAgeSelection && (
        <AgeSelector
          selectedAgeRange={ageRange}
          onSelect={handleAgeSelect}
        />
      )}

      {!checkingAge && !computedProfile && !showAgeSelection && ageRange && !currentQuestion && loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22c55e" />
          <Text style={styles.loadingText}>Démarrage de la session...</Text>
        </View>
      )}

      {/* Question Display */}
      {currentQuestion && !computingProfile && !computedProfile && (
        <View style={styles.questionSection}>
          <ProgressIndicator
            current={currentQuestionIndex}
            total={questionCount}
          />
          <QuestionCard
            question={currentQuestion}
            selectedAnswers={currentAnswers}
            answerValue={currentAnswerValue as string | number}
            onAnswerChange={setCurrentAnswers}
            onValueChange={setCurrentAnswerValue}
          />
          <TouchableOpacity
            style={[
              styles.submitButton,
              submitting && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmitAnswer}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#0b1120" />
            ) : (
              <Text style={styles.submitButtonText}>
                {currentQuestionIndex === questionCount ? 'Terminer' : 'Suivant'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Computing Profile */}
      {computingProfile && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22c55e" />
          <Text style={styles.loadingText}>
            Calcul de votre profil DISC...
          </Text>
        </View>
      )}

      {/* Profile Results */}
      {computedProfile && (
        <>
          <ProfileDisplay profile={computedProfile} />
          <HobbyFlow computedProfile={computedProfile} ageRange={ageRange} />
        </>
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
  questionSection: {
    width: '100%',
    marginTop: 24,
  },
  submitButton: {
    backgroundColor: '#22c55e',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    minHeight: 52,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#0b1120',
    fontSize: 16,
    fontWeight: '700',
  },
});

