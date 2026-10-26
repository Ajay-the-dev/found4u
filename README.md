# FoundIt — Lost & Found for organizations

FoundIt is a lost-and-found web app for campuses, offices and transit hubs. People report lost items (with a map pin or without a location) and log found items. A geofenced match engine alerts owners when something turns up inside their alert radius. QR asset tags let finders contact owners anonymously, and staff run returns from a live command center.

> **Shared Firebase project:** every Firestore collection is prefixed `lofu_`, Storage uploads live under `lofu/`, functions deploy as `lofu-*` in their own `lofu` codebase, and hosting uses a `lofu` target. Read [Deploying into an existing project](#deploying-into-an-existing-project) before running any `firebase deploy`.

**Stack:** Vue 3 (`<script setup>`), Pinia, Vue Router, Bootstrap 5 + Bootstrap Icons, Firebase (Auth, Firestore, Storage, Cloud Functions), Cloudinary, Leaflet + OpenStreetMap, `qrcode`, `geofire-common`.

---

## Features

| Area | What it does |
| --- | --- |
| **Auth** | Email/password (with email verification), Google sign-in (popup, falling back to redirect), password reset via a Firebase email link, and anonymous sessions for QR-scan finders. |
| **Organizations** | Isolated workspaces. Email invitations use single-use 7-day tokens. Roles are `Owner > Admin > Staff > Member`, and admins promote or demote anyone ranked below them. |
| **Reporting** | Lost with a map pin and alert radius; lost with an unknown location (date range + places visited); found with a pin and where the item is held now. Up to 6 photos. |
| **Match engine** | A Cloud Function runs on every new item. It does a geohash query, checks Haversine distance against the lost report's radius, and checks category, timeframe and description overlap. It writes ranked `matches`. |
| **Radius alerts** | Real-time dashboard notifications and toasts, plus email (Trigger Email extension), to the owner, the finder and the org admins. |
| **Asset tags** | Register assets (personal or org-owned) and print QR sticker sheets (3 sizes) or download a PNG. `/scan/:assetId` is a public page: finders message the owner anonymously or send a location ping. The owner's identity is never shown. |
| **Chat** | Firestore real-time chats for item, match and asset-scan conversations, with location sharing and unread badges. |
| **Command center** | Staff+: incidents table with inline status changes, match review (confirm, dismiss, schedule handover, complete), client-side proximity flags with one-click linking, and a live map with radius circles. |
| **Lifecycle** | `Open → Under Review → Matched → Claimed → Resolved`, with a full status history. Confirming a match marks both items *Matched*; completing the handover marks them *Claimed*. |

---

## Project structure

```
src/
  main.js                 bootstrap, global error handlers
  App.vue                 layouts + ErrorBoundary
  router/index.js         routes + guards (requiresAuth, guestOnly, orgRole, public)
  stores/                 Pinia setup stores
    auth.js  org.js  item.js  asset.js  chat.js  notification.js  ui.js
  services/
    firebase.js           SDK init (+ emulator wiring)
    media.js              Cloudinary (unsigned/signed) or Firebase Storage uploads, image transforms
  components/
    common/  layout/  map/  items/  assets/  chat/  org/
  views/
    auth/  items/  assets/  chat/  org/   + Dashboard, Scan, Notifications, Profile …
  utils/                  constants, geo (Haversine), ids, permissions, format, errors
functions/                Cloud Functions (match engine, alerts, emails, Cloudinary signing)
firestore.rules           RBAC + data validation      firestore.indexes.json
storage.rules             fallback image storage      tests/  rules + end-to-end tests
```

---

## Setup

### 1. Prerequisites

- Node.js 20+ (22 recommended, which is the Cloud Functions runtime)
- Firebase CLI: `npm i -g firebase-tools`, then `firebase login`
- Java 11+ (only for the local emulators)

```bash
npm install
npm --prefix functions install
```

### 2. Create the Firebase project

1. In the [Firebase console](https://console.firebase.google.com), create a project. Upgrade it to the **Blaze** plan, which Cloud Functions require.
2. **Authentication → Sign-in method**, enable:
   - **Email/Password**
   - **Google** (set a support email)
   - **Anonymous**: required for QR-scan finders who don't have an account
3. **Authentication → Settings → Authorized domains**: add your hosting domain (localhost is there by default).
4. **Firestore Database → Create database** in *production mode*.
5. *(Optional)* **Storage → Get started**. It is only used when Cloudinary isn't configured.
6. **Project settings → General → Your apps → Add app → Web**, then copy the config object.

### 3. Configure `.env`

```bash
cp .env.example .env
```

| Variable | Where to find it |
| --- | --- |
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID` | Web app config from step 2.6 |
| `VITE_FIREBASE_FUNCTIONS_REGION` | Keep `us-central1` unless you change `setGlobalOptions` in `functions/index.js` |
| `VITE_USE_EMULATORS` | `true` to point the app at the local emulators |
| `VITE_CLOUDINARY_CLOUD_NAME` | Cloudinary dashboard. Leave empty to use Firebase Storage instead |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | Name of an **unsigned** upload preset (see step 5) |
| `VITE_CLOUDINARY_SIGNED` | `true` to sign each upload server-side instead |
| `VITE_MAP_TILE_URL`, `VITE_MAP_ATTRIBUTION`, `VITE_MAP_DEFAULT_CENTER` | Optional map overrides |

Firebase web config values are not secrets; security comes from the rules. **Never** put the Cloudinary API secret in `.env`.

Then link the CLI to your project:

```bash
cp .firebaserc.example .firebaserc   # set "default" to your project id
```

### 4. Deploy rules, indexes and functions

> ⚠️ On a project that other apps already use, **don't** deploy `firestore.rules`/`storage.rules` as-is: each database and bucket has a single ruleset, so this would replace your other app's rules. Follow [Deploying into an existing project](#deploying-into-an-existing-project).

```bash
firebase deploy --only firestore:indexes      # answer "No" if asked to delete indexes missing from this file
firebase deploy --only functions:lofu         # only the lofu codebase; other functions are untouched
```

On the first functions deploy, the CLI asks for these parameters (stored in `functions/.env.<project>`):

| Param | Value |
| --- | --- |
| `APP_URL` | Public URL of the web app, e.g. `https://your-project.web.app`. Used in email links |
| `MAIL_COLLECTION` | `lofu_mail` by default. Must match the collection your Trigger Email extension watches (reuse an existing instance by entering its collection) |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` | Only for signed uploads; leave empty otherwise |

The secret is set separately, and only for signed uploads:

```bash
firebase functions:secrets:set CLOUDINARY_API_SECRET
```

### 5. Email delivery (invitations and radius alerts)

Functions queue email as documents in the `lofu_mail` collection. Install the official extension to send them:

```bash
firebase ext:install firebase/firestore-send-email
```

- *Email documents collection*: `lofu_mail` (or skip installing and set `MAIL_COLLECTION` to the collection an already-installed instance watches)
- *SMTP connection URI*: e.g. `smtps://user:password@smtp.sendgrid.net:465` (SendGrid, Mailgun, SES or Gmail app password)
- *Default FROM address*: e.g. `FoundIt <noreply@yourdomain.com>`

Without the extension everything else still works. Emails just stay queued, and admins can copy invite links from the Members page.

### 6. Cloudinary

**Unsigned uploads (simplest):** Cloudinary Console → **Settings → Upload → Upload presets → Add preset**. Set *Signing mode* to **Unsigned** and name it to match `VITE_CLOUDINARY_UPLOAD_PRESET`. Recommended preset settings: allowed formats `jpg,png,webp,heic`, max file size 10 MB, incoming transformation `c_limit,w_2000`.

**Signed uploads (more secure):** set `VITE_CLOUDINARY_SIGNED=true`, fill in `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY`, and set the `CLOUDINARY_API_SECRET` secret. The `lofu-cloudinarySignature` callable signs each upload for signed-in users only, restricted to `foundit/*` folders.

Images are delivered with `f_auto,q_auto` plus a size transformation (`imageUrl()` in `src/services/media.js`).

### 7. Run

```bash
npm run dev                  # against your real project
```

**Fully local (no cloud project needed):**

```bash
firebase emulators:start --only auth,firestore,functions --project demo-foundit
# in another terminal:
VITE_FIREBASE_API_KEY=demo VITE_FIREBASE_PROJECT_ID=demo-foundit VITE_FIREBASE_AUTH_DOMAIN=localhost \
VITE_FIREBASE_APP_ID=demo VITE_USE_EMULATORS=true npm run dev
```

Verification and password-reset links appear in the Emulator UI (http://localhost:4000 → Authentication).

### 8. Deploy hosting

FoundIt deploys to its own Hosting site through the `lofu` target, so it never overwrites your existing site:

```bash
firebase hosting:sites:create your-lofu-site
firebase target:apply hosting lofu your-lofu-site      # or edit "targets" in .firebaserc
npm run build && firebase deploy --only hosting:lofu
```

`npm run deploy` does the build and deploys `hosting:lofu` and `functions:lofu` together. It never touches rules or indexes.

Add `your-lofu-site.web.app` under *Authentication → Settings → Authorized domains*, and set `APP_URL` to it.

`firebase.json` already rewrites all routes to `index.html`, so `/scan/:assetId` deep links from QR codes work.

---

## Deploying into an existing project

FoundIt is namespaced so it can share a Firebase project with other apps:

| Resource | Namespace | What could go wrong if you deploy naively |
| --- | --- | --- |
| Firestore collections | `lofu_*` (incl. subcollections) | — |
| Firestore rules | `match /lofu_*` blocks | `firebase deploy --only firestore:rules` **replaces the whole ruleset** |
| Firestore indexes | `lofu_*` collection groups | The CLI offers to delete indexes not in `firestore.indexes.json`. Answer **No** |
| Storage | `lofu/uploads/{uid}/…` | `storage.rules` **replaces the bucket's rules** |
| Cloud Functions | `lofu-*`, codebase `lofu` | Deploy with `--only functions:lofu` |
| Hosting | target `lofu` → separate site | Deploy with `--only hosting:lofu` |
| Email queue | `lofu_mail` | Point it at an existing Trigger Email instance via `MAIL_COLLECTION` if you prefer |

**Merging the security rules:**

1. Copy the helper functions and every `match /lofu_…` block from `firestore.rules` into your existing rules file, inside `match /databases/{database}/documents { … }`.
2. If a helper name clashes with one of yours (`signedIn`, `uid`, `rank`, `isMember` …), rename one set. The CLI will refuse to compile duplicates, so you'll notice.
3. Check your existing rules for a broad `match /{document=**}` (or `/{collection}/{doc}`) that allows access. Rules are OR-ed, so it would bypass FoundIt's RBAC. Narrow it to exclude `lofu_` collections, e.g. `if !collection.matches('lofu_.*') && …`.
4. Deploy the merged file, then run `npm run test:rules` against a copy of it to confirm.

Do the same for `storage.rules`: copy the `match /lofu/uploads/…` block into your bucket's rules.

Auth users are shared by design: an account in your other app can sign in to FoundIt, and vice versa. FoundIt keeps its own profile documents in `lofu_users`.

---

## Roles & permissions

| Capability | Member | Staff | Admin | Owner |
| --- | :-: | :-: | :-: | :-: |
| See & report org items, chat | ✔ | ✔ | ✔ | ✔ |
| Command center, change any item's status, link/confirm matches | | ✔ | ✔ | ✔ |
| Register org-owned asset tags | | ✔ | ✔ | ✔ |
| Invite people (up to own rank), edit org settings | | | ✔ | ✔ |
| Change roles / remove members ranked below them | | | ✔ | ✔ |
| Manage admins | | | | ✔ |

These rules are enforced in `firestore.rules`; the UI only mirrors them (`src/utils/permissions.js`). Joining requires a pending, unexpired invitation addressed to the user's **verified** email.

---

## Data model (Firestore)

All names carry the `lofu_` prefix, defined once in `src/utils/collections.js` (app) and `functions/src/collections.js` (functions). Subcollections are prefixed too, so the `lofu_members` collection-group query can't pick up another app's `members`.

| Collection | Notes |
| --- | --- |
| `lofu_users/{uid}` | Profile and alert preferences (`emailAlerts`, `alertRadiusMeters`) |
| `lofu_organizations/{orgId}` | Name, type, `settings.alertRadiusMeters`, `settings.center` |
| `lofu_organizations/{orgId}/lofu_members/{uid}` | `role`, email and name; collection-group queried for "my orgs" |
| `lofu_invitations/{token}` | The 32-character random doc id is the secret link token |
| `lofu_items/{id}` | `type` lost/found, `orgId` (null = public), `location` + `geohash`, `status`, `statusHistory[]` |
| `lofu_matches/{lostId_foundId}` | `participants`, `distanceMeters`, `score`, `reason`, `status`, `handover` |
| `lofu_notifications/{id}` | Written only by Cloud Functions |
| `lofu_assets/{assetId}` | Private record (serial number, notes) |
| `lofu_publicAssets/{assetId}` | World-readable projection for the scan page (get-only, no listing) |
| `lofu_scanReports/{id}` | Finder message, optional contact and location |
| `lofu_chats/{id}` + `/lofu_messages` | Deterministic ids per context (`asset_…`, `item_…`, `match_…`) |
| `lofu_mail/{id}` | Email queue for the Trigger Email extension (server only) |

### How matching works

When an item is created, `lofu-onItemCreated` does the following:
1. If the item has a pin, it queries the counterpart type in the same category using geohash bounds (`geofire-common`). Found items search 10 km, then each lost report applies its own alert radius (250 m – 5 km).
2. It also checks unknown-location lost reports in the same scope by category, timeframe (found date ≥ lost date) and title/description word overlap.
3. It enforces org isolation (same org, or the public pool) and skips self-matches and closed items.
4. It writes up to 10 ranked matches. `lofu-onMatchCreated` then sends the alerts.

The command center also runs a client-side Haversine scan of every active pair in the org ("Proximity flags"), so staff can link anything the engine didn't.

---

## Testing

```bash
npm run test:rules       # 21 security-rule tests on the Firestore emulator
npm run test:e2e         # Cloud Functions end-to-end on emulators (match → alerts → email → lifecycle, QR scan)
npm run test:functions   # match-engine unit tests
npm run build
```

---

## Security notes & production checklist

- **Enable [App Check](https://firebase.google.com/docs/app-check)** (reCAPTCHA Enterprise) for Firestore and Functions. This matters most because anonymous auth lets anyone write scan reports. `lofu-onScanReportCreated` already throttles each finder identity to 10 reports per hour.
- `publicAssets` exposes only the asset name, category, photo, the owner's public message and the owner's opaque Firebase UID (needed to open the anonymous chat). Serial numbers and names stay in `assets`.
- Place search and reverse geocoding use the public OpenStreetMap Nominatim service, only on user action. For heavy traffic, switch to a commercial geocoder and tile provider (`VITE_MAP_TILE_URL`) to respect the OSM usage policy.
- Deleting an organization isn't exposed in the UI. Removing an org cleanly means recursively deleting its members, items and assets, which is best done with an admin script or the *Delete User Data* extension.
