# Font Files Configuration

## Current Status:
✅ **Font files are properly configured and loaded**

## Available Font Weights:
- **Light (300)**: `fabioxm-light.ttf`
- **Regular (400)**: `fabioxm-regular.ttf` 
- **Medium (500)**: `fabioxm-medium.ttf`
- **Semibold (600)**: `fabioxm-semibold.ttf`
- **Bold (700)**: `fabioxm-bold.ttf`
- **Black (900)**: `fabioxm-black.ttf`

## Usage in CSS:
```css
font-family: 'FabioXM', sans-serif;
font-weight: 300; /* Light */
font-weight: 400; /* Regular */
font-weight: 500; /* Medium */
font-weight: 600; /* Semibold */
font-weight: 700; /* Bold */
font-weight: 900; /* Black */
```

## Usage in Tailwind:
The font is configured in `tailwind.config.ts` as `fabio`:
```css
font-fabio: ['FabioXM', 'system-ui', 'sans-serif']
```

## Files Location:
All font files are located in `public/fonts/FabioXM/` directory. 