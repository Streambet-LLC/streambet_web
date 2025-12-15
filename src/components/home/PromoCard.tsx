import { Card } from '@/components/ui/card';
import { getImageLink } from '@/utils/helper';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface PromoCardProps {
  name: string;
  description?: string;
  thumbnail: string;
  streamId: string;
  creator?: string | null;
  className?: string;
}

export default function PromoCard({ 
  name, 
  description, 
  thumbnail, 
  streamId, 
  creator,
  className 
}: PromoCardProps) {
  const getThumbnailUrl = (thumbnailPath: string) => {
    if (!thumbnailPath) {
      return '/placeholder.svg';
    }

    // If it's already a full URL (starts with http or https), use it directly
    if (thumbnailPath.startsWith('http')) {
      return thumbnailPath;
    }

    // If it's a storage path from bucket but doesn't have the storage URL prefix
    if (
      thumbnailPath.includes('stream-thumbnails/') &&
      !thumbnailPath.includes(import.meta.env.VITE_SUPABASE_URL)
    ) {
      return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/${thumbnailPath}`;
    }

    return getImageLink(thumbnailPath) || '/placeholder.svg';
  };

  return (
    <Card className={cn(
      "w-full overflow-hidden bg-card-grid-bg border border-card-grid-border",
      className
    )}>
      <div className="relative w-full aspect-[21/9] overflow-hidden" style={{ maxHeight: '300px' }}>
        {/* Promo image */}
        <img 
          src={getThumbnailUrl(thumbnail)}
          alt={name}
          className="w-full h-full object-cover"
        />
        {/* Gradient overlay with text */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
          <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4">
            <h2 className="text-lg md:text-2xl font-bold text-white mb-1 line-clamp-2">
              {name}
            </h2>
            {description && (
              <p className="text-white/90 text-sm md:text-base max-w-3xl">
                {description}
              </p>
            )}
            {creator && (
              <Link
                to={`/${creator}`}
                className="inline-block mt-2 text-sm text-creator-green hover:text-foreground transition-colors"
              >
                {creator}
              </Link>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
