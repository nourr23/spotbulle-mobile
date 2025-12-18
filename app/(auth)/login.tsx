import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useFormik } from 'formik';

import { useAuth } from '@/context/AuthContext';
import { SignInSchema } from '@/validation/signin-validation';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [loading, setLoading] = React.useState(false);

  const { values, errors, touched, handleChange, handleBlur, handleSubmit } = useFormik({
    initialValues: { email: '', password: '' },
    validationSchema: SignInSchema,
    onSubmit: async (formValues) => {
      try {
        setLoading(true);
        const { error } = await signIn(formValues.email, formValues.password);
        if (error) {
          console.log('[Mobile Login] Error during login:', error);
          Alert.alert('Erreur', error.message || 'Connexion échouée');
          return;
        }
        Alert.alert('Succès', 'Connexion réussie.');
        router.replace('/(tabs)');
      } catch (err: any) {
        console.log('[Mobile Login] Unexpected error:', err);
        Alert.alert('Erreur', err?.message || 'Erreur inconnue');
      } finally {
        setLoading(false);
      }
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connexion</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#999"
        autoCapitalize="none"
        keyboardType="email-address"
        value={values.email}
        onChangeText={handleChange('email')}
        onBlur={handleBlur('email')}
      />
      {touched.email && errors.email ? (
        <Text style={styles.error}>{errors.email}</Text>
      ) : null}

      <TextInput
        style={styles.input}
        placeholder="Mot de passe"
        placeholderTextColor="#999"
        secureTextEntry
        value={values.password}
        onChangeText={handleChange('password')}
        onBlur={handleBlur('password')}
      />
      {touched.password && errors.password ? (
        <Text style={styles.error}>{errors.password}</Text>
      ) : null}

      <TouchableOpacity style={styles.button} onPress={handleSubmit as any} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Se connecter</Text>
        )}
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Pas encore de compte ? </Text>
        <Link href="/(auth)/register" style={styles.footerLink}>
          Inscription
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#020617',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#e5e7eb',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#020617',
    borderColor: '#1f2937',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#e5e7eb',
    marginBottom: 12,
  },
  error: {
    color: '#f97373',
    fontSize: 12,
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#4f46e5',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#f9fafb',
    fontWeight: '600',
    fontSize: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  footerText: {
    color: '#9ca3af',
  },
  footerLink: {
    color: '#60a5fa',
    fontWeight: '600',
  },
});


