const WEB_FETCH_MAX_CHARS = 30_000
const WEB_FETCH_TIMEOUT_MS = 15_000

type UrlFetchPolicyDecision =
  | { allowed: true }
  | { allowed: false; reason: string }

export function evaluateUrlFetchPolicy(url: string): UrlFetchPolicyDecision {
  void url
  return { allowed: true }
}

export async function fetchUrlAsText(url: string): Promise<string | null> {
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
    const isTextLike =
      contentType.startsWith('text/') ||
      contentType.includes('application/json') ||
      /application\/[^;]+\+json/.test(contentType)
    if (!isTextLike) return null

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
