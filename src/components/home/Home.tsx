import BetCard from '@/components/BetCard';
import { MainLayout } from '@/components/layout';
import HomePromotedBets from './HomePromotedBets';
import HomeBets from './HomeBets';
import UpcomingHomeBets from './UpcomingHomeBets';

export default function Home() {
  return (
    <MainLayout showFooter>
      <div className="w-full flex flex-col gap-6">
        <div className="max-w-3xl mx-auto text-center space-y-4 p-4">
          <h1 className="text-4xl md:text-5xl font-bold">
            Predict the Internet's <br />
            <span className="text-[#BDFF00]">randomest</span> moments
          </h1>
          <p className="text-[#FFFFFFBF]">
            Live picks for games created on the Internet.
            <br />
            <span className="text-[#FFFFFFBF] font-bold">Speculate on the unexpected.</span>
          </p>
        </div>
        <HomePromotedBets />
        {/* <div className="flex justify-end gap-2">
          <SearchInput className="border-none" id="home" value="" onChange={() => {}} />
          <Select>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Total Bet" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="totalBet">
                Total Bet
              </SelectItem>
              <SelectItem value="numberOfBettors">
                Number of Bettors
              </SelectItem>
              <SelectItem value="dateCreated">
                Date Created
              </SelectItem>
            </SelectContent>
          </Select>
          <Button size="icon">
            <SortAsc />
          </Button>
        </div> */}
        <HomeBets />
        {/* <UpcomingHomeBets /> */}
      </div>
    </MainLayout>
  );
}
