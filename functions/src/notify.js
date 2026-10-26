'use strict'

const COL = require('./collections')
const { FieldValue } = require('firebase-admin/firestore')

const escapeHtml = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

function renderEmail({ title, body, ctaText, ctaUrl }) {
  return `<!doctype html><html><body style="margin:0;background:#f6f7fb;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="100%" style="max-width:520px;background:#fff;border-radius:14px;padding:28px" cellpadding="0" cellspacing="0">
      <tr><td style="font-weight:700;font-size:18px;color:#4f46e5;padding-bottom:16px">🔎 FoundIt</td></tr>
      <tr><td style="font-size:20px;font-weight:600;color:#111827;padding-bottom:8px">${escapeHtml(title)}</td></tr>
      <tr><td style="font-size:15px;line-height:1.55;color:#4b5563;padding-bottom:24px">${escapeHtml(body)}</td></tr>
      ${ctaUrl ? `<tr><td><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600">${escapeHtml(ctaText || 'Open FoundIt')}</a></td></tr>` : ''}
      <tr><td style="font-size:12px;color:#9ca3af;padding-top:28px">You can turn off email alerts in FoundIt → Profile &amp; alerts.</td></tr>
    </table>
  </td></tr></table></body></html>`
}

/** Writes to the collection watched by the "Trigger Email from Firestore" extension. */
function queueEmail(db, mailCollection, { to, subject, title, body, ctaText, ctaUrl }) {
  return db.collection(mailCollection).add({
    to,
    message: { subject, html: renderEmail({ title, body, ctaText, ctaUrl }), text: `${title}\n\n${body}\n\n${ctaUrl || ''}` },
    createdAt: FieldValue.serverTimestamp(),
  })
}

/**
 * Creates in-app notifications and (if the user allows it) queues an email for each recipient.
 * `recipients`: [{ uid, type, title, body, link, ctaText }] — duplicates by uid are dropped.
 */
async function notifyUsers(db, recipients, { appUrl, mailCollection, email = true }) {
  // Keep the first entry per user: callers list the most specific message first.
  const seen = new Set()
  const unique = recipients.filter((r) => r.uid && !seen.has(r.uid) && seen.add(r.uid))
  if (!unique.length) return

  const batch = db.batch()
  for (const r of unique) {
    batch.set(db.collection(COL.notifications).doc(), {
      userId: r.uid,
      type: r.type,
      title: r.title,
      body: r.body,
      link: r.link || null,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    })
  }
  await batch.commit()

  if (!email) return
  const users = await db.getAll(...unique.map((r) => db.collection(COL.users).doc(r.uid)))
  await Promise.all(
    users.map((snap, i) => {
      const user = snap.data()
      if (!user?.email || user.prefs?.emailAlerts === false) return null
      const r = unique[i]
      return queueEmail(db, mailCollection, {
        to: user.email,
        subject: r.title,
        title: r.title,
        body: r.body,
        ctaText: r.ctaText || 'View in FoundIt',
        ctaUrl: r.link ? `${appUrl}${r.link}` : appUrl,
      })
    }),
  )
}

/** UIDs of an organization's members at or above `minRole`. */
async function orgMembersWithRole(db, orgId, roles = ['owner', 'admin']) {
  if (!orgId) return []
  const snap = await db.collection(COL.organizations).doc(orgId).collection(COL.members).where('role', 'in', roles).get()
  return snap.docs.map((d) => d.id)
}

module.exports = { renderEmail, queueEmail, notifyUsers, orgMembersWithRole, escapeHtml }
