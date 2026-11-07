# Hermes Auctions — Build Plan & TODO

Working branches:
- `streambet_web` and `streambet_api`: `non_pro_stag`. Every push to `non_pro_stag` deploys staging.
- `cardcade-contracts`: `feat/hermes-auctions`. Your unpushed `main` commit is left alone.

Check items off as they ship. If a decision changes, update the **Decisions** section first.

**Status (2026-11-07):** live on **staging and prod**. Card + ACH only on prod (USDC stays off until the escrow is on mainnet). Media uploads are verified on both, and both now write to `cardcades3prod`. Items that need someone with AWS access:
1. **SES:** both environments get `535 Authentication Credentials Invalid`. Create credentials in us-east-1 with the **IAM user** option under SES → SMTP settings, not Mail Manager. The app connects to `email-smtp.us-east-1.amazonaws.com:465`, which only takes IAM-based SMTP credentials. Until fixed, email sign-ups can't verify; Google sign-up works.
2. Fund the devnet deployer, then deploy + initialize the escrow (Phase 5). This turns on USDC on staging.
3. Add the CloudFront SPA fallback on staging (Phase 9). This makes deep links load there; prod already has it.

Test bidders on staging (SES simulator, no real mail): `hermes_bidder1`, `hermes_bidder2`, `hermes_bidder3` (`success+hermes-bidderN@simulator.amazonses.com`).

## Decisions (locked 2026-11-01)

| Topic | Decision |
|---|---|
| Who hosts | Admins only (Hermes / us). No seller auctions. House accounts can't bid. |
| Who bids | Open sign-up. Anyone can browse `/auctions` logged out; an account (email or Google) is required at the first bid. The analytics dashboard stays admin-only. |
| Where | `/auctions` on the current site. Hermes branding applies **only** to auction pages, the landing-page "Featured" section, and auction emails. Everything else stays collectIQ. |
| Categories | Sports Cards · TCG · Sports Memorabilia |
| Length | 7 / 14 / 21 days, or custom end date + time (1 hour to 60 days). Admin picks the start; the form shows the computed end live. |
| Reserve | Optional. Bidders see "Reserve met" or "Reserve not met", never the amount. |
| Admin views | Live · Upcoming · Settled. Users see Live + Upcoming. |
| Est. Value | Admin chooses "Pull it for me" (identify from photos, then comp valuation, then the admin accepts or edits) or enters it manually. Shown publicly as "Est. Value". |
| Media | Multiple photos (reorderable, first is the cover). Video: upload MP4/MOV/WebM (≤500 MB) to S3 and/or paste a YouTube/Vimeo link. |
| 3D | Skipped for v1. devpika.art doesn't exist. Revisit with a built-in card flip / 360 spin. |
| Fees | **Zero-fee: no buyer premium.** The buyer pays a flat per-auction shipping amount. Card payers also pay processing (grossed up for 2.9% + $0.30). ACH and USDC pay no processing. |
| Card / ACH | Stripe. The method is saved once (hosted Checkout, setup mode) and charged off-session at close. Holds aren't used because card authorizations expire after 7 days and auctions run 7–21. |
| Crypto | USDC on Solana with **on-chain escrow**, in a **new `hermes-auctions` program** (devnet). Escrow must cover max bid + shipping. Outbid, unsold, or cancelled → refunded automatically. Win → hammer + shipping go to the treasury and the rest is returned. |
| Est. Value visibility (2026-11-03) | Per auction, "Show Est. Value to bidders" (default on). When off, the value is never sent to bidders; admins still see it. Can change any time. |
| Seller name (2026-11-03) | Bidders see "Sold by …" on cards and the auction page. Blank = **Hermes Auctions** (the house); admins can enter a consignor name (≤80 chars). Can change any time. |
| Payment options (2026-11-03) | Per auction, the admin picks **Fiat** (card + bank), **Crypto** (USDC), or **Both** (default). Locked once bidding opens. Crypto-only is refused while the USDC escrow isn't live. Bidders only see the allowed methods; single-rail lots show a "Card & bank only" / "USDC only" badge. |
| Anti-snipe | A bid in the final 60 seconds extends the end to now + 60 seconds (no cap). |
| Increments | $1 under $25; $5 under $100; $10 under $250; $25 under $500; $50 under $1k; $100 under $2.5k; $250 under $5k; $500 under $10k; $1k under $25k; $2.5k under $50k; then $5k. |
| Failed payment | 48-hour grace window to pay via hosted Checkout. Then the next-highest bidder who hasn't declined is charged their own max. Never loops. |

