import { Anthropic } from '@anthropic-ai/sdk';

/**
 * Prism for SAP - Common LLM Client
 * 
 * Supports:
 * - Anthropic (Native SDK)
 * - OpenAI-compatible APIs (Ollama, vLLM, etc. via fetch)
 * 
 * Configured via PRISM_LLM_* env vars.
 */

export async function complete({ system, messages, model, max_tokens = 1000, temperature = 0 }) {
  const provider = (process.env.PRISM_LLM_PROVIDER || 'anthropic').toLowerCase();
  const apiKey = process.env.PRISM_LLM_API_KEY || process.env.ANTHROPIC_API_KEY;
  const baseUrl = process.env.PRISM_LLM_BASE_URL;
  const modelId = model || process.env.PRISM_LLM_MODEL;

  if (provider === 'anthropic') {
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY or PRISM_LLM_API_KEY is required for Anthropic provider');
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: modelId || 'claude-3-5-sonnet-20241022',
      max_tokens,
      temperature,
      system,
      messages,
    });
    return response.content?.[0]?.text || '';
  } 
  
  if (provider === 'openai' || provider === 'ollama') {
    if (!baseUrl) throw new Error('PRISM_LLM_BASE_URL is required for OpenAI/Ollama provider');
    
    // Convert Anthropic messages to OpenAI format if needed
    // (They are already in {role, content} format which matches OpenAI)
    
    const requestBody = {
      model: modelId || 'llama3', // Default for Ollama if not specified
      messages: [
        ...(system ? [{ role: 'system', content: system }] : []),
        ...messages
      ],
      max_tokens,
      temperature,
    };

    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LLM API Error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message;
    
    // Some reasoning models (like those in Ollama) put output in a 'reasoning' field
    // or use it before populating 'content'. We fallback to it if content is empty.
    return message?.content || message?.reasoning || '';
  }

  throw new Error(`Unsupported LLM provider: ${provider}`);
}
