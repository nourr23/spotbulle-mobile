import { supabase } from '@/services/supabaseClient';

export interface VideoAnalysis {
  video: {
    id: string;
    title: string | null;
    created_at: string;
    status: string | null;
    analysis?: any;
  };
  analysis: {
    summary?: string | null;
    ai_score?: number | null;
    metadata?: Record<string, any> | null;
  } | null;
}

interface GetLatestAnalysisParams {
  userId: string;
}

export async function getLatestVideoAnalysis({ userId }: GetLatestAnalysisParams): Promise<VideoAnalysis | null> {
  // Get latest analyzed video
  const { data: latestVideo, error: latestError } = await supabase
    .from('videos')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['analyzed', 'COMPLETED'])
    .not('analysis', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) {
    console.error('[getLatestVideoAnalysis] Error fetching latest analyzed video:', latestError);
    return null;
  }

  if (!latestVideo?.id) {
    return null;
  }

  // Use embedded analysis on the video if present
  const analysis = latestVideo.analysis || null;

  if (!analysis) {
    return null;
  }

  return {
    video: latestVideo,
    analysis: {
      summary: analysis.summary || null,
      ai_score: analysis.ai_score || null,
      metadata: analysis.metadata || null,
    },
  };
}

