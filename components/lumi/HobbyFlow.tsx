import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { DISC_ELEMENTS } from './DiscElements';
import QuestionCard, { Question } from './QuestionCard';
import { startHobbySession, submitHobbyAnswer, getHobbyRecommendation, getHobbyProfile } from '@/services/api/lumi/hobby';
import { getSessionAgeRange } from '@/services/api/lumi';
import { LumiProfile } from './ProfileDisplay';

// Available hobbies
const HOBBIES = [
  { name: 'Football', emoji: '⚽', color: 'green' },
  { name: 'Handball', emoji: '🤾', color: 'blue' },
  { name: 'Basketball', emoji: '🏀', color: 'orange' },
];

interface HobbyFlowProps {
  computedProfile: LumiProfile | null;
  ageRange: string | null;
}

export default function HobbyFlow({ computedProfile, ageRange }: HobbyFlowProps) {
  const [showHobbySelection, setShowHobbySelection] = useState(false);
  const [selectedHobby, setSelectedHobby] = useState<string | null>(null);
  const [hobbySessionId, setHobbySessionId] = useState<string | null>(null);
  const [currentHobbyQuestion, setCurrentHobbyQuestion] = useState<Question | null>(null);
  const [currentHobbyAnswer, setCurrentHobbyAnswer] = useState<string | number | null>(null);
  const [currentHobbyAnswers, setCurrentHobbyAnswers] = useState<string[]>([]);
  const [submittingHobbyAnswer, setSubmittingHobbyAnswer] = useState(false);
  const [gettingHobbyRecommendation, setGettingHobbyRecommendation] = useState(false);
  const [hobbyProfile, setHobbyProfile] = useState<any | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(true);

  // Check for existing hobby profile on mount
  useEffect(() => {
    const checkExistingHobby = async () => {
      if (!computedProfile?.user_id) return;

      setLoadingExisting(true);
      try {
        const hobbyResult = await getHobbyProfile({ userId: computedProfile.user_id });
        if (hobbyResult.success && hobbyResult.profile) {
          const hobby = Array.isArray(hobbyResult.profile)
            ? hobbyResult.profile[0]
            : hobbyResult.profile;
          if (hobby) {
            setHobbyProfile(hobby);
            setSelectedHobby(hobby.hobby_name);
          }
        }
      } catch (error) {
        console.error('[HobbyFlow] Error checking existing hobby:', error);
      } finally {
        setLoadingExisting(false);
      }
    };

    checkExistingHobby();
  }, [computedProfile]);

  if (!computedProfile) {
    return null;
  }

  if (loadingExisting) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#22c55e" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  const handleStartHobby = async (hobbyName: string) => {
    if (!computedProfile?.id) {
      Alert.alert(
        'Erreur',
        'Profil DISC non trouvé. Veuillez compléter le questionnaire DISC d\'abord.'
      );
      return;
    }

    setSelectedHobby(hobbyName);
    setShowHobbySelection(false);

    try {
      // If ageRange is null but we have a computedProfile with session_id, try to fetch it
      let finalAgeRange = ageRange;
      if (!finalAgeRange && computedProfile?.session_id) {
        const ageRangeResult = await getSessionAgeRange({ session_id: computedProfile.session_id });
        if (ageRangeResult.success && ageRangeResult.age_range) {
          finalAgeRange = ageRangeResult.age_range;
        }
      }

      // Start hobby session
      const result = await startHobbySession({
        hobbyName,
        ageRange: finalAgeRange,
      });

      if (result.success && result.session) {
        setHobbySessionId(result.session.id);
        setCurrentHobbyQuestion(result.first_question as Question);
        setCurrentHobbyAnswer(null);
        setCurrentHobbyAnswers([]);
      } else {
        Alert.alert('Erreur', result.error || 'Erreur lors du démarrage');
        setSelectedHobby(null);
        setShowHobbySelection(true);
      }
    } catch (error: any) {
      console.error('[HobbyFlow] Exception starting hobby session:', error);
      Alert.alert('Erreur', error.message || 'Erreur inattendue');
      setSelectedHobby(null);
      setShowHobbySelection(true);
    }
  };

  const handleSubmitHobbyAnswer = async () => {
    if (!hobbySessionId || !currentHobbyQuestion) {
      Alert.alert('Erreur', 'Session ou question manquante');
      return;
    }

    const hasAnswer =
      currentHobbyQuestion.question_type === 'multiple_choice'
        ? currentHobbyAnswers.length > 0
        : currentHobbyAnswer !== null && currentHobbyAnswer !== '';

    if (!hasAnswer) {
      Alert.alert('Attention', 'Veuillez répondre à la question');
      return;
    }

    setSubmittingHobbyAnswer(true);

    const answerJson =
      currentHobbyQuestion.question_type === 'multiple_choice' && currentHobbyAnswers.length > 0
        ? { answers: currentHobbyAnswers }
        : null;

    const answerValue =
      currentHobbyQuestion.question_type === 'multiple_choice' ? null : currentHobbyAnswer;

    try {
      const result = await submitHobbyAnswer({
        session_id: hobbySessionId,
        question_id: currentHobbyQuestion.id,
        answer_value: answerValue as string | number | null,
        answer_json: answerJson,
      });

      if (result.success) {
        if (result.is_complete) {
          // All questions answered, get GPT recommendation
          setGettingHobbyRecommendation(true);
          const recResult = await getHobbyRecommendation({ session_id: hobbySessionId });
          if (recResult.success && recResult.profile) {
            setHobbyProfile(recResult.profile);
            setCurrentHobbyQuestion(null);
            Alert.alert('Succès', 'Recommandation générée avec succès !');
          } else {
            Alert.alert('Erreur', recResult.error || 'Erreur lors de la génération');
          }
          setGettingHobbyRecommendation(false);
        } else {
          // Next question
          setCurrentHobbyQuestion(result.next_question as Question);
          setCurrentHobbyAnswer(null);
          setCurrentHobbyAnswers([]);
        }
      } else {
        Alert.alert('Erreur', result.error || 'Erreur lors de l\'envoi de la réponse');
      }
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Erreur inattendue');
    } finally {
      setSubmittingHobbyAnswer(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Hobby Selection Button - Show after profile is computed */}
      {!hobbyProfile && !currentHobbyQuestion && !showHobbySelection && (
        <View style={styles.selectionCard}>
          <Text style={styles.selectionTitle}>🎯 Découvre tes loisirs idéaux</Text>
          <Text style={styles.selectionSubtitle}>
            Choisis un loisir et découvre ton rôle idéal selon ton profil DISC
          </Text>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setShowHobbySelection(true)}
          >
            <Text style={styles.selectButtonText}>Choisir un loisir</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Hobby Selection Cards */}
      {showHobbySelection && !selectedHobby && !currentHobbyQuestion && (
        <View style={styles.selectionCard}>
          <Text style={styles.selectionTitle}>Choisis un loisir qui t'intéresse</Text>
          <Text style={styles.selectionSubtitle}>
            Sélectionne un loisir pour découvrir ton rôle idéal
          </Text>
          <View style={styles.hobbiesGrid}>
            {HOBBIES.map((hobby) => (
              <TouchableOpacity
                key={hobby.name}
                style={styles.hobbyCard}
                onPress={() => handleStartHobby(hobby.name)}
              >
                <Text style={styles.hobbyEmoji}>{hobby.emoji}</Text>
                <Text style={styles.hobbyName}>{hobby.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setShowHobbySelection(false)}
          >
            <Text style={styles.cancelButtonText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Hobby Question Display */}
      {currentHobbyQuestion && !hobbyProfile && (
        <View style={styles.questionCard}>
          <View style={styles.questionHeader}>
            <Text style={styles.questionTitle}>
              {currentHobbyQuestion.question_text}
            </Text>
            <Text style={styles.questionSubtitle}>
              {selectedHobby} - Question {currentHobbyQuestion.order_index}
            </Text>
          </View>
          <QuestionCard
            question={currentHobbyQuestion}
            selectedAnswers={currentHobbyAnswers}
            answerValue={currentHobbyAnswer as string | number}
            onAnswerChange={setCurrentHobbyAnswers}
            onValueChange={setCurrentHobbyAnswer}
          />
          <TouchableOpacity
            style={[
              styles.submitButton,
              (submittingHobbyAnswer || gettingHobbyRecommendation) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmitHobbyAnswer}
            disabled={submittingHobbyAnswer || gettingHobbyRecommendation}
          >
            {submittingHobbyAnswer || gettingHobbyRecommendation ? (
              <ActivityIndicator color="#0b1120" />
            ) : (
              <Text style={styles.submitButtonText}>
                {gettingHobbyRecommendation ? 'Génération...' : 'Suivant'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Getting Recommendation Loading */}
      {gettingHobbyRecommendation && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22c55e" />
          <Text style={styles.loadingText}>
            Génération de ta recommandation...
          </Text>
        </View>
      )}

      {/* Hobby Results */}
      {hobbyProfile && computedProfile && (
        <View style={styles.resultsCard}>
          <View style={styles.resultsHeader}>
            {selectedHobby && HOBBIES.find((h) => h.name === selectedHobby)?.emoji && (
              <Text style={styles.resultsEmoji}>
                {HOBBIES.find((h) => h.name === selectedHobby)?.emoji}
              </Text>
            )}
            <View style={styles.resultsHeaderText}>
              <Text style={styles.resultsTitle}>
                {selectedHobby} - Ton Rôle Idéal
              </Text>
              {computedProfile.dominant_color &&
                DISC_ELEMENTS[computedProfile.dominant_color] && (
                  <View style={styles.elementInfo}>
                    <Text style={styles.elementIcon}>
                      {DISC_ELEMENTS[computedProfile.dominant_color].icon}
                    </Text>
                    <Text style={styles.elementText}>
                      Énergie {DISC_ELEMENTS[computedProfile.dominant_color].elementFr} • Esprit{' '}
                      {DISC_ELEMENTS[computedProfile.dominant_color].animalEmoji}{' '}
                      {DISC_ELEMENTS[computedProfile.dominant_color].animalFr}
                    </Text>
                  </View>
                )}
            </View>
          </View>
          <Text style={styles.resultsSubtitle}>
            Recommandation basée sur ton profil DISC
          </Text>

          <ScrollView style={styles.resultsContent}>
            {/* Fit Score */}
            {hobbyProfile.fit_score !== null && (
              <View style={styles.fitScoreCard}>
                <View style={styles.fitScoreHeader}>
                  <Text style={styles.fitScoreLabel}>Score de compatibilité</Text>
                  <Text style={styles.fitScoreValue}>{hobbyProfile.fit_score}%</Text>
                </View>
                <View style={styles.progressBarContainer}>
                  <View
                    style={[
                      styles.progressBar,
                      {
                        width: `${hobbyProfile.fit_score}%`,
                        backgroundColor:
                          hobbyProfile.fit_score >= 80
                            ? '#22c55e'
                            : hobbyProfile.fit_score >= 50
                            ? '#eab308'
                            : '#ef4444',
                      },
                    ]}
                  />
                </View>
              </View>
            )}

            {/* Recommended Role */}
            {hobbyProfile.recommended_role && (
              <View style={styles.roleCard}>
                <Text style={styles.roleLabel}>Rôle Recommandé</Text>
                <Text style={styles.roleValue}>{hobbyProfile.recommended_role}</Text>
              </View>
            )}

            {/* Description */}
            {hobbyProfile.description && (
              <View style={styles.descriptionCard}>
                <Text style={styles.sectionTitle}>Description</Text>
                <Text style={styles.descriptionText}>{hobbyProfile.description}</Text>
              </View>
            )}

            {/* Development Tips */}
            {hobbyProfile.development_tips && (
              <View style={styles.tipsCard}>
                <Text style={styles.sectionTitle}>💡 Conseils de développement</Text>
                {Array.isArray(hobbyProfile.development_tips) ? (
                  hobbyProfile.development_tips.map((tip: string, idx: number) => (
                    <View key={idx} style={styles.tipItem}>
                      <Text style={styles.tipBullet}>•</Text>
                      <Text style={styles.tipText}>{tip}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.tipText}>{hobbyProfile.development_tips}</Text>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginTop: 24,
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
  selectionCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  selectionTitle: {
    color: '#f9fafb',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  selectionSubtitle: {
    color: '#9ca3af',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  selectButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  selectButtonText: {
    color: '#f9fafb',
    fontSize: 16,
    fontWeight: '700',
  },
  hobbiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  hobbyCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#334155',
  },
  hobbyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  hobbyName: {
    color: '#f9fafb',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#475569',
  },
  cancelButtonText: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
  },
  questionCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  questionHeader: {
    marginBottom: 20,
  },
  questionTitle: {
    color: '#f9fafb',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  questionSubtitle: {
    color: '#9ca3af',
    fontSize: 14,
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
  resultsCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
    marginTop: 24,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  resultsEmoji: {
    fontSize: 32,
  },
  resultsHeaderText: {
    flex: 1,
  },
  resultsTitle: {
    color: '#f9fafb',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  elementInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  elementIcon: {
    fontSize: 16,
  },
  elementText: {
    color: '#9ca3af',
    fontSize: 12,
  },
  resultsSubtitle: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 20,
  },
  resultsContent: {
    maxHeight: 600,
  },
  fitScoreCard: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  fitScoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  fitScoreLabel: {
    color: '#9ca3af',
    fontSize: 14,
  },
  fitScoreValue: {
    color: '#f9fafb',
    fontSize: 24,
    fontWeight: '700',
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#1e293b',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  roleCard: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  roleLabel: {
    color: '#a5b4fc',
    fontSize: 14,
    marginBottom: 8,
  },
  roleValue: {
    color: '#f9fafb',
    fontSize: 20,
    fontWeight: '700',
  },
  descriptionCard: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sectionTitle: {
    color: '#f9fafb',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  descriptionText: {
    color: '#e2e8f0',
    fontSize: 14,
    lineHeight: 22,
  },
  tipsCard: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  tipBullet: {
    color: '#6366f1',
    fontSize: 16,
    marginTop: 2,
  },
  tipText: {
    color: '#cbd5e1',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
});

