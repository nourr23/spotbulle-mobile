import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { decode } from 'base64-arraybuffer';

import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/services/supabaseClient';

export default function HomeScreen() {
  const router = useRouter();
  const { signOut, user } = useAuth();
  const queryClient = useQueryClient();

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(null);
  const cameraRef = useRef<CameraView | null>(null);

  const handleLogout = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  const permissionsGranted =
    cameraPermission?.granted && micPermission?.granted;

  // Log permissions whenever they change (and on initial render)
  useEffect(() => {
    console.log('[Mobile] Permissions state on render/update:', {
      camera: cameraPermission,
      mic: micPermission,
      permissionsGranted,
    });
  }, [cameraPermission, micPermission, permissionsGranted]);

  const handleRecordToggle = async () => {
    console.log('[Mobile] Record button pressed', {
      permissionsGranted,
      isRecording,
      hasCameraRef: !!cameraRef.current,
    });

    try {
      // If no permissions yet, ask first, then user presses again to start
      if (!permissionsGranted) {
        await handleRequestPermissions();
        return;
      }

      if (!cameraRef.current) {
        console.warn('[Mobile] Camera ref is null, cannot record');
        return;
      }

      if (isRecording) {
        console.log('[Mobile] Stopping recording');
        cameraRef.current.stopRecording();
        setIsRecording(false);
        return;
      }

      console.log('[Mobile] Starting recording');
      setRecordedUri(null);
      setUploadedFilePath(null); // Clear previous upload when starting new recording
      setIsRecording(true);

      const video = await cameraRef.current.recordAsync({
        maxDuration: 60,
        quality: '720p',
      });
      console.log('[Mobile] Recording finished', video);
      setRecordedUri(video?.uri ?? null);
      setIsRecording(false);
    } catch (e) {
      console.warn('Recording error', e);
      setIsRecording(false);
    }
  };

  const handleRequestPermissions = async () => {
    try {
      console.log('[Mobile] Requesting permissions...', {
        cameraBefore: cameraPermission,
        micBefore: micPermission,
      });
      await requestCameraPermission();
      await requestMicPermission();
      console.log('[Mobile] Permissions after request', {
        cameraAfter: cameraPermission,
        micAfter: micPermission,
      });
    } catch (e) {
      console.warn('Permission error', e);
    }
  };

  const uploadMutation = useMutation({
    mutationFn: async (videoUri: string) => {
      if (!user) {
        throw new Error('Authentification requise');
      }

      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session?.user) {
        console.log('[Mobile] Upload: user/session error', error);
        throw new Error('Session non valide, veuillez vous reconnecter');
      }

      const userId = session.user.id;
      console.log('[Mobile] Upload: user id', userId);

      // Convert local URI to ArrayBuffer (like sawer-bel-akhdher does)
      console.log('[Mobile] Reading video file as base64...');
      const base64 = await FileSystem.readAsStringAsync(videoUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const arrayBuffer = decode(base64);

      const fileExt = 'mp4';
      const fileName = `mobile-${Date.now()}.${fileExt}`;
      const filePath = `videos/${userId}/${fileName}`;

      console.log('[Mobile] Upload: starting upload to', filePath, 'size', arrayBuffer.byteLength);

      // Upload to storage using ArrayBuffer (like sawer-bel-akhdher)
      const { error: uploadError } = await supabase
        .storage
        .from('videos')
        .upload(filePath, arrayBuffer, {
          contentType: 'video/mp4',
          upsert: false,
        });

      if (uploadError) {
        console.log('[Mobile] Upload error (full)', JSON.stringify(uploadError, null, 2));
        throw new Error(`Erreur upload: ${uploadError.message || 'Impossible de sauvegarder la vidéo.'}`);
      }

      // Get public URL
      const { data: urlData } = supabase
        .storage
        .from('videos')
        .getPublicUrl(filePath);

      const publicUrl = urlData?.publicUrl || null;
      console.log('[Mobile] Upload: public URL', publicUrl);

      // Insert into database
      const insertPayload = {
        title: `Vidéo mobile ${new Date().toLocaleString('fr-FR')}`,
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
        console.log('[Mobile] Insert error', insertError);
        throw new Error(`Erreur base de données: ${insertError.message || 'Impossible de créer la vidéo.'}`);
      }

      return { success: true, filePath, publicUrl };
    },
    onSuccess: (data) => {
      Alert.alert('Succès', 'Vidéo sauvegardée sur SpotBulle.');
      setRecordedUri(null); // Clear recorded video after successful upload
      setUploadedFilePath(data.filePath); // Store file path for download
      // Invalidate videos query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['videos', user?.id] });
    },
    onError: (error: Error) => {
      console.log('[Mobile] Upload mutation error', error);
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

  const handleDownload = async () => {
    try {
      if (!uploadedFilePath) {
        Alert.alert('Test téléchargement', 'Aucun fichier à télécharger.');
        return;
      }

      console.log('[Mobile] Test download for file_path:', uploadedFilePath);

      const { data, error } = await supabase
        .storage
        .from('videos')
        .download(uploadedFilePath);

      if (error) {
        console.log('[Mobile] Test download error (full)', JSON.stringify(error, null, 2));
        Alert.alert(
          'Erreur téléchargement',
          error.message || 'Impossible de télécharger la vidéo.'
        );
        return;
      }

      if (!data) {
        Alert.alert('Erreur téléchargement', 'Aucune donnée reçue.');
        return;
      }

      console.log('[Mobile] Test download success, size:', data.size);
      Alert.alert('Succès', `Téléchargement OK (taille: ${data.size} octets).`);
    } catch (e: any) {
      console.log('[Mobile] Unexpected download test error', e);
      Alert.alert('Erreur', e?.message || 'Erreur inconnue lors du téléchargement.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Enregistrement vidéo</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Déconnexion</Text>
        </TouchableOpacity>
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
          </>
        ) : (
          <View style={styles.cameraPlaceholder} />
        )}
      </View>

      <View style={styles.bottomPanel}>
        {recordedUri ? (
          <Text style={styles.infoText}>Vidéo enregistrée (locale) : {recordedUri}</Text>
        ) : (
          <Text style={styles.infoText}>Aucune vidéo enregistrée pour le moment.</Text>
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

              {uploadedFilePath && !recordedUri && (
                <TouchableOpacity
                  style={styles.downloadButton}
                  onPress={handleDownload}
                >
                  <Text style={styles.downloadButtonText}>⬇️ Télécharger</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
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
  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#f97373',
  },
  logoutText: {
    color: '#fecaca',
    fontSize: 12,
    fontWeight: '600',
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
  downloadButton: {
    marginLeft: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#22c55e',
    backgroundColor: 'transparent',
  },
  downloadButtonText: {
    color: '#22c55e',
    fontWeight: '600',
    fontSize: 14,
  },
});
