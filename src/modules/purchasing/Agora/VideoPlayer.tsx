/*
 * VideoPlayer — dispatcher di rendering in base al provider del video.
 *
 * NB: il componente viene montato solo *dopo* il click sul poster, quindi
 *     non avvia richieste di rete a YouTube/Vimeo prima dell'intenzione
 *     esplicita di guardare il video.
 */

import { parseVimeoId, parseYouTubeId, type Video } from './context/VideosContext';
import './VideoPlayer.css';

interface VideoPlayerProps {
  video: Video;
  /** Avvia in autoplay (default true: chiamato dopo un'azione utente esplicita). */
  autoPlay?: boolean;
}

export function VideoPlayer({ video, autoPlay = true }: VideoPlayerProps) {
  if (!video.source) {
    return (
      <div className="video-player video-player--missing" role="status">
        Video non ancora configurato.
      </div>
    );
  }

  if (video.provider === 'youtube') {
    const id = parseYouTubeId(video.source);
    const params = new URLSearchParams({
      autoplay: autoPlay ? '1' : '0',
      rel: '0',
      modestbranding: '1',
      playsinline: '1',
    });
    return (
      <iframe
        className="video-player video-player--iframe"
        src={`https://www.youtube.com/embed/${id}?${params.toString()}`}
        title={video.title}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    );
  }

  if (video.provider === 'vimeo') {
    const id = parseVimeoId(video.source);
    const params = new URLSearchParams({
      autoplay: autoPlay ? '1' : '0',
      title: '0',
      byline: '0',
      portrait: '0',
    });
    return (
      <iframe
        className="video-player video-player--iframe"
        src={`https://player.vimeo.com/video/${id}?${params.toString()}`}
        title={video.title}
        loading="lazy"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
      />
    );
  }

  // Provider 'url' — MP4 / WebM / HLS via <video>
  return (
    /* eslint-disable-next-line jsx-a11y/media-has-caption */
    <video
      className="video-player video-player--native"
      src={video.source}
      poster={video.poster}
      controls
      autoPlay={autoPlay}
      preload="metadata"
      playsInline
    />
  );
}
