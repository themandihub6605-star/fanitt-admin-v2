# Fanitt Admin Panel

The admin panel for Fanitt (React 18 + Vite + TypeScript + Tailwind). It talks to the Fanitt backend (`/api`) and only lets in accounts with the `admin` role. The backend checks that role again on every `/admin` request.

---

## 1. Setup

Requires Node 18 or newer.

```bash
npm install
cp .env.example .env      # then fill in the values (same ones you already use)
npm run dev               # http://localhost:5174
```

| Variable | What it is |
|---|---|
| `VITE_API_BASE_URL` | Backend API, e.g. `https://api.fanitt.com/api` |
| `VITE_FIREBASE_*` | Firebase web config (unchanged from before) |

The backend's `CLIENT_URLS` must include the admin panel's address (for example `https://admin.fanitt.com`). Without it, CORS blocks every request.

## 2. Build and deploy

```bash
npm run build             # type-checks, then writes dist/
npm run preview           # serve dist/ locally to check it
```

Upload `dist/` to the same hosting you use today. Because it's a single-page app, every unknown path must serve `index.html` (on Netlify/Vercel/Render, use a "rewrite all to /index.html" rule).

## 3. Backend changes (needed for tracking)

The new Dashboard comparisons, the **Insights** pages, the new management pages (Reviews, Stories, Gifts & donations, Sessions & bookings, Applications, Wallets, Community chat, Legal pages, community members, dispute history, the user 360° view), **Activity**, **Audit log**, **Login activity** and **System health** read from a new backend module. Everything else in the panel works without it, and those pages show a clear notice until it's deployed.

Copy `backend-changes/src/monitor/` into your backend's `src/`, then add these lines to `src/routes/index.js`:

```js
// right after: const router = express.Router();
const monitor = require('../monitor');
router.use(monitor.tracker);

// before: router.use('/admin', require('./admin.routes'));
router.use('/admin/monitor', monitor.routes);
```

`backend-changes/src/routes/index.js` is a complete copy with these lines already added. If your own `routes/index.js` has changed since, add the lines by hand rather than replacing the file.

What the module does:

| Part | What it does |
|---|---|
| `monitor/tracker.js` | Watches every API request after it finishes. It never changes a request or response, and its errors are ignored. It records: **admin changes** (POST/PUT/PATCH/DELETE by an admin), **sign-ups/logins/failed logins**, **5xx errors** and **"Route not found"** calls (grouped per endpoint), and **request counts per hour**. Passwords, tokens, OTPs and bank/card fields are masked before anything is stored. |
| `monitor/models.js` | 4 new collections: `adminauditlogs` (kept 1 year), `authevents` (180 days), `apiissues`, `apitraffics` (120 days). Old rows delete themselves (TTL indexes). |
| `monitor/monitor.controller.js` | Read-only admin API: `GET /api/admin/monitor/attention`, `overview`, `activity`, `audit-logs`, `auth-events`, `system`, `search`; plus `PATCH /issues/:id/resolve`. |
| `monitor/insights.controller.js` | Read-only admin API for the Insights pages: `GET /api/admin/monitor/leaderboards`, `finance`, `content`, `growth` (all take `?days=7|30|90|365`). Counted from existing collections, so they include full history. |
| `monitor/manage.controller.js` | Admin API for the management pages: `GET reviews`, `PATCH reviews/:id` (hide/show), `GET stories`, `DELETE stories/:id`, `GET gifts`, `GET sessions`, `GET sessions/:id/bookings`, `POST sessions/:id/cancel`, `GET bookings`, `GET applications`, `GET wallets`, `GET community-content`, `DELETE community-content/:kind/:id`, `GET communities/:id/members`, `GET disputes/history`, `GET legal`, `PUT legal/:slug`, `GET users`, `GET users/:id/overview` (all under `/api/admin/monitor/`). |
| `monitor/monitor.routes.js` | All routes above, behind `protect` + `authorize(admin)`. |

Existing collections, routes and API responses are unchanged. Nothing is migrated.

**Already deployed the monitor folder before?** Copy these 4 files into `src/monitor/` — `routes/index.js` needs no change:

| File | |
|---|---|
| `monitor/manage.controller.js` | **NEW** |
| `monitor/monitor.routes.js` | REPLACE (adds the manage routes) |
| `monitor/monitor.controller.js` | REPLACE (money in now includes store sales; all-time totals; "flagged reviews" links to the new Reviews page) |
| `monitor/insights.controller.js` | REPLACE (money in now includes store sales) |

Notes on the new actions:
- **Cancel session** marks the session and its bookings cancelled and sends everyone who booked, plus the creator, an in-app notification, a push and an email. The backend has no automatic Razorpay refund, so the panel lists every paid booking with its Razorpay payment ID to refund from the Razorpay dashboard.
- **Legal pages** writes `src/content/legal/<page>.txt` on the server (the old text is kept as `<page>.previous.txt`), and the app and website show it straight away. If your host rebuilds from Git on every deploy, also commit the downloaded `.txt` so the next deploy keeps it.
- **Remove comment** deletes the comment and its replies and fixes the post's comment count. **Remove chat message** hides it (`isRemoved: true`).

