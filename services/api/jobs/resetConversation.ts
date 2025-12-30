import { invokeEdgeFunction } from '@/services/api/edge-functions';
import { supabase } from '@/services/supabaseClient';

export interface ResetJobConversationParams {
  conversationId: string;
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

export interface ResetJobConversationResult {
  success: boolean;
  conversation?: JobConversation;
  error?: string;
}

export async function resetJobConversation(
  params: ResetJobConversationParams
): Promise<ResetJobConversationResult> {
  console.log('🔍 [resetJobConversation] Starting resetJobConversation function...', params);

  const { data: { session }, error: authError } = await supabase.auth.getSession();
  if (authError || !session?.access_token) {
    console.error('❌ [resetJobConversation] Session error:', authError);
    throw new Error('Session non valide, veuillez vous reconnecter');
  }
  console.log('✅ [resetJobConversation] Session valid');

  const payload = {
    conversation_id: params.conversationId,
  };

  console.log('📞 [resetJobConversation] Calling invokeEdgeFunction (lumi-reset-job-conversation)...', { payload });

  const result = await invokeEdgeFunction<ResetJobConversationResult>(
    'lumi-reset-job-conversation',
    payload,
    {
      maxRetries: 3,
      timeout: 30000,
    }
  );

  if (!result.success) {
    const error = result.error;
    let errorMessage = error?.message || 'Erreur lors de la réinitialisation de la conversation';

    if ((error as any)?.parsedError) {
      const parsed = (error as any).parsedError;
      if (parsed.details) {
        errorMessage = parsed.details;
      } else if (parsed.error) {
        errorMessage = parsed.error;
      }
    }

    console.error('❌ [resetJobConversation] Edge Function failed:', errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }

  console.log('✅ [resetJobConversation] Conversation reset successfully');
  return result.data;
}

