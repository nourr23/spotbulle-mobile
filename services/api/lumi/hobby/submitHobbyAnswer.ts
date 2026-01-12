import { invokeEdgeFunction } from '@/services/api/edge-functions';

export interface SubmitHobbyAnswerParams {
  session_id: string;
  question_id: string;
  answer_value?: string | number | null;
  answer_json?: any;
}

export interface SubmitHobbyAnswerResponse {
  success: boolean;
  next_question?: any;
  is_complete?: boolean;
  error?: string;
}

export async function submitHobbyAnswer(
  params: SubmitHobbyAnswerParams
): Promise<SubmitHobbyAnswerResponse> {
  const { session_id, question_id, answer_value, answer_json } = params;

  const result = await invokeEdgeFunction<{
    success: boolean;
    next_question?: any;
    is_complete?: boolean;
    error?: string;
  }>('lumi-hobby-submit-answer', {
    session_id,
    question_id,
    answer_value,
    answer_json,
  }, {
    maxRetries: 3,
    timeout: 30000,
    useHttpsFallback: true,
  });

  if (!result.success) {
    return {
      success: false,
      error: result.error?.message || 'Failed to submit hobby answer',
    };
  }

  const data = result.data;
  if (data?.success) {
    return {
      success: true,
      next_question: data.next_question,
      is_complete: data.is_complete,
    };
  }

  return {
    success: false,
    error: data?.error || 'Unknown error',
  };
}

