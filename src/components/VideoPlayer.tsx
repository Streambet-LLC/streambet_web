import { useEffect, useRef } from 'react';
import Hls from 'hls.js';

interface VideoPlayerProps {
  playbackId: string;
  thumbnailUrl?: string | null;
}

export const VideoPlayer = ({ playbackId, thumbnailUrl }: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!playbackId || !videoRef.current) {
      console.log('No playback ID or video ref available');
      return;
    }

    const playbackUrl = `https://cdn.livepeer.com/hls/${playbackId}/index.m3u8`;
    console.log('Setting up playback with URL:', playbackUrl);

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        liveSyncDurationCount: 3, // Reduce buffer size for lower latency
        liveMaxLatencyDurationCount: 5,
        liveDurationInfinity: true,
        backBufferLength: 30, // Reduce back buffer for lower latency
        debug: true,
      });

      hls.loadSource(playbackUrl);
      hls.attachMedia(videoRef.current);

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS error:', {
          type: data.type,
          details: data.details,
          fatal: data.fatal,
          error: data.error,
          url: playbackUrl,
          playbackId,
        });

        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('Fatal network error encountered, trying to recover');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('Fatal media error encountered, trying to recover');
              hls.recoverMediaError();
              break;
            default:
              console.log('Fatal error, cannot recover');
              hls.destroy();
              break;
          }
        }
      });

      hls.on(Hls.Events.MANIFEST_LOADED, () => {
        console.log('HLS manifest loaded successfully for stream:', {
          playbackId,
          url: playbackUrl,
        });
        videoRef.current?.play().catch(error => {
          console.error('Error attempting playback:', error);
        });
      });

      return () => {
        console.log('Cleaning up HLS instance');
        hls.destroy();
      };
    } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
      console.log('Using native HLS playback');
      videoRef.current.src = playbackUrl;
      videoRef.current.play().catch(error => {
        console.error('Error attempting native HLS playback:', error);
      });
    }
  }, [playbackId]);

  return (
    <video
      ref={videoRef}
      playsInline
      className="w-full h-full"
      poster={thumbnailUrl}
      muted // Muting by default helps with faster initial playback
    >
      <track kind="captions" />
    </video>
  );
};
