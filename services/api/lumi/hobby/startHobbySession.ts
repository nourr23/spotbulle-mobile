import { invokeEdgeFunction } from '@/services/api/edge-functions';

export interface StartHobbySessionParams {
  hobbyName: string; // 'Football', 'Handball', 'Basketball'
  ageRange?: string | null;
}

export interface StartHobbySessionResponse {
  success: boolean;
  session?: any;
  first_question?: any;
  error?: string;
}

export async function startHobbySession(
  params: StartHobbySessionParams
): Promise<StartHobbySessionResponse> {
  const { hobbyName, ageRange = null } = params;

  const result = await invokeEdgeFunction<{
    success: boolean;
    session?: any;
    first_question?: any;
    error?: string;
  }>('lumi-hobby-start-session', {
    hobby_name: hobbyName,
    age_range: ageRange,
  }, {
    maxRetries: 3,
    timeout: 30000,
    useHttpsFallback: true,
  });

  if (!result.success) {
    return {
      success: false,
      error: result.error?.message || 'Failed to start hobby session',
    };
  }

  const data = result.data;
  if (data?.success) {
    return {
      success: true,
      session: data.session,
      first_question: data.first_question,
    };
  }

  return {
    success: false,
    error: data?.error || 'Unknown error',
  };
}

