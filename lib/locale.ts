export const APP_LOCALE = process.env.NEXT_PUBLIC_APP_LOCALE ?? 'ja-JP'
export const APP_TIMEZONE = process.env.NEXT_PUBLIC_APP_TIMEZONE ?? 'Asia/Tokyo'

export function buildCheckedAt(): string {
  const now = new Date()
  const dateParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const get = (type: string) => dateParts.find((p) => p.type === type)?.value ?? '00'
  const offsetParts = new Intl.DateTimeFormat('en', {
    timeZone: APP_TIMEZONE,
    timeZoneName: 'longOffset',
  }).formatToParts(now)
  const tzName = offsetParts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT'
  const rawOffset = tzName.slice(3) // 'GMT+09:00' → '+09:00', 'GMT' → ''
  const offset = rawOffset || '+00:00'
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}${offset}`
}
