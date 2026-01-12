import { supabase } from '@/services/supabaseClient';

export interface HobbyProfile {
  id: string;
  user_id: string;
  session_id: string;
  hobby_name: string;
  fit_score: number | null;
  recommended_role: string | null;
  description: string | null;
  development_tips: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface GetHobbyProfileParams {
  userId: string;
  hobbyName?: string | null; // Optional: specific hobby or null for all
}

export interface GetHobbyProfileResponse {
  success: boolean;
  profile?: HobbyProfile | HobbyProfile[] | null;
  error?: string;
}

export async function getHobbyProfile(
  params: GetHobbyProfileParams
): Promise<GetHobbyProfileResponse> {
  const { userId, hobbyName = null } = params;

  let query = supabase
    .from('lumi_hobby_profiles')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (hobbyName) {
    query = query.eq('hobby_name', hobbyName);
  }

  const { data, error } = await query;

  if (error && error.code !== 'PGRST116') {
    return {
      success: false,
      error: error.message,
    };
  }

  if (data && data.length > 0) {
    // If specific hobby requested, return single object; otherwise return array
    if (hobbyName && data.length > 0) {
      return {
        success: true,
        profile: data[0] as HobbyProfile,
      };
    }
    return {
      success: true,
      profile: data as HobbyProfile[],
    };
  }

  return {
    success: true,
    profile: null,
  };
}

