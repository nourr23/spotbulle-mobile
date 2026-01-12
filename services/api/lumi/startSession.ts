import { invokeEdgeFunction } from '@/services/api/edge-functions';

export interface StartSessionParams {
  type?: 'onboarding' | 'orientation' | 'premium';
  ageRange?: string | null; // '16-20', '21-30', '31-45', '46+'
}

export interface StartSessionResponse {
  success: boolean;
  session_id?: string;
  first_question?: any;
  error?: string;
}

export async function startLumiSession(
  params: StartSessionParams = {}
): Promise<StartSessionResponse> {
  const { type = 'onboarding', ageRange = null } = params;

  const result = await invokeEdgeFunction<{
    success: boolean;
    session_id?: string;
    session?: { id: string };
    first_question?: any;
    error?: string;
  }>('lumi-start-session', {
    type,
    age_range: ageRange,
  });

  if (!result.success) {
    return {
      success: false,
      error: result.error?.message || 'Failed to start session',
    };
  }

  const data = result.data;
  if (data?.success) {
    const sessionId = data.session_id || data.session?.id;
    if (!sessionId) {
      return {
        success: false,
        error: 'Session ID not found in response',
      };
    }

    return {
      success: true,
      session_id: sessionId,
      first_question: data.first_question,
    };
  }

  return {
    success: false,
    error: data?.error || 'Unknown error',
  };
}

