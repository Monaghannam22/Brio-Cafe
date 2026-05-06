# Brewo / Brio Cafe — Project Plan

A running record of what has shipped, what is open on the Firebase Console
side, what could come next, and how it all relates to Vercel deployment.

---

## 1. Status — committed and deployed

### 1.1 Login page & guest flow
- Sign-in stayed name + office + phone (no email/password — those were
  removed at request).
- Office input is 3-digit (`1–512`); the floor selector keeps only
  **B1** and **GF** (their room numbers overlap). Floors 1–5 are
  auto-derived from the 3-digit office.
- Tenant hint moved directly under the office number; only
  directory-listed offices are accepted.
- Floor + room shown as "Floor 4 — Office 12" / "بدروم B1 — مكتب 7"
  everywhere (UI + WhatsApp message).
- "Please fill in your information / يرجى تعبئة بياناتك" prompt above
  the form.
- Theme + language buttons spaced apart on login and top nav.
- Site always opens on the guest home page even after a previous
  logout (sticky-logout flag wiped on load).
- Auto-confirm: a guest who taps "Confirm Order", signs in, and
  submits the login form has the order auto-fired immediately after
  login.
- Hidden for guests: sidebar logout, settings logout, edit-account
  card, statistics card, "Office X" line under the guest name,
  **My Previous Orders** nav.

### 1.2 Office directory
- Added B1 (1–12) and GF (1–19) tenants.
- Updated and trimmed floors 1–5 (uncertain rooms removed; 109 long
  name; 405 → "Accounting & Legal Services"; 412 = SBody Men;
  506–507 = BETO Keratin; 407 ↔ Folowise).

### 1.3 Settings page (logged-in user)
- Phone row removed from the "info" card.
- Region row → "عمّان — الأردن" / "Amman — Jordan".
- Centered "Folowise" line at the bottom.

### 1.4 Theming, motion, and polish
- **Dark mode** via `data-theme="dark"` attribute on `<html>`,
  persisted in `localStorage`, with a sun/moon toggle next to the
  language pill on both login and top nav.
- **Steam hover** on coffee/tea/Nescafe cards (water excluded).
- **Button bounce**, **fly-to-cart**, and a **soft WebAudio click
  sound** on add-to-cart.
- **Order banner** copy: "Order processing / جاري تجهيز طلبك".
- Arabic CTA: "اطلب الان" instead of "اطلب هلق" on home hero and
  last-section CTA.
- Nescafe drink-card icon replaced with an inline red-mug SVG.
- All animations respect `prefers-reduced-motion`.

### 1.5 Firebase integration
- New file: `firebase.js` (ES module, loaded via
  `<script type="module" src="./firebase.js">` in `<head>`).
- Imports SDKs from gstatic CDN — **no npm/bundler step added**.
- Auto **anonymous sign-in** on load; `browserLocalPersistence` keeps
  the session across reloads.
- `users/{uid}` mirror written when `doLogin` succeeds (name, office,
  floor, phone).
- `orders/` doc written best-effort after `confirmOrder` succeeds,
  tagged with `userId`.
- `getUserOrders()` exposed; `syncOrdersFromFirestore()` merges remote
  orders into the local cache on app init and every time the orders
  page opens.
- Public API: `window.brewoFirebase = { ready, signUp, signIn,
  signOutUser, onAuthChanged, getCurrentUser, saveOrder,
  saveUserProfile, getUserOrders }`.

---

## 2. Open items (Console-side, not code)

These cannot be done from the repo — they're Firebase-Console actions.

1. **Authentication → Sign-in method → Anonymous → Enable**
   (required, otherwise every Firestore write fails).
2. **Authentication → Settings → Authorized domains** → add:
   - `monaghannam22.github.io` (GitHub Pages)
   - `brio-cafe-fo7a.vercel.app` (or whatever Vercel URL is current)
   - any custom domain pointed at the site.
3. **Firestore Database → Rules** → publish:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId} {
         allow read, write: if request.auth != null
                            && request.auth.uid == userId;
       }
       match /orders/{orderId} {
         allow create: if request.auth != null
                       && request.resource.data.userId == request.auth.uid;
         // Allow idempotent retries (saveOrder uses setDoc+merge with the
         // app order id), but the userId on the doc must not change.
         allow update: if request.auth != null
                       && resource.data.userId == request.auth.uid
                       && request.resource.data.userId == request.auth.uid;
         allow read:   if request.auth != null
                       && resource.data.userId == request.auth.uid;
       }
     }
   }
   ```

4. **Firestore composite index** for the orders sync query
   (`where userId == … orderBy createdAt desc`). The first call to
   `getUserOrders()` will fail with `failed-precondition` and log a
   one-click console URL — open it and click **Create index**. Until then
   `syncOrdersFromFirestore` shows the new "sync unavailable" toast and
   falls back to local-only orders.

5. **Verify**: open the site, place a test order, then check
   `Firestore Database → Data` — there should be one doc in `orders`
   (using the app order id, e.g. `BRXXXX99`) and one in `users`.

---

## 3. Possible next steps (not started)

- Real email/password login (re-add the fields and `signIn` / `signUp`
  calls in `doLogin`).
- Replace the local `orders` array reads with Firestore reads in
  `renderOrders` / `updateSettingsStats` so the user's history follows
  them across devices.
- Optional Google sign-in provider.
- Sync the cart through Firestore so it survives device switches.
- Admin dashboard view (`page-admin`) that lists orders from Firestore
  for staff.
- A small backfill: locally-saved orders from before Firebase was
  wired are still only on that device; we could push them up on first
  sign-in.

---

## 4. Vercel deployment notes

**No build/config changes needed.** Specifically:

- The repo doesn't have a `vercel.json`. Vercel just runs
  `npm run build` (which is `vite build`) and serves the output. The
  new `firebase.js` is a plain static file — Vite copies it through.
- The `<script type="module" src="./firebase.js">` reference is a
  relative path; works on any host.
- Firebase SDK is loaded from `gstatic.com` at runtime — no bundle
  weight, no environment variables required at build time.

**One Vercel-specific gotcha**: Vercel deploys to a different domain
than GitHub Pages, so:

- The Firebase **Authorized domains** list must include the Vercel
  domain. If it's missing, every Firebase auth call on the Vercel
  build will fail with `auth/unauthorized-domain`.
- The Open Graph image in the HTML (`og:image`) points at
  `https://brio-cafe-fo7a.vercel.app/og-image.png`. If the Vercel URL
  changes or Vercel is dropped, update or remove that meta.

**Optional**: if Vercel becomes the canonical deploy, add a
`vercel.json` that pins the Node version and output. Otherwise the
defaults are fine.
