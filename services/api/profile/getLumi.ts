import { supabase } from '@/services/supabaseClient';

export interface LumiProfile {
  id: string;
  user_id: string;
  dominant_color: string | null;
  secondary_color: string | null;
  disc_scores: Record<string, number> | null;
  traits: string[] | null;
  computed_at: string;
  created_at: string;
}

interface GetLumiProfileParams {
  userId: string;
}

export async function getLumiProfile({ userId }: GetLumiProfileParams): Promise<LumiProfile | null> {
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
      return null;
    }
    throw new Error(`Erreur lors de la récupération du profil Lumi: ${error.message}`);
  }

  return data as LumiProfile | null;
}

