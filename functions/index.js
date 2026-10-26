'use strict'

/**
 * FoundIt Cloud Functions (2nd gen) — deployed as `lofu-<name>` in the `lofu` codebase
 *
 *  onItemCreated         geofenced match engine: new lost/found item → candidate matches
 *  onMatchCreated        radius alerts: in-app notifications + email to owner, finder, org admins
 *  onMatchUpdated        status lifecycle: confirmed → items "matched", completed → items "claimed"
 *  onItemUpdated         tells reporters when staff change their item's status
 *  onInvitationCreated   sends the organization invitation email
 *  onScanReportCreated   alerts an asset owner when their QR tag is scanned (with abuse throttle)
 *  cloudinarySignature   signs Cloudinary uploads so the API secret never reaches the browser
 */

const crypto = require('node:crypto')
const { initializeApp } = require('firebase-admin/app')
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore')
const { setGlobalOptions } = require('firebase-functions/v2')
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore')
const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { defineString, defineSecret } = require('firebase-functions/params')
const logger = require('firebase-functions/logger')

const COL = require('./src/collections')
const { findCandidates, formatDistance } = require('./src/matching')
const { notifyUsers, queueEmail, orgMembersWithRole } = require('./src/notify')

initializeApp()
const db = getFirestore()

setGlobalOptions({ region: 'us-central1', maxInstances: 10 })

const APP_URL = defineString('APP_URL', { default: 'http://localhost:5173', description: 'Public URL of the FoundIt web app' })
const MAIL_COLLECTION = defineString('MAIL_COLLECTION', { default: 'lofu_mail', description: 'Collection watched by the Trigger Email extension' })
const CLOUDINARY_CLOUD_NAME = defineString('CLOUDINARY_CLOUD_NAME', { default: '' })
const CLOUDINARY_API_KEY = defineString('CLOUDINARY_API_KEY', { default: '' })
const CLOUDINARY_API_SECRET = defineSecret('CLOUDINARY_API_SECRET')

const SCAN_LIMIT_PER_HOUR = 10

const notifyOpts = () => ({ appUrl: APP_URL.value().replace(/\/$/, ''), mailCollection: MAIL_COLLECTION.value() })

// ───────────── Match engine ─────────────

const onItemCreated = onDocumentCreated(`${COL.items}/{itemId}`, async (event) => {
  const snap = event.data
  if (!snap) return
  const item = { id: snap.id, ...snap.data() }

  const candidates = await findCandidates(db, item)
  logger.info(`item ${item.id} (${item.type}/${item.category}) → ${candidates.length} candidate(s)`)

  await Promise.all(
    candidates.map(async ({ lost, found, reason, distance, score }) => {
      const ref = db.collection(COL.matches).doc(`${lost.id}_${found.id}`)
      try {
        await ref.create({
          lostItemId: lost.id,
          foundItemId: found.id,
          lostOwnerId: lost.reporterId,
          foundReporterId: found.reporterId,
          participants: [lost.reporterId, found.reporterId],
          orgId: lost.orgId || found.orgId || null,
          category: lost.category,
          distanceMeters: distance,
          score,
          reason,
          status: 'pending',
          lostTitle: lost.title,
          foundTitle: found.title,
          lostPhoto: lost.photos?.[0]?.url || null,
          foundPhoto: found.photos?.[0]?.url || null,
          createdBy: 'system',
          createdAt: FieldValue.serverTimestamp(),
        })
      } catch (err) {
        if (err.code !== 6) throw err // 6 = ALREADY_EXISTS: pair was matched before
      }
    }),
  )
})

// ───────────── Radius alerts ─────────────

