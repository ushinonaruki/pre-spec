import { evaluateUrlFetchPolicy, fetchUrlAsText } from '@/src/infrastructure/url-fetch/urlFetch'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
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

export type LLMCallOptions = {
  enableWebFetch?: boolean
  apiKey: string
  model: string
  apiVersion: string
  maxTokens: number
}

export async function callLLMWithToolUse(
  prompt: string,
  options: LLMCallOptions,
): Promise<string> {
  const { apiKey, model, apiVersion, maxTokens, enableWebFetch } = options
  const messages: MessageParam[] = [{ role: 'user', content: prompt }]

  for (let i = 0; i < TOOL_USE_MAX_ITERATIONS; i++) {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': apiVersion,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages,
        ...(enableWebFetch ? { tools: [webFetchTool] } : {}),
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('Anthropic API error:', res.status, errText)
      throw new Error(`Anthropic API error: ${res.status}`)
    }

    const data = (await res.json()) as AnthropicResponse

    if (data.stop_reason !== 'tool_use') {
      const textBlock = data.content.find((c) => c.type === 'text')
      if (textBlock?.type === 'text') return textBlock.text
      return ''
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
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: 'URL fetch failed: unsupported content type' })
          continue
        }
        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: fetchResult })
      }
    }

    if (!toolResults.length) break
    messages.push({ role: 'user', content: toolResults })
  }

  throw new Error('LLM tool use loop reached max iterations')
}
