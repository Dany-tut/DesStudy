import type { LessonVideo } from '@/lib/curriculum/types';

function youtubeId(url: string): string | null {
  const m = url.match(
    /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{6,})/,
  );
  return m ? m[1] : null;
}

function vimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? m[1] : null;
}

/** Embeds a lesson video — YouTube/Vimeo via privacy-respecting iframe, or a direct file via <video>. */
export function VideoEmbed({ video }: { video: LessonVideo }) {
  const provider =
    video.provider ?? (youtubeId(video.url) ? 'youtube' : vimeoId(video.url) ? 'vimeo' : 'file');

  return (
    <div>
      <div className="aspect-video overflow-hidden rounded-lg border border-border bg-canvas">
        {provider === 'youtube' && youtubeId(video.url) ? (
          <iframe
            className="h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${youtubeId(video.url)}`}
            title={video.caption}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : provider === 'vimeo' && vimeoId(video.url) ? (
          <iframe
            className="h-full w-full"
            src={`https://player.vimeo.com/video/${vimeoId(video.url)}`}
            title={video.caption}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        ) : (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video className="h-full w-full" src={video.url} controls preload="metadata" />
        )}
      </div>
      <p className="mt-2 text-footnote text-tertiary">{video.caption}</p>
    </div>
  );
}
