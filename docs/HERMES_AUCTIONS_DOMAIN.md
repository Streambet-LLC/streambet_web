# Hermes Auctions on its own domain

The buyer site for Hermes Auctions can run on its own domain (for example `hermesauctions.com`). It doesn't need a separate app or deploy pipeline. It's the same build, served from a second entry page:

| | Main site (`cardcade.fun`) | Hermes site (its own domain) |
|---|---|---|
| Entry page | `index.html` | `hermes.html` |
| Home page `/` | collectIQ landing (with the Hermes auctions rail) | Auctions marketplace |
| Marketplace | `/auctions` | `/` (`/auctions` redirects there) |
| Lot / pay / my bids | `/auctions/:id`, `/auctions/:id/pay`, `/auctions/me` | same paths |
| Log in / sign up | collectIQ-branded log in, Hermes sign-up | Hermes-branded log in and sign-up |
| Admin (sellers) | `/analytics` | none: admins keep using the main site |
| Tab title, icon, link previews | collectIQ | Hermes Auctions |

`hermes.html` has `<meta name="app-site" content="hermes">`, which switches the app into Hermes mode (`src/components/hermes/site.ts`). Every deploy uploads both pages to the same S3 bucket.

## Try it before buying a domain

On any host (local, staging or prod), add `?site=hermes` to the URL, for example `https://stag.cardcade.fun/?site=hermes`. The tab stays in Hermes mode until it's closed, or until you open `?site=main`.

## Attach a domain

You need AWS console access (the CI user can't manage CloudFront) and the domain's DNS. Do this for prod (`non_pro_prod`). Staging is optional and works the same way.

1. **Certificate.** In ACM, region **us-east-1** (CloudFront only uses certificates from there), request a public certificate for `hermesauctions.com` and `www.hermesauctions.com`. Use DNS validation, and add the CNAME records it shows at your DNS provider.

2. **CloudFront distribution.** Create a new distribution:
   - **Origin:** the same S3 bucket the main site's distribution uses (the `S3_BUCKET_non_pro_prod` secret). Copy the origin's access settings from the existing distribution, and use the same Origin Access Control.
   - **Bucket policy:** if the bucket policy only allows the existing distribution's ARN (`AWS:SourceArn`), add the new distribution's ARN to it. If you skip this, every request returns 403.
   - **Default root object:** `hermes.html`
   - **Error pages:** 403 → `/hermes.html`, response code 200. 404 → `/hermes.html`, response code 200. This makes deep links like `/auctions/<id>` load.
   - **Alternate domain names:** `hermesauctions.com`, `www.hermesauctions.com`. Custom SSL certificate: the one from step 1.
   - **Viewer protocol policy:** redirect HTTP to HTTPS. **Cache policy:** CachingOptimized. The deploy uploads the HTML pages with `Cache-Control: no-cache`, so new releases show up right away.

3. **DNS.** Point the domain at the distribution's `dxxxx.cloudfront.net` name:
   - `www`: a CNAME record.
   - The bare domain: an ALIAS record (Namecheap calls it "ALIAS Record"; on Route 53 use an A/AAAA alias).

4. **Deploys.** Save the distribution ID as a GitHub secret on `streambet_web`, so each deploy clears its cache:
   ```sh
   gh secret set CLOUDFRONT_ID_HERMES_non_pro_prod --body "E1234567890ABC"
   ```
   Until this secret exists, the workflow skips that step.

5. **API.** In `streambet_api/.devops/task-def.non_pro_prod.json`, add one plain entry under `"environment"`. Not under `"secrets"`, so no SSM parameter is needed:
   ```json
   { "name": "HERMES_WEB_URL", "value": "https://hermesauctions.com" }
   ```
   Then deploy the API. This setting is **required**, not optional. It lets the API:
   - accept Stripe return URLs from the domain. Without it, saving a card or bank account fails with "Invalid return URL".
   - send Google sign-in back to the domain. Without it, buyers end up on `cardcade.fun`.
   - link auction emails (outbid, won, pay now) to the domain.

6. **Check.** Open the domain and confirm:
   - The marketplace loads, and the tab says Hermes Auctions.
   - A deep link like `/auctions/<id>` loads after a refresh.
   - Sign up with Google returns you to the domain, logged in.
   - Saving a card from a lot returns you to that lot.
   - Pasting the URL into Slack or iMessage shows the Hermes preview image.

## Good to know

- **One account, two sites.** Accounts are shared, but each domain keeps its own login. Someone who is logged in on `cardcade.fun` logs in once more on the Hermes domain.
- **Email verification and password reset links** still go to `cardcade.fun`, so those pages are collectIQ-branded. The account works on both sites afterwards. Pointing them at the Hermes domain would be a follow-up change in the API's auth emails.
- **Sellers / admins** create and run lots from `cardcade.fun/analytics` → Hermes Auctions. The Hermes domain has no admin pages.
- **Link preview image:** `public/hermes/hermes-social.png` (1200×630). The tags in `hermes.html` point at `https://cardcade.fun/hermes/hermes-social.png?v=1`. If you replace the image, bump `?v=` so previews refresh.
