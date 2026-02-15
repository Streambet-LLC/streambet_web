import { SPIN_REWARDS } from '@/types/daily-spin';
import { WHEEL_SEGMENT_COLORS, SEGMENT_SIZE } from './daily-spin-constants';
import { calculateSegmentPath, calculateTextPosition } from './svg-utils';

/**
 * WheelSegments Component
 * Renders the colored wheel segments with prize coin amounts, probabilities, and visual effects
 */
export function WheelSegments() {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
      {/* Subtle texture pattern */}
      <defs>
        <pattern id="speckle" width="6" height="6" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.35" fill="rgba(255,255,255,0.22)" />
          <circle cx="4.5" cy="2" r="0.25" fill="rgba(0,0,0,0.22)" />
          <circle cx="2.5" cy="5" r="0.3" fill="rgba(255,255,255,0.16)" />
        </pattern>
      </defs>

      {SPIN_REWARDS.map((tier, index) => {
        const { pathData } = calculateSegmentPath(index, SEGMENT_SIZE);
        const segmentColor = WHEEL_SEGMENT_COLORS[index % WHEEL_SEGMENT_COLORS.length];
        const { x: tx, y: ty, rotation: rotate } = calculateTextPosition(index, SEGMENT_SIZE);

        return (
          <g key={tier.coins}>
            {/* Segment */}
            <path d={pathData} fill={segmentColor} />

            {/* Neon glow effect */}
            <path 
              d={pathData} 
              fill="transparent" 
              stroke={segmentColor} 
              strokeWidth="3"
              opacity="0.6"
              style={{
                filter: `drop-shadow(0 0 8px ${segmentColor}) drop-shadow(0 0 16px ${segmentColor})`
              }}
            />

            {/* Texture overlay */}
            <path d={pathData} fill="url(#speckle)" opacity="0.55" />

            {/* Segment separators with CRT glow */}
            <path 
              d={pathData} 
              fill="transparent" 
              stroke="rgba(189,255,0,0.8)" 
              strokeWidth="1.5"
              style={{
                filter: 'drop-shadow(0 0 2px rgba(189,255,0,0.6))'
              }}
            />

            {/* Coin number with outline */}
            <text
              x={tx}
              y={ty - 2.5}
              textAnchor="middle"
              dominantBaseline="middle"
              transform={`rotate(${rotate}, ${tx}, ${ty})`}
              fontSize="10.5"
              fontWeight="900"
              stroke="rgba(0,0,0,0.85)"
              strokeWidth="2.25"
              paintOrder="stroke"
              fill="white"
              style={{ 
                letterSpacing: '0.5px',
                fontFamily: '"Press Start 2P", monospace',
                textShadow: '0 0 4px currentColor, 0 0 6px currentColor',
                filter: 'brightness(1.05)'
              }}
            >
              {tier.coins}
            </text>

            {/* Probability as a small pill */}
            <g transform={`rotate(${rotate}, ${tx}, ${ty}) translate(${tx}, ${ty})`}>
              <rect
                x={-8}
                y={4}
                rx="2"
                ry="2"
                width="16"
                height="6"
                fill="rgba(0,0,0,0.65)"
                stroke="rgba(255,255,255,0.55)"
                strokeWidth="0.6"
              />
              <text
                x={0}
                y={7.3}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="4"
                fontWeight="800"
                fill="white"
                style={{
                  textShadow: '0 0 1px currentColor, 0 0 2px currentColor',
                  filter: 'brightness(1.025) contrast(1.04)'
                }}
              >
                {tier.probability}%
              </text>
            </g>
          </g>
        );
      })}
    </svg>
  );
}