## Phase 0 — Prep & safety ✅
- [x] Staging `auctions` table was empty, so there was nothing for the boot sweeper to charge.
- [x] Staging = **devnet**. Backend authority = `E4LW3c9SMgLAZRMSaVpHcajnV1mHkCZt6FXvhm9L23Fo` (it has devnet SOL). Read from `GET /api/auctions/config`.
- [x] Anchor 0.31.1 installed in WSL at `~/anchor-0.31.1/bin/anchor`.

## Phase 1 — API data model ✅
- [x] Migration `AddHermesAuctions20261101120000`: standalone fields, media, est. value, shipping, length preset, settlement + fulfillment fields, `declined_user_ids`, `onchain_auction`; drops the 1/3/5/7 CHECK. **Applied on staging.**
- [x] `auction_bids.funding_method` / `crypto_wallet`.
- [x] `auction_crypto_deposits` table + entity.
- [x] Status → bucket mapping (`hermes.types.ts`).

## Phase 2 — API auction lifecycle ✅
- [x] Admin create/edit. Terms (price, reserve, shipping, timing) lock once live.
- [x] Durations: presets or custom, validated for 1 hour to 60 days.
- [x] Zero premium, flat shipping, card pass-through (`hermes.pricing.ts`). CadeCoins removed.
- [x] Increment ladder.
- [x] Fixes:
  - Stripe idempotency keys
  - conditional close claim (no double charge)
  - runner-up never loops
  - 3DS / ACH reconciliation sweep (every 10 minutes)
  - admin winning amount
- [x] Public / bidder / admin routes (`auctions.controller.ts`, `admin-auctions.controller.ts`).
- [x] Stripe webhook on the existing `/api/payments/webhook`, plus pull-based confirmation. Staging test endpoint now also sends `payment_intent.succeeded` and the `checkout.session.async_payment_*` events.
- [x] Sign-up re-enabled (email + Google). `/emails/:type` is now admin-only (`AdminRoleGuard`).
- [x] Hermes email template (`hermes_auction_notice`): outbid, closing soon, won, action needed, lost, shipped, admin sold.
- [x] Sockets: anonymous viewers can join; masked handles only.

## Phase 3 — Est. Value ✅
- [x] `POST /admin/auctions/estimate/identify`: photos → subject. `POST /admin/auctions/estimate/value`: subject → comps + recommendation. Cards use ValuationService; memorabilia uses web research (`claude-opus-5-5`).

## Phase 4 — Media ✅
- [x] `POST /admin/auctions/media/:kind`: multer to disk, then streamed to S3 (images ≤15 MB, video ≤500 MB).
- [x] YouTube / Vimeo links normalized to privacy-friendly embeds.

## Phase 5 — Contract: `hermes-auctions` escrow
- [x] Program `BNHMW9ZTzqRsRsKi9DUt8i5T4PFDFGRevPcHCQpvkuTu`, with 41 tests passing.
- [x] IDL shipped to the API (`src/auctions/idl/hermes_auctions.json`).
- [ ] **Deploy to devnet + initialize.** Blocked: the deployer `2qSYLNDy4HSFEusnS7ZMm6mLqpyLMzJU2TD2aviFiE2w` needs ~5 devnet SOL, and the public faucet is rate-limited. Fund it at https://faucet.solana.com, then run from WSL in `cardcade-contracts`:
  `bash scripts/deploy-hermes-devnet.sh E4LW3c9SMgLAZRMSaVpHcajnV1mHkCZt6FXvhm9L23Fo`
  The API turns USDC on by itself within about a minute of the config existing.

## Phase 6 — API crypto escrow integration ✅ (code) / ⏳ (live test after Phase 5)
- [x] Lazy `open_auction`, server-built deposit tx with a wallet-signed memo, on-chain balance verification, escrow ≥ max + shipping, refund / settle, and the reconcile sweeper.
- [ ] Live devnet test: deposit → outbid refund → settle with remainder.

