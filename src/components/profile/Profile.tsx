import { FaInstagram, FaTiktok, FaTwitch, FaYoutube } from 'react-icons/fa';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { userAPI } from '@/integrations/api/client';
import { MainLayout } from '@/components/layout';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { formatUrl } from '@/utils/format';
import NotFound from '@/pages/NotFound';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Store, Edit2 } from 'lucide-react';
import { getImageLink } from '@/utils/helper';
import { Footer } from '../Footer';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '../ui/button';
import RatingSummary from '@/components/reviews/RatingSummary';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { PublicUserProfile } from '@/types/profile';
import { getBadgeRingColor, getPrizeColor } from '@/utils/prizeColors';
import { ProBadge } from '@/components/pro/ProBadge';
import ProfileSellerItems from './ProfileSellerItems';
import ProfileRecentPurchases from './ProfileRecentPurchases';
import ProfileEdit from './ProfileEdit';
import { COLLECTION_CATEGORIES } from '@/constants/collectionCategories';

const socialsMapping = {
  instagram: {
    icon: <FaInstagram className="w-4 h-4" />,
    label: 'Instagram',
  },
  twitch: {
    icon: <FaTwitch className="w-4 h-4" />,
    label: 'Twitch',
  },
  kick: {
    icon: <img src="/icons/kick-icon.png" alt="kick" className="w-4 h-4 mr-[2px]" />,
    label: 'Kick',
  },
  youtube: {
    icon: <FaYoutube className="w-4 h-4" />,
    label: 'Youtube',
  },
  tiktok: {
    icon: <FaTiktok className="w-4 h-4" />,
    label: 'TikTok',
  },
};

