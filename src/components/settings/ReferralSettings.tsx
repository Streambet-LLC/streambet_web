import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import api from '@/integrations/api/client';
import { useQuery } from '@tanstack/react-query';
import { CopyIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type ReferralLinkList = {
  d;
  data: {
    code: string;
    count: number;
  }[];
};

const ReferralSettings = () => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  const { data, refetch } = useQuery({
    queryKey: ['referral-links'],
    queryFn: async () => {
      const response = await api.user.getReferralLinks();

      return response.data as ReferralLinkList;
    },
  });

  const submitCode = async () => {
    setIsSubmitting(true);
    const { data: resp } = await api.user.createNewReferralLink(newCode);
    setIsSubmitting(false);
    setError(resp.error);

    if (resp.error === null) {
      refetch();
      setNewCode('');
      setIsAddOpen(false);
    }
  };

  return (
    <div>
      <Dialog
        open={isAddOpen}
        onOpenChange={open => {
          setIsAddOpen(open);
        }}
      >
        <DialogTrigger asChild>
          <Button
            onClick={() => {
              setIsAddOpen(true);
            }}
          >
            Create New Referral Link
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl winner-scrollbar p-6 border border-primary">
          <div>
            <p className="text-lg">Create New Referral Link</p>
            <Input
              placeholder="Referral Code"
              value={newCode}
              onChange={e => {
                setNewCode(e.target.value);
              }}
              className="bg-[#272727] border-[#272727] mt-6 text-white placeholder:text-gray-400"
            />
            <p className="mt-2 text-red-500">{error}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              onClick={() => {
                setNewCode('');
                setIsAddOpen(false);
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={submitCode} disabled={newCode === '' || isSubmitting}>
              Submit
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Table className="mt-10">
        <TableHeader>
          <TableRow>
            <TableHead className="text-md font-bold">Referral Code</TableHead>
            <TableHead className="text-md font-bold">Referral Link</TableHead>
            <TableHead className="text-md font-bold">Referred Count</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.data.map((item, i) => (
            <TableRow key={i}>
              <TableCell>{item.code}</TableCell>
              <TableCell className="flex gap-2">
                <p>{`${window.location.origin}?ref=${item.code}`}</p>
                <p>
                  <CopyIcon
                    size={'18'}
                    className=" cursor-pointer"
                    onClick={async () => {
                      await navigator.clipboard.writeText(
                        `${window.location.origin}?ref=${item.code}`
                      );
                      toast({
                        title: 'Successfully Copied',
                      });
                    }}
                  />
                </p>
              </TableCell>
              <TableCell>{item.count}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ReferralSettings;
