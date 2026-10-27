'use strict'

const COL = require('./collections')
const { geohashQueryBounds, distanceBetween } = require('geofire-common')

const ACTIVE_STATUSES = ['open', 'under_review']
const DEFAULT_RADIUS_M = 1000
// A new found item searches this far; each lost report then applies its own alert radius.
const MAX_SEARCH_RADIUS_M = 10000
const MAX_MATCHES_PER_ITEM = 10
const MIN_TEXT_SIMILARITY = 0.2
// Without a lost pin, an item found this many days after the loss window still counts as "same timeframe".
const TIMEFRAME_GRACE_DAYS = 3

const STOP_WORDS = new Set(
  'the and with for from that this have has was were are its it my our your their his her a an in on of to at by or near some one'.split(' '),
)

function tokens(text = '') {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 2 && !STOP_WORDS.has(t))
      .map(stem),
  )
}

/** Crude plural folding so "glasses"/"glass" and "keys"/"key" compare equal. */
function stem(t) {
  if (t.length > 4 && t.endsWith('es') && /(ss|x|ch|sh)es$/.test(t)) return t.slice(0, -2)
  if (t.length > 3 && t.endsWith('s') && !t.endsWith('ss')) return t.slice(0, -1)
  return t
}

/** Overlap coefficient of the meaningful words in title + description (0…1). */
function textSimilarity(a, b) {
  const ta = tokens(`${a.title} ${a.description || ''}`)
  const tb = tokens(`${b.title} ${b.description || ''}`)
  if (!ta.size || !tb.size) return 0
  let shared = 0
  for (const t of ta) if (tb.has(t)) shared++
  return shared / Math.min(ta.size, tb.size)
}

/** Haversine distance in metres between two `{ lat, lng }` points. */
function distanceMeters(a, b) {
  return distanceBetween([a.lat, a.lng], [b.lat, b.lng]) * 1000
}

/** Organizations stay isolated: items only match inside one org, or with the public pool. */
function scopesCompatible(a, b) {
  return !a.orgId || !b.orgId || a.orgId === b.orgId
}

/** A found item can't have been found before the owner last had it. */
function datesCompatible(lost, found) {
  if (!lost.dateFrom || !found.dateFound) return true
  return found.dateFound >= lost.dateFrom
}

/** Found inside the lost report's date window (plus a few days' grace). */
function withinTimeframe(lost, found) {
  if (!lost.dateFrom || !found.dateFound) return false
  const end = new Date(`${lost.dateTo || lost.dateFrom}T00:00:00Z`)
  end.setUTCDate(end.getUTCDate() + TIMEFRAME_GRACE_DAYS)
  return found.dateFound >= lost.dateFrom && found.dateFound <= end.toISOString().slice(0, 10)
}

function scoreMatch({ distance, radius, similarity }) {
  if (distance == null) return Math.round(100 * (0.25 + 0.5 * similarity))
  const closeness = Math.max(0, 1 - distance / radius)
  return Math.round(100 * (0.35 + 0.4 * closeness + 0.25 * similarity))
}

/**
 * Evaluates one lost/found pair. Returns a candidate or null.
 * `lost` and `found` are plain item objects with an `id`.
 */
function evaluatePair(lost, found) {
  if (lost.type !== 'lost' || found.type !== 'found') return null
  if (lost.category !== found.category) return null
  if (lost.reporterId === found.reporterId) return null
  if (!ACTIVE_STATUSES.includes(lost.status) || !ACTIVE_STATUSES.includes(found.status)) return null
  if (!scopesCompatible(lost, found) || !datesCompatible(lost, found)) return null

  const similarity = textSimilarity(lost, found)

  if (lost.location && found.location) {
    const radius = lost.alertRadiusMeters || DEFAULT_RADIUS_M
    const distance = distanceMeters(lost.location, found.location)
    if (distance > radius) return null
    return { lost, found, reason: 'proximity', distance: Math.round(distance), score: scoreMatch({ distance, radius, similarity }) }
  }

  // Lost location unknown: fall back to category + timeframe + description overlap.
  if (!lost.location && (similarity >= MIN_TEXT_SIMILARITY || withinTimeframe(lost, found))) {
    return { lost, found, reason: 'category', distance: null, score: scoreMatch({ distance: null, similarity }) }
  }
  return null
}

/**
 * A finder pressed "I found this" on a specific lost report. Trust the explicit link
 * over distance/text heuristics, but keep the hard invariants.
 */
function directCandidate(lost, found) {
  if (lost.type !== 'lost' || found.type !== 'found') return null
  if (lost.reporterId === found.reporterId) return null
  if (!ACTIVE_STATUSES.includes(lost.status)) return null
  if (!scopesCompatible(lost, found)) return null
  const distance = lost.location && found.location ? Math.round(distanceMeters(lost.location, found.location)) : null
  return { lost, found, reason: 'reported', distance, score: 100 }
}

/** Queries Firestore for counterpart items of a newly created item and returns ranked candidates. */
async function findCandidates(db, item) {
  const otherType = item.type === 'lost' ? 'found' : 'lost'
  const others = new Map()
  const items = db.collection(COL.items)

  // 1. Geofenced search around the new item's pin.
  if (item.location) {
    const radius = item.type === 'lost' ? item.alertRadiusMeters || DEFAULT_RADIUS_M : MAX_SEARCH_RADIUS_M
    const bounds = geohashQueryBounds([item.location.lat, item.location.lng], radius)
    const snaps = await Promise.all(
      bounds.map(([start, end]) =>
        items
          .where('type', '==', otherType)
          .where('category', '==', item.category)
          .orderBy('geohash')
          .startAt(start)
          .endAt(end)
          .get(),
      ),
    )
    snaps.forEach((snap) => snap.docs.forEach((d) => others.set(d.id, { id: d.id, ...d.data() })))
  }

  // 2. Lost reports without a location, in the same scope (org items also see the public pool).
  const scopes = item.orgId ? [item.orgId, null] : [null]
  const scoped = (build) =>
    Promise.all(scopes.map((orgId) => build().where('orgId', '==', orgId).limit(100).get())).then((snaps) =>
      snaps.forEach((snap) => snap.docs.forEach((d) => others.set(d.id, { id: d.id, ...d.data() }))),
    )
  if (item.type === 'found') {
    await scoped(() => items.where('type', '==', 'lost').where('category', '==', item.category).where('locationKnown', '==', false))
  } else if (!item.location) {
    await scoped(() => items.where('type', '==', 'found').where('category', '==', item.category))
  }

  const candidates = []
  for (const other of others.values()) {
    const [lost, found] = item.type === 'lost' ? [item, other] : [other, item]
    const candidate = evaluatePair(lost, found)
    if (candidate) candidates.push(candidate)
  }
  return candidates.sort((a, b) => b.score - a.score).slice(0, MAX_MATCHES_PER_ITEM)
}

function formatDistance(m) {
  if (m == null) return ''
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`
}

module.exports = {
  ACTIVE_STATUSES,
  DEFAULT_RADIUS_M,
  textSimilarity,
  distanceMeters,
  scopesCompatible,
  datesCompatible,
  scoreMatch,
  withinTimeframe,
  evaluatePair,
  directCandidate,
  findCandidates,
  formatDistance,
}
