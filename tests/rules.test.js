// Firestore security-rules tests. Run with:  npm run test:rules
// (starts the Firestore emulator via `firebase emulators:exec`)
import { readFileSync } from 'node:fs'
import { test, before, after, beforeEach } from 'node:test'
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  collection,
  collectionGroup,
  getDocs,
  query,
  where,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'

const ORG = 'org1'
const TOKEN = 'T'.repeat(32)
let env

const user = (uid, email = `${uid}@example.com`, verified = true) =>
  env.authenticatedContext(uid, { email, email_verified: verified, firebase: { sign_in_provider: 'password' } }).firestore()
const anon = (uid = 'anon1') => env.authenticatedContext(uid, { firebase: { sign_in_provider: 'anonymous' } }).firestore()
const guest = () => env.unauthenticatedContext().firestore()

async function seed(fn) {
  await env.withSecurityRulesDisabled((ctx) => fn(ctx.firestore()))
}

const member = (uid, role) => ({ uid, orgId: ORG, role, email: `${uid}@example.com`, displayName: uid })
const item = (over = {}) => ({
  type: 'lost',
  title: 'Black backpack',
  description: '',
  category: 'bag',
  photos: [],
  orgId: null,
  reporterId: 'alice',
  reporterName: 'Alice',
  status: 'open',
  location: null,
  createdAt: serverTimestamp(),
  updatedBy: 'alice',
  ...over,
})

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-foundit',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  })
})
after(() => env?.cleanup())

beforeEach(async () => {
  await env.clearFirestore()
  await seed(async (db) => {
    await setDoc(doc(db, 'lofu_organizations', ORG), { name: 'Campus', ownerId: 'owner', settings: {} })
    await setDoc(doc(db, `lofu_organizations/${ORG}/lofu_members/owner`), member('owner', 'owner'))
    await setDoc(doc(db, `lofu_organizations/${ORG}/lofu_members/admin`), member('admin', 'admin'))
    await setDoc(doc(db, `lofu_organizations/${ORG}/lofu_members/admin2`), member('admin2', 'admin'))
    await setDoc(doc(db, `lofu_organizations/${ORG}/lofu_members/staff`), member('staff', 'staff'))
    await setDoc(doc(db, `lofu_organizations/${ORG}/lofu_members/mem`), member('mem', 'member'))
  })
})

// ───────────── organizations ─────────────

test('a user can found an organization together with their owner record', async () => {
  const db = user('zoe')
  const batch = writeBatch(db)
  batch.set(doc(db, 'lofu_organizations', 'neworg'), { name: 'Office', ownerId: 'zoe', description: '' })
  batch.set(doc(db, 'lofu_organizations/neworg/lofu_members/zoe'), { uid: 'zoe', orgId: 'neworg', role: 'owner' })
  await assertSucceeds(batch.commit())
})

test('nobody can grant themselves ownership of an existing organization', async () => {
  await assertFails(setDoc(doc(user('mallory'), `lofu_organizations/${ORG}/lofu_members/mallory`), { uid: 'mallory', orgId: ORG, role: 'owner' }))
})

test('non-members cannot read the organization or its roster', async () => {
  await assertFails(getDoc(doc(user('mallory'), 'lofu_organizations', ORG)))
  await assertFails(getDocs(collection(user('mallory'), `lofu_organizations/${ORG}/lofu_members`)))
  await assertSucceeds(getDocs(collection(user('mem'), `lofu_organizations/${ORG}/lofu_members`)))
})

test('users can list their own memberships via collection group', async () => {
  await assertSucceeds(getDocs(query(collectionGroup(user('staff'), 'lofu_members'), where('uid', '==', 'staff'))))
  await assertFails(getDocs(query(collectionGroup(user('staff'), 'lofu_members'), where('uid', '==', 'admin'))))
})

// ───────────── roles ─────────────

test('admins manage roles below them; members cannot', async () => {
  const ref = (db) => doc(db, `lofu_organizations/${ORG}/lofu_members/mem`)
  await assertSucceeds(updateDoc(ref(user('admin')), { role: 'staff', updatedBy: 'admin' }))
  await assertFails(updateDoc(doc(user('mem'), `lofu_organizations/${ORG}/lofu_members/staff`), { role: 'member' }))
  await assertFails(updateDoc(ref(user('staff')), { role: 'admin' }))
})

