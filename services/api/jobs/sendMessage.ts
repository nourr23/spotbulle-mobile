import { invokeEdgeFunction } from '@/services/api/edge-functions';
import { supabase } from '@/services/supabaseClient';

export interface SendJobMessageParams {
  conversationId: string;
  message: string;
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

export interface SendJobMessageResult {
  success: boolean;
  conversation?: JobConversation;
  error?: string;
}

export async function sendJobMessage(
  params: SendJobMessageParams
): Promise<SendJobMessageResult> {
  console.log('🔍 [sendJobMessage] Starting sendJobMessage function...', params);

  const { data: { session }, error: authError } = await supabase.auth.getSession();
  if (authError || !session?.access_token) {
    console.error('❌ [sendJobMessage] Session error:', authError);
    throw new Error('Session non valide, veuillez vous reconnecter');
  }
  console.log('✅ [sendJobMessage] Session valid');

  const payload = {
    conversation_id: params.conversationId,
    message: params.message,
  };

  console.log('📞 [sendJobMessage] Calling invokeEdgeFunction (lumi-job-conversation-reply)...', { payload });

  const result = await invokeEdgeFunction<SendJobMessageResult>(
    'lumi-job-conversation-reply',
    payload,
    {
      maxRetries: 3,
      timeout: 30000,
    }
  );

  if (!result.success) {
    const error = result.error;
    let errorMessage = error?.message || 'Erreur lors de l\'envoi du message';

    if ((error as any)?.parsedError) {
      const parsed = (error as any).parsedError;
      if (parsed.details) {
        errorMessage = parsed.details;
      } else if (parsed.error) {
        errorMessage = parsed.error;
      }
    }

    console.error('❌ [sendJobMessage] Edge Function failed:', errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }

  console.log('✅ [sendJobMessage] Message sent successfully');
  return result.data;
}

