import { ProfileSettings } from '@/components/settings/ProfileSettings';
import { MainLayout } from '@/components/layout';

const Settings = () => {
  return (
    <MainLayout>
      <div className="space-y-6 max-w-2xl">
        <ProfileSettings />
      </div>
    </MainLayout>
  );
};

export default Settings;
