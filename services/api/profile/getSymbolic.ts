import { supabase } from '@/services/supabaseClient';

export interface SymbolicProfile {
  id: string;
  user_id: string;
  phrase_synchronie: string | null;
  archetype: string | null;
  element: string | null;
  signe_soleil: string | null;
  signe_lune: string | null;
  signe_ascendant: string | null;
  profile_text: string | null;
  passions: string[] | string | null;
  name: string | null;
  date: string | null;
  time: string | null;
  city: string | null;
  created_at: string;
  updated_at: string;
}

interface GetSymbolicProfileParams {
  userId: string;
}

export async function getSymbolicProfile({ userId }: GetSymbolicProfileParams): Promise<SymbolicProfile | null> {
  const { data, error } = await supabase
    .from('profiles_symboliques')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows found
      return null;
    }
    throw new Error(`Erreur lors de la récupération du profil symbolique: ${error.message}`);
  }

  return data as SymbolicProfile | null;
}

