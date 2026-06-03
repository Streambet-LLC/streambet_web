import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const Terms = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />

      <main className="container flex-1 py-8 md:py-16">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">CardCade Terms of Service</h1>
            <p className="text-muted-foreground">Last Updated: January 16, 2026</p>
          </div>

          <div className="grid gap-8">
            {[
              {
                title: 'Introduction',
                content: (
                  <>
                    <p className="text-muted-foreground mb-4">
                      Welcome to CardCade! These Terms of Service ("Terms") are a legal agreement
                      between you ("you," "Player," or "User") and CardCade Inc. ("CardCade," "we,"
                      "us," or "our"). By creating an account or using the CardCade website and apps
                      (collectively, the "Platform"), you accept and agree to be bound by these
                      Terms, our Privacy Policy, and all applicable rules and policies referenced
                      herein. If you do not agree, you must not use the Platform.
                    </p>
                    <p className="text-muted-foreground mb-4">
                      <strong>IMPORTANT:</strong> CardCade is a{' '}
                      <strong>100% free-to-play entertainment platform</strong>. There are{' '}
                      <strong>no purchases, no payments, and no real-money gambling</strong>. All
                      users receive free tokens to play games and compete for prizes. Tokens have no
                      cash value and cannot be purchased. Prizes consist of merchandise, gift cards,
                      and other non-cash rewards. All gameplay is for entertainment purposes only.{' '}
                      <strong>
                        These Terms include a binding arbitration agreement and class action waiver.
                      </strong>{' '}
                      Please read carefully to understand your rights.
                    </p>
                  </>
                ),
              },
              {
                title: '1. Eligibility',
                content: (
                  <>
                    <p className="text-muted-foreground mb-2 font-semibold">1.1 Age Requirement:</p>
                    <p className="text-muted-foreground mb-4">
                      You must be at least 18 years old to register and play on CardCade. By using
                      the Platform, you represent that you are at least 18 years of age.
                    </p>

                    <p className="text-muted-foreground mb-2 font-semibold">
                      1.2 General Availability:
                    </p>
                    <p className="text-muted-foreground mb-4">
                      CardCade is a free-to-play entertainment platform available to users where
                      permitted by law. By accessing the Platform, you represent that your use
                      complies with all applicable local, state, and federal laws in your
                      jurisdiction.
                    </p>
                  </>
                ),
              },
              {
                title: '2. Account Registration and User Responsibilities',
                content: (
                  <>
                    <p className="text-muted-foreground mb-2 font-semibold">
                      2.1 Account Creation:
                    </p>
                    <p className="text-muted-foreground mb-4">
                      To use CardCade, you must register an account with a valid email, create a
                      username, and confirm you are 18 years or older. You agree to provide truthful
                      and current information about yourself during registration. Each individual is
                      limited to one (1) account. Creating multiple accounts is strictly prohibited
                      and may result in all accounts being closed.
                    </p>
                    <ul className="list-disc pl-6 space-y-2 mb-4">
                      <li className="text-muted-foreground">
                        Accounts are non-transferable and may not be sold, assigned, or shared.
                        Attempting to sell or transfer an account is a violation of these Terms and
                        will result in account closure.
                      </li>
                      <li className="text-muted-foreground">
                        You are responsible for maintaining the confidentiality of your login
                        credentials. <strong>Do not share your password</strong> or allow others to
                        access your account. You are liable for all activity under your account,
                        whether or not authorized by you. If you suspect any unauthorized access to
                        your account, notify us immediately.
                      </li>
                    </ul>

                    <p className="text-muted-foreground mb-2 font-semibold">
                      2.2 Eligibility Verification:
                    </p>
                    <p className="text-muted-foreground mb-4">
                      CardCade reserves the right to verify your identity, age, and residency at any
                      time. You may be required to submit documentation (e.g. government-issued ID,
                      proof of address such as a utility bill) to confirm you meet the eligibility
                      requirements. Failure to provide requested information or the discovery of
                      false information may result in suspension or termination of your account.
                    </p>

                    <p className="text-muted-foreground mb-2 font-semibold">
                      2.3 Account Security:
                    </p>
                    <p className="text-muted-foreground mb-4">
                      You agree to use the Platform only for personal, non-commercial entertainment.
                      You must not use anyone else's account or allow anyone else to use your
                      account. We are not responsible for any loss or activity that results from
                      your failure to secure your account. CardCade may in its discretion suspend or
                      terminate any account that appears to be compromised or involved in fraudulent
                      or suspicious activity.
                    </p>
                  </>
                ),
              },
              {
                title: '3. Free Tokens and Gameplay',
                content: (
                  <>
                    <p className="text-muted-foreground mb-4">
                      CardCade operates on a <strong>100% free-to-play model</strong>. All users
                      receive free tokens to play games on the Platform. Tokens have no cash value
                      and cannot be purchased, sold, or transferred.
                    </p>

                    <p className="text-muted-foreground mb-2 font-semibold">3.1 How Tokens Work:</p>
                    <ul className="list-disc pl-6 space-y-4 mb-4">
                      <li className="text-muted-foreground">
                        <strong>Free Distribution:</strong> All tokens are provided free of charge
                        through daily bonuses, promotional giveaways, account registration bonuses,
                        and special events. There is never any cost to obtain tokens.
                      </li>
                      <li className="text-muted-foreground">
                        <strong>Entertainment Use:</strong> Tokens are used to play games on the
                        Platform. Game outcomes are determined by chance using random number
                        generators or other fair chance-based mechanics.
                      </li>
                      <li className="text-muted-foreground">
                        <strong>No Cash Value:</strong> Tokens have no monetary value and cannot be
                        redeemed for cash. They are virtual credits for entertainment purposes only.
                      </li>
                      <li className="text-muted-foreground">
                        <strong>Non-Transferable:</strong> Tokens cannot be transferred to other
                        users, sold, or converted to anything of value outside the Platform.
                      </li>
                    </ul>

                    <p className="text-muted-foreground mb-2 font-semibold">3.2 Prizes:</p>
                    <p className="text-muted-foreground mb-4">
                      When playing games with tokens, users may win prizes including merchandise,
                      gift cards, and other non-cash rewards. Prize availability and types are
                      determined by CardCade and may change at any time. Prizes have no cash
                      redemption value and cannot be exchanged for cash.
                    </p>

                    <p className="text-muted-foreground mb-2 font-semibold">3.3 Token Balance:</p>
                    <p className="text-muted-foreground mb-4">
                      Your token balance is shown in your account and reflects tokens available for
                      gameplay. Tokens do not expire while your account remains active, but CardCade
                      reserves the right to remove tokens from dormant accounts (accounts with no
                      activity for 12+ months) after attempts to contact you.
                    </p>
                  </>
                ),
              },
              {
                title: '4. Prize Redemption',
                content: (
                  <>
                    <p className="text-muted-foreground mb-4">
                      Users may win prizes through gameplay on the Platform. All prizes consist of
                      merchandise, gift cards, or other non-cash rewards. CardCade does not offer
                      cash prizes or cash redemptions.
                    </p>

                    <p className="text-muted-foreground mb-2 font-semibold">4.1 Prize Types:</p>
                    <p className="text-muted-foreground mb-4">
                      Prizes may include but are not limited to: gift cards to various retailers,
                      physical merchandise, digital goods, or other items as determined by CardCade.
                      Prize availability and selection are at CardCade's sole discretion and may
                      change at any time.
                    </p>

                    <p className="text-muted-foreground mb-2 font-semibold">
                      4.2 Redemption Process:
                    </p>
                    <p className="text-muted-foreground mb-4">
                      To redeem a prize, users must initiate a redemption request through the
                      Platform. CardCade will provide instructions for prize delivery, which may
                      include shipping physical items or delivering digital codes via email.
                      Processing times vary depending on prize type and availability.
                    </p>

                    <p className="text-muted-foreground mb-2 font-semibold">4.3 Eligibility:</p>
                    <p className="text-muted-foreground mb-4">
                      Prize redemption is subject to account verification to confirm eligibility.
                      CardCade reserves the right to request additional information to prevent fraud
                      or abuse. Prizes are void where prohibited by law.
                    </p>

                    <p className="text-muted-foreground mb-2 font-semibold">4.4 No Cash Value:</p>
                    <p className="text-muted-foreground mb-4">
                      Prizes have no cash redemption value and cannot be exchanged for cash,
                      transferred to other users, or substituted except at CardCade's sole
                      discretion. In some cases, CardCade may substitute a prize of equal or greater
                      value if the advertised prize becomes unavailable.
                    </p>
                  </>
                ),
              },
              {
                title: '5. Gameplay Rules and User Conduct',
                content: (
                  <>
                    <p className="text-muted-foreground mb-4">
                      When using the Platform, you agree to abide by the following rules of conduct
                      and gameplay:
                    </p>

                    <p className="text-muted-foreground mb-2 font-semibold">6.1 Fair Play:</p>
                    <p className="text-muted-foreground mb-4">
                      You will only participate in games through normal use of the provided
                      interfaces. Any form of cheating, hacking, bot usage, automation, manipulation
                      of software, exploitation of bugs, or other unauthorized intervention in
                      gameplay is strictly prohibited. Each game outcome is intended to be random
                      and fair; any attempt to interfere with the fair outcome (such as colluding
                      with others or exploiting a vulnerability) will result in immediate
                      disqualification and account action.
                    </p>

                    <p className="text-muted-foreground mb-2 font-semibold">
                      6.2 One Account, One Player:
                    </p>
                    <p className="text-muted-foreground mb-4">
                      You may not create multiple accounts or use multiple identities to gain an
                      unfair advantage or circumvention of limits (e.g., to bypass prize caps or
                      welcome bonus limits). If we detect multiple accounts controlled by the same
                      person, we may terminate or merge accounts at our discretion and void any
                      associated prizes.
                    </p>

                    <p className="text-muted-foreground mb-2 font-semibold">
                      6.3 Prohibited Activities:
                    </p>
                    <p className="text-muted-foreground mb-4">
                      You shall NOT engage in any of the following activities on the Platform:
                    </p>

                    <ul className="list-disc pl-6 space-y-4 mb-4">
                      <li className="text-muted-foreground">
                        <strong>Impersonation or False Information:</strong> Providing false
                        information, impersonating any person or entity, or misrepresenting your
                        affiliation with any person/entity.
                      </li>
                      <li className="text-muted-foreground">
                        <strong>Platform Abuse:</strong> Attempting to abuse, manipulate, or exploit
                        the Platform's systems or promotional programs in ways not intended by
                        CardCade.
                      </li>
                      <li className="text-muted-foreground">
                        <strong>Fraud and Illegal Use:</strong> Using the Platform for any
                        fraudulent or unlawful purpose. This includes attempting to fraudulently
                        obtain tokens or prizes. Any suspected illegal activity will be reported to
                        authorities.
                      </li>
                      <li className="text-muted-foreground">
                        <strong>Account Trading or Sharing:</strong> Selling, buying, or trading
                        accounts, or sharing account access with others. Your account is personal to
                        you.
                      </li>
                      <li className="text-muted-foreground">
                        <strong>Harassment or Improper Conduct:</strong> Using any chat or social
                        features (if available) to harass, threaten, or bully other players, or to
                        post any obscene, offensive, or hateful content. Hate speech,
                        discrimination, or any content promoting violence or illegal acts is not
                        tolerated. We aim to maintain a friendly community.
                      </li>
                      <li className="text-muted-foreground">
                        <strong>Interference:</strong> Uploading or transmitting any harmful code,
                        virus, malware, or doing anything that could interfere with or disrupt the
                        Platform's integrity or security.
                      </li>
                      <li className="text-muted-foreground">
                        <strong>Data Mining:</strong> Using any robot, scraper, or automated means
                        to access or collect data from the Platform, or attempting to reverse
                        engineer the Platform’s software.
                      </li>
                    </ul>

                    <p className="text-muted-foreground mb-2 font-semibold">
                      6.4 Gameplay Rules and User Conduct:
                    </p>
                    <p className="text-muted-foreground mb-4">
                      Prohibited Activities include fraud, manipulation, and unauthorized use.
                    </p>

                    <ul className="list-disc pl-6 space-y-4 mb-4">
                      <li className="text-muted-foreground">
                        <strong>Excessive Play Limitations:</strong> To maintain fair play and
                        protect against fraud or automated activity, CardCade imposes a daily limit
                        of twenty (20) picks per user. If you reach this limit in a calendar day,
                        your account may be temporarily suspended from additional play for that day.
                        CardCade reserves the right to review such activity, request verification,
                        and determine whether the activity constitutes suspicious, abusive, or
                        fraudulent conduct. Accounts found in violation may be subject to prize
                        forfeiture or permanent termination.
                      </li>
                    </ul>

                    <p className="text-muted-foreground mb-2 font-semibold">
                      6.5 Collusion and Syndicates:
                    </p>
                    <p className="text-muted-foreground mb-4">
                      Players should play individually. Any form of collusion between players (e.g.,
                      coordinating bets to influence outcomes or sharing winnings) is prohibited. If
                      games involve multiplayer competition, players must not team up in unfair
                      ways. Syndicated play or any organized effort to exploit the system will
                      result in disqualification.
                    </p>

                    <p className="text-muted-foreground mb-2 font-semibold">
                      6.6 Responsible Play:
                    </p>
                    <p className="text-muted-foreground mb-4">
                      CardCade is intended for casual entertainment. Although no real money is at
                      risk in the games, we encourage users to play responsibly and within
                      reasonable time limits. If you believe you have a compulsive behavior toward
                      gaming, please use our self-exclusion or cooling-off tools available (see
                      Section 9 on Responsible Social Gaming) or seek help from organizations such
                      as Gaming Addicts Anonymous. You may self-exclude by contacting customer
                      support, in which case we will disable your account for a chosen period or
                      permanently as requested.
                    </p>
                  </>
                ),
              },
              {
                title: '7. Account Suspension and Termination',
                content: (
                  <>
                    <p className="text-muted-foreground mb-2 font-semibold">
                      7.1 Our Right to Suspend/Terminate:
                    </p>
                    <p className="text-muted-foreground mb-4">
                      CardCade reserves the right to suspend or terminate your account at our
                      discretion for violations of these Terms or any behavior that harms the
                      integrity of the Platform or other players' experience. This includes, but is
                      not limited to, any of the prohibited conduct described above, failure to
                      satisfy eligibility checks, fraudulent activity, or refusal to cooperate with
                      verification. We may do so with or without prior notice depending on the
                      severity of the issue.
                    </p>

                    <ul className="list-disc pl-6 space-y-4 mb-4">
                      <li className="text-muted-foreground">
                        If your account is suspended, you will be temporarily unable to access the
                        Platform (or certain features such as sweepstakes play). We will investigate
                        the matter. You will be notified of the suspension and may be asked for
                        additional information.
                      </li>
                      <li className="text-muted-foreground">
                        If your account is terminated, this is a permanent closure. You may also be{' '}
                        <strong>banned for life</strong> from creating a new account. Termination
                        may result in{' '}
                        <strong>forfeiture of your account balances and any pending prizes</strong>{' '}
                        if the termination is due to your misconduct or violation of these Terms. In
                        less severe cases, we may refund any cash balance you have or allow
                        redemption of legitimately won prizes, at our discretion, minus any damages
                        or costs incurred.
                      </li>
                    </ul>

                    <p className="text-muted-foreground mb-2 font-semibold">
                      7.2 Forfeiture Policy:
                    </p>
                    <p className="text-muted-foreground mb-4">
                      If an account is closed or terminated by us due to violation of Terms, any
                      tokens in the account will be forfeited and any unredeemed prizes may also be
                      forfeited. We will not typically confiscate legitimate prizes without cause;
                      however, any fraudulent gains or winnings from prohibited conduct are void.
                      For example, if you obtained tokens or prizes by cheating, those prizes will
                      not be paid, and any related transactions may be reversed.
                    </p>
                    <p className="text-muted-foreground mb-2 font-semibold">
                      7.3 User-Initiated Closure:
                    </p>
                    <p className="text-muted-foreground mb-4">
                      You may choose to close your account at any time by contacting customer
                      support. We will guide you through the process. If you have an eligible prize
                      balance at that time, we will allow you to redeem it before closure. Any
                      remaining tokens will be forfeited upon closure (since they are promotional
                      credits). Account closure is generally permanent; if you change your mind, you
                      would need to register a new account (and may not be entitled to new sign-up
                      bonuses if you already received them previously).
                    </p>
                    <p className="text-muted-foreground mb-2 font-semibold">7.4 Appeal:</p>
                    <p className="text-muted-foreground mb-4">
                      If you believe your account was wrongfully suspended or terminated, you may
                      contact our support team to dispute the decision. We will review appeals on a
                      case-by-case basis and in good faith. However, our determinations (including
                      eligibility judgments and findings of fact in investigations) are final. There
                      is no guaranteed reinstatement.
                    </p>
                  </>
                ),
              },
              {
                title: '8. Consumer Disclosures and Additional Terms',
                content: (
                  <>
                    <p className="text-muted-foreground mb-2 font-semibold">
                      8.1 Free Entertainment Platform:
                    </p>
                    <p className="text-muted-foreground mb-4">
                      CardCade is a free-to-play entertainment platform. By using the Platform, you
                      acknowledge that you are playing with promotional tokens that have no monetary
                      value. You are not wagering any real money. All tokens are distributed for
                      free. The Platform's games intend to simulate casino or betting style games
                      for entertainment purposes only. All references to "betting" or "odds" are
                      part of the game theme but do not imply traditional gambling activity or
                      real-money wagering.
                    </p>
                    <p className="text-muted-foreground mb-2 font-semibold">
                      8.2 Entertainment Value Only:
                    </p>
                    <p className="text-muted-foreground mb-4">
                      Tokens have no monetary value and cannot under any circumstances be exchanged
                      for real currency. You cannot sell or trade your tokens. Any purported sale or
                      trade of an account or tokens is void and is a violation of these Terms.
                    </p>
                    <p className="text-muted-foreground mb-2 font-semibold">
                      8.3 Third-Party Content:
                    </p>
                    <p className="text-muted-foreground mb-4">
                      The Platform may display or provide access to content provided by third
                      parties (for example, game software from third-party developers, or
                      promotional offers from partners). CardCade does not guarantee the accuracy or
                      integrity of third-party content. If the Platform contains links to
                      third-party websites or services, these are provided for convenience; we do
                      not endorse or take responsibility for third-party sites. Use caution and
                      review third-party terms and privacy policies when leaving our Platform.
                    </p>
                    <p className="text-muted-foreground mb-2 font-semibold">
                      8.4 Service Availability:
                    </p>
                    <p className="text-muted-foreground mb-4">
                      We strive to keep the Platform available 24/7, but we do not guarantee
                      uninterrupted service. Maintenance, upgrades, or network and power outages may
                      cause temporary service interruptions. We are not liable for any loss of
                      potential prizes or user inconvenience due to downtime. However, if a
                      disruption causes a specific game round or promotion to fail in a way that
                      affects you (e.g., a game crashes as you win), contact support – we will
                      investigate and, if appropriate, restore the state (such as re-crediting
                      tokens for an aborted round).
                    </p>
                    <p className="text-muted-foreground mb-2 font-semibold">
                      8.5 Changes to the Service:
                    </p>
                    <p className="text-muted-foreground mb-4">
                      CardCade reserves the right to modify, add, or remove features and games on
                      the Platform. We may introduce new games or retire existing ones. We may
                      adjust token distribution programs, bonus programs, payout options, or any
                      other aspect of the service. We will endeavor to give notice of material
                      changes (via the app, website, or email), but we are not obligated to maintain
                      any specific aspect of the Platform for any minimum time, except as required
                      by law. If you continue to use the Platform after changes, you are deemed to
                      accept those changes. If you object to a change, your remedy is to stop using
                      the service or close your account.
                    </p>
                    <p className="text-muted-foreground mb-2 font-semibold">
                      8.6 Intellectual Property:
                    </p>
                    <p className="text-muted-foreground mb-4">
                      All content on CardCade (including but not limited to game graphics, text,
                      software code, logos, trademarks, and audiovisual elements) is owned by or
                      licensed to CardCade and is protected by intellectual property laws. We grant
                      you a limited, revocable, non-transferable license to use the Platform and its
                      content for the sole purpose of participating in the games and services as
                      allowed by these Terms. You may not copy, modify, distribute, perform,
                      display, or create derivative works from our content except as expressly
                      permitted. “CardCade,” our logos, and our game titles are trademarks of
                      CardCade, Inc. You agree not to infringe our IP rights. Any feedback or
                      suggestions you provide to CardCade can be used by us freely and without
                      compensation to you.
                    </p>
                    <p className="text-muted-foreground mb-2 font-semibold">
                      8.7 Responsible Use and Self-Exclusion:
                    </p>
                    <p className="text-muted-foreground mb-4">
                      While no real money is at risk, we understand that gaming should still be done
                      in moderation. We provide voluntary self-exclusion options: you may request a
                      temporary cooling-off (during which your account will be locked for a
                      specified period) or a permanent self-exclusion (account closure). We will use
                      our best efforts to enforce self-exclusions (blocking new accounts, etc.).
                      However, you are ultimately responsible for honoring your self-exclusion. We
                      are not liable if you circumvent it and continue using the Platform.
                    </p>
                  </>
                ),
              },
              {
                title: '9. Privacy and Data',
                content: (
                  <>
                    <p className="text-muted-foreground mb-4">
                      Your privacy is important to us. Our collection, use, and protection of your
                      personal information are governed by our <b>Privacy Policy</b> (available on
                      our website). By using CardCade, you consent to the practices described in the
                      Privacy Policy. Key points include:
                    </p>
                    <ul className="list-disc pl-6 space-y-2 mb-4">
                      <li>
                        We collect information you provide (such as contact details, age, address)
                        and information about your use of the Platform (gameplay data, device
                        information, etc.). This information is used to provide and improve the
                        service, verify eligibility, prevent fraud, and for analytics and marketing
                        (in accordance with your preferences and applicable law).
                      </li>
                      <li>
                        We implement industry-standard security measures to protect your data.
                        However, no system is 100% secure, and you accept the inherent risks of
                        providing data online. Notify us immediately if you suspect any unauthorized
                        access to your account or personal data.
                      </li>
                      <li>
                        We do not sell your personal information to third parties. We may share data
                        with service providers as needed to operate (for example, payment
                        processors, verification services) and with regulators or authorities if
                        required by law.
                      </li>
                      <li>
                        U.S. Users: CardCade is U.S.-based and primarily directed to U.S. residents.
                        If you are a California resident or otherwise have rights under laws like
                        the California Consumer Privacy Act (CCPA), please refer to the Privacy
                        Policy for disclosures and how to exercise your rights (such as access or
                        deletion requests). Generally, you have the right to know what data we have
                        about you and to request deletion of certain data, subject to legal
                        exceptions.
                      </li>
                      <li>
                        By using the Platform, you agree that we may send you service-related
                        communications (e.g., account notifications, receipts). For marketing
                        communications, you have the ability to opt out.
                      </li>
                      <li>
                        If CardCade’s business is ever transferred or sold, user information may be
                        transferred as part of that transaction (we will ensure any successor honors
                        similar privacy commitments).
                      </li>
                    </ul>
                    <p className="text-muted-foreground mb-4">
                      For complete details, please review the Privacy Policy. If you have
                      privacy-related questions or requests, you can contact us at the email
                      provided in the Privacy Policy or through customer support.
                    </p>
                  </>
                ),
              },
              {
                title: '10. Disclaimers of Warranties; Limitation of Liability',
                content: (
                  <>
                    <p className="text-muted-foreground mb-2 font-semibold">10.1 As-Is Service:</p>
                    <p className="text-muted-foreground mb-4">
                      CardCade and its services are provided on an “AS IS” and “AS AVAILABLE” basis.
                      We make no warranty that the Platform will be error-free, secure, or
                      uninterrupted. We do not guarantee that any defects will be corrected, or that
                      the Platform is free of viruses or bugs (though we strive to maintain a safe
                      experience). To the fullest extent permitted by law, we disclaim all
                      warranties of any kind, whether express or implied, including implied
                      warranties of merchantability, fitness for a particular purpose, and
                      non-infringement. Use of the Platform is at your own risk.
                    </p>
                    <p className="text-muted-foreground mb-2 font-semibold">
                      10.2 No Guarantee of Results:
                    </p>
                    <p className="text-muted-foreground mb-4">
                      We do not promise that you will win any prize. Outcomes of games are random,
                      and luck varies by individual. Past results do not predict future outcomes.
                      All descriptions of odds or return-to-player (RTP) percentages are
                      informational; actual experience may differ. You accept that playing does not
                      guarantee prizes or profits.
                    </p>
                    <p className="text-muted-foreground mb-2 font-semibold">
                      10.3 Limitation of Liability:
                    </p>
                    <p className="text-muted-foreground mb-4">
                      To the maximum extent allowed by law, CardCade (and its parent, affiliates,
                      officers, directors, employees, and agents) will not be liable for any
                      indirect, incidental, special, consequential, or punitive damages arising out
                      of or relating to your use of (or inability to use) the Platform or any
                      content or services, even if we have been advised of the possibility of such
                      damages. This includes but is not limited to loss of data, loss of virtual
                      tokens, loss of goodwill, or the cost of procurement of substitute services.
                      Since CardCade is a free platform, our total liability to you for all claims
                      is limited to the smallest extent allowed by law. Some jurisdictions do not
                      allow certain limitations, so some of these may not apply to you, but our
                      liability is limited to the smallest extent allowed by law.
                    </p>
                    <p className="text-muted-foreground mb-2 font-semibold">
                      10.4 User Remediation:
                    </p>
                    <p className="text-muted-foreground mb-4">
                      Your sole remedy if you are dissatisfied with the Platform or these Terms is
                      to discontinue use of the service. Because CardCade is a free platform, you
                      have no basis to recover any damages. In any dispute, you agree that you are
                      not entitled to injunctive or equitable relief to stop our operation or any
                      feature (you have no property interest in the Platform or its offerings). You
                      further agree not to seek attorneys' fees or court costs if not mandated by
                      statute; each party will bear its own costs in dispute resolution.
                    </p>
                    <p className="text-muted-foreground mb-2 font-semibold">10.5 Exceptions:</p>
                    <p className="text-muted-foreground mb-4">
                      Nothing in these Terms is intended to exclude liability for CardCade’s own
                      intentional misconduct, fraud, or gross negligence, or for personal injury or
                      property damage caused by a product defect, to the extent that such liability
                      cannot be waived under applicable law. However, we do not accept liability for
                      ordinary negligence, technical errors, or any issues outside our reasonable
                      control (force majeure events).
                    </p>
                  </>
                ),
              },
              {
                title: '11. Dispute Resolution and Arbitration Agreement',
                content: (
                  <>
                    <p className="text-muted-foreground mb-4">
                      Please read this section carefully. It affects your legal rights by requiring
                      arbitration of most disputes and waiving your ability to bring or participate
                      in a class action.
                    </p>
                    <p className="text-muted-foreground mb-2 font-semibold">
                      11.1 Initial Dispute Resolution:
                    </p>
                    <p className="text-muted-foreground mb-4">
                      We encourage you to contact CardCade support to resolve any concerns or
                      disputes you have with our service. Most user concerns can be resolved
                      informally by contacting our customer service team at{' '}
                      <a href="mailto:contact@cardcade.fun" className="underline">
                        contact@cardcade.fun
                      </a>{' '}
                      and providing details of your issue. We will attempt in good faith to resolve
                      the dispute amicably within a reasonable time.
                    </p>
                    <p className="text-muted-foreground mb-2 font-semibold">
                      11.2 Binding Arbitration:
                    </p>
                    <p className="text-muted-foreground mb-4">
                      If we cannot resolve a dispute informally, you and CardCade agree that any
                      dispute, claim, or controversy arising out of or relating to these Terms or
                      your use of the Platform (collectively, “Disputes”) shall be resolved by final
                      and binding arbitration on an individual basis, not in court. You and CardCade
                      are each waiving the right to a jury trial or to have the dispute decided in
                      court before a judge. This agreement to arbitrate is governed by the Federal
                      Arbitration Act (“FAA”) and evidences a transaction in interstate commerce.{' '}
                      <b>
                        This arbitration requirement applies to all Disputes, including issues of
                        arbitrability, scope, validity, and enforceability of this arbitration
                        clause.
                      </b>
                    </p>
                    <p className="text-muted-foreground mb-2 font-semibold">
                      11.3 Class Action Waiver:
                    </p>
                    <p className="text-muted-foreground mb-4">
                      You and CardCade agree that all Disputes will be resolved in arbitration only
                      on an individual basis. You may only bring claims on your own behalf. You
                      cannot serve as a class representative or member or otherwise participate in a
                      class, collective, consolidated, or representative proceeding against
                      CardCade. The arbitrator shall have no authority to combine or aggregate
                      similar claims or conduct any class or collective arbitration. By agreeing to
                      these Terms, you are waiving any right to a jury trial and waiving any right
                      to participate in a class action against us.
                    </p>
                    <p className="text-muted-foreground mb-2 font-semibold">
                      11.4 Arbitration Procedures:
                    </p>
                    <p className="text-muted-foreground mb-4">
                      The arbitration will be administered by a neutral arbitration provider to be
                      agreed upon by the parties (such as JAMS or American Arbitration Association
                      (AAA)) under its applicable rules (e.g., the JAMS Comprehensive Arbitration
                      Rules and Procedures, or the AAA Consumer Arbitration Rules). If the parties
                      cannot agree, the arbitration provider shall be determined by court
                      appointment. The arbitration will take place in the county of your residence
                      or another mutually agreed location, or via teleconference/videoconference for
                      convenience. The law of the State of Delaware will govern the substance of the
                      Dispute, but not the choice of law rules or the arbitration procedure (which
                      is governed by the FAA).
                    </p>
                    <ul className="list-disc pl-6 space-y-2 mb-4">
                      <li>
                        <b>Costs:</b> Each party is responsible for its own attorneys’ fees. The
                        costs of arbitration (administrative fees and arbitrator’s fees) will be
                        allocated per the arbitration provider’s rules. However, if you cannot
                        afford the arbitration costs, please inform us; we will consider advancing
                        or reimbursing fees where required or appropriate to ensure access to
                        arbitration. The arbitrator may award fees or costs to a prevailing party if
                        provided under applicable law or rules (e.g., if a claim is found
                        frivolous).
                      </li>
                      <li>
                        <b>Arbitrator’s Authority:</b> The arbitrator shall apply the Terms and the
                        law, and can award the same damages and relief as a court (including
                        equitable relief or statutory damages), but{' '}
                        <b>
                          only in favor of the individual party seeking relief and only to the
                          extent necessary to provide relief warranted by that party’s individual
                          claim
                        </b>
                        . The arbitrator will provide a reasoned written decision if requested by
                        either party. Judgment on the arbitration award may be entered in any court
                        with proper jurisdiction.
                      </li>
                      <li>
                        <b>Exceptions:</b> Notwithstanding the above, <i>either party</i> may elect
                        to pursue an individual claim in <b>small claims court</b> if the claim is
                        within that court’s jurisdiction and proceeding on an individual (non-class)
                        basis. Also, either party may bring issues to the attention of federal,
                        state, or local agencies for matters within those agencies’ jurisdiction
                        (e.g., filing a complaint with a regulatory authority), and those agencies
                        can seek relief against us on your behalf if allowed by law.
                      </li>
                    </ul>
                    <p className="text-muted-foreground mb-2 font-semibold">11.5 Opt-Out Right:</p>
                    <p className="text-muted-foreground mb-4">
                      <i>New users only:</i> You have the right to opt out of the binding
                      arbitration and class waiver provisions in this Section 11 by sending a
                      written notice of your decision to opt out to the following address: CardCade
                      Inc., [Arbitration Opt-Out], [address]. The opt-out notice must be postmarked
                      (or emailed to{' '}
                      <a href="mailto:legal@streambet.tv" className="underline">
                        legal@streambet.tv
                      </a>
                      ) within 30 days of the date you first register your account or otherwise
                      become subject to these Terms. Your notice must include your name, address,
                      email used for CardCade, and an unambiguous statement that you wish to opt out
                      of the arbitration agreement. If you opt out, disputes will be resolved in
                      court, and you will not be bound by the class action waiver (though we reserve
                      the right to seek to sever it). Opting out of arbitration does not terminate
                      any other provision of these Terms (including the class action waiver if
                      allowed). If you do not opt out within 30 days, you will be bound to arbitrate
                      disputes under these terms.
                    </p>
                    <p className="text-muted-foreground mb-2 font-semibold">
                      11.6 Severability of Arbitration Provisions:
                    </p>
                    <p className="text-muted-foreground mb-4">
                      If any portion of this arbitration agreement is found unenforceable or
                      unlawful for any reason, the unenforceable provision shall be severed, and the
                      remaining arbitration provisions shall continue in full force and effect.
                      However, if the class action waiver (Section 11.3) is found invalid or
                      unenforceable, then the entirety of this arbitration section shall be null and
                      void. In no case shall a class, collective, or representative action be
                      arbitrated.
                    </p>
                    <p className="text-muted-foreground mb-4">
                      <b>
                        By agreeing to these Terms, you explicitly acknowledge that you have read
                        and understand this arbitration agreement and agree to be bound by it.
                      </b>{' '}
                      You understand that you are waiving rights to trial by jury or to participate
                      in a class action.
                    </p>
                  </>
                ),
              },
              {
                title: '12. Governing Law and Jurisdiction',
                content: (
                  <>
                    <p className="text-muted-foreground mb-4">
                      These Terms and your use of the Platform are governed by the{' '}
                      <b>laws of the State of Delaware, USA</b>,{' '}
                      <b>without regard to its conflict of law principles</b>. Delaware law will
                      apply to interpret your and our rights and obligations under this agreement
                      (except where federal law, such as the FAA, governs the arbitration clause).
                    </p>
                    <p className="text-muted-foreground mb-4">
                      <b>Subject to the arbitration agreement above</b>, if any dispute arising out
                      of these Terms is found not subject to arbitration (for example, if you opt
                      out of arbitration or a claim is allowed to proceed in court), then you and
                      CardCade agree that{' '}
                      <b>
                        such claim will be brought exclusively in the state or federal courts
                        located in the State of Delaware
                      </b>
                      . You and CardCade{' '}
                      <b>consent to the personal jurisdiction of Delaware courts</b> for litigation
                      of allowed disputes, and waive any objections to such venue on grounds of
                      inconvenience or jurisdiction. This provision is subject to any rights you may
                      have under applicable consumer protection laws regarding venue; but to the
                      extent permitted, you agree Delaware is an appropriate and convenient forum.
                    </p>
                  </>
                ),
              },
              {
                title: '13. Miscellaneous',
                content: (
                  <>
                    <p className="text-muted-foreground mb-2 font-semibold">13.1 Severability:</p>
                    <p className="text-muted-foreground mb-4">
                      If any provision of these Terms is held to be invalid or unenforceable, that
                      provision will be enforced to the maximum extent permissible and the remaining
                      provisions of the Terms will remain in full force and effect. Our failure to
                      enforce any right or provision of these Terms does not constitute a waiver of
                      that right or provision.
                    </p>
                    <p className="text-muted-foreground mb-2 font-semibold">
                      13.2 Entire Agreement:
                    </p>
                    <p className="text-muted-foreground mb-4">
                      These Terms (along with the incorporated Privacy Policy and any additional
                      rules or terms for specific promotions or features) constitute the entire
                      agreement between you and CardCade regarding the Platform. They supersede all
                      prior or contemporaneous agreements, understandings, or communications,
                      whether written or oral, relating to the subject matter. In case of a conflict
                      between these Terms and any other policy or document, these Terms will
                      generally control, except where a specific promotion has expressly differing
                      terms.
                    </p>
                    <p className="text-muted-foreground mb-2 font-semibold">
                      13.3 Changes to Terms:
                    </p>
                    <p className="text-muted-foreground mb-4">
                      CardCade may update or modify these Terms from time to time. We will post the
                      revised Terms on our site with a “last updated” date. If changes are material,
                      we will also notify users via email or in-app notification. By continuing to
                      use the Platform after updated Terms are posted, you accept and agree to the
                      changes. If you do not agree to the revised Terms, you must stop using the
                      service and may close your account. Any changes will not apply retroactively
                      to disputes that arose before the change effective date; those will be
                      governed by the Terms in place at the time of the events leading to the
                      dispute.
                    </p>
                    <p className="text-muted-foreground mb-2 font-semibold">13.4 No Assignment:</p>
                    <p className="text-muted-foreground mb-4">
                      You may not assign or transfer any rights or obligations under these Terms
                      without our prior written consent. Any attempted assignment by you without
                      consent is null. CardCade may freely assign or transfer this agreement (for
                      example, in the event of a merger, acquisition, or transfer of assets). These
                      Terms are binding on any permitted assignees.
                    </p>
                    <p className="text-muted-foreground mb-2 font-semibold">13.5 No Agency:</p>
                    <p className="text-muted-foreground mb-4">
                      You and CardCade are independent parties. Nothing in these Terms shall be
                      construed as creating any agency, partnership, joint venture, or other form of
                      joint enterprise between us. You are not authorized to make any
                      representations or bind CardCade in any manner.
                    </p>
                    <p className="text-muted-foreground mb-2 font-semibold">
                      13.6 Contact Information:
                    </p>
                    <p className="text-muted-foreground mb-4">
                      If you have any questions, concerns, or notices required under these Terms,
                      please contact us at:
                    </p>
                    <ul className="list-disc pl-6 space-y-2 mb-4">
                      <li>
                        <b>CardCade, Inc.</b> (Attn: Legal/Support)
                      </li>
                      <li>[Address]</li>
                      <li>
                        Email:{' '}
                        <a href="mailto:contact@cardcade.fun" className="underline">
                          contact@cardcade.fun
                        </a>
                      </li>
                    </ul>
                    <p className="text-muted-foreground mb-4">
                      We will also use your registered email address to send you any notices or
                      communications required under these Terms, so please keep it up to date.
                    </p>
                  </>
                ),
              },
            ].map((section, index) => (
              <Card key={index} className="p-6 lg:p-8">
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold">{section.title}</h2>
                  <Separator />
                  <div className="text-muted-foreground leading-relaxed">{section.content}</div>
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

export default Terms;