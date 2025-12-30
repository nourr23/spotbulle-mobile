import { supabase } from '@/services/supabaseClient';

export interface Video {
  id: string;
  title: string | null;
  created_at: string;
  status: string | null;
  file_path?: string | null;
  public_url?: string | null;
  video_url?: string | null;
}

export interface ListVideosParams {
  userId: string;
}

export async function listVideos({ userId }: ListVideosParams): Promise<Video[]> {
  const { data, error } = await supabase
    .from('videos')
    .select('id, title, created_at, status, file_path, public_url, video_url')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Erreur lors de la récupération des vidéos: ${error.message}`);
  }

  return (data || []) as Video[];
}

