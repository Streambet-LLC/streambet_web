import { MainLayout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { usePrizeTiers } from "@/hooks/usePrizeConfig"
import { AlertCircle, Loader2 } from "lucide-react";

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
          <div className="space-y-3">
            {tiers
              .sort((a, b) => a.prizeTier - b.prizeTier)
              .map((tier) => (
                <Card key={tier.id} className="border-2">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
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
                          <p className="text-sm text-muted-foreground ml-11">
                            {tier.description}
                          </p>
                        )}
                        {tier.imageUrl && (
                          <div className="mt-3 ml-11">
                            <img
                              src={tier.imageUrl}
                              alt={tier.name}
                              className="w-16 h-16 rounded object-cover"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        )
      }
    </MainLayout>
  )
}