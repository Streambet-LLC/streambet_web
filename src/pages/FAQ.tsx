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
            <AccordionItem value="free-tokens">
              <AccordionTrigger>How do I get free tokens?</AccordionTrigger>
              <AccordionContent>
                CardCade is 100% free to play! You receive free tokens through:
                <ul className="pl-5 mt-2 list-disc">
                  <li>Account registration bonus</li>
                  <li>Daily login rewards</li>
                  <li>Social media promotions and giveaways</li>
                  <li>Special events and contests</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="token-value">
              <AccordionTrigger>Do tokens have any cash value?</AccordionTrigger>
              <AccordionContent>
                No, tokens have no monetary value and cannot be purchased, sold, or exchanged for cash. CardCade is entirely free to play - you never need to spend money to participate.
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
                    You put 10 tokens on car 1
                  </li>
                  <li>
                    10 tokens is the total pot (in aggregate, laid on car 1 and on car 2)
                  </li>
                  <li>
                    The total pot on player 2 is 60 tokens (losing pot)
                  </li>
                  <li>
                    The total pot on player 1 is 40 tokens (winning pot)
                  </li>
                </ul>
                <p className="mt-2">
                  In this case, you would win 15 tokens – i.e. 25% (your proportion of the winning side) times the total losing pot (60 tokens) ⇒ 10 tokens / 40 tokens x 60 tokens = 15 tokens. 
                </p>
                <p className="mt-2">
                  This logically makes sense, as the ‘wisdom of the pool’ decided car 2 was the favorite (higher pool denomination / more picks), and so the side with less picks won a bigger return (underdog odds, e.g. +150 here). 
                </p>
                <p className="mt-2">
                  So, if you take the side with less action (or, more accurately, the lower total pot), you will receive a higher payout, and if you take the side with more action (i.e. the higher total pot), you will receive a lower payout.
                </p>
                <p className="mt-2">
                  Your winnings and losses are transacted in tokens, which can later be redeemed for prizes like merchandise and gift cards.
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="prizes">
              <AccordionTrigger>What kinds of prizes can I win?</AccordionTrigger>
              <AccordionContent>
                <p>
                  You can redeem your tokens for various prizes including:
                </p>
                <ul className="pl-5 mt-2 list-disc">
                  <li>
                    Gift cards (Amazon, retail stores, restaurants)
                  </li>
                  <li>
                    Merchandise and branded items
                  </li>
                  <li>
                    Special promotional prizes and giveaways
                  </li>
                </ul>
                <p className="mt-2">
                  All prizes are non-cash rewards. CardCade does not offer cash prizes or monetary redemptions.
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="fees">
              <AccordionTrigger>Are there any fees or costs to use CardCade?</AccordionTrigger>
              <AccordionContent>
                No! CardCade is 100% free to use. There are no fees, subscriptions, or hidden costs. All tokens are provided free of charge, and creators are supported through our platform partnerships and sponsorships.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="unexpected">
              <AccordionTrigger>What happens if a stream ends unexpectedly?</AccordionTrigger>
              <AccordionContent>
                If a stream ends unexpectedly, all tokens from active pools will automatically refund to all users' accounts. The refund will appear in your transaction history and your token balance will be updated immediately.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="safe">
              <AccordionTrigger>How does CardCade ensure and facilitate a safe, friendly, and fraud-free environment?</AccordionTrigger>
              <AccordionContent>
                <p>
                  CardCade is built with safety and fairness at its core. We use secure account verification, advanced fraud detection systems, and responsible gaming tools to protect our community. 
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
