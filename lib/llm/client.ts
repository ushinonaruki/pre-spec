export async function callLLM(
  prompt: string,
  options?: { enableWebFetch?: boolean },
): Promise<string> {
  const { enableWebFetch } = options ?? {}
  const res = await fetch('/api/llm', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt, enableWebFetch }),
  })
  const data = (await res.json()) as { text?: string; error?: string }
  if (!res.ok) {
    throw new Error(data.error ?? `LLM request failed: ${res.status}`)
  }
  return data.text ?? ''
}
