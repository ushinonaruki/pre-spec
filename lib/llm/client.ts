import type { LlmProvider } from './providers'

export async function callLLM(
  prompt: string,
  options?: { provider?: LlmProvider; url?: string },
): Promise<string> {
  const { provider = 'anthropic', url } = options ?? {}
  const res = await fetch('/api/llm', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt, provider, url }),
  })
  const data = (await res.json()) as { text?: string; error?: string }
  if (!res.ok) {
    throw new Error(data.error ?? `LLM request failed: ${res.status}`)
  }
  return data.text ?? ''
}