const onMatchCreated = onDocumentCreated(`${COL.matches}/{matchId}`, async (event) => {
  const match = event.data?.data()
  if (!match) return
  const where =
    match.reason === 'proximity'
      ? `${formatDistance(match.distanceMeters)} from where it was lost`
      : match.reason === 'manual'
        ? 'linked by organization staff'
        : 'in the same category and timeframe'

  const recipients = [
    {
      uid: match.lostOwnerId,
      type: 'match',
      title: `Possible match for “${match.lostTitle}”`,
      body: `Someone logged a found item (“${match.foundTitle}”) ${where}. Take a look and message the finder.`,
      link: `/items/${match.lostItemId}`,
      ctaText: 'Review the match',
    },
    {
      uid: match.foundReporterId,
      type: 'match',
      title: `The item you found may belong to someone`,
      body: `“${match.foundTitle}” looks like a lost report (“${match.lostTitle}”), ${where}.`,
      link: `/items/${match.foundItemId}`,
    },
  ]

  if (match.orgId) {
    const [orgSnap, admins] = await Promise.all([db.collection(COL.organizations).doc(match.orgId).get(), orgMembersWithRole(db, match.orgId)])
    const orgName = orgSnap.get('name') || 'your organization'
    for (const uid of admins) {
      recipients.push({
        uid,
        type: 'match',
        title: `New potential match in ${orgName}`,
        body: `“${match.lostTitle}” ↔ “${match.foundTitle}” (${where}).`,
        link: `/orgs/${match.orgId}/command?tab=matches`,
        ctaText: 'Open command center',
      })
    }
  }

  // Participants first, so a finder who is also an admin gets the more specific message.
  await notifyUsers(db, recipients.filter((r) => r.uid !== match.createdBy), notifyOpts())
})

// ───────────── Status lifecycle ─────────────

const MATCH_TO_ITEM_STATUS = { confirmed: 'matched', completed: 'claimed' }

const onMatchUpdated = onDocumentUpdated(`${COL.matches}/{matchId}`, async (event) => {
  const before = event.data?.before.data()
  const after = event.data?.after.data()
  if (!before || !after || before.status === after.status) return

  const itemStatus = MATCH_TO_ITEM_STATUS[after.status]
  if (itemStatus) {
    const refs = [db.collection(COL.items).doc(after.lostItemId), db.collection(COL.items).doc(after.foundItemId)]
    const snaps = await db.getAll(...refs)
    const batch = db.batch()
    snaps.forEach((snap, i) => {
      if (!snap.exists) return
      batch.update(refs[i], {
        status: itemStatus,
        matchedItemId: i === 0 ? after.foundItemId : after.lostItemId,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: 'system',
        statusHistory: FieldValue.arrayUnion({
          status: itemStatus,
          by: 'system',
          byName: 'FoundIt',
          at: Timestamp.now(),
          note: after.status === 'confirmed' ? 'Match confirmed' : 'Handover completed',
        }),
      })
    })
    await batch.commit()
  }

  const text = {
    confirmed: ['Match confirmed', `“${after.lostTitle}” and “${after.foundTitle}” were confirmed as a match. Arrange the handover in chat.`],
    completed: ['Item handed over 🎉', `“${after.lostTitle}” has been returned to its owner.`],
    dismissed: ['Match dismissed', `“${after.lostTitle}” and “${after.foundTitle}” were reviewed and are not a match.`],
  }[after.status]
  if (!text) return

  await notifyUsers(
    db,
    after.participants
      .filter((uid) => uid !== after.updatedBy)
      .map((uid) => ({
        uid,
        type: 'status',
        title: text[0],
        body: text[1],
        link: `/items/${uid === after.lostOwnerId ? after.lostItemId : after.foundItemId}`,
      })),
    { ...notifyOpts(), email: after.status !== 'dismissed' },
  )
})

const onItemUpdated = onDocumentUpdated(`${COL.items}/{itemId}`, async (event) => {
  const before = event.data?.before.data()
  const after = event.data?.after.data()
  if (!before || !after || before.status === after.status) return
  if (after.updatedBy === after.reporterId || after.updatedBy === 'system') return

  const last = (after.statusHistory || []).at(-1)
  await notifyUsers(
    db,
    [
      {
        uid: after.reporterId,
        type: 'status',
        title: `“${after.title}” is now ${after.status.replace('_', ' ')}`,
        body: last?.note ? `${last.byName || 'Staff'}: ${last.note}` : `${last?.byName || 'Organization staff'} updated your report.`,
        link: `/items/${event.params.itemId}`,
      },
    ],
    notifyOpts(),
  )
})

// ───────────── Invitations ─────────────

