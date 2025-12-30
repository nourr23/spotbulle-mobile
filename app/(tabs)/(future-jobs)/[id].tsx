import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { listJobConversations, JobConversation } from '@/services/api/jobs/listConversations';
import { sendJobMessage } from '@/services/api/jobs/sendMessage';
import { resetJobConversation } from '@/services/api/jobs/resetConversation';
import { deleteJobConversation } from '@/services/api/jobs/deleteConversation';

export default function JobConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const scrollViewRef = useRef<ScrollView>(null);

  const [messageInput, setMessageInput] = useState('');

  // Fetch conversation
  const { data: conversations = [] } = useQuery({
    queryKey: ['jobConversations', user?.id],
    enabled: !!user,
    queryFn: () => listJobConversations({ userId: user!.id }),
  });

  const conversation = conversations.find((c) => c.id === id);

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!id || !user) throw new Error('Données manquantes');
      const result = await sendJobMessage({
        conversationId: id,
        message,
      });
      if (!result.success || !result.conversation) {
        throw new Error(result.error || 'Erreur lors de l\'envoi du message');
      }
      return result.conversation;
    },
    onSuccess: () => {
      setMessageInput('');
      queryClient.invalidateQueries({ queryKey: ['jobConversations', user?.id] });
      // Scroll to bottom after a short delay
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    },
    onError: (error: Error) => {
      Alert.alert('Erreur', error.message);
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      if (!id || !user) throw new Error('Données manquantes');
      const result = await resetJobConversation({ conversationId: id });
      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de la réinitialisation');
      }
      return result.conversation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobConversations', user?.id] });
      Alert.alert('Succès', 'Conversation réinitialisée');
    },
    onError: (error: Error) => {
      Alert.alert('Erreur', error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!id || !user) throw new Error('Données manquantes');
      const result = await deleteJobConversation({ conversationId: id });
      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de la suppression');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobConversations', user?.id] });
      router.back();
    },
    onError: (error: Error) => {
      Alert.alert('Erreur', error.message);
    },
  });

  const handleSend = () => {
    if (!messageInput.trim() || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate(messageInput.trim());
  };

  const handleReset = () => {
    Alert.alert(
      'Réinitialiser',
      'Es-tu sûr de vouloir réinitialiser cette conversation ? Tous les messages seront supprimés.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Réinitialiser',
          style: 'destructive',
          onPress: () => resetMutation.mutate(),
        },
      ]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      'Supprimer',
      'Es-tu sûr de vouloir supprimer ce métier ? Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(),
        },
      ]
    );
  };

  useEffect(() => {
    // Scroll to bottom when messages change
    if (conversation?.messages && conversation.messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [conversation?.messages]);

  if (!conversation) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22c55e" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </View>
    );
  }

  const messages = Array.isArray(conversation.messages) ? conversation.messages : [];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Retour</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.jobTitle} numberOfLines={1}>
            {conversation.job_title}
          </Text>
          {conversation.sectors && conversation.sectors.length > 0 && (
            <View style={styles.sectorsRow}>
              {conversation.sectors.slice(0, 3).map((sector, idx) => (
                <View key={idx} style={styles.sectorTag}>
                  <Text style={styles.sectorText}>{sector}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleReset} style={styles.actionButton}>
            <Text style={styles.actionButtonText}>↺</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={[styles.actionButton, styles.deleteButton]}>
            <Text style={[styles.actionButtonText, styles.deleteButtonText]}>🗑</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
      >
        {/* Reason */}
        {conversation.reason && (
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Pourquoi Spot Coach t'a proposé ce métier</Text>
            <Text style={styles.infoText}>{conversation.reason}</Text>
          </View>
        )}

        {/* User description */}
        {conversation.user_description && (
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Ce que tu as partagé</Text>
            <Text style={styles.infoText}>{conversation.user_description}</Text>
          </View>
        )}

        {/* Messages */}
        {messages.length > 0 ? (
          <View style={styles.messagesList}>
            {messages.map((msg, idx) => (
              <View
                key={idx}
                style={[
                  styles.messageBubble,
                  msg.role === 'user' ? styles.userMessage : styles.assistantMessage,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    msg.role === 'user' ? styles.userMessageText : styles.assistantMessageText,
                  ]}
                >
                  {msg.content}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              Commence la conversation en posant une question à Spot Coach sur ce métier !
            </Text>
          </View>
        )}

        {/* Loading indicator */}
        {sendMessageMutation.isPending && (
          <View style={styles.loadingBubble}>
            <ActivityIndicator size="small" color="#9ca3af" />
            <Text style={styles.loadingText}>Spot Coach réfléchit...</Text>
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={messageInput}
          onChangeText={setMessageInput}
          placeholder="Pose une question..."
          placeholderTextColor="#9ca3af"
          multiline
          maxLength={500}
          editable={!sendMessageMutation.isPending}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!messageInput.trim() || sendMessageMutation.isPending) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!messageInput.trim() || sendMessageMutation.isPending}
        >
          {sendMessageMutation.isPending ? (
            <ActivityIndicator size="small" color="#0b1120" />
          ) : (
            <Text style={styles.sendButtonText}>Envoyer</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9ca3af',
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  backButtonText: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: '600',
  },
  headerContent: {
    flex: 1,
  },
  jobTitle: {
    color: '#f9fafb',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectorsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  sectorTag: {
    backgroundColor: '#22c55e20',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  sectorText: {
    color: '#22c55e',
    fontSize: 10,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#7f1d1d',
  },
  actionButtonText: {
    color: '#f9fafb',
    fontSize: 14,
  },
  deleteButtonText: {
    color: '#ef4444',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingTop: 40,
    paddingBottom: 8,
  },
  infoBox: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  infoTitle: {
    color: '#22c55e',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  infoText: {
    color: '#f9fafb',
    fontSize: 13,
    lineHeight: 18,
  },
  messagesList: {
    gap: 12,
  },
  messageBubble: {
    borderRadius: 16,
    padding: 12,
    maxWidth: '80%',
  },
  userMessage: {
    backgroundColor: '#22c55e',
    alignSelf: 'flex-end',
  },
  assistantMessage: {
    backgroundColor: '#1e293b',
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#0b1120',
  },
  assistantMessageText: {
    color: '#f9fafb',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#9ca3af',
    fontSize: 14,
    textAlign: 'center',
  },
  loadingBubble: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 12,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    gap: 12,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    color: '#f9fafb',
    fontSize: 14,
    minHeight: 48,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#475569',
  },
  sendButton: {
    backgroundColor: '#22c55e',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#0b1120',
    fontSize: 14,
    fontWeight: '600',
  },
});

