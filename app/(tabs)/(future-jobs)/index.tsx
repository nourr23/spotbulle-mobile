import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { getSymbolicProfile } from '@/services/api/profile/getSymbolic';
import { getLumiProfile } from '@/services/api/profile/getLumi';
import { getLatestVideoAnalysis } from '@/services/api/videos/getLatestAnalysis';
import { generateFutureJobs, FutureJob } from '@/services/api/jobs/generateJobs';
import { createJobConversation } from '@/services/api/jobs/createConversation';
import { listJobConversations } from '@/services/api/jobs/listConversations';
import { TRACK_OPTIONS } from '@/constants/jobTracks';

type ChatStep = 'askTracks' | 'chooseTracks' | 'askDescription' | 'typingDescription' | 'generating' | 'done';

export default function FutureJobsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedTracks, setSelectedTracks] = useState<string[]>([]);
  const [userDescription, setUserDescription] = useState('');
  const [chatStep, setChatStep] = useState<ChatStep>('askTracks');
  const [jobs, setJobs] = useState<FutureJob[]>([]);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [creatingConversationId, setCreatingConversationId] = useState<number | null>(null);

  // Fetch profiles
  const { data: symbolicProfile } = useQuery({
    queryKey: ['symbolicProfile', user?.id],
    enabled: !!user,
    queryFn: () => getSymbolicProfile({ userId: user!.id }),
  });

  const { data: lumiProfile } = useQuery({
    queryKey: ['lumiProfile', user?.id],
    enabled: !!user,
    queryFn: () => getLumiProfile({ userId: user!.id }),
  });

  const { data: videoAnalysis } = useQuery({
    queryKey: ['latestVideoAnalysis', user?.id],
    enabled: !!user,
    queryFn: () => getLatestVideoAnalysis({ userId: user!.id }),
  });

  // Fetch existing job conversations
  const { data: jobConversations = [], refetch: refetchConversations } = useQuery({
    queryKey: ['jobConversations', user?.id],
    enabled: !!user,
    queryFn: () => listJobConversations({ userId: user!.id }),
  });

  const generateJobsMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Utilisateur non connecté');

      const unifiedPayload = {
        symbolic_profile: symbolicProfile
          ? {
              archetype: symbolicProfile.archetype || undefined,
              phrase_synchronie: symbolicProfile.phrase_synchronie || undefined,
              element: symbolicProfile.element || undefined,
              profile_text: symbolicProfile.profile_text || undefined,
            }
          : null,
        lumi_profile: lumiProfile
          ? {
              dominant_color: lumiProfile.dominant_color || undefined,
              secondary_color: lumiProfile.secondary_color || undefined,
              disc_scores: lumiProfile.disc_scores || undefined,
              traits: lumiProfile.traits || undefined,
            }
          : null,
        video_analysis: videoAnalysis
          ? {
              summary: videoAnalysis.analysis?.summary || undefined,
              ai_score: videoAnalysis.analysis?.ai_score || undefined,
              metadata: videoAnalysis.analysis?.metadata || undefined,
            }
          : null,
        extra_preferences: {
          sectors: selectedTracks.length > 0 ? selectedTracks : null,
          description: userDescription.trim() || null,
        },
        language: 'fr' as const,
      };

      const result = await generateFutureJobs(unifiedPayload);
      if (!result.success || !result.jobs) {
        throw new Error(result.error || 'Erreur lors de la génération des métiers');
      }
      return result.jobs;
    },
    onSuccess: (data) => {
      setJobs(data);
      setChatStep('done');
    },
    onError: (error: Error) => {
      setJobsError(error.message);
      setChatStep('done');
      Alert.alert('Erreur', error.message);
    },
  });

  const createConversationMutation = useMutation({
    mutationFn: async ({ job, index }: { job: FutureJob; index: number }) => {
      if (!user) throw new Error('Utilisateur non connecté');

      const result = await createJobConversation({
        jobTitle: job.title,
        jobDescription: job.why_fit || '',
        reason: job.why_fit || '',
        sectors: selectedTracks.length > 0 ? selectedTracks : null,
        userDescription: userDescription || null,
      });

      if (!result.success || !result.conversation) {
        throw new Error(result.error || 'Erreur lors de la création de la conversation');
      }

      return result.conversation;
    },
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: ['jobConversations', user?.id] });
      router.push(`/(tabs)/(future-jobs)/${conversation.id}`);
    },
    onError: (error: Error) => {
      Alert.alert('Erreur', error.message);
    },
    onSettled: () => {
      setCreatingConversationId(null);
    },
  });

  const handleGenerateJobs = () => {
    setChatStep('generating');
    setJobsError(null);
    setJobs([]);
    generateJobsMutation.mutate();
  };

  const handleStartJobConversation = (job: FutureJob, index: number) => {
    setCreatingConversationId(index);
    createConversationMutation.mutate({ job, index });
  };

  const handleRestartChat = () => {
    setSelectedTracks([]);
    setUserDescription('');
    setJobs([]);
    setJobsError(null);
    setChatStep('askTracks');
  };

  const renderChatContent = () => {
    // Intro message
    if (chatStep === 'askTracks' || chatStep === 'chooseTracks') {
      return (
        <View style={styles.chatContainer}>
          <View style={styles.messageBubble}>
            <Text style={styles.messageText}>
              Bonjour, je suis <Text style={styles.boldText}>Spot Coach</Text>. Je suis là pour t'aider à explorer des pistes de métiers du futur à partir de ton profil. On commence en douceur 😊
            </Text>
          </View>

          <View style={styles.messageBubble}>
            <Text style={styles.messageText}>
              Est-ce que tu veux choisir une ou plusieurs <Text style={styles.boldText}>filières</Text> qui t'intéressent ?
            </Text>
          </View>

          {chatStep === 'askTracks' && (
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.button}
                onPress={() => setChatStep('chooseTracks')}
              >
                <Text style={styles.buttonText}>Oui</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.buttonOutline]}
                onPress={() => {
                  setSelectedTracks([]);
                  setChatStep('askDescription');
                }}
              >
                <Text style={[styles.buttonText, styles.buttonTextOutline]}>Non</Text>
              </TouchableOpacity>
            </View>
          )}

          {chatStep === 'chooseTracks' && (
            <View style={styles.tracksContainer}>
              <Text style={styles.tracksHint}>
                Tu peux cliquer sur une ou plusieurs filières. Tu peux aussi continuer sans en choisir.
              </Text>
              <ScrollView style={styles.tracksScroll}>
                {TRACK_OPTIONS.map((track) => {
                  const selected = selectedTracks.includes(track);
                  return (
                    <TouchableOpacity
                      key={track}
                      style={[styles.trackItem, selected && styles.trackItemSelected]}
                      onPress={() => {
                        setSelectedTracks((prev) =>
                          selected ? prev.filter((t) => t !== track) : [...prev, track]
                        );
                      }}
                    >
                      <Text style={[styles.trackText, selected && styles.trackTextSelected]}>
                        {track}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <TouchableOpacity
                style={styles.button}
                onPress={() => setChatStep('askDescription')}
              >
                <Text style={styles.buttonText}>Continuer</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      );
    }

    // Ask for description
    if (chatStep === 'askDescription' || chatStep === 'typingDescription') {
      return (
        <View style={styles.chatContainer}>
          <View style={styles.messageBubble}>
            <Text style={styles.messageText}>
              Parfait ! Maintenant, peux-tu me décrire en quelques mots ce qui t'intéresse, tes envies, ou tes projets ? (optionnel)
            </Text>
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={userDescription}
              onChangeText={setUserDescription}
              placeholder="Décris tes intérêts, envies ou projets..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[styles.button, (!userDescription.trim() && chatStep === 'typingDescription') && styles.buttonDisabled]}
              onPress={() => {
                if (userDescription.trim()) {
                  setChatStep('typingDescription');
                } else {
                  handleGenerateJobs();
                }
              }}
              disabled={chatStep === 'typingDescription' && !userDescription.trim()}
            >
              <Text style={styles.buttonText}>
                {chatStep === 'typingDescription' ? 'Générer les métiers' : 'Continuer'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // Generating
    if (chatStep === 'generating') {
      return (
        <View style={styles.chatContainer}>
          <View style={styles.messageBubble}>
            <ActivityIndicator size="large" color="#22c55e" />
            <Text style={[styles.messageText, styles.centerText]}>
              Spot Coach analyse ton profil et génère tes métiers du futur...
            </Text>
          </View>
        </View>
      );
    }

    // Done - show jobs
    if (chatStep === 'done') {
      if (jobsError) {
        return (
          <View style={styles.chatContainer}>
            <View style={[styles.messageBubble, styles.errorBubble]}>
              <Text style={styles.messageText}>{jobsError}</Text>
            </View>
            <TouchableOpacity style={styles.button} onPress={handleRestartChat}>
              <Text style={styles.buttonText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        );
      }

      if (jobs.length === 0) {
        return (
          <View style={styles.chatContainer}>
            <View style={styles.messageBubble}>
              <Text style={styles.messageText}>
                Aucun métier généré. Réessaie plus tard.
              </Text>
            </View>
            <TouchableOpacity style={styles.button} onPress={handleRestartChat}>
              <Text style={styles.buttonText}>Recommencer</Text>
            </TouchableOpacity>
          </View>
        );
      }

      return (
        <View style={styles.chatContainer}>
          <View style={styles.messageBubble}>
            <Text style={styles.messageText}>
              Voici <Text style={styles.boldText}>10 idées de métiers du futur</Text> basées sur ton profil :
            </Text>
          </View>

          <ScrollView style={styles.jobsScroll} nestedScrollEnabled>
            {jobs.map((job, index) => (
              <TouchableOpacity
                key={index}
                style={styles.jobCard}
                onPress={() => handleStartJobConversation(job, index)}
                disabled={creatingConversationId === index}
              >
                {creatingConversationId === index ? (
                  <ActivityIndicator size="small" color="#22c55e" />
                ) : (
                  <>
                    <Text style={styles.jobTitle}>{job.title}</Text>
                    <Text style={styles.jobWhyFit} numberOfLines={2}>
                      {job.why_fit}
                    </Text>
                    {job.skills_needed && job.skills_needed.length > 0 && (
                      <View style={styles.skillsContainer}>
                        {job.skills_needed.slice(0, 3).map((skill, idx) => (
                          <View key={idx} style={styles.skillTag}>
                            <Text style={styles.skillText}>{skill}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity style={[styles.button, styles.buttonOutline]} onPress={handleRestartChat}>
            <Text style={[styles.buttonText, styles.buttonTextOutline]}>Nouvelle recherche</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Existing conversations */}
        {jobConversations.length > 0 && (
          <View style={styles.existingSection}>
            <Text style={styles.sectionTitle}>Mes conversations ({jobConversations.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {jobConversations.map((conv) => (
                <TouchableOpacity
                  key={conv.id}
                  style={styles.conversationCard}
                  onPress={() => router.push(`/(tabs)/(future-jobs)/${conv.id}`)}
                >
                  <Text style={styles.conversationTitle} numberOfLines={1}>
                    {conv.job_title}
                  </Text>
                  {conv.sectors && conv.sectors.length > 0 && (
                    <View style={styles.sectorsContainer}>
                      {conv.sectors.slice(0, 2).map((sector, idx) => (
                        <Text key={idx} style={styles.sectorTag}>
                          {sector}
                        </Text>
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Chat content */}
        {renderChatContent()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 40,
    paddingBottom: 32,
  },
  existingSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#f9fafb',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  conversationCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    minWidth: 150,
    maxWidth: 200,
  },
  conversationTitle: {
    color: '#f9fafb',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectorsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  sectorTag: {
    color: '#22c55e',
    fontSize: 10,
    backgroundColor: '#22c55e20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  chatContainer: {
    gap: 16,
  },
  messageBubble: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    maxWidth: '85%',
    alignSelf: 'flex-start',
  },
  errorBubble: {
    backgroundColor: '#7f1d1d',
  },
  messageText: {
    color: '#f9fafb',
    fontSize: 14,
    lineHeight: 20,
  },
  boldText: {
    fontWeight: '700',
  },
  centerText: {
    textAlign: 'center',
    marginTop: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    backgroundColor: '#22c55e',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    minWidth: 100,
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#475569',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#0b1120',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonTextOutline: {
    color: '#f9fafb',
  },
  tracksContainer: {
    gap: 12,
  },
  tracksHint: {
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 8,
  },
  tracksScroll: {
    maxHeight: 300,
  },
  trackItem: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#475569',
  },
  trackItemSelected: {
    backgroundColor: '#22c55e20',
    borderColor: '#22c55e',
  },
  trackText: {
    color: '#f9fafb',
    fontSize: 13,
  },
  trackTextSelected: {
    color: '#22c55e',
    fontWeight: '600',
  },
  inputContainer: {
    gap: 12,
  },
  textInput: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    color: '#f9fafb',
    fontSize: 14,
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#475569',
  },
  jobsScroll: {
    maxHeight: 400,
    marginVertical: 16,
  },
  jobCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#475569',
  },
  jobTitle: {
    color: '#22c55e',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  jobWhyFit: {
    color: '#f9fafb',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  skillTag: {
    backgroundColor: '#22c55e20',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  skillText: {
    color: '#22c55e',
    fontSize: 11,
  },
});
