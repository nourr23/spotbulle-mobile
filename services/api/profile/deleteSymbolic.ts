import { supabase } from '@/services/supabaseClient';

interface DeleteSymbolicProfileParams {
  userId: string;
}

export async function deleteSymbolicProfile({ userId }: DeleteSymbolicProfileParams): Promise<void> {
  const { error } = await supabase
    .from('profiles_symboliques')
    .delete()
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Erreur lors de la suppression du profil symbolique: ${error.message}`);
  }
}

