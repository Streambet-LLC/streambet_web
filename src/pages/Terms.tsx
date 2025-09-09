import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const Terms = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />

      <main className="container flex-1 py-16">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">Streambet Terms of Service</h1>
            <p className="text-muted-foreground">
              Last Updated: August 14, 2025
            </p>
          </div>

          <div className="grid gap-8">
            {[
              {
                title: "Introduction",
                content: (
                  <>
                    <p className="text-muted-foreground mb-4">
                      Welcome to Streambet! These Terms of Service ("Terms") are a legal agreement between you ("you," "Player," or "User") and Streambet, Inc. ("Streambet," "we," "us," or "our"). Streambet is a Delaware C-Corporation operating a dual-currency sweepstakes gaming platform. By creating an account or using the Streambet website and apps (collectively, the "Platform"), you accept and agree to be bound by these Terms, our Privacy Policy, and all applicable rules and policies referenced herein. If you do not agree, you must not use the Platform.
                    </p>
                    <p className="text-muted-foreground mb-4">
                      <strong>IMPORTANT:</strong> This Platform <strong>does not offer real-money gambling</strong>. <strong>No purchase is necessary</strong> to play or participate, and making purchases will <strong>not increase your chances of winning</strong>. All gameplay is for entertainment purposes only. Prizes can be won in <strong>Stream Coin Mode</strong> (sweepstakes play), but <strong>Stream Coins have no monetary value</strong> until redeemed in compliance with these Terms. <strong>These Terms include a binding arbitration agreement and class action waiver.</strong> Please read carefully to understand your rights.
                    </p>
                  </>
                ),
              },
              {
                title: "1. Eligibility and Jurisdiction",
                content: (
                  <>
                    <p className="text-muted-foreground mb-2 font-semibold">1.1 Age Requirement:</p>
                    <p className="text-muted-foreground mb-4">
                      You must be at least 18 years old (or older if required by your state) to register and play on Streambet. By using the Platform, you represent that you are at least 18 and of legal age to participate.
                    </p>
                    
                    <p className="text-muted-foreground mb-2 font-semibold">1.2 Location Requirements:</p>
                    <p className="text-muted-foreground mb-4">
                      Streambet is offered only within the United States and is void outside the U.S. or where prohibited by law. You must be a legal resident of an eligible U.S. state and physically located in an eligible state when accessing the Platform. We rely on your representation of your location and may use geolocation checks to enforce state restrictions.
                    </p>

                    <p className="text-muted-foreground mb-2 font-semibold">1.3 State-by-State Eligibility</p>
                    <p className="text-muted-foreground mb-4">
                      Laws regarding sweepstakes gaming vary by state. For legal compliance, Streambet categorizes U.S. states as follows:
                    </p>

                    <p className="text-muted-foreground mb-2 font-semibold">Green Light States – Fully Permitted</p>
                    <p className="text-muted-foreground mb-4">
                      If you reside in any of the following states, you have full access to both Gold Coin Mode and Stream Coin Mode play. Players in these states can play games for fun with Gold Coins and participate in sweepstakes promotions with Stream Coins, including redeeming prizes, subject to these Terms.
                    </p>
                    <p className="text-muted-foreground mb-4">
                      <strong>Alabama, Alaska, Arizona, California, Colorado, Illinois, Indiana, Kansas, Maine, Massachusetts, Minnesota, Missouri, New Hampshire, New Mexico, Oklahoma, Oregon, Pennsylvania*, Rhode Island, South Dakota, Texas, Utah, Virginia, Washington D.C., Wisconsin, Wyoming</strong> (25 states / jurisdictions)
                    </p>
                    <p className="text-muted-foreground mb-4">
                      *In Pennsylvania, sweepstakes with over $5,000 in prizes may require registration if advertised via direct mail.
                    </p>

                    <p className="text-muted-foreground mb-2 font-semibold">Yellow Light States – Potential limitations on Gold Coins</p>
                    <p className="text-muted-foreground mb-4">
                      In these states, you may use the Platform, but heightened compliance and monitoring are required due to older case law, pending legislation, or uncertain enforcement postures. Gold coin mode <em>can</em> be considered illegal gambling, and/or these jurisdictions have added restrictions
                    </p>
                    <p className="text-muted-foreground mb-4">
                      <strong>Florida*, Hawaii, Maryland, Mississippi, New Jersey, North Carolina, North Dakota, Ohio, South Carolina, Tennessee**, Vermont</strong> (11 states)
                    </p>
                    <p className="text-muted-foreground mb-4">
                      *Florida requires sweepstakes registration and bonding if the prize pool exceeds $5,000 and the promotion lasts more than 30 days.<br/>
                      **Tennessee has heightened risk based on state law interpretation of chance-based games and potential classification of virtual credits as a "thing of value."
                    </p>

                    <p className="text-muted-foreground mb-2 font-semibold">Yellow Light States - Actively monitoring evolving regulation</p>
                    <p className="text-muted-foreground mb-4">
                      In these states, you may use the platform, but there are more regulatory questions, quickly evolving regulation, and heightened risk of illegalization.
                    </p>
                    <p className="text-muted-foreground mb-4">
                      <strong>Arkansas, Georgia, Iowa, Kentucky, Nebraska, Delaware</strong> (6 states)
                    </p>

                    <p className="text-muted-foreground mb-2 font-semibold">Red Light States – Fully Prohibited (No Modes Available)</p>
                    <p className="text-muted-foreground mb-4">
                      Streambet does not operate in the following states, which have taken enforcement actions or passed laws prohibiting sweepstakes casino models, even if no purchase is necessary. If you are a resident of or physically located in any of these states, you are not allowed to create an account or use the Platform in any capacity:
                    </p>
                    <p className="text-muted-foreground mb-4">
                      <strong>Connecticut, Idaho, Louisiana, Michigan, Montana* (effective October 2025), Nevada, New York, Washington, West Virginia</strong> (9 states)
                    </p>
                    <p className="text-muted-foreground mb-4">
                      *Montana's prohibition on sweepstakes casinos takes effect October 1, 2025.
                    </p>

                    <p className="text-muted-foreground mb-4">
                      For simplicity, Streambet can be used (whether fully or with limitations) in: FL, HI, MD, MS, NJ, NC, ND, OH, SC, TN, VT, AL, AK, AZ, CA, CO, IL, IN, KS, ME, MA, MN, MO, NH, NM, OK, OR, PA, RI, SD, TX, UT, VA, DC, WI, WY, AR, GA, IA, KY, NE, DE
                    </p>
                    <p className="text-muted-foreground mb-4">
                      And cannot be used in: CT, ID, LA, MI, MT, NV, NY, WA, WV
                    </p>
                    <p className="text-muted-foreground mb-4">
                      If you are located in or a resident of a prohibited state, do not attempt to use Streambet. Any account created in a prohibited jurisdiction is subject to immediate closure. We may require proof of residency during registration or prize redemption. Misrepresenting your location or using VPNs or other technical measures to circumvent geolocation is a serious violation of these Terms and may result in forfeiture of prizes and account termination.
                    </p>
                  </>
                ),
              },
              {
                title: "2. Account Registration and User Responsibilities",
                content: (
                  <>
                    <p className="text-muted-foreground mb-2 font-semibold">2.1 Account Creation:</p>
                    <p className="text-muted-foreground mb-4">
                      To use Streambet, you must register an account with a valid email, create a username, and provide accurate contact information. You agree to provide truthful, current, and complete information about yourself during registration and to update it if it changes. Each individual is limited to one (1) account. Creating multiple accounts or alias accounts is strictly prohibited and may result in all accounts being closed.
                    </p>
                    <ul className="list-disc pl-6 space-y-2 mb-4">
                      <li className="text-muted-foreground">You must register <strong>using your own legal name</strong> and information. Accounts are non-transferable and may not be sold, assigned, or shared. Attempting to sell or transfer an account is a violation of these Terms and will result in account closure.</li>
                      <li className="text-muted-foreground">You are responsible for maintaining the confidentiality of your login credentials. <strong>Do not share your password</strong> or allow others to access your account. You are liable for all activity under your account, whether or not authorized by you. If you suspect any unauthorized access to your account, notify us immediately.</li>
                    </ul>

                    <p className="text-muted-foreground mb-2 font-semibold">2.2 Eligibility Verification:</p>
                    <p className="text-muted-foreground mb-4">
                      Streambet reserves the right to verify your identity, age, and residency at any time. You may be required to submit documentation (e.g. government-issued ID, proof of address such as a utility bill) to confirm you meet the eligibility requirements. Failure to provide requested information or the discovery of false information may result in suspension or termination of your account.
                    </p>

                    <p className="text-muted-foreground mb-2 font-semibold">2.3 Restricted Persons:</p>
                    <p className="text-muted-foreground mb-4">
                      The following individuals are ineligible to use the Platform: (a) Streambet employees, contractors, or affiliates (and their immediate family/household members) are prohibited from participating in sweepstakes promotions; (b) individuals on any self-exclusion list or barred by any government from gaming activities; (c) anyone otherwise prohibited by applicable law or by Streambet's internal compliance policies.
                    </p>

                    <p className="text-muted-foreground mb-2 font-semibold">2.4 Account Security:</p>
                    <p className="text-muted-foreground mb-4">
                      You agree to use the Platform only for personal, non-commercial entertainment. You must not use anyone else's account or allow anyone else to use your account. We are not responsible for any loss or activity that results from your failure to secure your account. Streambet may in its discretion suspend or terminate any account that appears to be compromised or involved in fraudulent or suspicious activity.
                    </p>
                  </>
                ),
              },
              {
                title: "3. Dual-Currency System: Gold Coins and Stream Coins",
                content: (
                  <>
                    <p className="text-muted-foreground mb-4">
                      Streambet operates a <strong>dual-currency model</strong> consisting of <strong>Gold Coins</strong> and <strong>Stream Coins</strong>. These virtual currencies are central to how the Platform offers both free-to-play entertainment and sweepstakes promotions. It is critical that you understand the differences between them:
                    </p>
                    
                    <ul className="list-disc pl-6 space-y-4 mb-4">
                      <li className="text-muted-foreground">
                        <strong>Gold Coins (GC):</strong> Gold Coins are <strong>play-for-fun virtual credits</strong>. They are designed for entertainment-only gameplay and <strong>have no cash value</strong>. Gold Coins <strong>cannot be redeemed for real money or any prize</strong> – they are used just like points to play games for amusement. You can acquire Gold Coins in various ways (purchases or free bonuses), and use them to play the casino-style games on the Platform in "Gold Coin Mode." All outcomes in Gold Coin Mode are for entertainment (e.g., showing what you <em>could</em> have won) but yield no prize. <strong>Gold Coins are not transferable</strong> to other users and cannot be converted into Stream Coins.
                      </li>
                      <li className="text-muted-foreground">
                        <strong>Stream Coins (SC):</strong> Stream Coins are <strong>sweepstakes entries</strong> in the form of virtual coins. Stream Coins <strong>can be redeemed for real prizes</strong> (such as cash or gift cards) in accordance with our redemption procedures. Importantly, Stream Coins <strong>are never for sale</strong> – you <strong>cannot and will not purchase Stream Coins directly</strong>. Instead, Stream Coins are <strong>obtained free of charge</strong> via various methods (detailed in Section 5). Using Stream Coins to play games on the Platform in "Stream Coin Mode" gives you a chance to win prizes from those games. Stream Coin gameplay is part of Streambet's sweepstakes system. While Stream Coin game outcomes look identical to Gold Coin game outcomes, the difference is that wins in Stream Coin Mode translate to prize winnings that can be redeemed. <strong>No purchase is necessary</strong> to obtain or use Stream Coins in the sweepstakes, and purchases of Gold Coins <strong>do not increase your odds of winning</strong> with Stream Coins.
                      </li>
                    </ul>

                    <p className="text-muted-foreground mb-4">
                      <strong>IMPORTANT:</strong> Gold Coins have <strong>no monetary value and cannot be redeemed</strong>, whereas Stream Coins are <strong>promotional sweepstakes entries</strong> that are <strong>potentially redeemable for prizes</strong> but <strong>only obtained without purchase</strong>. You <strong>cannot convert Gold Coins to Stream Coins</strong> (or vice versa), and <strong>neither virtual coin is "real money" or cryptocurrency.</strong> They are simply digital tokens for different play modes (one for fun, one for prize play).
                    </p>
                  </>
                ),
              },
              {
                title: "4. Gold Coin Mode (Entertainment-Only Play)",
                content: (
                  <>
                    <p className="text-muted-foreground mb-2 font-semibold">4.1 Gold Coin Usage:</p>
                    <p className="text-muted-foreground mb-4">
                      When playing in Gold Coin Mode, you are playing for fun and bragging rights only. Gold Coins allow you to play our games with no chance of monetary gain or loss. Outcomes in Gold Coin Mode have no bearing on Stream Coin outcomes, and you win or lose Gold Coins only.
                    </p>

                    <ul className="list-disc pl-6 space-y-4 mb-4">
                      <li className="text-muted-foreground">
                        <strong>Purchasing Gold Coins:</strong> You may <strong>purchase Gold Coins</strong> from Streambet to enhance your play-for-fun experience. When you buy Gold Coins, you are <strong>buying a license to use those virtual coins in the Platform games</strong>. <strong>This is not a deposit and not a payment toward future winnings</strong> – it is an entertainment purchase. Funds exchanged for Gold Coins <strong>will not be refunded</strong> and <strong>cannot be withdrawn</strong>. All Gold Coin purchases are <strong>final</strong>. Please purchase responsibly; since Gold Coins have no cash value, there is no cash-out from buying them.
                      </li>
                      <li className="text-muted-foreground">
                        <strong>Free Gold Coins:</strong> Streambet may also award free Gold Coins through promotions, loyalty rewards, daily login bonuses, or other giveaways. There may be opportunities to claim small Gold Coin bonuses regularly (for example, a daily bonus wheel or social media giveaways). These free Gold Coins are subject to the same "no value / no redemption" policy.
                      </li>
                      <li className="text-muted-foreground">
                        <strong>No Prizes in Gold Coin Mode:</strong> Playing with Gold Coins <strong>will not yield any prizes or rewards</strong> beyond in-game enjoyment. You <strong>cannot win real money</strong> or Stream Coins when using Gold Coins. Wins or losses of Gold Coins are purely virtual. Gold Coins cannot be traded, transferred, or converted to anything of value.
                      </li>
                      <li className="text-muted-foreground">
                        <strong>Account Balance:</strong> Your Gold Coin balance is shown in your account. It holds only entertainment value. We may cap the maximum Gold Coin balance or impose purchase limits (for example, Stake.us imposes a $9,000 purchase limit per transaction; Streambet may have similar limits for security and compliance).
                      </li>
                    </ul>

                    <p className="text-muted-foreground mb-2 font-semibold">4.2 Gold Coin Purchases – Payment Terms:</p>
                    <p className="text-muted-foreground mb-4">
                      If you choose to buy Gold Coins, you must provide a valid payment method (such as a credit/debit card or other accepted payment) and authorize us (or our payment processor) to charge it for the purchase amount. By purchasing, you represent that you are authorized to use the payment method and that the transaction is not fraudulent. All charges are in U.S. Dollars (USD) unless otherwise stated. No chargebacks or reversals: You agree not to reverse any payment for Gold Coins. If a chargeback occurs, we reserve the right to suspend your account and seek repayment of the reversed amount, which will be a debt you owe us.
                    </p>
                    <p className="text-muted-foreground mb-4">
                      We do not charge any fees beyond the purchase price for Gold Coins, but your bank or card issuer may impose fees (e.g. foreign transaction fees if applicable). Streambet is <strong>not liable for any third-party fees</strong> you incur in purchasing Gold Coins.
                    </p>
                    <p className="text-muted-foreground mb-2 font-semibold">4.3 Promotional Bonuses with Gold Coin Purchases:</p>
                    <p className="text-muted-foreground mb-4">
                      From time to time, Streambet may offer bonus Stream Coins with Gold Coin package purchases. For example, if you buy a special Gold Coin pack, you might receive a certain number of Stream Coins for free as a promotion. Any such bonus Stream Coins are provided <em>gratis</em> to enable sweepstakes play and do not represent a sale of Stream Coins. The number of Stream Coins (if any) given as a bonus will be clearly displayed at the time of purchase. All Gold Coin purchases (with or without bonus Stream Coins) remain final and non-refundable. Bonus Stream Coins are subject to the rules in Section 5 (they are sweepstakes entries).
                    </p>
                  </>
                ),
              },
              {
                title: "5. Stream Coin Mode (Sweepstakes Play and Prizes)",
                content: (
                  <>
                    <p className="text-muted-foreground mb-4">
                      Stream Coin Mode allows you to participate in our sweepstakes system for a chance to win real prizes. <strong>Playing in Stream Coin Mode is always free — you can only use Stream Coins that have been obtained through free methods.</strong> Key points about Stream Coins and sweepstakes:
                    </p>

                    <p className="text-muted-foreground mb-2 font-semibold">5.1 How to Obtain Stream Coins (No Purchase Necessary):</p>
                    <p className="text-muted-foreground mb-4">
                      You cannot buy Stream Coins from Streambet, and no payment is required to get Stream Coins. Every user has multiple free avenues to obtain Stream Coins, including:
                    </p>

                    <ul className="list-disc pl-6 space-y-4 mb-4">
                      <li className="text-muted-foreground">
                        <strong>Free Bonus with Gold Coin Purchase:</strong> As noted, when you purchase certain Gold Coin packages, we may grant complementary Stream Coins as a <strong>free bonus</strong> (e.g., "Bonus 10 Stream Coins" with a Gold Coin pack). This <strong>does not constitute a purchase of Stream Coins</strong>; the Stream Coins are provided for free as part of a promotion.
                      </li>
                      <li className="text-muted-foreground">
                        <strong>Alternate Means of Entry (AMOE):</strong> Streambet offers a <strong>mail-in or online request option</strong> for free Stream Coins. For example, you may mail a request (a 3x5 postcard with your name, address, email, etc.) to our designated address to receive a certain number of Stream Coins for free, without any purchase. See the official <strong>Streambet Sweepstakes Rules</strong> for the detailed AMOE instructions (address, frequency of requests allowed, etc.). All valid requests will be honored as outlined, and any postage or minor costs incurred are not payment for Stream Coins but incidental costs. AMOE ensures that <strong>everyone has an equal chance to participate without purchase</strong>, in compliance with sweepstakes law.
                      </li>
                      <li className="text-muted-foreground">
                        <strong>Promotions and Giveaways:</strong> We may distribute Stream Coins via special promotions, such as sign-up bonuses, referral bonuses, social media contests, tournament rewards, or daily login rewards. These are <strong>free promotional offers</strong>. For instance, upon registration you might get some Stream Coins to start, or you might earn Stream Coins by completing certain tasks (like verifying your account or reaching a gameplay milestone) – all without any purchase.
                      </li>
                      <li className="text-muted-foreground">
                        <strong>No "Pay-to-Play":</strong> Regardless of method, any Stream Coins you receive are free of charge. While you might acquire them alongside a Gold Coin purchase or as part of using the service, there is <strong>never a requirement to pay for Stream Coins</strong>. Purchasing Gold Coins is optional and for entertainment; you would receive the same opportunity to play in Stream Coin Mode whether or not you make purchases (Streambet's sweepstakes have <strong>no purchase necessary</strong>).
                      </li>
                    </ul>

                    <p className="text-muted-foreground mb-2 font-semibold">5.2 Using Stream Coins to Play (Sweepstakes Entries):</p>
                    <p className="text-muted-foreground mb-4">
                      When you use your Stream Coins on the Platform (by entering a sweepstakes game round in Stream Coin Mode), you are participating in a sweepstakes promotion. Each wager of Stream Coins on a game constitutes an entry into the sweepstakes associated with that game round. The game will spin or play out, and if you "win" in the game, you win a prize (as detailed below). If you lose, the Stream Coins you used are simply removed from your balance (just as used entries in any sweepstakes are exhausted). The outcome of the game is determined by chance, using random number generators or other fair chance-based mechanics.
                    </p>
                    <p className="text-muted-foreground mb-4">
                      <strong>No skills or strategy</strong> from the player can alter the outcome; all players have equal odds on each play. <strong>A purchase of Gold Coins or any payment has no effect on the chances of winning</strong> in Stream Coin Mode. Each play is independent and random.
                    </p>

                    <p className="text-muted-foreground mb-2 font-semibold">5.3 Prizes and Redemption:</p>
                    <p className="text-muted-foreground mb-4">
                      When you win playing with Stream Coins, you win a prize. Prizes are typically denominated in U.S. Dollars (cash value) or sometimes in a specified item (e.g., gift card, merchandise, etc., at our discretion). The default prize for Stream Coin wins is a cash prize that can be redeemed for USD at a rate of $1 per 1 Stream Coin won, unless otherwise stated in a particular promotion. The specifics of prize values and redemption rates will be communicated in the game or promotion details. Key rules for prize redemption:
                    </p>

                    <ul className="list-disc pl-6 space-y-4 mb-4">
                      <li className="text-muted-foreground">
                        <strong>Redemption Process:</strong> To redeem a prize, you must initiate a redemption request through the Platform's cashier or redemption page. We may require you to have a minimum prize balance (for example, at least $10) before requesting a payout, to avoid excessive transaction fees. You will choose a redemption method from the available options (which may include bank ACH transfer, PayPal or other e-wallet, prepaid card, gift card, or other methods as offered). We will then process your redemption and deliver your prize.
                      </li>
                      <li className="text-muted-foreground">
                        <strong>Verification Before Redemption:</strong> <strong>Identity and eligibility verification is required prior to prize payout.</strong> Before your first redemption (and possibly periodically for large prizes or security), we will ask you to complete our Know-Your-Customer (KYC) process. This involves verifying your name, age (18+), and state of residence. You must provide truthful information and documents. If we cannot verify your identity and eligibility to our satisfaction, your redemption will be delayed or denied. Providing false or fraudulent documents will result in account termination and forfeiture of prizes.
                      </li>
                      <li className="text-muted-foreground">
                        <strong>Processing Time:</strong> We strive to process prize redemptions promptly. Most verified redemption requests are processed within a few business days. However, please allow up to 10 business days for processing, and additional time for the funds to reach you depending on the method. Some methods may be near-instant after approval (e.g., certain digital payouts), while mailed checks or cards could take longer. We will notify you when your redemption is approved and on its way.
                      </li>
                      <li className="text-muted-foreground">
                        <strong>Prize Limits and State Restrictions:</strong> If you are in <strong>Florida or New York</strong>, remember that <strong>you cannot redeem more than $5,000 in any single calendar month</strong>. Our system will enforce this cap for those states' residents. Any excess winnings can be redeemed in subsequent months. Streambet also reserves the right to set general daily, weekly, or monthly redemption limits for all users for security or anti-fraud purposes, which will be communicated if applicable. Additionally, <strong>prizes are void where prohibited by law</strong> – if a specific prize offering would violate your state's law, we will not award it to you.
                      </li>
                      <li className="text-muted-foreground">
                        <strong>Tax Obligations:</strong> Prizes you redeem are considered winnings and may be taxable income. Streambet may require you to submit a W-9 form with your Social Security number if your cumulative yearly redemptions reach $600 or more, in order to issue you (and the IRS) a Form 1099-MISC or other appropriate tax form. You are solely responsible for reporting and paying any taxes due on your prizes. We do not withhold taxes from prize payouts (except as required by law for non-U.S. persons, etc.). Please consult a tax advisor if you have questions about tax treatment of your winnings.
                      </li>
                      <li className="text-muted-foreground">
                        <strong>Forfeiture:</strong> If you attempt to redeem a prize but fail to complete the verification or any other required step within a reasonable time, we will make efforts to contact you. If after 90 days you have not responded to verification requests or cannot be located, any pending prize may be forfeited (subject to applicable law, including escheatment to the state). Similarly, if we discover you were ineligible or in violation of these Terms at the time you won a prize, the prize is void and will not be paid.
                      </li>
                      <li className="text-muted-foreground">
                        <strong>No Exchanges:</strong> Prizes are not transferable. We will only send redemption payments to the verified account holder. We do not allow assignment of prizes to other persons. We also do not typically offer substitutions (for example, you cannot request a different prize than the one won, except where offered as a choice). In rare cases, we reserve the right to substitute a prize of equal or greater value if the advertised prize becomes unavailable.
                      </li>
                    </ul>

                    <p className="text-muted-foreground mb-2 font-semibold">5.4 Stream Coin Balance and Expiration:</p>
                    <p className="text-muted-foreground mb-4">
                      Your Stream Coin balance and any pending prizes are tracked in your account. Stream Coins themselves do not expire, but if your account remains inactive for an extended period (e.g., 12 months of no login or gameplay), we may deem the account dormant. Dormant accounts may have their virtual coin balances (Gold and Stream Coins) expired or removed, per our internal policies, after attempts to reach you. We will never remove an earned prize without attempting to contact you, and any removal of dormant balances would be in accordance with applicable law. Always feel free to reach out if you return after a long absence; we can often restore expired promotional balances at our discretion.
                    </p>

                    <p className="text-muted-foreground mb-2 font-semibold">5.5 Sweepstakes Conditions:</p>
                    <p className="text-muted-foreground mb-4">
                      By participating in Stream Coin Mode, you are entering a sweepstakes promotion. No purchase or payment is necessary to enter or win (as reiterated above). Sweepstakes are void where prohibited by law. If any issue arises that impairs the fairness or proper functioning of a sweepstakes (e.g., technical malfunction, fraud, or error), we reserve the right to suspend, modify, or cancel the affected promotion. In such cases, we will make a fair determination regarding any impacted entries (for example, refunding Stream Coins used on a malfunctioning game). All decisions by Streambet management regarding sweepstakes results are final and binding.
                    </p>
                  </>
                ),
              },
              {
                title: "6. Gameplay Rules and User Conduct",
                content: (
                  <>
                    <p className="text-muted-foreground mb-4">
                      When using the Platform (in either Gold Coin or Stream Coin mode), you agree to abide by the following rules of conduct and gameplay:
                    </p>

                    <p className="text-muted-foreground mb-2 font-semibold">6.1 Fair Play:</p>
                    <p className="text-muted-foreground mb-4">
                      You will only participate in games through normal use of the provided interfaces. Any form of cheating, hacking, bot usage, automation, manipulation of software, exploitation of bugs, or other unauthorized intervention in gameplay is strictly prohibited. Each game outcome is intended to be random and fair; any attempt to interfere with the fair outcome (such as colluding with others or exploiting a vulnerability) will result in immediate disqualification and account action.
                    </p>

                    <p className="text-muted-foreground mb-2 font-semibold">6.2 One Account, One Player:</p>
                    <p className="text-muted-foreground mb-4">
                      You may not create multiple accounts or use multiple identities to gain an unfair advantage or circumvention of limits (e.g., to bypass prize caps or welcome bonus limits). If we detect multiple accounts controlled by the same person, we may terminate or merge accounts at our discretion and void any associated prizes.
                    </p>

                    <p className="text-muted-foreground mb-2 font-semibold">6.3 Prohibited Activities:</p>
                    <p className="text-muted-foreground mb-4">You shall NOT engage in any of the following activities on the Platform:</p>

                    <ul className="list-disc pl-6 space-y-4 mb-4">
                      <li className="text-muted-foreground">
                        <strong>Impersonation or False Information:</strong> Providing false information, impersonating any person or entity, or misrepresenting your affiliation with any person/entity.
                      </li>
                      <li className="text-muted-foreground">
                        <strong>Circumventing Restrictions:</strong> Attempting to access the Platform from a prohibited jurisdiction or using tools to mask your location (VPNs, proxies, GPS spoofing) to evade our geofences. Similarly, if you are in a Yellow Light state with limited features, you must not misrepresent your state to gain full features.
                      </li>
                      <li className="text-muted-foreground">
                        <strong>Fraud and Illegal Use:</strong> Using the Platform for any fraudulent or unlawful purpose. This includes money laundering, using stolen payment methods to purchase Gold Coins, or attempting to cash out fraudulently obtained Stream Coins. All transactions are monitored to prevent fraud and money laundering. Any suspected illegal activity will be reported to authorities.
                      </li>
                      <li className="text-muted-foreground">
                        <strong>Account Trading or Sharing:</strong> Selling, buying, or trading accounts, or sharing account access with others. Your account is personal to you.
                      </li>
                      <li className="text-muted-foreground">
                        <strong>Harassment or Improper Conduct:</strong> Using any chat or social features (if available) to harass, threaten, or bully other players, or to post any obscene, offensive, or hateful content. Hate speech, discrimination, or any content promoting violence or illegal acts is not tolerated. We aim to maintain a friendly community.
                      </li>
                      <li className="text-muted-foreground">
                        <strong>Interference:</strong> Uploading or transmitting any harmful code, virus, malware, or doing anything that could interfere with or disrupt the Platform's integrity or security.
                      </li>
                      <li className="text-muted-foreground">
                        <strong>Data Mining:</strong> Using any robot, scraper, or automated means to access or collect data from the Platform, or attempting to reverse engineer the Platform's software.
                      </li>
                    </ul>

                    <p className="text-muted-foreground mb-2 font-semibold">6.4 Collusion and Syndicates:</p>
                    <p className="text-muted-foreground mb-4">
                      Players should play individually. Any form of collusion between players (e.g., coordinating bets to influence outcomes or sharing winnings) is prohibited. If games involve multiplayer competition, players must not team up in unfair ways. Syndicated play or any organized effort to exploit the system will result in disqualification.
                    </p>

                    <p className="text-muted-foreground mb-2 font-semibold">6.5 Responsible Play:</p>
                    <p className="text-muted-foreground mb-4">
                      Streambet is intended for casual entertainment. Although no real money is at risk in the games, we encourage users to play responsibly and within reasonable time limits. If you believe you have a compulsive behavior toward gaming, please use our self-exclusion or cooling-off tools available (see Section 9 on Responsible Social Gaming) or seek help from organizations such as Gaming Addicts Anonymous. You may self-exclude by contacting customer support, in which case we will disable your account for a chosen period or permanently as requested.
                    </p>
                  </>
                ),
              },
              {
                title: "7. Account Suspension and Termination",
                content: (
                  <>
                    <p className="text-muted-foreground mb-2 font-semibold">7.1 Our Right to Suspend/Terminate:</p>
                    <p className="text-muted-foreground mb-4">
                      Streambet reserves the right to suspend or terminate your account at our discretion for violations of these Terms or any behavior that harms the integrity of the Platform or other players' experience. This includes, but is not limited to, any of the prohibited conduct described above, failure to satisfy eligibility checks, fraudulent activity, or refusal to cooperate with verification. We may do so with or without prior notice depending on the severity of the issue.
                    </p>

                    <ul className="list-disc pl-6 space-y-4 mb-4">
                      <li className="text-muted-foreground">
                        If your account is suspended, you will be temporarily unable to access the Platform (or certain features such as sweepstakes play). We will investigate the matter. You will be notified of the suspension and may be asked for additional information.
                      </li>
                      <li className="text-muted-foreground">
                        If your account is terminated, this is a permanent closure. You may also be <strong>banned for life</strong> from creating a new account. Termination may be imposed for severe or repeated violations, fraud, or behavior that harms other users or the Platform's integrity.
                      </li>
                    </ul>

                    <p className="text-muted-foreground mb-2 font-semibold">7.2 Forfeiture Policy:</p>
                    <p className="text-muted-foreground mb-4">If an account is closed or terminated by us due to violation of Terms, any Gold Coins in the account will be forfeited (since they have no value) and any Stream Coins or unredeemed prizes may also be forfeited. We will not typically confiscate legitimate prizes without cause; however, any fraudulent gains or winnings from prohibited conduct are void. For example, if you obtained Stream Coins or prizes by cheating, those prizes will not be paid, and any related transactions may be reversed.</p>
                    <p className="text-muted-foreground mb-2 font-semibold">7.3 User-Initiated Closure:</p>
                    <p className="text-muted-foreground mb-4">You may choose to close your account at any time by contacting customer support. We will guide you through the process. If you have an eligible prize balance at that time, we will allow you to redeem it (subject to verification) before closure. Any remaining Gold Coins or unused Stream Coins will be forfeited upon closure (since they are promotional credits). Account closure is generally permanent; if you change your mind, you would need to register a new account (and may not be entitled to new sign-up bonuses if you already received them previously).</p>
                    <p className="text-muted-foreground mb-2 font-semibold">7.4 Appeal:</p>
                    <p className="text-muted-foreground mb-4">If you believe your account was wrongfully suspended or terminated, you may contact our support team to dispute the decision. We will review appeals on a case-by-case basis and in good faith. However, our determinations (including eligibility judgments and findings of fact in investigations) are final. There is no guaranteed reinstatement.</p>
                  </>
                ),
              },
              {
                title: "8. Consumer Disclosures and Additional Terms",
                content: (
                  <>
                    <p className="text-muted-foreground mb-2 font-semibold">8.1 No Real Money Gambling:</p>
                    <p className="text-muted-foreground mb-4">Streambet is not real gambling. By using the Platform, you acknowledge that you are playing either with non-redeemable play money (Gold Coins) or participating in a promotional sweepstakes (Stream Coins). You are not wagering any real money for the chance to win; all chances to win are free and distributed equally among players. The Platform’s games intend to simulate casino or betting style games for entertainment, but they are sweepstakes and do not require any purchase. All references to “betting” or “odds” are part of the game theme but do not imply traditional gambling activity.</p>
                    <p className="text-muted-foreground mb-2 font-semibold">8.2 Entertainment Value Only:</p>
                    <p className="text-muted-foreground mb-4">Gold Coins have no monetary value and cannot under any circumstances be exchanged for real currency. Stream Coins similarly have no inherent value and are only exchangeable for a prize per these Terms (until redeemed, they are merely entries). You cannot sell or trade your virtual coins. Any purported sale or trade of an account or coins is void and is a violation of these Terms.</p>
                    <p className="text-muted-foreground mb-2 font-semibold">8.3 Third-Party Content:</p>
                    <p className="text-muted-foreground mb-4">The Platform may display or provide access to content provided by third parties (for example, game software from third-party developers, or promotional offers from partners). Streambet does not guarantee the accuracy or integrity of third-party content. If the Platform contains links to third-party websites or services, these are provided for convenience; we do not endorse or take responsibility for third-party sites. Use caution and review third-party terms and privacy policies when leaving our Platform.</p>
                    <p className="text-muted-foreground mb-2 font-semibold">8.4 Service Availability:</p>
                    <p className="text-muted-foreground mb-4">We strive to keep the Platform available 24/7, but we do not guarantee uninterrupted service. Maintenance, upgrades, or network and power outages may cause temporary service interruptions. We are not liable for any loss of potential prizes or user inconvenience due to downtime. However, if a disruption causes a specific game round or promotion to fail in a way that affects you (e.g., a game crashes as you win), contact support – we will investigate and, if appropriate, restore the state (such as re-crediting Stream Coins for an aborted round).</p>
                    <p className="text-muted-foreground mb-2 font-semibold">8.5 Changes to the Service:</p>
                    <p className="text-muted-foreground mb-4">Streambet reserves the right to modify, add, or remove features and games on the Platform. We may introduce new games or retire existing ones. We may adjust coin packages, bonus programs, payout options, or any other aspect of the service. We will endeavor to give notice of material changes (via the app, website, or email), but we are not obligated to maintain any specific aspect of the Platform for any minimum time, except as required by law. If you continue to use the Platform after changes, you are deemed to accept those changes. If you object to a change, your remedy is to stop using the service or close your account.</p>
                    <p className="text-muted-foreground mb-2 font-semibold">8.6 Intellectual Property:</p>
                    <p className="text-muted-foreground mb-4">All content on Streambet (including but not limited to game graphics, text, software code, logos, trademarks, and audiovisual elements) is owned by or licensed to Streambet and is protected by intellectual property laws. We grant you a limited, revocable, non-transferable license to use the Platform and its content for the sole purpose of participating in the games and services as allowed by these Terms. You may not copy, modify, distribute, perform, display, or create derivative works from our content except as expressly permitted. “Streambet,” our logos, and our game titles are trademarks of Streambet, Inc. You agree not to infringe our IP rights. Any feedback or suggestions you provide to Streambet can be used by us freely and without compensation to you.</p>
                    <p className="text-muted-foreground mb-2 font-semibold">8.7 Responsible Use and Self-Exclusion:</p>
                    <p className="text-muted-foreground mb-4">While no real money is at risk, we understand that gaming should still be done in moderation. We provide voluntary self-exclusion options: you may request a temporary cooling-off (during which your account will be locked for a specified period) or a permanent self-exclusion (account closure). We will use our best efforts to enforce self-exclusions (blocking new accounts, etc.). However, you are ultimately responsible for honoring your self-exclusion. We are not liable if you circumvent it and continue using the Platform.</p>
                  </>
                ),
              },
              {
                title: "9. Privacy and Data",
                content: (
                  <>
                    <p className="text-muted-foreground mb-4">Your privacy is important to us. Our collection, use, and protection of your personal information are governed by our <b>Privacy Policy</b> (available on our website). By using Streambet, you consent to the practices described in the Privacy Policy. Key points include:</p>
                    <ul className="list-disc pl-6 space-y-2 mb-4">
                      <li>We collect information you provide (such as contact details, age, address) and information about your use of the Platform (gameplay data, device information, etc.). This information is used to provide and improve the service, verify eligibility, prevent fraud, and for analytics and marketing (in accordance with your preferences and applicable law).</li>
                      <li>We implement industry-standard security measures to protect your data. However, no system is 100% secure, and you accept the inherent risks of providing data online. Notify us immediately if you suspect any unauthorized access to your account or personal data.</li>
                      <li>We do not sell your personal information to third parties. We may share data with service providers as needed to operate (for example, payment processors, verification services) and with regulators or authorities if required by law.</li>
                      <li>U.S. Users: Streambet is U.S.-based and primarily directed to U.S. residents. If you are a California resident or otherwise have rights under laws like the California Consumer Privacy Act (CCPA), please refer to the Privacy Policy for disclosures and how to exercise your rights (such as access or deletion requests). Generally, you have the right to know what data we have about you and to request deletion of certain data, subject to legal exceptions.</li>
                      <li>By using the Platform, you agree that we may send you service-related communications (e.g., account notifications, receipts). For marketing communications, you have the ability to opt out.</li>
                      <li>If Streambet’s business is ever transferred or sold, user information may be transferred as part of that transaction (we will ensure any successor honors similar privacy commitments).</li>
                    </ul>
                    <p className="text-muted-foreground mb-4">For complete details, please review the Privacy Policy. If you have privacy-related questions or requests, you can contact us at the email provided in the Privacy Policy or through customer support.</p>
                  </>
                ),
              },
              {
                title: "10. Disclaimers of Warranties; Limitation of Liability",
                content: (
                  <>
                    <p className="text-muted-foreground mb-2 font-semibold">10.1 As-Is Service:</p>
                    <p className="text-muted-foreground mb-4">Streambet and its services are provided on an “AS IS” and “AS AVAILABLE” basis. We make no warranty that the Platform will be error-free, secure, or uninterrupted. We do not guarantee that any defects will be corrected, or that the Platform is free of viruses or bugs (though we strive to maintain a safe experience). To the fullest extent permitted by law, we disclaim all warranties of any kind, whether express or implied, including implied warranties of merchantability, fitness for a particular purpose, and non-infringement. Use of the Platform is at your own risk.</p>
                    <p className="text-muted-foreground mb-2 font-semibold">10.2 No Guarantee of Results:</p>
                    <p className="text-muted-foreground mb-4">We do not promise that you will win any prize. Outcomes of games are random, and luck varies by individual. Past results do not predict future outcomes. All descriptions of odds or return-to-player (RTP) percentages are informational; actual experience may differ. You accept that playing does not guarantee prizes or profits.</p>
                    <p className="text-muted-foreground mb-2 font-semibold">10.3 Limitation of Liability:</p>
                    <p className="text-muted-foreground mb-4">To the maximum extent allowed by law, Streambet (and its parent, affiliates, officers, directors, employees, and agents) will not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or relating to your use of (or inability to use) the Platform or any content or services, even if we have been advised of the possibility of such damages. This includes but is not limited to loss of data, loss of virtual currency, loss of goodwill, or the cost of procurement of substitute services. In no event shall our total liability to you for all claims <b>exceed the total amount (if any) you have paid to us in the 6 months immediately preceding the event giving rise to the liability</b> (for example, the total dollars spent on Gold Coin purchases). Since Gold Coin purchases are not refundable, this monetary cap is essentially the limit of your financial exposure with us. Some jurisdictions do not allow certain limitations, so some of these may not apply to you, but our liability is limited to the smallest extent allowed by law.</p>
                    <p className="text-muted-foreground mb-2 font-semibold">10.4 User Remediation:</p>
                    <p className="text-muted-foreground mb-4">Your sole remedy if you are dissatisfied with the Platform or these Terms is to discontinue use of the service. Because we do not charge for participation in sweepstakes (and Gold Coin purchases are voluntary), you have no basis to recover any damages beyond perhaps a refund of unused purchases in extraordinary cases. In any dispute, you agree that you are not entitled to injunctive or equitable relief to stop our operation or any feature (you have no property interest in the Platform or its offerings). You further agree not to seek attorneys’ fees or court costs if not mandated by statute; each party will bear its own costs in dispute resolution.</p>
                    <p className="text-muted-foreground mb-2 font-semibold">10.5 Exceptions:</p>
                    <p className="text-muted-foreground mb-4">Nothing in these Terms is intended to exclude liability for Streambet’s own intentional misconduct, fraud, or gross negligence, or for personal injury or property damage caused by a product defect, to the extent that such liability cannot be waived under applicable law. However, we do not accept liability for ordinary negligence, technical errors, or any issues outside our reasonable control (force majeure events).</p>
                  </>
                ),
              },
              {
                title: "11. Dispute Resolution and Arbitration Agreement",
                content: (
                  <>
                    <p className="text-muted-foreground mb-2 font-semibold">11.1 Initial Dispute Resolution:</p>
                    <p className="text-muted-foreground mb-4">We encourage you to contact Streambet support to resolve any concerns or disputes you have with our service. Most user concerns can be resolved informally by contacting our customer service team at <a href="mailto:support@streambet.tv" className="underline">support@streambet.tv</a> and providing details of your issue. We will attempt in good faith to resolve the dispute amicably within a reasonable time.</p>
                    <p className="text-muted-foreground mb-2 font-semibold">11.2 Binding Arbitration:</p>
                    <p className="text-muted-foreground mb-4">If we cannot resolve a dispute informally, you and Streambet agree that any dispute, claim, or controversy arising out of or relating to these Terms or your use of the Platform (collectively, “Disputes”) shall be resolved by final and binding arbitration on an individual basis, not in court. You and Streambet are each waiving the right to a jury trial or to have the dispute decided in court before a judge. This agreement to arbitrate is governed by the Federal Arbitration Act (“FAA”) and evidences a transaction in interstate commerce. <b>This arbitration requirement applies to all Disputes, including issues of arbitrability, scope, validity, and enforceability of this arbitration clause.</b></p>
                    <p className="text-muted-foreground mb-2 font-semibold">11.3 Class Action Waiver:</p>
                    <p className="text-muted-foreground mb-4">You and Streambet agree that all Disputes will be resolved in arbitration only on an individual basis. You may only bring claims on your own behalf. You cannot serve as a class representative or member or otherwise participate in a class, collective, consolidated, or representative proceeding against Streambet. The arbitrator shall have no authority to combine or aggregate similar claims or conduct any class or collective arbitration. By agreeing to these Terms, you are waiving any right to a jury trial and waiving any right to participate in a class action against us.</p>
                    <p className="text-muted-foreground mb-2 font-semibold">11.4 Arbitration Procedures:</p>
                    <p className="text-muted-foreground mb-4">The arbitration will be administered by a neutral arbitration provider to be agreed upon by the parties (such as JAMS or American Arbitration Association (AAA)) under its applicable rules (e.g., the JAMS Comprehensive Arbitration Rules and Procedures, or the AAA Consumer Arbitration Rules). If the parties cannot agree, the arbitration provider shall be determined by court appointment. The arbitration will take place in the county of your residence or another mutually agreed location, or via teleconference/videoconference for convenience. The law of the State of Delaware will govern the substance of the Dispute, but not the choice of law rules or the arbitration procedure (which is governed by the FAA).</p>
                    <ul className="list-disc pl-6 space-y-2 mb-4">
                      <li><b>Costs:</b> Each party is responsible for its own attorneys’ fees. The costs of arbitration (administrative fees and arbitrator’s fees) will be allocated per the arbitration provider’s rules. However, if you cannot afford the arbitration costs, please inform us; we will consider advancing or reimbursing fees where required or appropriate to ensure access to arbitration. The arbitrator may award fees or costs to a prevailing party if provided under applicable law or rules (e.g., if a claim is found frivolous).</li>
                      <li><b>Arbitrator’s Authority:</b> The arbitrator shall apply the Terms and the law, and can award the same damages and relief as a court (including equitable relief or statutory damages), but <b>only in favor of the individual party seeking relief and only to the extent necessary to provide relief warranted by that party’s individual claim</b>. The arbitrator will provide a reasoned written decision if requested by either party. Judgment on the arbitration award may be entered in any court with proper jurisdiction.</li>
                      <li><b>Exceptions:</b> Notwithstanding the above, <i>either party</i> may elect to pursue an individual claim in <b>small claims court</b> if the claim is within that court’s jurisdiction and proceeding on an individual (non-class) basis. Also, either party may bring issues to the attention of federal, state, or local agencies for matters within those agencies’ jurisdiction (e.g., filing a complaint with a regulatory authority), and those agencies can seek relief against us on your behalf if allowed by law.</li>
                    </ul>
                    <p className="text-muted-foreground mb-2 font-semibold">11.5 Opt-Out Right:</p>
                    <p className="text-muted-foreground mb-4"><i>New users only:</i> You have the right to opt out of the binding arbitration and class waiver provisions in this Section 11 by sending a written notice of your decision to opt out to the following address: Streambet Inc., [Arbitration Opt-Out], [address]. The opt-out notice must be postmarked (or emailed to <a href="mailto:legal@streambet.tv" className="underline">legal@streambet.tv</a>) within 30 days of the date you first register your account or otherwise become subject to these Terms. Your notice must include your name, address, email used for Streambet, and an unambiguous statement that you wish to opt out of the arbitration agreement. If you opt out, disputes will be resolved in court, and you will not be bound by the class action waiver (though we reserve the right to seek to sever it). Opting out of arbitration does not terminate any other provision of these Terms (including the class action waiver if allowed). If you do not opt out within 30 days, you will be bound to arbitrate disputes under these terms.</p>
                    <p className="text-muted-foreground mb-2 font-semibold">11.6 Severability of Arbitration Provisions:</p>
                    <p className="text-muted-foreground mb-4">If any portion of this arbitration agreement is found unenforceable or unlawful for any reason, the unenforceable provision shall be severed, and the remaining arbitration provisions shall continue in full force and effect. However, if the class action waiver (Section 11.3) is found invalid or unenforceable, then the entirety of this arbitration section shall be null and void. In no case shall a class, collective, or representative action be arbitrated.</p>
                    <p className="text-muted-foreground mb-4"><b>By agreeing to these Terms, you explicitly acknowledge that you have read and understand this arbitration agreement and agree to be bound by it.</b> You understand that you are waiving rights to trial by jury or to participate in a class action.</p>
                  </>
                ),
              },
              {
                title: "12. Governing Law and Jurisdiction",
                content: (
                  <>
                    <p className="text-muted-foreground mb-4">These Terms and your use of the Platform are governed by the <b>laws of the State of Delaware, USA</b>, <b>without regard to its conflict of law principles</b>. Delaware law will apply to interpret your and our rights and obligations under this agreement (except where federal law, such as the FAA, governs the arbitration clause).</p>
                    <p className="text-muted-foreground mb-4"><b>Subject to the arbitration agreement above</b>, if any dispute arising out of these Terms is found not subject to arbitration (for example, if you opt out of arbitration or a claim is allowed to proceed in court), then you and Streambet agree that <b>such claim will be brought exclusively in the state or federal courts located in the State of Delaware</b>. You and Streambet <b>consent to the personal jurisdiction of Delaware courts</b> for litigation of allowed disputes, and waive any objections to such venue on grounds of inconvenience or jurisdiction. This provision is subject to any rights you may have under applicable consumer protection laws regarding venue; but to the extent permitted, you agree Delaware is an appropriate and convenient forum.</p>
                  </>
                ),
              },
              {
                title: "13. Miscellaneous",
                content: (
                  <>
                    <p className="text-muted-foreground mb-2 font-semibold">13.1 Severability:</p>
                    <p className="text-muted-foreground mb-4">If any provision of these Terms is held to be invalid or unenforceable, that provision will be enforced to the maximum extent permissible and the remaining provisions of the Terms will remain in full force and effect. Our failure to enforce any right or provision of these Terms does not constitute a waiver of that right or provision.</p>
                    <p className="text-muted-foreground mb-2 font-semibold">13.2 Entire Agreement:</p>
                    <p className="text-muted-foreground mb-4">These Terms (along with the incorporated Privacy Policy and any additional rules or terms for specific promotions or features) constitute the entire agreement between you and Streambet regarding the Platform. They supersede all prior or contemporaneous agreements, understandings, or communications, whether written or oral, relating to the subject matter. In case of a conflict between these Terms and any other policy or document, these Terms will generally control, except where a specific promotion has expressly differing terms.</p>
                    <p className="text-muted-foreground mb-2 font-semibold">13.3 Changes to Terms:</p>
                    <p className="text-muted-foreground mb-4">Streambet may update or modify these Terms from time to time. We will post the revised Terms on our site with a “last updated” date. If changes are material, we will also notify users via email or in-app notification. By continuing to use the Platform after updated Terms are posted, you accept and agree to the changes. If you do not agree to the revised Terms, you must stop using the service and may close your account. Any changes will not apply retroactively to disputes that arose before the change effective date; those will be governed by the Terms in place at the time of the events leading to the dispute.</p>
                    <p className="text-muted-foreground mb-2 font-semibold">13.4 No Assignment:</p>
                    <p className="text-muted-foreground mb-4">You may not assign or transfer any rights or obligations under these Terms without our prior written consent. Any attempted assignment by you without consent is null. Streambet may freely assign or transfer this agreement (for example, in the event of a merger, acquisition, or transfer of assets). These Terms are binding on any permitted assignees.</p>
                    <p className="text-muted-foreground mb-2 font-semibold">13.5 No Agency:</p>
                    <p className="text-muted-foreground mb-4">You and Streambet are independent parties. Nothing in these Terms shall be construed as creating any agency, partnership, joint venture, or other form of joint enterprise between us. You are not authorized to make any representations or bind Streambet in any manner.</p>
                    <p className="text-muted-foreground mb-2 font-semibold">13.6 Contact Information:</p>
                    <p className="text-muted-foreground mb-4">If you have any questions, concerns, or notices required under these Terms, please contact us at:</p>
                    <ul className="list-disc pl-6 space-y-2 mb-4">
                      <li><b>Streambet, Inc.</b> (Attn: Legal/Support)</li>
                      <li>[Address]</li>
                      <li>Email: <a href="mailto:support@streambet.tv" className="underline">support@streambet.tv</a></li>
                    </ul>
                    <p className="text-muted-foreground mb-4">We will also use your registered email address to send you any notices or communications required under these Terms, so please keep it up to date.</p>
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

export default Terms;