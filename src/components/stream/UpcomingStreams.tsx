import { Table, TableBody, TableCell, TableRow } from '../ui/table';
import { Button } from '../ui/button';
import { formatDate, formatTime, getImageLink } from '@/utils/helper';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import InfiniteScroll from 'react-infinite-scroll-component';
import api from '@/integrations/api/client';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '../ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { AlertCircle } from 'lucide-react';

interface UpcomingStreamsProps {
  upcomingStreams?: any;
  fetchMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean; // Add loading prop
}

const LIMIT = 5;

// Desktop Stream Item Component
const DesktopStreamItem = ({ stream }: { stream: any }) => {
  const navigate = useNavigate();
  const [imageLoading, setImageLoading] = useState(true);

  return (
    <TableRow className="h-[96px]">
      {/* First column: Thumbnail + Stream Name */}
      <TableCell className="w-[220px] min-w-[220px] py-0">
        <div className="flex items-center gap-0 h-[96px]">
          {/* Thumbnail */}
          <div className="flex-shrink-0 flex items-center rounded-lg overflow-hidden bg-[#232323] w-[115px] h-[72px] relative">
            {imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-20">
                {/* Simple spinner */}
                <svg className="animate-spin h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
              </div>
            )}
            <img
              src={getImageLink(stream.thumbnailURL)}
              alt={stream.streamName}
              className="object-cover w-full h-full"
              style={{ borderRadius: 12 }}
              onLoad={() => setImageLoading(false)}
              onError={(e) => {
                e.currentTarget.src = '/placeholder.svg';
                setImageLoading(false);
              }}
            />
          </div>
          {/* Stream Name */}
          <div className="flex items-center justify-center h-full ml-2">
            <span
              className="font-[700] text-[14px] text-white w-full"
              style={{ color: 'rgba(255,255,255,1)' }}
            >
              {stream.streamName}
            </span>
          </div>
        </div>
      </TableCell>
      {/* Second column: Time and Date */}
      <TableCell className="w-[160px] min-w-[160px] py-0">
        <div className="flex flex-col justify-center h-full gap-1">
          <span className="font-normal text-[14px]" style={{ fontWeight: 400 }}>{formatTime(stream.scheduledStartTime)}</span>
          <span className="font-normal text-[14px] text-[#FFFFFFBF]" style={{ fontWeight: 400 }}>{formatDate(stream.scheduledStartTime)}</span>
        </div>
      </TableCell>
      {/* Third column: Remind Me Button */}
      <TableCell className="w-[160px] min-w-[160px] py-0">
        <div className="flex items-center justify-center h-full">
          <Button
            type="button"
            className="bg-[#272727] text-white font-medium rounded-lg border-none text-sm flex items-center justify-center hover:bg-[#232323] focus:bg-[#232323] active:bg-[#1a1a1a] transition-colors gap-2"
            style={{ width: 142, height: 44, fontSize: '16px', fontWeight: 500 }}
            onClick={() => navigate(`/stream/${stream?.id}`)}
          >
            Place bet
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

// Mobile Stream Item Component
const MobileStreamItem = ({ stream }: { stream: any }) => {
  const navigate = useNavigate();
  const [imageLoading, setImageLoading] = useState(true);

  // Helper to truncate stream name for mobile
  const truncate = (str: string, n: number) => (str?.length > n ? str.slice(0, n - 1) + '…' : str);

  return (
    <div className="rounded-lg bg-[#181818] border border-[#232323] p-3 flex flex-col gap-2 shadow-sm">
      <div className="flex gap-3 items-center">
        <div className="flex-shrink-0 rounded-lg overflow-hidden bg-[#232323] w-[80px] h-[52px] relative">
          {imageLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-20">
              {/* Simple spinner */}
              <svg className="animate-spin h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
            </div>
          )}
          <img
            src={getImageLink(stream.thumbnailURL)}
            alt={stream.streamName}
            className="object-cover w-full h-full"
            style={{ borderRadius: 8 }}
            onLoad={() => setImageLoading(false)}
            onError={(e) => {
              e.currentTarget.src = '/placeholder.svg';
              setImageLoading(false);
            }}
          />
        </div>
        <div className="flex-1 flex flex-col">
          <span className="font-bold text-[15px] text-white leading-tight truncate">{truncate(stream.streamName, 25)}</span>
          <span className="text-xs text-[#FFFFFFBF] mt-1">{formatDate(stream.scheduledStartTime)}</span>
          <span className="text-xs text-white">{formatTime(stream.scheduledStartTime)}</span>
        </div>
      </div>
      <Button
        type="button"
        className="bg-[#272727] text-white font-medium rounded-lg border-none text-base flex items-center justify-center hover:bg-[#232323] focus:bg-[#232323] active:bg-[#1a1a1a] transition-colors gap-2 mt-2"
        style={{ width: '100%', height: 40, fontSize: '15px', fontWeight: 500 }}
        onClick={() => navigate(`/stream/${stream?.id}`)}
      >
        Place bet
      </Button>
    </div>
  );
};

