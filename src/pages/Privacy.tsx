import React from 'react';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />

      <main className="container flex-1 pt-24 pb-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>

          <div className="prose prose-invert max-w-none">
            <p>Last updated: {new Date().toLocaleDateString()}</p>

            <h2>1. Information We Collect</h2>
            <p>We collect information necessary for operating a live betting platform:</p>
            <ul>
              <li>Personal identification information (name, date of birth, email)</li>
              <li>Financial information (transaction history, betting patterns)</li>
              <li>Location data to ensure compliance with local gambling laws</li>
              <li>Device and browser information for security purposes</li>
              <li>Betting history and preferences</li>
            </ul>

            <h2>2. How We Use Your Information</h2>
            <p>Your information is used to:</p>
            <ul>
              <li>Verify your identity and age</li>
              <li>Process deposits and withdrawals</li>
              <li>Prevent fraud and money laundering</li>
              <li>Comply with gambling regulations</li>
              <li>Improve our services and user experience</li>
              <li>Detect and prevent problem gambling</li>
            </ul>

            <h2>3. Information Sharing</h2>
            <p>We may share your information with:</p>
            <ul>
              <li>Payment processors (PayPal)</li>
              <li>Identity verification services</li>
              <li>Gambling regulatory authorities</li>
              <li>Law enforcement when required by law</li>
            </ul>

            <h2>4. Responsible Gambling</h2>
            <p>We are committed to responsible gambling and may use your information to:</p>
            <ul>
              <li>Monitor for signs of problem gambling</li>
              <li>Implement self-exclusion requests</li>
              <li>Enforce betting limits</li>
              <li>Provide resources for gambling addiction support</li>
            </ul>

            <h2>5. Data Security</h2>
            <p>We implement strict security measures to protect your information, including:</p>
            <ul>
              <li>Encryption of sensitive data</li>
              <li>Regular security audits</li>
              <li>Access controls and monitoring</li>
              <li>Secure payment processing</li>
            </ul>
          </div>
        </div>
      </main>

      {/* <Footer /> */}
    </div>
  );
};

export default Privacy;
