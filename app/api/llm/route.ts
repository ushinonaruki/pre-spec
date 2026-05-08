import type { LlmProvider } from '@/lib/llm/providers'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5-20251001'
const ANTHROPIC_API_VERSION = process.env.ANTHROPIC_API_VERSION ?? '2023-06-01'
const ANTHROPIC_MAX_TOKENS = parseInt(process.env.ANTHROPIC_MAX_TOKENS ?? '2048', 10)

export async function POST(request: Request) {
  const body = (await request.json()) as { prompt?: string; provider?: LlmProvider; url?: string }
  const { prompt, provider = 'anthropic', url } = body

  if (!prompt || typeof prompt !== 'string') {
    return Response.json({ error: 'prompt is required' }, { status: 400 })
  }

  if (provider !== 'anthropic') {
    return Response.json({ error: `Unsupported provider: ${provider}` }, { status: 400 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return Response.json(
      { error: 'ANTHROPIC_API_KEY is not set. Set it in .env (symlink to .env.local or .env.prod).' },
      { status: 500 },
    )
  }

  try {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_API_VERSION,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: ANTHROPIC_MAX_TOKENS,
        messages: [
          {
            role: 'user',
            content: url
              ? [
                  { type: 'document', source: { type: 'url', url } },
                  { type: 'text', text: prompt },
                ]
              : prompt,
          },
        ],
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('Anthropic API error:', res.status, errText)
      return Response.json({ error: `Anthropic API error: ${res.status}` }, { status: 502 })
    }

    const data = (await res.json()) as {
      content: Array<{ type: string; text: string }>
    }
    const text = data.content.find((c) => c.type === 'text')?.text ?? ''
    return Response.json({ text })
  } catch {
    return Response.json({ error: 'Failed to call Anthropic API' }, { status: 502 })
  }
}
