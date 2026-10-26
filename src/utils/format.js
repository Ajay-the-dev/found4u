export function toDate(value) {
  if (!value) return null
  if (typeof value.toDate === 'function') return value.toDate()
  if (value instanceof Date) return value
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export function formatDate(value, opts = { dateStyle: 'medium' }) {
  const d = toDate(value)
  return d ? new Intl.DateTimeFormat(undefined, opts).format(d) : '—'
}

export function formatDateTime(value) {
  return formatDate(value, { dateStyle: 'medium', timeStyle: 'short' })
}

const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
const UNITS = [
  ['year', 31536000],
  ['month', 2592000],
  ['week', 604800],
  ['day', 86400],
  ['hour', 3600],
  ['minute', 60],
]

export function timeAgo(value) {
  const d = toDate(value)
  if (!d) return ''
  const seconds = Math.round((d.getTime() - Date.now()) / 1000)
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit)
  }
  return 'just now'
}

/** `YYYY-MM-DD` for <input type="date">, in local time. */
export function isoDay(date = new Date()) {
  const d = toDate(date)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function initials(name = '') {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join('') || '?'
  )
}

export function truncate(text = '', max = 120) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}
