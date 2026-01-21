import { MainLayout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { usePrizeTiers } from "@/hooks/usePrizeConfig"
import { AlertCircle, Loader2 } from "lucide-react";
import { getThumbnailUrl } from "@/utils/helper";
import FeaturedBetCard from "@/components/FeaturedBetCard";

export default function Prizes() {
  const { data: tiers, isLoading } = usePrizeTiers();

  return (
    <MainLayout>
      <h2 className="text-xl font-semibold">Prizes</h2>
      <h2 className="text-sm text-gray-500 mb-4">Here are the prizes you can get by reaching lifetime coins!</h2>
      {isLoading ? 
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card> :
        tiers.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Coming soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tiers
              .sort((a, b) => a.prizeTier - b.prizeTier)
              .map((tier) => (
                <FeaturedBetCard key={tier.id}>
                  <div className="p-6 flex flex-col h-full">
                    {/* Content section */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                        {tier.prizeTier}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{tier.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {tier.amount.toLocaleString('en-US')} coins
                        </p>
                      </div>
                    </div>
                    {tier.description && (
                      <p className="text-sm text-muted-foreground mb-4">
                        {tier.description}
                      </p>
                    )}
                    
                    {/* Image section */}
                    {tier.imageUrl && (
                      <div className="w-full aspect-[16/9] border-t pt-2 md:pt-4">
                        <img
                          src={getThumbnailUrl(tier.imageUrl)}
                          alt={tier.name}
                          className="w-full h-full rounded object-cover"
                        />
                      </div>
                    )}
                  </div>
                </FeaturedBetCard>
              ))}
          </div>
        )
      }
    </MainLayout>
  )
}