import { invokeEdgeFunction } from '@/services/api/edge-functions';
import { supabase } from '@/services/supabaseClient';

export interface DeleteJobConversationParams {
  conversationId: string;
}

export interface DeleteJobConversationResult {
  success: boolean;
  error?: string;
}

export async function deleteJobConversation(
  params: DeleteJobConversationParams
): Promise<DeleteJobConversationResult> {
  console.log('🔍 [deleteJobConversation] Starting deleteJobConversation function...', params);

  const { data: { session }, error: authError } = await supabase.auth.getSession();
  if (authError || !session?.access_token) {
    console.error('❌ [deleteJobConversation] Session error:', authError);
    throw new Error('Session non valide, veuillez vous reconnecter');
  }
  console.log('✅ [deleteJobConversation] Session valid');

  const payload = {
    conversation_id: params.conversationId,
  };

  console.log('📞 [deleteJobConversation] Calling invokeEdgeFunction (lumi-delete-job-conversation)...', { payload });

  const result = await invokeEdgeFunction<DeleteJobConversationResult>(
    'lumi-delete-job-conversation',
    payload,
    {
      maxRetries: 3,
      timeout: 30000,
    }
  );

  if (!result.success) {
    const error = result.error;
    let errorMessage = error?.message || 'Erreur lors de la suppression de la conversation';

    if ((error as any)?.parsedError) {
      const parsed = (error as any).parsedError;
      if (parsed.details) {
        errorMessage = parsed.details;
      } else if (parsed.error) {
        errorMessage = parsed.error;
      }
    }

    console.error('❌ [deleteJobConversation] Edge Function failed:', errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }

  console.log('✅ [deleteJobConversation] Conversation deleted successfully');
  return result.data;
}

