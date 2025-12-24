import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { decode } from 'base64-arraybuffer';

import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/services/supabaseClient';
import SuccessModal from '@/components/SuccessModal';

export default function HomeScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const cameraRef = useRef<CameraView | null>(null);

  const permissionsGranted =
    cameraPermission?.granted && micPermission?.granted;

  // Timer for recording
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRecordToggle = async () => {
    try {
      // If no permissions yet, ask first, then user presses again to start
      if (!permissionsGranted) {
        await handleRequestPermissions();
        return;
      }

      if (!cameraRef.current) {
        return;
      }

      if (isRecording) {
        cameraRef.current.stopRecording();
        setIsRecording(false);
        return;
      }

      setRecordedUri(null);
      setRecordingTime(0); // Reset timer
      setIsRecording(true);

      const video = await cameraRef.current.recordAsync({
        maxDuration: 60,
        quality: '720p',
      });
      setRecordedUri(video?.uri ?? null);
      setIsRecording(false);
    } catch (e) {
      setIsRecording(false);
    }
  };

  const handleRequestPermissions = async () => {
    try {
      await requestCameraPermission();
      await requestMicPermission();
    } catch (e) {
      // Silent fail
    }
  };

  const uploadMutation = useMutation({
    mutationFn: async (videoUri: string) => {
      if (!user) {
        throw new Error('Authentification requise');
      }

      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session?.user) {
        throw new Error('Session non valide, veuillez vous reconnecter');
      }

      const userId = session.user.id;

      // Convert local URI to ArrayBuffer (like sawer-bel-akhdher does)
      const base64 = await FileSystem.readAsStringAsync(videoUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const arrayBuffer = decode(base64);

      const fileExt = 'mp4';
      const fileName = `mobile-${Date.now()}.${fileExt}`;
      const filePath = `videos/${userId}/${fileName}`;

      // Upload to storage using ArrayBuffer (like sawer-bel-akhdher)
      const { error: uploadError } = await supabase
        .storage
        .from('videos')
        .upload(filePath, arrayBuffer, {
          contentType: 'video/mp4',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Erreur upload: ${uploadError.message || 'Impossible de sauvegarder la vidéo.'}`);
      }

      // Get public URL
      const { data: urlData } = supabase
        .storage
        .from('videos')
        .getPublicUrl(filePath);

      const publicUrl = urlData?.publicUrl || null;

      // Insert into database
      const videoTitle = `Vidéo mobile ${new Date().toLocaleString('fr-FR')}`;
      const insertPayload = {
        title: videoTitle,
        description: 'Vidéo enregistrée depuis le mobile',
        file_path: filePath,
        storage_path: filePath,
        file_size: arrayBuffer.byteLength,
        duration: null,
        user_id: userId,
        status: 'uploaded',
        public_url: publicUrl,
        video_url: publicUrl,
        format: fileExt,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error: insertError } = await supabase
        .from('videos')
        .insert(insertPayload);

      if (insertError) {
        throw new Error(`Erreur base de données: ${insertError.message || 'Impossible de créer la vidéo.'}`);
      }

      return { success: true, filePath, publicUrl, title: videoTitle };
    },
    onSuccess: (data) => {
      setRecordedUri(null); // Clear recorded video after successful upload
      setShowSuccessModal(true); // Show success modal
      // Invalidate videos query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['videos', user?.id] });
    },
    onError: (error: Error) => {
      Alert.alert('Erreur', error.message || 'Erreur inconnue lors de la sauvegarde.');
    },
  });

  const handleUpload = () => {
    if (!recordedUri) {
      Alert.alert('Aucune vidéo', 'Enregistre une vidéo avant de la sauvegarder.');
      return;
    }
    uploadMutation.mutate(recordedUri);
  };


  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Enregistrement vidéo</Text>
      </View>

      <View style={styles.cameraWrapper}>
        {permissionsGranted ? (
          <>
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing="front"
              mode="video"
            />
            {!isRecording && <View style={styles.cameraOverlay} />}
            {isRecording && (
              <View style={styles.timerContainer}>
                <Text style={styles.timerText}>{formatTime(recordingTime)}</Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.cameraPlaceholder} />
        )}
      </View>

      <View style={styles.bottomPanel}>
        {isRecording ? (
          <Text style={styles.infoText}>Enregistrement en cours...</Text>
        ) : recordedUri ? (
          <Text style={styles.infoText}>Vidéo enregistrée, prête à être sauvegardée.</Text>
        ) : (
          <Text style={styles.infoText}>Appuie sur le bouton pour commencer l'enregistrement</Text>
        )}

        <View style={styles.buttonRow}>
          {!permissionsGranted ? (
            <TouchableOpacity
              style={styles.permissionButton}
              onPress={handleRequestPermissions}
            >
              <Text style={styles.permissionText}>Autoriser caméra + micro</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={[
                  styles.recordButton,
                  isRecording && styles.recordButtonActive,
                ]}
                onPress={handleRecordToggle}
              >
                <View style={[styles.recordInner, isRecording && styles.recordInnerActive]} />
              </TouchableOpacity>

              {recordedUri && (
                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    uploadMutation.isPending && styles.saveButtonDisabled,
                  ]}
                  onPress={handleUpload}
                  disabled={uploadMutation.isPending}
                >
                  <Text style={styles.saveButtonText}>
                    {uploadMutation.isPending ? 'Enregistrement...' : '💾 Sauvegarder'}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>

      <SuccessModal
        visible={showSuccessModal}
        title="Vidéo sauvegardée !"
        message="Ta vidéo a été enregistrée avec succès sur SpotBulle."
        onClose={() => setShowSuccessModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    color: '#f9fafb',
    fontSize: 22,
    fontWeight: '700',
  },
  cameraWrapper: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1f2937',
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  cameraPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  timerContainer: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  timerText: {
    color: '#ef4444',
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  bottomPanel: {
    marginTop: 16,
    gap: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  infoText: {
    color: '#9ca3af',
    fontSize: 13,
    textAlign: 'center',
  },
  recordButton: {
    width: 72,
    height: 72,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#f97373',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordButtonActive: {
    borderColor: '#bef264',
  },
  recordButtonDisabled: {
    opacity: 0.4,
  },
  recordInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ef4444',
  },
  recordInnerActive: {
    borderRadius: 8,
    width: 36,
    height: 36,
    backgroundColor: '#22c55e',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#020617',
  },
  centerText: {
    color: '#e5e7eb',
    textAlign: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  permissionButton: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#22c55e',
  },
  permissionText: {
    color: '#0b1120',
    fontWeight: '600',
  },
  saveButton: {
    marginLeft: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#22c55e',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#0b1120',
    fontWeight: '600',
    fontSize: 14,
  },
});
