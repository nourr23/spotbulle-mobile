import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/context/AuthContext';

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const userName = user?.user_metadata?.full_name || 
                   user?.user_metadata?.name || 
                   user?.email?.split('@')[0] || 
                   'Utilisateur';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profil</Text>
        <Text style={styles.userName}>{userName}</Text>
        <Text style={styles.message}>
          Gérez votre compte et vos vidéos.
        </Text>
      </View>
      
      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push('/(tabs)/(profile)/my-videos')}
        >
          <IconSymbol name="play.rectangle.fill" size={24} color="#0b1120" />
          <Text style={styles.buttonText}>Mes vidéos</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push('/(tabs)/(profile)/profile-info')}
        >
          <IconSymbol name="person.fill" size={24} color="#0b1120" />
          <Text style={styles.buttonText}>Symbolique</Text>
        </TouchableOpacity>
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
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    color: '#f9fafb',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  userName: {
    color: '#22c55e',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  message: {
    color: '#9ca3af',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  buttonsContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    width: '100%',
  },
  buttonText: {
    color: '#0b1120',
    fontSize: 16,
    fontWeight: '600',
  },
});

