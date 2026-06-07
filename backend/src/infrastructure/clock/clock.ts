const APP_TIMEZONE = process.env.APP_TIMEZONE ?? 'Asia/Tokyo'

export function generateImportId(existingIds: string[]): string {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00'
  const baseId = `${get('year')}${get('month')}${get('day')}${get('hour')}${get('minute')}${get('second')}`
  let index = 1
  while (existingIds.includes(`${baseId}-${index}`)) index++
  return `${baseId}-${index}`
}
