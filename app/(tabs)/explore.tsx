import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/services/supabaseClient';

type Video = {
  id: string;
  title: string | null;
  created_at: string;
  status: string | null;
};

export default function VideosTabScreen() {
  const { user } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        if (!user) {
          setError('Non connecté');
          setLoading(false);
          return;
        }

        const { data, error: dbError } = await supabase
          .from('videos')
          .select('id, title, created_at, status')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (dbError) {
          console.log('[Mobile] Error loading videos', dbError);
          setError(dbError.message);
          return;
        }

        setVideos((data || []) as Video[]);
      } catch (e: any) {
        console.log('[Mobile] Unexpected videos load error', e);
        setError(e?.message || 'Erreur inconnue');
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, [user]);

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.centerText}>Connecte-toi pour voir tes vidéos.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#22c55e" />
        <Text style={[styles.centerText, { marginTop: 8 }]}>
          Chargement de tes vidéos...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.centerText}>Erreur: {error}</Text>
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
      <Text style={styles.title}>Mes vidéos (test)</Text>
      <FlatList
        data={videos}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingVertical: 8 }}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.itemTitle}>{item.title || 'Vidéo sans titre'}</Text>
            <Text style={styles.itemMeta}>
              {new Date(item.created_at).toLocaleString('fr-FR')} — {item.status || 'inconnue'}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
    paddingTop: 40,
    paddingHorizontal: 16,
  },
  title: {
    color: '#f9fafb',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
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
  item: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1f2937',
  },
  itemTitle: {
    color: '#e5e7eb',
    fontSize: 15,
    fontWeight: '600',
  },
  itemMeta: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 2,
  },
});
