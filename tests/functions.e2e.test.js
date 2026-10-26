// End-to-end test of the Cloud Functions against the Firestore + Functions emulators.
// Run with:  npm run test:e2e
import { readFileSync } from 'node:fs'
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, getDoc, getDocs, setDoc, addDoc, updateDoc, collection, query, where, serverTimestamp } from 'firebase/firestore'
import { geohashForLocation } from 'geofire-common'

let env
const asUser = (uid) =>
  env.authenticatedContext(uid, { email: `${uid}@example.com`, email_verified: true, firebase: { sign_in_provider: 'password' } }).firestore()
const asAnon = (uid) => env.authenticatedContext(uid, { firebase: { sign_in_provider: 'anonymous' } }).firestore()
// withSecurityRulesDisabled() resolves to void, so capture the callback's result ourselves.
async function admin(fn) {
  let result
  await env.withSecurityRulesDisabled(async (ctx) => {
    result = await fn(ctx.firestore())
  })
  return result
}

async function waitFor(fn, { timeout = 20000, interval = 400 } = {}) {
  const start = Date.now()
  for (;;) {
    const value = await fn()
    if (value) return value
    if (Date.now() - start > timeout) throw new Error('Timed out waiting for Cloud Function side effect')
    await new Promise((r) => setTimeout(r, interval))
  }
}

const countWhere = (col, field, value) =>
  admin(async (db) => (await getDocs(query(collection(db, col), where(field, '==', value)))).size)

const item = (over) => ({
  description: '',
  photos: [],
  orgId: null,
  status: 'open',
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  statusHistory: [],
  ...over,
  locationKnown: !!over.location,
  geohash: over.location ? geohashForLocation([over.location.lat, over.location.lng]) : null,
})

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-foundit',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  })
  await env.clearFirestore()
  await admin(async (db) => {
    for (const uid of ['alice', 'bob']) {
      await setDoc(doc(db, 'lofu_users', uid), { uid, email: `${uid}@example.com`, displayName: uid, prefs: { emailAlerts: true } })
    }
  })
})
after(() => env?.cleanup())

test('a found item inside the alert radius creates a match, alerts and emails', async () => {
  const lost = await addDoc(
    collection(asUser('alice'), 'lofu_items'),
    item({ type: 'lost', title: 'Black Jansport backpack', category: 'bag', reporterId: 'alice', reporterName: 'Alice', dateFrom: '2026-10-20', dateTo: '2026-10-20', alertRadiusMeters: 500, location: { lat: 40.7128, lng: -74.006, address: '' } }),
  )
  const found = await addDoc(
    collection(asUser('bob'), 'lofu_items'),
    item({ type: 'found', title: 'Black backpack', category: 'bag', reporterId: 'bob', reporterName: 'Bob', dateFound: '2026-10-21', location: { lat: 40.714, lng: -74.006, address: '' } }),
  )

  const matchId = `${lost.id}_${found.id}`
  const match = await waitFor(() => admin(async (db) => (await getDoc(doc(db, 'lofu_matches', matchId))).data()))
  assert.equal(match.reason, 'proximity')
  assert.ok(match.distanceMeters > 100 && match.distanceMeters < 160)
  assert.deepEqual(match.participants, ['alice', 'bob'])

  await waitFor(async () => (await countWhere('lofu_notifications', 'userId', 'alice')) >= 1)
  await waitFor(async () => (await countWhere('lofu_notifications', 'userId', 'bob')) >= 1)
  await waitFor(async () => (await countWhere('lofu_mail', 'to', 'alice@example.com')) >= 1)

  // Owner confirms → both items move to "matched".
  await updateDoc(doc(asUser('alice'), 'lofu_matches', matchId), { status: 'confirmed', updatedBy: 'alice', updatedAt: serverTimestamp() })
  const statuses = await waitFor(() =>
    admin(async (db) => {
      const [l, f] = await Promise.all([getDoc(doc(db, 'lofu_items', lost.id)), getDoc(doc(db, 'lofu_items', found.id))])
      return l.get('status') === 'matched' && f.get('status') === 'matched' ? [l.get('matchedItemId'), f.get('matchedItemId')] : null
    }),
  )
  assert.deepEqual(statuses, [found.id, lost.id])
})

test('a found item outside every radius creates no match', async () => {
  const far = await addDoc(
    collection(asUser('bob'), 'lofu_items'),
    item({ type: 'found', title: 'Black backpack', category: 'bag', reporterId: 'bob', reporterName: 'Bob', dateFound: '2026-10-22', location: { lat: 40.75, lng: -74.006, address: '' } }),
  )
  await new Promise((r) => setTimeout(r, 4000))
  const n = await admin(async (db) => (await getDocs(query(collection(db, 'lofu_matches'), where('foundItemId', '==', far.id)))).size)
  assert.equal(n, 0)
})

test('scanning a QR tag notifies the owner without exposing them', async () => {
  await admin(async (db) => {
    await setDoc(doc(db, 'lofu_assets', 'FI-TEST-0001'), { name: 'Laptop', ownerId: 'alice', orgId: null })
    await setDoc(doc(db, 'lofu_publicAssets', 'FI-TEST-0001'), { name: 'Laptop', ownerId: 'alice', active: true })
  })
  const before = await countWhere('lofu_notifications', 'userId', 'alice')
  await addDoc(collection(asAnon('finder1'), 'lofu_scanReports'), {
    assetId: 'FI-TEST-0001',
    assetName: 'Laptop',
    ownerId: 'alice',
    finderId: 'finder1',
    message: 'Found it in the library',
    contact: null,
    location: { lat: 40.71, lng: -74.0 },
    chatId: 'asset_FI-TEST-0001_finder1',
    createdAt: serverTimestamp(),
  })
  await waitFor(async () => (await countWhere('lofu_notifications', 'userId', 'alice')) > before)
  const notes = await admin(async (db) => (await getDocs(query(collection(db, 'lofu_notifications'), where('type', '==', 'scan')))).docs.map((d) => d.data()))
  assert.equal(notes[0].link, '/chats/asset_FI-TEST-0001_finder1')
})
