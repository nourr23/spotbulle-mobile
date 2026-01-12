import { invokeEdgeFunction } from '@/services/api/edge-functions';

export interface SubmitAnswerParams {
  session_id: string;
  question_id: string;
  answer_value?: string | number | null;
  answer_json?: any; // For multiple choice answers
}

export interface SubmitAnswerResponse {
  success: boolean;
  next_question?: any;
  session_status?: string;
  session_complete?: boolean;
  error?: string;
}

export async function submitAnswer(
  params: SubmitAnswerParams
): Promise<SubmitAnswerResponse> {
  const { session_id, question_id, answer_value, answer_json } = params;

  const result = await invokeEdgeFunction<{
    success: boolean;
    next_question?: any;
    session_status?: string;
    error?: string;
  }>('lumi-submit-answer', {
    session_id,
    question_id,
    answer_value,
    answer_json,
  });

  if (!result.success) {
    return {
      success: false,
      error: result.error?.message || 'Failed to submit answer',
    };
  }

  const data = result.data;
  if (data?.success) {
    return {
      success: true,
      next_question: data.next_question,
      session_status: data.session_status,
      session_complete: !data.next_question,
    };
  }

  return {
    success: false,
    error: data?.error || 'Unknown error',
  };
}