export const UpcomingStreams = ({ upcomingStreams, fetchMore, hasMore, isLoading = false }: UpcomingStreamsProps) => {
 
console.log(upcomingStreams,'upcomingStreams')
  return (
    <div className="mx-auto rounded-md border overflow-x-auto  max-w-[900px]  w-full">
        <InfiniteScroll
                  dataLength={upcomingStreams?.length || 0}
                  next={fetchMore}
                  hasMore={hasMore}
                  loader={false}
                  // endMessage={
                  //   <p className="text-center py-4 text-[#999]">
                  //     <b>No more upcoming streams</b>
                  //   </p>
                  // }
                >
      {/* Desktop Table Layout */}
      <div className="hidden md:block">
        <Table className="bg-[#0D0D0D] min-w-[898px]">
          <TableBody className="[&_td]:font-light">
            {isLoading ? (
              // Show skeleton loaders when initially loading
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i} className="h-[96px]">
                  <TableCell className="w-[220px] min-w-[220px] py-0">
                    <div className="flex items-center gap-0 h-[96px]">
                      <Skeleton className="w-[115px] h-[72px] rounded-lg" />
                      <div className="flex items-center justify-center h-full ml-2 w-full">
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="w-[160px] min-w-[160px]">
                    <div className="flex flex-col justify-center h-full gap-1">
                      <Skeleton className="h-4 w-16 mb-2" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </TableCell>
                  <TableCell className="w-[160px] min-w-[160px]">
                    <div className="flex items-center justify-center h-full">
                      <Skeleton className="h-10 w-32 rounded-lg" />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : upcomingStreams?.length ? (
              upcomingStreams?.map((stream: any) => (
                <DesktopStreamItem key={stream?.id} stream={stream} />
              ))
            ) 
            : (
              <TableRow>
                   <Alert variant="default" className="bg-muted">
                <AlertCircle className="h-4 w-4" />
                 <AlertTitle>No Upcoming Streams</AlertTitle>
                 <AlertDescription>
                   No upcoming streams scheduled at the moment. Check back later!
                </AlertDescription>
              </Alert>
              </TableRow>
            )
            }
          </TableBody>
        </Table>
      </div>
      {/* Mobile Card Layout */}
      <div className="block md:hidden">
        <div className="flex flex-col gap-4 p-2">
          {isLoading ? (
            // Show skeleton loaders for mobile when initially loading
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-lg bg-[#181818] border border-[#232323] p-3 flex flex-col gap-2 shadow-sm">
                <div className="flex gap-3 items-center">
                  <Skeleton className="w-[80px] h-[52px] rounded-lg" />
                  <div className="flex-1 flex flex-col gap-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            ))
          ) : upcomingStreams?.length ? (
            upcomingStreams?.map((stream: any) => (
              <MobileStreamItem key={stream?.id} stream={stream} />
            ))
          ) : (
            <div className="text-center text-muted-foreground py-8 text-base">No stream(s) available to display</div>
          )}
        </div>
      </div>
      </InfiniteScroll>
    </div>
  );
};
