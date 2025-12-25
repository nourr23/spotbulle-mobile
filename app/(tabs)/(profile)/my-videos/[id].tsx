import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { getVideoById } from '@/services/api/videos/getById';
import { supabase } from '@/services/supabaseClient';

export default function VideoDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: video,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['video', id, user?.id],
    enabled: !!id && !!user,
    queryFn: () => getVideoById({ videoId: id!, userId: user!.id }),
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      if (!video || !user) {
        throw new Error('Données manquantes');
      }

      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError || !session?.access_token) {
        throw new Error('Session non valide, veuillez vous reconnecter');
      }

      // Check if video has transcription
      let transcriptionText = video.transcription_text;
      if (!transcriptionText && video.transcription_data) {
        try {
          const transcriptionData = typeof video.transcription_data === 'string'
            ? JSON.parse(video.transcription_data)
            : video.transcription_data;
          transcriptionText = transcriptionData?.text || transcriptionData?.full_text;
        } catch (e) {
          console.warn('Error parsing transcription_data:', e);
        }
      }

      // If no transcription, transcribe first
      if (!transcriptionText || transcriptionText.trim().length < 20) {
        const transcribeResponse = await fetch(
          'https://nyxtckjfaajhacboxojd.supabase.co/functions/v1/transcribe-video',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              videoId: video.id,
              userId: video.user_id,
              videoUrl: video.video_url || video.public_url
            }),
          }
        );

        if (!transcribeResponse.ok) {
          const errorResult = await transcribeResponse.json().catch(() => ({}));
          throw new Error(errorResult.error || 'Erreur lors de la transcription');
        }

        // Wait a bit then analyze
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Analyze video
      const response = await fetch(
        'https://nyxtckjfaajhacboxojd.supabase.co/functions/v1/analyze-transcription',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            videoId: video.id,
            userId: video.user_id
          }),
        }
      );

      if (!response.ok) {
        const errorResult = await response.json().catch(() => ({}));
        throw new Error(errorResult.error || errorResult.details || 'Erreur lors de l\'analyse');
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video', id, user?.id] });
      queryClient.invalidateQueries({ queryKey: ['videos', user?.id] });
      Alert.alert('Succès', 'Analyse démarrée avec succès');
    },
    onError: (error: Error) => {
      Alert.alert('Erreur', error.message || 'Erreur lors de l\'analyse');
    },
  });

  const handleAnalyze = () => {
    if (!video) return;
    analyzeMutation.mutate();
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#22c55e" />
        <Text style={[styles.centerText, { marginTop: 16 }]}>
          Chargement de la vidéo...
        </Text>
      </View>
    );
  }

  if (error || !video) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>
          Erreur: {(error as Error)?.message || 'Vidéo non trouvée'}
        </Text>
      </View>
    );
  }

  const hasAnalysis = !!(video.analysis || video.ai_score);
  const hasTranscription = !!(video.transcription_text || video.transcription_data);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{video.title || 'Vidéo sans titre'}</Text>
        <Text style={styles.date}>
          {new Date(video.created_at).toLocaleString('fr-FR')}
        </Text>
        <Text style={styles.status}>Statut: {video.status || 'inconnue'}</Text>
      </View>

      {video.video_url && (
        <View style={styles.videoSection}>
          <Text style={styles.sectionTitle}>Vidéo</Text>
          <Video
            source={{ uri: video.video_url }}
            style={styles.videoPlayer}
            useNativeControls
            resizeMode={ResizeMode.CONTAIN}
            isLooping={false}
          />
        </View>
      )}

      {hasAnalysis ? (
        <View style={styles.analysisSection}>
          <Text style={styles.sectionTitle}>Analyse</Text>
          {video.ai_score && (
            <View style={styles.scoreContainer}>
              <Text style={styles.scoreLabel}>Score IA</Text>
              <Text style={styles.scoreValue}>
                {(video.ai_score * 10).toFixed(1)}/10
              </Text>
            </View>
          )}
          {video.analysis?.summary && (
            <View style={styles.summaryContainer}>
              <Text style={styles.summaryTitle}>Résumé</Text>
              <Text style={styles.summaryText}>{video.analysis.summary}</Text>
            </View>
          )}
          {video.analysis?.key_topics && (
            <View style={styles.topicsContainer}>
              <Text style={styles.topicsTitle}>Thèmes clés</Text>
              {video.analysis.key_topics.map((topic: string, index: number) => (
                <View key={index} style={styles.topicTag}>
                  <Text style={styles.topicText}>{topic}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      ) : (
        <View style={styles.noAnalysisSection}>
          <Text style={styles.sectionTitle}>Analyse</Text>
          <Text style={styles.noAnalysisText}>
            {hasTranscription
              ? 'Aucune analyse disponible. Cliquez sur le bouton pour analyser la vidéo.'
              : 'Transcription requise avant l\'analyse.'}
          </Text>
          {hasTranscription && (
            <TouchableOpacity
              style={styles.analyzeButton}
              onPress={handleAnalyze}
              disabled={analyzeMutation.isPending}
            >
              {analyzeMutation.isPending ? (
                <ActivityIndicator color="#0b1120" />
              ) : (
                <Text style={styles.analyzeButtonText}>📊 Analyser la vidéo</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}

      {video.transcription_text && (
        <View style={styles.transcriptionSection}>
          <Text style={styles.sectionTitle}>Transcription</Text>
          <Text style={styles.transcriptionText}>{video.transcription_text}</Text>
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
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  center: {
    flex: 1,
    backgroundColor: '#020617',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  centerText: {
    color: '#9ca3af',
    textAlign: 'center',
    fontSize: 14,
  },
  errorText: {
    color: '#f97373',
    textAlign: 'center',
    fontSize: 14,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    color: '#f9fafb',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  date: {
    color: '#6b7280',
    fontSize: 14,
    marginBottom: 4,
  },
  status: {
    color: '#9ca3af',
    fontSize: 12,
  },
  videoSection: {
    marginBottom: 24,
  },
  videoPlayer: {
    width: '100%',
    height: 200,
    backgroundColor: '#000',
    borderRadius: 12,
    marginTop: 8,
  },
  sectionTitle: {
    color: '#f9fafb',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  analysisSection: {
    marginBottom: 24,
  },
  scoreContainer: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  scoreLabel: {
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 4,
  },
  scoreValue: {
    color: '#22c55e',
    fontSize: 32,
    fontWeight: '700',
  },
  summaryContainer: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  summaryTitle: {
    color: '#f9fafb',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  summaryText: {
    color: '#d1d5db',
    fontSize: 14,
    lineHeight: 20,
  },
  topicsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  topicsTitle: {
    width: '100%',
    color: '#f9fafb',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  topicTag: {
    backgroundColor: '#1f2937',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  topicText: {
    color: '#e5e7eb',
    fontSize: 12,
  },
  noAnalysisSection: {
    marginBottom: 24,
  },
  noAnalysisText: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 16,
  },
  analyzeButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  analyzeButtonText: {
    color: '#0b1120',
    fontSize: 16,
    fontWeight: '600',
  },
  transcriptionSection: {
    marginBottom: 24,
  },
  transcriptionText: {
    color: '#d1d5db',
    fontSize: 14,
    lineHeight: 20,
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
  },
});

