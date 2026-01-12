import { supabase } from '@/services/supabaseClient';

export interface GetSessionAgeRangeParams {
  session_id: string;
}

export interface GetSessionAgeRangeResponse {
  success: boolean;
  age_range?: string | null;
  error?: string;
}

export async function getSessionAgeRange(
  params: GetSessionAgeRangeParams
): Promise<GetSessionAgeRangeResponse> {
  const { session_id } = params;

  const { data, error } = await supabase
    .from('lumi_sessions')
    .select('age_range')
    .eq('id', session_id)
    .maybeSingle();

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  return {
    success: true,
    age_range: data?.age_range || null,
  };
}

