interface KickEmbedProps {
  embedUrl: string;
}

export const KickEmbed = ({ embedUrl }: KickEmbedProps) => {
  // Format the URL for proper embedding according to Kick's requirements
  const getFormattedUrl = () => {
    // Start with a clean URL
    let url = embedUrl.trim();

    // Remove any protocol prefixes if they exist
    url = url.replace(/^(https?:\/\/)?(www\.)?/i, '');

    // Extract the channel name regardless of format
    let channelName = url;

    if (url.includes('kick.com/embed/')) {
      channelName = url.replace('kick.com/embed/', '');
    } else if (url.includes('kick.com/')) {
      channelName = url.replace('kick.com/', '');
    } else if (url.includes('player.kick.com/')) {
      channelName = url.replace('player.kick.com/', '');
    }

    // Clean the channel name (remove any trailing slashes or query params)
    channelName = channelName.split('/')[0].split('?')[0];

    // According to the latest Kick documentation, use the iframe embed format
    // Make sure we don't prepend "player." again if the channelName already contains it
    channelName = channelName.replace(/^player\./, '');

    const finalUrl = `https://player.kick.com/${channelName}?autoplay=true`;

    return finalUrl;
  };

  return (
    <div className="relative w-full h-full">
      <iframe
        src={getFormattedUrl()}
        className="absolute top-0 left-0 w-full h-full"
        frameBorder="0"
        scrolling="no"
        allowFullScreen
        allow="autoplay; encrypted-media; picture-in-picture"
        referrerPolicy="origin"
        title="Kick.com Stream Player"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
        }}
      />
    </div>
  );
};
