import { Variants } from 'framer-motion';

/**
 * A collection of reusable animation variants for consistent UI animations
 */
export const useAnimations = () => {
  // Card animations
  const cardVariants: Variants = {
    initial: { scale: 0.96, opacity: 0.6 },
    animate: { scale: 1, opacity: 1 },
    hover: {
      scale: 1.03,
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
      transition: { duration: 0.3, ease: 'easeOut' },
    },
    tap: { scale: 0.98 },
  };

  // Item animations for lists with staggered children
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring', stiffness: 300, damping: 24 },
    },
  };

  // Fade animations
  const fadeVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.4 },
    },
    exit: {
      opacity: 0,
      transition: { duration: 0.2 },
    },
  };

  // Scale animations
  const scaleVariants: Variants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { type: 'spring', stiffness: 400, damping: 30 },
    },
    exit: {
      opacity: 0,
      scale: 0.8,
      transition: { duration: 0.2 },
    },
  };

  // Navigation slide animations
  const navVariants: Variants = {
    visible: { y: 0, opacity: 1 },
    hidden: { y: -20, opacity: 0 },
  };

  // Button animations
  const buttonVariants: Variants = {
    initial: { scale: 1 },
    hover: { scale: 1.05 },
    tap: { scale: 0.95 },
  };

  // Pulse animation for notifications or highlights
  const pulseVariants: Variants = {
    initial: { scale: 1, opacity: 1 },
    pulse: {
      scale: [1, 1.05, 1],
      opacity: [0.7, 1, 0.7],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  };

  // Slide variants for modals or panels
  const slideInVariants: Variants = {
    hidden: { x: '100%' },
    visible: {
      x: 0,
      transition: { type: 'spring', stiffness: 300, damping: 30 },
    },
    exit: {
      x: '100%',
      transition: { duration: 0.3, ease: 'easeInOut' },
    },
  };

  return {
    cardVariants,
    containerVariants,
    itemVariants,
    fadeVariants,
    scaleVariants,
    navVariants,
    buttonVariants,
    pulseVariants,
    slideInVariants,
  };
};
