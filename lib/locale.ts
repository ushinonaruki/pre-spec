export const APP_LOCALE = process.env.NEXT_PUBLIC_APP_LOCALE ?? 'ja-JP'
export const APP_TIMEZONE = process.env.NEXT_PUBLIC_APP_TIMEZONE ?? 'Asia/Tokyo'

const JST_OFFSET_MS = 9 * 60 * 60 * 1000

export function buildCheckedAt(): string {
  const jst = new Date(Date.now() + JST_OFFSET_MS)
  return jst.toISOString().replace(/Z$/, '+09:00')
}
