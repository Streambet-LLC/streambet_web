import {
  Carousel,
  CarouselContent,
  CarouselDots,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useState, useEffect, useRef } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import LightTrail from './LightTrail';
import { infoCards } from './cardData';

// Animation timing constants (in milliseconds)
const ANIMATION_DELAYS = {
  MOBILE_INITIAL: 300,
  DESKTOP_CARD_1: 200,
  DESKTOP_CARD_2: 1000,
  DESKTOP_CARD_3: 2000,
  SCROLL_TRIGGER: 300,
} as const;

export default function HowToPlayContent() {
  const [animatingCards, setAnimatingCards] = useState<Set<number>>(new Set());
  const isMobile = useIsMobile();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hasInitialAnimated = useRef(false);

  // On mobile, animate the current slide whenever it changes
  useEffect(() => {
    if (isMobile && hasInitialAnimated.current) {
      const timeout = setTimeout(() => {
        setAnimatingCards((prev) => new Set(prev).add(currentSlide));
      }, ANIMATION_DELAYS.MOBILE_INITIAL);
      return () => clearTimeout(timeout);
    }
  }, [currentSlide, isMobile]);

  // Sequential animation for first 3 cards on mount (desktop) or card 0 only (mobile)
  useEffect(() => {
    if (hasInitialAnimated.current) return;

    if (isMobile) {
      hasInitialAnimated.current = true;
      // Mobile: animate first card with delay
      const timeout = setTimeout(() => {
        setAnimatingCards(new Set([0]));
      }, ANIMATION_DELAYS.MOBILE_INITIAL);
      return () => clearTimeout(timeout);
    } else {
      hasInitialAnimated.current = true;
      // Desktop: sequential animation for first 3 cards
      const timeouts: NodeJS.Timeout[] = [];

      // Card 1 after 200ms
      timeouts.push(
        setTimeout(() => {
          setAnimatingCards((prev) => new Set(prev).add(0));
        }, ANIMATION_DELAYS.DESKTOP_CARD_1)
      );

      timeouts.push(
        setTimeout(() => {
          setAnimatingCards((prev) => new Set(prev).add(1));
        }, ANIMATION_DELAYS.DESKTOP_CARD_2)
      );

      timeouts.push(
        setTimeout(() => {
          setAnimatingCards((prev) => new Set(prev).add(2));
        }, ANIMATION_DELAYS.DESKTOP_CARD_3)
      );

      return () => {
        timeouts.forEach((timeout) => clearTimeout(timeout));
      };
    }
  }, [isMobile]);

  // Intersection Observer for cards 4-7 (desktop only)
  useEffect(() => {
    if (isMobile) return; // Skip observer on mobile

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number((entry.target as HTMLElement).dataset.cardIndex);
            setTimeout(() => {
              setAnimatingCards((prev) => new Set(prev).add(index));
            }, ANIMATION_DELAYS.SCROLL_TRIGGER);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.3,
        rootMargin: '50px',
      }
    );

    cardRefs.current.forEach((card, index) => {
      if (index >= 3 && card) {
        observer.observe(card);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [isMobile]);

  // Track current slide
  useEffect(() => {
    if (!carouselApi) return;
    
    const onSelect = () => {
      setCurrentSlide(carouselApi.selectedScrollSnap());
    };
    
    carouselApi.on('select', onSelect);
    onSelect(); // Set initial slide

    return () => {
      carouselApi.off('select', onSelect);
    };
  }, [carouselApi]);

  return (
    <div className="p-6 -mx-4">
      <Carousel
        className="flex-1 w-full"
        opts={{
          align: 'start',
          loop: false,
          slidesToScroll: 1,
          containScroll: 'trimSnaps',
        }}
        setApi={setCarouselApi}
      >
        <CarouselContent className="flex-1">
          {infoCards.map((card, index) => {
            return (
              <CarouselItem
                key={index}
                className="basis-full md:basis-1/2 lg:basis-1/3 pl-4"
                ref={(el) => (cardRefs.current[index] = el)}
                data-card-index={index}
              >
                <Card
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
              </CarouselItem>
            );
          })}
        </CarouselContent>
        <div className="flex items-center justify-between pt-4">
          <CarouselPrevious
            className="relative top-0 left-0 translate-y-[unset] translate-x-[unset] border-electric-lime"
            size="lg"
          />
          <CarouselDots className="relative" />
          <CarouselNext
            className="relative top-0 left-0 translate-y-[unset] translate-x-[unset] border-electric-lime"
            size="lg"
          />
        </div>
      </Carousel>
    </div>
  );
}
