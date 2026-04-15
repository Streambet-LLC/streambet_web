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
import { Store } from 'lucide-react';
import { getImageLink } from '@/utils/helper';
import { Footer } from '../Footer';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '../ui/button';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { PublicUserProfile } from '@/types/profile';
import ProfilePrizeProgress from './ProfilePrizeProgress';
import { getBadgeRingColor, getPrizeColor } from '@/utils/prizeColors';
import { ProBadge } from '@/components/pro/ProBadge';
import ProfileSellerItems from './ProfileSellerItems';
import ProfileRecentPurchases from './ProfileRecentPurchases';

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

  if (!username) return <NotFound />;

  const { data: profile, isFetching } = useQuery<PublicUserProfile>({
    queryKey: ['profile', { username }],
    queryFn: async () => {
      try {
        const response = await userAPI.getUserProfile(username);
        return response?.data;
      } catch (error) {
        if (error && error.response && error.response.status === 404) {
          return undefined;
        }
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
                <div className="flex flex-col md:flex-row gap-6 justify-between">
                  <div className="flex gap-6">
                    <div className="relative">
                      <Avatar
                        className={cn(
                          'h-28 w-28 transition-all',
                          profile.badgeLevel !== 'none' &&
                            `ring-4 ${getBadgeRingColor(profile.badgeLevel)} shadow-lg`
                        )}
                      >
                        <AvatarImage src={getImageLink(profile.profileImageUrl)} alt={username} />
                        <AvatarFallback>{username[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      {profile.isCreator && profile.badgeLevel !== 'none' && (
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
                    <div className="flex relative flex-col">
                      <div className="flex gap-2 items-center">
                        <div className="text-lg font-semibold text-white">{username}</div>
                        {profile.isProSubscriber && <ProBadge size="md" />}
                      </div>
                      <div className="text-xs text-gray-400 mt-2">
                        Date joined: {format(profile.accountCreationDate.toString(), 'MMMM d, yyy')}
                      </div>
                      {!profile.isCreator && profile.badgeLevel !== 'none' && (
                        <div
                          className={cn(
                            'mt-2 px-3 py-1.5 rounded-full text-xs font-bold w-fit',
                            'bg-background border-2',
                            getPrizeColor(parseInt(profile.badgeLevel, 10), 'border'),
                            getPrizeColor(parseInt(profile.badgeLevel, 10), 'text')
                          )}
                        >
                          {profile.title}
                        </div>
                      )}
                      {profile.isCreator && profile.socials && (
                        <div className="flex flex-col mt-3 gap-1">
                          <p className="text-xs text-gray-100">
                            {profile.followers} Follower{profile.followers > 1 && 's'}
                          </p>
                          {session && (
                            <Button variant="outline" size="sm" onClick={handleFollow}>
                              {isFollowed ? 'Unfollow' : 'Follow'}
                            </Button>
                          )}
                          {profile.isSeller && typeof profile.listedItemCount === 'number' && (
                            <Link
                              to={`/shop/${profile.username}`}
                              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
                            >
                              <Store className="w-3.5 h-3.5" />
                              {profile.listedItemCount}{' '}
                              {profile.listedItemCount === 1 ? 'item' : 'items'} listed
                            </Link>
                          )}
                          {socialsOrder.map(social => {
                            const profileSocial = profile.socials[social];

                            if (!profileSocial) return null;

                            const isJoshCapoInstagram =
                              social === 'instagram' &&
                              username === 'joshcapopashot' &&
                              profileSocial ===
                                'https://www.instagram.com/joshcapopashot?igsh=eWtsb2p4ZWxqZ3Jk&utm_source=qr';

                            return (
                              <div
                                key={social}
                                className="flex gap-1 text-white items-center text-sm"
                              >
                                {socialsMapping[social].icon}{' '}
                                <a
                                  href={formatUrl(profileSocial)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-muted-foreground hover:text-foreground transition-colors"
                                  title={social}
                                >
                                  {socialsMapping[social].label}
                                </a>
                                {isJoshCapoInstagram && (
                                  <span className="text-muted-foreground"> &lt;-- Live Here</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {!profile.isCreator &&
                        profile.isSeller &&
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
                  {session?.isCreator && profile.username === session?.username && (
                    <Link to="/creator?createStream=true">
                      <button
                        type="button"
                        className="ml-auto self-end bg-primary text-black text-sm font-bold px-4 py-2 rounded-full hover:bg-opacity-90 transition-colors h-fit w-full md:w-fit"
                      >
                        Create Pick
                      </button>
                    </Link>
                  )}
                </div>

                {/* Prize Progress Section - Shows for all users */}
                <div className="mt-6">
                  <ProfilePrizeProgress
                    currentCadeCoins={profile.currentCadeCoins}
                    lifetimeCadeCoins={profile.lifetimeCadeCoins}
                  />
                </div>
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
