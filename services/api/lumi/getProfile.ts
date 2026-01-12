import { supabase } from '@/services/supabaseClient';

export interface LumiProfile {
  id: string;
  user_id: string;
  session_id: string;
  dominant_color: string | null;
  secondary_color: string | null;
  disc_scores: Record<string, number> | null;
  traits: any | null; // JSONB - can be object with dominant, secondary, etc.
  computed_at: string;
  created_at: string;
  updated_at: string;
}

export interface GetProfileParams {
  userId: string;
}

export interface GetProfileResponse {
  success: boolean;
  profile?: LumiProfile | null;
  error?: string;
}

export async function getLumiProfile(
  params: GetProfileParams
): Promise<GetProfileResponse> {
  const { userId } = params;

  const { data, error } = await supabase
    .from('lumi_profiles')
    .select('*')
    .eq('user_id', userId)
    .order('computed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows found
      return {
        success: true,
        profile: null,
      };
    }
    return {
      success: false,
      error: error.message,
    };
  }

  return {
    success: true,
    profile: data as LumiProfile | null,
  };
}

