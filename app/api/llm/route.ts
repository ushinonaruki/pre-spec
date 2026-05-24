import { evaluateUrlFetchPolicy } from '@/lib/urlFetchPolicy'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5-20251001'
const ANTHROPIC_API_VERSION = process.env.ANTHROPIC_API_VERSION ?? '2023-06-01'
const ANTHROPIC_MAX_TOKENS = parseInt(process.env.ANTHROPIC_MAX_TOKENS ?? '2048', 10)
const WEB_FETCH_MAX_CHARS = 30_000
const WEB_FETCH_TIMEOUT_MS = 15_000
const TOOL_USE_MAX_ITERATIONS = 5

type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string }

type MessageParam = {
  role: 'user' | 'assistant'
  content: string | ContentBlock[]
}

type AnthropicResponse = {
  stop_reason: string
  content: ContentBlock[]
}

const webFetchTool = {
  name: 'web_fetch',
  description: 'Fetch the text content of a URL.',
  input_schema: {
    type: 'object' as const,
    properties: {
      url: { type: 'string', description: 'The URL to fetch.' },
    },
    required: ['url'],
  },
}

async function fetchUrlAsText(url: string): Promise<string | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), WEB_FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; pre-spec/1.0)' },
    })
    clearTimeout(timer)
    if (!res.ok) return `Error: HTTP ${res.status}`

    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('text/')) return null

    const text = await res.text()
    const extracted = contentType.includes('text/html')
      ? text
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
      : text.trim()

    return extracted.slice(0, WEB_FETCH_MAX_CHARS)
  } catch (err) {
    clearTimeout(timer)
    return `Error fetching URL: ${String(err)}`
  }
}

export async function POST(request: Request) {
  const body = (await request.json()) as { prompt?: string; enableWebFetch?: boolean }
  const { prompt, enableWebFetch } = body

  if (!prompt || typeof prompt !== 'string') {
    return Response.json({ error: 'prompt is required' }, { status: 400 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return Response.json(
      { error: 'ANTHROPIC_API_KEY is not set. Set it in .env (symlink to .env.local or .env.prod).' },
      { status: 500 },
    )
  }

  const messages: MessageParam[] = [{ role: 'user', content: prompt }]

  try {
    for (let i = 0; i < TOOL_USE_MAX_ITERATIONS; i++) {
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
          messages,
          ...(enableWebFetch ? { tools: [webFetchTool] } : {}),
        }),
      })

      if (!res.ok) {
        const errText = await res.text()
        console.error('Anthropic API error:', res.status, errText)
        return Response.json({ error: `Anthropic API error: ${res.status}` }, { status: 502 })
      }

      const data = (await res.json()) as AnthropicResponse

      if (data.stop_reason !== 'tool_use') {
        const text = data.content.find((c) => c.type === 'text')?.text ?? ''
        return Response.json({ text })
      }

      messages.push({ role: 'assistant', content: data.content })

      const toolResults: ContentBlock[] = []
      for (const block of data.content) {
        if (block.type === 'tool_use' && block.name === 'web_fetch') {
          const fetchTarget = (block.input.url as string | undefined) ?? ''
          const policy = evaluateUrlFetchPolicy(fetchTarget)
          if (!policy.allowed) {
            toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: `URL fetch was blocked by URL fetch policy: ${policy.reason}` })
            continue
          }
          const fetchResult = await fetchUrlAsText(fetchTarget)
          if (fetchResult === null) {
            return Response.json({ error: 'URL fetch failed: unsupported content type' }, { status: 502 })
          }
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: fetchResult })
        }
      }

      if (!toolResults.length) break
      messages.push({ role: 'user', content: toolResults })
    }

    return Response.json({ error: 'Failed to complete tool use' }, { status: 502 })
  } catch {
    return Response.json({ error: 'Failed to call Anthropic API' }, { status: 502 })
  }
}
