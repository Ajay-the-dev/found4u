/*
 * Help centre content: one entry per workflow, rendered by HelpTopic.vue.
 * Keep it in sync with how the app actually behaves (see BUSINESS_WORKFLOWS.md).
 *
 *   steps   – what the user does, in order
 *   example – a worked scenario: { title, scenes: [{ who, tone, text }], outcome }
 *   tips    – short good-practice notes
 *   cta     – where to go to start the workflow
 */

export const AUDIENCES = {
  everyone: { label: 'Everyone', tone: 'tone-primary' },
  finders: { label: 'Finders', tone: 'tone-found' },
  owners: { label: 'Owners', tone: 'tone-lost' },
  staff: { label: 'Staff & above', tone: 'tone-info' },
  admins: { label: 'Admins & owners', tone: 'tone-warning' },
}

export const HELP_GROUPS = [
  { key: 'basics', label: 'Getting started' },
  { key: 'items', label: 'Lost & found' },
  { key: 'tags', label: 'QR asset tags' },
  { key: 'orgs', label: 'Organizations' },
]

export const HELP_TOPICS = [
  // ───────────── basics ─────────────
  {
    id: 'getting-started',
    group: 'basics',
    icon: 'bi-person-check',
    tone: 'tone-primary',
    title: 'Create an account & sign in',
    summary: 'Sign up with email or Google, verify your address and set your alert preferences.',
    audience: ['everyone'],
    steps: [
      { title: 'Create your account', text: 'Use Create account with your name, email and a password, or continue with Google.' },
      { title: 'Verify your email', text: 'Open the link we email you. You need a verified address to join an organization.' },
      { title: 'Set your alerts', text: 'In Profile & alerts, choose your default alert radius and whether you also want alerts by email.' },
      { title: 'Pick a workspace', text: 'Use the workspace switcher in the top bar to move between the Public network and your organizations.' },
    ],
    example: {
      title: 'A new employee joins',
      scenes: [
        { who: 'Sam', tone: 'tone-primary', text: 'Registers with a work email and clicks the verification link from the inbox.' },
        { who: 'Sam', tone: 'tone-primary', text: 'Sets the default alert radius to 500 m, because the office campus is small.' },
        { who: 'Found4', tone: 'tone-secondary', text: 'Shows an invitation from the office organization on the Organizations page.' },
      ],
      outcome: 'Sam is signed in, verified and ready to accept the office invitation.',
    },
    tips: [
      'Forgot your password? Use Forgot password? on the sign-in page and we will email you a link.',
      'Email alerts can be turned off at any time. In-app alerts always arrive.',
    ],
    cta: { label: 'Profile & alerts', to: '/profile' },
  },
  {
    id: 'notifications',
    group: 'basics',
    icon: 'bi-bell',
    tone: 'tone-violet',
    title: 'Alerts & notifications',
    summary: 'What Found4 tells you about, and where you will see it.',
    audience: ['everyone'],
    steps: [
      { title: 'Watch the bell', text: 'New alerts appear under the bell icon and pop up briefly while you are using the app.' },
      { title: 'Check your inbox', text: 'The same alerts are emailed to you, unless you have switched email alerts off.' },
      { title: 'Open the alert', text: 'Each alert links straight to the item, match, chat or invitation it is about.' },
      { title: 'Tidy up', text: 'Mark alerts as read one by one or all at once, or delete the ones you no longer need.' },
    ],
    example: {
      title: 'Which alerts a lost wallet triggers',
      scenes: [
        { who: 'Owner', tone: 'tone-lost', text: '“Possible match for Brown wallet”. A found wallet was logged 300 m away.' },
        { who: 'Finder', tone: 'tone-found', text: '“The item you found may belong to someone”.' },
        { who: 'Org admins', tone: 'tone-warning', text: '“New potential match in Riverside Campus”.' },
        { who: 'Finder', tone: 'tone-found', text: 'Later: “Match confirmed”, then “Item handed over 🎉”.' },
      ],
      outcome: 'Everyone involved knew what was happening at each stage, without anyone having to chase updates.',
    },
    tips: [
      'You are never notified about an action you took yourself.',
      'Dismissed matches only alert you in the app, not by email.',
    ],
    cta: { label: 'Open notifications', to: '/notifications' },
  },

  // ───────────── lost & found ─────────────
  {
    id: 'report-lost',
    group: 'items',
    icon: 'bi-question-circle',
    tone: 'tone-lost',
    title: 'Report a lost item',
    summary: 'Tell Found4 what you lost, where and when, and get alerted when it turns up.',
    audience: ['owners'],
    steps: [
      { title: 'Choose Report → I lost something', text: 'Pick the workspace to post in: your organization, or the Public network.' },
      { title: 'Describe the item', text: 'Add a clear title, the right category, a description with distinguishing details and up to 6 photos.' },
      { title: 'Say where', text: 'Drop a pin and choose an alert radius from 250 m to 5 km. If you don’t know where, list the places you visited instead.' },
      { title: 'Say when', text: 'Give the date, or the date range, when you last had it.' },
      { title: 'Submit', text: 'Your report is Open, and Found4 immediately starts looking for found items that match.' },
    ],
    example: {
      title: 'Headphones left in the library',
      scenes: [
        { who: 'Aisha', tone: 'tone-lost', text: 'Reports “Black Sony headphones, scratched left cup” in Electronics, in the Riverside Campus workspace.' },
        { who: 'Aisha', tone: 'tone-lost', text: 'Pins the library and sets a 500 m radius, with dates of 3 to 4 March.' },
        { who: 'Found4', tone: 'tone-secondary', text: 'Next morning, staff log a pair of headphones handed in at the library desk, 120 m away.' },
        { who: 'Found4', tone: 'tone-secondary', text: 'Aisha gets “Possible match for Black Sony headphones”.' },
      ],
      outcome: 'Aisha opens the match, sees the photo and starts a chat with the desk.',
    },
    tips: [
      'Items only match within the same category, so pick the closest one.',
      'Specific words help, like brand, colour, stickers and contents. Without a pin, matching relies on your description and dates.',
      'A smaller radius gives fewer, more relevant alerts. A larger one catches items that were moved before being handed in.',
    ],
    cta: { label: 'Report a lost item', to: '/report/lost' },
  },
  {
    id: 'report-found',
    group: 'items',
    icon: 'bi-box2-heart',
    tone: 'tone-found',
    title: 'Log a found item',
    summary: 'Record what you found and where it is being kept, so its owner can be alerted.',
    audience: ['finders'],
    steps: [
      { title: 'Check for an existing report', text: 'Browse lost items first. If you spot the owner’s report, press I found this item on it.' },
      { title: 'Otherwise, choose Report → I found something', text: 'Add a title, category, photos and the date you found it.' },
      { title: 'Pin where you found it', text: 'Found4 alerts owners whose alert radius covers that spot.' },
      { title: 'Say where it is now', text: 'For example “Security office, Building A, shelf 3”, so whoever does the handover can find it.' },
    ],
    example: {
      title: 'Keys on a train platform',
      scenes: [
        { who: 'Leo', tone: 'tone-found', text: 'Finds a set of keys with a blue fob on platform 2 and browses lost items nearby.' },
        { who: 'Leo', tone: 'tone-found', text: 'Spots “Keys with blue Ikea fob” and presses I found this item. The form is prefilled.' },
        { who: 'Leo', tone: 'tone-found', text: 'Adds a photo and “Handed to the ticket office”.' },
        { who: 'Found4', tone: 'tone-secondary', text: 'Links the two reports straight away as a top-priority match and alerts the owner.' },
      ],
      outcome: 'The owner knows exactly where to collect the keys within minutes.',
    },
    tips: [
      'Don’t include anything in photos that would let someone falsely claim the item, such as the ID number on a card.',
      'Handing the item to an official desk? Say so under “where it is now”.',
    ],
    cta: { label: 'Log a found item', to: '/report/found' },
  },
  {
    id: 'matching',
    group: 'items',
    icon: 'bi-geo-alt',
    tone: 'tone-info',
    title: 'How matching works',
    summary: 'Found4 compares every new report with existing ones and suggests likely pairs.',
    audience: ['everyone'],
    steps: [
      { title: 'Same category', text: 'A lost phone is only ever compared with found phones.' },
      { title: 'Same workspace', text: 'Organization reports match within that organization or the Public network, never with another organization.' },
      { title: 'Right timing', text: 'An item can’t have been found before its owner lost it.' },
      { title: 'Close enough or similar enough', text: 'With a pin, the found item must be inside the owner’s alert radius. Without one, Found4 looks for similar wording or a find within the lost dates.' },
      { title: 'Ranked suggestions', text: 'Closer items and closer descriptions rank higher. Each new report gets at most 10 suggestions.' },
    ],
    example: {
      title: 'Two ways a wallet can match',
      scenes: [
        { who: 'With a pin', tone: 'tone-info', text: 'Lost: brown wallet, pinned at the cafeteria, 1 km radius. Found: brown wallet, 450 m away, the next day. Result: a nearby match.' },
        { who: 'Without a pin', tone: 'tone-violet', text: 'Lost: “leather wallet with red stitching”, somewhere between the gym and the library. Found: “red-stitched leather wallet”. Result: a same-category-and-timeframe match.' },
      ],
      outcome: 'Both owners get a suggestion to review. Nothing changes until someone confirms it.',
    },
    tips: [
      'Matching runs when a report is submitted. Editing a report later doesn’t start a new search, but organization staff can still link items by hand.',
      'Your own lost and found reports never match each other.',
    ],
    cta: { label: 'Browse items', to: '/items' },
  },
  {
    id: 'return',
    group: 'items',
    icon: 'bi-hand-thumbs-up',
    tone: 'tone-found',
    title: 'Confirm a match & hand the item over',
    summary: 'Verify the item really belongs to the owner, agree a handover and close the case.',
    audience: ['owners', 'finders', 'staff'],
    steps: [
      { title: 'Review the suggestion', text: 'Open the match from your dashboard, the alert or the item page and compare photos and details.' },
      { title: 'Chat to verify', text: 'Message each other privately. The owner describes something only they would know.' },
      { title: 'Confirm or dismiss', text: 'Press That’s mine (or Confirm match) and both reports become Matched. Dismiss and both stay Open and keep matching.' },
      { title: 'Agree a handover', text: 'Organization staff can record the place, time and notes for the handover.' },
      { title: 'Mark as returned', text: 'After the handover, press Returned to owner on the match. Both reports become Resolved.' },
    ],
    example: {
      title: 'A laptop at the security desk',
      scenes: [
        { who: 'Owner', tone: 'tone-lost', text: 'Sees the match and asks in chat: “Does it have a NASA sticker on the lid?”' },
        { who: 'Desk staff', tone: 'tone-info', text: '“Yes, and a cracked corner.” The owner confirms the match.' },
        { who: 'Desk staff', tone: 'tone-info', text: 'Schedules the handover: “Security office, Building A, 4 pm, bring photo ID”.' },
        { who: 'Owner', tone: 'tone-lost', text: 'Collects the laptop and presses Returned to owner.' },
      ],
      outcome: 'Both reports are Resolved and the finder gets “Item handed over 🎉”.',
    },
    tips: [
      'Meet in a public place or at an official lost-and-found desk.',
      'Got your item back another way? Press I got it back on your report to close it.',
    ],
    cta: { label: 'Go to dashboard', to: '/dashboard' },
  },
  {
    id: 'chat',
    group: 'items',
    icon: 'bi-chat-dots',
    tone: 'tone-primary',
    title: 'Private chat',
    summary: 'Talk to owners, finders and staff without sharing your phone number.',
    audience: ['everyone'],
    steps: [
      { title: 'Start a conversation', text: 'Use Message the owner (or Message the finder) on an item page or a match card. Reopening it later takes you back to the same thread.' },
      { title: 'Share a location', text: 'Send a map pin to show where to meet or where the item is.' },
      { title: 'Keep track', text: 'Unread conversations show a badge on the Messages icon.' },
    ],
    example: {
      title: 'Arranging a pickup',
      scenes: [
        { who: 'Finder', tone: 'tone-found', text: '“I have your umbrella. I’m at the north entrance until 6.”' },
        { who: 'Finder', tone: 'tone-found', text: 'Shares a location pin of the entrance.' },
        { who: 'Owner', tone: 'tone-lost', text: '“On my way, 10 minutes!”' },
      ],
      outcome: 'Pickup arranged without anyone exchanging personal contact details.',
    },
    tips: ['Never send money or personal documents in chat.', 'Messages can be up to 2,000 characters long.'],
    cta: { label: 'Open messages', to: '/chats' },
  },

  // ───────────── QR asset tags ─────────────
  {
    id: 'asset-tags',
    group: 'tags',
    icon: 'bi-qr-code',
    tone: 'tone-warning',
    title: 'Tag your belongings with QR codes',
    summary: 'Register valuables and print QR stickers, so anyone who finds them can reach you anonymously.',
    audience: ['everyone'],
    steps: [
      { title: 'Register an asset', text: 'Under Asset tags, add the name, category, a photo and, optionally, a serial number.' },
      { title: 'Write a public message', text: 'This is what finders will see, e.g. “Reward if returned, please message me”.' },
      { title: 'Print the sticker', text: 'Print a sticker sheet in one of 3 sizes, or download the QR as an image.' },
      { title: 'Stick it on', text: 'Put it somewhere visible. Mark the asset as lost if it goes missing.' },
    ],
    example: {
      title: 'A department tags its loan laptops',
      scenes: [
        { who: 'IT staff', tone: 'tone-info', text: 'Register 20 laptops as organization assets, each with its serial number.' },
        { who: 'IT staff', tone: 'tone-info', text: 'Print one sticker sheet and label every laptop.' },
        { who: 'Found4', tone: 'tone-secondary', text: 'Keeps the serial numbers private. Finders only see the name, photo and message.' },
      ],
      outcome: 'Any of those laptops left in a lecture hall can be reported back with one scan.',
    },
    tips: [
      'Your name and contact details are never shown to the person who scans the tag.',
      'Staff and above can register organization-owned assets. Admins can manage them.',
    ],
    cta: { label: 'Asset tags', to: '/assets' },
  },
  {
    id: 'scan',
    group: 'tags',
    icon: 'bi-qr-code-scan',
    tone: 'tone-found',
    title: 'Found something with a QR tag?',
    summary: 'Scan it with your phone camera and message the owner. No account needed.',
    audience: ['finders'],
    steps: [
      { title: 'Scan the code', text: 'Your phone opens the item’s page, with its name, photo and the owner’s message.' },
      { title: 'Send a message', text: 'Say where you found it. You can also leave contact details or share your current location.' },
      { title: 'Wait for a reply', text: 'The owner is alerted right away and replies in a private chat. Come back to the same page to continue.' },
    ],
    example: {
      title: 'A backpack on a bus',
      scenes: [
        { who: 'Passenger', tone: 'tone-found', text: 'Scans the tag on a backpack left on the seat.' },
        { who: 'Passenger', tone: 'tone-found', text: '“Found this on the 42 bus, I’ll hand it to the driver at the depot.” Shares a location.' },
        { who: 'Owner', tone: 'tone-lost', text: 'Gets “Someone scanned the tag on Grey backpack” and replies “Thank you! I’ll pick it up at the depot.”' },
      ],
      outcome: 'Backpack recovered, with neither person sharing a phone number.',
    },
    tips: ['To prevent abuse, each finder can send up to 10 reports an hour.'],
    cta: null,
  },

  // ───────────── organizations ─────────────
  {
    id: 'organizations',
    group: 'orgs',
    icon: 'bi-building',
    tone: 'tone-violet',
    title: 'Set up an organization',
    summary: 'Give your campus, office or venue its own private lost & found space and invite your team.',
    audience: ['admins'],
    steps: [
      { title: 'Create it', text: 'Choose a name and type (campus, office, transit hub, venue, hotel), plus a map center and default alert radius.' },
      { title: 'Invite people', text: 'From Members, invite people by email with a role. The link is valid for 7 days.' },
      { title: 'They accept', text: 'Invitees open the link, sign in and verify their email to join.' },
      { title: 'Start reporting', text: 'Reports posted in the organization are only visible to its members.' },
    ],
    example: {
      title: 'Opening a hotel lost & found',
      scenes: [
        { who: 'Manager', tone: 'tone-warning', text: 'Creates “Harbour Hotel” as a Hotel, centered on the lobby, with a 250 m radius.' },
        { who: 'Manager', tone: 'tone-warning', text: 'Invites the front-desk team as Staff and the housekeeping lead as Admin.' },
        { who: 'Front desk', tone: 'tone-info', text: 'Accepts the invite and logs the first found item, a phone charger from room 214.' },
      ],
      outcome: 'Guests who lose something at the hotel can be matched with the desk’s found items.',
    },
    tips: [
      'If invitation emails don’t arrive, admins can copy the invite link from the Members page and share it directly.',
      'Pending invitations can be revoked at any time.',
    ],
    cta: { label: 'Create organization', to: '/orgs/new' },
  },
  {
    id: 'roles',
    group: 'orgs',
    icon: 'bi-people',
    tone: 'tone-secondary',
    title: 'Roles & team management',
    summary: 'Who can do what, and how to change roles or remove people.',
    audience: ['admins'],
    steps: [
      { title: 'Member', text: 'Reports and browses the organization’s items, and chats.' },
      { title: 'Staff', text: 'Also uses the command center, changes any report’s status, links and confirms matches, and registers organization assets.' },
      { title: 'Admin', text: 'Also invites people, changes the roles of those below them and edits settings.' },
      { title: 'Owner', text: 'Full control, including managing admins and deleting the organization.' },
    ],
    example: {
      title: 'A staff member changes teams',
      scenes: [
        { who: 'Admin', tone: 'tone-warning', text: 'Promotes a Member who now works the lost-and-found desk to Staff.' },
        { who: 'Admin', tone: 'tone-warning', text: 'Removes a Staff member who has left the company.' },
        { who: 'Owner', tone: 'tone-lost', text: 'Promotes the new site manager to Admin. Only the owner can manage admins.' },
      ],
      outcome: 'Everyone has exactly the access their job needs.',
    },
    tips: [
      'People can only change or remove those ranked below them.',
      'Any member except the owner can leave an organization on their own.',
      'Deleting an organization permanently removes all its reports, matches and asset tags.',
    ],
    cta: { label: 'Manage organizations', to: '/orgs' },
  },
  {
    id: 'command-center',
    group: 'orgs',
    icon: 'bi-broadcast',
    tone: 'tone-info',
    title: 'Run the desk from the command center',
    summary: 'One live screen for staff to triage reports, review matches and coordinate returns.',
    audience: ['staff'],
    steps: [
      { title: 'Check the numbers', text: 'See how many reports are open or under review, and how many items were returned in the last 30 days.' },
      { title: 'Triage incidents', text: 'Filter reports and change a status inline. The reporter is notified.' },
      { title: 'Work the matches', text: 'Confirm, dismiss or complete matches, and schedule handovers.' },
      { title: 'Check proximity flags', text: 'Lost and found items of the same category close to each other that aren’t linked yet. Link them in one click with Link as match.' },
      { title: 'Use the live map', text: 'See every active report, with each lost report’s alert radius.' },
    ],
    example: {
      title: 'A morning at the campus desk',
      scenes: [
        { who: 'Staff', tone: 'tone-info', text: 'Sees 3 new found items overnight and sets the unclear one to Under Review.' },
        { who: 'Staff', tone: 'tone-info', text: 'A proximity flag pairs a lost water bottle with one found 80 m away. Clicks Link as match.' },
        { who: 'Found4', tone: 'tone-secondary', text: 'Alerts both the owner and the finder about the new match.' },
        { who: 'Staff', tone: 'tone-info', text: 'Schedules the handover at the front desk for noon.' },
      ],
      outcome: 'The queue is cleared before lunch, and every person involved is kept informed automatically.',
    },
    tips: ['Check proximity flags daily. They catch pairs that automatic matching missed, for example after a report was edited.'],
    cta: { label: 'Organizations', to: '/orgs' },
  },
]

export const HELP_FAQ = [
  {
    q: 'Who can see my report?',
    a: 'Reports in an organization are only visible to its members. Reports on the Public network are visible to anyone signed in.',
  },
  {
    q: 'Why haven’t I received a match?',
    a: 'Matches need the same category, the right timing, and a found item inside your alert radius (or a similar description if you didn’t drop a pin). Try a larger radius or a more detailed description in your next report.',
  },
  {
    q: 'Can someone see my phone number or email?',
    a: 'No. All contact happens through in-app chat. On QR tag pages, the owner’s identity is never shown.',
  },
  {
    q: 'I can’t accept an invitation.',
    a: 'Make sure you are signed in with the email address the invitation was sent to and that it is verified. Invitations also expire after 7 days, so ask an admin for a new one if needed.',
  },
  {
    q: 'What’s the difference between Claimed and Resolved?',
    a: 'Resolved means the case is closed, and it is set automatically when a match is marked as returned. Claimed is an optional status that the reporter or staff can set by hand.',
  },
]
