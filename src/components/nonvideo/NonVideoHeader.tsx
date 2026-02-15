import { Card } from '@/components/ui/card';
import { getImageLink } from '@/utils/helper';
import { Link } from 'react-router-dom';
import { LinkifiedText } from '@/components/LinkifiedText';

interface NonVideoHeaderProps {
  nonVideo: {
    name: string;
    description?: string;
    thumbnailUrl?: string;
    creatorUsername?: string;
  } | null;
  roundTitle?: string;
}

export const NonVideoHeader = ({ nonVideo, roundTitle }: NonVideoHeaderProps) => {
  if (!nonVideo) return null;

  return (
    <Card className="p-4 bg-card-grid-bg border-card-grid-border">
      <div className="flex gap-4">
        {/* Thumbnail */}
        {nonVideo.thumbnailUrl && (
          <div className="flex-shrink-0">
            <img 
              src={getImageLink(nonVideo.thumbnailUrl)} 
              alt={roundTitle || nonVideo.name}
              className="w-32 h-24 rounded-lg object-contain bg-muted"
            />
          </div>
        )}
        {/* Text Content */}
        <div className="flex-1 flex flex-col gap-2">
          <h1 className="text-2xl font-bold">{roundTitle || nonVideo.name}</h1>
          {nonVideo.description && (
            <p className="text-sm text-muted-foreground">
              <span className="[&>a]:text-primary [&>a]:underline [&>a]:hover:text-primary/80 [&>a]:transition-colors">
                <LinkifiedText>
                  {nonVideo.description}
                </LinkifiedText>
              </span>
            </p>
          )}
          {nonVideo.creatorUsername && (
            <Link
              to={`/${nonVideo.creatorUsername}`}
              className="text-sm text-creator-green hover:text-foreground transition-colors"
            >
              {nonVideo.creatorUsername}
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
};