test('admins cannot demote other admins or touch the owner; the owner can', async () => {
  await assertFails(updateDoc(doc(user('admin'), `lofu_organizations/${ORG}/lofu_members/admin2`), { role: 'member' }))
  await assertFails(updateDoc(doc(user('admin'), `lofu_organizations/${ORG}/lofu_members/owner`), { role: 'member' }))
  await assertSucceeds(updateDoc(doc(user('owner'), `lofu_organizations/${ORG}/lofu_members/admin2`), { role: 'member' }))
})

test('nobody can mint a second owner or change their own role', async () => {
  await assertFails(updateDoc(doc(user('owner'), `lofu_organizations/${ORG}/lofu_members/admin`), { role: 'owner' }))
  await assertFails(updateDoc(doc(user('admin'), `lofu_organizations/${ORG}/lofu_members/admin`), { role: 'owner' }))
})

test('the owner cannot leave; members can', async () => {
  await assertFails(deleteDoc(doc(user('owner'), `lofu_organizations/${ORG}/lofu_members/owner`)))
  await assertSucceeds(deleteDoc(doc(user('mem'), `lofu_organizations/${ORG}/lofu_members/mem`)))
})

// ───────────── invitations ─────────────

const invite = (over = {}) => ({
  orgId: ORG,
  orgName: 'Campus',
  email: 'newbie@example.com',
  role: 'staff',
  status: 'pending',
  invitedBy: 'admin',
  expiresAt: Timestamp.fromMillis(Date.now() + 86400000),
  ...over,
})

test('only admins can invite, and not above their own rank', async () => {
  await assertSucceeds(setDoc(doc(user('admin'), 'lofu_invitations', TOKEN), invite()))
  await assertFails(setDoc(doc(user('staff'), 'lofu_invitations', 'S'.repeat(32)), invite({ invitedBy: 'staff' })))
  await assertFails(setDoc(doc(user('admin'), 'lofu_invitations', 'O'.repeat(32)), invite({ role: 'owner' })))
})

async function acceptAs(db, uid, token = TOKEN, role = 'staff') {
  const batch = writeBatch(db)
  batch.set(doc(db, `lofu_organizations/${ORG}/lofu_members/${uid}`), { uid, orgId: ORG, role, inviteToken: token })
  batch.update(doc(db, 'lofu_invitations', token), { status: 'accepted', acceptedBy: uid, acceptedAt: serverTimestamp() })
  return batch.commit()
}

test('invitee with a verified matching email can join with the invited role', async () => {
  await seed((db) => setDoc(doc(db, 'lofu_invitations', TOKEN), invite()))
  await assertSucceeds(acceptAs(user('newbie', 'newbie@example.com', true), 'newbie'))
})

test('invite cannot be used by another email, unverified email, or for a higher role', async () => {
  await seed((db) => setDoc(doc(db, 'lofu_invitations', TOKEN), invite()))
  await assertFails(acceptAs(user('mallory', 'mallory@example.com'), 'mallory'))
  await assertFails(acceptAs(user('newbie', 'newbie@example.com', false), 'newbie'))
  await assertFails(acceptAs(user('newbie', 'newbie@example.com'), 'newbie', TOKEN, 'admin'))
})

test('expired or revoked invitations cannot be accepted', async () => {
  await seed((db) => setDoc(doc(db, 'lofu_invitations', TOKEN), invite({ expiresAt: Timestamp.fromMillis(Date.now() - 1000) })))
  await assertFails(acceptAs(user('newbie', 'newbie@example.com'), 'newbie'))
  await seed((db) => setDoc(doc(db, 'lofu_invitations', TOKEN), invite({ status: 'revoked' })))
  await assertFails(acceptAs(user('newbie', 'newbie@example.com'), 'newbie'))
})

// ───────────── items ─────────────

