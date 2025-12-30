import { useAuth } from "@/context/AuthContext";
import { analyzeVideo } from "@/services/api/videos/analyze";
import { deleteVideo } from "@/services/api/videos/delete";
import { getVideoById } from "@/services/api/videos/getById";
import { transcribeVideo } from "@/services/api/videos/transcribe";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ResizeMode, Video } from "expo-av";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

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
    queryKey: ["video", id, user?.id],
    enabled: !!id && !!user,
    queryFn: () => getVideoById({ videoId: id!, userId: user!.id }),
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      console.log("🔍 [Analyze] Starting analysis mutation...");
      
      if (!video || !user) {
        console.error("❌ [Analyze] Missing video or user:", { video: !!video, user: !!user });
        throw new Error("Données manquantes");
      }

      console.log("✅ [Analyze] Video and user found:", {
        videoId: video.id,
        userId: user.id,
        videoTitle: video.title,
      });

      // Check if video has transcription
      let transcriptionText = video.transcription_text;
      console.log("📝 [Analyze] Initial transcription check:", {
        hasTranscriptionText: !!video.transcription_text,
        hasTranscriptionData: !!video.transcription_data,
        transcriptionLength: transcriptionText?.length || 0,
      });

      if (!transcriptionText && video.transcription_data) {
        try {
          console.log("🔄 [Analyze] Parsing transcription_data...");
          const transcriptionData =
            typeof video.transcription_data === "string"
              ? JSON.parse(video.transcription_data)
              : video.transcription_data;
          transcriptionText =
            transcriptionData?.text || transcriptionData?.full_text;
          console.log("✅ [Analyze] Parsed transcription_data:", {
            hasText: !!transcriptionText,
            length: transcriptionText?.length || 0,
          });
        } catch (e) {
          console.error("❌ [Analyze] Error parsing transcription_data:", e);
        }
      }

      // If no transcription, transcribe first
      if (!transcriptionText || transcriptionText.trim().length < 20) {
        console.log("📹 [Analyze] No transcription found, transcribing first...");
        try {
          await transcribeVideo({
            videoId: video.id,
            userId: video.user_id,
            videoUrl: video.video_url || video.public_url || "",
          });
          console.log("✅ [Analyze] Transcription started successfully");

          // Wait a bit then analyze
          console.log("⏳ [Analyze] Waiting 2 seconds before analysis...");
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } catch (transcribeError) {
          console.error("❌ [Analyze] Transcription error:", transcribeError);
          throw transcribeError;
        }
      } else {
        console.log("✅ [Analyze] Transcription already exists, proceeding to analysis");
      }

      // Analyze video
      console.log("🤖 [Analyze] Calling analyzeVideo function...");
      try {
        const result = await analyzeVideo({
          videoId: video.id,
          userId: video.user_id,
          transcriptionText: transcriptionText || undefined,
        });
        console.log("✅ [Analyze] Analysis completed successfully:", result);
        return result;
      } catch (analyzeError) {
        console.error("❌ [Analyze] Analysis error:", analyzeError);
        throw analyzeError;
      }
    },
    onSuccess: () => {
      console.log("✅ [Analyze] Mutation success, starting polling...");
      
      // Start polling to check when analysis is complete
      let pollCount = 0;
      const maxPolls = 40; // 40 * 3s = 2 minutes
      const pollInterval = setInterval(async () => {
        pollCount++;
        console.log(`🔄 [Analyze] Polling for analysis completion (attempt ${pollCount}/${maxPolls})...`);
        
        try {
          // Force refetch to get latest data
          const updatedVideo = await queryClient.fetchQuery({
            queryKey: ["video", id, user?.id],
            queryFn: () => getVideoById({ videoId: id!, userId: user!.id }),
            staleTime: 0, // Always fetch fresh data
          });
          
          if (updatedVideo?.analysis || updatedVideo?.ai_score) {
            console.log("✅ [Analyze] Analysis detected, stopping poll and refreshing UI");
            clearInterval(pollInterval);
            // Force refetch to update UI immediately
            await queryClient.refetchQueries({ queryKey: ["video", id, user?.id] });
            queryClient.invalidateQueries({ queryKey: ["videos", user?.id] });
            Alert.alert("Succès", "Analyse terminée avec succès");
          } else if (pollCount >= maxPolls) {
            console.log("⏰ [Analyze] Polling timeout, refreshing data...");
            clearInterval(pollInterval);
            await queryClient.refetchQueries({ queryKey: ["video", id, user?.id] });
          }
        } catch (pollError) {
          console.error("❌ [Analyze] Polling error:", pollError);
          if (pollCount >= maxPolls) {
            clearInterval(pollInterval);
          }
        }
      }, 3000); // Poll every 3 seconds
      
      Alert.alert("Info", "Analyse démarrée. Elle sera disponible dans quelques instants.");
    },
    onError: (error: Error) => {
      // Extract clear error message
      let errorMessage = error.message || "Erreur lors de l'analyse";
      const errorAny = error as any;
      const httpStatus = errorAny.context?.status || errorAny.status || null;
      
      // Check if it's a file size error - show error immediately
      if (errorMessage.includes("Maximum content size") || errorMessage.includes("413")) {
        Alert.alert("Erreur", "La vidéo est trop volumineuse (limite: 25MB). Veuillez enregistrer une vidéo plus courte.");
        return;
      }
      
      // For non-2xx errors (including 500), the analysis might still be processing
      // So we'll start polling to check if it completes
      if (errorMessage.includes("non-2xx") || httpStatus) {
        console.log("⚠️ [Analyze] Non-2xx error detected, but analysis might still be processing. Starting poll...");
        
        // Invalidate queries to get fresh data
        queryClient.invalidateQueries({ queryKey: ["video", id, user?.id] });
        queryClient.invalidateQueries({ queryKey: ["videos", user?.id] });
        
        // Start polling to check if analysis completes
        let pollCount = 0;
        const maxPolls = 40; // 40 * 3s = 2 minutes
        const pollInterval = setInterval(async () => {
          pollCount++;
          console.log(`🔄 [Analyze] Polling for analysis (attempt ${pollCount}/${maxPolls})...`);
          
          try {
            const updatedVideo = await queryClient.fetchQuery({
              queryKey: ["video", id, user?.id],
              queryFn: () => getVideoById({ videoId: id!, userId: user!.id }),
            });
            
            if (updatedVideo?.analysis || updatedVideo?.ai_score) {
              console.log("✅ [Analyze] Analysis detected after error, stopping poll and refreshing UI");
              clearInterval(pollInterval);
              // Force refetch to update UI immediately
              await queryClient.refetchQueries({ queryKey: ["video", id, user?.id] });
              queryClient.invalidateQueries({ queryKey: ["videos", user?.id] });
              Alert.alert("Succès", "Analyse terminée avec succès");
            } else if (pollCount >= maxPolls) {
              console.log("⏰ [Analyze] Polling timeout reached, refreshing data...");
              clearInterval(pollInterval);
              await queryClient.refetchQueries({ queryKey: ["video", id, user?.id] });
              // Don't show error, just refresh - user can check manually
            }
          } catch (pollError) {
            console.error("❌ [Analyze] Polling error:", pollError);
            if (pollCount >= maxPolls) {
              clearInterval(pollInterval);
            }
          }
        }, 3000);
        
        // Show info message that analysis is starting (not an error)
        Alert.alert("Info", "L'analyse a été lancée. Elle sera disponible dans quelques instants.");
        return;
      }
      
      // For other real errors, show error message
      Alert.alert("Erreur", errorMessage);
    },
  });

  const handleAnalyze = () => {
    if (!video) return;
    analyzeMutation.mutate();
  };

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!video || !user) {
        throw new Error("Données manquantes");
      }
      return deleteVideo({ videoId: video.id, userId: user.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["videos", user?.id] });
      Alert.alert("Succès", "Vidéo supprimée avec succès", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    },
    onError: (error: Error) => {
      Alert.alert("Erreur", error.message || "Erreur lors de la suppression");
    },
  });

  const handleDelete = () => {
    if (!video) return;

    Alert.alert(
      "Supprimer la vidéo",
      `Êtes-vous sûr de vouloir supprimer "${
        video.title || "cette vidéo"
      }" ? Cette action est irréversible.`,
      [
        {
          text: "Annuler",
          style: "cancel",
        },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: () => deleteMutation.mutate(),
        },
      ]
    );
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
          Erreur: {(error as Error)?.message || "Vidéo non trouvée"}
        </Text>
      </View>
    );
  }

  const hasAnalysis = !!video.ai_score;
  const hasTranscription = !!(
    video.transcription_text || video.transcription_data
  );


  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{video.title || "Vidéo sans titre"}</Text>
        <Text style={styles.date}>
          {new Date(video.created_at).toLocaleString("fr-FR")}
        </Text>
        <Text style={styles.status}>Statut: {video.status || "inconnue"}</Text>
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
                {(video.ai_score * 10).toFixed(1)}/100
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
              ? "Aucune analyse disponible. Cliquez sur le bouton pour analyser la vidéo."
              : "Transcription requise avant l'analyse."}
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
                <Text style={styles.analyzeButtonText}>
                  📊 Analyser la vidéo
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}

      {video.transcription_text && (
        <View style={styles.transcriptionSection}>
          <Text style={styles.sectionTitle}>Transcription</Text>
          <Text style={styles.transcriptionText}>
            {video.transcription_text}
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={handleDelete}
        disabled={deleteMutation.isPending}
      >
        {deleteMutation.isPending ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.deleteButtonText}>🗑️ Supprimer</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  center: {
    flex: 1,
    backgroundColor: "#020617",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  centerText: {
    color: "#9ca3af",
    textAlign: "center",
    fontSize: 14,
  },
  errorText: {
    color: "#f97373",
    textAlign: "center",
    fontSize: 14,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    color: "#f9fafb",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
  },
  date: {
    color: "#6b7280",
    fontSize: 14,
    marginBottom: 4,
  },
  status: {
    color: "#9ca3af",
    fontSize: 12,
  },
  deleteButton: {
    backgroundColor: "#ef4444",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  videoSection: {
    marginBottom: 24,
  },
  videoPlayer: {
    width: "100%",
    height: 200,
    backgroundColor: "#000",
    borderRadius: 12,
    marginTop: 8,
  },
  sectionTitle: {
    color: "#f9fafb",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  analysisSection: {
    marginBottom: 24,
  },
  scoreContainer: {
    backgroundColor: "#111827",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: "center",
  },
  scoreLabel: {
    color: "#9ca3af",
    fontSize: 12,
    marginBottom: 4,
  },
  scoreValue: {
    color: "#22c55e",
    fontSize: 32,
    fontWeight: "700",
  },
  summaryContainer: {
    backgroundColor: "#111827",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  summaryTitle: {
    color: "#f9fafb",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  summaryText: {
    color: "#d1d5db",
    fontSize: 14,
    lineHeight: 20,
  },
  topicsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  topicsTitle: {
    width: "100%",
    color: "#f9fafb",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  topicTag: {
    backgroundColor: "#1f2937",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  topicText: {
    color: "#e5e7eb",
    fontSize: 12,
  },
  noAnalysisSection: {
    marginBottom: 24,
  },
  noAnalysisText: {
    color: "#9ca3af",
    fontSize: 14,
    marginBottom: 16,
  },
  analyzeButton: {
    backgroundColor: "#22c55e",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
    shadowColor: "#22c55e",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  analyzeButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  transcriptionSection: {
    marginBottom: 24,
  },
  transcriptionText: {
    color: "#d1d5db",
    fontSize: 14,
    lineHeight: 20,
    backgroundColor: "#111827",
    borderRadius: 12,
    padding: 16,
  },
});
