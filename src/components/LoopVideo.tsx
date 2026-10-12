import type { VideoHTMLAttributes } from 'react';
import type { VideoSources } from '../assets/artwork';

interface LoopVideoProps extends Omit<VideoHTMLAttributes<HTMLVideoElement>, 'src'> {
  sources: VideoSources;
}

/**
 * Vidéo silencieuse avec ses variantes de format : MP4 (H.264) pour Safari,
 * Chrome et Firefox, WebM (VP9) en secours pour les Chromium sans codecs
 * propriétaires. Le navigateur ne télécharge que la source qu'il sait lire.
 */
export function LoopVideo({ sources, ...rest }: LoopVideoProps) {
  return (
    <video muted playsInline disablePictureInPicture {...rest}>
      {sources.mp4 && <source src={sources.mp4} type="video/mp4" />}
      {sources.webm && <source src={sources.webm} type="video/webm" />}
    </video>
  );
}
