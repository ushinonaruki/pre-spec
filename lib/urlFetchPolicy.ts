export type UrlFetchPolicyDecision =
  | { allowed: true }
  | { allowed: false; reason: string }

export function evaluateUrlFetchPolicy(url: string): UrlFetchPolicyDecision {
  void url
  return { allowed: true }
}