export default function Profile() {
  const { username } = useParams();
  const { session } = useAuthContext();
  const { toast } = useToast();

  const socialsOrder = Object.keys(socialsMapping);
  const [isEditing, setIsEditing] = useState(false);

  if (!username) return <NotFound />;

  const {
    data: profile,
    isFetching,
    refetch,
  } = useQuery<PublicUserProfile>({
    queryKey: ['profile', { username }],
    queryFn: async () => {
      try {
        const response = await userAPI.getUserProfile(username);
        return response?.data;
      } catch (error) {
        if (error && error.response && error.response.status === 404) {
          return null;
        }
        throw error;
      }
    },
  });

  const [isFollowed, setisFollowed] = useState(false);

  const handleFollow = async () => {
    if (isFollowed) {
      await userAPI.unfollowUser(username);

      toast({
        title: 'Success',
        description: `Successfully unfollowed ${username}`,
        variant: 'default',
      });
    } else {
      await userAPI.followUser(username);

      toast({
        title: 'Success',
        description: `Successfully followed ${username}`,
        variant: 'default',
      });
    }

    setisFollowed(!isFollowed);
  };

  useEffect(() => {
    if (profile && profile.isFollowed) {
      setisFollowed(true);
    }
  }, [profile]);

  return (
    !isFetching && (
      <>
        {!profile ? (
          <NotFound />
        ) : (
          <MainLayout showFooter>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row gap-6 md:items-start justify-between">
                  {/* Left: Avatar + Identity */}
                  <div className="flex gap-6 shrink-0">
                    <div className="relative shrink-0">
                      <Avatar
                        className={cn(
                          'h-28 w-28 transition-all',
                          profile.badgeLevel && profile.badgeLevel !== 'none' &&
                            `ring-4 ${getBadgeRingColor(profile.badgeLevel)} shadow-lg`
                        )}
                      >
                        <AvatarImage src={getImageLink(profile.profileImageUrl)} alt={username} />
                        <AvatarFallback>{username[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      {profile.badgeLevel && profile.badgeLevel !== 'none' && profile.title && (
                        <div
                          className={cn(
                            'absolute -bottom-2 left-1/2 -translate-x-1/2',
                            'px-2 py-1 rounded-full text-xs font-bold',
                            'bg-background border-2',
                            getPrizeColor(parseInt(profile.badgeLevel, 10), 'border'),
                            getPrizeColor(parseInt(profile.badgeLevel, 10), 'text')
                          )}
                        >
                          {profile.title}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col">
                      <div className="flex gap-2 items-center">
                        <div className="text-lg font-semibold text-white">{username}</div>
                        {profile.isProSubscriber && <ProBadge size="md" />}
                      </div>
                      <div className="mt-1">
                        <RatingSummary username={username} side="as_buyer" size="sm" />
                      </div>
                      <div className="text-xs text-gray-400 mt-2">
                        Date joined: {format(profile.accountCreationDate.toString(), 'MMMM d, yyy')}
                      </div>
                      {profile.isSeller &&
                        profile.username &&
                        typeof profile.listedItemCount === 'number' && (
                          <Link
                            to={`/shop/${profile.username}`}
                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mt-3"
                          >
                            <Store className="w-3.5 h-3.5" />
                            {profile.listedItemCount}{' '}
                            {profile.listedItemCount === 1 ? 'item' : 'items'} listed
                          </Link>
                        )}
                    </div>
                  </div>

                  {/* Middle: Collects + Location (stacked) */}
                  {!isEditing &&
                    ((profile.collectionPreferences && profile.collectionPreferences.length > 0) ||
                      profile.city ||
                      profile.state ||
                      profile.country) && (
                      <div className="flex flex-col gap-3 flex-1 min-w-0 md:max-w-md">
                        {profile.collectionPreferences &&
                          profile.collectionPreferences.length > 0 && (
                            <div className="p-3 bg-card border border-border rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="h-4 w-1 bg-primary rounded-full" />
                                <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">
                                  Collects
                                </h3>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {profile.collectionPreferences.map(pref => {
                                  const category = COLLECTION_CATEGORIES.find(
                                    c => c.value === pref
                                  );
                                  return (
                                    <span
                                      key={pref}
                                      className="px-2.5 py-0.5 bg-primary/10 border border-primary/40 text-foreground text-xs font-semibold rounded-full"
                                    >
                                      {category?.label || pref}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        {(profile.city || profile.state || profile.country) && (
                          <div className="p-3 bg-card border border-border rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="h-4 w-1 bg-primary rounded-full" />
                              <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">
                                Location
                              </h3>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {[profile.city, profile.state, profile.country]
                                .filter(Boolean)
                                .join(', ')}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                  {/* Right: Edit Button */}
                  {profile.username === session?.username && (
                    <div className="flex md:flex-col items-start md:items-end gap-2 shrink-0">
                      <Button
                        onClick={() => setIsEditing(!isEditing)}
                        variant={isEditing ? 'outline' : 'default'}
                        size="sm"
                        className={
                          isEditing
                            ? 'gap-2'
                            : 'gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold'
                        }
                      >
                        <Edit2 className="w-4 h-4" />
                        {isEditing ? 'Cancel' : 'Edit Profile'}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Edit Form - Shows when user clicks Edit */}
                {isEditing && profile.username === session?.username && (
                  <div className="mt-6">
                    <ProfileEdit
                      profile={profile}
                      onCancel={() => setIsEditing(false)}
                      onSaveSuccess={() => {
                        setIsEditing(false);
                        refetch();
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Seller Items Section - Shows for sellers with items */}
              {profile.isSeller && (
                <>
                  <div className="border-t border-gray-700 my-6" />
                  <ProfileSellerItems
                    username={username}
                    isOwnProfile={profile.username === session?.username}
                    isProSubscriber={profile.isProSubscriber ?? false}
                  />
                </>
              )}

              {/* Recent Purchases Section - Shows for all users with purchases */}
              <div className="border-t border-gray-700 my-6" />
              <ProfileRecentPurchases username={username} />

              <div className="pb-32" />
            </div>
          </MainLayout>
        )}
      </>
    )
  );
}