**Tracked data starts when you deploy.** Logins, admin actions and API errors that happened before that were never stored, so they can't be shown. The pages say "recording since …" so it's clear where the history begins. Sign-ups, posts, payments, orders and the other activity-feed items come from the existing collections, so they include full history.

## 4. What changed in the panel

### Latest update (premium layout)
- **New shell:**
  - **Dark sidebar** with Favorites tiles, grouped menu, a glowing active item, an "Action queue" meter and the admin card with logout.
  - **New top bar:** search pill (Ctrl K), Explore and Apps menus, a **Quick create** menu, theme toggle, full screen, bell and profile chip.
  - A **title + breadcrumb band** under the top bar, and a footer.
- **Cleaner pages:**
  - Plain title + one-line summary.
  - Filter bars sit in their own card.
  - KPI cards show an icon, a trend pill, a big number and 8 small bars of the trend.
  - Summary strips are joined cards with dividers.
  - Crisper 12px corners, and a dark dashboard hero with an orange glow and a Live badge.

### Complete panel
- **Next-level UI:**
  - Cards fade up one after another and lift on hover.
  - Gradient primary buttons, and an icon tile plus section label on every page header (taken from the sidebar automatically).
  - Soft violet background glow, better empty states.
  - Tables: sticky headers, a compact/comfortable row toggle that's remembered, and, on phones, every table turns into easy-to-read cards.
- **New pages** for app features the panel didn't have:
  - **Stories:** a 9:16 grid of live and expired stories. Watch any story full-screen, remove it.
  - **Reviews** (replaces "Reviews & moderation"):
    - Search, and filters for visible, flagged, hidden, rating and type.
    - Rating breakdown and sub-ratings.
    - Hide and show again.
    - The old page mixed in sessions and campaigns; those now have their own pages.
  - **Sessions & bookings:**
    - Every session with host, time, status, seats booked and money collected.
    - A side drawer with everyone who booked.
    - **Cancel with a reason.** Everyone is notified, and you get the list of payments to refund.
    - A Bookings tab.
  - **Campaign applications:** each creator's pitch, quote, delivery time, portfolio links and the brand's decision, plus acceptance rate.
  - **Gifts & donations:** gifts, session donations and FanBox tips in one list, with totals, top supporters and the creators who received the most.
  - **Wallets:** money sitting in users' wallets, pending withdrawals and amounts paid out.
  - **Community chat:** comments and chat messages across communities, with search and remove. You can also filter to one community.
  - **Legal pages:** edit and preview the Privacy Policy and Terms of Use, then publish.
- **Existing pages completed:**
  - **User detail:** a new **360° view** shows earned, spent, wallet, paid out, posts/reels/stories, sessions, communities, rating, store, sign-ins and failed attempts, and the latest payments.
  - **Communities:** a **Members** drawer shows active and paid members, plans, earnings and posts, with a link to that community's comments and chat.
  - **Payment disputes:** a "Decided disputes" history showing the outcome, the split, the admin note, and who decided and when.
  - **Posts:** a **grid view**, with media first, likes, comments and quick edit/delete, alongside the list view.
- **Smaller bundle:** only the three icon weights we use are bundled (`src/icons/paths.ts`). If you add an icon to `src/icons/index.tsx`, run `npm run icons`.

### Previous update
- **Page-stuck bug fixed.** Before, after opening some pages (e.g. Fanitt Store), clicking another sidebar link changed the URL but the old page stayed on screen until you refreshed. The page-exit animation never finished; it's removed. All 33 sidebar links were tested by clicking, with no reload.
- **New look:** **Geist** font (Geist Mono for IDs/code), Fanitt **orange** (`#FF5A1F`, same as the logo) as the primary colour with the orange → pink brand gradient, and premium **Phosphor** icons (duotone) in place of lucide.
- **Light mode by default**, with a sun/moon toggle in the top bar (also in the profile menu). Dark mode is fully styled.
- **Background pictures removed.** The picker, the image layer and `BackgroundContext` are gone.
- **Collapsible sidebar:** the panel icon next to "Admin" shrinks it to icons only, and it remembers your choice.
- **Dashboard hero:** a gradient header with the period switch, 4 headline numbers and shortcuts to the Insights pages. KPI numbers count up.
- **New "Insights" section:**
  - **Finance center:** money in, platform commission and take rate, paid out, payouts waiting, refunds, failed payments, store and shop sales, a daily money-flow chart, money in by type, commission by source, refunds and failures by type, and a 12-month chart and table with a **Monthly report** CSV download.
  - **Growth funnel:** of this period's sign-ups, how many finished onboarding, got verified, posted, paid and earned; how many came back; sign-ups per day; and sign-ups by account type and by method.
  - **Content analytics:** posts, reels, stories, community posts, likes, average likes per post, reel views, publishing per day, most active posters, and review ratings for the period and all-time.
  - **Leaderboards:** top earning creators, top spenders, most followed, most viewed profiles, top posts, top reels, biggest communities and top stores. Each one links to the person's profile.
  - Every Insights page has a 7d / 30d / 90d / 1y switch and a refresh button.

