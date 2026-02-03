import { Card } from '@/components/ui/card';
import { getThumbnailUrl } from '@/utils/helper';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { LinkifiedText } from '../LinkifiedText';

interface PromoCardProps {
  name: string;
  description?: string;
  thumbnail: string;
  creator?: string | null;
  className?: string;
}

export default function PromoCard({ 
  name, 
  description, 
  thumbnail, 
  creator,
  className 
}: PromoCardProps) {
  const isMobile = useIsMobile();

  return (
    <Card className={cn(
      "overflow-hidden bg-card-grid-bg border border-primary/50 w-full",
      className
    )}>
      <div 
        className={cn(
          "relative w-full overflow-hidden",
          isMobile ? "min-h-[200px]" : "aspect-[32/9] lg:aspect-[48/9] min-h-[150px]"
        )}
      >
        {/* Promo image */}
        <img 
          src={getThumbnailUrl(thumbnail)}
          alt={name}
          className="w-full h-full object-contain bg-black"
        />
        {/* Gradient overlay with text */}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-t to-transparent",
          isMobile ? "from-black/95 via-black/60" : "from-black/90 via-black/50"
        )}>
          <div className={cn(
            "absolute bottom-0 left-0 right-0",
            isMobile ? "p-2" : "p-3"
          )}>
            <h2 className={cn(
              "font-bold text-white mb-1",
              isMobile ? "text-base" : "text-xl line-clamp-1"
            )}>
              <span className="[&>a]:text-primary [&>a]:underline [&>a]:hover:text-primary/80 [&>a]:transition-colors">
                <LinkifiedText>
                  {name}
                </LinkifiedText>
              </span>
            </h2>
            {description && (
              <p className={cn(
                "text-white/90 max-w-3xl",
                isMobile ? "text-xs" : "text-sm"
              )}>
                <span className="[&>a]:text-primary [&>a]:underline [&>a]:hover:text-primary/80 [&>a]:transition-colors">
                  <LinkifiedText>
                    {description}
                  </LinkifiedText>
                </span>
              </p>
            )}
            {creator && (
              <Link
                to={`/${creator}`}
                className={cn(
                  "inline-block text-xs text-creator-green hover:text-foreground transition-colors",
                  isMobile ? "mt-1" : "mt-1.5"
                )}
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
