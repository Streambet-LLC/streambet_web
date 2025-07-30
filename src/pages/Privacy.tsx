import React from 'react';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />

      <main className="container flex-1 py-16">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">Privacy Policy</h1>
            <p className="text-muted-foreground">
              Effective Date: {new Date().toLocaleDateString()}
            </p>
            <p className="text-muted-foreground">
              Last Updated: {new Date().toLocaleDateString()}
            </p>
          </div>

          <div className="grid gap-8">
            {[
              {
                title: "Introduction",
                content: (
                  <>
                    <p className="text-muted-foreground mb-4">
                      Streambet Inc. (“Streambet.tv”, “we”, “us”, or “our”) respects your privacy and is committed to protecting your personal information. This Privacy Policy explains how we collect, use, share, and safeguard your information when you use our sweepstakes-based livestream platform.
                    </p>
                    <p className="text-muted-foreground mb-4">
                      This Policy applies to users in the United States, European Union (EU), United Kingdom (UK), Canada, and other applicable jurisdictions. By using Streambet.tv, you consent to the data practices described in this Privacy Policy.
                    </p>
                  </>
                ),
              },
              {
                title: "1. Information We Collect",
                content: (
                  <>
                    <p className="text-muted-foreground mb-2 font-semibold">a. Personal Information</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Name, email address, username</li>
                      <li>Government-issued ID (via third-party KYC providers)</li>
                      <li>Date of birth (for age verification)</li>
                      <li>Billing and payout details (processed via third-party payment and wire services)</li>
                    </ul>
                    <p className="text-muted-foreground mt-4 mb-2 font-semibold">b. Platform Activity</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Wager selections, outcomes, win/loss history</li>
                      <li>Wallet balance and redeemable prize amounts</li>
                      <li>Cash-out requests, subscription transactions, reward redemptions</li>
                      <li>Time spent on the platform, session logs</li>
                    </ul>
                    <p className="text-muted-foreground mt-4 mb-2 font-semibold">c. Device and Technical Data</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>IP address and geolocation data (collected for geo-fencing)</li>
                      <li>Browser type, device identifier, operating system</li>
                      <li>Unique session IDs and usage metadata</li>
                    </ul>
                    <p className="text-muted-foreground mt-4 mb-2 font-semibold">d. Livestream Interaction</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Chat messages</li>
                      <li>Viewer engagement data (e.g., stream views, interaction frequency)</li>
                      <li>Bet volume and viewer stats (shared with stream hosts)</li>
                      <li>Recorded livestreams, which may be reused for marketing purposes</li>
                    </ul>
                    <p className="text-muted-foreground mt-4 mb-2 font-semibold">e. Cookies and Tracking</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>We use cookies, pixels, and similar tracking technologies to recognize returning users, monitor app usage and performance, and deliver personalized advertising and retargeting via platforms like Google, Meta (Facebook), and others.</li>
                      <li>You may manage cookie preferences through your browser or opt out using industry-standard tools (e.g., DAA, NAI).</li>
                    </ul>
                  </>
                ),
              },
              {
                title: "2. How We Use Your Information",
                content: (
                  <>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Operate and maintain the platform</li>
                      <li>Enforce sweepstakes eligibility rules (e.g., age and location restrictions)</li>
                      <li>Process transactions, rewards, and cash-outs</li>
                      <li>Detect and prevent fraud, cheating, or abuse</li>
                      <li>Deliver promotional and service-related communications</li>
                      <li>Comply with legal obligations in the U.S., EU, UK, and Canada</li>
                    </ul>
                  </>
                ),
              },
              {
                title: "3. Sharing and Disclosure",
                content: (
                  <>
                    <p className="text-muted-foreground mb-2">We do not sell your personal data. We may share your information with:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Payment and Payout Providers (to process subscriptions, wires, and redemptions)</li>
                      <li>Third-Party KYC Vendors (for identity verification)</li>
                      <li>Analytics and Marketing Tools (e.g., Google Analytics, Mixpanel, Meta Pixel)</li>
                      <li>Livestream Hosts (aggregated data: number of bettors, total bet volume, viewer counts)</li>
                      <li>Legal Authorities when required by subpoena, court order, or government request</li>
                      <li>Successors or acquirers in the event of a merger or sale</li>
                    </ul>
                  </>
                ),
              },
              {
                title: "4. Age and Jurisdiction Restrictions",
                content: (
                  <>
                    <p className="text-muted-foreground mb-2">Streambet.tv is intended for users 18 years of age or older. We do not knowingly collect data from individuals under 18.</p>
                    <p className="text-muted-foreground mb-2">Access to Streambet.tv is geo-fenced. Users located in the following U.S. states are prohibited:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Idaho, Michigan, Montana, Nevada, New York, and Washington</li>
                    </ul>
                    <p className="text-muted-foreground mt-2">We collect IP-based geolocation data to enforce jurisdictional restrictions.</p>
                  </>
                ),
              },
              {
                title: "5. International Data Transfers & Legal Compliance",
                content: (
                  <>
                    <p className="text-muted-foreground mb-2">We process and store data in the United States. If you access Streambet.tv from outside the U.S., you consent to transferring your data to the U.S.</p>
                    <p className="text-muted-foreground mb-2">We comply with the following regional privacy laws:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>General Data Protection Regulation (GDPR) – European Union</li>
                      <li>UK Data Protection Act 2018 – United Kingdom</li>
                      <li>California Consumer Privacy Act (CCPA/CPRA) – California</li>
                      <li>Personal Information Protection and Electronic Documents Act (PIPEDA) – Canada</li>
                    </ul>
                    <p className="text-muted-foreground mt-2 mb-2">Depending on your jurisdiction, you may have the right to:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Request access to your data</li>
                      <li>Correct or delete your data</li>
                      <li>Withdraw consent or object to certain uses</li>
                      <li>Request data portability</li>
                    </ul>
                    <p className="text-muted-foreground mt-2">Submit such requests by emailing <a href="mailto:info@streambet.tv" className="underline">info@streambet.tv</a>.</p>
                  </>
                ),
              },
              {
                title: "6. Data Retention",
                content: (
                  <>
                    <p className="text-muted-foreground mb-2">
                      We retain user data as long as your account is active or as necessary to comply with our legal obligations. Upon account deletion, your data will be retained for 30 days before being permanently removed from our systems, unless required otherwise by law.
                    </p>
                  </>
                ),
              },
              {
                title: "7. Security and Breach Notification",
                content: (
                  <>
                    <p className="text-muted-foreground mb-2">
                      We implement physical, technical, and organizational safeguards to protect your data. No system is 100% secure, but we maintain protocols to detect and respond to potential data breaches.
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>We will notify affected users as required under applicable law</li>
                      <li>We will report to appropriate supervisory authorities (e.g., ICO, CPPA, etc.)</li>
                    </ul>
                  </>
                ),
              },
              {
                title: "8. Your Controls and Choices",
                content: (
                  <>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>View and edit your profile data</li>
                      <li>Request account deletion or data export via <a href="mailto:info@streambet.tv" className="underline">info@streambet.tv</a></li>
                      <li>Opt out of marketing communications via email unsubscribe links</li>
                      <li>Adjust cookie and tracking settings in your browser</li>
                    </ul>
                  </>
                ),
              },
              {
                title: "9. Changes to This Policy",
                content: (
                  <>
                    <p className="text-muted-foreground mb-2">
                      We may update this Privacy Policy periodically. Material changes will be posted on this page with a revised “Effective Date.” We may also notify users via email or in-app notices.
                    </p>
                  </>
                ),
              },
              {
                title: "10. Contact Us",
                content: (
                  <>
                    <p className="text-muted-foreground mb-2">
                      If you have any questions or concerns about this Privacy Policy or your data rights, contact us at:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li><a href="mailto:info@streambet.tv" className="underline">info@streambet.tv</a></li>
                      <li>Streambet Inc.</li>
                    </ul>
                  </>
                ),
              },
            ].map((section, index) => (
              <Card key={index} className="p-6">
                <h2 className="text-2xl font-semibold mb-4">{section.title}</h2>
                <Separator className="mb-4" />
                {section.content}
              </Card>
            ))}
          </div>
        </div>
      </main>

      {/* <Footer /> */}
    </div>
  );
};

export default Privacy;