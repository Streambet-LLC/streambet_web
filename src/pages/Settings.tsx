import { ProfileSettings } from '@/components/settings/ProfileSettings';
import { MainLayout } from '@/components/layout';

const Settings = () => {
  return (
    <MainLayout className="max-w-2xl">
      <div className="space-y-6">
        <ProfileSettings />
      </div>
    </MainLayout>
  );
};

export default Settings;
