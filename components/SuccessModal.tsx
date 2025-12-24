import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface SuccessModalProps {
  visible: boolean;
  title: string;
  message?: string;
  onClose: () => void;
}

export default function SuccessModal({ visible, title, message, onClose }: SuccessModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.iconContainer}>
            <Text style={styles.checkmark}>✓</Text>
          </View>
          <Text style={styles.title}>{title}</Text>
          {message && <Text style={styles.message}>{message}</Text>}
          <TouchableOpacity style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>Parfait</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#1f2937',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    minWidth: 280,
    maxWidth: 320,
    borderWidth: 1,
    borderColor: '#374151',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  checkmark: {
    fontSize: 48,
    color: '#ffffff',
    fontWeight: '700',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f9fafb',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 999,
    minWidth: 120,
  },
  buttonText: {
    color: '#0b1120',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
});

