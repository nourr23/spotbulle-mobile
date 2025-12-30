import { supabase } from '@/services/supabaseClient';

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

interface ListJobConversationsParams {
  userId: string;
}

export async function listJobConversations({ userId }: ListJobConversationsParams): Promise<JobConversation[]> {
  const { data, error } = await supabase
    .from('job_conversations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Erreur lors de la récupération des conversations: ${error.message}`);
  }

  return (data || []) as JobConversation[];
}

