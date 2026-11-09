# Hermes Auctions — Build Plan & TODO

Working branches:
- `streambet_web` and `streambet_api`: `non_pro_stag`. Every push to `non_pro_stag` deploys staging.
- `cardcade-contracts`: `feat/hermes-auctions`. Your unpushed `main` commit is left alone.

Check items off as they ship. If a decision changes, update the **Decisions** section first.

**Status (2026-11-08):** live on **staging and prod**. Card + ACH only on prod (USDC stays off until the escrow is on mainnet). Media uploads are verified on both, and both now write to `cardcades3prod`. The main domain is moving to **collectiqapp.xyz** (Phase 14). Open items:
1. **SES:** sending works (2026-11-08): `collectiqapp.xyz` is a verified identity, `AWS_EMAIL_FROM` = `noreply@collectiqapp.xyz` on staging + prod, and a staging password reset went out via SMTP. **But the account is still in the SES sandbox**, so mail only reaches verified/simulator addresses, and email sign-ups can't verify for real users. Production access was denied, and the fix is Aaron replying on case `179418417300454` in the Support Center (Phase 14). Google sign-up works.
2. Fund the devnet deployer, then deploy + initialize the escrow (Phase 5). This turns on USDC on staging.
3. ~~Add the CloudFront SPA fallback on staging~~. Done 2026-11-08 (Phase 9).
4. ~~collectiqapp.xyz nameservers + Pika key~~. Done 2026-11-08. collectiqapp.xyz is live (Phase 14). Pika is live on staging, and prod is waiting on Aaron's go-ahead (Phase 12).

Test bidders on staging (SES simulator, no real mail): `hermes_bidder1`, `hermes_bidder2`, `hermes_bidder3` (`success+hermes-bidderN@simulator.amazonses.com`).

## Decisions (locked 2026-11-01)

