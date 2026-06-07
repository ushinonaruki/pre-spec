import { callLLMWithToolUse } from '@/src/infrastructure/tool-use/toolUseLoop'

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5-20251001'
const ANTHROPIC_API_VERSION = process.env.ANTHROPIC_API_VERSION ?? '2023-06-01'
const ANTHROPIC_MAX_TOKENS = parseInt(process.env.ANTHROPIC_MAX_TOKENS ?? '2048', 10)

export type CallLLMOptions = {
  enableWebFetch?: boolean
}

export async function callLLM(prompt: string, options: CallLLMOptions = {}): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')

  return callLLMWithToolUse(prompt, {
    apiKey,
    model: ANTHROPIC_MODEL,
    apiVersion: ANTHROPIC_API_VERSION,
    maxTokens: ANTHROPIC_MAX_TOKENS,
    enableWebFetch: options.enableWebFetch,
  })
}
