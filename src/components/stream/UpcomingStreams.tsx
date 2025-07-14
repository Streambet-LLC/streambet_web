import { Table, TableBody, TableCell, TableRow } from '../ui/table';
import { Button } from '../ui/button';
import { formatDate, formatTime, getImageLink } from '@/utils/helper';
import { useNavigate } from 'react-router-dom';

interface UpcomingStreamsProps {
  streams: any;
}

export const UpcomingStreams = ({ streams }: UpcomingStreamsProps) => {
  const navigate = useNavigate();

  return (
    <div className="mx-auto rounded-md border overflow-x-auto max-w-[750px]">
      <Table className="bg-[#0D0D0D] min-w-[600px]">
        <TableBody className="[&_td]:font-light">
          {streams?.length ? (
            streams.map((stream: any) => (
              <TableRow key={stream?.id} className="h-[96px]">
                {/* First column: Thumbnail + Stream Name */}
                <TableCell className="w-[220px] min-w-[220px]">
                  <div className="flex items-center gap-0 h-[96px]">
                    {/* Thumbnail */}
                    <div className="flex-shrink-0 flex items-center rounded-lg overflow-hidden bg-[#232323] w-[115px] h-[72px]">
                      <img
                        src={getImageLink(stream.thumbnailURL)}
                        alt={stream.streamName}
                        className="object-contain w-full h-full"
                        style={{ maxWidth: 115, maxHeight: 72, borderRadius: 8 }}
                      />
                    </div>
                    {/* Stream Name */}
                    <div className="flex-1 flex items-center justify-center h-full">
                      <span
                        className="font-[700] text-[14px] text-white text-center w-full"
                        style={{ color: 'rgba(255,255,255,1)' }}
                      >
                        {stream.streamName}
                      </span>
                    </div>
                  </div>
                </TableCell>
                {/* Second column: Time and Date */}
                <TableCell className="w-[160px] min-w-[160px]">
                  <div className="flex flex-col justify-center h-full gap-1">
                    <span className="font-normal text-[14px]" style={{ fontWeight: 400 }}>{formatTime(stream.scheduledStartTime)}</span>
                    <span className="font-normal text-[14px] text-[#FFFFFFBF]" style={{ fontWeight: 400 }}>{formatDate(stream.scheduledStartTime)}</span>
                  </div>
                </TableCell>
                {/* Third column: Remind Me Button */}
                <TableCell className="w-[160px] min-w-[160px]">
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
              <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                No stream(s) available to display
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
