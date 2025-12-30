import { invokeEdgeFunction } from '@/services/api/edge-functions';
import { supabase } from '@/services/supabaseClient';

export interface FutureJob {
  title: string;
  why_fit: string;
  skills_needed: string[];
  confidence?: number;
  horizon_years?: number;
}

export interface GenerateJobsParams {
  symbolicProfile?: {
    archetype?: string;
    phrase_synchronie?: string;
    element?: string;
    profile_text?: string;
  } | null;
  lumiProfile?: {
    dominant_color?: string | null;
    secondary_color?: string | null;
    disc_scores?: Record<string, number> | null;
    traits?: string[] | null;
  } | null;
  videoAnalysis?: {
    summary?: string | null;
    ai_score?: number | null;
    metadata?: Record<string, any> | null;
  } | null;
  extraPreferences?: {
    sectors?: string[] | null;
    description?: string | null;
  } | null;
  language?: 'fr' | 'en';
}

export interface GenerateJobsResult {
  success: boolean;
  jobs?: FutureJob[];
  error?: string;
}

export async function generateFutureJobs(params: GenerateJobsParams): Promise<GenerateJobsResult> {
  console.log('🔍 [generateFutureJobs] Starting generateFutureJobs function...', params);

  const { data: { session }, error: authError } = await supabase.auth.getSession();
  if (authError || !session?.access_token) {
    console.error('❌ [generateFutureJobs] Session error:', authError);
    throw new Error('Session non valide, veuillez vous reconnecter');
  }
  console.log('✅ [generateFutureJobs] Session valid');

  const payload = {
    symbolic_profile: params.symbolicProfile || null,
    lumi_profile: params.lumiProfile || null,
    video_analysis: params.videoAnalysis || null,
    extra_preferences: params.extraPreferences || null,
    language: params.language || 'fr',
  };

  console.log('📞 [generateFutureJobs] Calling invokeEdgeFunction (lumi-gpt-future-jobs)...', { payload });

  const result = await invokeEdgeFunction<GenerateJobsResult>(
    'lumi-gpt-future-jobs',
    payload,
    {
      maxRetries: 3,
      timeout: 60000, // Longer timeout for job generation
    }
  );

  if (!result.success) {
    const error = result.error;
    let errorMessage = error?.message || 'Erreur lors de la génération des métiers';

    if ((error as any)?.parsedError) {
      const parsed = (error as any).parsedError;
      if (parsed.details) {
        errorMessage = parsed.details;
      } else if (parsed.error) {
        errorMessage = parsed.error;
      }
    }

    console.error('❌ [generateFutureJobs] Edge Function failed:', errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }

  console.log('✅ [generateFutureJobs] Jobs generated successfully');
  return result.data;
}

