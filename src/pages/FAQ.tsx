import React from 'react';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
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
            <AccordionItem value="deposits">
              <AccordionTrigger>What is the minimum deposit amount?</AccordionTrigger>
              <AccordionContent>
                The minimum deposit amount is $2. You can deposit using PayPal.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="payouts">
              <AccordionTrigger>How are Payouts Calculated?</AccordionTrigger>
              <AccordionContent>
                <p>
                  Payouts are made proportionally based on your contribution to the winning side's
                  total pot.
                </p>
                <p className="mt-2">
                  For example, if you wager $1 on player 1 and the total pot for player 1 is $4,
                  your proportion is 25%. This means that you are entitled to 25% of the player 2
                  pot, assuming that player 1 wins.
                </p>
                <p className="mt-2">
                  Your proportion of the payout is calculated as follows: (Your bet/Total amount bet
                  on the player)
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="fees">
              <AccordionTrigger>How does StreamGame make money?</AccordionTrigger>
              <AccordionContent>
                StreamGame takes a 5% fee from winning bets. This fee helps us maintain and improve
                our platform while ensuring fair play and security for all users.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="betting">
              <AccordionTrigger>How do I place a bet?</AccordionTrigger>
              <AccordionContent>
                Select a stream, choose your betting option, enter your bet amount, and click "Place
                Bet".
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="withdrawals">
              <AccordionTrigger>How do withdrawals work?</AccordionTrigger>
              <AccordionContent>
                Withdrawals are processed via PayPal within 24 hours of request.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="unexpected">
              <AccordionTrigger>What happens if a stream ends unexpectedly?</AccordionTrigger>
              <AccordionContent>
                If a stream ends unexpectedly, all bets will be automatically refunded to users'
                accounts. The refund will appear in your transaction history and your wallet balance
                will be updated immediately.
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
