import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { ExternalLink } from 'lucide-react';

interface HistoricalStreamListProps {
  streams: any[];
}

export const HistoricalStreamList = ({ streams }: HistoricalStreamListProps) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Stream Title</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {streams.map(stream => (
          <TableRow key={stream.id}>
            <TableCell className="font-medium">{stream.title}</TableCell>
            <TableCell>{format(new Date(stream.created_at), 'PPP')}</TableCell>
            <TableCell>
              <a
                href={`https://livepeer.studio/dashboard/streams/${stream.livepeer_stream_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-blue-500 hover:text-blue-700"
              >
                View on Livepeer <ExternalLink className="ml-1 h-4 w-4" />
              </a>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
