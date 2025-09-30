import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const Compliance = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />

      <main className="container flex-1 py-16">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">Streambet Compliance Policies</h1>
          </div>

          <div className="grid gap-8">
            {[
              {
                title: "1. Play-Through Policy",
                content: (
                  <>
                    <p className="text-muted-foreground">
                      Streambet.tv operates exclusively under a dual-platform sweepstakes promotional model:
                    </p>
                    <p className="text-muted-foreground mt-2">
                      - Gold Coin Mode – entertainment-only social casino play with no prize redemption.
                    </p>
                    <p className="text-muted-foreground">
                      - Stream Coin Mode – promotional sweepstakes play, redeemable for prizes, with no purchase necessary.
                    </p>
                    <p className="text-muted-foreground mt-2">
                      To protect the integrity of our sweepstakes, ensure compliance with applicable laws, and uphold strong anti-fraud and responsible gaming standards, we require that all coins— whether purchased (Gold Coins) or awarded (Stream Coins)—must be used in at least one qualifying contest or game before any resulting prize winnings may be redeemed.
                    </p>
                    <p className="text-muted-foreground mt-2">
                      Prize winnings from Stream Coin gameplay are eligible for redemption only after all of the following conditions are met:
                    </p>
                    <p className="text-muted-foreground mt-2">
                      - Play-Through Requirement: Stream Coins must be used in eligible sweepstakes gameplay prior to withdrawal; unused Stream Coins are not redeemable for prizes. Gold Coins, which have no prize value, are ineligible for redemption.
                    </p>
                    <p className="text-muted-foreground">
                      - Identity Verification (KYC): All users must complete full identity verification before any withdrawal request is processed.
                    </p>
                    <p className="text-muted-foreground">
                      - Anti-Fraud & AML Safeguards: We monitor transaction and gameplay activity to detect patterns indicative of fraud, abuse, or circumvention of sweepstakes eligibility rules.
                    </p>
                    <p className="text-muted-foreground">
                      - Geographic Eligibility: Withdrawals are permitted only for users located in eligible jurisdictions at the time of both gameplay and redemption.
                    </p>
                  </>
                ),
              },
              {
                title: "2. Terms of Service (TOS) – Abbreviated",
                content: (
                  <>
                    <p className="text-muted-foreground">
                      1. Acceptance of Terms
                    </p>
                    <p className="text-muted-foreground">
                      By creating an account, accessing, or participating in activities on Streambet.tv (“the Platform”), you agree to be bound by these Terms of Service (“Terms”). If you do not agree, do not use the Platform.
                    </p>

                    <p className="text-muted-foreground mt-2">
                      2. Eligibility
                    </p>
                    <p className="text-muted-foreground">
                      - Must be at least 18 years old (or the age of majority in your jurisdiction — 19 in AL & NE).
                    </p>
                    <p className="text-muted-foreground">
                      - Must be physically located in an eligible jurisdiction at the time of participation.
                    </p>
                    <p className="text-muted-foreground">
                      - Employees of Streambet.tv, its affiliates, and their immediate family members are not eligible.
                    </p>

                    <p className="text-muted-foreground mt-2">
                      3. Nature of the Platform
                    </p>
                    <p className="text-muted-foreground">
                      Streambet operates two distinct modes:
                    </p>
                    <p className="text-muted-foreground">
                      - Gold Coin Mode – Entertainment-only social casino play. Gold Coins may be purchased for  gameplay but have no redemption value and cannot be exchanged for cash or merchandise.
                    </p>
                    <p className="text-muted-foreground">
                      - Stream Coin Mode – Promotional sweepstakes contests. Stream Coins cannot be purchased and are only available for free via Alternative Methods of Entry (AMOE) or as a free bonus with Gold Coin purchases. Stream Coins can be redeemed for cash or prizes once eligibility requirements are met.
                    </p>

                    <p className="text-muted-foreground mt-2">
                      4. User Responsibilities
                    </p>
                    <p className="text-muted-foreground">
                      - Provide accurate registration and identity verification details.
                    </p>
                    <p className="text-muted-foreground">
                      - Use the Platform solely for lawful purposes in eligible jurisdictions.
                    </p>
                    <p className="text-muted-foreground">
                      - Do not attempt to manipulate results, circumvent eligibility requirements, or engage in fraud.
                    </p>

                    <p className="text-muted-foreground mt-2">
                      5. Account Funding & Play-Through
                    </p>
                    <p className="text-muted-foreground">
                      Purchased Gold Coins or awarded Stream Coins must be played through in at least one contest before any resulting winnings (Stream Coins only) can be redeemed.
                    </p>

                    <p className="text-muted-foreground mt-2">
                      6. Withdrawals & Verification
                    </p>
                    <p className="text-muted-foreground">
                      Withdrawals are processed only after KYC verification, geographic eligibility confirmation, and compliance review.
                    </p>

                    <p className="text-muted-foreground mt-2">
                      7. Intellectual Property
                    </p>
                    <p className="text-muted-foreground">
                      All content, branding, and technology belong to Streambet.tv or its licensors.
                    </p>

                    <p className="text-muted-foreground mt-2">
                      8. Limitation of Liability
                    </p>
                    <p className="text-muted-foreground">
                      The Platform is provided “as-is.” Streambet.tv is not liable for damages arising from participation, except where prohibited by law.
                    </p>

                    <p className="text-muted-foreground mt-2">
                      9. Dispute Resolution
                    </p>
                    <p className="text-muted-foreground">
                      All disputes will be resolved through binding arbitration in [State], under AAA rules.
                    </p>
                  </>
                ),
              },
              {
                title: "3. Responsible Gaming Policy",
                content: (
                  <>
                    <p className="text-muted-foreground">
                      We are committed to providing a safe, compliant, and enjoyable environment while promoting responsible gameplay.
                    </p>
                    
                    <p className="text-muted-foreground mt-2">
                      Our Commitment:
                    </p>
                    <p className="text-muted-foreground">
                      - Enforcing age and jurisdiction restrictions, including geoblocking prohibited states.
                    </p>
                    <p className="text-muted-foreground">
                      - Providing transparent information on contest rules and prize eligibility.
                    </p>
                    <p className="text-muted-foreground">
                      - Monitoring for patterns of excessive or harmful play, even in non-redeemable Gold Coin mode.
                    </p>
                    <p className="text-muted-foreground">
                      - Offering self-exclusion tools and account cooling-off periods upon request.
                    </p>

                    <p className="text-muted-foreground mt-2">
                      Player Tools:
                    </p>
                    <p className="text-muted-foreground">
                      - Self-Exclusion: Permanent or temporary closure of an account upon request.
                    </p>
                    <p className="text-muted-foreground">
                      - Purchase & Time Limits: Users may request custom limits on Gold Coin purchases and daily play time.
                    </p>
                    <p className="text-muted-foreground">
                      - Support Resources: Links to organizations such as the National Council on Problem Gambling (<a href="https://www.ncpgambling.org" className='underline'>www.ncpgambling.org</a>).
                    </p>
                  </>
                ),
              },
              {
                title: "4. Sweepstakes Rules Rundown",
                content: (
                  <>
                    <p className="text-muted-foreground">
                      No Purchase Necessary
                    </p>
                    <p className="text-muted-foreground">
                      Participation in Stream Coin sweepstakes contests does not require a purchase. Stream Coins are available via:
                    </p>
                    <p className="text-muted-foreground">
                      - Mail-in request (unlimited AMOE entries)
                    </p>
                    <p className="text-muted-foreground">
                      - Daily login bonuses
                    </p>
                    <p className="text-muted-foreground">
                      - Social media giveaways and contests
                    </p>
                    <p className="text-muted-foreground">
                      - Complimentary gifts with Gold Coin purchases
                    </p>

                    <p className="text-muted-foreground mt-2">
                      Eligibility
                    </p>
                    <p className="text-muted-foreground">
                      - Must meet age and jurisdiction requirements.
                    </p>
                    <p className="text-muted-foreground">
                      - One account per person.
                    </p>

                    <p className="text-muted-foreground mt-2">
                      How to Play
                    </p>
                    <p className="text-muted-foreground">
                      1. Obtain Stream Coins via free methods or as a complimentary bonus.
                    </p>
                    <p className="text-muted-foreground">
                      2. Use Stream Coins to enter eligible sweepstakes contests.
                    </p>
                    <p className="text-muted-foreground">
                      3. Winnings are determined by chance-based gameplay.
                    </p>

                    <p className="text-muted-foreground mt-2">
                      Prizes
                    </p>
                    <p className="text-muted-foreground">
                      - Winnings are redeemable only after meeting play-through and verification requirements.
                    </p>
                    <p className="text-muted-foreground">
                      - Prizes are non-transferable.
                    </p>

                    <p className="text-muted-foreground mt-2">
                      Odds
                    </p>
                    <p className="text-muted-foreground">
                      Odds depend on the number of eligible entries received and random chance. Free and paid bonus entries have equal odds.
                    </p>
                  </>
                ),
              },
              {
                title: "5. Refund Policy",
                content: (
                  <>
                    <p className="text-muted-foreground">
                      All purchases of Gold Coins are final and non-refundable once credited, except in cases of:
                    </p>

                    <p className="text-muted-foreground mt-2">
                      - Duplicate charges caused by technical error.
                    </p>
                    <p className="text-muted-foreground">
                      - Purchases made in jurisdictions where Gold Coin Mode is prohibited (if discovered post-purchase).
                    </p>
                    
                    <p className="text-muted-foreground mt-2">
                      Refund requests must be submitted within 7 days of the transaction and will be reviewed on a case-by-case basis.
                    </p>
                  </>
                ),
              },
              {
                title: "6. Accepted and Banned Jurisdictions Policy",
                content: (
                  <>
                    <p className="text-muted-foreground">
                      Laws regarding sweepstakes gaming vary by state. For legal compliance, Streambet categorizes U.S. states as follows:
                    </p>

                    <hr className='my-4' />

                    <p className="text-muted-foreground font-semibold">
                      Green Light States – Fully Permitted
                    </p>
                    <p className="text-muted-foreground mt-2">
                      If you reside in any of the following states, you have full access to both Gold Coin Mode and Stream Coin Mode play. Players in these states can play games for fun with Gold Coins and participate in sweepstakes promotions with Stream Coins, including redeeming prizes, subject to these Terms.
                    </p>
                    <p className="text-muted-foreground mt-2 font-semibold">
                      Alabama, Alaska, Arizona, California, Colorado, Illinois, Indiana, Kansas, Maine, Massachusetts, Minnesota, Missouri, New Hampshire, New Mexico, Oklahoma, Oregon, Pennsylvania*, Rhode Island, South Dakota, Texas, Utah, Virginia, Washington D.C., Wisconsin, Wyoming
                      <span className='font-normal'> (25 states / jurisdictions)</span>
                    </p>
                    <p className="text-muted-foreground mt-2">
                      *In Pennsylvania, sweepstakes with over $5,000 in prizes may require registration if advertised via direct mail.
                    </p>

                    <hr className='my-4' />

                    <p className="text-muted-foreground font-semibold">
                      Yellow Light States – Potential limitations on Gold Coins
                    </p>
                    <p className="text-muted-foreground mt-2">
                      In these states, you may use the Platform, but heightened compliance and monitoring are required due to older case law, pending legislation, or uncertain enforcement postures. Gold coin mode can be considered illegal gambling, or these jurisdictions have added restrictions
                    </p>
                    <p className="text-muted-foreground font-semibold mt-2">
                      Florida*, Hawaii, Maryland, Mississippi, New Jersey, North Carolina, North Dakota, Ohio, South Carolina, Tennessee**, Vermont
                      <span className='font-normal'> (11 states)</span>
                    </p>
                    <p className="text-muted-foreground mt-2">
                      *Florida requires sweepstakes registration and bonding if the prize pool exceeds $5,000 and the promotion lasts more than 30 days.
                    </p>
                    <p className="text-muted-foreground">
                      **Tennessee has heightened risk based on state law interpretation of chance-based games and potential classification of virtual credits as a “thing of value.”
                    </p>

                    <p className="text-muted-foreground font-semibold mt-2">
                      Yellow Light States - Actively monitoring evolving regulation
                    </p>
                    <p className="text-muted-foreground mt-2">
                      In these states, you may use the platform, but there are more regulatory questions, quickly evolving regulation, and heightened risk of illegalization.
                    </p>
                    <p className="text-muted-foreground font-semibold mt-2">
                      Arkansas, Georgia, Iowa, Kentucky, Nebraska, Delaware
                      <span className='font-normal'> (6 states)</span>
                    </p>

                    <hr className='my-4' />

                    <p className="text-muted-foreground font-semibold">
                      Red Light States – Fully Prohibited (No Modes Available)
                    </p>
                    <p className="text-muted-foreground mt-2">
                      Streambet does not operate in the following states, which have taken enforcement actions or passed laws prohibiting sweepstakes casino models, even if no purchase is necessary. If you are a resident of or physically located in any of these states, you are not allowed to create an account or use the Platform in any capacity:
                    </p>
                    <p className="text-muted-foreground font-semibold mt-2">
                      Connecticut, Idaho, Louisiana, Michigan, Montana* (effective October 2025), Nevada, New York, Washington, West Virginia
                      <span className='font-normal'> (9 states)</span>
                    </p>
                    <p className="text-muted-foreground mt-2">
                      *Montana’s prohibition on sweepstakes casinos takes effect October 1, 2025.
                    </p>
                    <p className="text-muted-foreground mt-2">
                      For simplicity, Streambet can be used (whether fully or with limitations) in: FL, HI, MD, MS, NJ, NC, ND, OH, SC, TN, VT, AL, AK, AZ, CA, CO, IL, IN, KS, ME, MA, MN, MO, NH, NM, OK, OR, PA, RI, SD, TX, UT, VA, DC, WI, WY, AR, GA, IA, KY, NE, DE
                    </p>
                    <p className="text-muted-foreground mt-2">
                      And cannot be used in: CT, ID, LA, MI, MT, NV, NY, WA, WV
                    </p>
                    <p className="text-muted-foreground mt-2">
                      If you are located in or a resident of a prohibited state, do not attempt to use Streambet. Any account created in a prohibited jurisdiction is subject to immediate closure. We may require proof of residency during registration or prize redemption. Misrepresenting your location or using VPNs or other technical measures to circumvent geolocation is a serious violation of these Terms and may result in forfeiture of prizes and account termination.
                    </p>
                  </>
                ),
              },
              {
                title: "7. Anti-Money Laundering (AML) & Transaction Monitoring Policy",
                content: (
                  <>
                    <p className="text-muted-foreground">
                      Purpose:
                    </p>
                    <p className="text-muted-foreground">
                      Prevent the use of Streambet’s platform for money laundering, terrorist financing, or illicit activity.
                    </p>

                    <p className="text-muted-foreground mt-2">
                      Controls:
                    </p>
                    <p className="text-muted-foreground">
                      - CDD: Verify identity before first withdrawal.
                    </p>
                    <p className="text-muted-foreground">
                      - EDD: Apply for high-risk profiles or large transaction volumes.
                    </p>
                    <p className="text-muted-foreground">
                      - Ongoing Monitoring: Flag unusual transaction patterns.
                    </p>
                    <p className="text-muted-foreground">
                      - Source of Funds Checks: Require documentation for withdrawals above [$X threshold].
                    </p>
                    <p className="text-muted-foreground">
                      - Recordkeeping: Maintain user and transaction records for 5+ years.
                    </p>
                    <p className="text-muted-foreground">
                      - Reporting: File Suspicious Activity Reports (SARs) where required by law.
                    </p>

                    <p className="text-muted-foreground mt-2">
                      Triggers for Review:
                    </p>
                    <p className="text-muted-foreground">
                      - Multiple high-value deposits without corresponding Gold Coin gameplay.
                    </p>
                    <p className="text-muted-foreground">
                      - Immediate withdrawal attempts after obtaining Stream Coins.
                    </p>
                    <p className="text-muted-foreground">
                      - Frequent account funding from multiple payment methods.
                    </p>
                  </>
                ),
              },
              {
                title: "8. Anti-Cheating / Anti-Manipulation, and Pay-Outs Verification Policy",
                content: (
                  <>
                    <p className="text-muted-foreground">
                      Streambet maintains strict measures to ensure fairness and integrity in all games and sweepstakes contests.
                    </p>

                    <p className="text-muted-foreground mt-2">
                      Prohibited Conduct:
                    </p>
                    <p className="text-muted-foreground">
                      - Manipulation of game outcomes.
                    </p>
                    <p className="text-muted-foreground">
                      - Use of automated tools, bots, or scripts to place picks or influence results.
                    </p>
                    <p className="text-muted-foreground">
                      - Collusion between accounts to alter contest outcomes.
                    </p>
                    <p className="text-muted-foreground">
                      - Any attempt to exploit software bugs, loopholes, or system vulnerabilities.
                    </p>

                    <p className="text-muted-foreground mt-2">
                      Internal Verification Procedures:
                    </p>
                    <p className="text-muted-foreground">
                      - Following the close of each picks session, our operations team reviews all gameplay and picks records before any prize funds are released.
                    </p>
                    <p className="text-muted-foreground">
                      - This review includes automated system checks and manual verification to detect suspicious patterns, unusual betting behavior, or possible rules violations.
                    </p>
                    <p className="text-muted-foreground">
                      - Any flagged activity is investigated, and winnings may be withheld or forfeited pending review.
                    </p>
                    <p className="text-muted-foreground">
                      - Accounts found to be in violation of this policy may be suspended or permanently closed.
                    </p>

                    <p className="text-muted-foreground mt-2">
                      These procedures ensure that all prize distributions are based solely on fair and legitimate play, protecting both the integrity of our contests and the experience of our users.
                    </p>
                  </>
                ),
              },
              {
                title: "9. Excessive Play Limitations",
                content: (
                  <>
                    <p className="text-muted-foreground">
                      To maintain fair play and protect against fraud or automated activity, Streambet imposes a daily limit of twenty (20) picks per user. If you reach this limit in a calendar day, your account may be temporarily suspended from additional play for that day. Streambet reserves the right to review such activity, request verification, and determine whether the activity constitutes suspicious, abusive, or fraudulent conduct. Accounts found in violation may be subject to prize forfeiture or permanent termination.
                    </p>
                  </>
                ),
              },
            ].map((section, index) => (
              <Card key={index} className="p-6 lg:p-8">
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold">{section.title}</h2>
                  <Separator />
                  <div className="text-muted-foreground leading-relaxed">
                    {section.content}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Compliance;