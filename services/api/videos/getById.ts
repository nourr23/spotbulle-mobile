import { supabase } from '@/services/supabaseClient';

export interface VideoDetails {
  id: string;
  title: string | null;
  description: string | null;
  created_at: string;
  status: string | null;
  file_path: string | null;
  public_url: string | null;
  video_url: string | null;
  transcription_text: string | null;
  transcription_data: any;
  analysis: any;
  ai_score: number | null;
  profile_information: any;
  user_id: string;
}

export interface GetVideoByIdParams {
  videoId: string;
  userId: string;
}

export async function getVideoById({ videoId, userId }: GetVideoByIdParams): Promise<VideoDetails> {
  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .eq('id', videoId)
    .eq('user_id', userId)
    .single();

  if (error) {
    throw new Error(`Erreur lors de la récupération de la vidéo: ${error.message}`);
  }

  if (!data) {
    throw new Error('Vidéo non trouvée');
  }

  return data as VideoDetails;
}

