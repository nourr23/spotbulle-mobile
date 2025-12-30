import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/services/supabaseClient';

export interface EdgeFunctionOptions {
  maxRetries?: number;
  timeout?: number;
  useHttpsFallback?: boolean;
}

const DEFAULT_OPTIONS: EdgeFunctionOptions = {
  maxRetries: 3,
  timeout: 30000,
  useHttpsFallback: true,
};

/**
 * Invoke a Supabase Edge Function with retry logic and error handling
 */
export async function invokeEdgeFunction<T = any>(
  functionName: string,
  body: any,
  options: EdgeFunctionOptions = {}
): Promise<{ success: true; data: T } | { success: false; error: Error }> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;

  console.log('🔧 [invokeEdgeFunction] Starting invocation...', {
    functionName,
    bodyKeys: Object.keys(body),
    maxRetries: opts.maxRetries,
    timeout: opts.timeout,
  });

  for (let attempt = 0; attempt < opts.maxRetries!; attempt++) {
    try {
      console.log(`🔄 [invokeEdgeFunction] Attempt ${attempt + 1}/${opts.maxRetries} for ${functionName}`);
      
      // Try using Supabase client first
      console.log('📞 [invokeEdgeFunction] Calling supabase.functions.invoke...');
      const { data, error } = await supabase.functions.invoke(functionName, {
        body,
      });

      if (error) {
        // Try to extract HTTP status code from error
        let httpStatus: number | null = null;
        if (error.context?.status) {
          httpStatus = error.context.status;
        } else if ((error as any).status) {
          httpStatus = (error as any).status;
        }
        
        // Also check error.message for status code pattern
        const statusMatch = error.message?.match(/status code (\d+)/i);
        if (statusMatch && !httpStatus) {
          httpStatus = parseInt(statusMatch[1], 10);
        }
        
        // Attach status to error for downstream handling
        if (httpStatus) {
          (error as any).status = httpStatus;
        }
        
        console.error(`❌ [invokeEdgeFunction] Supabase client error (attempt ${attempt + 1}):`, {
          error: error.message,
          errorName: error.name,
          httpStatus,
          errorContext: error.context,
        });
        
        // Check if it's a 202 Accepted (async processing) or other specific status
        if (httpStatus === 202) {
          console.log('⚠️ [invokeEdgeFunction] HTTP 202 Accepted - function is processing asynchronously');
          // For 202, we can consider it as "started" and let polling handle completion
          // But we still need to throw to trigger fallback or error handling
        }
        
        throw error;
      }

      console.log('✅ [invokeEdgeFunction] Success via Supabase client:', {
        hasData: !!data,
        dataKeys: data ? Object.keys(data) : [],
      });
      return { success: true, data: data as T };
    } catch (error: any) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`❌ [invokeEdgeFunction] Attempt ${attempt + 1} failed:`, {
        error: lastError.message,
        errorType: lastError.constructor.name,
      });

      // If not last attempt, try HTTPS fallback or retry
      if (attempt < opts.maxRetries! - 1) {
        if (opts.useHttpsFallback) {
          console.log('🔄 [invokeEdgeFunction] Trying HTTPS fallback...');
          const fallbackResult = await invokeEdgeFunctionDirectHttps<T>(
            functionName,
            body,
            opts.timeout!
          );
          if (fallbackResult.success) {
            console.log('✅ [invokeEdgeFunction] HTTPS fallback succeeded');
            return fallbackResult;
          }
          console.log('❌ [invokeEdgeFunction] HTTPS fallback also failed');
        }

        // Retry with exponential backoff
        const delay = 2000 * (attempt + 1);
        console.log(`⏳ [invokeEdgeFunction] Waiting ${delay}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  console.error('❌ [invokeEdgeFunction] All attempts failed:', lastError);
  return { success: false, error: lastError || new Error('Unknown error') };
}

/**
 * Direct HTTPS fallback for Edge Function calls
 */
async function invokeEdgeFunctionDirectHttps<T = any>(
  functionName: string,
  body: any,
  timeout: number
): Promise<{ success: true; data: T } | { success: false; error: Error }> {
  try {
    console.log('🌐 [invokeEdgeFunctionDirectHttps] Starting HTTPS direct call...', {
      functionName,
      timeout,
    });

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      console.error('❌ [invokeEdgeFunctionDirectHttps] No session or access token');
      return {
        success: false,
        error: new Error('Session invalide pour appel HTTPS direct'),
      };
    }

    // Get Supabase URL from config
    const functionUrl = `${SUPABASE_URL}/functions/v1/${functionName}`;
    console.log('🔗 [invokeEdgeFunctionDirectHttps] Function URL:', functionUrl.substring(0, 80) + '...');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    console.log('📤 [invokeEdgeFunctionDirectHttps] Sending fetch request...', {
      method: 'POST',
      hasBody: !!body,
      bodySize: JSON.stringify(body).length,
    });

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log('📥 [invokeEdgeFunctionDirectHttps] Response received:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let parsedError: any = null;
      let errorMessage = `HTTP ${response.status}`;
      
      // Try to parse JSON error response
      try {
        parsedError = JSON.parse(errorText);
        if (parsedError.error) {
          errorMessage = parsedError.error;
        } else if (parsedError.details) {
          errorMessage = parsedError.details;
        } else if (parsedError.message) {
          errorMessage = parsedError.message;
        }
      } catch {
        // If not JSON, use the text as is
        errorMessage = errorText || `HTTP ${response.status}`;
      }
      
      const error = new Error(errorMessage);
      (error as any).status = response.status;
      (error as any).parsedError = parsedError;
      
      return {
        success: false,
        error,
      };
    }

    const data = await response.json();
    console.log('✅ [invokeEdgeFunctionDirectHttps] Success:', {
      hasData: !!data,
      dataKeys: data ? Object.keys(data) : [],
    });
    return { success: true, data: data as T };
  } catch (error: any) {
    console.error('❌ [invokeEdgeFunctionDirectHttps] Exception:', {
      error: error.message,
      errorType: error.constructor.name,
      isAbortError: error.name === 'AbortError',
    });
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

