import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { DISC_ELEMENTS } from './DiscElements';

export interface LumiProfile {
  id: string;
  user_id: string;
  session_id: string;
  dominant_color: string | null;
  secondary_color: string | null;
  disc_scores: Record<string, number> | null;
  traits: {
    dominant?: {
      name: string;
      score: number;
      traits: string[];
      intensity: string;
      percentage: number;
      description: string;
      characteristics: string[];
    };
    secondary?: {
      name: string;
      score: number;
      traits: string[];
      intensity: string;
      percentage: number;
      description: string;
      characteristics: string[];
    };
    combined_description?: string;
    profile_type?: string;
    characteristics?: string[];
  } | null;
  computed_at: string;
}

interface ProfileDisplayProps {
  profile: LumiProfile;
}

export default function ProfileDisplay({ profile }: ProfileDisplayProps) {
  const dominantElement = profile.dominant_color
    ? DISC_ELEMENTS[profile.dominant_color]
    : null;
  const secondaryElement = profile.secondary_color
    ? DISC_ELEMENTS[profile.secondary_color]
    : null;

  const getColorStyle = (color: string) => {
    switch (color) {
      case 'rouge':
        return { bg: '#7f1d1d', border: '#dc2626', text: '#fca5a5' };
      case 'jaune':
        return { bg: '#78350f', border: '#eab308', text: '#fde047' };
      case 'vert':
        return { bg: '#14532d', border: '#22c55e', text: '#86efac' };
      case 'bleu':
        return { bg: '#1e3a8a', border: '#3b82f6', text: '#93c5fd' };
      default:
        return { bg: '#1e293b', border: '#475569', text: '#cbd5e1' };
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Combined Description */}
      {profile.traits?.combined_description && dominantElement && (
        <View style={styles.combinedDescriptionCard}>
          <View style={styles.elementHeader}>
            <Text style={styles.elementIcon}>{dominantElement.icon}</Text>
            <View style={styles.elementHeaderText}>
              <Text style={styles.elementTitle}>
                Ton Énergie Principale : {dominantElement.elementFr}
              </Text>
              <Text style={[styles.elementSubtitle, { color: getColorStyle(profile.dominant_color || '').text }]}>
                Esprit {dominantElement.animalEmoji} {dominantElement.animalFr}
              </Text>
            </View>
          </View>
          <Text style={styles.combinedDescription}>
            {profile.traits.combined_description}
          </Text>
        </View>
      )}

      {/* Dominant and Secondary Colors */}
      <View style={styles.colorsContainer}>
        {profile.dominant_color && dominantElement && (
          <View style={[styles.colorCard, { borderColor: getColorStyle(profile.dominant_color).border }]}>
            <View style={styles.colorHeader}>
              <Text style={styles.colorIcon}>{dominantElement.icon}</Text>
              <View>
                <Text style={styles.colorLabel}>Couleur Dominante</Text>
                <Text style={styles.colorValue}>
                  {profile.dominant_color.toUpperCase()}
                </Text>
              </View>
            </View>
            <View style={styles.elementInfo}>
              <Text style={[styles.elementInfoText, { color: getColorStyle(profile.dominant_color).text }]}>
                {dominantElement.icon} {dominantElement.elementFr} • {dominantElement.animalEmoji} {dominantElement.animalFr}
              </Text>
              <Text style={styles.elementDescription}>
                {dominantElement.descriptionFr}
              </Text>
            </View>
          </View>
        )}

        {profile.secondary_color && secondaryElement && (
          <View style={[styles.colorCard, { borderColor: getColorStyle(profile.secondary_color).border }]}>
            <View style={styles.colorHeader}>
              <Text style={styles.colorIcon}>{secondaryElement.icon}</Text>
              <View>
                <Text style={styles.colorLabel}>Couleur Secondaire</Text>
                <Text style={styles.colorValue}>
                  {profile.secondary_color.toUpperCase()}
                </Text>
              </View>
            </View>
            <View style={styles.elementInfo}>
              <Text style={[styles.elementInfoText, { color: getColorStyle(profile.secondary_color).text }]}>
                {secondaryElement.icon} {secondaryElement.elementFr} • {secondaryElement.animalEmoji} {secondaryElement.animalFr}
              </Text>
              <Text style={styles.elementDescription}>
                {secondaryElement.descriptionFr}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* DISC Scores */}
      {profile.disc_scores && (
        <View style={styles.scoresContainer}>
          <Text style={styles.sectionTitle}>Scores DISC</Text>
          <View style={styles.scoresGrid}>
            {Object.entries(profile.disc_scores).map(([color, score]) => (
              <View key={color} style={styles.scoreCard}>
                <Text style={styles.scoreLabel}>{color.toUpperCase()}</Text>
                <Text style={styles.scoreValue}>{score}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Dominant Profile */}
      {profile.traits?.dominant && dominantElement && (
        <View style={[styles.profileCard, { borderColor: getColorStyle(profile.dominant_color || '').border }]}>
          <View style={styles.profileHeader}>
            <View style={styles.profileHeaderLeft}>
              <Text style={styles.profileIcon}>{dominantElement.icon}</Text>
              <Text style={[styles.profileTitle, { color: getColorStyle(profile.dominant_color || '').text }]}>
                Profil Dominant • {dominantElement.elementFr}
              </Text>
            </View>
            <Text style={[styles.profileIntensity, { color: getColorStyle(profile.dominant_color || '').text }]}>
              {profile.traits.dominant.intensity} ({profile.traits.dominant.percentage}%)
            </Text>
          </View>
          <Text style={styles.profileName}>{profile.traits.dominant.name}</Text>
          <Text style={[styles.profileAnimal, { color: getColorStyle(profile.dominant_color || '').text }]}>
            {dominantElement.animalEmoji} Esprit {dominantElement.animalFr}
          </Text>
          <Text style={styles.profileDescription}>
            {profile.traits.dominant.description}
          </Text>

          {/* Traits */}
          {profile.traits.dominant.traits && profile.traits.dominant.traits.length > 0 && (
            <View style={styles.traitsContainer}>
              {profile.traits.dominant.traits.map((trait, idx) => (
                <View
                  key={idx}
                  style={[styles.traitBadge, { borderColor: getColorStyle(profile.dominant_color || '').border }]}
                >
                  <Text style={[styles.traitText, { color: getColorStyle(profile.dominant_color || '').text }]}>
                    {trait}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Characteristics */}
          {profile.traits.dominant.characteristics && profile.traits.dominant.characteristics.length > 0 && (
            <View style={styles.characteristicsContainer}>
              <Text style={styles.characteristicsTitle}>Caractéristiques :</Text>
              {profile.traits.dominant.characteristics.map((char, idx) => (
                <View key={idx} style={styles.characteristicItem}>
                  <Text style={[styles.characteristicBullet, { color: getColorStyle(profile.dominant_color || '').text }]}>
                    •
                  </Text>
                  <Text style={styles.characteristicText}>{char}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Secondary Profile */}
      {profile.traits?.secondary && secondaryElement && (
        <View style={[styles.profileCard, { borderColor: getColorStyle(profile.secondary_color || '').border }]}>
          <View style={styles.profileHeader}>
            <View style={styles.profileHeaderLeft}>
              <Text style={styles.profileIcon}>{secondaryElement.icon}</Text>
              <Text style={[styles.profileTitle, { color: getColorStyle(profile.secondary_color || '').text }]}>
                Profil Secondaire • {secondaryElement.elementFr}
              </Text>
            </View>
            <Text style={[styles.profileIntensity, { color: getColorStyle(profile.secondary_color || '').text }]}>
              {profile.traits.secondary.intensity} ({profile.traits.secondary.percentage}%)
            </Text>
          </View>
          <Text style={styles.profileName}>{profile.traits.secondary.name}</Text>
          <Text style={[styles.profileAnimal, { color: getColorStyle(profile.secondary_color || '').text }]}>
            {secondaryElement.animalEmoji} Esprit {secondaryElement.animalFr}
          </Text>
          <Text style={styles.profileDescription}>
            {profile.traits.secondary.description}
          </Text>

          {/* Traits */}
          {profile.traits.secondary.traits && profile.traits.secondary.traits.length > 0 && (
            <View style={styles.traitsContainer}>
              {profile.traits.secondary.traits.map((trait, idx) => (
                <View
                  key={idx}
                  style={[styles.traitBadge, { borderColor: getColorStyle(profile.secondary_color || '').border }]}
                >
                  <Text style={[styles.traitText, { color: getColorStyle(profile.secondary_color || '').text }]}>
                    {trait}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Characteristics */}
          {profile.traits.secondary.characteristics && profile.traits.secondary.characteristics.length > 0 && (
            <View style={styles.characteristicsContainer}>
              <Text style={styles.characteristicsTitle}>Caractéristiques :</Text>
              {profile.traits.secondary.characteristics.map((char, idx) => (
                <View key={idx} style={styles.characteristicItem}>
                  <Text style={[styles.characteristicBullet, { color: getColorStyle(profile.secondary_color || '').text }]}>
                    •
                  </Text>
                  <Text style={styles.characteristicText}>{char}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* All Characteristics */}
      {profile.traits?.characteristics && profile.traits.characteristics.length > 0 && (
        <View style={styles.allCharacteristicsContainer}>
          <Text style={styles.sectionTitle}>Vos caractéristiques principales</Text>
          {profile.traits.characteristics.map((char, idx) => (
            <View key={idx} style={styles.characteristicItem}>
              <Text style={styles.characteristicCheck}>✓</Text>
              <Text style={styles.characteristicText}>{char}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Profile Type */}
      {profile.traits?.profile_type && (
        <View style={styles.profileTypeContainer}>
          <Text style={styles.profileTypeLabel}>Type de profil</Text>
          <Text style={styles.profileTypeValue}>{profile.traits.profile_type}</Text>
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
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 40,
  },
  combinedDescriptionCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#334155',
  },
  elementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  elementIcon: {
    fontSize: 32,
  },
  elementHeaderText: {
    flex: 1,
  },
  elementTitle: {
    color: '#f9fafb',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  elementSubtitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  combinedDescription: {
    color: '#e2e8f0',
    fontSize: 16,
    lineHeight: 24,
  },
  colorsContainer: {
    gap: 16,
    marginBottom: 24,
  },
  colorCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
  },
  colorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  colorIcon: {
    fontSize: 28,
  },
  colorLabel: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 4,
  },
  colorValue: {
    color: '#f9fafb',
    fontSize: 20,
    fontWeight: '700',
  },
  elementInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  elementInfoText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  elementDescription: {
    color: '#cbd5e1',
    fontSize: 12,
    lineHeight: 18,
  },
  scoresContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#f9fafb',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  scoresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  scoreCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  scoreLabel: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  scoreValue: {
    color: '#f9fafb',
    fontSize: 32,
    fontWeight: '700',
  },
  profileCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  profileIcon: {
    fontSize: 20,
  },
  profileTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  profileIntensity: {
    fontSize: 12,
  },
  profileName: {
    color: '#f9fafb',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  profileAnimal: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
  },
  profileDescription: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  traitsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  traitBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  traitText: {
    fontSize: 12,
    fontWeight: '600',
  },
  characteristicsContainer: {
    marginTop: 12,
  },
  characteristicsTitle: {
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 8,
  },
  characteristicItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  characteristicBullet: {
    fontSize: 16,
    marginTop: 2,
  },
  characteristicText: {
    color: '#cbd5e1',
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
  characteristicCheck: {
    color: '#6366f1',
    fontSize: 14,
    marginTop: 2,
  },
  allCharacteristicsContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  profileTypeContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profileTypeLabel: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 8,
  },
  profileTypeValue: {
    color: '#f9fafb',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
});

