import React from 'react';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';

const Terms = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />

      <main className="container flex-1 pt-24 pb-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>

          <div className="prose prose-invert max-w-none">
            <p>Last updated: {new Date().toLocaleDateString()}</p>

            <h2>1. Eligibility</h2>
            <p>
              You must be at least 21 years old to use our live betting services. By using
              StreamGame, you represent and warrant that you meet this requirement and that betting
              is legal in your jurisdiction.
            </p>

            <h2>2. Live Betting Rules</h2>
            <ul>
              <li>All bets are final once placed and cannot be canceled</li>
              <li>Minimum bet amount is $2</li>
              <li>StreamGame takes a 5% fee from winning bets</li>
              <li>Payouts are calculated proportionally based on bet amounts</li>
              <li>
                In case of technical issues or disputed outcomes, StreamGame's decision is final
              </li>
            </ul>

            <h2>3. Account Responsibilities</h2>
            <ul>
              <li>You are responsible for maintaining the security of your account</li>
              <li>You must provide accurate and complete information</li>
              <li>You may not share your account credentials</li>
              <li>You may not use VPNs or other methods to circumvent geographical restrictions</li>
            </ul>

            <h2>4. Deposits and Withdrawals</h2>
            <ul>
              <li>Minimum deposit amount is $2</li>
              <li>All transactions are processed through PayPal</li>
              <li>Withdrawals are processed within 24 hours</li>
              <li>We reserve the right to request verification documents</li>
            </ul>

            <h2>5. Prohibited Activities</h2>
            <ul>
              <li>Match fixing or any form of betting manipulation</li>
              <li>Using multiple accounts</li>
              <li>Automated betting or bot usage</li>
              <li>Money laundering or other illegal activities</li>
            </ul>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Terms;
