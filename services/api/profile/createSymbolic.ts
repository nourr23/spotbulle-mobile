import { invokeEdgeFunction } from '@/services/api/edge-functions';
import { supabase } from '@/services/supabaseClient';

export interface CreateSymbolicProfileParams {
  name: string;
  birth: {
    date: string;
    time: string;
    city?: string;
    latitude: number;
    longitude: number;
    timezone: string;
  };
}

export interface CreateSymbolicProfileResult {
  success: boolean;
  message?: string;
  profile?: any;
  mode?: string;
  error?: string;
}

export async function createSymbolicProfile(
  params: CreateSymbolicProfileParams
): Promise<CreateSymbolicProfileResult> {
  const { data: { session }, error: authError } = await supabase.auth.getSession();
  if (authError || !session?.access_token) {
    throw new Error('Session non valide, veuillez vous reconnecter');
  }

  const result = await invokeEdgeFunction<CreateSymbolicProfileResult>(
    'spotcoach-profile',
    {
      name: params.name,
      birth: params.birth,
    },
    {
      timeout: 60000, // 60 seconds for profile generation
      maxRetries: 2,
    }
  );

  if (!result.success) {
    throw new Error(result.error?.message || 'Erreur lors de la génération du profil symbolique');
  }

  return result.data;
}

