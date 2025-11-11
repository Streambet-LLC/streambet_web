import { FaInstagram, FaTiktok, FaTwitch, FaYoutube } from 'react-icons/fa';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { userAPI } from '@/integrations/api/client';
import { MainLayout } from '@/components/layout';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { formatUrl } from '@/utils/format';
import NotFound from '@/pages/NotFound';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import ProfileLiveUpcomingStreams from './ProfileLiveUpcomingStreams';
import { getImageLink } from '@/utils/helper';
import ProfilePastStreams from './ProfilePastStreams';
import { Footer } from '../Footer';

const socialsMapping = {
  instagram: {
    icon: <FaInstagram className='w-4 h-4' />,
    label: "Instagram",
  },
  twitch: {
    icon: <FaTwitch className='w-4 h-4' />,
    label: "Twitch",
  },
  kick: {
    icon: <img src="/icons/kick-icon.png" alt="kick" className="w-4 h-4 mr-[2px]" />,
    label: "Kick",
  },
  youtube: {
    icon: <FaYoutube className='w-4 h-4' />,
    label: "Youtube",
  },
  tiktok: {
    icon: <FaTiktok className='w-4 h-4' />,
    label: "TikTok",
  }
};

export default function Profile() {
  const { username } = useParams();
  const socialsOrder = Object.keys(socialsMapping);

  if (!username) return <NotFound />;

  const {
    data: profile,
    isFetching,
  } = useQuery<{
    id: string;
    username: string;
    accountCreationDate: Date;
    profileImageUrl: string;
    isCreator: boolean;
    socials: { [social: string]: string }
  }>({
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
    }
  });

  return (
    !isFetching &&
      <>
        {!profile ? 
          <NotFound /> :
          <MainLayout>
            <div className="flex flex-col gap-4 min-h-[calc(100vh-128px)]">
              <div className={cn("flex flex-col gap-4", !profile.isCreator && "max-w-[584px] mx-auto")}>
                <div className="flex gap-6">
                  <Avatar className="h-28 w-28">
                    <AvatarImage src={getImageLink(profile.profileImageUrl)} alt={username} />
                    <AvatarFallback>
                      {username[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex relative flex-col">
                    <div className="text-lg font-semibold text-white">{username}</div>
                    <div className="text-xs text-gray-400">Date joined: {format(profile.accountCreationDate.toString(), "MMMM d, yyy")}</div>
                    {profile.isCreator && profile.socials && 
                      <div className='flex flex-col mt-3 gap-1'>
                        {socialsOrder.map((social) => {
                          const profileSocial = profile.socials[social];
                          
                          if (!profileSocial) return null;

                          const isJoshCapoInstagram = 
                            social === 'instagram' && 
                            username === 'joshcapopashot' && 
                            profileSocial === 'https://www.instagram.com/joshcapopashot?igsh=eWtsb2p4ZWxqZ3Jk&utm_source=qr';

                          return (
                            <div key={social} className='flex gap-1 text-white items-center text-sm'>
                              {socialsMapping[social].icon}
                              {" "}
                              <a
                                href={formatUrl(profileSocial)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-foreground transition-colors"
                                title={social}
                              >
                                {profileSocial}
                              </a>
                              {isJoshCapoInstagram && <span className="text-muted-foreground"> &lt;-- Live Here</span>}
                            </div>
                          )
                        })}
                      </div>
                    }
                  </div>
                </div>
              </div>
              {profile.isCreator &&
                <div className='flex flex-col gap-12 mt-6 font-semibold pb-32'>
                  <ProfileLiveUpcomingStreams username={username} />
                  <ProfilePastStreams username={username} />
                </div>
              }
              {!profile.isCreator && 
                <div className='mt-auto'>
                  <Footer />
                </div>
              }
            </div>
          </MainLayout>
        }
      </>
  );
};