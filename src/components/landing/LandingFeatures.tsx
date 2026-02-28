import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import {
  Trophy,
  DollarSign,
  Users,
  Shield,
  Zap,
  Coins,
  MapPin,
  ChartBar,
  Sparkles,
  Store,
  ArrowRight,
  Check,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';

const AnimatedTextCycler = () => {
  const firstWords = ['earn', 'spend', 'predict', 'shop', 'browse'];
  const secondWords = [
    'less you pay',
    'more prizes you get',
    'lower the fees',
    'better the sales',
    'better the prices',
  ];

  const [firstIndex, setFirstIndex] = useState(0);
  const [secondIndex, setSecondIndex] = useState(0);

  useEffect(() => {
    const firstInterval = setInterval(() => {
      setFirstIndex(prev => (prev + 1) % firstWords.length);
    }, 2000);

    return () => clearInterval(firstInterval);
  }, [firstWords.length]);

  useEffect(() => {
    const secondInterval = setInterval(() => {
      setSecondIndex(prev => (prev + 1) % secondWords.length);
    }, 2500);

    return () => clearInterval(secondInterval);
  }, [secondWords.length]);

  return (
    <p className="text-xl md:text-2xl text-[#FFFFFFBF]">
      The more you{' '}
      <motion.span
        key={`first-${firstIndex}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.4 }}
        className="text-electric-lime font-semibold inline-block"
      >
        {firstWords[firstIndex]}
      </motion.span>
      , the{' '}
      <motion.span
        key={`second-${secondIndex}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.4 }}
        className="text-purple-400 font-semibold inline-block"
      >
        {secondWords[secondIndex]}
      </motion.span>
      . It's that simple.
    </p>
  );
};

const packCards = [
  {
    icon: MapPin,
    title: 'Discover Local Sellers',
    description:
      'Find collectors in your area with our smart location algorithm. Meet up locally, inspect cards in person, and build real connections.',
    gradient: 'from-blue-500 to-cyan-500',
    color: 'blue',
    number: '01',
  },
  {
    icon: Users,
    title: 'Community First',
    description:
      'Built by collectors, for collectors—not corporate interests. Your success is our success, every step of the way.',
    gradient: 'from-electric-lime to-creator-green',
    color: 'lime',
    number: '02',
  },
  {
    icon: Store,
    title: 'Your Shop, Your Rules',
    description:
      'Set up your shop in minutes. Control pricing, inventory, and reach. No lock-ins, no restrictions.',
    gradient: 'from-orange-500 to-red-500',
    color: 'orange',
    number: '03',
  },
  {
    icon: DollarSign,
    title: 'Clear Pricing',
    description:
      'See exactly what you pay before you commit. No hidden fees, no surprises at checkout. Total transparency.',
    gradient: 'from-green-500 to-emerald-500',
    color: 'green',
    number: '04',
  },
  {
    icon: Shield,
    title: 'Verified Authenticity',
    description:
      'Every card is graded and verified by professionals. Only reputable grading companies. Buy with confidence.',
    gradient: 'from-blue-600 to-indigo-600',
    color: 'indigo',
    number: '05',
  },
  {
    icon: Zap,
    title: 'List in Seconds',
    description:
      'Upload a photo, set your price, go live instantly. Your cards are in front of collectors in under a minute.',
    gradient: 'from-yellow-500 to-orange-500',
    color: 'yellow',
    number: '06',
  },
];