### From the previous update
**Design system** (`src/components/AdminUI.tsx`)
- Light design with white cards and thin borders. Font, colour and icons are as described in "Latest update" above.
- New shared pieces: `KpiCard` (value, % change vs the previous period, sparkline, drill-down link), `DataTable` (sorting, search, paging, row selection, CSV export), `Drawer`, `Dialog`, `confirmDialog()` / `promptDialog()`, `toast`, `StatusBadge`, `Avatar`, `Notice`, `Skeleton`, loading/empty/error states, and `fmt` helpers for ₹, dates and "5m ago".
- Every page already built on this kit, so every page picked up the new look.

**Layout** (`src/layouts/AdminLayout.tsx`, `src/layouts/nav.ts`)
- Sidebar grouped by job: Overview · Insights · Action center · Users & accounts · Content & moderation · Commerce · Finance · App & website · System & security. Live count badges show what needs action, and they refresh by themselves after you approve or pay something.
- Top bar with a breadcrumb, a **global search** (Ctrl/⌘ K) that finds pages *and* real users, campaigns, communities, stores and transaction IDs, a **bell** listing everything waiting for action, and a profile menu (dark mode, change password, log out).
- One shared layout, so the sidebar no longer reloads on every click. Pages are lazy-loaded, which cut the main bundle from 1.79 MB to 0.48 MB.

**New pages**
- **Dashboard**:
  - A "needs your action" strip.
  - KPI cards with 7/30/90-day comparisons: new users, active users, money in, commission, posts & reels, campaigns, store/shop orders, failed payments.
  - Charts: sign-ups vs logins per day, user mix, daily money in, money on hold.
  - Recent admin actions, API health for the last 24h, and the existing all-time monthly revenue and subscription mix.
- **Activity**: one timeline of sign-ups, logins, failed logins, posts, community posts, communities, campaigns, payments, withdrawals, reviews, store and shop orders, and admin actions, with filters and counts.
- **Audit log**: every admin change, searchable by admin, area or result, with a detail drawer showing the data sent. Exports to CSV.
- **Login activity**: sign-ins and failed attempts from the app, website and admin panel. Exports to CSV.
- **System health**: requests, 5xx errors, error rate, average response time, server uptime/memory/database status, and a list of every failing endpoint and missing route, with "mark fixed".
- A real **404** page inside the panel.

**Upgraded pages**
- **Transactions**: sortable table, every transaction type labelled (gift, posting fee, subscription and extra proposal fee were missing before), CSV export, side drawer with the full breakdown and a copyable ID.
- **Withdrawals**: search, totals (requested / net to pay), CSV export for doing bank payouts, copy-payout-details button, success messages.
- **Users**: "Export this page" to CSV. Reinstating a user now asks for confirmation.
- **User detail**: new "Recent sign-ins" and "Admin changes to this account" panels. Suspend/reinstate use proper dialogs.
- **All pages**: the browser's `confirm()` / `prompt()` boxes are replaced by in-app dialogs with clear titles and red styling for destructive actions. This covers campaigns, withdrawals, disputes, notifications, communities, posts, users, moderation, banners, store KYC, products, affiliate, calls and the live-meet viewer.
- **Login**: new design, real error messages (before, it showed "Request failed with status code 401"), a "your session ended" notice after expiry, and a non-admin account is signed out instead of staying stuck.
- Friendlier error text everywhere: offline, 403, 404 and 5xx each say what happened.

**Kept exactly as before:** every route and URL, all API calls and contracts, authentication (token + refresh), the Firebase config, the theme toggle, the Store section with its tabs, and all page features.

## 5. Notes

- **Admin roles:** the backend has one role, `admin`, and every admin can do everything. The panel doesn't invent finer permissions, because hiding buttons without backend checks wouldn't be real security. If you want "moderator" or "finance" admins, that needs a backend change first. The new audit log already shows who did what.
- **Rate limit:** the backend's general limiter is 300 requests per 15 minutes per IP. Normal use is far below that (the dashboard refreshes once a minute), but several admins behind one office IP opening many pages quickly could hit it. If so, raise the limit for `/api/admin` in `rateLimiter.middleware.js`.
- **Verified in this delivery:**
  - `npm run build` passes.
  - Every route was opened in a real browser against a running backend with test data, at desktop and phone width, with no runtime errors and no sideways scrolling on phones.
  - Every sidebar link (40 pages) was clicked in turn (client-side navigation, no reload), and every page rendered.
  - The new actions were tested in the browser: hide/show review, cancel a session (bookings cancelled, notifications created, refund list shown), the members drawer, legal edit/preview/undo, Ctrl K to new pages, compact rows and sidebar collapse.
  - The Insights pages were checked in light and dark mode at 1440px and 390px wide.
  - Tested by hand: login (wrong and right password), Ctrl K search (users and stores), the bell, mark-paid and reject dialogs, CSV export, the audit drawer, and dark mode.
  - The monitor API was tested end to end: login and failed login were recorded, an admin change was recorded with the password masked, and a missing route and a 500 were grouped.
