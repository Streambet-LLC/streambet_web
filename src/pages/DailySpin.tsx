import { MainLayout } from '@/components/layout';

export const DailySpin = () => {
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Daily Spin</h1>
          <div className="bg-card rounded-lg p-8 text-center">
            <p className="text-xl text-muted-foreground">
              Daily spin coming soon
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};
