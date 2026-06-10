import { useEffect, useMemo, useRef } from 'react';

const extractVideoData = (url) => {
  if (!url) return { videoId: '', startSeconds: 0 };

  // If the URL is already just an ID (11 characters)
  if (url.length === 11 && !url.includes('/') && !url.includes('?')) {
    return { videoId: url, startSeconds: 0 };
  }

  let videoId = '';
  let startSeconds = 0;

  if (url.includes('v=')) {
    videoId = url.split('v=')[1].split('&')[0];
  } else if (url.includes('youtu.be/')) {
    videoId = url.split('youtu.be/')[1].split('?')[0];
  }

  if (url.includes('t=')) {
    const raw = url.split('t=')[1].split('&')[0].replace('s', '');
    startSeconds = Number.parseInt(raw, 10) || 0;
  }

  return { videoId, startSeconds };
};

const isYouTubeUrl = (url = '') => {
  if (!url) return false;
  const value = String(url).trim();

  return (
    value.length === 11 && !value.includes('/') && !value.includes('?')
  ) || value.includes('youtube.com') || value.includes('youtu.be/');
};

const loadYouTubeApi = () =>
  new Promise((resolve) => {
    if (window.YT?.Player) {
      resolve(window.YT);
      return;
    }

    const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    if (!existing) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(script);
    }

    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previous === 'function') previous();
      resolve(window.YT);
    };
  });

const YouTubeLessonPlayer = ({ videoUrl, title, onComplete }) => {
  const containerRef = useRef(null);
  const { videoId, startSeconds } = useMemo(() => extractVideoData(videoUrl), [videoUrl]);
  const isYouTubeVideo = useMemo(() => isYouTubeUrl(videoUrl), [videoUrl]);

  useEffect(() => {
    if (!isYouTubeVideo) return undefined;

    let mounted = true;
    let player = null;

    const mountPlayer = async () => {
      const YT = await loadYouTubeApi();
      if (!mounted || !containerRef.current || !videoId) return;

      containerRef.current.innerHTML = '';

      player = new YT.Player(containerRef.current, {
        videoId,
        playerVars: {
          start: startSeconds,
          rel: 0,
          origin: window.location.origin,
          enablejsapi: 1,
          modestbranding: 1,
          widget_referrer: window.location.origin,
        },
        events: {
          onStateChange: (event) => {
            if (event.data === window.YT.PlayerState.ENDED) {
              onComplete?.();
            }
          },
        },
      });
    };

    mountPlayer();

    return () => {
      mounted = false;
      if (player?.destroy) player.destroy();
    };
  }, [isYouTubeVideo, videoId, startSeconds, onComplete]);

  if (!videoUrl) {
    return (
      <div className="video-frame-shell">
        <div className="video-empty-state">
          <strong>No video source added</strong>
          <span>Add a YouTube link or upload a video from the lesson editor.</span>
        </div>
      </div>
    );
  }

  if (!isYouTubeVideo) {
    return (
      <div className="video-frame-shell">
        <video
          key={videoUrl}
          className="video-frame lesson-native-video"
          src={videoUrl}
          title={title}
          controls
          controlsList="nodownload"
          playsInline
          onEnded={() => onComplete?.()}
        >
          Your browser does not support the video tag.
        </video>
      </div>
    );
  }

  return (
    <div className="video-frame-shell">
      <div ref={containerRef} className="video-frame" aria-label={title} />
    </div>
  );
};

export default YouTubeLessonPlayer;
