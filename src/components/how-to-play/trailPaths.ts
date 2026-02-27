// SVG path data for Tron light trail words
// Each path is a continuous line that forms letters
// Designed to be animated using stroke-dasharray technique

export interface TrailPathData {
  word: string;
  path: string;
  viewBox: string;
  color: string;
}

export const trailPaths: TrailPathData[] = [
  {
    word: 'BUY',
    viewBox: '0 0 300 80',
    color: '#00FFFF',
    path: [
      // B (x=115)
      'M 115 70 L 115 30 L 133 30 L 133 50 L 115 50',
      'M 115 50 L 133 50 L 133 70 L 115 70',
      // U (x=141)
      'M 141 30 L 141 70 L 159 70 L 159 30',
      // Y (x=167)
      'M 167 30 L 176 50 L 185 30',
      'M 176 50 L 176 70',
    ].join(' '),
  },
  {
    word: 'SELL',
    viewBox: '0 0 300 80',
    color: '#00FFFF',
    path: [
      // S (x=102)
      'M 102 70 L 120 70 L 120 50 L 102 50 L 102 30 L 120 30',
      // E (x=128)
      'M 128 30 L 128 70',
      'M 128 30 L 146 30',
      'M 128 50 L 142 50',
      'M 128 70 L 146 70',
      // L (x=154)
      'M 154 30 L 154 70 L 172 70',
      // L (x=180)
      'M 180 30 L 180 70 L 198 70',
    ].join(' '),
  },
  {
    word: 'FUN',
    viewBox: '0 0 300 80',
    color: '#00FFFF',
    path: [
      // F (x=115)
      'M 115 30 L 115 70',
      'M 115 30 L 133 30',
      'M 115 50 L 129 50',
      // U (x=141)
      'M 141 30 L 141 70 L 159 70 L 159 30',
      // N (x=167)
      'M 167 70 L 167 30 L 185 70 L 185 30',
    ].join(' '),
  },
  {
    word: 'CLAIM',
    viewBox: '0 0 300 80',
    color: '#00FFFF',
    path: [
      // C (x=89)
      'M 107 30 L 89 30 L 89 70 L 107 70',
      // L (x=115)
      'M 115 30 L 115 70 L 133 70',
      // A (x=141)
      'M 141 70 L 141 30 L 159 30 L 159 70',
      'M 141 50 L 159 50',
      // I (x=167)
      'M 167 30 L 185 30',
      'M 176 30 L 176 70',
      'M 167 70 L 185 70',
      // M (x=193)
      'M 193 70 L 193 30 L 202 50 L 211 30 L 211 70',
    ].join(' '),
  },
  {
    word: 'REFILL',
    viewBox: '0 0 300 80',
    color: '#00FFFF',
    path: [
      // R (x=76)
      'M 76 70 L 76 30 L 94 30 L 94 50 L 76 50',
      'M 76 50 L 94 70',
      // E (x=102)
      'M 102 30 L 102 70',
      'M 102 30 L 120 30',
      'M 102 50 L 116 50',
      'M 102 70 L 120 70',
      // F (x=128)
      'M 128 30 L 128 70',
      'M 128 30 L 146 30',
      'M 128 50 L 142 50',
      // I (x=154)
      'M 154 30 L 172 30',
      'M 163 30 L 163 70',
      'M 154 70 L 172 70',
      // L (x=180)
      'M 180 30 L 180 70 L 198 70',
      // L (x=206)
      'M 206 30 L 206 70 L 224 70',
    ].join(' '),
  },
  {
    word: 'LEVEL UP',
    viewBox: '0 0 300 80',
    color: '#00FFFF',
    path: [
      // L (x=58)
      'M 58 30 L 58 70 L 76 70',
      // E (x=84)
      'M 84 30 L 84 70',
      'M 84 30 L 102 30',
      'M 84 50 L 98 50',
      'M 84 70 L 102 70',
      // V (x=110)
      'M 110 30 L 119 70 L 128 30',
      // E (x=136)
      'M 136 30 L 136 70',
      'M 136 30 L 154 30',
      'M 136 50 L 150 50',
      'M 136 70 L 154 70',
      // L (x=162)
      'M 162 30 L 162 70 L 180 70',
      // U (x=198)
      'M 198 30 L 198 70 L 216 70 L 216 30',
      // P (x=224)
      'M 224 70 L 224 30 L 242 30 L 242 50 L 224 50',
    ].join(' '),
  },
  {
    word: 'GO',
    viewBox: '0 0 300 80',
    color: '#00FFFF',
    path: [
      // G (x=128)
      'M 146 30 L 128 30 L 128 70 L 146 70 L 146 55 L 138 55',
      // O (x=154)
      'M 154 30 L 172 30 L 172 70 L 154 70 Z',
    ].join(' '),
  },
];

