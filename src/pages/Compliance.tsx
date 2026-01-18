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
            <h1 className="text-4xl font-bold tracking-tight">CardCade Compliance Policies</h1>
          </div>

          <div className="grid gap-8">
            {[
              {
                title: "1. Free Token Policy",
                content: (
                  <>
                    <p className="text-muted-foreground">
                      CardCade operates as a 100% free-to-play entertainment platform:
                    </p>
                    <p className="text-muted-foreground mt-2">
                      - All users receive free tokens to play games and compete for prizes
                    </p>
                    <p className="text-muted-foreground">
                      - Tokens have no monetary value and cannot be purchased
                    </p>
                    <p className="text-muted-foreground">
                      - Prizes consist of merchandise, gift cards, and other non-cash rewards
                    </p>
                    <p className="text-muted-foreground mt-2">
                      To maintain platform integrity and uphold anti-fraud standards, we require that tokens be used in gameplay. Prize winnings are eligible for redemption after meeting the following conditions:
                    </p>
                    <p className="text-muted-foreground mt-2">
                      - Active Gameplay: Tokens must be used in eligible gameplay activities
                    </p>
                    <p className="text-muted-foreground">
                      - Age Verification: All users must be at least 18 years old
                    </p>
                    <p className="text-muted-foreground">
                      - Anti-Fraud Safeguards: We monitor gameplay activity to detect patterns indicative of fraud or abuse
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
                      By creating an account, accessing, or participating in activities on CardCade.tv (“the Platform”), you agree to be bound by these Terms of Service (“Terms”). If you do not agree, do not use the Platform.
                    </p>

                    <p className="text-muted-foreground mt-2">
                      2. Eligibility
                    </p>
                    <p className="text-muted-foreground">
                      - Must be at least 18 years old (or the age of majority in your jurisdiction).
                    </p>
                    <p className="text-muted-foreground">
                      - Employees of CardCade, its affiliates, and their immediate family members are not eligible to win certain prizes.
                    </p>

                    <p className="text-muted-foreground mt-2">
                      3. Nature of the Platform
                    </p>
                    <p className="text-muted-foreground">
                      CardCade is a free-to-play entertainment platform:
                    </p>
                    <p className="text-muted-foreground">
                      - All tokens are provided free of charge and have no monetary value
                    </p>
                    <p className="text-muted-foreground">
                      - Tokens cannot be purchased or exchanged for cash
                    </p>
                    <p className="text-muted-foreground">
                      - Prizes are non-cash rewards such as merchandise and gift cards
                    </p>

                    <p className="text-muted-foreground mt-2">
                      4. User Responsibilities
                    </p>
                    <p className="text-muted-foreground">
                      - Provide accurate registration details.
                    </p>
                    <p className="text-muted-foreground">
                      - Use the Platform solely for lawful purposes.
                    </p>
                    <p className="text-muted-foreground">
                      - Do not attempt to manipulate results or engage in fraud.
                    </p>

                    <p className="text-muted-foreground mt-2">
                      5. Token Usage
                    </p>
                    <p className="text-muted-foreground">
                      Tokens must be used in gameplay activities. Prizes may be redeemed after meeting platform requirements.
                    </p>

                    <p className="text-muted-foreground mt-2">
                      6. Prize Redemption
                    </p>
                    <p className="text-muted-foreground">
                      Prize redemptions are processed after age verification and compliance review.
                    </p>

                    <p className="text-muted-foreground mt-2">
                      7. Intellectual Property
                    </p>
                    <p className="text-muted-foreground">
                      All content, branding, and technology belong to CardCade.tv or its licensors.
                    </p>

                    <p className="text-muted-foreground mt-2">
                      8. Limitation of Liability
                    </p>
                    <p className="text-muted-foreground">
                      The Platform is provided “as-is.” CardCade.tv is not liable for damages arising from participation, except where prohibited by law.
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
                      - Enforcing age restrictions.
                    </p>
                    <p className="text-muted-foreground">
                      - Providing transparent information on contest rules and prize eligibility.
                    </p>
                    <p className="text-muted-foreground">
                      - Monitoring for patterns of excessive or harmful play.
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
                      - Time Limits: Users may request custom limits on daily play time.
                    </p>
                    <p className="text-muted-foreground">
                      - Support Resources: Links to organizations such as the National Council on Problem Gambling (<a href="https://www.ncpgambling.org" className='underline'>www.ncpgambling.org</a>).
                    </p>
                  </>
                ),
              },
              {
                title: "4. Contest Rules",
                content: (
                  <>
                    <p className="text-muted-foreground">
                      Free to Play
                    </p>
                    <p className="text-muted-foreground">
                      All contests on CardCade are 100% free to enter. Tokens are available via:
                    </p>
                    <p className="text-muted-foreground">
                      - Account registration bonuses
                    </p>
                    <p className="text-muted-foreground">
                      - Daily login bonuses
                    </p>
                    <p className="text-muted-foreground">
                      - Social media giveaways and contests
                    </p>
                    <p className="text-muted-foreground">
                      - Promotional events
                    </p>

                    <p className="text-muted-foreground mt-2">
                      Eligibility
                    </p>
                    <p className="text-muted-foreground">
                      - Must meet age requirements (18+).
                    </p>
                    <p className="text-muted-foreground">
                      - One account per person.
                    </p>

                    <p className="text-muted-foreground mt-2">
                      How to Play
                    </p>
                    <p className="text-muted-foreground">
                      1. Receive free tokens through various promotional methods.
                    </p>
                    <p className="text-muted-foreground">
                      2. Use tokens to enter eligible contests.
                    </p>
                    <p className="text-muted-foreground">
                      3. Winnings are determined by chance-based gameplay.
                    </p>

                    <p className="text-muted-foreground mt-2">
                      Prizes
                    </p>
                    <p className="text-muted-foreground">
                      - Prizes consist of merchandise, gift cards, and other non-cash rewards.
                    </p>
                    <p className="text-muted-foreground">
                      - Prizes are non-transferable.
                    </p>

                    <p className="text-muted-foreground mt-2">
                      Odds
                    </p>
                    <p className="text-muted-foreground">
                      Odds depend on the number of eligible entries received and random chance.
                    </p>
                  </>
                ),
              },
              {
                title: "5. Platform Policies",
                content: (
                  <>
                    <p className="text-muted-foreground">
                      No Purchases Required
                    </p>
                    <p className="text-muted-foreground">
                      CardCade is 100% free to play. There are no purchases, subscriptions, or fees of any kind. All tokens are provided free of charge.
                    </p>

                    <p className="text-muted-foreground mt-2">
                      Account Management
                    </p>
                    <p className="text-muted-foreground">
                      Users may close their accounts at any time by contacting support. CardCade reserves the right to suspend or terminate accounts that violate our Terms of Service.
                    </p>
                  </>
                ),
              },
              {
                title: "6. Age Requirements",
                content: (
                  <>
                    <p className="text-muted-foreground">
                      CardCade is available to users who meet the minimum age requirements in their jurisdiction:
                    </p>

                    <p className="text-muted-foreground mt-2">
                      - Must be at least 18 years old (or the age of majority in your jurisdiction)
                    </p>
                    <p className="text-muted-foreground">
                      - Age verification may be required for prize redemption
                    </p>
                    <p className="text-muted-foreground">
                      - Providing false age information will result in account termination
                    </p>

                    <p className="text-muted-foreground mt-2">
                      As a free-to-play entertainment platform, CardCade does not have geographic restrictions. Users from any location may participate, provided they meet the age requirements and comply with their local laws.
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
                      Prevent the use of CardCade’s platform for money laundering, terrorist financing, or illicit activity.
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
                      - Multiple high-value deposits without corresponding token gameplay.
                    </p>
                    <p className="text-muted-foreground">
                      - Immediate withdrawal attempts after obtaining tokens.
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
                      CardCade maintains strict measures to ensure fairness and integrity in all games and sweepstakes contests.
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
                      To maintain fair play and protect against fraud or automated activity, CardCade imposes a daily limit of twenty (20) picks per user. If you reach this limit in a calendar day, your account may be temporarily suspended from additional play for that day. CardCade reserves the right to review such activity, request verification, and determine whether the activity constitutes suspicious, abusive, or fraudulent conduct. Accounts found in violation may be subject to prize forfeiture or permanent termination.
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