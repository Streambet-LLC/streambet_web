// 

interface KickEmbedProps {
  embedUrl: string;
}

export const KickEmbed = ({ embedUrl }: KickEmbedProps) => {
  const extractChannelName = (url: string) => {
    const cleaned = url
      .replace(/^https?:\/\/(www\.)?/, '')
      .replace('kick.com/embed/', '')
      .replace('kick.com/', '')
      .replace('player.kick.com/', '')
      .split(/[/?#]/)[0];

    return cleaned;
  };

  const channelName = extractChannelName(embedUrl);
  const finalUrl = `https://player.kick.com/${channelName}`;

  return (
    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
      <iframe
        src={finalUrl}
        className="absolute top-0 left-0 w-full h-full"
        frameBorder="0"
        scrolling="no"
        allowFullScreen
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen;"
        referrerPolicy="origin"
        title="Kick.com Stream Player"
      />
    </div>
  );
};