const onInvitationCreated = onDocumentCreated(`${COL.invitations}/{token}`, async (event) => {
  const inv = event.data?.data()
  if (!inv) return
  const { appUrl, mailCollection } = notifyOpts()
  const link = `${appUrl}/invite/${event.params.token}`
  const role = inv.role.charAt(0).toUpperCase() + inv.role.slice(1)

  await queueEmail(db, mailCollection, {
    to: inv.email,
    subject: `${inv.invitedByName} invited you to ${inv.orgName} on FoundIt`,
    title: `Join ${inv.orgName} on FoundIt`,
    body: `${inv.invitedByName} invited you to join ${inv.orgName} as ${role}. FoundIt is how ${inv.orgName} handles lost & found reports, QR asset tags and returns. The link expires in 7 days.`,
    ctaText: 'Accept invitation',
    ctaUrl: link,
  })

  // If the invitee already has an account, also drop an in-app notification.
  const existing = await db.collection(COL.users).where('email', '==', inv.email).limit(1).get()
  if (!existing.empty) {
    await notifyUsers(
      db,
      [{ uid: existing.docs[0].id, type: 'invite', title: `Invitation to ${inv.orgName}`, body: `${inv.invitedByName} invited you as ${role}.`, link: `/invite/${event.params.token}` }],
      { ...notifyOpts(), email: false },
    )
  }
})

// ───────────── QR tag scans ─────────────

const onScanReportCreated = onDocumentCreated(`${COL.scanReports}/{reportId}`, async (event) => {
  const snap = event.data
  const report = snap?.data()
  if (!report) return

  // Throttle anonymous spam: drop reports beyond the hourly limit for one finder identity.
  const recent = await db
    .collection(COL.scanReports)
    .where('finderId', '==', report.finderId)
    .where('createdAt', '>', Timestamp.fromMillis(Date.now() - 3600000))
    .count()
    .get()
  if (recent.data().count > SCAN_LIMIT_PER_HOUR) {
    logger.warn(`scan throttle: finder ${report.finderId} exceeded ${SCAN_LIMIT_PER_HOUR}/h`)
    await snap.ref.delete()
    return
  }

  const pieces = []
  if (report.message) pieces.push(`“${report.message.slice(0, 200)}”`)
  if (report.location) pieces.push('The finder shared their location.')
  if (report.contact) pieces.push(`They left contact details: ${report.contact}`)

  await notifyUsers(
    db,
    [
      {
        uid: report.ownerId,
        type: 'scan',
        title: `Someone scanned the tag on “${report.assetName}”`,
        body: pieces.join(' ') || 'A finder scanned your QR tag.',
        link: report.chatId ? `/chats/${report.chatId}` : `/assets/${report.assetId}`,
        ctaText: 'Reply to the finder',
      },
    ],
    notifyOpts(),
  )
})

// ───────────── Cloudinary signed uploads ─────────────

const cloudinarySignature = onCall({ secrets: [CLOUDINARY_API_SECRET] }, (request) => {
  const auth = request.auth
  if (!auth || auth.token.firebase?.sign_in_provider === 'anonymous') {
    throw new HttpsError('unauthenticated', 'Sign in to upload images.')
  }
  const folder = String(request.data?.folder || 'foundit/items')
  if (!/^foundit\/[a-z0-9_-]{1,40}$/i.test(folder)) {
    throw new HttpsError('invalid-argument', 'Invalid upload folder.')
  }
  const apiSecret = CLOUDINARY_API_SECRET.value()
  if (!apiSecret || !CLOUDINARY_API_KEY.value()) {
    throw new HttpsError('failed-precondition', 'Cloudinary signing is not configured on the server.')
  }

  const timestamp = Math.round(Date.now() / 1000)
  // Cloudinary signs the alphabetically sorted params (excluding file, api_key, resource_type).
  const toSign = `folder=${folder}&timestamp=${timestamp}`
  const signature = crypto.createHash('sha1').update(toSign + apiSecret).digest('hex')

  return {
    signature,
    timestamp,
    folder,
    apiKey: CLOUDINARY_API_KEY.value(),
    cloudName: CLOUDINARY_CLOUD_NAME.value(),
  }
})

// Grouped export → deployed as `lofu-<name>` so names can't collide with other apps in the project.
exports.lofu = {
  onItemCreated,
  onMatchCreated,
  onMatchUpdated,
  onItemUpdated,
  onInvitationCreated,
  onScanReportCreated,
  cloudinarySignature,
}
