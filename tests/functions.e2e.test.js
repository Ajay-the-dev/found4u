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

// Callable functions in the emulator accept unsigned ID tokens.
async function call(name, data, uid) {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const token = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: uid, user_id: uid, uid, aud: 'demo-foundit', iss: 'https://securetoken.google.com/demo-foundit', iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600, firebase: { sign_in_provider: 'password' } })}.`
  const res = await fetch(`http://127.0.0.1:5001/demo-foundit/us-central1/lofu-${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ data }),
  })
  return res.json()
}

test('only the owner can delete an organization, and it removes everything scoped to it', async () => {
  const orgId = 'org-to-delete'
  await admin(async (db) => {
    await setDoc(doc(db, 'lofu_organizations', orgId), { name: 'Doomed Org', ownerId: 'alice' })
    await setDoc(doc(db, 'lofu_organizations', orgId, 'lofu_members', 'alice'), { uid: 'alice', orgId, role: 'owner' })
    await setDoc(doc(db, 'lofu_organizations', orgId, 'lofu_members', 'bob'), { uid: 'bob', orgId, role: 'admin' })
    await setDoc(doc(db, 'lofu_invitations', 'tok'.padEnd(24, 'x')), { orgId, orgName: 'Doomed Org', email: 'carol@example.com', role: 'member', status: 'pending', invitedBy: 'alice', invitedByName: 'alice' })
    await setDoc(doc(db, 'lofu_items', 'org-item'), item({ orgId, type: 'lost', reporterId: 'bob', title: 'Umbrella', category: 'other', dateFrom: '2026-01-01' }))
    await setDoc(doc(db, 'lofu_items', 'public-item'), item({ type: 'lost', reporterId: 'bob', title: 'Scarf', category: 'other', dateFrom: '2026-01-01' }))
    await setDoc(doc(db, 'lofu_matches', 'org-match'), { orgId })
    await setDoc(doc(db, 'lofu_assets', 'FI-ORG-0001'), { orgId, ownerId: 'alice' })
    await setDoc(doc(db, 'lofu_publicAssets', 'FI-ORG-0001'), { ownerId: 'alice', active: true })
    await setDoc(doc(db, 'lofu_scanReports', 'org-scan'), { assetId: 'FI-ORG-0001', assetName: 'Projector', ownerId: 'alice', finderId: 'finder2', message: null, createdAt: serverTimestamp() })
  })
  const exists = (path) => admin(async (db) => (await getDoc(doc(db, ...path))).exists())

  const denied = await call('deleteOrganization', { orgId }, 'bob')
  assert.equal(denied.error?.status, 'PERMISSION_DENIED')
  assert.ok(await exists(['lofu_organizations', orgId]))

  const ok = await call('deleteOrganization', { orgId }, 'alice')
  assert.deepEqual(ok.result, { items: 1, matches: 1, invitations: 1, assets: 1 })
  for (const path of [
    ['lofu_organizations', orgId],
    ['lofu_organizations', orgId, 'lofu_members', 'alice'],
    ['lofu_organizations', orgId, 'lofu_members', 'bob'],
    ['lofu_invitations', 'tok'.padEnd(24, 'x')],
    ['lofu_items', 'org-item'],
    ['lofu_matches', 'org-match'],
    ['lofu_assets', 'FI-ORG-0001'],
    ['lofu_publicAssets', 'FI-ORG-0001'],
    ['lofu_scanReports', 'org-scan'],
  ]) {
    assert.equal(await exists(path), false, path.join('/'))
  }
  assert.ok(await exists(['lofu_items', 'public-item']), 'items outside the org are untouched')
})

test('"I found this" on a lost report creates a direct match even far outside the radius', async () => {
  const lostRef = await addDoc(collection(asUser('alice'), 'lofu_items'), item({
    type: 'lost', reporterId: 'alice', reporterName: 'alice', title: 'Blue water bottle', category: 'other',
    dateFrom: '2026-10-20', dateTo: '2026-10-20', alertRadiusMeters: 200, location: { lat: 40.7128, lng: -74.006 },
  }))
  await addDoc(collection(asUser('bob'), 'lofu_items'), item({
    type: 'found', reporterId: 'bob', reporterName: 'bob', title: 'Flask', category: 'other',
    dateFound: '2026-10-21', location: { lat: 40.9, lng: -74.2 }, forLostItemId: lostRef.id,
  }))
  const match = await waitFor(async () =>
    admin(async (db) => (await getDocs(query(collection(db, 'lofu_matches'), where('lostItemId', '==', lostRef.id)))).docs[0]?.data()),
  )
  assert.equal(match.reason, 'reported')
  assert.deepEqual(match.participants, ['alice', 'bob'])
})

test('when the owner confirms they got it back, both items become resolved', async () => {
  await admin(async (db) => {
    await setDoc(doc(db, 'lofu_items', 'ret-lost'), item({ type: 'lost', reporterId: 'alice', title: 'Grey hoodie', category: 'clothing', dateFrom: '2026-10-20', location: { lat: 1, lng: 1 } }))
    await setDoc(doc(db, 'lofu_items', 'ret-found'), item({ type: 'found', reporterId: 'bob', title: 'Hoodie', category: 'clothing', dateFound: '2026-10-21', location: { lat: 1, lng: 1 } }))
    await setDoc(doc(db, 'lofu_matches', 'ret-lost_ret-found'), {
      lostItemId: 'ret-lost', foundItemId: 'ret-found', lostOwnerId: 'alice', foundReporterId: 'bob',
      participants: ['alice', 'bob'], orgId: null, status: 'confirmed', lostTitle: 'Grey hoodie', foundTitle: 'Hoodie',
    })
  })
  await updateDoc(doc(asUser('alice'), 'lofu_matches', 'ret-lost_ret-found'), { status: 'completed', updatedBy: 'alice', updatedAt: serverTimestamp() })

  const statuses = await waitFor(async () => {
    const s = await admin(async (db) => Promise.all(['ret-lost', 'ret-found'].map(async (id) => (await getDoc(doc(db, 'lofu_items', id))).get('status'))))
    return s.every((x) => x === 'resolved') && s
  })
  assert.deepEqual(statuses, ['resolved', 'resolved'])
})