## Phase 7 — Web: Hermes brand + public pages ✅
- [x] Transparent logo + mascot mark (`public/hermes/`). Lime `#C7FA09`.
- [x] `/auctions` (Live / Upcoming + categories), `/auctions/:id` (gallery + video + lightbox, bid panel, live socket updates, bid history), `/auctions/:id/pay`, `/auctions/me`, `/signup`.
- [x] Landing page "Featured on Hermes Auctions" rail.
- [x] Bid flow: Bank / Card / USDC picker, Stripe setup redirect, max-bid with "most you'd pay", confirm dialog, shipping address capture.
- [x] Google sign-up returns the bidder to the auction they came from.

## Phase 8 — Web admin ✅
- [x] Hermes Auctions tab on `/analytics` (deep link `?tab=auctions&auction=<id>`):
  - Live / Upcoming / Settled lists
  - create/edit form: photos, video upload + link, 7/14/21/custom length with computed end, start now / schedule, reserve, shipping, est. value pull or manual, featured
  - detail: bids, USDC escrows, winner, payment, mark shipped, close now / cancel

## Phase 9 — Staging rollout & QA
- [x] Migration on staging.
- [x] Stripe test webhook events.
- [x] API pushed and deployed.
- [x] Web pushed and deployed (https://stag.cardcade.fun).
- [ ] **CloudFront SPA fallback on the staging distribution.** Deep links (`/auctions`, `/login`, `/auth/verify-email`, …) return S3 403 XML on staging; prod is already configured. In the CloudFront console → staging distribution → Error pages, add 403 → `/index.html` (200) and 404 → `/index.html` (200). Alternatively, grant `GHDeployer` `cloudfront:GetDistributionConfig` + `cloudfront:UpdateDistribution` and the deploy workflow configures it itself.
- [x] E2E (API, Stripe test mode):
  - card win, charged $41.51 = $35 + $5 shipping + $1.51 processing
  - reserve gating
  - proxy war
  - min increment
  - house can't bid
  - non-admins blocked
  - no double charge
  - decline → runner-up at their max, decliner excluded
- [ ] E2E in the browser on staging: ACH bank link (Stripe test bank), 3DS card (`4000 0027 6000 3184`), USDC after Phase 5.

## Phase 10 — Prod rollout (2026-11-03)
- [x] Migrations `AddHermesAuctions`, `AddAuctionAcceptedPayments` and `AddAuctionDisplayOptions` applied on `cardcade-prod`. They're additive, and prod had no auction rows.
- [x] API: streambet_api #494 (Hermes) and #495 (upload ACL retry + clearer errors). Web: streambet_web #667. `/auctions`, `/auctions/me` and `/signup` load on cardcade.fun.
- [x] Live Stripe webhook `api.cardcade.fun/api/payments/webhook`: added `payment_intent.succeeded` and `checkout.session.async_payment_succeeded` / `_failed`, matching staging. These also fix shop ACH orders settling.
- [x] Prod `/api/auctions/config`: crypto disabled (mainnet), 0% premium.
- [x] Media upload verified on staging and prod (2026-11-07): upload succeeds and the file loads publicly.
- [ ] Prod SES (see Status).
- [ ] **Legal sign-off on card surcharging**, now that it's live (see Risks).

## Risks / notes
- **Card surcharging:** the card network cap is 3%, the fee must be disclosed, debit cards can't be surcharged, and some states restrict surcharges. Get legal sign-off before prod.
- **On-chain privacy:** USDC deposits are public on Solana, so a USDC bidder's escrow (≥ their max) is visible. The UI says so.
- **Program isolation:** `cardcade-marketplace` is untouched. `hermes-auctions` stays devnet-only until prod sign-off (prod needs its own deploy + SSM values).
- **Stale tests:** `tests/cardcade-marketplace.ts` still calls the removed `listCard` / `primarySale`, so 7 tests fail. These failures were already there.
- **Hygiene, outside auctions scope:**
  - `streambet_api/.env.backup-2026-10-09` holds commented-out prod secrets.
  - `.dockerignore` doesn't exclude `.env*`.
  - `POST /api/assets/file/upload/*` has no auth or size limit.
  - `.env.staging`'s AWS keys are invalid (rotated?).
