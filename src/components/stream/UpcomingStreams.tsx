import { Table, TableBody, TableCell, TableRow } from '../ui/table';
import { Button } from '../ui/button';
import { formatDate, formatTime, getImageLink } from '@/utils/helper';
import { useNavigate } from 'react-router-dom';

interface UpcomingStreamsProps {
  streams: any;
}

export const UpcomingStreams = ({ streams }: UpcomingStreamsProps) => {
  const navigate = useNavigate();

  // Helper to truncate stream name for mobile
  const truncate = (str: string, n: number) => (str?.length > n ? str.slice(0, n - 1) + '…' : str);

  // Mobile card layout
  return (
    <div className="mx-auto rounded-md border overflow-x-auto max-w-[900px] w-full">
      {/* Desktop Table Layout */}
      <div className="hidden md:block">
        <Table className="bg-[#0D0D0D] min-w-[898px]">
          <TableBody className="[&_td]:font-light">
            {streams?.length ? (
              streams.map((stream: any) => (
                <TableRow key={stream?.id} className="h-[96px]">
                  {/* First column: Thumbnail + Stream Name */}
                  <TableCell className="w-[220px] min-w-[220px] py-0">
                    <div className="flex items-center gap-0 h-[96px]">
                      {/* Thumbnail */}
                      <div className="flex-shrink-0 flex items-center rounded-lg overflow-hidden bg-[#232323] w-[115px] h-[72px]">
                        <img
                          src={getImageLink(stream.thumbnailURL)}
                          alt={stream.streamName}
                          className="object-cover w-full h-full"
                          style={{ borderRadius: 12 }}
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
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-0 text-muted-foreground">
                  No stream(s) available to display
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {/* Mobile Card Layout */}
      <div className="block md:hidden">
        <div className="flex flex-col gap-4 p-2">
          {streams?.length ? (
            streams.map((stream: any) => (
              <div key={stream?.id} className="rounded-lg bg-[#181818] border border-[#232323] p-3 flex flex-col gap-2 shadow-sm">
                <div className="flex gap-3 items-center">
                  <div className="flex-shrink-0 rounded-lg overflow-hidden bg-[#232323] w-[80px] h-[52px]">
                    <img
                      src={getImageLink(stream.thumbnailURL)}
                      alt={stream.streamName}
                      className="object-cover w-full h-full"
                      style={{ borderRadius: 8 }}
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
            ))
          ) : (
            <div className="text-center text-muted-foreground py-8 text-base">No stream(s) available to display</div>
          )}
        </div>
      </div>
    </div>
  );
};
