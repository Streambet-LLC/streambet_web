# Meta tracking (Pixel + signup attribution)

Built 2026-11-12 from Aaron's install brief. The funnel is traffic → signup →
watch → bid. Meta gets the Pixel events below; our side saves which ad each
signup came from.

## Turning the Pixel on

The Pixel only loads when the build has a pixel id. The id comes from SSM at
build time (optional; missing = Pixel off):

```
/cardcade/non_pro_stag/VITE_META_PIXEL_ID   (staging)
/cardcade/non_pro_prod/VITE_META_PIXEL_ID   (prod)
```

1. Events Manager (Collectiq Meta Business account) → create a pixel, or
   reuse the existing one. Copy its id.
2. `aws ssm put-parameter --name /cardcade/<branch>/VITE_META_PIXEL_ID --type String --value <id>`
   (profile `cardcade`; in Git Bash set `MSYS_NO_PATHCONV=1`).
3. Redeploy the web app for that branch (any push, or an empty commit).

To turn it off again, delete the parameter and redeploy.

## Events

| Event | Type | When | Where |
|---|---|---|---|
| PageView | standard | first load (base code) + every SPA route change | `lib/metaPixel.ts`, `PageViewTracker` |
| ViewContent | standard | lot page load, once per lot: `content_ids [lotId]`, `content_name`, `content_type: product`, `currency: USD` | `pages/hermes/AuctionDetail.tsx` |
| CompleteRegistration | standard | email sign-up accepted (account created; verification comes after), or a Google sign-in that created the account | `pages/hermes/SignUp.tsx`, `PendingSignupHandler` |
| Watch | custom | lot added to the watchlist (heart / Watch button, or the pending watch after login) | `components/hermes/WatchButton.tsx` |
| Bid | custom | bid accepted: `value` = the bidder's max, `currency: USD` | `components/hermes/BidPanel.tsx` |

Not done yet (brief: optional / phase 2): `Purchase` on a paid win, and the
Conversions API (server-side events).

The Pixel sends the page URL with each event, so it never starts on pages
whose URL carries login tokens (`/auth/google-callback`, `/auth/verify-email`,
`/reset-password`, `/analytics/google/callback`); it starts on the next normal
page. GoogleCallback also strips the tokens from the address bar before it
reloads.

## Signup attribution

- First tagged landing (any of `utm_source`, `utm_medium`, `utm_campaign`,
  `utm_content`, `utm_term`, `fbclid`): saved to localStorage
  `ciq_attribution` with `landing_path` and `captured_at`. First touch wins.
  `lib/attribution.ts`.
- Email sign-up: sent as `attribution` in `POST /auth/register`.
- Google sign-up: the API adds `new=1` to the callback redirect when it
  created the account. After the reload, `PendingSignupHandler` posts it to
  `POST /auth/signup-attribution`, which saves it only on an account under a
  day old with none yet.
- Stored on `users.signup_attribution` (jsonb, migration
  `AddUserSignupAttribution20261112130000`). The API keeps only the known keys
  (`users/signup-attribution.ts`) and never fails a signup over them.
- Visible in the admin Users tab ("Source", e.g. `meta / paid · tyranitar`;
  hover for every param). SQL: `signup_attribution->>'utm_campaign'`.

## Testing

- Meta Pixel Helper (Chrome): PageView on every page, ViewContent on lot pages.
- Events Manager → Test Events: sign up, watch and bid; all events should land
  under the pixel.
- Attribution: open `/auctions/<id>?utm_source=meta&utm_medium=paid&utm_campaign=test`
  in a fresh browser profile, sign up, and check the Users tab.
