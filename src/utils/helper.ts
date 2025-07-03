/**
 * @param messageData
 * @returns message from API response
 *
 * Function used for getting message from API response of anything and returns message
 */
export const getMessage = (messageData: any) =>
  typeof messageData?.response?.data?.message === 'string'
    ? messageData?.response?.data?.message
    : typeof messageData?.response?.data?.message === 'object'
      ? messageData?.response?.data?.message?.[0]
      : typeof messageData === 'string'
        ? messageData
        : typeof messageData?.message === 'string'
          ? messageData.message
          : typeof messageData?.message === 'object'
            ? messageData.message?.[0]
            : null;

/**
 * Decode a JWT token
 * @param idToken - The JWT token to decode
 * @returns The decoded token
 */
export const decodeIdToken = (idToken: string) => {
  const base64Url = idToken.split('.')[1]; // Get the payload part
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/'); // Replace URL-safe characters
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split('')
      .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  );
  return JSON.parse(jsonPayload);
};

/**
 * @param url which is URL to image
 * @param isNotAvatar where the flag true indicate to return
 * default image based on avatar or not.
 * @returns s3bucket base appened url
 */
export function getImageLink(url: string | null | undefined, isNotAvatar?: boolean): string {
  return url?.includes('https') || url?.includes('blob:')
    ? url
    : url && !url?.includes('default')
      ? `${import.meta.env.VITE_S3_BASE_URL}/${url}`
      : isNotAvatar
        ? '/assets/no-image.svg'
        : '/avatar_placeholder_large.png';
}
