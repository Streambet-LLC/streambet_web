import { useIsMobile } from '@/hooks/use-mobile';
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarTrigger, useSidebar } from '../ui/sidebar';
import SidebarStreamCard from './SidebarStreamCard';
import { Button } from '../ui/button';
import { motion } from 'framer-motion';
import { SidebarIcon, MoreHorizontal, LayoutGrid, Flame } from 'lucide-react';
import { PikachuIcon, LuffyIcon, JordanIcon } from '../icons/CategoryIcons';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import api from '@/integrations/api/client';
import { BetRoundType, BettingCategory } from '@/enums';
import { useLocation, Link, useSearchParams } from 'react-router-dom';
import { getCategoryLabel } from '@/utils/categoryHelpers';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { useAuthContext } from '@/contexts/AuthContext';
import { Checkbox } from '../ui/checkbox';
import { getImageLink } from '@/utils/helper';
import { PrizeBrand } from '@/types/prize';

type TopStream = {
  id: string;
  streamName: string;
  views: number;
  pfp: string;
  creator: string;
};

interface SidebarBodyProps {
  selectedCategory?: BettingCategory | null;
  setSelectedCategory?: (category: BettingCategory | null) => void;
  selectedBetType?: BetRoundType | null;
  setSelectedBetType?: (type: BetRoundType | null) => void;
}

// Mapping between BettingCategory (used in sidebar UI) and PrizeBrand (used in database)
const CATEGORY_TO_BRAND_MAP: Record<BettingCategory, PrizeBrand> = {
  [BettingCategory.POKEMON_CARDS]: 'pokemon',
  [BettingCategory.ONE_PIECE]: 'one_piece',
  [BettingCategory.SPORTS_CARDS]: 'sports',
  [BettingCategory.OTHER]: 'other',
};

// Reverse mapping for highlighting selected category from URL brand param
const BRAND_TO_CATEGORY_MAP: Record<string, BettingCategory> = {
  pokemon: BettingCategory.POKEMON_CARDS,
  one_piece: BettingCategory.ONE_PIECE,
  sports: BettingCategory.SPORTS_CARDS,
  other: BettingCategory.OTHER,
};

const CategoryIconContainer = ({
  icon: Icon,
  isSelected,
  compact = false,
}: {
  icon: React.ElementType;
  isSelected: boolean;
  compact?: boolean;
}) => (
  <div
    className={cn(
      'h-7 w-7 rounded-full border border-primary flex items-center justify-center',
      !compact && 'flex-shrink-0',
      isSelected ? 'bg-black border-black' : 'bg-primary/20 border-primary'
    )}
  >
    <Icon className="h-4 w-4 text-primary" />
  </div>
);

