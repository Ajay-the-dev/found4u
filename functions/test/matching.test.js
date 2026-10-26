'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const { evaluatePair, textSimilarity, distanceMeters, scopesCompatible, datesCompatible } = require('../src/matching')

const base = { category: 'bag', status: 'open', orgId: null, description: '' }
const lost = (over = {}) => ({ ...base, id: 'L1', type: 'lost', reporterId: 'owner', title: 'Black Jansport backpack', dateFrom: '2026-10-20', alertRadiusMeters: 500, location: { lat: 40.7128, lng: -74.006 }, ...over })
const found = (over = {}) => ({ ...base, id: 'F1', type: 'found', reporterId: 'finder', title: 'Black backpack with laptop', dateFound: '2026-10-21', location: { lat: 40.7140, lng: -74.006 }, ...over })

test('haversine distance is roughly correct', () => {
  const d = distanceMeters({ lat: 40.7128, lng: -74.006 }, { lat: 40.714, lng: -74.006 })
  assert.ok(d > 125 && d < 140, `expected ~133 m, got ${d}`)
})

test('matches a nearby found item inside the alert radius', () => {
  const m = evaluatePair(lost(), found())
  assert.equal(m.reason, 'proximity')
  assert.ok(m.distance < 500)
  assert.ok(m.score > 50)
})

test('ignores found items outside the alert radius', () => {
  assert.equal(evaluatePair(lost({ alertRadiusMeters: 100 }), found()), null)
})

test('requires same category, different reporters and active status', () => {
  assert.equal(evaluatePair(lost(), found({ category: 'keys' })), null)
  assert.equal(evaluatePair(lost(), found({ reporterId: 'owner' })), null)
  assert.equal(evaluatePair(lost({ status: 'resolved' }), found()), null)
})

test('found before the owner lost it cannot match', () => {
  assert.equal(datesCompatible({ dateFrom: '2026-10-20' }, { dateFound: '2026-10-19' }), false)
  assert.equal(evaluatePair(lost(), found({ dateFound: '2026-10-01' })), null)
})

test('organization isolation', () => {
  assert.equal(scopesCompatible({ orgId: 'a' }, { orgId: 'b' }), false)
  assert.equal(scopesCompatible({ orgId: 'a' }, { orgId: null }), true)
  assert.equal(evaluatePair(lost({ orgId: 'a' }), found({ orgId: 'b' })), null)
})

test('unknown-location lost reports match on description overlap', () => {
  const m = evaluatePair(lost({ location: null }), found())
  assert.equal(m.reason, 'category')
  assert.equal(m.distance, null)
  assert.equal(evaluatePair(lost({ location: null, title: 'Red umbrella' }), found()), null)
})

test('text similarity ignores stop words', () => {
  assert.equal(textSimilarity({ title: 'the and with' }, { title: 'the and with' }), 0)
  assert.ok(textSimilarity({ title: 'silver keyring toyota' }, { title: 'toyota keyring' }) === 1)
})