test('anyone signed in can report public items; org items need membership', async () => {
  await assertSucceeds(addDoc(collection(user('alice'), 'lofu_items'), item()))
  await assertFails(addDoc(collection(user('alice'), 'lofu_items'), item({ orgId: ORG })))
  await assertSucceeds(addDoc(collection(user('mem'), 'lofu_items'), item({ orgId: ORG, reporterId: 'mem' })))
  await assertFails(addDoc(collection(anon(), 'lofu_items'), item({ reporterId: 'anon1' })))
  await assertFails(addDoc(collection(user('alice'), 'lofu_items'), item({ reporterId: 'bob' })))
})

test('org items are invisible to outsiders; feeds are queryable by scope', async () => {
  await seed((db) => setDoc(doc(db, 'lofu_items', 'i1'), item({ orgId: ORG, reporterId: 'mem' })))
  await assertFails(getDoc(doc(user('mallory'), 'lofu_items', 'i1')))
  await assertSucceeds(getDoc(doc(user('staff'), 'lofu_items', 'i1')))
  await assertSucceeds(getDocs(query(collection(user('staff'), 'lofu_items'), where('orgId', '==', ORG))))
  await assertFails(getDocs(query(collection(user('mallory'), 'lofu_items'), where('orgId', '==', ORG))))
  await assertSucceeds(getDocs(query(collection(user('mallory'), 'lofu_items'), where('orgId', '==', null))))
})

test('status updates: reporter and org staff yes, plain members and strangers no', async () => {
  await seed((db) => setDoc(doc(db, 'lofu_items', 'i1'), item({ orgId: ORG, reporterId: 'mem', updatedBy: 'mem' })))
  await assertSucceeds(updateDoc(doc(user('staff'), 'lofu_items', 'i1'), { status: 'under_review', updatedBy: 'staff' }))
  await assertSucceeds(updateDoc(doc(user('mem'), 'lofu_items', 'i1'), { status: 'resolved', updatedBy: 'mem' }))
  await assertFails(updateDoc(doc(user('mallory'), 'lofu_items', 'i1'), { status: 'resolved', updatedBy: 'mallory' }))
  await assertFails(updateDoc(doc(user('staff'), 'lofu_items', 'i1'), { reporterId: 'staff', updatedBy: 'staff' }))
  await assertFails(updateDoc(doc(user('staff'), 'lofu_items', 'i1'), { status: 'bogus', updatedBy: 'staff' }))
})

// ───────────── matches & notifications ─────────────

test('staff can link items as a match only with truthful participants', async () => {
  await seed(async (db) => {
    await setDoc(doc(db, 'lofu_items', 'L'), item({ orgId: ORG, reporterId: 'mem' }))
    await setDoc(doc(db, 'lofu_items', 'F'), item({ orgId: ORG, type: 'found', reporterId: 'staff' }))
  })
  const match = { lostItemId: 'L', foundItemId: 'F', lostOwnerId: 'mem', foundReporterId: 'staff', participants: ['mem', 'staff'], orgId: ORG, status: 'pending', createdBy: 'staff' }
  await assertFails(setDoc(doc(user('staff'), 'lofu_matches', 'L_F'), { ...match, lostOwnerId: 'victim', participants: ['victim', 'staff'] }))
  await assertFails(setDoc(doc(user('mem'), 'lofu_matches', 'L_F'), { ...match, createdBy: 'mem' }))
  await assertSucceeds(setDoc(doc(user('staff'), 'lofu_matches', 'L_F'), match))
  await assertSucceeds(getDocs(query(collection(user('mem'), 'lofu_matches'), where('participants', 'array-contains', 'mem'))))
})

test('clients cannot forge notifications or read the mail queue', async () => {
  await assertFails(addDoc(collection(user('alice'), 'lofu_notifications'), { userId: 'bob', title: 'x' }))
  await assertFails(getDocs(collection(user('alice'), 'lofu_mail')))
  await seed((db) => setDoc(doc(db, 'lofu_notifications', 'n1'), { userId: 'alice', read: false, title: 'hi' }))
  await assertSucceeds(updateDoc(doc(user('alice'), 'lofu_notifications', 'n1'), { read: true }))
  await assertFails(updateDoc(doc(user('alice'), 'lofu_notifications', 'n1'), { title: 'changed' }))
  await assertFails(getDoc(doc(user('bob'), 'lofu_notifications', 'n1')))
})

