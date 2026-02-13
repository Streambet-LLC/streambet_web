import { MainLayout } from '@/components/layout';
import { DailySpinContainer } from '@/components/daily-spin';

export const DailySpin = () => {
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <DailySpinContainer />
      </div>
    </MainLayout>
  );
};
