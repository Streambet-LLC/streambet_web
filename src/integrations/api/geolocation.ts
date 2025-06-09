import axios from 'axios';

// List of states where online gambling is restricted
const RESTRICTED_STATES = [
  'WA', // Washington
  'NV', // Nevada
  'ID', // Idaho
  'MT', // Montana
  'OR', // Oregon
  'UT', // Utah
  'AZ', // Arizona
  'SD', // South Dakota
  'IA', // Iowa
  'LA', // Louisiana
  'AL', // Alabama
  'SC', // South Carolina
  'HI', // Hawaii
];

export interface GeolocationResult {
  allowed: boolean;
  state?: string;
  country?: string;
  error?: string;
}

// Use a free geolocation API service
const GEOLOCATION_API = 'https://ipapi.co/json/';

/**
 * Verify if the user's location is allowed for gambling
 * @returns Promise with geolocation result
 */
export async function verifyUserLocation(): Promise<GeolocationResult> {
  try {
    const response = await axios.get(GEOLOCATION_API);
    const { country, region } = response.data;

    // If not in the US, allow access (adjust this logic based on your requirements)
    if (country !== 'US') {
      return { allowed: true, country, state: region };
    }

    // If in a restricted US state, deny access
    if (RESTRICTED_STATES.includes(region)) {
      return {
        allowed: false,
        country,
        state: region,
        error: `Sorry, Streambet is not available in ${region} due to local regulations.`,
      };
    }

    // Otherwise, allow access
    return { allowed: true, country, state: region };
  } catch (error) {
    console.error('Geolocation check failed:', error);
    // In case of error, we could either:
    // 1. Allow access (more permissive)
    // 2. Deny access (more restrictive)
    // Let's go with option 1 for now but log the error
    return {
      allowed: true,
      error: 'Could not verify your location. Proceeding anyway.',
    };
  }
}

/**
 * Verify user location with browser's Geolocation API as a fallback
 * Note: This requires user permission and is less reliable for region detection
 */
export function getBrowserGeolocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
    } else {
      navigator.geolocation.getCurrentPosition(resolve, reject);
    }
  });
}
