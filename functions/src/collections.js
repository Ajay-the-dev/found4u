'use strict'

// Every Firestore collection is namespaced with `lofu_` so Found4 can share a database
// with other apps. Keep in sync with src/utils/collections.js and firestore.rules.
module.exports = {
  users: 'lofu_users',
  organizations: 'lofu_organizations',
  members: 'lofu_members',
  invitations: 'lofu_invitations',
  items: 'lofu_items',
  matches: 'lofu_matches',
  notifications: 'lofu_notifications',
  assets: 'lofu_assets',
  publicAssets: 'lofu_publicAssets',
  scanReports: 'lofu_scanReports',
  chats: 'lofu_chats',
  messages: 'lofu_messages',
}
