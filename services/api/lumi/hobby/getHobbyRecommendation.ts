import { invokeEdgeFunction } from '@/services/api/edge-functions';

export interface GetHobbyRecommendationParams {
  session_id: string;
}

export interface GetHobbyRecommendationResponse {
  success: boolean;
  profile?: any;
  error?: string;
}

export async function getHobbyRecommendation(
  params: GetHobbyRecommendationParams
): Promise<GetHobbyRecommendationResponse> {
  const { session_id } = params;

  const result = await invokeEdgeFunction<{
    success: boolean;
    profile?: any;
    error?: string;
  }>('lumi-hobby-recommend', {
    session_id,
  }, {
    maxRetries: 3,
    timeout: 60000, // Longer timeout for GPT processing
    useHttpsFallback: true,
  });

  if (!result.success) {
    return {
      success: false,
      error: result.error?.message || 'Failed to get hobby recommendation',
    };
  }

  const data = result.data;
  if (data?.success) {
    return {
      success: true,
      profile: data.profile,
    };
  }

  return {
    success: false,
    error: data?.error || 'Unknown error',
  };
}

