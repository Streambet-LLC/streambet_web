import { Table, TableBody, TableCell, TableHeader, TableRow } from '../ui/table';

interface UpcomingStreamsProps {
  streams: any;
}

export const UpcomingStreams = ({ streams }: UpcomingStreamsProps) => {
    
     return (
          <div className="rounded-md border">
               <Table className='bg-[#0D0D0D]'>
                    <TableBody className="[&_td]:font-light">
                         {streams?.length ? streams?.map(stream => (
                              <TableRow key={stream?.id}>
                                   <TableCell>

                                   </TableCell>
                                   <TableCell>
                                   </TableCell>
                                   <TableCell></TableCell>
                              </TableRow>
                         )) : <div className='m-3'>
                              No stream(s) available to display
                         </div>}
                    </TableBody>
               </Table>
          </div>
     )
};
