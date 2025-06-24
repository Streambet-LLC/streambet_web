import React from 'react';
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
            <h1 className="text-4xl font-bold tracking-tight">Terms of Service</h1>
            <p className="text-muted-foreground">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>

          <div className="grid gap-8">
            {[
              {
                title: "1. Eligibility",
                content: (
                  <p className="text-muted-foreground">
                    You must be at least 21 years old to use our live betting services. By using
                    StreamGame, you represent and warrant that you meet this requirement and that betting
                    is legal in your jurisdiction.
                  </p>
                ),
              },
              {
                title: "2. Live Betting Rules",
                content: (
                  <ul className="list-disc pl-6 space-y-2">
                    <li>All bets are final once placed and cannot be canceled</li>
                    <li>Minimum bet amount is $2</li>
                    <li>StreamGame takes a 5% fee from winning bets</li>
                    <li>Payouts are calculated proportionally based on bet amounts</li>
                    <li>
                      In case of technical issues or disputed outcomes, StreamGame's decision is final
                    </li>
                  </ul>
                ),
              },
              {
                title: "3. Account Responsibilities",
                content: (
                  <ul className="list-disc pl-6 space-y-2">
                    <li>You are responsible for maintaining the security of your account</li>
                    <li>You must provide accurate and complete information</li>
                    <li>You may not share your account credentials</li>
                    <li>You may not use VPNs or other methods to circumvent geographical restrictions</li>
                  </ul>
                ),
              },
              {
                title: "4. Deposits and Withdrawals",
                content: (
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Minimum deposit amount is $2</li>
                    <li>All transactions are processed through PayPal</li>
                    <li>Withdrawals are processed within 24 hours</li>
                    <li>We reserve the right to request verification documents</li>
                  </ul>
                ),
              },
              {
                title: "5. Prohibited Activities",
                content: (
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Match fixing or any form of betting manipulation</li>
                    <li>Using multiple accounts</li>
                    <li>Automated betting or bot usage</li>
                    <li>Money laundering or other illegal activities</li>
                  </ul>
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

export default Terms;