export default function SidebarBody({ selectedCategory, setSelectedCategory }: SidebarBodyProps) {
  const controls = useSidebar();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isPredictionsPage = location.pathname === '/predictions';
  const isShopPage =
    location.pathname === '/' ||
    location.pathname.startsWith('/shop') ||
    location.pathname === '/redemptions';
  const showMarkets = isPredictionsPage || isShopPage;
  const { session } = useAuthContext();

  // Extract the current shop username from /shop/:username
  const shopMatch = location.pathname.match(/^\/shop\/([^/]+)$/);
  const currentShopUsername = shopMatch ? shopMatch[1].toLowerCase() : null;

  // Get current brands from URL params (for shop pages) - supports comma-separated values
  const currentBrandParam = searchParams.get('brand');
  const selectedBrands = currentBrandParam ? currentBrandParam.split(',') : [];

  // Handle category/brand click (toggles brand selection for shop pages)
  const handleCategoryClick = (category: BettingCategory | null) => {
    if (isShopPage) {
      // Update URL params for shop pages
      const newParams = new URLSearchParams(searchParams);
      if (category === null) {
        // "All" button - clear all brand selections
        newParams.delete('brand');
      } else {
        // Map BettingCategory to PrizeBrand for database filtering
        const brandValue = CATEGORY_TO_BRAND_MAP[category];

        // Toggle brand in/out of selection
        const brandIndex = selectedBrands.indexOf(brandValue);
        let updatedBrands: string[];

        if (brandIndex > -1) {
          // Brand is selected, remove it
          updatedBrands = selectedBrands.filter(b => b !== brandValue);
        } else {
          // Brand is not selected, add it
          updatedBrands = [...selectedBrands, brandValue];
        }

        // Update URL param
        if (updatedBrands.length > 0) {
          newParams.set('brand', updatedBrands.join(','));
        } else {
          // If no brands selected, remove param
          newParams.delete('brand');
        }
      }
      setSearchParams(newParams);
    } else {
      // Use existing state setter for homepage
      setSelectedCategory?.(category);
    }
  };

  // Determine if a category is selected
  const isCategorySelected = (category: BettingCategory | null) => {
    if (isShopPage) {
      if (category === null) {
        // "All" is selected when no brands are active
        return selectedBrands.length === 0;
      }
      // Check if this category's brand is in the selected brands array
      const brandValue = CATEGORY_TO_BRAND_MAP[category];
      return selectedBrands.includes(brandValue);
    }
    return selectedCategory === category;
  };

  const { data } = useQuery({
    queryKey: ['homepage-live-creators'],
    queryFn: async () => {
      const response = await api.userStream.getTopLiveStreams();

      return response.data as TopStream[];
    },
  });

  const { data: sellerShops = [] } = useQuery({
    queryKey: ['seller-shops-sidebar'],
    queryFn: async () => {
      return api.prize.getSellerShops(5);
    },
    staleTime: 5 * 60 * 1000,
  });

  const shops = sellerShops.map(shop => ({
    id: shop.id,
    name: shop.displayName,
    username: shop.username,
    profileImageUrl: shop.profileImageUrl,
    isClickable: true,
  }));

  // Sort shops so the currently-viewed shop appears first
  const sortedShops = currentShopUsername
    ? [...shops].sort((a, b) => {
        const aIsCurrent = a.username.toLowerCase() === currentShopUsername ? -1 : 0;
        const bIsCurrent = b.username.toLowerCase() === currentShopUsername ? -1 : 0;
        return aIsCurrent - bIsCurrent;
      })
    : shops;

  // Icon options for each category
  const getCategoryIcon = (category: BettingCategory) => {
    const iconMap = {
      [BettingCategory.POKEMON_CARDS]: PikachuIcon,
      [BettingCategory.ONE_PIECE]: LuffyIcon,
      [BettingCategory.SPORTS_CARDS]: JordanIcon,
      // HOTFIX: Temporarily removed from UI - backend still supports this
      // [BettingCategory.EMERGING_SPORTS]: SwordsIcon,
      [BettingCategory.OTHER]: MoreHorizontal,
    };
    return iconMap[category];
  };

  return (
    <Sidebar
      collapsible="none"
      className={cn(
        'top-16 py-2 !transition-none bg-background flex flex-col',
        controls.open ? 'w-60' : 'w-fit',
        controls.isMobile && 'max-w-[50px]'
      )}
    >
      <SidebarContent>
        <SidebarGroup className="flex flex-col gap-2 overflow-auto flex-1">
          <div className="flex justify-between items-center md:mb-2">
            {controls.open && !controls.isMobile && (
              <div className="flex items-center gap-1.5 pl-2">
                <Flame className="h-4 w-4 text-live-hot" />
                <span className="text-sm font-semibold">Live Now</span>
              </div>
            )}
            {!controls.isMobile ? (
              <Button variant="ghost" onClick={controls.toggleSidebar} className="w-8 h-8">
                <SidebarIcon />
              </Button>
            ) : (
              <div className="flex flex-col items-center mx-auto">
                <Flame className="h-4 w-4 text-live-hot" />
                <div className="text-[8px] text-muted-foreground font-bold">LIVE</div>
              </div>
            )}
          </div>
          {data?.map((stream, i) => (
            <SidebarStreamCard
              key={i}
              pfp={stream.pfp}
              viewerCount={stream.views}
              streamName={stream.streamName}
              streamId={stream.id}
              creator={stream.creator}
              compact={!controls.open || controls.isMobile}
            />
          ))}

          {showMarkets && (
            <>
              {/* Categories Section */}
              <div className="border-t border-border my-2" />
              {controls.open && !controls.isMobile && (
                <div className="text-sm font-semibold pl-2 mb-2" id="sidebar-categories-label">
                  {isShopPage ? 'Card Type' : 'Markets'}
                </div>
              )}
              <div
                className="flex flex-col gap-2"
                role="navigation"
                aria-label={isShopPage ? 'Pick brands' : 'Pick markets'}
                aria-labelledby={
                  controls.open && !controls.isMobile ? 'sidebar-categories-label' : undefined
                }
              >
                <Button
                  onClick={() => handleCategoryClick(null)}
                  className={cn(
                    'h-auto overflow-visible transition-all cursor-pointer',
                    controls.open && !controls.isMobile
                      ? 'justify-start p-2.5 rounded-[8px] bg-sidebar-card-bg/50 border border-primary hover:bg-primary/5'
                      : 'justify-center items-center px-1 py-1 rounded-md hover:bg-sidebar-compact-hover',
                    isCategorySelected(null)
                      ? '!bg-primary !text-black hover:!bg-primary !border-primary'
                      : 'text-white bg-transparent border-primary/50 hover:border-primary'
                  )}
                  aria-pressed={isCategorySelected(null)}
                  aria-label={isShopPage ? 'Show all brands' : 'Show all markets'}
                >
                  <motion.div
                    className="w-full"
                    whileHover={controls.open && !controls.isMobile ? { x: 4 } : {}}
                  >
                    {controls.open && !controls.isMobile ? (
                      <div className="flex items-center gap-2.5 w-full">
                        <CategoryIconContainer
                          icon={LayoutGrid}
                          isSelected={isCategorySelected(null)}
                        />
                        <span className="text-[13px] font-semibold">All</span>
                      </div>
                    ) : (
                      <CategoryIconContainer
                        icon={LayoutGrid}
                        isSelected={isCategorySelected(null)}
                        compact
                      />
                    )}
                  </motion.div>
                </Button>
                {Object.values(BettingCategory).map(category => {
                  const IconComponent = getCategoryIcon(category);
                  const isSelected = isCategorySelected(category);
                  return (
                    <Button
                      key={category}
                      onClick={() => handleCategoryClick(category)}
                      className={cn(
                        'h-auto overflow-visible transition-all cursor-pointer',
                        controls.open && !controls.isMobile
                          ? 'justify-start text-left p-2.5 rounded-[8px] bg-sidebar-card-bg/50 border border-primary hover:bg-primary/5'
                          : 'justify-center items-center px-1 py-1 rounded-md hover:bg-sidebar-compact-hover',
                        isSelected
                          ? '!bg-primary !text-black hover:!bg-primary !border-primary'
                          : 'text-white bg-transparent border-primary/50 hover:border-primary'
                      )}
                      aria-pressed={isSelected}
                      aria-label={`Filter by ${getCategoryLabel(category)}`}
                    >
                      <motion.div
                        className="w-full"
                        whileHover={controls.open && !controls.isMobile ? { x: 4 } : {}}
                      >
                        {controls.open && !controls.isMobile ? (
                          <div className="flex items-center gap-2.5 w-full">
                            <CategoryIconContainer icon={IconComponent} isSelected={isSelected} />
                            <span className="text-[13px] font-semibold">
                              {getCategoryLabel(category)}
                            </span>
                            {isShopPage && (
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => handleCategoryClick(category)}
                                onClick={e => e.stopPropagation()}
                                className="ml-auto"
                              />
                            )}
                          </div>
                        ) : (
                          <CategoryIconContainer
                            icon={IconComponent}
                            isSelected={isSelected}
                            compact
                          />
                        )}
                      </motion.div>
                    </Button>
                  );
                })}{' '}
              </div>
            </>
          )}
        </SidebarGroup>
      </SidebarContent>

      {/* Footer Section - Shops on shop pages, Creators on predictions page */}
      <SidebarFooter className="border-t border-border">
        {isPredictionsPage ? (
          // Creators section for predictions page
          <>
            {controls.open && !controls.isMobile && (
              <div className="flex items-center justify-between" id="sidebar-creators-label">
                <div className="text-sm font-semibold">Creators</div>
                <Link
                  to="/creators"
                  className="text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                >
                  See All
                </Link>
              </div>
            )}
            <div
              className="flex flex-col gap-2"
              role="navigation"
              aria-label="Live creators"
              aria-labelledby={
                controls.open && !controls.isMobile ? 'sidebar-creators-label' : undefined
              }
            >
              {data?.slice(0, 5).map(stream => {
                const commonClassName = cn(
                  'h-auto overflow-visible transition-all cursor-pointer no-underline',
                  controls.open && !controls.isMobile
                    ? 'p-2.5 rounded-[8px] bg-sidebar-card-bg/50 border border-primary/50 hover:bg-primary/5 hover:border-primary flex items-center gap-2.5'
                    : 'px-1 py-1 rounded-md hover:bg-sidebar-compact-hover flex justify-center'
                );

                return (
                  <Link key={stream.id} to={`/${stream.creator}`} className={commonClassName}>
                    <Avatar
                      className={cn(
                        controls.open && !controls.isMobile ? 'h-8 w-8' : 'h-7 w-7',
                        'flex-shrink-0'
                      )}
                    >
                      <AvatarImage
                        src={stream.pfp ? getImageLink(stream.pfp) : undefined}
                        alt={stream.creator}
                      />
                      <AvatarFallback className="bg-primary text-black font-semibold text-xs">
                        {stream.creator?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {controls.open && !controls.isMobile && (
                      <span className="text-[13px] font-semibold text-primary truncate">
                        {stream.creator}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </>
        ) : (
          // Shops section for shop/home pages
          <>
            {controls.open && !controls.isMobile && (
              <div className="flex items-center justify-between" id="sidebar-shops-label">
                <div className="text-sm font-semibold">Shops</div>
                <Link
                  to="/shops"
                  className="text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                >
                  See All
                </Link>
              </div>
            )}
            <div
              className="flex flex-col gap-2"
              role="navigation"
              aria-label="Featured shops"
              aria-labelledby={
                controls.open && !controls.isMobile ? 'sidebar-shops-label' : undefined
              }
            >
              {sortedShops.map(shop => {
                const isActiveShop = currentShopUsername === shop.username.toLowerCase();
                const commonClassName = cn(
                  'h-auto overflow-visible transition-all cursor-pointer no-underline',
                  controls.open && !controls.isMobile
                    ? cn(
                        'p-2.5 rounded-[8px] flex items-center gap-2.5',
                        isActiveShop
                          ? 'bg-primary/15 border border-primary hover:bg-primary/20'
                          : 'bg-sidebar-card-bg/50 border border-primary/50 hover:bg-primary/5 hover:border-primary'
                      )
                    : cn(
                        'px-1 py-1 rounded-md flex justify-center',
                        isActiveShop
                          ? 'bg-primary/15 ring-1 ring-primary'
                          : 'hover:bg-sidebar-compact-hover'
                      )
                );

                const shopContent = (
                  <>
                    <Avatar
                      className={cn(
                        controls.open && !controls.isMobile ? 'h-8 w-8' : 'h-7 w-7',
                        'flex-shrink-0'
                      )}
                    >
                      <AvatarImage
                        src={shop.profileImageUrl ? getImageLink(shop.profileImageUrl) : undefined}
                        alt={shop.name}
                      />
                      <AvatarFallback className="bg-primary text-black font-semibold text-xs">
                        {shop.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {controls.open && !controls.isMobile && (
                      <span className="text-[13px] font-semibold text-primary truncate">
                        {shop.name}
                      </span>
                    )}
                  </>
                );

                return shop.isClickable ? (
                  <Link key={shop.id} to={`/shop/${shop.username}`} className={commonClassName}>
                    {shopContent}
                  </Link>
                ) : (
                  <div key={shop.id} className={commonClassName}>
                    {shopContent}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
