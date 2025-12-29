import { invokeEdgeFunction } from '../edge-functions';
import { supabase } from '@/services/supabaseClient';

export interface AnalyzeVideoParams {
  videoId: string;
  userId: string;
  transcriptionText?: string;
}

export interface AnalyzeVideoResult {
  success: boolean;
  message?: string;
  analysis?: any;
  error?: string;
}

/**
 * Analyze a video using the analyze-transcription Edge Function
 */
export async function analyzeVideo({
  videoId,
  userId,
  transcriptionText,
}: AnalyzeVideoParams): Promise<AnalyzeVideoResult> {
  console.log('🔍 [analyzeVideo] Starting analyzeVideo function...', {
    videoId,
    userId,
    hasTranscriptionText: !!transcriptionText,
    transcriptionLength: transcriptionText?.length || 0,
  });

  // Check if we have a valid session
  console.log('🔐 [analyzeVideo] Checking session...');
  const { data: { session }, error: authError } = await supabase.auth.getSession();
  if (authError || !session?.access_token) {
    console.error('❌ [analyzeVideo] Session error:', {
      authError: authError?.message,
      hasSession: !!session,
      hasAccessToken: !!session?.access_token,
    });
    throw new Error('Session non valide, veuillez vous reconnecter');
  }
  console.log('✅ [analyzeVideo] Session valid');

  // Call the Edge Function
  console.log('📞 [analyzeVideo] Calling invokeEdgeFunction...', {
    functionName: 'analyze-transcription',
    body: { videoId, userId, hasTranscriptionText: !!transcriptionText },
  });

  const result = await invokeEdgeFunction<AnalyzeVideoResult>(
    'analyze-transcription',
    {
      videoId,
      userId,
      transcriptionText,
    },
    {
      maxRetries: 3,
      timeout: 30000,
    }
  );

  if (!result.success) {
    // Extract actual error message
    const error = result.error;
    let errorMessage = error?.message || 'Erreur lors de l\'analyse';
    
    // If error has parsedError, use that
    if ((error as any)?.parsedError) {
      const parsed = (error as any).parsedError;
      if (parsed.details) {
        errorMessage = parsed.details;
      } else if (parsed.error) {
        errorMessage = parsed.error;
      }
    }
    
    console.error('❌ [analyzeVideo] Edge Function failed:', errorMessage);
    throw new Error(errorMessage);
  }

  console.log('✅ [analyzeVideo] Analysis completed successfully');
  return result.data;
}

