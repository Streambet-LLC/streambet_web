import Hls from 'hls.js';

export const setupHls = (
  videoRef: HTMLVideoElement,
  playbackUrl: string,
  onError?: (error: any) => void
) => {
  const hls = new Hls({
    enableWorker: true,
    lowLatencyMode: true,
    backBufferLength: 90,
    debug: true,
  });

  hls.loadSource(playbackUrl);
  hls.attachMedia(videoRef);

  hls.on(Hls.Events.MANIFEST_PARSED, () => {
    console.log('HLS manifest parsed, attempting to play');
    videoRef.play().catch(e => console.error('Error playing video:', e));
  });

  hls.on(Hls.Events.ERROR, (event, data) => {
    console.error('HLS error:', {
      type: data.type,
      details: data.details,
      fatal: data.fatal,
      error: data.error,
    });

    if (data.fatal) {
      switch (data.type) {
        case Hls.ErrorTypes.NETWORK_ERROR:
          console.error('Fatal network error encountered');
          hls.startLoad();
          break;
        case Hls.ErrorTypes.MEDIA_ERROR:
          console.error('Fatal media error encountered');
          hls.recoverMediaError();
          break;
        default:
          console.error('Fatal error, cannot recover');
          hls.destroy();
          break;
      }
    }

    if (onError) {
      onError(data);
    }
  });

  return hls;
};
