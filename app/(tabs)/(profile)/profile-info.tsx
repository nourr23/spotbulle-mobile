import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { getSymbolicProfile, type SymbolicProfile } from '@/services/api/profile/getSymbolic';
import { deleteSymbolicProfile } from '@/services/api/profile/deleteSymbolic';

export default function ProfileInfoScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: profile,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['symbolic-profile', user?.id],
    enabled: !!user,
    queryFn: () => getSymbolicProfile({ userId: user!.id }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!user) {
        throw new Error('Utilisateur non connecté');
      }
      return deleteSymbolicProfile({ userId: user.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['symbolic-profile', user?.id] });
      Alert.alert('Succès', 'Profil symbolique supprimé avec succès');
    },
    onError: (error: Error) => {
      Alert.alert('Erreur', error.message || 'Erreur lors de la suppression');
    },
  });

  const handleDelete = () => {
    Alert.alert(
      'Supprimer le profil symbolique',
      'Êtes-vous sûr de vouloir supprimer votre profil symbolique ? Cette action est irréversible.',
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(),
        },
      ]
    );
  };

  // Parse profile_text into sections
  const narrativeSections = useMemo(() => {
    const text = profile?.profile_text;
    if (!text) return [];

    const lines = text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const sections: Array<{ title: string; rows: string[] }> = [];
    let current: { title: string; rows: string[] } | null = null;

    const isTitle = (line: string) =>
      line.includes('—') || /^points forts$/i.test(line) || /^conclusion$/i.test(line);

    lines.forEach((line) => {
      if (isTitle(line)) {
        current = { title: line, rows: [] };
        sections.push(current);
      } else if (current) {
        current.rows.push(line);
      }
    });

    return sections;
  }, [profile?.profile_text]);

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.centerText}>Connecte-toi pour voir ton profil symbolique.</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#22c55e" />
        <Text style={[styles.centerText, { marginTop: 16 }]}>
          Chargement de ton profil symbolique...
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

  if (!profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.centerText}>
          Aucun profil symbolique disponible pour le moment.
        </Text>
        <Text style={[styles.centerText, { marginTop: 8, fontSize: 12 }]}>
          Génère ton profil symbolique depuis l'application web.
        </Text>
      </View>
    );
  }

  // Parse passions
  const passions = Array.isArray(profile.passions)
    ? profile.passions
    : typeof profile.passions === 'string'
      ? (() => {
          try {
            const parsed = JSON.parse(profile.passions);
            return Array.isArray(parsed) ? parsed : [profile.passions];
          } catch {
            return [profile.passions];
          }
        })()
      : [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Profil Symbolique</Text>
        {profile.name && (
          <Text style={styles.subtitle}>{profile.name}</Text>
        )}
      </View>

      {/* Key Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informations clés</Text>
        <View style={styles.infoContainer}>
          {profile.phrase_synchronie && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Phrase Synchronie</Text>
              <Text style={styles.infoValue}>{profile.phrase_synchronie}</Text>
            </View>
          )}
          {profile.archetype && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Archétype</Text>
              <Text style={styles.infoValue}>{profile.archetype}</Text>
            </View>
          )}
          {profile.element && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Élément</Text>
              <Text style={styles.infoValue}>{profile.element}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Astrological Signs */}
      {(profile.signe_soleil || profile.signe_lune || profile.signe_ascendant) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Signes</Text>
          <View style={styles.infoContainer}>
            {profile.signe_soleil && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Signe Soleil</Text>
                <Text style={styles.infoValue}>{profile.signe_soleil}</Text>
              </View>
            )}
            {profile.signe_lune && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Signe Lune</Text>
                <Text style={styles.infoValue}>{profile.signe_lune}</Text>
              </View>
            )}
            {profile.signe_ascendant && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Ascendant</Text>
                <Text style={styles.infoValue}>{profile.signe_ascendant}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Passions */}
      {passions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Passions</Text>
          <View style={styles.passionsContainer}>
            {passions.map((passion, index) => (
              <View key={index} style={styles.passionTag}>
                <Text style={styles.passionText}>{passion}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Profile Text / Narrative */}
      {narrativeSections.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profil détaillé</Text>
          <View style={styles.narrativeContainer}>
            {narrativeSections.map((section, index) => (
              <View key={index} style={styles.narrativeSection}>
                <Text style={styles.narrativeTitle}>{section.title}</Text>
                {section.rows.map((row, rowIndex) => (
                  <Text key={rowIndex} style={styles.narrativeText}>
                    {row}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Delete Button */}
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={handleDelete}
        disabled={deleteMutation.isPending}
      >
        {deleteMutation.isPending ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.deleteButtonText}>🗑️ Supprimer le profil symbolique</Text>
        )}
      </TouchableOpacity>
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
  subtitle: {
    color: '#9ca3af',
    fontSize: 14,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 14,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#f9fafb',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  infoContainer: {
    gap: 12,
  },
  infoItem: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  infoLabel: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    color: '#f9fafb',
    fontSize: 16,
    fontWeight: '500',
  },
  passionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  passionTag: {
    backgroundColor: '#1f2937',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  passionText: {
    color: '#e5e7eb',
    fontSize: 14,
  },
  narrativeContainer: {
    gap: 16,
  },
  narrativeSection: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  narrativeTitle: {
    color: '#22c55e',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  narrativeText: {
    color: '#d1d5db',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

