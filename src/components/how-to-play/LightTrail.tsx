import { useEffect, useState, useRef, useMemo } from 'react';
import { trailPaths } from './trailPaths';

// Animation duration for the light trail effect (in seconds)
const TRAIL_ANIMATION_DURATION = '5s';

interface LightTrailProps {
  word: string;
  shouldAnimate: boolean;
}

export default function LightTrail({ word, shouldAnimate }: LightTrailProps) {
  const [pathLength, setPathLength] = useState(0);
  const pathRef = useRef<SVGPathElement>(null);
  const trailData = useMemo(() => trailPaths.find((t) => t.word === word), [word]);

  useEffect(() => {
    if (!trailData || !pathRef.current) return;

    // Calculate path length once using the ref
    const length = pathRef.current.getTotalLength();
    setPathLength(length);
  }, [trailData]);

  if (!trailData) return null;

  // Replace spaces with hyphens for valid SVG ID (e.g., "LEVEL UP" -> "LEVEL-UP")
  const filterId = word.replace(/\s+/g, '-');

  return (
    <div className="absolute left-1/2 -translate-x-1/2 w-3/4 h-20 flex items-end justify-center" style={{ bottom: '20px' }}>
      <svg
        viewBox={trailData.viewBox}
        className="w-full h-full"
        style={{ maxWidth: '100%', height: 'auto' }}
      >
        <defs>
          <filter id={`glow-${filterId}`}>
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path
          ref={pathRef}
          d={trailData.path}
          fill="none"
          stroke={trailData.color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#glow-${filterId})`}
          style={{
            strokeDasharray: pathLength,
            strokeDashoffset: shouldAnimate ? 0 : pathLength,
            transition: shouldAnimate ? `stroke-dashoffset ${TRAIL_ANIMATION_DURATION} ease-out` : 'none',
            willChange: shouldAnimate ? 'stroke-dashoffset' : 'auto',
            opacity: pathLength > 0 ? 1 : 0,
          }}
        />
      </svg>
    </div>
  );
}
