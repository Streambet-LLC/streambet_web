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
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>

          <div className="grid gap-8">
            {[
              {
                title: "1. Information We Collect",
                content: (
                  <>
                    <p className="text-muted-foreground mb-4">We collect information necessary for operating a live betting platform:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Personal identification information (name, date of birth, email)</li>
                      <li>Financial information (transaction history, betting patterns)</li>
                      <li>Location data to ensure compliance with local gambling laws</li>
                      <li>Device and browser information for security purposes</li>
                      <li>Betting history and preferences</li>
                    </ul>
                  </>
                ),
              },
              {
                title: "2. How We Use Your Information",
                content: (
                  <>
                    <p className="text-muted-foreground mb-4">Your information is used to:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Verify your identity and age</li>
                      <li>Process deposits and withdrawals</li>
                      <li>Prevent fraud and money laundering</li>
                      <li>Comply with gambling regulations</li>
                      <li>Improve our services and user experience</li>
                      <li>Detect and prevent problem gambling</li>
                    </ul>
                  </>
                ),
              },
              {
                title: "3. Information Sharing",
                content: (
                  <>
                    <p className="text-muted-foreground mb-4">We may share your information with:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Payment processors (PayPal)</li>
                      <li>Identity verification services</li>
                      <li>Gambling regulatory authorities</li>
                      <li>Law enforcement when required by law</li>
                    </ul>
                  </>
                ),
              },
              {
                title: "4. Responsible Gambling",
                content: (
                  <>
                    <p className="text-muted-foreground mb-4">We are committed to responsible gambling and may use your information to:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Monitor for signs of problem gambling</li>
                      <li>Implement self-exclusion requests</li>
                      <li>Enforce betting limits</li>
                      <li>Provide resources for gambling addiction support</li>
                    </ul>
                  </>
                ),
              },
              {
                title: "5. Data Security",
                content: (
                  <>
                    <p className="text-muted-foreground mb-4">We implement strict security measures to protect your information, including:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Encryption of sensitive data</li>
                      <li>Regular security audits</li>
                      <li>Access controls and monitoring</li>
                      <li>Secure payment processing</li>
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
