import { invokeEdgeFunction } from '@/services/api/edge-functions';
import { supabase } from '@/services/supabaseClient';

export interface CreateJobConversationParams {
  jobTitle: string;
  jobDescription: string;
  reason: string;
  sectors?: string[] | null;
  userDescription?: string | null;
}

export interface JobConversation {
  id: string;
  user_id: string;
  job_title: string;
  job_description: string;
  reason: string | null;
  sectors: string[] | null;
  user_description: string | null;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  created_at: string;
  updated_at: string;
}

export interface CreateJobConversationResult {
  success: boolean;
  conversation?: JobConversation;
  error?: string;
}

export async function createJobConversation(
  params: CreateJobConversationParams
): Promise<CreateJobConversationResult> {
  console.log('🔍 [createJobConversation] Starting createJobConversation function...', params);

  const { data: { session }, error: authError } = await supabase.auth.getSession();
  if (authError || !session?.access_token) {
    console.error('❌ [createJobConversation] Session error:', authError);
    throw new Error('Session non valide, veuillez vous reconnecter');
  }
  console.log('✅ [createJobConversation] Session valid');

  const payload = {
    job_title: params.jobTitle,
    job_description: params.jobDescription,
    reason: params.reason,
    sectors: params.sectors || null,
    user_description: params.userDescription || null,
  };

  console.log('📞 [createJobConversation] Calling invokeEdgeFunction (lumi-create-job-conversation)...', { payload });

  const result = await invokeEdgeFunction<CreateJobConversationResult>(
    'lumi-create-job-conversation',
    payload,
    {
      maxRetries: 3,
      timeout: 30000,
    }
  );

  if (!result.success) {
    const error = result.error;
    let errorMessage = error?.message || 'Erreur lors de la création de la conversation';

    if ((error as any)?.parsedError) {
      const parsed = (error as any).parsedError;
      if (parsed.details) {
        errorMessage = parsed.details;
      } else if (parsed.error) {
        errorMessage = parsed.error;
      }
    }

    console.error('❌ [createJobConversation] Edge Function failed:', errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }

  console.log('✅ [createJobConversation] Conversation created successfully');
  return result.data;
}

