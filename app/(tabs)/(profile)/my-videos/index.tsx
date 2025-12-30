import React from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { listVideos } from '@/services/api/videos/list';
import type { Video } from '@/services/api/videos/list';

export default function MyVideosScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const {
    data: videos = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['videos', user?.id],
    enabled: !!user,
    queryFn: () => listVideos({ userId: user!.id }),
  });

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.centerText}>Connecte-toi pour voir tes vidéos.</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#22c55e" />
        <Text style={[styles.centerText, { marginTop: 16 }]}>
          Chargement de tes vidéos...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Erreur: {(error as Error).message}</Text>
      </View>
    );
  }

  if (!videos.length) {
    return (
      <View style={styles.center}>
        <Text style={styles.centerText}>Aucune vidéo trouvée pour l'instant.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={videos}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.item}
            onPress={() => router.push(`/(tabs)/(profile)/my-videos/${item.id}`)}
          >
            <Text style={styles.itemTitle}>{item.title || 'Vidéo sans titre'}</Text>
            <Text style={styles.itemMeta}>
              {new Date(item.created_at).toLocaleString('fr-FR')} — {item.status || 'inconnue'}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  listContent: {
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
  item: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1f2937',
    backgroundColor: '#111827',
    borderRadius: 8,
    marginBottom: 8,
  },
  itemTitle: {
    color: '#e5e7eb',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemMeta: {
    color: '#6b7280',
    fontSize: 12,
  },
});

