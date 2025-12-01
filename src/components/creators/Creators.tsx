import api from "@/integrations/api/client";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "../layout";
import { Card, CardHeader } from "../ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { getImageLink } from "@/utils/helper";
import { Link } from "react-router-dom";

export default function Creators() {
  const { data: creators } = useQuery({
      queryKey: [
        'creators', 
      ],
    
      queryFn: async () => {
        const response = await api.user.getCreators();

        return response;
        // const response = await api.userStream.getStreams({
        //   range: `[${1},${6}]`,
        //   sort:  '["scheduledStartTime","ASC"]' ,
        //   filter: JSON.stringify({ q: '' }),
        //   pagination: true,
        // });
        // return response;
      }
      // refetchInterval: 10000, // Refresh more frequently (every 10 seconds)
    });
  return (
    <MainLayout showFooter>
      <div className="flex flex-col gap-4">
        <h2>Our Creators</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {creators?.data?.map((creator, i) => 
            <Card key={i} className="flex flex-col justify-center bg-card border border-border shadow-lg overflow-hidden">
              <CardHeader className="flex flex-row gap-2 p-4 items-center">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={getImageLink(creator.profileImageUrl)} alt={creator.username} />
                  <AvatarFallback>{creator.username[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex relative flex-col">
                  <Link
                    to={`/${creator.username}`}
                    className="text-sm text-[#7AFF14] hover:text-foreground transition-colors"
                  >
                    {creator.username}
                  </Link>
                </div>
              </CardHeader>
            </Card>
          )}
        </div>
      </div>
    </MainLayout>
  )
};