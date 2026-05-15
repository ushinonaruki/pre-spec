export type UrlFetchPolicyDecision =
  | { allowed: true }
  | { allowed: false; reason: string }

export function evaluateUrlFetchPolicy(_url: string): UrlFetchPolicyDecision {
  return { allowed: true }
}
