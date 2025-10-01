import { Navigation } from '@/components/Navigation';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const FAQ = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="container flex-1 pt-24 pb-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">Frequently Asked Questions</h1>
          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="deposits-minimum">
              <AccordionTrigger>What is the minimum deposit, and how do deposits work?</AccordionTrigger>
              <AccordionContent>
                The minimum deposit is $10. Deposits (and withdrawals) are orchestrated via <a href='https://coinflow.cash' className='underline'>Coinflow</a>.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="deposits-how">
              <AccordionTrigger>How can I make deposits?</AccordionTrigger>
              <AccordionContent>
                You can make deposits via Debit Card, Credit Card, Apple Pay, Google Pay, ACH, and crypto (USDC, BTC, Solana, Ethereum).
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="winning-picks">
              <AccordionTrigger>How are winning picks calculated and distributed?</AccordionTrigger>
              <AccordionContent>
                <p>
                  Winning picks are calculated proportionally on your contribution to the winning side's total attributable pot (from the losing side).
                </p>
                <p className="mt-2">
                  For example, let’s say the below is the pot dynamics on a race with 2 outcomes - car 1 wins | car 2 wins, and let’s say you pick car 1, which ultimately wins.
                </p>
                <ul className="pl-5 mt-2 list-disc">
                  <li>
                    You put $10 on car 1
                  </li>
                  <li>
                    $100 is the total pot (in aggregate, laid on car 1 and on car 2)
                  </li>
                  <li>
                    The total pot on player 2 is $60 (losing pot)
                  </li>
                  <li>
                    The total pot on player 1 is $40 (winning pot)
                  </li>
                </ul>
                <p className="mt-2">
                  In this case, you would win $15 – i.e. 25% (your proportion of the winning side) times the total losing pot ($60) ⇒ $10 / $40 x $60 = $15. 
                </p>
                <p className="mt-2">
                  This logically makes sense, as the ‘wisdom of the pool’ decided car 2 was the favorite (higher pool denomination / more picks), and so the side with less picks won a bigger return (underdog odds, e.g. +150 here). 
                </p>
                <p className="mt-2">
                  So, if you take the side with less action (or, more accurately, the lower total pot), you will receive a higher payout, and if you take the side with more action (i.e. the higher total pot), you will receive a lower payout.
                </p>
                <p className="mt-2">
                  Your winnings and losses are transacted in Streamcoins, which can later be redeemed for USD to your bank account.
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="withdrawals">
              <AccordionTrigger>How do withdrawals work?</AccordionTrigger>
              <AccordionContent>
                <p>
                  We have a “playthrough” requirement, where, for AML purposes, all funds must be ‘played through’ at least once, before withdrawal. 
                </p>
                <p className="mt-2">
                  Once playthrough requirements have been met, streamcoins can be redeemed for cash and withdrawn from your Streambet / Coinflow wallet to your bank account. 
                </p>
                <p className="mt-2">
                  Withdrawal methods include: 
                </p>
                <ul className="pl-5 mt-2 list-disc">
                  <li>
                    ACH - 0.25% fee
                  </li>
                  <li>
                    Same-day ACH - 1% fee
                  </li>
                  <li>
                    RTP (real-time payments) - 2% fee
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="fees">
              <AccordionTrigger>How do fees work? Do creators get a cut?</AccordionTrigger>
              <AccordionContent>
                All pools receive a 10% fee to Streambet (on the winning sides). Of this, 30% goes to the stream creator(s).
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="unexpected">
              <AccordionTrigger>What happens if a stream ends unexpectedly?</AccordionTrigger>
              <AccordionContent>
                If a stream ends unexpectedly, all action (i.e. all Streamcoins) will automatically refund to all users' accounts active in the pool. The refund will appear in your transaction history and your Streamcoin wallet balance will be updated immediately.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="safe">
              <AccordionTrigger>How does Streambet ensure and facilitate a safe, friendly, and fraud-free environment?</AccordionTrigger>
              <AccordionContent>
                <p>
                  Streambet is built with safety and fairness at its core. We use secure account verification, advanced fraud detection systems, and responsible gaming tools to protect our community. 
                  Our platform enforces clear conduct guidelines to keep interactions respectful and friendly, and we monitor for suspicious activity to maintain a fair, trustworthy experience for all users. 
                  In addition, <span className='font-bold'>every stream pick is manually reviewed after completion by our team, to ensure fairness and guard against fraud or manipulation.</span>
                </p>
                <p className='mt-2'>
                  See our TOS’ and Policies for more complete walkthroughs here.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </main>

      {/* <Footer /> */}
    </div>
  );
};

export default FAQ;
