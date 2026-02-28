import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useState, useEffect } from 'react';
import LightTrail from './LightTrail';
import { infoCards } from './cardData';

// Animation timing constants (in milliseconds)
const ANIMATION_DELAYS = {
  CARD_1: 200,
  CARD_2: 1000,
  CARD_3: 2000,
} as const;

export default function HowToPlayContent() {
  const [animatingCards, setAnimatingCards] = useState<Set<number>>(new Set());

  // Sequential animation for all 3 cards on mount
  useEffect(() => {
    const timeouts: NodeJS.Timeout[] = [
      setTimeout(() => setAnimatingCards((prev) => new Set(prev).add(0)), ANIMATION_DELAYS.CARD_1),
      setTimeout(() => setAnimatingCards((prev) => new Set(prev).add(1)), ANIMATION_DELAYS.CARD_2),
      setTimeout(() => setAnimatingCards((prev) => new Set(prev).add(2)), ANIMATION_DELAYS.CARD_3),
    ];
    return () => timeouts.forEach(clearTimeout);
  }, []);

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {infoCards.map((card, index) => (
          <Card
            key={index}
            className="h-full flex flex-col min-h-[350px] border border-cyan-500 tron-grid shadow-tron-glow"
          >
            <CardHeader>
              <CardTitle className="text-xl md:text-2xl">{card.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col relative">
              <p className="text-base text-muted-foreground leading-relaxed">
                {card.description}
              </p>
              <LightTrail word={card.trailWord} shouldAnimate={animatingCards.has(index)} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