const FeatureCardPack = () => {
  const shouldReduceMotion = useReducedMotion();
  const [isOpened, setIsOpened] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [cardsRevealed, setCardsRevealed] = useState(false);

  const handleOpen = useCallback(() => {
    if (isOpened) return;
    setIsOpened(true);
    // Let cards burst out then settle
    setTimeout(() => setCardsRevealed(true), shouldReduceMotion ? 0 : 600);
  }, [isOpened, shouldReduceMotion]);

  const handleNext = useCallback(() => {
    setDirection(1);
    setCurrentIndex(prev => (prev + 1) % packCards.length);
  }, []);

  const handlePrev = useCallback(() => {
    setDirection(-1);
    setCurrentIndex(prev => (prev - 1 + packCards.length) % packCards.length);
  }, []);

  const currentCard = packCards[currentIndex];
  const CurrentIcon = currentCard.icon;

  const cardVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.8,
      rotateY: dir > 0 ? 45 : -45,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      rotateY: 0,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -300 : 300,
      opacity: 0,
      scale: 0.8,
      rotateY: dir > 0 ? -45 : 45,
    }),
  };

  return (
    <div className="relative max-w-lg mx-auto min-h-[440px] flex items-center justify-center">
      <AnimatePresence mode="wait">
        {!isOpened ? (
          /* -------- SEALED PACK -------- */
          <motion.div
            key="pack"
            className="cursor-pointer select-none relative"
            onClick={handleOpen}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={
              shouldReduceMotion
                ? { opacity: 0 }
                : {
                    scale: 1.3,
                    opacity: 0,
                    rotateZ: [0, -3, 3, -2, 2, 0],
                    transition: { duration: 0.5 },
                  }
            }
            whileHover={shouldReduceMotion ? {} : { scale: 1.04, rotateZ: -1 }}
            whileTap={shouldReduceMotion ? {} : { scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            {/* Pack wrapper */}
            <div className="relative w-[280px] md:w-[320px] h-[400px] md:h-[440px] rounded-2xl overflow-hidden group">
              {/* Foil background */}
              <div className="absolute inset-0 bg-gradient-to-br from-electric-lime/30 via-creator-green/50 to-electric-lime/20 border-2 border-electric-lime/40 group-hover:border-electric-lime/70 rounded-2xl transition-all duration-300" />

              {/* Shimmer sweep */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-12"
                animate={shouldReduceMotion ? {} : { x: ['-200%', '200%'] }}
                transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
              />

              {/* Inner design */}
              <div className="relative z-10 h-full flex flex-col items-center justify-center p-8 space-y-6">
                {/* Stacked mini cards visual */}
                <div className="relative w-32 h-40">
                  {[...Array(4)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute inset-0 rounded-xl border border-white/20 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm"
                      style={{
                        transform: `rotate(${(i - 1.5) * 8}deg) translateY(${i * -3}px)`,
                        zIndex: i,
                      }}
                      animate={
                        shouldReduceMotion
                          ? {}
                          : {
                              rotate: [(i - 1.5) * 8, (i - 1.5) * 8 + 2, (i - 1.5) * 8],
                            }
                      }
                      transition={{ duration: 3, repeat: Infinity, delay: i * 0.3 }}
                    />
                  ))}
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center z-10"
                    animate={
                      shouldReduceMotion
                        ? {}
                        : {
                            scale: [1, 1.1, 1],
                          }
                    }
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Package className="w-16 h-16 text-electric-lime drop-shadow-lg" />
                  </motion.div>
                </div>

                {/* Pack label */}
                <div className="text-center space-y-2">
                  <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                    CardCade Pack
                  </h3>
                  <p className="text-sm font-bold text-electric-lime/80 uppercase tracking-widest">
                    6 Features Inside
                  </p>
                </div>

                {/* Tear line */}
                <div className="w-full flex items-center gap-2 px-4">
                  <div className="flex-1 border-t-2 border-dashed border-white/30" />
                  <span className="text-xs text-white/40 uppercase tracking-wider font-medium">
                    tear here
                  </span>
                  <div className="flex-1 border-t-2 border-dashed border-white/30" />
                </div>

                {/* Tap CTA */}
                <motion.p
                  className="text-sm text-white/50 font-medium"
                  animate={shouldReduceMotion ? {} : { opacity: [0.4, 0.8, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  Tap to rip open →
                </motion.p>
              </div>

              {/* Edge glow */}
              <div className="absolute inset-0 rounded-2xl shadow-[inset_0_0_40px_rgba(189,255,0,0.1)] pointer-events-none" />
            </div>

            {/* Outer glow on hover */}
            <motion.div
              className="absolute -inset-4 rounded-3xl bg-electric-lime/10 blur-2xl -z-10"
              animate={
                shouldReduceMotion
                  ? {}
                  : {
                      opacity: [0.3, 0.6, 0.3],
                      scale: [0.95, 1.05, 0.95],
                    }
              }
              transition={{ duration: 3, repeat: Infinity }}
            />
          </motion.div>
        ) : (
          /* -------- OPENED CAROUSEL -------- */
          <motion.div
            key="carousel"
            className="w-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: shouldReduceMotion ? 0 : 0.3 }}
          >
            {/* Burst particles on open */}
            {!cardsRevealed && !shouldReduceMotion && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-3 h-3 rounded-full bg-electric-lime"
                    initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                    animate={{
                      x: Math.cos((i * 30 * Math.PI) / 180) * 200,
                      y: Math.sin((i * 30 * Math.PI) / 180) * 200,
                      scale: 0,
                      opacity: 0,
                    }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                ))}
                {/* Flash */}
                <motion.div
                  className="absolute w-full h-full bg-electric-lime/20 rounded-3xl"
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                />
              </div>
            )}

            <div className="relative">
              {/* Stacked cards behind (visual depth) */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <motion.div
                  className="w-[90%] h-[95%] rounded-3xl border border-white/5 bg-card/30 backdrop-blur-sm"
                  initial={shouldReduceMotion ? {} : { scale: 0, rotate: 20 }}
                  animate={{ scale: 0.95, rotate: 0, y: 12 }}
                  transition={{
                    delay: shouldReduceMotion ? 0 : 0.4,
                    type: 'spring',
                    stiffness: 200,
                    damping: 20,
                  }}
                />
                <motion.div
                  className="absolute w-[85%] h-[90%] rounded-3xl border border-white/5 bg-card/20 backdrop-blur-sm"
                  initial={shouldReduceMotion ? {} : { scale: 0, rotate: -15 }}
                  animate={{ scale: 0.9, rotate: 0, y: 24 }}
                  transition={{
                    delay: shouldReduceMotion ? 0 : 0.5,
                    type: 'spring',
                    stiffness: 200,
                    damping: 20,
                  }}
                />
              </div>

              {/* Active card */}
              <motion.div
                className="relative z-10 cursor-pointer select-none"
                onClick={handleNext}
                initial={shouldReduceMotion ? {} : { scale: 0, rotateZ: 15, y: -40 }}
                animate={{ scale: 1, rotateZ: 0, y: 0 }}
                transition={{
                  delay: shouldReduceMotion ? 0 : 0.3,
                  type: 'spring',
                  stiffness: 250,
                  damping: 22,
                }}
              >
                <AnimatePresence mode="wait" custom={direction}>
                  <motion.div
                    key={currentIndex}
                    custom={direction}
                    variants={shouldReduceMotion ? undefined : cardVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="relative"
                  >
                    <div
                      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${currentCard.gradient}/10 border-2 border-white/20 hover:border-white/40 p-8 md:p-10 transition-all duration-300 min-h-[340px] flex flex-col justify-between`}
                    >
                      {/* Background glow */}
                      <motion.div
                        className={`absolute -right-20 -top-20 w-60 h-60 bg-gradient-to-br ${currentCard.gradient} opacity-15 rounded-full blur-3xl`}
                        animate={shouldReduceMotion ? {} : { scale: [1, 1.3, 1] }}
                        transition={{ duration: 4, repeat: Infinity }}
                      />
                      <motion.div
                        className={`absolute -left-20 -bottom-20 w-48 h-48 bg-gradient-to-br ${currentCard.gradient} opacity-10 rounded-full blur-3xl`}
                        animate={shouldReduceMotion ? {} : { scale: [1.2, 1, 1.2] }}
                        transition={{ duration: 5, repeat: Infinity }}
                      />

                      {/* Card number */}
                      <div className="absolute top-6 right-8 text-7xl font-black text-white/5 select-none">
                        {currentCard.number}
                      </div>

                      <div className="relative space-y-6">
                        {/* Icon */}
                        <motion.div
                          className={`rounded-2xl bg-gradient-to-br ${currentCard.gradient} flex items-center justify-center shadow-lg w-[72px] h-[72px]`}
                          initial={{ rotate: -20, scale: 0.5 }}
                          animate={{ rotate: 0, scale: 1 }}
                          transition={{ type: 'spring', bounce: 0.5 }}
                        >
                          <CurrentIcon className="w-9 h-9 text-white" />
                        </motion.div>

                        {/* Content */}
                        <div className="space-y-3">
                          <motion.h3
                            className="text-3xl md:text-4xl font-black text-white"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 }}
                          >
                            {currentCard.title}
                          </motion.h3>
                          <motion.p
                            className="text-lg text-[#FFFFFFBF] leading-relaxed"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.25 }}
                          >
                            {currentCard.description}
                          </motion.p>
                        </div>
                      </div>

                      {/* Bottom bar - Progress & tap hint */}
                      <div className="relative mt-8 space-y-4">
                        {/* Progress dots */}
                        <div className="flex items-center justify-center gap-2">
                          {packCards.map((_, i) => (
                            <button
                              key={i}
                              onClick={e => {
                                e.stopPropagation();
                                setDirection(i > currentIndex ? 1 : -1);
                                setCurrentIndex(i);
                              }}
                              className={`h-2 rounded-full transition-all duration-300 ${
                                i === currentIndex
                                  ? `w-8 bg-gradient-to-r ${currentCard.gradient}`
                                  : 'w-2 bg-white/20 hover:bg-white/40'
                              }`}
                            />
                          ))}
                        </div>

                        {/* Tap hint */}
                        <motion.p
                          className="text-center text-sm text-white/30 font-medium"
                          animate={shouldReduceMotion ? {} : { opacity: [0.3, 0.6, 0.3] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          Tap to reveal next card • {currentIndex + 1}/{packCards.length}
                        </motion.p>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </motion.div>

              {/* Navigation arrows */}
              <motion.div
                className="absolute top-1/2 -translate-y-1/2 -left-4 md:-left-16 z-20"
                initial={shouldReduceMotion ? {} : { opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: shouldReduceMotion ? 0 : 0.7 }}
              >
                <button
                  onClick={e => {
                    e.stopPropagation();
                    handlePrev();
                  }}
                  className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center transition-all duration-200 hover:scale-110"
                >
                  <ArrowRight className="w-5 h-5 text-white rotate-180" />
                </button>
              </motion.div>
              <motion.div
                className="absolute top-1/2 -translate-y-1/2 -right-4 md:-right-16 z-20"
                initial={shouldReduceMotion ? {} : { opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: shouldReduceMotion ? 0 : 0.7 }}
              >
                <button
                  onClick={e => {
                    e.stopPropagation();
                    handleNext();
                  }}
                  className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center transition-all duration-200 hover:scale-110"
                >
                  <ArrowRight className="w-5 h-5 text-white" />
                </button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FeatureCard = ({
  icon: Icon,
  title,
  description,
  gradient,
  delay = 0,
}: {
  icon: any;
  title: string;
  description: string;
  gradient: string;
  delay?: number;
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={shouldReduceMotion ? undefined : { opacity: 0, y: 20 }}
      whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={shouldReduceMotion ? undefined : { duration: 0.5, delay }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <Card className="p-6 h-full bg-card/50 backdrop-blur-sm border-[#FFFFFF20] hover:border-electric-lime/50 hover:shadow-[0_0_30px_rgba(189,255,0,0.2)] transition-all duration-300 group relative overflow-hidden">
        <motion.div className="absolute inset-0 bg-gradient-to-br from-electric-lime/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="relative space-y-4">
          <motion.div
            className={`w-14 h-14 rounded-xl ${gradient} flex items-center justify-center shadow-lg`}
            animate={
              isHovered && !shouldReduceMotion ? { scale: 1.1, rotate: 5 } : { scale: 1, rotate: 0 }
            }
            transition={{ duration: 0.3 }}
          >
            <Icon className="w-7 h-7 text-black" />
          </motion.div>
          <h3 className="text-xl font-bold group-hover:text-electric-lime transition-colors">
            {title}
          </h3>
          <p className="text-[#FFFFFFBF] leading-relaxed">{description}</p>
        </div>
      </Card>
    </motion.div>
  );
};

export default function LandingFeatures() {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="max-w-7xl mx-auto px-4 py-16 space-y-32">
      {/* Gamification Section - Enhanced with gradient background */}
      <motion.section
        initial={shouldReduceMotion ? undefined : { opacity: 0 }}
        whileInView={shouldReduceMotion ? undefined : { opacity: 1 }}
        viewport={{ once: true }}
        className="relative -mx-4 px-4 py-16 overflow-hidden"
      >
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-electric-lime/10 to-transparent" />
        <motion.div
          className="absolute inset-0 opacity-30"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, rgba(189,255,0,0.15) 0%, transparent 70%)',
          }}
          animate={
            shouldReduceMotion
              ? {}
              : {
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.5, 0.3],
                }
          }
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        <div className="relative">
          <div className="text-center space-y-6 mb-16">
            <motion.h2
              className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-white via-electric-lime to-white bg-clip-text text-transparent pb-2"
              initial={shouldReduceMotion ? undefined : { opacity: 0, y: 20 }}
              whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              Earn Rewards with Every Action
            </motion.h2>
            <motion.p
              className="text-xl md:text-2xl text-[#FFFFFFBF] max-w-3xl mx-auto leading-relaxed"
              initial={shouldReduceMotion ? undefined : { opacity: 0, y: 20 }}
              whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              CadeCoins aren't just points—they're your ticket to lower fees, exclusive prizes, and
              VIP perks.
            </motion.p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            <div className="md:mt-0">
              <FeatureCard
                icon={Coins}
                title="Earn as You Trade"
                description="Buy or sell a slab? You earn CadeCoins. List an item? More coins. Every action on CardCade rewards you, building your balance automatically."
                gradient="bg-gradient-to-br from-electric-lime to-creator-green"
                delay={0}
              />
            </div>
            <div className="md:mt-8">
              <FeatureCard
                icon={Trophy}
                title="Unlock Prizes"
                description="Redeem your CadeCoins for exclusive prizes, limited edition cards, or even lower fees. Your trading activity becomes tangible rewards you can enjoy."
                gradient="bg-gradient-to-br from-yellow-400 to-orange-500"
                delay={0.1}
              />
            </div>
            <div className="md:mt-16">
              <FeatureCard
                icon={ChartBar}
                title="Level Up Your Status"
                description="The more you trade, the more you earn. Build your reputation and unlock higher tiers with better rewards, lower fees, and exclusive marketplace access."
                gradient="bg-gradient-to-br from-purple-500 to-pink-500"
                delay={0.2}
              />
            </div>
          </div>
        </div>
      </motion.section>

      {/* Lower Fees Section - Side by side comparison */}
      <motion.section
        initial={shouldReduceMotion ? undefined : { opacity: 0 }}
        whileInView={shouldReduceMotion ? undefined : { opacity: 1 }}
        viewport={{ once: true }}
        className="space-y-12"
      >
        <div className="text-center space-y-4">
          <h2 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
            The Lowest Fees in the Game
          </h2>
          <p className="text-lg md:text-xl text-[#FFFFFFBF] max-w-2xl mx-auto">
            Keep more of your money. Use CadeCoins to slash fees even further.
          </p>
        </div>

        {/* Modern comparison design */}
        <div className="relative max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 md:gap-16 items-center">
            {/* Left side - Base Fees */}
            <motion.div
              initial={shouldReduceMotion ? undefined : { opacity: 0, x: -30 }}
              whileInView={shouldReduceMotion ? undefined : { opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <div className="text-right md:text-right space-y-4">
                <div className="inline-block px-4 py-2 rounded-full bg-electric-lime/10 border border-electric-lime/30 mb-4">
                  <span className="text-sm font-semibold text-electric-lime">STANDARD</span>
                </div>
                <h3 className="text-2xl md:text-3xl font-bold">Fair from the Start</h3>
                <p className="text-[#FFFFFFBF] text-base md:text-lg">
                  No hidden charges, no surprise costs. Just honest, transparent pricing.
                </p>
                <div className="pt-6">
                  <motion.div
                    initial={shouldReduceMotion ? undefined : { scale: 0.8, opacity: 0 }}
                    whileInView={shouldReduceMotion ? undefined : { scale: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    <div className="text-7xl md:text-8xl font-black bg-gradient-to-br from-electric-lime to-creator-green bg-clip-text text-transparent leading-none">
                      5%
                    </div>
                    <div className="text-sm text-[#FFFFFF60] mt-3 font-medium tracking-wide">
                      OR LESS
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>

            {/* Right side - CadeCoin Discount */}
            <motion.div
              initial={shouldReduceMotion ? undefined : { opacity: 0, x: 30 }}
              whileInView={shouldReduceMotion ? undefined : { opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <div className="text-left md:text-left space-y-4">
                <div className="inline-block px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/30 mb-4">
                  <span className="text-sm font-semibold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    WITH CADECOINS
                  </span>
                </div>
                <h3 className="text-2xl md:text-3xl font-bold">Rewards That Pay Off</h3>
                <p className="text-[#FFFFFFBF] text-base md:text-lg">
                  Trade more, earn more coins, pay less. Your activity directly reduces your fees.
                </p>
                <div className="pt-6">
                  <motion.div
                    initial={shouldReduceMotion ? undefined : { scale: 0.8, opacity: 0 }}
                    whileInView={shouldReduceMotion ? undefined : { scale: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="relative"
                  >
                    <div className="text-7xl md:text-8xl font-black bg-gradient-to-br from-purple-400 via-pink-400 to-purple-500 bg-clip-text text-transparent leading-none">
                      50%
                    </div>
                    <div className="text-sm text-[#FFFFFF60] mt-3 font-medium tracking-wide">
                      OFF YOUR FEES
                    </div>
                    <motion.div
                      className="absolute -right-4 -top-4 w-20 h-20 bg-purple-500/20 rounded-full blur-2xl"
                      animate={
                        shouldReduceMotion ? {} : { scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }
                      }
                      transition={{ duration: 3, repeat: Infinity }}
                    />
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Bottom highlight - Animated Text Cycler */}
          <motion.div
            initial={shouldReduceMotion ? undefined : { opacity: 0, y: 20 }}
            whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-12 text-center p-8 rounded-2xl bg-gradient-to-r from-electric-lime/5 via-purple-500/5 to-pink-500/5"
          >
            <AnimatedTextCycler />
          </motion.div>
        </div>
      </motion.section>

      {/* Why CardCade Section - Card Pack */}
      <motion.section
        initial={shouldReduceMotion ? undefined : { opacity: 0 }}
        whileInView={shouldReduceMotion ? undefined : { opacity: 1 }}
        viewport={{ once: true }}
        className="space-y-12 relative py-8"
      >
        {/* Header */}
        <motion.div
          className="text-center space-y-4"
          initial={shouldReduceMotion ? undefined : { opacity: 0, y: -20 }}
          whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-6xl font-black bg-gradient-to-r from-electric-lime via-white to-electric-lime bg-clip-text text-transparent pb-2 leading-tight">
            Why CardCade?
          </h2>
          <p className="text-lg md:text-xl text-[#FFFFFFBF] max-w-2xl mx-auto">
            Rip open the pack to discover what makes us different.
          </p>
        </motion.div>

        {/* Card Pack */}
        <FeatureCardPack />
      </motion.section>

      {/* Final CTA Section - Enhanced with gradient background */}
      <motion.section
        initial={shouldReduceMotion ? undefined : { opacity: 0, y: 20 }}
        whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-electric-lime/10 via-creator-green/5 to-transparent rounded-3xl" />
        <motion.div
          className="absolute inset-0"
          animate={
            shouldReduceMotion
              ? {}
              : {
                  background: [
                    'radial-gradient(circle at 20% 50%, rgba(189,255,0,0.1) 0%, transparent 50%)',
                    'radial-gradient(circle at 80% 50%, rgba(189,255,0,0.1) 0%, transparent 50%)',
                    'radial-gradient(circle at 20% 50%, rgba(189,255,0,0.1) 0%, transparent 50%)',
                  ],
                }
          }
          transition={{ duration: 10, repeat: Infinity }}
        />

        <div className="relative text-center space-y-8 py-16 lg:py-24 px-4">
          <motion.div
            initial={shouldReduceMotion ? undefined : { scale: 0.8 }}
            whileInView={shouldReduceMotion ? undefined : { scale: 1 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-white via-electric-lime to-white bg-clip-text text-transparent pb-2">
              Ready to Start Trading?
            </h2>
            <p className="text-lg md:text-xl text-[#FFFFFFBF] max-w-2xl mx-auto">
              Join CardCade today and experience the future of card collecting. Start earning
              CadeCoins with your first trade.
            </p>
          </motion.div>

          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            initial={shouldReduceMotion ? undefined : { opacity: 0, y: 20 }}
            whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <Button
              size="lg"
              onClick={() => navigate('/signup')}
              className="bg-gradient-to-r from-electric-lime to-creator-green hover:opacity-90 hover:from-electric-lime/90 hover:to-creator-green/90 text-black font-semibold px-10 py-7 text-lg shadow-lg shadow-electric-lime/30 hover:shadow-electric-lime/50 transition-all duration-300 group"
            >
              Get Started Free
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/login')}
              className="border-2 border-electric-lime text-electric-lime hover:bg-electric-lime hover:text-black hover:border-electric-lime px-10 py-7 text-lg transition-all duration-300 shadow-lg"
            >
              Sign In
            </Button>
          </motion.div>
        </div>
      </motion.section>
    </div>
  );
}
