import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export interface Question {
  id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'open_text' | 'scale';
  options?: {
    options?: Record<string, string>;
    min?: number;
    max?: number;
  };
  order_index: number;
}

interface QuestionCardProps {
  question: Question;
  selectedAnswers: string[]; // For multiple choice
  answerValue?: string | number; // For open_text or scale
  onAnswerChange: (answers: string[]) => void; // For multiple choice
  onValueChange?: (value: string | number) => void; // For open_text or scale
}

export default function QuestionCard({
  question,
  selectedAnswers,
  answerValue,
  onAnswerChange,
  onValueChange,
}: QuestionCardProps) {
  const handleToggleAnswer = (optionKey: string) => {
    if (selectedAnswers.includes(optionKey)) {
      // Remove from selection
      onAnswerChange(selectedAnswers.filter((a) => a !== optionKey));
    } else {
      // Add to selection
      onAnswerChange([...selectedAnswers, optionKey]);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.questionNumber}>
          Question {question.order_index}
        </Text>
        <Text style={styles.questionText}>{question.question_text}</Text>
      </View>

      <View style={styles.optionsContainer}>
        {question.question_type === 'multiple_choice' &&
          question.options?.options &&
          Object.entries(question.options.options).map(([key, value]) => {
            const isSelected = selectedAnswers.includes(key);
            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.optionButton,
                  isSelected && styles.optionButtonSelected,
                ]}
                onPress={() => handleToggleAnswer(key)}
              >
                <View style={styles.optionContent}>
                  <View
                    style={[
                      styles.checkbox,
                      isSelected && styles.checkboxSelected,
                    ]}
                  >
                    {isSelected && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.optionText,
                      isSelected && styles.optionTextSelected,
                    ]}
                  >
                    {value}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}

        {question.question_type === 'open_text' && (
          <View style={styles.textInputContainer}>
            <Text style={styles.inputLabel}>Votre réponse :</Text>
            <View style={styles.textInputWrapper}>
              <Text style={styles.textInput}>
                {answerValue || 'Tapez votre réponse...'}
              </Text>
            </View>
            <Text style={styles.inputHint}>
              Note: Les réponses texte ne sont pas encore implémentées
            </Text>
          </View>
        )}

        {question.question_type === 'scale' && (
          <View style={styles.scaleContainer}>
            <Text style={styles.inputLabel}>
              Entre {question.options?.min || 0} et{' '}
              {question.options?.max || 100}
            </Text>
            <View style={styles.textInputWrapper}>
              <Text style={styles.textInput}>
                {answerValue || 'Entrez un nombre...'}
              </Text>
            </View>
            <Text style={styles.inputHint}>
              Note: Les réponses numériques ne sont pas encore implémentées
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 24,
  },
  header: {
    marginBottom: 20,
  },
  questionNumber: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  questionText: {
    color: '#f9fafb',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 28,
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    backgroundColor: '#1e293b',
    borderWidth: 2,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 16,
  },
  optionButtonSelected: {
    backgroundColor: '#1e293b',
    borderColor: '#22c55e',
    borderWidth: 2,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#475569',
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  checkmark: {
    color: '#0b1120',
    fontSize: 16,
    fontWeight: '700',
  },
  optionText: {
    color: '#cbd5e1',
    fontSize: 16,
    flex: 1,
    lineHeight: 22,
  },
  optionTextSelected: {
    color: '#f9fafb',
    fontWeight: '600',
  },
  textInputContainer: {
    gap: 8,
  },
  scaleContainer: {
    gap: 8,
  },
  inputLabel: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 8,
  },
  textInputWrapper: {
    backgroundColor: '#1e293b',
    borderWidth: 2,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 16,
    minHeight: 50,
  },
  textInput: {
    color: '#9ca3af',
    fontSize: 16,
  },
  inputHint: {
    color: '#64748b',
    fontSize: 12,
    fontStyle: 'italic',
  },
});

