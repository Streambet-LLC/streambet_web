import { MainLayout } from '@/components/layout';
import HowToPlayContent from '@/components/how-to-play/HowToPlayContent';

export default function HowToPlay() {
  return (
    <MainLayout showFooter>
      <div className="w-full flex flex-col gap-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">How CardCade Works</h2>
          <p className="text-sm text-muted-foreground">
            Learn how to earn CadeCoins and win prizes
          </p>
        </div>
        <HowToPlayContent />
      </div>
    </MainLayout>
  );
}
