/**
 * Configuration for process-agent-message Edge Function
 */

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export const CONTEXT_WINDOW_SIZE = 10;

export const DEFAULT_MODEL = 'openai:gpt-4o-mini';
