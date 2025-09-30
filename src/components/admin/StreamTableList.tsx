import {
     Table,
     TableBody,
     TableCell,
     TableHead,
     TableHeader,
     TableRow,
   } from '@/components/ui/table';
   import { Eye, Pencil, Wifi, Network, Lock, Play } from 'lucide-react';
   
   interface StreamTableListProps {
     streams: any[];
   }
   
   export const StreamTableList = ({ streams }: StreamTableListProps) => {
     return (
       <Table>
         <TableHeader>
           <TableRow>
             <TableHead>Stream Title</TableHead>
             <TableHead>Stream Status</TableHead>
             <TableHead>Betting Status</TableHead>
             <TableHead>Users</TableHead>
             <TableHead>Actions</TableHead>
           </TableRow>
         </TableHeader>
         <TableBody>
           {streams?.map(stream => (
             <TableRow key={stream?.id}>
               <TableCell className="font-medium">{stream?.name}</TableCell>
               <TableCell>{stream?.status}</TableCell>
               <TableCell>{stream?.bettingStatus}</TableCell>
                     <TableCell>{stream?.viewerCount}</TableCell>
                     <TableCell>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <Eye color="#FFFFFFBF" size={18} />
                          <Pencil color="#FFFFFFBF" size={18} />
                          <Wifi color="#FFFFFFBF" size={18} />
                          <Network color="#FFFFFFBF" size={18} />
                          <Lock color="#FFFFFFBF" size={18} />
                          <Play color="#FFFFFFBF" size={18} />
                        </div>
                     </TableCell>
             </TableRow>
           ))}
         </TableBody>
       </Table>
     );
   };
