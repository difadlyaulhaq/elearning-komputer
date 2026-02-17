// components/learning/YoutubePlayer.tsx
import React from 'react';

interface YoutubePlayerProps {
  videoId: string;
  className?: string;
}

const YoutubePlayer: React.FC<YoutubePlayerProps> = ({ videoId, className }) => {
  // Construct the embed URL for the YouTube video
  // 'rel=0' prevents showing related videos from other channels once playback ends.
  // 'modestbranding=1' removes the YouTube logo from the control bar.
  // 'showinfo=0' is deprecated, but sometimes still included for older players.
  // 'controls=1' shows player controls.
  // 'autoplay=0' (default) prevents autoplay. If you need autoplay, you'd make this configurable.
  const embedUrl = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&controls=1`;

  return (
    <div className={`relative w-full overflow-hidden ${className || ''}`} style={{ paddingTop: '56.25%' /* 16:9 Aspect Ratio */ }}>
      <iframe
        className="absolute top-0 left-0 w-full h-full"
        src={embedUrl}
        title="YouTube video player"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      ></iframe>
    </div>
  );
};

export default YoutubePlayer;