| Topic | Decision |
|---|---|
| Who hosts | Admins only (Hermes / us). No seller auctions. House accounts can't bid. |
| Who bids | Open sign-up. Anyone can browse `/auctions` logged out; an account (email or Google) is required at the first bid. The analytics dashboard stays admin-only. |
| Where | `/auctions` on the current site. Hermes branding applies **only** to auction pages, the landing-page "Featured" section, and auction emails. Everything else stays collectIQ. |
| Standalone buyer site (2026-11-08) | Nick wants auctions on their own UI that can take a domain. Same build, second entry page `hermes.html`: there the marketplace is `/`, log in / sign-up are Hermes-branded, and there are no collectIQ or admin pages. The main site keeps `/auctions` and the landing-page rail. Sellers (admins) stay on the main site's `/analytics` for now. Attaching a domain is a second CloudFront distribution on the same bucket, plus `HERMES_WEB_URL` on the API. See `docs/HERMES_AUCTIONS_DOMAIN.md`. Preview anywhere with `?site=hermes`. |
| Marketplace (2026-11-08) | The buyer home has search (title, description and seller; every word must match), Live / Upcoming / **Ended** tabs, sorting (ending soonest, newly listed, price either way, most bids), filters (category, price range, and payment rail when USDC is live), filter chips and "load more" paging (24 per page). Filters live in the URL, so searches are shareable. The API is `GET /auctions?bucket&q&category&sort&minPrice&maxPrice&payment&limit&offset` and returns `{ data, total }`. "Ended" shows sold and unsold lots, never cancelled ones or ones still in a payment retry. |
| Categories | Sports Cards · TCG · Sports Memorabilia |
| Length | 7 / 14 / 21 days, or custom end date + time (1 hour to 60 days). Admin picks the start; the form shows the computed end live. |
| Reserve | Optional. Bidders see "Reserve met" or "Reserve not met", never the amount. |
| Admin views | Live · Upcoming · Settled. Users see Live, Upcoming and Ended (since 2026-11-08). |
| Est. Value | Admin chooses "Pull it for me" (identify from photos, then comp valuation, then the admin accepts or edits) or enters it manually. Shown publicly as "Est. Value". |
| Media | Multiple photos (reorderable, first is the cover). Video: upload MP4/MOV/WebM (≤500 MB) to S3 and/or paste a YouTube/Vimeo link. |
| 360° spin (2026-11-08) | Optional, per lot. The admin picks a front and a back photo. **Pika 2.5 Keyframe** (`pika/pikaframes/image-to-video` on dev.pika.art) gets `[front, back]` with `loop: true` and 3 s per half turn, which gives a seamless 6 s front → back → front loop at 1080p. Price: **$0.36 per spin**, charged only on success, from a prepaid Pika balance. The MP4 is copied to `hermes/spins/<job>.mp4` in the media bucket. The admin previews it and chooses whether to include it, and it's saved as an `upload` video with `spin: true`. Bidders see it muted on loop right after the cover, and the card shows a "360°" badge. See Phase 12. |
| Fees (changed 2026-11-08) | **Zero seller fee; 4% buyer premium** on the hammer (Nick's call; was 0%). Tagline is now "Zero-seller-fee collectibles auctions". The winner pays hammer + premium + flat per-auction shipping. Card payers also pay processing on that whole amount (grossed up for 2.9% + $0.30). ACH and USDC pay no processing. The rate is `BUYER_PREMIUM_PERCENT` in `hermes.pricing.ts`. Each auction stores its own `buyer_premium_percent` when it's created, so changing the constant never changes a listed lot. The USDC escrow must cover max + premium + shipping. Example: $35 hammer + $5 shipping = $41.40 by bank / USDC, or $42.95 by card. |
| Card / ACH | Stripe. The method is saved once (hosted Checkout, setup mode) and charged off-session at close. Holds aren't used because card authorizations expire after 7 days and auctions run 7–21. |
| Crypto | USDC on Solana with **on-chain escrow**, in a **new `hermes-auctions` program** (devnet). Escrow must cover max bid + the buyer premium on it + shipping. Outbid, unsold, or cancelled → refunded automatically. Win → hammer + premium + shipping go to the treasury and the rest is returned. |
| Est. Value visibility (2026-11-03) | Per auction, "Show Est. Value to bidders" (default on). When off, the value is never sent to bidders; admins still see it. Can change any time. |
| Seller name (2026-11-03) | Bidders see "Sold by …" on cards and the auction page. Blank = **Hermes Auctions** (the house); admins can enter a consignor name (≤80 chars). Can change any time. |
| Payment options (2026-11-03) | Per auction, the admin picks **Fiat** (card + bank), **Crypto** (USDC), or **Both** (default). Locked once bidding opens. Crypto-only is refused while the USDC escrow isn't live. Bidders only see the allowed methods; single-rail lots show a "Card & bank only" / "USDC only" badge. |
| Anti-snipe (2026-11-08) | Soft close: a bid in the final **2 minutes** resets the end to now + 2 minutes (no cap). Was 60 s. One constant, `ANTI_SNIPE_WINDOW_SECONDS` in `hermes.pricing.ts`, sent to bidders as `extensionWindowSeconds`. For reference, alt.xyz tapers through the night (2 min → 1 min → 30 s → 15 s for a 9 pm close). The plan is to start with a flat 2 min and adjust from there. |
| All bids are final (2026-11-08) | Bids can't be withdrawn, and a leader can only raise their max, never lower it (enforced in `placeBid`). Shown to bidders as an "All bids are final" chip on every live/upcoming lot's bid panel, a callout in the bid-confirm dialog, the `/auctions` hero, and the Hermes footer. |
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
- [x] Email gaps filled (2026-11-08, uncommitted): bid receipt on every manual bid (says "All bids are final"); cancelled-while-live notice to bidders; payment reminder 12 h before the 48 h grace ends (`auction-payment-reminder` job); runner-up "won" email explains the second chance; ACH clearing sends "Payment received" instead of a second "You won"; "didn't win" goes out once at close (was sent twice for ACH, and never when the winner's payment failed); outbid mentions the escrow refund only to USDC bidders. All blocked on SES delivery like the rest.
- [x] Sockets: anonymous viewers can join; masked handles only.

## Phase 3 — Est. Value ✅
- [x] `POST /admin/auctions/estimate/identify`: photos → subject. `POST /admin/auctions/estimate/value`: subject → comps + recommendation. Cards use ValuationService; memorabilia uses web research (`claude-opus-5-5`).

## Phase 4 — Media ✅
- [x] `POST /admin/auctions/media/:kind`: multer to disk, then streamed to S3 (images ≤15 MB, video ≤500 MB).
- [x] YouTube / Vimeo links normalized to privacy-friendly embeds.

## Phase 5 — Contract: `hermes-auctions` escrow
- [x] Program `BNHMW9ZTzqRsRsKi9DUt8i5T4PFDFGRevPcHCQpvkuTu`, with 41 tests passing.
- [x] IDL shipped to the API (`src/auctions/idl/hermes_auctions.json`).
- [x] **Deployed to devnet + initialized (2026-11-09).** Aaron funded the deployer `2qSYLNDy4HSFEusnS7ZMm6mLqpyLMzJU2TD2aviFiE2w` (the local Solana CLI key in WSL `~/.config/solana/id.json`; also the program's upgrade authority) with 5 devnet SOL; 3.4 SOL left. Deploy tx `5Sd9xUAN…`, init tx `39R1gFBq…`; config `9z37B3kUh5usrxfo22KWTzB5hbtLfGUm6jDp2KbvqvYZ`, authority `E4LW3c9SMgLAZRMSaVpHcajnV1mHkCZt6FXvhm9L23Fo` (API), mint devnet USDC `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`, treasury `A3MHpXX9F1kd51mng84b93eJDUgsD4GGavF4anQ21Xve`. `scripts/deploy-hermes-devnet.sh` has CRLF endings, so WSL bash rejects it as-is (strip the `\r` first).

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
- [x] **CloudFront SPA fallback on the staging distribution.** Done 2026-11-08 via the AWS CLI (`EASGI6LI5JIAW`: 403/404 → `/index.html` 200, error TTL 10 s); deep links verified. Original note: Deep links (`/auctions`, `/login`, `/auth/verify-email`, …) return S3 403 XML on staging; prod is already configured. In the CloudFront console → staging distribution → Error pages, add 403 → `/index.html` (200) and 404 → `/index.html` (200). Alternatively, grant `GHDeployer` `cloudfront:GetDistributionConfig` + `cloudfront:UpdateDistribution` and the deploy workflow configures it itself.
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
- [x] ~~Legal sign-off on card surcharging~~. Moot since 2026-11-09: there is no card surcharge any more (Phase 11).

## Phase 11 — 4% buyer premium (2026-11-08)
- [x] API: `BUYER_PREMIUM_PERCENT = 4`, migration `AddAuctionBuyerPremium20261108120000` (`buyer_premium_percent` default 0 for existing rows, `buyer_premium_usd`). Covers charges, retry checkout, USDC escrow check + settle amount, winner email, and the admin detail.
- [x] Web: shows the premium on the bid panel badge, in the "most you'd pay" breakdown, in the confirm dialog, in the USDC escrow requirement, on the pay page / receipt and in admin. The site copy was changed to "Zero-seller-fee".
- [x] Migration applied on `cardcade-stag` and `cardcade-prod` (2026-11-08), before the API deploys.
- [x] Deployed to staging and prod on 2026-11-08 (API #496, web #668). Both `/api/auctions/config` endpoints report `buyerPremiumPercent: 4`.
- [x] **The 4% is all-in (Aaron/Nick, 2026-11-09):** Stripe's card and ACH fees come out of the premium, and nothing is added on top for any method (API `31316cb`, web `14999a3`). `winTotals()` no longer takes the method; new settlements store `card_fee_usd = 0`; `fees` no longer sends the card processing rate. The footer now says "Pay by credit card, bank transfer, or USDC." Hermes' cut is thin on small card lots: with $5 shipping, Stripe's 2.9% + 30¢ eats the whole premium on a card win under about $45.
- [ ] Card + ACH E2E on staging. Expected: $35 + $5 → $41.40 by card or by ACH.

## Phase 12 — 360° spin via Pika (2026-11-08)
- [x] API: `AuctionsSpinService` with admin routes `GET/POST /admin/auctions/spin` and `GET /admin/auctions/spin/:jobId`. It is stateless (the Pika job id is the handle) and accepts only `hermes/images/` photos from our bucket. It copies the result to S3 once, and stays dormant without `PIKA_API_KEY`. `AuctionVideoDto.spin` is accepted and kept on save. No migration.
- [x] Web: a "360° spin" section in the auction form (front/back pickers → generate → preview → include/discard). The gallery plays the spin muted on loop after the cover, and lot cards show a "360°" badge.
- [x] Verified with a mocked Pika + S3 run of the service, and Pika's public quote endpoint accepted the exact request body ($0.36).
- [x] Deployed to staging and prod (dormant: no key yet).
- [x] **Pika account** (Aaron, 2026-11-08). Keep it funded; spins fail with "out of credit" otherwise. No webhook endpoint is needed: the app polls the job.
- [x] **Pika API key** in `streambet_api/.env` (balance $10 at setup).
- [x] **SSM:** SecureString `/cardcade/non_pro_{stag,prod}/PIKA_API_KEY` (aws/ssm key). These are the first SecureStrings under `/cardcade/`, and ECS decrypts them fine with the existing role.
- [x] Task-def `secrets` entries for both envs (API `1654c6c`). Staging is running it (task def rev 283).
- [x] **Staging E2E through the deployed API** (2026-11-08): admin `POST /admin/auctions/spin` with a mock card front/back → completed in 105 s, charged $0.36, MP4 copied to `hermes/spins/media_4942a377-….mp4` (1440×1440, 6 s, 30 fps, 2.3 MB, public). **Quality:** front → back is a real 3D turn; the closing back → front edge is a cross-fade with ghosting for ~2 s. Options: add anti-crossfade terms to the negative prompt; try `[front, back, front]` with `loop: false`; or generate only front → back and ping-pong it.
- [x] **Prompt tweak test (Aaron picked option 2)**, run locally against real Pika ($0.36): `[front, back, front]`, `loop: false`, prompts insisting on one solid 360° turn, negative prompt banning crossfade / dissolve / ghosting. **Worse:** neither half rotated; the card stayed face-on, the artwork morphed ("23" → "25" / "40" / "44"), and it dissolved between sides. Reverted (never committed); staging still runs v1.
- [x] Free preview of option 3 from v1's good half (ffmpeg, forward + reversed): a clean front ⇄ back rock with real rotation. It's a flip back and forth, not a full spin.
- [x] **Option 3 chosen (Aaron) and built** (API `c6a499f`): Pika renders only the 3 s front → back turn (**$0.18**), and the API builds the loop with `ffmpeg-static`: frames forward then backward without repeating the ends, 1080 px, ~6 s, H.264 faststart. Frames go through disk, not ffmpeg's `reverse` filter, to stay within the 512 MB task. x264 is single-threaded at low priority. The build runs in the background, polls say `running` until it's stored, and a failed store is reported once and then retried. A mocked test with a real clip + real ffmpeg passed, and Pika's quote for the new body is $0.18.
- [x] Staging E2E of option 3 through the deployed API: 84 s end to end, loop built in 27 s in the container (Linux ffmpeg OK), task memory flat (~48%), 1080×1080 6.00 s 1.6 MB, clean rotation both ways. Test spend so far: $0.90.
- [x] **Prod:** API PR #497 merged (`307d3ee`); prod runs task def rev 243 with `PIKA_API_KEY`. 360° spins are live for admins on prod.
- [ ] UI check on staging: include a spin on a real lot, save, and confirm the auction page plays it.

## Phase 13 — Standalone buyer site + marketplace (2026-11-08)
- [x] API: the public list became a search: query DTO `ListAuctionsQueryDto`, the `ended` bucket, sorts, price and payment filters, and paging with `total`. The SQL was checked against `cardcade-stag`, and old clients that send only `bucket`/`category` still work. `HERMES_WEB_URL` (optional) adds the Hermes domain to our origins (`common/utils/client-origins.ts`). It's used for Stripe returns, Google sign-in (`GoogleOAuthGuard` carries `?origin=` through OAuth `state`; only our own origins can receive tokens, never an arbitrary localhost) and auction email links.
- [x] Web: the marketplace rewrites `pages/hermes/AuctionsHome.tsx` (sidebar filters on desktop, chips + a Filters panel on mobile). The header search filters live on the marketplace. Lot cards show Sold / Ended. `hermes.html` is a second Vite entry with Hermes title, icon and link-preview image (`public/hermes/hermes-social.png`). `site.ts` handles Hermes mode, and the routing is split in `App.tsx`. Log in and password pages switch branding.
- [x] Deploy: HTML is uploaded with `Cache-Control: no-cache`, and the Hermes distribution is invalidated when the `CLOUDFRONT_ID_HERMES_<branch>` secret exists. The iOS drawer fix moved to `public/ios-drawer-fix.js`, shared by both pages.
- [x] Verified a production build (both pages share one bundle). Took Playwright screenshots against a mocked API: Hermes desktop, search, mobile and log in; main landing, `/auctions` and `?site=hermes`.
- [x] Deployed to staging and prod on 2026-11-08 (API #496, web #668). `hermes.html` is served (`no-cache`) on both, and the `ended` search answers on both APIs.
- [x] ~~Pick a separate Hermes domain~~. Superseded by Phase 14: Hermes Auctions is a tab on collectiqapp.xyz. `hermes.html` + `site.ts` Hermes mode stay in the build, dormant, in case a separate domain is wanted later.

## Phase 14 — collectiqapp.xyz + two top-level tabs (2026-11-08)
Nick's call: the main domain is **collectiqapp.xyz** (cardcade.fun 301s to it). The site has two top-level tabs: **1. Hermes Auctions** (the home page) and **2. collectIQ Analytics** (for now). Aaron chose: DNS on Route 53, `/` = marketplace, and **main website only** for now (the API stays `api.cardcade.fun`, and staging stays `stag.cardcade.fun`).
- [x] **Web tabs shipped** (web `cb79743`, prod PR #670, live on collectiqapp.xyz + stag.cardcade.fun). `SiteTabs` in every main-site header (HermesShell, Navigation, the collectIQ product page). `/` = marketplace, `/auctions` → `/`, `/analytics` = dashboard for admins / collectIQ product page + waitlist for everyone else (`AnalyticsTab`). The marketplace hero carries the Hermes logo, since the header is collectIQ now.
- [x] Web domain fix shipped (web `cad3925`, prod PR #669): GA / Hotjar / Mixpanel treat collectiqapp.xyz as production (`lib/hosts.ts`), and og URLs point at collectiqapp.xyz.
- [x] Route 53 hosted zone `collectiqapp.xyz` (`Z0818300367PE0HVJJPVJ`) with: ACM validation CNAMEs; apex + www A/AAAA aliases → prod CloudFront (`d2tt40cz4n47fu.cloudfront.net`); Namecheap email-forwarding MX + SPF copied over (SPF also includes `amazonses.com`); SES Easy DKIM CNAMEs; `_dmarc` `p=none`. (An earlier zone/cert for collectiq.xyz, which isn't ours, was created by mistake and deleted.)
- [x] ACM cert `7ff4193e-c3fb-409f-ae7d-25b83a0e9934` (us-east-1): collectiqapp.xyz, www.collectiqapp.xyz, cardcade.fun. cardcade.fun validates through its existing Namecheap CNAME.
- [x] SES domain identity `collectiqapp.xyz` (DKIM RSA-2048) created. It verifies by itself once DNS is on Route 53.
- [x] CloudFront Function `collectiq-canonical-host`: 301s any host except collectiqapp.xyz to `https://collectiqapp.xyz` + path + query. Tested, and attached in the cutover.
- [x] Nameservers switched at Namecheap (Aaron, 2026-11-08). The .xyz registry showed the Route 53 NS right away, and the cert issued within the hour. Email forwarding: the MX records are copied, but Namecheap may stop forwarding once its DNS isn't used. Re-check any @collectiqapp.xyz forwards.
- [x] **Cutover done 2026-11-08**, with no window where Stripe / Google returns broke: (1) prod `APP_HOST_URL` = collectiqapp.xyz + API rolled; (2) prod distribution `EAZS87LJNNBA`: aliases `cardcade.fun, collectiqapp.xyz, www.collectiqapp.xyz`, cert `7ff4193e…`, the redirect function on viewer-request (the previous config is saved in the scratchpad as `prod-backup-config.json`); (3) prod `CLIENT_URL`, `APPLICATION_HOST`, `VITE_APP_HOST_URL` = collectiqapp.xyz + API rolled; (4) the web domain fix deployed (PR #669). Staging is unchanged.
- [x] Verified: collectiqapp.xyz serves the site over HTTPS, including deep links; `www` and `cardcade.fun/auctions?tab=live&q=…` 301 to collectiqapp.xyz with the path and query kept; Google sign-in accepts `origin=https://collectiqapp.xyz` and refuses others.
- [ ] Still to see in a browser: saving a card returns to collectiqapp.xyz, and the next outbid email links there.
- [x] No email forwarding in use (Aaron): the Namecheap MX records were removed, and SPF = `v=spf1 include:amazonses.com ~all`.
- [x] Email: SES identity `collectiqapp.xyz` **verified** 2026-11-08. It stayed `PENDING` until the identity was deleted and re-created after the NS switch; the DKIM tokens came back the same. `AWS_EMAIL_FROM` = `noreply@collectiqapp.xyz` on staging + prod (was `noreply@streambet.tv`), and both APIs were rolled. A staging password reset to the SES simulator logged "Email sent successfully via SMTP".
- [ ] **SES production access (Aaron):** requested 2026-11-08 and **denied within minutes**, case `179418417300454`, before the identity was verified. The API won't accept a new request after a denial (`ConflictException`), so reply on the case in the AWS Support Center (console → Support → Your support cases). Until it's granted, mail only reaches verified/simulator addresses, so email sign-ups can't verify. AWS's automated reply (2026-11-09) asked for URL, email types, volume, opt-in, bounce handling and a sample; the answer was drafted for Aaron.
- [x] SES bounce/complaint handling (2026-11-09): account-level suppression list (bounce + complaint) was already on. SNS topic `ses-collectiqapp-feedback` gets collectiqapp.xyz bounce + complaint notifications (with headers) and emails `aaron@cardcade.fun` (subscription must be confirmed from that inbox). Email feedback forwarding is off (noreply@ has no inbox). CloudWatch alarms `ses-bounce-rate-high` (> 2%) and `ses-complaint-rate-high` (> 0.05%) on the account reputation metrics notify the same topic.
- [x] Staging test data (2026-11-08): 3 lots (Jordan Test with a 360° spin, live about 3 h; Ace Riley, live 2 days, reserve $150; Flarecat TCG, opens in 1 h), all mock cards marked TEST. `hermes_bidder1–3` verified, with a shared test password (given to Aaron in chat).
- [ ] Later: `api.collectiqapp.xyz` (+ a Google OAuth redirect URI), and staging on `stag.collectiqapp.xyz`.

## Risks / notes
- ~~**Card surcharging:** the card network cap is 3%, the fee must be disclosed, debit cards can't be surcharged, and some states restrict surcharges.~~ Resolved 2026-11-09 by dropping the card fee (the premium covers processing).
- **On-chain privacy:** USDC deposits are public on Solana, so a USDC bidder's escrow (≥ their max) is visible. The UI says so.
- **Program isolation:** `cardcade-marketplace` is untouched. `hermes-auctions` stays devnet-only until prod sign-off (prod needs its own deploy + SSM values).
- **Stale tests:** `tests/cardcade-marketplace.ts` still calls the removed `listCard` / `primarySale`, so 7 tests fail. These failures were already there.
- **Hygiene, outside auctions scope:**
  - `streambet_api/.env.backup-2026-10-09` holds commented-out prod secrets.
  - `.dockerignore` doesn't exclude `.env*`.
  - `POST /api/assets/file/upload/*` has no auth or size limit.
  - `.env.staging`'s AWS keys are invalid (rotated?).