// ───────────── asset tags & anonymous scans ─────────────

async function seedAsset() {
  await seed(async (db) => {
    await setDoc(doc(db, 'lofu_assets', 'FI-AAAA-BBBB'), { name: 'Laptop', ownerId: 'alice', orgId: null, serialNumber: 'SECRET' })
    await setDoc(doc(db, 'lofu_publicAssets', 'FI-AAAA-BBBB'), { name: 'Laptop', ownerId: 'alice', active: true })
  })
}

test('public projection is readable by anyone; private record and listing are not', async () => {
  await seedAsset()
  await assertSucceeds(getDoc(doc(guest(), 'lofu_publicAssets', 'FI-AAAA-BBBB')))
  await assertFails(getDocs(collection(guest(), 'lofu_publicAssets')))
  await assertFails(getDoc(doc(user('bob'), 'lofu_assets', 'FI-AAAA-BBBB')))
  await assertSucceeds(getDoc(doc(user('alice'), 'lofu_assets', 'FI-AAAA-BBBB')))
})

test('registering an asset writes the private and public docs together', async () => {
  const db = user('alice')
  const batch = writeBatch(db)
  batch.set(doc(db, 'lofu_assets', 'FI-CCCC-DDDD'), { name: 'Camera', ownerId: 'alice', orgId: null })
  batch.set(doc(db, 'lofu_publicAssets', 'FI-CCCC-DDDD'), { name: 'Camera', ownerId: 'alice', active: true })
  await assertSucceeds(batch.commit())
  await assertFails(setDoc(doc(user('bob'), 'lofu_publicAssets', 'FI-EEEE-FFFF'), { name: 'Fake', ownerId: 'bob', active: true }))
})

test('an anonymous finder can open a chat with the owner, report, and message', async () => {
  await seedAsset()
  const db = anon('finder')
  const chatId = 'asset_FI-AAAA-BBBB_finder'
  await assertSucceeds(getDoc(doc(db, 'lofu_chats', chatId))) // probing a not-yet-existing chat is allowed
  await assertSucceeds(setDoc(doc(db, 'lofu_chats', chatId), { kind: 'asset', refId: 'FI-AAAA-BBBB', participants: ['finder', 'alice'], participantInfo: {} }))
  await assertSucceeds(addDoc(collection(db, 'lofu_scanReports'), { assetId: 'FI-AAAA-BBBB', ownerId: 'alice', finderId: 'finder', message: 'Found it!', contact: null }))
  await assertSucceeds(addDoc(collection(db, `lofu_chats/${chatId}/lofu_messages`), { senderId: 'finder', text: 'Hello' }))
  await assertSucceeds(getDocs(collection(user('alice'), `lofu_chats/${chatId}/lofu_messages`)))
  await assertFails(getDocs(collection(user('bob'), `lofu_chats/${chatId}/lofu_messages`)))
  await assertFails(addDoc(collection(db, `lofu_chats/${chatId}/lofu_messages`), { senderId: 'alice', text: 'spoofed' }))
})

test('chats cannot target arbitrary users, and scans cannot be misdirected', async () => {
  await seedAsset()
  const db = anon('finder')
  await assertFails(setDoc(doc(db, 'lofu_chats', 'x'), { kind: 'asset', refId: 'FI-AAAA-BBBB', participants: ['finder', 'bob'], participantInfo: {} }))
  await assertFails(addDoc(collection(db, 'lofu_scanReports'), { assetId: 'FI-AAAA-BBBB', ownerId: 'bob', finderId: 'finder', message: 'x', contact: null }))
  await seed((d) => updateDoc(doc(d, 'lofu_publicAssets', 'FI-AAAA-BBBB'), { active: false }))
  await assertFails(addDoc(collection(db, 'lofu_scanReports'), { assetId: 'FI-AAAA-BBBB', ownerId: 'alice', finderId: 'finder', message: 'x', contact: null }))
})
