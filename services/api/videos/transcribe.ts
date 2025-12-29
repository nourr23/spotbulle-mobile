import { invokeEdgeFunction } from '../edge-functions';
import { supabase } from '@/services/supabaseClient';

export interface TranscribeVideoParams {
  videoId: string;
  userId: string;
  videoUrl: string;
  preferredLanguage?: string;
  autoDetectLanguage?: boolean;
}

export interface TranscribeVideoResult {
  success: boolean;
  message?: string;
  transcription?: string;
  language?: string;
  error?: string;
}

/**
 * Transcribe a video using the transcribe-video Edge Function
 */
export async function transcribeVideo({
  videoId,
  userId,
  videoUrl,
  preferredLanguage,
  autoDetectLanguage = true,
}: TranscribeVideoParams): Promise<TranscribeVideoResult> {
  console.log('🔍 [transcribeVideo] Starting transcribeVideo function...', {
    videoId,
    userId,
    videoUrl: videoUrl?.substring(0, 50) + '...',
    preferredLanguage,
    autoDetectLanguage,
  });

  // Check if we have a valid session
  console.log('🔐 [transcribeVideo] Checking session...');
  const { data: { session }, error: authError } = await supabase.auth.getSession();
  if (authError || !session?.access_token) {
    console.error('❌ [transcribeVideo] Session error:', {
      authError: authError?.message,
      hasSession: !!session,
      hasAccessToken: !!session?.access_token,
    });
    throw new Error('Session non valide, veuillez vous reconnecter');
  }
  console.log('✅ [transcribeVideo] Session valid');

  // Call the Edge Function
  console.log('📞 [transcribeVideo] Calling invokeEdgeFunction...', {
    functionName: 'transcribe-video',
  });

  const result = await invokeEdgeFunction<TranscribeVideoResult>(
    'transcribe-video',
    {
      videoId,
      userId,
      videoUrl,
      preferredLanguage,
      autoDetectLanguage,
    },
    {
      maxRetries: 3,
      timeout: 60000, // Transcription can take longer
    }
  );

  if (!result.success) {
    // Extract actual error message
    const error = result.error;
    let errorMessage = error?.message || 'Erreur lors de la transcription';
    
    // If error has parsedError, use that
    if ((error as any)?.parsedError) {
      const parsed = (error as any).parsedError;
      if (parsed.details) {
        errorMessage = parsed.details;
      } else if (parsed.error) {
        errorMessage = parsed.error;
      }
    }
    
    console.error('❌ [transcribeVideo] Edge Function failed:', errorMessage);
    throw new Error(errorMessage);
  }

  console.log('✅ [transcribeVideo] Transcription completed successfully');
  return result.data;
}

