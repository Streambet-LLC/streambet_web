/**
 * SVG helper functions for wheel rendering calculations
 */

interface ArcPathResult {
  pathData: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface TextPositionResult {
  x: number;
  y: number;
  rotation: number;
}

/**
 * Calculate SVG path data for a wheel segment arc
 * @param segmentIndex - Index of the segment (0-based)
 * @param segmentSize - Size of each segment in degrees
 * @param centerX - X coordinate of circle center
 * @param centerY - Y coordinate of circle center
 * @param radius - Radius of the circle
 * @returns Object containing path data string and arc endpoint coordinates
 */
export function calculateSegmentPath(
  segmentIndex: number,
  segmentSize: number,
  centerX = 50,
  centerY = 50,
  radius = 50
): ArcPathResult {
  const startAngle = segmentIndex * segmentSize;
  const endAngle = (segmentIndex + 1) * segmentSize;

  const startRad = (startAngle * Math.PI) / 180;
  const endRad = (endAngle * Math.PI) / 180;

  const x1 = centerX + radius * Math.cos(startRad);
  const y1 = centerY + radius * Math.sin(startRad);
  const x2 = centerX + radius * Math.cos(endRad);
  const y2 = centerY + radius * Math.sin(endRad);

  const largeArcFlag = segmentSize > 180 ? 1 : 0;

  const pathData = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

  return { pathData, x1, y1, x2, y2 };
}

/**
 * Calculate text position and rotation for a wheel segment
 * @param segmentIndex - Index of the segment (0-based)
 * @param segmentSize - Size of each segment in degrees
 * @param centerX - X coordinate of circle center
 * @param centerY - Y coordinate of circle center
 * @param radius - Radius of the circle
 * @param textRadiusRatio - Ratio of text distance from center (0-1, default 0.64)
 * @returns Object containing x, y coordinates and rotation angle for text
 */
export function calculateTextPosition(
  segmentIndex: number,
  segmentSize: number,
  centerX = 50,
  centerY = 50,
  radius = 50,
  textRadiusRatio = 0.64
): TextPositionResult {
  const startAngle = segmentIndex * segmentSize;
  const midAngle = startAngle + segmentSize / 2;
  const textRadius = radius * textRadiusRatio;

  const x = centerX + textRadius * Math.cos((midAngle * Math.PI) / 180);
  const y = centerY + textRadius * Math.sin((midAngle * Math.PI) / 180);

  // Rotate text so it faces outward
  const rotation = midAngle + 90;

  return { x, y, rotation };
}
