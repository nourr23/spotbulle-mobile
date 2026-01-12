import { invokeEdgeFunction } from '@/services/api/edge-functions';
import { getSessionAgeRange } from './getSessionAgeRange';

export interface ComputeProfileParams {
  session_id: string;
}

export interface ComputeProfileResponse {
  success: boolean;
  profile?: any;
  age_range?: string | null;
  error?: string;
}

export async function computeProfile(
  params: ComputeProfileParams
): Promise<ComputeProfileResponse> {
  const { session_id } = params;

  const result = await invokeEdgeFunction<{
    success: boolean;
    profile?: any;
    error?: string;
  }>('lumi-compute-profile', {
    session_id,
  });

  if (!result.success) {
    return {
      success: false,
      error: result.error?.message || 'Failed to compute profile',
    };
  }

  // Also fetch age_range from session
  const ageRangeResult = await getSessionAgeRange({ session_id });
  const age_range = ageRangeResult.success ? ageRangeResult.age_range : null;

  const data = result.data;
  if (data?.success) {
    return {
      success: true,
      profile: data.profile,
      age_range: age_range,
    };
  }

  return {
    success: false,
    error: data?.error || 'Unknown error',
  };
}

