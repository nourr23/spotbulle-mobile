import { Stack } from 'expo-router';

export default function Layout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen 
        name="my-videos/index" 
        options={{ 
          title: 'Mes vidéos',
          headerStyle: { backgroundColor: '#020617' },
          headerTintColor: '#f9fafb',
        }} 
      />
      <Stack.Screen 
        name="my-videos/[id]" 
        options={{ 
          title: 'Détails vidéo',
          headerStyle: { backgroundColor: '#020617' },
          headerTintColor: '#f9fafb',
        }} 
      />
      <Stack.Screen 
        name="profile-info" 
        options={{ 
          title: 'Symbolique',
          headerStyle: { backgroundColor: '#020617' },
          headerTintColor: '#f9fafb',
        }} 
      />
    </Stack>
  );
}

