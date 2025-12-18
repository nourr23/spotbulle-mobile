import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useAuth } from '@/context/AuthContext';

export default function HomeScreen() {
  const router = useRouter();
  const { signOut } = useAuth();

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
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
            <TouchableOpacity
              style={[
                styles.recordButton,
                isRecording && styles.recordButtonActive,
              ]}
              onPress={handleRecordToggle}
            >
              <View style={[styles.recordInner, isRecording && styles.recordInnerActive]} />
            </TouchableOpacity>
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
});
