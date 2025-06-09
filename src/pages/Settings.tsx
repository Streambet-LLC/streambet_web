import { Navigation } from '@/components/Navigation';
import { Card } from '@/components/ui/card';
import { ProfileSettings } from '@/components/settings/ProfileSettings';

const Settings = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container max-w-2xl pt-24 pb-8">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>
        <div className="space-y-6">
          <ProfileSettings />
        </div>
      </main>
    </div>
  );
};

export default Settings;
