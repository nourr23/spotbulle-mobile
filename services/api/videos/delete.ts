import { supabase } from '@/services/supabaseClient';

export interface DeleteVideoParams {
  videoId: string;
  userId: string;
}

export async function deleteVideo({ videoId, userId }: DeleteVideoParams): Promise<void> {
  // First, check if video exists and belongs to user
  const { data: video, error: fetchError } = await supabase
    .from('videos')
    .select('id, file_path, user_id')
    .eq('id', videoId)
    .single();

  if (fetchError || !video) {
    throw new Error('Vidéo non trouvée');
  }

  if (video.user_id !== userId) {
    throw new Error('Vous n\'avez pas la permission de supprimer cette vidéo');
  }

  // Check for connections (if any)
  const { data: connections } = await supabase
    .from('connections')
    .select('id')
    .eq('video_id', videoId)
    .limit(1);

  // Delete connections if they exist
  if (connections && connections.length > 0) {
    const { error: deleteConnectionsError } = await supabase
      .from('connections')
      .delete()
      .eq('video_id', videoId);

    if (deleteConnectionsError) {
      console.warn('⚠️ Erreur lors de la suppression des connections:', deleteConnectionsError);
    }
  }

  // Delete file from storage if file_path exists
  if (video.file_path) {
    const { error: storageError } = await supabase.storage
      .from('videos')
      .remove([video.file_path]);

    if (storageError) {
      console.warn('⚠️ Erreur lors de la suppression du fichier storage:', storageError);
      // Continue with database deletion even if storage deletion fails
    }
  }

  // Delete video record from database
  const { error: deleteError } = await supabase
    .from('videos')
    .delete()
    .eq('id', videoId);

  if (deleteError) {
    throw new Error(`Erreur lors de la suppression: ${deleteError.message}`);
  }
}

